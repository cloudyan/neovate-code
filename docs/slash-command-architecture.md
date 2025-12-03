# 斜杠命令架构设计文档

**文件:** `src/slashCommand.ts`

## 概述

斜杠命令系统是 Neovate Code 中的核心功能之一，允许用户通过 `/command` 格式的指令与系统进行交互。该系统支持多种类型的命令，包括内置命令、插件命令、用户定义的 Markdown 命令等。

## 核心功能

### 1. 命令管理器 (SlashCommandManager)

`SlashCommandManager` 类负责管理所有可用的斜杠命令，主要职责包括：

- **命令加载**: 按优先级加载四类命令
  - 内置命令(builtin): 通过 `createBuiltinCommands` 静态加载
  - 插件命令(plugin): 通过插件系统的 `slashCommand` 钩子动态加载
  - 全局命令(global): 从用户配置目录的 Markdown 文件加载
  - 项目命令(project): 从项目配置目录的 Markdown 文件加载

- **命令类型**:
  - `LocalCommand`: 执行本地函数逻辑
  - `LocalJSXCommand`: 渲染 React JSX 组件界面
  - `PromptCommand`: 生成提示词发送给 AI 模型处理

- **命令操作**: 提供获取、过滤、匹配等操作方法

### 2. 命令解析

- `parseSlashCommand(input: string)`: 解析输入字符串，分离命令和参数
- `isSlashCommand(input: string)`: 判断输入是否为斜杠命令
- `replaceParameterPlaceholders(prompt: string, args: string)`: 替换参数占位符

## 架构设计

### 命令源 (CommandSource)

```typescript
export enum CommandSource {
  Builtin = 'builtin',    // 内置命令
  User = 'user',          // 用户全局命令
  Project = 'project',    // 项目特定命令
  Plugin = 'plugin',      // 插件命令
}
```

### 命令类型接口

- **BaseSlashCommand**: 基础命令接口，包含名称、描述和启用状态
- **LocalCommand**: 同步/异步执行本地逻辑的命令
- **LocalJSXCommand**: 返回 React 组件的命令
- **PromptCommand**: 生成 AI 提示词的命令

## 流程流转

### 1. 命令初始化流程

```
Context.create() 
  ↓
SlashCommandManager.create() 
  ↓
加载内置命令 -> 加载插件命令 -> 加载全局命令 -> 加载项目命令
  ↓
构建 Map<string, CommandEntry> 存储所有命令
```

### 2. 命令执行流程

```
用户输入 /command args
  ↓
isSlashCommand() 判断
  ↓
parseSlashCommand() 解析命令和参数
  ↓
SlashCommandManager.get() 获取命令定义
  ↓
根据命令类型执行相应逻辑:
  - LocalCommand: 直接调用 command.call()
  - LocalJSXCommand: 调用 command.call() 渲染 JSX
  - PromptCommand: 调用 getPromptForCommand() 生成提示词
```

### 3. Markdown 命令加载流程

```
loadPolishedMarkdownFiles(配置目录)
  ↓
解析 Markdown 文件内容 (使用 front-matter 解析属性)
  ↓
fileToPromptCommand() 转换为 PromptCommand
  ↓
设置命令名称、描述、模型等属性
  ↓
处理参数占位符 ($1, $2, $ARGUMENTS 或追加到提示词末尾)
```

### 4. Markdown 文件到 PromptCommand 的详细转换流程

1. **文件发现**: `loadPolishedMarkdownFiles()` 递归扫描指定目录下的 `.md` 文件
2. **内容解析**: 使用 `front-matter` 解析 Markdown 文件的属性和内容体
3. **属性提取**: 从 front-matter 中提取 `model`、`progressMessage` 等可选属性
4. **名称和描述生成**: 
   - 名称从文件名或相对路径生成 (路径分隔符转为冒号)
   - 描述优先使用 front-matter 中的 `description`，否则使用文件体第一行或文件名转换
5. **PromptCommand 创建**: 
   - 创建 `type: 'prompt'` 的命令对象
   - 设置 `getPromptForCommand` 函数，该函数在执行时会:
     * 获取 Markdown 文件的 body 内容
     * 如果包含位置参数占位符 ($1, $2, etc.)，则使用 `replaceParameterPlaceholders()` 替换
     * 如果包含 `$ARGUMENTS` 占位符，则替换为用户输入的参数
     * 如果没有占位符但有参数，则将参数追加到提示词末尾
     * 返回包含用户角色和提示词内容的对象数组

### 5. PromptCommand 与 LLM 交互流程

当用户执行一个 `PromptCommand` 时的详细流程:

```
1. 用户输入 /command args
   ↓
2. UI 检测到斜杠命令，调用 isSlashCommand() 确认
   ↓
3. 调用 parseSlashCommand() 解析命令名和参数
   ↓
4. 通过 bridge.request('slashCommand.get') 从后端获取命令定义
   ↓
5. 创建用户消息对象并添加到会话历史
   ↓
6. 执行 slashCommand.execute 请求
   ↓
7. 对于 PromptCommand:
   a) 调用 command.getPromptForCommand(args) 生成提示词数组
   b) 将生成的提示词消息添加到会话
   c) 调用 sendMessage() 发送给 LLM
   d) 指定命令中配置的模型 (如果存在)
   ↓
8. LLM 处理并返回响应，显示给用户
```

具体在 UI Store 的 send() 方法中:

- 检测输入是否为斜杠命令
- 如果是 PromptCommand 类型:
  - 调用 `getPromptForCommand` 生成消息数组
  - 将原始用户输入消息添加到会话
  - 将生成的提示词消息添加到会话
  - 调用 `sendMessage` 方法发送给 LLM
  - 可以指定该命令配置的特定模型
- 系统通过 `bridge` 与后端通信执行命令
- LLM 的响应将作为助手消息返回并显示给用户

示例 Markdown 文件格式:
```markdown
---
description: "分析代码问题"
model: "gpt-4o"
progressMessage: "正在分析代码..."
---
请分析以下代码中的潜在问题：

```code
$1
```

提供修复建议。
```

这个文件会被转换为名为 `filename` 的 PromptCommand，当用户执行 `/filename mycode.js` 时，会生成:
```json
[{
  "role": "user",
  "content": "请分析以下代码中的潜在问题：\n\n```code\nmycode.js\n```\n\n提供修复建议。"
}]
```

## 重要方法

### SlashCommandManager 类方法

- `get(name: string)`: 获取特定命令
- `getAll()`: 获取所有启用的命令
- `getCommandsBySource(source: CommandSource)`: 按来源获取命令
- `getMatchingCommands(prefix: string)`: 模糊匹配命令（用于自动补全）
- `hasCommand(name: string)`: 检查命令是否存在

### 辅助函数

- `replaceParameterPlaceholders()`: 支持 $1, $2 等参数占位符
- `isFilePath()`: 区分文件路径和斜杠命令
- `parseSlashCommand()`: 解析命令和参数

## 设计特点

1. **模块化设计**: 命令类型清晰分离，易于扩展
2. **优先级加载**: 不同来源的命令按优先级加载，避免冲突
3. **参数支持**: 支持多种参数占位符格式
4. **启用控制**: 通过 `isEnabled` 属性控制命令是否可用
5. **灵活性**: 支持不同类型的命令满足不同场景需求

## 参数占位符示例

`replaceParameterPlaceholders` 函数支持位置参数占位符，如 `$1`, `$2`, `$3` 等：

```typescript
// 示例 1: 基本替换
const prompt = "请分析 $1 文件中的错误并修复 $2 问题";
const args = "index.ts security";
// 结果: "请分析 index.ts 文件中的错误并修复 security 问题"

// 示例 2: 多个相同占位符
const prompt = "创建 $1 组件并添加 $1 的 $2 测试";
const args = "Button click";
// 结果: "创建 Button 组件并添加 Button 的 click 测试"

// 示例 3: 参数不足时的处理
const prompt = "优化 $1 和 $2 功能，注意 $3 安全性";
const args = "登录";
// 结果: "优化 登录 和  功能，注意  安全性" (缺少的参数被替换为空字符串)
```

## 扩展性

- **插件扩展**: 通过插件系统可以动态添加命令
- **Markdown 定义**: 用户可通过 Markdown 文件定义自定义命令
- **类型安全**: 完整的 TypeScript 类型定义

## 使用示例

内置命令如 `/help`, `/clear`, `/model` 等通过 `createBuiltinCommands` 注册。
用户可以创建 Markdown 文件定义的命令，支持参数占位符，如：
`/mycommand arg1 arg2` 中的 `arg1` 和 `arg2` 会被 `$1`, `$2` 占位符替换。
