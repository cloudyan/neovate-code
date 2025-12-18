# SDK 实时消息流

**日期:** 2025-12-16

## 背景

程序化 SDK (`src/sdk.ts`) 当前缓冲所有消息并在请求结束时一起发出它们。当使用 `session.send()` 后跟 `session.receive()` 时，用户期望消息在 LLM 生成时实时流式传输，但实际是所有消息在请求完成后批量到达。

根本原因: `send()` 使用 `await this.messageBus.request('session.send', ...)`，这会阻塞直到整个 LLM 响应完成。消息在请求期间被缓冲，然后在 `receive()` 遍历时一起发出。

## 讨论

### 流式传输行为选项
- **实时流式传输**: 消息在 LLM 生成期间到达时发出，`receive()` 递增式产生
- **在结束时批量**: 保持当前行为 - `send()` 完成后所有消息可用
- **混合方法**: `send()` 立即返回，消息通过 `receive()` 流式传输，完成时发出结果

**决定**: 选择实时流式传输以匹配用户对交互式 SDK 的期望。

### send() API 选项
- **即发即弃**: `send()` 在调度后立即返回，`receive()` 处理所有流式传输
- **等待开始**: `send()` 等待直到 LLM 开始响应，然后返回同时继续流式传输

**决定**: 选择即发即弃以简化和立即返回。

### 架构方法
- **选项 A: 分离请求/响应模式**: `send()` 发出单向事件（不等待），NodeBridge 通过事件发出消息，新的 `done` 事件表示完成
- **选项 B: 带事件桥接的后台请求**: `send()` 启动请求但不等待它，请求在后台运行，事件通过现有的 `message` 处理程序流式传输，添加 `session.done` 事件以表示完成
- **选项 C: 观察者模式**: 用适当的观察者或 ReadableStream 替换 `receive()`（破坏性 API 更改）

**决定**: 选项 B - 带事件桥接的后台请求。对现有事件系统的修改最小，同时启用实时流式传输。

## 方法

将 `send()` 从阻塞请求转换为即发即弃模式:
1. `send()` 发出 `session.send` 请求而不等待
2. 消息通过现有的 `message` 事件处理程序流式传输
3. 新的 `session.done` 事件用最终结果表示完成

## 架构

### 事件流
```
SDK                          NodeBridge
 |                               |
 |-- session.send (请求) --> |  (不等待)
 |                               | (LLM 开始生成)
 |<-- message (事件) ----------|
 |<-- message (事件) ----------|
 |<-- message (事件) ----------|
 |                               | (请求完成)
 |<-- session.done (事件) -----|
```

### 对 `sdk.ts` 的更改

**1. `send()` 方法** - 发出请求而不等待:
```typescript
async send(message: string | SDKUserMessage): Promise<void> {
  if (this.isClosed) throw new Error('Session is closed');
  
  // ... 准备内容、parentUuid、uuid ...
  this.currentParentUuid = uuid;

  // 发出请求而不等待 - 在后台运行
  this.messageBus.request('session.send', {
    message: content,
    cwd: this.cwd,
    sessionId: this.sessionId,
    model: this.model,
    parentUuid,
    uuid,
  }).catch((error) => {
    // 如果未收到 session.done 事件的备选方案
    this.enqueueEvent({
      type: 'result',
      data: { type: 'result', subtype: 'error', isError: true, content: error.message, sessionId: this.sessionId },
    });
    this.enqueueEvent({ type: 'done' });
  });
  
  // 立即返回
}
```

**2. 在 `setupEventHandlers()` 中添加 `session.done` 事件处理程序**:
```typescript
this.messageBus.onEvent('session.done', (data) => {
  if (data.sessionId !== this.sessionId) return;
  this.enqueueEvent({ type: 'result', data: data.result });
  this.enqueueEvent({ type: 'done' });
});
```

### 对 `nodeBridge.ts` 的更改

在 `session.send` 请求完成时发出 `session.done` 事件:
```typescript
// 在 session.send 处理程序中现有的结果处理之后
this.messageBus.emitEvent('session.done', {
  sessionId,
  result: {
    type: 'result',
    subtype: result.success ? 'success' : 'error',
    isError: !result.success,
    content: result.success ? result.data?.text || '' : result.error?.message || 'Unknown error',
    sessionId,
    usage: result.usage,
  },
});
```

### 新类型

```typescript
type SessionDoneEvent = {
  sessionId: string;
  result: SDKResultMessage;
};
```
