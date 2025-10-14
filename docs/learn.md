# Neovate Code 源码学习指南

## 项目概述

**Neovate Code** 是一个 AI 编码代理（Coding Agent）工具，基于 TypeScript 开发，使用 Bun 作为运行时，提供命令行界面来辅助软件开发工作。

### 核心特性
- **AI 辅助编程**: 代码生成、Bug修复、代码审查、测试添加等
- **多模型支持**: 集成 Anthropic、OpenAI、DeepSeek、Google、xAI 等
- **CLI 工具**: 提供 `neovate` 或 `neo` 命令
- **可扩展**: 支持插件系统和 MCP 协议

### 技术栈
- **运行时**: Bun
- **UI**: Ink (React for CLI)
- **语言**: TypeScript
- **测试**: Vitest
- **格式化**: Biome

---

## 📚 源码阅读路线图

### 阶段 1: 理解项目结构 (30分钟)

#### 1. 入口文件 - 理解启动流程

**文件**: `src/cli.ts`
- **位置**: `src/cli.ts:1`
- **作用**: CLI 入口点，调用 `runNeovate()` 函数
- **关键代码**:
  ```typescript
  runNeovate({
    productName: PRODUCT_NAME,
    productASCIIArt: PRODUCT_ASCII_ART,
    version: pkg.version,
    plugins: [],
    upgrade: { /* ... */ }
  })
  ```

**文件**: `src/index.ts`
- **位置**: `src/index.ts:259`
- **作用**: 核心函数 `runNeovate()`，处理参数解析、模式切换
- **关键功能**:
  - 参数解析 (`parseArgs`)
  - 命令处理 (config, commit, mcp, run, update)
  - 交互模式 (`runInteractive`)
  - 安静模式 (`runQuiet`)

#### 2. 核心概念文件 - 建立全局认知

| 文件 | 作用 | 关键内容 |
|------|------|----------|
| `src/context.ts` | 依赖注入和上下文管理 | 全局配置、插件、MCP 服务器 |
| `src/project.ts` | 项目操作主类 | 消息发送、会话管理 |
| `src/session.ts` | 会话持久化 | 会话加载/保存、历史记录 |

---

### 阶段 2: 核心功能模块 (1-2小时)

#### 3. 工具系统 - 最重要的功能

**目录结构**: `src/tools/`

```
src/tools/
├── read.ts      # 文件读取
├── write.ts     # 文件写入
├── edit.ts      # 文件编辑 (精确字符串替换)
├── bash.ts      # 命令执行
├── grep.ts      # 代码搜索 (基于 ripgrep)
├── glob.ts      # 文件模式匹配
├── ls.ts        # 目录列表
├── fetch.ts     # 网络请求
└── todo.ts      # 任务管理
```

**学习重点**:
- 每个工具如何定义输入/输出 schema (使用 zod)
- 工具如何与 AI 模型交互
- 权限控制和审批机制

#### 4. 消息流转

| 文件 | 作用 |
|------|------|
| `src/message.ts` | 消息类型定义 |
| `src/messageBus.ts` | 事件总线，组件间通信 |
| `src/uiBridge.ts` | UI 层与后端的通信桥梁 |
| `src/nodeBridge.ts` | Node 后端逻辑处理 |

**关键概念**:
- 使用 `DirectTransport` 创建双向通信通道
- UI 层和业务层解耦

#### 5. AI 集成

| 文件 | 作用 |
|------|------|
| `src/model.ts` | 多模型支持，模型配置 |
| `src/llmsContext.ts` | LLM 上下文管理 |
| `src/utils/ai-sdk.ts` | AI SDK 工具函数 |
| `src/systemPrompt.ts` | 系统提示词 |

**支持的 AI 提供商**:
- Anthropic (Claude)
- OpenAI (GPT)
- DeepSeek
- Google (Gemini)
- xAI (Grok)
- OpenRouter

---

### 阶段 3: 扩展机制 (1小时)

#### 6. 插件系统

**文件**: `src/plugin.ts`
- **Hook 类型**: `initialized`, `beforeSend`, `afterReceive` 等
- **插件示例**: `src/plugins/stagewise.ts`

**插件结构**:
```typescript
export interface Plugin {
  name: string;
  hooks: {
    [key: string]: PluginHook;
  };
}
```

#### 7. Slash 命令

**文件**: `src/slashCommand.ts`
- 命令解析逻辑
- 命令注册和查找

**内置命令**: `src/slash-commands/builtin/`
```
├── clear.tsx          # 清除历史
├── help.ts            # 帮助信息
├── login.tsx          # API Key 登录
├── logout.tsx         # 退出登录
├── model.tsx          # 模型选择
├── mcp.tsx            # MCP 服务器管理
├── output-style.tsx   # 输出样式配置
├── status.ts          # 状态查看
└── ...
```

#### 8. MCP 集成

**文件**: `src/mcp.ts`
- **作用**: Model Context Protocol 支持
- **传输方式**: stdio, SSE, HTTP
- **配置示例**: `examples/mcp/package.json`

---

### 阶段 4: UI 层 (1小时)

#### 9. 终端 UI (使用 Ink/React)

**目录**: `src/ui/`

**核心组件**:
```
src/ui/
├── App.tsx                 # 主应用入口
├── ChatInput.tsx           # 用户输入组件
├── Messages.tsx            # 消息列表显示
├── ApprovalModal.tsx       # 工具审批弹窗
├── DiffViewer.tsx          # 代码差异查看
├── StatusLine.tsx          # 状态栏
├── Todo.tsx                # 任务列表
├── Suggestion.tsx          # 输入建议
└── store.ts                # Zustand 状态管理
```

**UI 状态管理**:
- 使用 Zustand 进行状态管理
- `useAppStore` 包含所有 UI 状态

**输入处理**:
- `src/ui/TextInput/` - 自定义文本输入组件
- 支持多行编辑、图片粘贴、外部编辑器

---

### 阶段 5: 实战调试 (持续)

#### 10. 调试方法

##### 方法 1: 开发模式运行
```bash
# 使用 bun 直接运行源码
bun ./src/cli.ts

# 或使用 npm script
pnpm dev
```

##### 方法 2: 启用调试日志
```bash
# 显示详细的调试信息
DEBUG=neovate* bun ./src/cli.ts

# 只显示特定模块的日志
DEBUG=neovate:tool* bun ./src/cli.ts
```

##### 方法 3: 安静模式测试
```bash
# 非交互模式，快速测试功能
bun ./src/cli.ts -q "你的问题"

# 指定模型
bun ./src/cli.ts -q -m gpt-4o "你的问题"
```

##### 方法 4: 查看会话日志
```bash
# 日志文件位置
cat ~/.neovate/projects/<project-hash>/sessions/<session-id>.jsonl

# 最新会话
ls -lt ~/.neovate/projects/<project-hash>/sessions/ | head -n 2
```

##### 方法 5: VSCode 断点调试
1. 按 `⌘+⇧+D` (Mac) 或 `Ctrl+Shift+D` (Windows/Linux)
2. 选择 "Debug cli" 配置
3. 设置断点后启动调试

##### 方法 6: 查看配置和状态
```bash
# 查看配置
neovate config

# 查看 MCP 服务器
neovate mcp

# 查看当前状态
/status
```

---

## 关键数据流

```
┌─────────────────────────────────────────────────────────────┐
│                        用户输入                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
                    parseArgs()
                         ↓
          ┌──────────────┴──────────────┐
          ↓                             ↓
    runInteractive()              runQuiet()
    (交互模式)                    (安静模式)
          ↓                             ↓
          └──────────────┬──────────────┘
                         ↓
                  Context.create()
                  (加载配置/插件/MCP)
                         ↓
                  Project.send()
                  (发送消息到 LLM)
                         ↓
                  AI 处理消息
                  (生成回复和工具调用)
                         ↓
           ┌─────────────┴─────────────┐
           ↓                           ↓
      纯文本回复                   工具调用
           ↓                           ↓
      显示给用户                  用户审批
                                       ↓
                                  执行工具
                                       ↓
                                  返回结果
                                       ↓
                              继续 AI 处理
                                       ↓
                                  最终输出
```

---

## 快速上手技巧

### 1. 边运行边调试
```bash
# 先运行，观察执行流程
pnpm dev

# 输入一个简单的问题
"帮我创建一个 hello.txt 文件，内容是 Hello World"
```

### 2. 搜索关键字
```bash
# 搜索工具相关代码
rg "createTool" src/

# 搜索消息处理
rg "handleMessage" src/

# 搜索会话管理
rg "Session" src/
```

### 3. 查看测试用例
测试文件是理解功能的最佳示例：
```bash
# 查看所有测试
find src -name "*.test.ts"

# 运行测试
pnpm test

# 监听模式运行测试
pnpm test:watch
```

### 4. 参考关键文档
- **AGENTS.md**: 给 AI Agent 的项目指南，包含详细架构说明
- **CONTRIBUTING.md**: 开发指南和调试方法
- **README.md**: 快速开始和基本使用

### 5. 阅读类型定义
类型定义文件可以帮助理解数据结构：
- `src/context.ts` - Context 接口
- `src/plugin.ts` - Plugin 接口
- `src/tool.ts` - Tool 接口
- `src/slash-commands/types.ts` - SlashCommand 接口

---

## 核心概念解析

### Context (上下文)
- **作用**: 全局依赖注入容器
- **包含**: 配置、插件、MCP 服务器、路径管理
- **创建**: `Context.create({ cwd, ...opts })`

### Project (项目)
- **作用**: 管理单个项目的 AI 交互
- **核心方法**: `send(message, options)` - 发送消息给 AI
- **会话管理**: 自动处理会话创建、加载、保存

### Session (会话)
- **存储位置**: `~/.neovate/projects/<project-hash>/sessions/`
- **格式**: JSONL (每行一个 JSON 对象)
- **内容**: 消息历史、工具调用记录

### Tool (工具)
- **定义**: 使用 `createTool()` 创建
- **Schema**: 使用 zod 定义输入输出
- **执行**: 可能需要用户审批

### Plugin (插件)
- **Hook 类型**:
  - `initialized`: 初始化后
  - `beforeSend`: 发送消息前
  - `afterReceive`: 接收消息后
- **执行方式**: Series (串行) 或 Parallel (并行)

### MCP (Model Context Protocol)
- **作用**: 连接外部工具和服务
- **配置**: JSON 格式，支持 stdio/SSE/HTTP 传输
- **示例**: Chrome DevTools、文件系统访问等

---

## 开发环境配置

### 必需工具
```bash
# 安装 Volta (Node.js 版本管理)
curl https://get.volta.sh | bash
export VOLTA_FEATURE_PNPM=1

# 自动使用项目指定的 Node.js 和 pnpm 版本
# Node.js 22.11.0, pnpm 10.13.1
```

### 安装依赖
```bash
pnpm install
```

### 构建项目
```bash
pnpm build
```

### 运行测试
```bash
# 运行所有测试
pnpm test

# 运行 E2E 测试 (需要配置 E2E_MODEL)
pnpm test:e2e

# 类型检查
pnpm typecheck

# 格式化代码
pnpm biome:format -- --write
```

### 提交前检查
```bash
# 运行所有检查
pnpm ready

# 包含 E2E 测试
pnpm ready --e2e
```

---

## 常见问题排查

### 1. 如何添加新的工具？
1. 在 `src/tools/` 创建新文件
2. 使用 `createTool()` 定义工具
3. 在相应位置注册工具

### 2. 如何添加新的 Slash 命令？
1. 在 `src/slash-commands/builtin/` 创建新文件
2. 实现命令接口
3. 在 `index.ts` 中导出

### 3. 如何调试 AI 交互？
- 查看 `~/.neovate/projects/*/sessions/*.jsonl`
- 使用 `DEBUG=neovate:llm* pnpm dev`
- 启用安静模式查看原始输出

### 4. 如何测试新功能？
1. 编写单元测试 (`*.test.ts`)
2. 运行 `pnpm test:watch`
3. 或创建 E2E 测试场景

---

## 推荐学习顺序

### 第一天: 基础理解
1. ✅ 运行 `pnpm dev`，体验功能
2. ✅ 阅读 `src/cli.ts` 和 `src/index.ts`
3. ✅ 理解 Context 和 Project 概念

### 第二天: 工具系统
1. ✅ 阅读 `src/tool.ts` 核心实现
2. ✅ 学习 `src/tools/read.ts` 和 `src/tools/edit.ts`
3. ✅ 尝试添加一个简单的自定义工具

### 第三天: 消息流转
1. ✅ 理解 `src/messageBus.ts` 机制
2. ✅ 学习 UI 和 Node 的通信 (Bridge)
3. ✅ 查看消息处理链路

### 第四天: UI 层
1. ✅ 学习 Ink 框架基础
2. ✅ 阅读 `src/ui/App.tsx` 主结构
3. ✅ 理解状态管理 (`store.ts`)

### 第五天: 扩展机制
1. ✅ 学习插件系统
2. ✅ 理解 MCP 协议集成
3. ✅ 研究 Slash 命令实现

---

## 学习资源

### 官方资源
- **官网**: https://neovateai.dev
- **GitHub**: https://github.com/neovateai/neovate-code
- **文档**: https://neovateai.dev/en/docs/quickstart

### 相关技术文档
- **Ink**: https://github.com/vadimdemedes/ink
- **Bun**: https://bun.sh/docs
- **AI SDK**: https://sdk.vercel.ai/docs
- **MCP**: Model Context Protocol 文档

### 社区资源
- **Issues**: GitHub Issues 页面
- **贡献指南**: CONTRIBUTING.md

---

## 总结

从 **`src/index.ts:259`** 的 `runNeovate()` 函数开始阅读是最佳起点！

按照以上路线图，循序渐进，结合实际调试，可以在 1-2 周内掌握项目核心架构和关键功能。

**关键要点**:
- 先运行，后阅读
- 关注数据流转
- 查看测试用例
- 善用调试工具
- 由浅入深，逐步深入

祝学习顺利！🚀
