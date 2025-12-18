# SDK resumeSession API

**日期:** 2025-12-16

## 背景

SDK 当前提供 `createSession()` 用于以编程方式启动新会话。用户需要能够通过会话 ID 恢复现有会话，允许外部使用者从先前的交互中继续对话。

目标 API 签名:
```typescript
export function resumeSession(sessionId: string, options: SDKSessionOptions): Promise<SDKSession>;
```

## 讨论

**历史重播:** `resumeSession` 是否应该从会话日志中加载并发出现有消息?
- 决定: **仅连接** - 恢复仅连接到会话而不重播历史。使用者从零开始，仅在调用 `send()` 后接收新消息。

**验证时机:** 会话存在性应该提前验证还是延迟验证?
- 决定: **提前验证** - 在返回前检查会话日志是否存在。如果未找到 sessionId，立即抛出错误，而不是在 `send()` 期间失败。

## 方法

1. 重用现有的 `SDKSessionImpl` 类 - `createSession` 和 `resumeSession` 返回相同的实现
2. 将共享设置逻辑（NodeBridge/MessageBus 创建）提取到内部辅助函数中
3. 对于恢复: 从历史记录中加载最后一条消息 UUID 以设置 `currentParentUuid`，确保新消息正确链接
4. 通过 `session.messages.list` 处理程序验证会话存在性

## 架构

### 函数签名
```typescript
export async function resumeSession(
  sessionId: string, 
  options: SDKSessionOptions
): Promise<SDKSession>
```

### 数据流
```
resumeSession(id, opts)
  → 创建 NodeBridge/MessageBus 对
  → session.initialize (使用现有 sessionId)
  → session.messages.list → 提取 lastUuid 以进行 parentUuid 链接
  → 验证会话存在性 (如果未找到则抛出)
  → 返回带有 sessionId + lastUuid 的 SDKSessionImpl
```

### 错误处理
```typescript
throw new Error(`Session '${sessionId}' not found`);
```

### 验证机制
- 使用现有的 `session.messages.list` 处理程序检查会话存在性
- 如果会话日志中没有消息且没有配置，抛出"Session not found"

### 测试考虑
- 恢复不存在的会话 → 抛出错误
- 恢复存在的会话 → 可以发送新消息
- 新消息正确链接（parentUuid 链接到最后一条历史消息）
