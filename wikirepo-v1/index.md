# Neovate Code Wiki 文档

## 项目概述

Neovate Code 是一个编码代理，旨在增强您的开发工作流程。它可以帮助您生成代码、修复错误、审查代码、添加测试等。

### 核心特性

- **智能编码助手**: 利用AI技术辅助代码开发
- **多模型支持**: 支持多种LLM提供商（OpenAI, Anthropic, Google等）
- **智能路由**: 自动选择最适合任务的AI模型
- **完整的工具集**: 提供读取、写入、执行命令等多种工具
- **安全机制**: 完善的工具调用审批机制，保障安全
- **会话管理**: 支持会话持久化和恢复
- **MCP集成**: 支持Model Context Protocol，可扩展外部工具

## 文档目录

1. [项目画像报告](./project-profile.md) - 项目基本信息、结构概览和核心模块分析
2. [深度代码分析](./deep-analysis.md) - 核心架构、工具系统和安全机制的详细分析
3. [架构文档](./architecture.md) - 系统架构设计和组件交互
4. [核心模块详解](./core-modules.md) - Context、Project、工具系统等核心模块的详细说明
5. [工具使用指南](./tools-guide.md) - 各种工具的使用方法和示例
6. [会话管理](./session-management.md) - 会话创建、恢复和管理机制
7. [MCP集成](./mcp-integration.md) - Model Context Protocol集成和扩展
8. [安全机制](./security.md) - 安全设计和防护措施
9. [插件系统](./plugin-system.md) - 插件开发和扩展机制
10. [命令行使用](./cli-usage.md) - 命令行工具的使用方法
11. [配置管理](./configuration.md) - 配置文件和参数设置
12. [开发指南](./development.md) - 开发环境搭建和贡献指南

## 快速开始

### 安装

```bash
npm install -g @neovate/code
```

### 基本使用

```bash
neovate
# 或使用简短别名
neo
```

### 配置API密钥

如果还没有API密钥，输入 `/login`，选择提供商，打开网站并输入API密钥。

然后输入 `/model` 选择该提供商的模型。

之后就可以开始使用Neovate Code，在命令行中描述想要执行的操作，审查建议的更改并批准工具调用。

### 使用示例

```bash
# 可以执行的操作示例：
"为用户认证函数添加错误处理"
"将此组件重构为TypeScript"
"为支付服务创建单元测试"
"优化此数据库查询"
```

## 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 文件，了解设置开发环境、运行测试和提交拉取请求的指南。
