# NodeBridge Handler 类型定义

**日期：** 2025-12-04

## 背景

`nodeBridge.ts` 文件包含通过 `messageBus.registerHandler()` 注册的 ~40+ 个处理器。这些处理器作为应用程序不同部分之间的通信桥梁，处理配置管理、MCP 服务器控制、模型选择、会话管理等操作。

目前，`registerHandler` 和 `request` 方法都使用松散类型的参数（`any`），这意味着：
- 没有处理器输入/输出的编译时类型检查
- 调用 `request()` 时没有 IDE 自动补全
- 修改处理器时容易破坏契约
- 难以理解每个处理器期望/返回的数据

目标是实现 **完全类型安全**，其中处理器注册和请求调用都是完全类型化的，使 TypeScript 能够强制执行正确的参数类型并自动推断返回类型。

## 讨论

### 关键问题和决策

**Q1: 什么级别的类型安全？**
- 选定：**完全类型安全** - `registerHandler` 和 `request` 都应该是完全类型化的，具有自动补全和推断

**Q2: 类型定义应该放在哪里？**
- 选定：**单文件** 方法 (`src/nodeBridge.types.ts`) 以便于维护和单一信息源

**Q3: 处理器映射应该如何构建？**
- 选定：**Record 风格映射**，方法名映射到 `{ input: ..., output: ... }` 对象，简单易懂

### 考虑的替代方法

**方法 1: 带泛型的集中式类型映射（已选定）**
- 定义包含所有处理器的 `HandlerMap` 类型
- 使 `registerHandler` 和 `request` 在方法名称上泛型化
- 简单，直接的类型安全
- 中等复杂性 - 一次性提取，持续维护

**方法 2: 双重注册（运行时 + 类型）**
- 并行的仅类型注册与模块增强
- 侵入性较小，但类型可能与运行时偏离
- 由于同步问题未选择

**方法 3: 从运行时生成代码**
- 从实际处理器自动生成类型
- 单一信息源但需要构建工具
- 对于收益来说过于复杂

## 方法

该解决方案使用 **带泛型的集中式类型映射**：

1. **创建 `src/nodeBridge.types.ts`** - 包含所有 ~40+ 处理器定义的单个文件
2. **更新 `MessageBus` 类** - 为 `registerHandler<K>()` 和 `request<K>()` 方法添加泛型约束
3. **类型检查处理器** - 所有现有处理器自动根据类型映射验证
4. **渐进式完善** - 从 `any` 开始处理复杂类型，逐步完善

### 好处
- **注册时类型安全**：处理器必须匹配输入/输出类型
- **调用点类型安全**：`request('config.get', params)` 强制执行正确参数
- **返回类型推断**：TypeScript 自动推断返回类型
- **单一信息源**：所有处理器契约在一个文件中
- **易于维护**：在一个位置添加/修改类型

## 架构

### 文件结构

```
src/
├── nodeBridge.types.ts       # 新增：所有处理器类型定义
├── messageBus.ts             # 已修改：添加泛型约束
└── nodeBridge.ts             # 未更改：现有处理器照常工作
```

### 类型映射结构

```typescript
// src/nodeBridge.types.ts
export type HandlerMap = {
  'config.get': {
    input: { cwd: string; isGlobal: boolean; key: string };
    output: { success: true; data: { value: any } };
  };
  'config.set': {
    input: { cwd: string; isGlobal: boolean; key: string; value: string };
    output: { success: true };
  };
  'mcp.reconnect': {
    input: { cwd: string; serverName: string };
    output: 
      | { success: true; message: string }
      | { success: false; error: string };
  };
  // ... 所有 ~40+ 处理器
};

// 便捷的辅助类型
export type HandlerInput<K extends keyof HandlerMap> = HandlerMap[K]['input'];
export type HandlerOutput<K extends keyof HandlerMap> = HandlerMap[K]['output'];
```

### MessageBus 泛型实现

```typescript
// src/messageBus.ts
import type { HandlerMap } from './nodeBridge.types';

export class MessageBus extends EventEmitter {
  // 类型化注册
  registerHandler<K extends keyof HandlerMap>(
    method: K,
    handler: (data: HandlerMap[K]['input']) => Promise<HandlerMap[K]['output']>
  ): void {
    this.messageHandlers.set(method, handler as MessageHandler);
  }
  
  // 带推断的类型化请求
  async request<K extends keyof HandlerMap>(
    method: K,
    params: HandlerMap[K]['input'],
    options: { timeout?: number } = {},
  ): Promise<HandlerMap[K]['output']> {
    // 现有实现不变
  }
}
```

### 类型提取模式

**模式 1 - 简单处理器：**
```typescript
'config.list': {
  input: { cwd: string };
  output: { success: true; data: { ... } };
};
```

**模式 2 - 联合返回类型：**
```typescript
'mcp.reconnect': {
  input: { cwd: string; serverName: string };
  output: { success: true; ... } | { success: false; error: string };
};
```

**模式 3 - 复杂类型：**
```typescript
'session.send': {
  input: {
    message: string | null;
    cwd: string;
    sessionId: string | undefined;
    attachments?: ImagePart[];  // 重用现有类型
    thinking?: ThinkingConfig;
  };
  output: any;  // 稍后完善
};
```

### 实现步骤

1. **从 `nodeBridge.ts` 提取所有处理器类型** (~40+ 处理器)
2. **创建类型文件** 包含完整的 `HandlerMap`
3. **更新 MessageBus** 与泛型约束
4. **验证** 所有处理器通过类型检查
5. **按需逐步完善类型**

### 维护策略

- **添加处理器**：先添加到 `HandlerMap`，再实现
- **更改签名**：更新 `HandlerMap`，TypeScript 找出所有调用位置
- **文档**：在 `HandlerMap` 中使用 JSDoc 注释
- **验证**：类型级测试确保正确性

### 迁移安全性

- 没有运行时行为更改
- 现有代码继续工作
- 类型错误逐渐显现
- 在需要时向后兼容类型断言
