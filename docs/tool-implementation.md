# 工具扩展实现文档

## 概述

工具系统是 Neovate Code 框架的核心组件之一，允许开发者通过标准化接口创建自定义工具。这些工具可以执行各种操作，从文件系统操作到外部 API 调用。

## 工具架构

### 核心组件

1. **Tool 接口**：定义工具的基本结构
2. **createTool 函数**：工具创建的工厂函数
3. **resolveTools 函数**：工具解析和初始化
4. **Tools 类**：工具集合管理

### Tool 接口定义

```typescript
interface Tool<T = any> {
  name: string;                      // 工具名称
  description: string;               // 工具描述
  getDescription?: ({ params, cwd }: { params: T; cwd: string }) => string;  // 动态描述
  execute: (params: T) => Promise<ToolResult> | ToolResult;  // 执行函数
  approval?: ToolApprovalInfo;       // 审批信息
  parameters: z.ZodSchema<T>;        // 参数验证模式
}
```

### ToolResult 接口定义

```typescript
interface ToolResult {
  llmContent: string | (TextPart | ImagePart)[];  // LLM 使用的内容
  returnDisplay?: string | DisplayObject;         // 用户界面显示内容
  isError?: boolean;                              // 错误标识
}
```

## 工具实现步骤

### 1. 创建工具文件

在 `src/tools/` 目录下创建新的工具文件，例如 `mytool.ts`。

### 2. 导入依赖

```typescript
import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../tool';
```

### 3. 实现工具函数

使用 `createTool` 工厂函数创建工具：

```typescript
export function createMyTool(opts: { cwd: string }) {
  return createTool({
    name: 'mytool',
    description: '工具描述',
    parameters: z.object({
      // 参数定义
    }),
    getDescription: ({ params }) => {
      // 动态描述生成
    },
    execute: async ({ param1, param2 }) => {
      try {
        // 工具逻辑实现
        return {
          returnDisplay: '用户界面显示内容',
          llmContent: 'LLM 使用的内容',
        };
      } catch (e) {
        return {
          isError: true,
          llmContent: e instanceof Error ? e.message : '未知错误',
        };
      }
    },
    // 审批机制配置
    approval: {
      category: 'read', // 或 'write', 'command', 'network'
    },
  });
}
```

### 4. 参数验证

使用 Zod 进行参数验证：

```typescript
parameters: z.object({
  file_path: z.string().describe('文件路径'),
  content: z.string().optional().describe('文件内容'),
})
```

### 5. 注册工具

在 `src/tool.ts` 的 `resolveTools` 函数中注册新工具：

```typescript
const readonlyTools = [
  createReadTool({ cwd, productName }),
  createLSTool({ cwd, productName }),
  // ... 其他工具
  createMyTool({ cwd }),  // 添加新工具
];
```

## 最佳实践

### 错误处理

所有工具都应正确处理错误并返回适当的错误信息：

```typescript
try {
  // 工具逻辑
} catch (e) {
  return {
    isError: true,
    llmContent: e instanceof Error ? e.message : '未知错误',
  };
}
```

### 文件路径安全

验证文件路径以防止路径遍历攻击：

```typescript
const fullFilePath = path.resolve(opts.cwd, file_path);
if (!fullFilePath.startsWith(opts.cwd)) {
  throw new Error('无效的文件路径');
}
```

### 审批机制

根据工具的操作类型设置适当的审批类别：

- `read`：只读操作
- `write`：写入操作
- `command`：命令执行
- `network`：网络请求

## 示例工具分析

### Read 工具

Read 工具展示了完整的工具实现，包括：
- 文件路径验证
- 图像和文本文件处理
- 参数验证
- 审批机制
- 错误处理

### Write 工具

Write 工具展示了：
- 文件创建和写入
- 目录自动创建
- 差异显示
- 审批机制

### Edit 工具

Edit 工具展示了：
- 文件编辑操作
- 差异应用
- 审批机制

## 扩展性

Neovate 工具系统设计具有良好的扩展性：
- 通过 `createTool` 工厂函数简化工具创建
- 使用 Zod 进行类型安全的参数验证
- 支持同步和异步执行
- 集成审批机制
- 统一的错误处理
