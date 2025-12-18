# SDK 程序化会话 API

**日期:** 2025-12-15

## 背景

创建一个程序化 SDK (`src/sdk.ts`)，允许外部 npm 包使用者在其应用程序中嵌入 Neovate 的代理功能。SDK 应提供一个干净的、基于异步生成器的 API，用于发送消息和接收流式响应。

## 讨论

**用例:** 用于 npm 消费者的外部 SDK，以编程方式与 Neovate 交互，而不是内部使用。

**API 风格:** 用于 `receive()` 方法的拉取式异步生成器，允许使用者通过 `for await...of` 迭代消息。

**工具批准:** 自动批准所有工具调用，无需用户交互，适用于自动化/无头使用。

**消息类型:** 通过 `SDKMessage = NormalizedMessage | SDKSystemMessage | SDKResultMessage` 暴露完整的内部消息结构。流式内容被累积并作为完整消息发出，而不是 delta 事件。

## 方法

利用现有的 `NodeBridge` + `DirectTransport` 模式（与 `run.tsx` 相同）创建一个轻量级包装器，该包装器：

1. 创建一个 `NodeBridge`，配对 `DirectTransport` 用于通信
2. 将消息总线事件包装成异步生成器
3. 自动批准所有工具调用以实现无头操作
4. 通过 `close()` 和 `Symbol.asyncDispose` 提供适当的清理

## 架构

### 类型

```typescript
import type { NormalizedMessage, SDKResultMessage, SDKSystemMessage, UserContent } from './message';

export type SDKSessionOptions = {
  model: string;
  cwd?: string;
  productName?: string;
};

export type SDKUserMessage = {
  type: 'user';
  message: UserContent;
  parentUuid: string | null;
  uuid: string;
  sessionId: string;
};

export type SDKMessage =
  | NormalizedMessage
  | SDKSystemMessage
  | SDKResultMessage;

export interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  receive(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}

export function createSession(options: SDKSessionOptions): Promise<SDKSession>;

// 一次性便捷函数
export function prompt(message: string, options: SDKSessionOptions): Promise<SDKResultMessage>;
```

**SDKUserMessage 字段:**
- `type: 'user'` - 用于类型缩小的判别器
- `message: UserContent` - 文本字符串或 TextPart/ImagePart 数组
- `parentUuid: string | null` - 链接到父消息以进行对话线程
- `uuid: string` - 此消息的唯一标识符
- `sessionId: string` - 此消息所属的会话

**SDKMessage 类型:**
- `NormalizedMessage` - 带有角色、内容、时间戳、uuid、parentUuid 的完整消息
- `SDKSystemMessage` - 会话初始化信息（sessionId、model、cwd、tools）
- `SDKResultMessage` - 请求完成（成功/错误、内容、使用情况）

### 内部流程

```
┌──────────────────┐     DirectTransport      ┌──────────────────┐
│   SDKSession     │ ◄──────────────────────► │    NodeBridge    │
│  (user-facing)   │                          │  (handles logic) │
└──────────────────┘                          └──────────────────┘
        │                                              │
        │ send() ──────────────────────────────►  session.send
        │                                              │
        │ receive() ◄─────────────────────────  events: message,
        │   (async generator)                   textDelta, chunk
        └──────────────────────────────────────────────┘
```

### 关键实现细节

1. **会话创建:** `createSession()` 实例化 `NodeBridge`，创建 `DirectTransport` 对，生成唯一 `sessionId`，返回 `SDKSession` 包装器

2. **send() 方法:**
   - 接受 `string | SDKUserMessage`
   - 当为字符串时: 直接提取文本，生成内部 uuid/parentUuid
   - 当为 SDKUserMessage 时: 使用 `message` 字段（UserContent），尊重提供的 `uuid`、`parentUuid`、`sessionId`

3. **receive() 方法:**
   - 仅生成完整的 `SDKMessage` 类型
   - 在内部累积流式文本/思考 deltas
   - 在助手响应完成时发出 `NormalizedMessage`
   - 在会话初始化时发出 `SDKSystemMessage`
   - 在请求完成时发出 `SDKResultMessage`（成功/错误）

4. **自动批准:** `onToolApprove` 回调始终返回 `{ approved: true }`

5. **清理:** `close()` 和 `[Symbol.asyncDispose]` 销毁上下文并关闭传输

### 使用示例

```typescript
import { createSession, SDKUserMessage } from '@neovate/code/sdk';

const session = await createSession({ model: 'anthropic/claude-sonnet-4-20250514' });

// 简单字符串消息
await session.send(\"List files in current directory\");

for await (const msg of session.receive()) {
  if (msg.type === 'message' && msg.role === 'assistant') {
    console.log('Assistant:', msg.content);
  }
  if (msg.type === 'result') {
    console.log('Done:', msg.subtype);
    break;
  }
}

// 或使用完整 SDKUserMessage 进行对话线程
const userMsg: SDKUserMessage = {
  type: 'user',
  message: 'What is in the package.json?',
  parentUuid: null,
  uuid: crypto.randomUUID(),
  sessionId: session.sessionId,
};
await session.send(userMsg);

session.close();

// 使用 prompt() 的一次性用法
import { prompt } from '@neovate/code/sdk';

const result = await prompt(\"List files in current directory\", {
  model: 'anthropic/claude-sonnet-4-20250514'
});
console.log('Success:', !result.isError);
```
