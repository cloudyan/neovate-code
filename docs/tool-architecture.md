# 工具系统架构设计

## 概述

Neovate 的工具系统是其核心功能之一，允许 AI 代理与文件系统、网络和 shell 环境进行交互。工具系统具有以下特点：

1. **模块化设计** - 每个工具独立实现，易于扩展
2. **类型安全** - 使用 Zod 进行参数验证
3. **权限控制** - 支持工具审批机制
4. **统一接口** - 所有工具遵循统一的执行接口

## 核心架构

### Tool 接口

```typescript
interface Tool<T = any> {
  name: string;                    // 工具名称
  description: string;             // 工具描述
  getDescription?: ({ params, cwd }: { params: T; cwd: string }) => string;
  displayName?: string;            // 显示名称
  execute: (params: T) => Promise<ToolResult> | ToolResult;  // 执行函数
  approval?: ToolApprovalInfo;     // 审批信息
  parameters: z.ZodSchema<T>;      // 参数模式定义
}

interface ToolApprovalInfo {
  needsApproval?: (context: ApprovalContext) => Promise<boolean> | boolean;
  category?: ApprovalCategory;     // 'read' | 'write' | 'command' | 'network'
}
```

### ToolResult 接口

```typescript
type ToolResult = {
  llmContent: string | (TextPart | ImagePart)[];  // 返回给 LLM 的内容
  returnDisplay?: string | DiffViewerReturnDisplay | TodoReadReturnDisplay | TodoWriteReturnDisplay;
  isError?: boolean;               // 是否出错
};
```

## 工具实现

### 文件操作工具

1. **read** - 读取文件内容，支持文本和图像文件
   - 自动处理大文件截断
   - 支持图像文件的 Base64 编码
   - 支持行偏移和限制参数

2. **write** - 写入文件内容
   - 自动创建目录
   - 格式化输出（确保文件以换行符结尾）
   - 提供差异视图

3. **edit** - 编辑文件内容
   - 基于字符串替换的精确编辑
   - 使用 `applyEdit` 工具进行安全编辑
   - 提供差异视图

### 搜索工具

1. **grep** - 使用 ripgrep 搜索文件内容
   - 快速文件内容搜索
   - 支持文件模式过滤
   - 按修改时间排序结果

2. **glob** - 使用 glob 模式匹配文件
   - 支持复杂的文件模式匹配
   - 按修改时间排序结果
   - 限制返回结果数量

### 系统工具

1. **ls** - 列出目录内容
   - 生成文件树结构
   - 处理大量文件的截断

2. **bash** - 执行 shell 命令
   - 安全检查和命令验证
   - 超时控制
   - 禁止危险命令
   - 后台进程管理

### 网络工具

1. **fetch** - 获取 URL 内容
   - HTML 到 Markdown 转换
   - 内容长度限制
   - 结果缓存
   - 使用 LLM 处理获取的内容

### 任务管理工具

1. **todoRead** - 读取任务列表
2. **todoWrite** - 写入任务列表
   - 支持任务状态管理（pending, in_progress, completed）
   - 本地文件持久化
   - 详细的使用指南和最佳实践

## 工具解析和管理

### resolveTools 函数

```typescript
async function resolveTools(opts: ResolveToolsOpts) {
  // 根据上下文和权限解析可用工具
  const readonlyTools = [read, ls, glob, grep, fetch];
  const writeTools = opts.write ? [write, edit, bash] : [];
  const todoTools = opts.todo ? [todoRead, todoWrite] : [];
  const mcpTools = await getMcpTools(context);
  return [...readonlyTools, ...writeTools, ...todoTools, ...mcpTools];
}
```

### Tools 类

```typescript
class Tools {
  tools: Record<string, Tool>;

  get(toolName: string) { /* 获取工具 */ }
  length() { /* 获取工具数量 */ }

  async invoke(toolName: string, args: string): Promise<ToolResult> {
    // 验证参数并执行工具
    const result = validateToolParams(tool.parameters, args);
    const argsObj = JSON.parse(args);
    return await tool.execute(argsObj);
  }

  getToolsPrompt() { /* 生成工具使用提示 */ }
}
```

## 安全机制

1. **参数验证** - 使用 Zod 进行严格的参数验证
2. **路径限制** - 防止路径遍历攻击
3. **命令过滤** - 禁止危险命令（如 rm, sudo 等）
4. **审批机制** - 根据工具类别和配置进行审批
5. **超时控制** - 限制命令执行时间
6. **内容截断** - 限制返回内容大小

## 扩展机制

1. **MCP 工具集成** - 动态加载 MCP 提供的工具
2. **插件支持** - 通过钩子机制扩展工具集
3. **配置覆盖** - 允许通过配置文件自定义工具行为

这种设计使得 Neovate 的工具系统既安全又灵活，能够满足各种开发任务的需求。
