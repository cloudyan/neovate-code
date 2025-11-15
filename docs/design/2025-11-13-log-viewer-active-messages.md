# 日志查看器：活跃消息和 UUID 显示

**日期:** 2025-11-13

## 背景

日志查看器当前显示会话历史中的所有消息，而不区分哪些消息是活跃链的一部分，哪些是不活跃的分支（分支）。这使得很难理解哪些消息实际上与当前会话状态相关。此外，没有简单的方法通过 UUID 引用特定消息来进行调试。

目标是增强日志查看器以：
1. 在视觉上区分活跃消息和不活跃消息（不在当前活跃链中的消息）
2. 以缩短的格式显示消息 UUID，便于调试和引用

## 讨论

### 关键决策

**不活跃消息的视觉处理：**
- 考虑了三个选项：淡化但可见、完全隐藏、或删除线样式
- **决定：** 淡化但完全可见，降低不透明度
- **理由：** 日志查看器的目的是显示完整的会话历史用于调试，所以隐藏消息会违背目的

**UUID 显示格式：**
- 考虑了完整 UUID、缩短（前 8 个字符）、仅悬停显示、或始终可见
- **决定：** 显示前 8 个字符，始终以小而微妙的字体显示
- **理由：** 在可读性和功能性之间取得平衡；8 个字符与其它地方使用的会话 ID 格式匹配

**实现策略：**
- 探索了后端计算活跃集 vs 纯前端计算
- **决定：** 后端计算（方法 A）
- **理由：**
  - 重用 `session.ts` 中现有的 `filterMessages` 逻辑
  - 在生成时计算的清晰数据流
  - 更好的性能，特别是对于大型会话
  - 无代码重复

## 方案

在 HTML 生成期间从 `session.ts` 导入 `filterMessages` 来计算活跃消息链。活跃 UUID 将传递给 HTML 构建器，它为不活跃消息应用 `disabled` CSS 类，并为所有消息添加 UUID 徽章。

这种方法保持了日志查看器显示完整历史的目的，同时清楚地表明哪些消息是活跃链的一部分。

## 架构

### 数据流

1. **加载消息：** `loadAllSessionMessages()` 从 JSONL 文件加载所有消息
2. **计算活跃集：** 调用 `filterMessages(messages)` 获取活跃消息链
3. **提取活跃 UUID：** 从过滤后的消息创建 UUID 的 `Set<string>` 以实现 O(1) 查找
4. **传递给 HTML 构建器：** 向 `buildHtml()` 添加 `activeUuids: Set<string>` 参数
5. **在渲染期间应用：** 检查每个消息 UUID 是否在活跃集中：
   - 活跃：正常渲染
   - 不活跃：添加 `disabled` CSS 类
6. **显示 UUID：** 添加 UUID 徽章，在右上角显示前 8 个字符

**关键原则：** 活跃/不活跃的确定在生成时发生，而不是在浏览器中。

### HTML 结构

每个消息 div 将包含：
```html
<div class=\"msg user disabled\" data-msg-uuid=\"abc123\">
  <div class=\"uuid-badge\">abc123de</div>
  <div class=\"meta\">user · timestamp</div>
  <div class=\"content\">message text</div>
</div>
```

### CSS 样式

**UUID 徽章：**
- 位置：绝对定位右上角
- 字体：10-11px 等宽字体
- 颜色：微妙的 (#999) 带半透明白色背景
- 内边距：2px 6px 带圆角以提高可读性

**禁用消息：**
- 不透明度：0.4-0.5
- 保持现有背景颜色（柔和）
- 保持光标：pointer 以保持可点击性
- 工具调用和工具结果项从父助手消息继承禁用状态

### 实现细节

**文件：** `src/commands/log.ts`

1. **添加导入：**
   ```typescript
   import { filterMessages } from '../session';
   ```

2. **在 `generateHtmlForSession()` 中：**
   ```typescript
   const messages = loadAllSessionMessages(sessionLogPath);
   const activeMessages = filterMessages(messages);
   const activeUuids = new Set(activeMessages.map(m => m.uuid));
   
   const html = buildHtml({
     sessionId,
     sessionLogPath,
     messages,
     requestLogs,
     activeUuids,
   });
   ```

3. **更新 `buildHtml()` 签名：**
   - 添加 `activeUuids: Set<string>` 参数

4. **在消息渲染中：**
   - 检查 `!activeUuids.has(m.uuid)` 以添加 `disabled` 类
   - 添加 UUID 徽章：`<div class=\"uuid-badge\">${m.uuid.slice(0, 8)}</div>`
   - 将禁用状态传播到子工具调用/工具结果项

5. **CSS 添加：**
   ```css
   .msg { position: relative; }
   .uuid-badge {
     position: absolute;
     top: 8px;
     right: 10px;
     font-size: 10px;
     font-family: ui-monospace, monospace;
     color: #999;
     background: rgba(255, 255, 255, 0.8);
     padding: 2px 6px;
     border-radius: 3px;
   }
   .msg.disabled { opacity: 0.4; }
   .msg.disabled.tool-call,
   .msg.disabled.tool-result { opacity: 0.4; }
   ```

### 测试考虑

- 具有多个分支（不活跃分支）的会话
- 只有线性历史（全部活跃）的会话
- UUID 徽章不与消息内容重叠
- 禁用消息仍可点击以查看详细信息面板
- 工具调用/工具结果样式遵循父消息状态
