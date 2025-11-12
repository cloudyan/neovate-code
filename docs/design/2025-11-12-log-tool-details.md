# Log 命令: 显示详细工具信息

**日期:** 2025-11-12  
**状态:** 设计完成

## 概述

增强 log 命令(`src/commands/log.ts`),通过缩进的视觉层次结构在左侧面板中显示详细的工具调用和结果信息。此外,移除"显示前 5 个块"的限制,在右侧面板中显示所有块。

## 问题陈述

目前,日志查看器在左侧面板显示消息,在右侧面板显示请求详情。工具调用和结果隐藏在原始 JSON 中,难以看到:
- 每条助手消息调用了哪些工具
- 传递给每个工具的参数是什么
- 每个工具返回了什么结果
- 执行流程和工具调用序列

## 设计

### 1. 架构与数据流

**核心架构:**
修改 `buildHtml` 函数以生成丰富的消息列表,包括工具调用和结果作为单独的缩进块。

**数据流:**
1. 处理消息并识别包含 tool_use 内容的助手消息
2. 对于每个 tool_use 部分,创建一个缩进的"工具调用"块,显示工具名称和输入参数
3. 扫描后续消息以查找匹配的 tool_result 部分(通过工具调用 ID 匹配)
4. 对于每个匹配的结果,创建一个缩进的"工具结果"块,显示输出/错误
5. 按时间顺序在助手消息和下一条用户消息之间插入块

**关键数据结构:**
```typescript
type RenderableItem = 
  | { type: 'message'; message: NormalizedMessage; indent: false }
  | { type: 'tool-call'; indent: true; id: string; name: string; input: Record<string, any> }
  | { type: 'tool-result'; indent: true; id: string; name: string; result: ToolResult };
```

**处理逻辑:**
通过迭代消息一次构建可渲染项的扁平数组,将包含 tool_use 的助手消息展开为多个可渲染块。

### 2. HTML 生成与样式

**HTML 结构:**
```
助手消息 (正常)
  ├─ 工具调用块 (缩进,显示工具名称 + 输入)
  ├─ 工具结果块 (缩进,显示输出)
  ├─ 工具调用块 (缩进)
  └─ 工具结果块 (缩进)
用户消息 (正常)
```

**CSS 添加:**
- `.msg.tool-call` - 工具调用块样式(琥珀色/黄色背景)
- `.msg.tool-result` - 工具结果块样式(成功为浅绿色,错误为浅红色)
- `.msg.indented` - 视觉层次的左边距/内边距(`margin-left: 32px`)
- `.msg.tool-call .label`, `.msg.tool-result .label` - 粗体标签,如 "🔧 工具调用: read" 或 "✓ 工具结果: read"

**内容格式化:**
- 工具调用输入: `<pre><code>` 块中的美化 JSON
- 工具结果:
  - 成功: 显示结果内容(文本或结构化数据的 JSON)
  - 错误: 以红色文本显示错误消息
  - 两者都显示在 `<pre>` 块中以提高可读性

### 3. 工具调用与结果匹配逻辑

**提取过程:**

1. **识别工具调用:**
   - 遍历消息
   - 查找包含数组内容的助手消息
   - 过滤 `part.type === 'tool_use'` 的部分
   - 提取每个的 `{ id, name, input }`

2. **查找匹配结果:**
   - 对于每个工具调用 ID,向前扫描后续消息
   - 查找 `role === 'user'` 或 `role === 'tool'` 的消息
   - 查找包含以下内容的内容数组:
     - `{ type: 'tool_result', id: X }` 或
     - `{ type: 'tool-result', toolCallId: X }`
   - 通过 ID 相等性匹配

3. **构建可渲染序列:**
   - 从助手消息开始
   - 添加其所有工具调用(按内容数组中的出现顺序排序)
   - 对于每个工具调用,如果找到其结果,立即跟随
   - 如果未找到结果,显示"未完成"指示器

**边界情况:**
- 没有结果的工具调用: 显示为"未完成",使用灰色/柔和样式
- 一条助手消息中的多个工具调用: 所有调用按顺序显示,带适当缩进
- 乱序出现的工具结果: 按 ID 匹配,而非位置

**输出示例:**
```javascript
renderableItems = [
  { type: 'message', message: assistantMsg, indent: false },
  { type: 'tool-call', indent: true, id: 'call_123', name: 'read', input: { file_path: 'foo.ts' } },
  { type: 'tool-result', indent: true, id: 'call_123', name: 'read', result: { type: 'text', content: '...' } },
  { type: 'tool-call', indent: true, id: 'call_124', name: 'edit', input: { file_path: 'foo.ts', ... } },
  { type: 'tool-result', indent: true, id: 'call_124', name: 'edit', result: { type: 'success' } },
]
```

### 4. 实现细节

**关键变更:**

1. **添加 `buildRenderableItems(messages)` 函数:**
   - 输入: NormalizedMessage 数组
   - 输出: RenderableItem 数组
   - 逻辑: 将包含 tool_use 的助手消息展开为序列

2. **修改 `buildHtml` 函数:**
   - 替换对 `messages` 的直接迭代
   - 改为迭代 `buildRenderableItems(messages)`
   - 为每种项类型生成适当的 HTML

3. **更新 HTML 生成:**
   - 添加 switch/if 语句以处理三种类型:
     - `type: 'message'` → 现有消息 HTML
     - `type: 'tool-call'` → 带缩进的新工具调用 HTML
     - `type: 'tool-result'` → 带缩进的新工具结果 HTML

4. **移除右侧面板中的块限制:**
   - 将 `chunks.slice(0, 5)` 改为 `chunks`
   - 更新标签,移除"显示前 5 个"的限制文本

5. **CSS 更新:**
   - 为 `.msg.tool-call`, `.msg.tool-result`, `.msg.indented` 添加样式
   - 确保缩进块具有清晰的视觉层次

**测试方法:**
- 每条助手消息包含多个工具调用的会话
- 包含未完成工具调用(无结果)的会话
- 包含混合工具类型(bash, read, write, edit, grep 等)的会话
- 验证缩进在各浏览器中正确渲染
- 测试非常长的工具输出(bash 结果,大文件)

## 实现注意事项

- 使用 message.ts 中现有的 `ToolUsePart` 和 `ToolResultPart` 类型
- 保持与现有会话日志的向后兼容性
- 不需要更改会话日志格式
- 所有更改都包含在 `src/commands/log.ts` 中

## 成功标准

1. 工具调用作为缩进块出现在左侧面板的助手消息下方
2. 工具结果作为缩进块紧跟在其对应的工具调用之后
3. 工具名称、输入和结果格式清晰可读
4. 未完成的工具调用在视觉上有所区分
5. 右侧面板显示所有块(无 5 块限制)
6. 通过缩进清晰呈现视觉层次
7. 适用于所有现有会话日志
