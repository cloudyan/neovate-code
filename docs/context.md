# Context 上下文系统详解

> 深入理解 Neovate Code 的上下文管理、依赖注入和生命周期控制

- source: [src/context.ts](../src/context.ts), [src/llmsContext.ts](../src/llmsContext.ts)

## 目录

- [概述](#概述)
- [Context 核心类](#context-核心类)
- [LlmsContext 类](#llmscontext-类)
- [上下文创建流程](#上下文创建流程)
- [依赖注入机制](#依赖注入机制)
- [生命周期管理](#生命周期管理)
- [插件集成](#插件集成)
- [最佳实践](#最佳实践)

---

## 概述

Neovate Code 的上下文系统由两个核心类组成：

1. **Context** - 全局上下文管理、依赖注入容器
2. **LlmsContext** - AI 模型上下文管理、环境信息组装

### 设计目标

- ✅ **统一依赖管理**: 作为依赖注入容器，集中管理所有核心依赖
- ✅ **配置集中化**: 合并多个来源的配置（文件、命令行、插件）
- ✅ **插件生命周期**: 协调插件的初始化和销毁
- ✅ **路径管理**: 统一管理全局和项目级别的路径
- ✅ **环境隔离**: 为 AI 模型提供完整的运行环境信息

---

## Context 核心类

### 类定义

```typescript
export class Context {
  cwd: string;                      // 当前工作目录
  productName: string;              // 产品名称
  productASCIIArt?: string;         // ASCII 艺术字
  version: string;                  // 版本号
  config: Config;                   // 配置对象
  paths: Paths;                     // 路径管理器
  argvConfig: Record<string, any>;  // 命令行配置
  mcpManager: MCPManager;           // MCP 管理器
  #pluginManager: PluginManager;    // 插件管理器（私有）
}
```

### 核心属性

#### 1. 基础信息

- **cwd**: 当前工作目录，所有路径操作的基准
- **productName**: 产品名称（如 "neovate"）
- **version**: 当前版本号
- **productASCIIArt**: 可选的 ASCII 艺术字标题

#### 2. 配置系统

- **config**: 合并后的最终配置对象
  - 来源：默认配置 + 全局配置文件 + 项目配置文件 + 命令行参数
  - 优先级：命令行 > 项目 > 全局 > 默认
- **argvConfig**: 原始命令行参数（保留用于某些场景）

#### 3. 管理器

- **paths**: 路径管理器，提供统一的路径访问
- **pluginManager**: 插件管理器，负责插件加载和钩子执行
- **mcpManager**: MCP 服务器管理器，处理外部工具集成

### 核心方法

#### 1. apply() - 触发插件钩子

```typescript
async apply(applyOpts: Omit<PluginApplyOpts, 'pluginContext'>) {
  return this.#pluginManager.apply({
    ...applyOpts,
    pluginContext: this,
  });
}
```

**作用**: 触发指定的插件钩子，允许插件修改或扩展行为

**示例**:
```typescript
// 触发 systemPrompt 钩子
const modifiedPrompt = await context.apply({
  hook: 'systemPrompt',
  args: [{ sessionId: 'abc123' }],
  memo: originalPrompt,
  type: PluginHookType.SeriesLast,
});
```

#### 2. destroy() - 销毁上下文

```typescript
async destroy() {
  await this.mcpManager.destroy();
  await this.apply({
    hook: 'destroy',
    args: [],
    type: PluginHookType.Parallel,
  });
}
```

**作用**: 清理资源，触发销毁钩子

**流程**:
1. 销毁 MCP 管理器（关闭所有 MCP 连接）
2. 并行触发所有插件的 destroy 钩子

#### 3. create() - 静态工厂方法

```typescript
static async create(opts: ContextCreateOpts): Promise<Context>
```

**作用**: 创建 Context 实例（推荐使用方式）

**参数**:
```typescript
type ContextCreateOpts = {
  cwd: string;                    // 工作目录
  productName: string;            // 产品名称
  productASCIIArt?: string;       // ASCII 艺术字
  version: string;                // 版本号
  argvConfig: Record<string, any>;// 命令行配置
  plugins: (string | Plugin)[];   // 插件列表
};
```

---

## LlmsContext 类

### 职责

为 AI 模型提供完整的运行环境信息，包括：
- Git 状态
- 目录结构
- 项目规则
- README 内容
- 自定义上下文（通过插件扩展）
- 环境变量

### 类定义

```typescript
export class LlmsContext {
  messages: string[];  // 上下文消息数组

  static async create(opts: LlmsContextCreateOpts): Promise<LlmsContext>
}
```

### 创建流程

```mermaid
graph TD
    A[LlmsContext.create] --> B[获取 Git 状态]
    B --> C{是否为项目目录?}
    C -->|是| D[获取目录结构]
    C -->|否| E[跳过目录结构]
    D --> F[获取项目规则]
    E --> F
    F --> G{README.md 存在?}
    G -->|是| H[读取 README]
    G -->|否| I[跳过 README]
    H --> J[触发 context 钩子]
    I --> J
    J --> K[组装 Context 部分]
    K --> L[触发 env 钩子]
    L --> M[组装 Environment 部分]
    M --> N[返回 LlmsContext 实例]

    style A fill:#e1f5fe,color:#000
    style J fill:#fff3e0,color:#000
    style N fill:#e8f5e9,color:#000
```

### 上下文信息结构

#### 1. Context 部分

```xml
<context name="gitStatus">
Current branch: main
Status:
M src/context.ts
M docs/arch.md
</context>

<context name="directoryStructure">
- src/
  - context.ts
  - project.ts
  ...
</context>

<context name="rules">
- Always use TypeScript strict mode
- Follow existing code style
...
</context>

<context name="readme">
# Project Name
Project description...
</context>
```

#### 2. Environment 部分

```xml
<env name="Working directory">/path/to/project</env>
<env name="Is directory a git repo">YES</env>
<env name="Platform">darwin</env>
<env name="Today's date">2025-01-15</env>
```

### 插件扩展点

#### 1. context 钩子

```typescript
api.addHook('context', (llmsContext, { sessionId, userPrompt }) => {
  return {
    ...llmsContext,
    customInfo: 'Custom context information',
  };
});
```

#### 2. env 钩子

```typescript
api.addHook('env', (llmsEnv, { sessionId, userPrompt }) => {
  return {
    ...llmsEnv,
    'Custom Env': 'Custom environment variable',
  };
});
```

---

## 上下文创建流程

### 完整流程图

```mermaid
graph TD
    A[Context.create] --> B[初始化 Paths]
    B --> C[创建 ConfigManager]
    C --> D[加载初始配置]
    D --> E[扫描插件]

    E --> E1[内置插件]
    E --> E2[全局插件<br/>~/.neovate/plugins]
    E --> E3[项目插件<br/>.neovate/plugins]
    E --> E4[配置文件插件]
    E --> E5[命令行插件]

    E1 --> F[规范化插件]
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F

    F --> G[创建 PluginManager]
    G --> H[创建临时上下文]
    H --> I[触发 config 钩子]
    I --> J[更新配置]
    J --> K[合并 MCP 配置]
    K --> L[创建 MCPManager]
    L --> M[创建最终 Context]
    M --> N[返回 Context 实例]

    style A fill:#e1f5fe,color:#000
    style I fill:#fff3e0,color:#000
    style N fill:#e8f5e9,color:#000
```

### 详细步骤

#### 1. 初始化基础设施

```typescript
const paths = new Paths({
  productName,
  cwd,
});
```

**Paths 提供的路径**:
- `globalConfigDir`: `~/.neovate/`
- `projectConfigDir`: `<cwd>/.neovate/`
- `getSessionLogPath(sessionId)`: 会话日志路径

#### 2. 加载配置

```typescript
const configManager = new ConfigManager(
  cwd,
  productName,
  opts.argvConfig || {},
);
const initialConfig = configManager.config;
```

**配置加载顺序**:
1. 默认配置
2. 全局配置文件 (`~/.neovate/config.ts`)
3. 项目配置文件 (`<cwd>/.neovate/config.ts`)
4. 命令行参数

#### 3. 扫描插件

```typescript
const pluginsConfigs: (string | Plugin)[] = [
  ...buildInPlugins,        // 内置插件
  ...globalPlugins,         // 全局插件
  ...projectPlugins,        // 项目插件
  ...(initialConfig.plugins || []),  // 配置文件插件
  ...(opts.plugins || []),  // 命令行插件
];
```

**插件来源优先级**: 命令行 > 配置文件 > 项目 > 全局 > 内置

#### 4. 规范化插件

```typescript
const plugins = await normalizePlugins(opts.cwd, pluginsConfigs);
```

**规范化过程**:
- 字符串路径 → 使用 jiti 动态导入
- Plugin 对象 → 直接使用

#### 5. 创建插件管理器

```typescript
const pluginManager = new PluginManager(plugins);
```

#### 6. 触发 config 钩子

```typescript
const resolvedConfig = await apply({
  hook: 'config',
  args: [{ config: initialConfig, argvConfig: opts.argvConfig }],
  memo: initialConfig,
  type: PluginHookType.SeriesMerge,
});
```

**作用**: 允许插件修改配置

#### 7. 创建 MCP 管理器

```typescript
const mcpServers = {
  ...(resolvedConfig.mcpServers || {}),
  ...opts.argvConfig.mcpServers,
};
const mcpManager = MCPManager.create(mcpServers);
```

#### 8. 创建最终实例

```typescript
return new Context({
  cwd,
  productName,
  productASCIIArt,
  version,
  pluginManager,
  argvConfig: opts.argvConfig,
  config: resolvedConfig,
  paths,
  mcpManager,
});
```

---

## 依赖注入机制

### 设计模式

Context 实现了 **依赖注入容器** 模式，提供以下优势：

1. **解耦**: 模块不直接依赖具体实现，而是依赖抽象的 Context
2. **可测试**: 可以轻松创建测试用的 Context
3. **可扩展**: 通过插件系统扩展 Context
4. **集中管理**: 所有依赖在一处初始化

### 使用示例

#### Project 中使用 Context

```typescript
export class Project {
  context: Context;

  constructor(opts: { context: Context }) {
    this.context = opts.context;
  }

  async send(message: string) {
    // 使用 context 中的配置
    const model = this.context.config.model;

    // 使用 context 中的路径
    const logPath = this.context.paths.getSessionLogPath(this.session.id);

    // 触发插件钩子
    const tools = await this.context.apply({
      hook: 'tool',
      args: [{ sessionId: this.session.id }],
      memo: [],
      type: PluginHookType.SeriesMerge,
    });

    // ...
  }
}
```

#### Loop 中使用 Context (通过 Project)

```typescript
export async function runLoop(opts: {
  systemPrompt?: string;
  llmsContexts?: string[];
  // ...
}) {
  // Loop 不直接依赖 Context
  // 而是接收已处理好的数据
}
```

**设计原则**:
- 高层模块（Project）依赖 Context
- 底层模块（Loop）不依赖 Context
- 保持依赖单向流动

---

## 生命周期管理

### 生命周期阶段

```mermaid
stateDiagram-v2
    [*] --> Creating: Context.create()
    Creating --> Initializing: 加载配置和插件
    Initializing --> Ready: 触发 initialized 钩子
    Ready --> Active: 开始使用
    Active --> Active: 处理请求
    Active --> Destroying: context.destroy()
    Destroying --> Destroyed: 触发 destroy 钩子
    Destroyed --> [*]
```

### 生命周期钩子

#### 1. initialized 钩子

```typescript
// 在 Context 创建完成后立即触发
// 通常在 runNeovate 或 runQuiet 中触发

await context.apply({
  hook: 'initialized',
  args: [],
  type: PluginHookType.Series,
});
```

**用途**:
- 初始化插件状态
- 建立外部连接
- 加载额外资源

#### 2. destroy 钩子

```typescript
// 在 Context 销毁时触发

await context.destroy();
```

**用途**:
- 关闭数据库连接
- 清理临时文件
- 保存状态

### 典型生命周期示例

```typescript
// 1. 创建
const context = await Context.create({
  cwd: process.cwd(),
  productName: 'neovate',
  version: '1.0.0',
  argvConfig: {},
  plugins: [],
});

// 2. 初始化
await context.apply({
  hook: 'initialized',
  args: [],
  type: PluginHookType.Series,
});

// 3. 使用
const project = new Project({ context });
await project.send('Hello');

// 4. 销毁
await context.destroy();
```

---

## 插件集成

### 插件与 Context 的关系

Context 通过 PluginManager 协调所有插件，提供以下能力：

#### 1. 修改配置

```typescript
const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(api) {
    api.addHook('config', ({ config, argvConfig }) => {
      return {
        ...config,
        model: 'custom-model',
      };
    });
  }
};
```

#### 2. 扩展工具

```typescript
api.addHook('tool', (tools, { sessionId }) => {
  return [...tools, myCustomTool];
});
```

#### 3. 修改系统提示词

```typescript
api.addHook('systemPrompt', (prompt, { sessionId }) => {
  return prompt + '\nAdditional instructions';
});
```

#### 4. 扩展上下文信息

```typescript
api.addHook('context', (llmsContext, { sessionId, userPrompt }) => {
  return {
    ...llmsContext,
    projectInfo: getProjectInfo(),
  };
});
```

#### 5. 扩展环境信息

```typescript
api.addHook('env', (llmsEnv, { sessionId, userPrompt }) => {
  return {
    ...llmsEnv,
    'Custom Variable': process.env.CUSTOM_VAR,
  };
});
```

### 插件钩子执行顺序

```mermaid
graph LR
    A[Context.create] --> B[config 钩子]
    B --> C[Context 实例创建]
    C --> D[initialized 钩子]
    D --> E[正常使用]
    E --> F[各种业务钩子]
    F --> G[destroy 钩子]

    style B fill:#fff3e0,color:#000
    style D fill:#fff3e0,color:#000
    style G fill:#fff3e0,color:#000
```

---

## 最佳实践

### 1. 始终使用 Context.create()

❌ **错误做法**:
```typescript
const context = new Context({
  cwd: process.cwd(),
  // ... 手动初始化所有依赖
});
```

✅ **正确做法**:
```typescript
const context = await Context.create({
  cwd: process.cwd(),
  productName: 'neovate',
  version: '1.0.0',
  argvConfig: {},
  plugins: [],
});
```

### 2. 传递 Context 而非拆分属性

❌ **错误做法**:
```typescript
function doSomething(
  cwd: string,
  config: Config,
  paths: Paths,
  pluginManager: PluginManager
) {
  // ...
}
```

✅ **正确做法**:
```typescript
function doSomething(context: Context) {
  // 通过 context 访问所需属性
  const { cwd, config, paths } = context;
  // ...
}
```

### 3. 及时销毁 Context

❌ **错误做法**:
```typescript
const context = await Context.create(opts);
// 使用后不销毁
```

✅ **正确做法**:
```typescript
const context = await Context.create(opts);
try {
  await doSomething(context);
} finally {
  await context.destroy();
}
```

### 4. 插件中使用钩子扩展 Context

❌ **错误做法**:
```typescript
// 直接修改 context 对象
context.config.model = 'new-model';
```

✅ **正确做法**:
```typescript
// 通过钩子修改
api.addHook('config', ({ config }) => {
  return {
    ...config,
    model: 'new-model',
  };
});
```

### 5. LlmsContext 的使用时机

✅ **正确时机**:
```typescript
// 在每次对话开始时创建
const llmsContext = await LlmsContext.create({
  context,
  sessionId: session.id,
  userPrompt: message,
});
```

❌ **错误时机**:
```typescript
// 不要在 Context.create 时创建
// LlmsContext 是动态的，每次对话都会重新创建
```

---

## 总结

### Context 的核心价值

1. **依赖注入容器** - 统一管理所有依赖
2. **配置集中化** - 多源配置合并与优先级控制
3. **插件协调器** - 协调插件生命周期和钩子执行
4. **路径管理器** - 统一管理全局和项目路径
5. **环境隔离** - 提供完整的运行环境信息

### LlmsContext 的核心价值

1. **环境信息组装** - 为 AI 提供完整的运行环境
2. **项目上下文** - Git 状态、目录结构、规则等
3. **可扩展性** - 通过插件钩子扩展上下文信息
4. **动态生成** - 每次对话都重新生成，保证信息新鲜

### 学习路径

1. **理解依赖注入** - Context 作为容器的作用
2. **掌握创建流程** - Context.create() 的完整流程
3. **熟悉生命周期** - initialized 和 destroy 钩子
4. **学习插件集成** - 如何通过插件扩展 Context
5. **实践 LlmsContext** - 理解如何为 AI 提供上下文

**推荐阅读顺序**:
Context 基础 → 创建流程 → 生命周期 → 插件集成 → LlmsContext → 实践应用

---

## 相关文档

- [整体架构](./arch.md)
- [插件系统](./arch.md#8-plugin-plugints)
- [配置管理](./arch.md#配置加载流程图)
- [项目管理](./arch.md#3-project-projectts)
