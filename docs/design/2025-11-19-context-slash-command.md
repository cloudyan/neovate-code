# Context Slash 命令

**日期：** 2025-11-19

## 上下文

用户需要了解发送给LLM的数据以及上下文窗口的使用情况。此功能添加了一个`/context`斜杠命令，用于分析和显示当前会话的令牌使用情况，显示：

- 系统提示令牌
- 系统工具令牌
- MCP工具令牌
- 消息令牌
- 剩余可用空间

主要目标是提供透明度，帮助用户了解其上下文窗口中具体占用情况。

## 讨论

### 关键决策

**数据源：** 该命令通过读取与最新助手消息关联的JSONL日志文件来分析发送到LLM的最后一个API请求，而不是按需重建上下文。

**模型上下文窗口：** 使用`resolveModelWithContext()`动态获取当前模型的上下文窗口大小（例如，Claude 3.5 Sonnet为200k），用于计算百分比。

**错误处理：** 该命令要求至少存在一个助手消息才能运行。如果在新会话中运行，显示："无上下文可用 - 请先发送消息以分析上下文使用情况"

**显示分类：** 显示5个分类（排除了被考虑但已移除的自定义代理）：
- 系统提示
- 系统工具（非MCP）
- MCP工具（以"mcp__"为前缀）
- 消息
- 可用空间

### 考虑的替代方法

1. **纯Node Bridge（已选择）：** 所有逻辑在`nodeBridge.ts`处理器中。清晰分离，可重用，易于测试。

2. **混合逻辑：** Node bridge获取数据，斜杠命令处理。由于混合关注点而被拒绝。

3. **专用服务模块：** 新的`contextAnalyzer.ts`模块。作为单功能的过度工程而被拒绝。

## 方法

`/context`命令遵循现有的斜杠命令模式（如`/clear`）。调用时：

1. 通过nodeBridge调用`project:analyzeContext`处理器
2. 处理器分析JSONL日志中的最后一个API请求
3. 返回带有百分比的结构化令牌计数数据
4. 以格式化表格显示结果

此方法利用现有基础设施（nodeBridge，JSONL日志记录，令牌计数器），同时保持实现的简单和可维护。

## 架构

### 组件

**1. 斜杠命令（`src/slash-commands/builtin/context.tsx`）**
- JSX组件，遵循`clear.tsx`模式
- 通过nodeBridge调用`project:analyzeContext`
- 使用Ink组件（`<Box>`，`<Text>`）渲染格式化输出
- 显示带颜色和百分比条的令牌计数

**2. Node Bridge处理器（`src/nodeBridge.ts`）**
- 处理器：`project:analyzeContext`
- 输入：`{ cwd: string, sessionId: string }`
- 输出：`{ success: boolean, error?: string, data?: AnalysisResult }`
- 包含所有分析逻辑

### 数据流

```
斜杠命令
    ↓
nodeBridge.project:analyzeContext
    ↓
1. 读取会话消息（history.ts）
2. 查找最新助手消息UUID
3. 读取JSONL：.takumi/logs/{sessionId}/{uuid}.jsonl
4. 解析第一行JSON（请求）
5. 提取：body.system, body.messages, body.tools
6. 解析模型上下文窗口大小
7. 按类别计算令牌
8. 计算百分比
    ↓
返回结构化数据
    ↓
显示格式化表格
```

### 令牌计数逻辑

- **系统提示：** `countToken(body.system)` - 处理字符串或数组格式
- **系统工具：** 筛选不带"mcp"前缀的工具，字符串化，计算
- **MCP工具：** 筛选带"MCP__"前缀的工具，字符串化，计算
- **消息：** `countToken(body.messages)` - 消息对象数组
- **可用空间：** `totalContextWindow - (所有分类的总和)`

### 错误处理

处理器返回`{success: false, error: string}`用于：

1. 尚无助手消息 → "无上下文可用 - 请先发送消息以分析上下文使用情况"
2. JSONL文件未找到 → "请求日志文件未找到"
3. JSONL解析错误 → "解析请求日志失败"
4. 缺少主体字段 → "请求日志格式无效"
5. 模型解析失败 → "解析模型上下文窗口失败"

斜杠命令以红色显示错误并退出。

### 接口类型

```typescript
// 请求
{
  type: 'project:analyzeContext',
  args: { cwd: string, sessionId: string }
}

// 响应
{
  success: boolean,
  error?: string,
  data?: {
    systemPrompt: { tokens: number, percentage: number },
    systemTools: { tokens: number, percentage: number },
    mcpTools: { tokens: number, percentage: number },
    messages: { tokens: number, percentage: number },
    freeSpace: { tokens: number, percentage: number },
    totalContextWindow: number
  }
}
```

### 测试方法

**手动测试场景：**
1. 正常路径：对话后运行，验证计数和百分比
2. 错误情况：在任何消息之前的新会话中运行
3. 不同模型：测试各种上下文窗口大小
4. 边缘情况：有/无MCP工具的会话，很长的对话

**验证点：**
- 百分比总和约为100%
- 令牌计数在预期范围内
- 显示与参考截图匹配
- 错误消息清晰且可操作
