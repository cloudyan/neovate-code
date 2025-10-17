# iFlow 上下文信息 (IFLOW.md)

## 项目概述

Neovate Code 是一个 AI 驱动的编码代理（coding agent），旨在增强开发工作流程。它允许用户通过自然语言指令生成代码、修复错误、审查代码、添加测试等。

核心特性包括：
- **智能模型路由**: 根据任务需求自动选择最合适的 AI 模型。
- **交互式 CLI**: 提供命令行界面，支持交互式和安静模式。
- **插件系统**: 可扩展的插件架构，允许自定义功能。
- **工具审批**: 对 AI 执行的工具调用进行审批，确保安全性。
- **MCP 集成**: 支持 Model Context Protocol (MCP) 服务器，集成外部工具。

## 项目结构

```
.
├── README.md
├── package.json
├── src/
│   ├── index.ts          # CLI 入口点
│   ├── context.ts        # 全局上下文和依赖注入容器
│   ├── plugin.ts         # 插件系统定义
│   ├── project.ts        # 项目会话管理核心
│   ├── tool.ts           # 工具系统核心
│   ├── commands/         # 子命令实现 (config, commit, mcp, run, update)
│   ├── tools/            # 内置工具实现 (bash, edit, fetch, glob, grep, ls, read, todo, write)
│   └── ...
├── browser/              # 浏览器端实现 (可能用于未来功能)
├── docs/                 # 项目文档
├── e2e/                  # 端到端测试
├── examples/             # 示例配置
├── mcps/                 # MCP 相关脚本
├── scripts/              # 构建和辅助脚本
├── vendor/               # 第三方依赖 (如 ripgrep)
└── vscode-extension/     # VS Code 扩展
```

## 核心概念

### Context (上下文)
`Context` 类是整个应用的依赖注入容器。它管理配置、插件、路径和 MCP 服务器。所有核心组件都通过 `Context` 获取依赖。

### Plugin (插件)
Neovate 使用基于钩子的插件系统。插件可以扩展功能，如添加新工具、修改系统提示词、监听事件等。插件可以是内置的、全局的、项目的或通过命令行指定的。

### Project & Session (项目和会话)
`Project` 类管理单个会话。会话包含用户与 AI 的交互历史。`Project` 负责发送消息、执行 AI 交互循环、管理工具调用和审批。

### Tool (工具)
AI 代理通过工具与环境交互。工具包括文件读写、执行命令、搜索代码库等。工具调用需要经过审批（除非在特定模式下自动批准）。

### MCP (Model Context Protocol)
MCP 允许 Neovate 集成外部工具和服务，如 Chrome DevTools。

## 构建和运行

### 环境准备
- Node.js (推荐使用 Volta 管理版本)
- pnpm

### 安装依赖
```bash
pnpm install
```

### 构建项目
```bash
pnpm build
```

### 开发模式
```bash
# 使用 bun 运行开发版本
pnpm dev

# 或者创建别名方便快速测试
alias t="bun /path/to/neovate/src/cli.ts"
t
```

### 运行 CLI
构建后，可以使用以下命令运行 CLI：
```bash
# 使用完整名称
neovate [options] [prompt]

# 使用短别名
neo [options] [prompt]
```

### 运行测试
```bash
# 运行单元测试
pnpm test

# 运行端到端测试 (需要配置 E2E_MODEL 环境变量)
pnpm test:e2e
```

### 代码质量检查
```bash
# 运行类型检查、格式化检查和测试
pnpm ci

# 准备提交 (运行所有检查)
pnpm ready
```

## 配置

配置可以通过多种方式提供，优先级从高到低：
1. 命令行参数
2. 项目配置文件 (`<cwd>/.neovate/config.json`)
3. 全局配置文件 (`~/.neovate/config.json`)
4. 默认配置

## 插件开发

插件是一个导出 `Plugin` 对象的 JavaScript/TypeScript 模块。插件可以通过钩子扩展功能。

示例插件结构：
```typescript
export default {
  name: 'my-plugin',
  // 在配置加载后调用，可以修改配置
  config: function({ config, argvConfig }) {
    return { ...config, mySetting: true };
  },
  // 在工具解析时调用，可以添加新工具
  tool: function({ sessionId }) {
    return [{
      name: 'my-tool',
      description: 'My custom tool',
      parameters: z.object({ ... }),
      execute: async (params) => { ... }
    }];
  }
} satisfies Plugin;
```

## 调试

1. 使用 VS Code 调试配置 "Debug cli"
2. 设置 `DEBUG=neovate*` 环境变量查看调试日志
3. 使用 `-q` 选项查看详细输出
4. 检查会话日志文件 (`~/.neovate/projects/<project-id>/<session-id>.jsonl`)

## 发布

```bash
# 发布补丁版本
pnpm release

# 发布次要版本
pnpm release:minor

# 发布主要版本
pnpm release:major
```
