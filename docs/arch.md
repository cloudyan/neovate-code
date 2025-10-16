# Neovate Code 架构设计

> 深入理解 Neovate Code 的整体架构、核心模块、数据流转和设计模式

- source: [src/](../src/)

## 目录

- [概述](#概述)
- [目录结构](#目录结构)
- [整体架构](#整体架构)
- [核心模块](#核心模块)
- [数据流转](#数据流转)
- [设计模式](#设计模式)
- [关键流程](#关键流程)
- [扩展机制](#扩展机制)

---

## 概述

Neovate Code 是一个基于 AI 的代码助手 CLI 工具，采用模块化架构设计，支持多种 AI 模型、插件扩展和 MCP 协议集成。

### 核心特性

- 🤖 **多模型支持**: OpenAI、Anthropic、Google、DeepSeek 等
- 🔌 **插件系统**: 丰富的钩子机制支持功能扩展
- 🛠️ **工具集成**: Bash、文件操作、网络请求等内置工具
- 💬 **交互模式**: 基于 Ink + React 的终端 UI
- 📝 **会话管理**: 会话持久化与恢复
- 🌐 **MCP 协议**: 支持 Model Context Protocol

### 技术栈

- **运行时**: Bun / Node.js
- **语言**: TypeScript
- **UI 框架**: React + Ink
- **AI SDK**: @openai/agents, AI SDK
- **构建工具**: tsup

---

## 目录结构

```
src/
├── index.ts              # 入口文件
├── cli.ts                # CLI 入口
├── context.ts            # 上下文管理
├── project.ts            # 项目管理
├── session.ts            # 会话管理
├── query.ts              # 查询接口
├── loop.ts               # AI 交互循环
├── model.ts              # 模型管理
├── tool.ts               # 工具系统
├── plugin.ts             # 插件系统
├── config.ts             # 配置管理
├── mcp.ts                # MCP 管理
├── paths.ts              # 路径管理
├── uiBridge.ts           # UI 桥接
├── nodeBridge.ts         # Node 桥接
├── messageBus.ts         # 消息总线
├── commands/             # 子命令
├── tools/                # 内置工具
├── ui/                   # UI 组件
└── utils/                # 工具函数
```

---

## 整体架构

本章节包含三个核心架构图：
- **分层架构图**: 清晰展示从用户层到基础设施层的完整结构
- **数据流程图**: 详细说明消息在各模块间的流转
- **时序图**: 展示交互模式下的完整交互流程

### 架构分层图

```mermaid
graph TB
    subgraph "用户层"
        CLI[命令行接口]
        UI[Ink UI 界面]
    end

    subgraph "应用层"
        Entry[入口: runNeovate]
        Router[路由分发器]
        Commands[子命令模块]
    end

    subgraph "核心业务层"
        Context[Context<br/>上下文管理]
        Project[Project<br/>项目管理]
        Session[Session<br/>会话管理]
        Query[Query<br/>查询接口]
    end

    subgraph "AI 处理层"
        AILoop[AILoop<br/>AI交互循环]
        Model[Model<br/>模型管理]
        Tool[Tool<br/>工具系统]
    end

    subgraph "基础设施层"
        Config[Config<br/>配置管理]
        Plugin[Plugin<br/>插件系统]
        MCP[MCP<br/>协议管理]
        Bridge[Bridge<br/>桥接层]
        Storage[Storage<br/>存储管理]
    end

    CLI --> Entry
    UI --> Bridge
    Entry --> Router
    Router --> Commands
    Router --> Context
    Commands --> Project
    Project --> Session
    Project --> Query
    Query --> AILoop
    AILoop --> Model
    AILoop --> Tool
    Context --> Config
    Context --> Plugin
    Context --> MCP
    Bridge --> Context
    Session --> Storage

    style Entry fill:#e1f5fe,color:#000
    style Context fill:#fff3e0,color:#000
    style Project fill:#f3e5f5,color:#000
    style AILoop fill:#fce4ec,color:#000
    style Config fill:#e8f5e9,color:#000
```

### 数据流向图

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Context
    participant Project
    participant AILoop
    participant Model
    participant Tool
    participant Storage

    User->>CLI: 执行命令
    CLI->>Context: 创建上下文
    Context->>Context: 加载配置/插件
    CLI->>Project: 创建项目实例
    Project->>Project: 初始化会话
    User->>Project: 发送消息
    Project->>AILoop: 启动AI循环
    AILoop->>Model: 调用AI模型
    Model-->>AILoop: 返回响应
    AILoop->>AILoop: 解析工具调用
    AILoop->>Tool: 执行工具
    Tool-->>AILoop: 返回结果
    AILoop->>Model: 继续对话
    Model-->>AILoop: 最终响应
    AILoop-->>Project: 返回结果
    Project->>Storage: 保存会话
    Project-->>User: 显示结果
```

### 架构分层说明

Neovate Code 采用清晰的分层架构，从用户层到基础设施层共5层：

**用户层**
- CLI 命令行接口
- Ink UI 界面

**应用层**
- runNeovate 入口
- 路由分发器
- 子命令模块

**核心业务层**
- Context (上下文管理)
- Project (项目管理)
- Session (会话管理)
- Query (查询接口)

**AI 处理层**
- Loop (AI交互循环)
- Model (模型管理)
- Tool (工具系统)

**基础设施层**
- Config (配置管理)
- Plugin (插件系统)
- MCP (协议管理)
- Bridge (桥接层)
- Storage (存储管理)

### 数据流向

典型的数据流转路径：

```
用户输入 → CLI → Context → Project → Loop → AI模型
                                  ↓         ↓
                               工具系统  ← 解析
                                  ↓
                               执行工具
                                  ↓
                            返回结果 → 存储 → 用户
```

---

## 核心模块

🧩 核心模块深度解析

1. 入口模块: runNeovate 的路由分发机制
2. Context: 依赖注入容器和全局管理
3. Project: 项目级 AI 交互管理
4. Loop: AI 交互循环的核心逻辑
5. Model: 两层模型解析架构
6. Tool: 工具系统的分类和执行
7. Session: 会话管理和持久化
8. Plugin: 插件系统和钩子机制
9. Bridge: UI 与业务逻辑的桥接

### 1. 入口模块 (index.ts)

**职责**: 应用启动、参数解析、路由分发

核心函数 `runNeovate` 的工作流程：

1. 解析命令行参数
2. 准备配置对象
3. 路由分发到不同模式：
   - 服务器模式 (servernext)
   - 子命令模式 (config/commit/mcp/run/update)
   - 安静模式 (--quiet)
   - 交互模式 (默认)

**关键特性**:
- ✅ 懒加载子命令模块
- ✅ 统一配置管理
- ✅ 灵活的路由策略

详见: [runNeovate 详解](./runNeovate.md)

### 2. Context (context.ts)

**职责**: 全局上下文管理、依赖注入容器

Context 是整个应用的依赖注入容器，包含：
- 工作目录 (cwd)
- 配置对象 (config)
- 路径管理 (paths)
- 插件管理器 (pluginManager)
- MCP 管理器 (mcpManager)

**生命周期**:
```
创建 → 初始化插件 → 触发 initialized 钩子 → 使用 → 触发 destroy 钩子 → 销毁
```

**核心方法**:
- `Context.create()` - 创建上下文实例
- `context.apply()` - 触发插件钩子

### 3. Project (project.ts)

**职责**: 项目级别的 AI 交互管理

Project 管理单个项目的 AI 交互，核心方法：

**send(message, opts)**
1. 解析工具 (resolveTools)
2. 通过插件扩展工具 (tool 钩子)
3. 生成系统提示词
4. 通过插件修改系统提示词 (systemPrompt 钩子)
5. 调用核心发送逻辑

**plan(message, opts)**
- 计划模式：只读工具 + 计划系统提示词

### 4. Loop (loop.ts)

**职责**: AI 交互循环、工具调用管理

Loop 是 AI 交互的核心循环逻辑：

```
初始化 → AI响应 → 解析响应
              ↓
     文本响应 / 工具调用
              ↓
        执行工具 → 添加结果
              ↓
         继续循环 / 结束
```

**循环控制**:
- 最大轮数限制 (默认50)
- 工具审批机制
- 错误处理和重试

### 5. Model (model.ts)

**职责**: AI 模型管理、提供商抽象

**两层解析架构**:

1. **resolveModelWithContext** (外层)
   - 处理插件钩子 (provider, modelAlias)
   - 合并配置文件
   - 协调整个解析流程

2. **resolveModel** (内层)
   - 纯粹的模型解析逻辑
   - 别名转换
   - 提供商查找
   - 模型验证
   - 实例创建

**提供商抽象**:
- 统一接口
- 支持多种 AI 服务
- 易于扩展

详见: [模型架构文档](./model-provider-architecture.md)

### 6. Tool (tool.ts)

**职责**: 工具系统、工具执行管理

**工具分类**:

**只读工具** (所有模式)
- Read: 读取文件
- LS: 列出目录
- Glob: 文件匹配
- Grep: 文本搜索
- Fetch: 网络请求

**写入工具** (send 模式)
- Write: 写入文件
- Edit: 编辑文件
- Bash: 执行命令

**管理工具** (可选)
- TodoRead: 读取待办
- TodoWrite: 写入待办

**MCP 工具** (动态加载)
- 外部工具集成

详见: [工具架构文档](./tool-architecture.md)

### 7. Session (session.ts)

**职责**: 会话管理、消息持久化

**会话 ID 格式**: `YYYYMMDD-随机字符串`
- 例如: `20250114-abc123`

**存储结构**:
```
~/.neovate/
  └── projects/
      └── <project-hash>/
          └── sessions/
              ├── 20250114-abc123.jsonl
              └── ...
```

**核心功能**:
- 创建新会话
- 恢复已有会话
- 消息持久化 (JSONL 格式)

### 8. Plugin (plugin.ts)

**职责**: 插件系统、钩子管理

**插件钩子类型**:

1. **Series** - 串行执行，不传递结果
2. **SeriesLast** - 串行执行，传递结果
3. **SeriesMerge** - 串行执行，合并数组结果
4. **Parallel** - 并行执行

**内置钩子**:
- `initialized` - 初始化完成
- `provider` - 扩展模型提供商
- `modelAlias` - 扩展模型别名
- `systemPrompt` - 修改系统提示词
- `tool` - 扩展工具
- `destroy` - 清理资源

### 9. Bridge (uiBridge.ts / nodeBridge.ts)

**职责**: UI 与业务逻辑解耦、消息总线通信

**桥接模式**:
```
UI Bridge ←→ MessageBus ←→ Node Bridge
```

**优势**:
- ✅ UI 和业务逻辑完全解耦
- ✅ 支持不同传输方式
- ✅ 易于测试和扩展
- ✅ 统一的消息协议

**消息类型**:
- `send` - 发送消息
- `text_delta` - 文本增量
- `tool_use` - 工具调用
- `tool_approve` - 工具审批
- `complete` - 完成

---

## 数据流转

### 交互模式完整流程图

```mermaid
sequenceDiagram
    participant User
    participant UI as Ink UI
    participant UIBridge
    participant MessageBus
    participant NodeBridge
    participant Project
    participant AILoop
    participant Model as AI Model
    participant Tool

    User->>UI: 输入消息
    UI->>UIBridge: 发送消息
    UIBridge->>MessageBus: send { type: 'send' }
    MessageBus->>NodeBridge: 转发消息
    NodeBridge->>Project: project.send(message)
    Project->>Project: 解析工具和系统提示词
    Project->>AILoop: runLoop(opts)

    loop AI 交互循环
        AILoop->>Model: 调用 AI
        Model-->>AILoop: 返回响应

        alt 文本响应
            AILoop->>NodeBridge: onTextDelta(text)
            NodeBridge->>MessageBus: send { type: 'text_delta' }
            MessageBus->>UIBridge: 转发
            UIBridge->>UI: 更新显示
            UI-->>User: 显示文本
        end

        alt 工具调用
            AILoop->>NodeBridge: onToolApprove(toolUse)
            NodeBridge->>MessageBus: send { type: 'tool_use' }
            MessageBus->>UIBridge: 转发
            UIBridge->>UI: 请求审批
            UI-->>User: 显示审批请求
            User->>UI: 批准/拒绝
            UI->>UIBridge: 审批结果
            UIBridge->>MessageBus: send { type: 'tool_approve' }
            MessageBus->>NodeBridge: 转发
            NodeBridge-->>AILoop: 返回审批结果

            alt 批准
                AILoop->>Tool: 执行工具
                Tool-->>AILoop: 返回结果
                AILoop->>Model: 继续对话（带工具结果）
            else 拒绝
                AILoop-->>Project: 返回错误
            end
        end
    end

    AILoop-->>Project: 返回最终结果
    Project->>Project: 保存会话
    Project-->>NodeBridge: 完成
    NodeBridge->>MessageBus: send { type: 'complete' }
    MessageBus->>UIBridge: 转发
    UIBridge->>UI: 更新状态
    UI-->>User: 显示完成
```

### 安静模式流程图

```mermaid
graph LR
    A[用户命令] --> B[runQuiet]
    B --> C[创建 Context]
    C --> D[创建 Project]
    D --> E[project.send]
    E --> F[runLoop]
    F --> G{响应类型}
    G -->|文本| H[输出文本]
    G -->|工具调用| I[自动批准]
    I --> J[执行工具]
    J --> F
    F --> K[返回结果]
    K --> L[退出进程]

    style A fill:#e1f5fe,color:#000
    style F fill:#fce4ec,color:#000
    style K fill:#e8f5e9,color:#000
```

### 配置加载流程图

```mermaid
graph TD
    A[Context.create] --> B[初始化路径管理]
    B --> C[加载配置文件]
    C --> D[扫描插件目录]
    D --> E1[内置插件]
    D --> E2[全局插件<br/>~/.neovate/plugins]
    D --> E3[项目插件<br/>.neovate/plugins]
    D --> E4[配置文件插件]
    D --> E5[命令行插件]
    E1 --> F[合并所有插件]
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F
    F --> G[实例化 PluginManager]
    G --> H[初始化 MCP 管理器]
    H --> I[触发 initialized 钩子]
    I --> J[Context 创建完成]

    style A fill:#e1f5fe,color:#000
    style G fill:#fff3e0,color:#000
    style J fill:#e8f5e9,color:#000
```

---

## 设计模式

### 1. 策略模式 (Strategy Pattern)

**应用**: 不同的执行模式

根据参数选择不同的执行策略：
- 服务器模式
- 子命令模式
- 安静模式
- 交互模式

### 2. 工厂模式 (Factory Pattern)

**应用**: 模型和工具创建

```typescript
// 模型工厂
provider.createModel(modelId, provider, globalConfigDir)

// 工具工厂
createReadTool({ cwd })
createWriteTool({ cwd })
```

### 3. 桥接模式 (Bridge Pattern)

**应用**: UI 与业务逻辑解耦

通过 MessageBus 连接 UIBridge 和 NodeBridge

### 4. 观察者模式 (Observer Pattern)

**应用**: 插件钩子系统

注册钩子，触发钩子，监听事件

### 5. 依赖注入 (Dependency Injection)

**应用**: Context 作为依赖容器

Context 包含所有核心依赖，注入到各个模块

### 6. 中介者模式 (Mediator Pattern)

**应用**: MessageBus 协调通信

MessageBus 作为中介者协调 UIBridge 和 NodeBridge 的通信

---

## 关键流程

### 1. 应用启动流程

```mermaid
graph TD
    A[用户执行命令] --> B[解析命令行参数]
    B --> C[准备配置对象<br/>contextCreateOpts]
    C --> D{路由分发}

    D -->|command=servernext| E1[runServerNext<br/>启动服务器]
    D -->|有效子命令| E2[动态加载子命令<br/>执行对应逻辑]
    D -->|--help| E3[printHelp<br/>显示帮助]
    D -->|--version| E4[显示版本号]
    D -->|--quiet| E5[runQuiet<br/>安静模式]
    D -->|默认| E6[runInteractive<br/>交互模式]

    E1 --> F[处理完成]
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F
    E6 --> F

    style A fill:#e1f5fe,color:#000
    style D fill:#fff3e0,color:#000
    style F fill:#e8f5e9,color:#000
```

### 2. Context 创建流程

```mermaid
graph TD
    A[Context.create] --> B[初始化路径管理<br/>Paths]
    B --> C[创建配置管理器<br/>ConfigManager]
    C --> D[扫描并加载插件]
    D --> D1[内置插件]
    D --> D2[全局插件]
    D --> D3[项目插件]
    D --> D4[配置插件]
    D --> D5[命令行插件]

    D1 --> E[实例化<br/>PluginManager]
    D2 --> E
    D3 --> E
    D4 --> E
    D5 --> E

    E --> F[初始化<br/>MCP管理器]
    F --> G[触发 initialized 钩子]
    G --> H[返回 Context 实例]

    style A fill:#e1f5fe,color:#000
    style E fill:#fff3e0,color:#000
    style H fill:#e8f5e9,color:#000
```

### 3. 消息发送流程

```mermaid
graph TD
    A[Project.send] --> B[resolveTools<br/>解析工具]
    B --> C[触发 tool 钩子<br/>插件扩展工具]
    C --> D[generateSystemPrompt<br/>生成系统提示词]
    D --> E[触发 systemPrompt 钩子<br/>插件修改提示词]
    E --> F[sendWithSystemPromptAndTools]
    F --> G[runLoop<br/>启动AI循环]

    G --> H{循环处理响应}
    H -->|文本| I1[触发 onTextDelta]
    H -->|工具调用| I2[触发 onToolApprove<br/>请求审批]
    H -->|推理| I3[触发 onReasoning]
    H -->|完成| I4[退出循环]

    I1 --> H
    I2 --> J{是否批准}
    J -->|是| K[执行工具]
    J -->|否| L[返回错误]
    K --> H
    I3 --> H

    I4 --> M[保存会话]
    L --> M
    M --> N[返回结果]

    style A fill:#e1f5fe,color:#000
    style G fill:#fce4ec,color:#000
    style N fill:#e8f5e9,color:#000
```

### 4. 工具执行流程

```mermaid
graph TD
    A[AI返回工具调用] --> B[解析 ToolUse 对象]
    B --> C[触发 onToolApprove]
    C --> D{是否批准?}

    D -->|是| E1[Tools.get<br/>查找工具定义]
    D -->|否| E2[返回错误<br/>tool_denied]

    E1 --> F[验证参数]
    F --> G[执行工具<br/>tool.execute]
    G --> H[返回 ToolResult]
    H --> I[添加到历史]

    E2 --> J[中止循环]
    I --> K[继续 AI 循环]

    style A fill:#e1f5fe,color:#000
    style D fill:#fff3e0,color:#000
    style K fill:#e8f5e9,color:#000
```

### 5. 模型解析流程

```mermaid
graph TD
    A[resolveModelWithContext] --> B[触发 provider 钩子<br/>插件扩展提供商]
    B --> C{配置文件有提供商?}
    C -->|是| D[mergeConfigProviders<br/>合并配置]
    C -->|否| E[使用钩子后的提供商]
    D --> F[触发 modelAlias 钩子<br/>插件扩展别名]
    E --> F

    F --> G[确定模型名称<br/>参数 > 配置]
    G --> H{有模型名称?}
    H -->|是| I[调用 resolveModel]
    H -->|否| J[返回 null]

    I --> K[1. 别名转换<br/>modelAlias查找]
    K --> L[2. 提供商查找<br/>按前缀分割]
    L --> M[3. 模型验证<br/>检查是否存在]
    M --> N[4. 实例创建<br/>createModel]
    N --> O[返回 ModelInfo]

    J --> P[返回结果]
    O --> P

    style A fill:#e1f5fe,color:#000
    style I fill:#f3e5f5,color:#000
    style P fill:#e8f5e9,color:#000
```

---

## 扩展机制

### 1. 插件开发

创建插件的基本结构：

```typescript
const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(api) {
    // 扩展提供商
    api.addHook('provider', (providers) => {
      return {
        ...providers,
        myProvider: { /* ... */ }
      }
    })

    // 扩展工具
    api.addHook('tool', (tools) => {
      return [...tools, myTool]
    })

    // 修改系统提示词
    api.addHook('systemPrompt', (prompt) => {
      return prompt + '\nCustom instructions'
    })
  }
}
```

### 2. 自定义工具

```typescript
import { createTool } from 'neovate-code'
import { z } from 'zod'

const myTool = createTool({
  name: 'my_tool',
  description: 'My custom tool',
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    const result = await doSomething(input)
    return { success: true, data: result }
  }
})
```

### 3. 自定义提供商

在配置文件中添加：

```typescript
export default {
  provider: {
    'my-provider': {
      env: ['MY_API_KEY'],
      name: 'My Provider',
      api: 'https://api.example.com',
      models: { /* ... */ },
      createModel(name, provider, globalConfigDir) {
        // 创建模型实例
      }
    }
  }
}
```

### 4. MCP 服务器集成

通过命令行：
```bash
neovate --mcp-config '{"mcpServers": {"myServer": {...}}}'
```

通过配置文件：
```typescript
export default {
  mcpServers: {
    myServer: {
      command: 'node',
      args: ['server.js'],
      env: { API_KEY: 'xxx' }
    }
  }
}
```

---

## 性能优化

### 1. 懒加载

子命令使用动态 import，减少启动时间

### 2. 并行插件执行

使用 Parallel 类型并行执行插件钩子

### 3. 历史压缩

自动压缩过长的历史消息

### 4. 流式输出

使用流式输出减少感知延迟

---

## 相关文档

- [入口函数详解](./runNeovate.md)
- [模型架构](./model-provider-architecture.md)
- [工具架构](./tool-architecture.md)
- [智能路由](./smart-routing.md)
- [源码学习](./learn.md)

---

## 总结

Neovate Code 采用模块化、可扩展的架构设计：

### 核心优势

1. ✅ **清晰的分层架构** - 各层职责明确，易于理解和维护
2. ✅ **强大的插件系统** - 丰富的钩子机制支持功能扩展
3. ✅ **灵活的模型管理** - 支持多种 AI 服务，易于扩展
4. ✅ **完善的工具系统** - 内置常用工具，支持 MCP 集成
5. ✅ **优雅的桥接模式** - UI 与业务逻辑完全解耦
6. ✅ **会话持久化** - 完整的会话管理和恢复机制

### 学习建议

1. **从 runNeovate 开始** - 理解应用的入口和路由分发
2. **深入 Context** - 理解依赖注入和配置管理
3. **研究 Loop** - 理解 AI 交互的核心循环
4. **探索插件系统** - 学习如何扩展功能
5. **实践工具开发** - 创建自己的工具和插件

**建议阅读顺序**:
runNeovate → Context → Project → Loop → Model → Tool → Plugin
