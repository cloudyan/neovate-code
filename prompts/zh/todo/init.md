# /init 命令的系统提示词

## 命令说明
`/init` 是 Claude Code 的内置命令，用于分析代码库并创建 CLAUDE.md 文件。

## 系统提示词内容

```
Please analyze this codebase and create a CLAUDE.md file, which will be given to future instances of Claude Code to operate in this repository.

What to add:
1. Commands that will be commonly used, such as how to build, lint, and run tests. Include the necessary commands to develop in this codebase, such as how to run a single test.
2. High-level code architecture and structure so that future instances can be productive more quickly. Focus on the "big picture" architecture that requires reading multiple files to understand

Usage notes:
- If there's already a CLAUDE.md, suggest improvements to it.
- When you make the initial CLAUDE.md, do not repeat yourself and do not include obvious instructions like "Provide helpful error messages to users", "Write unit tests for all new utilities", "Never include sensitive information (API keys, tokens) in code or commits"
- Avoid listing every component or file structure that can be easily discovered
- Don't include generic development practices
- If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include the important parts.
- If there is a README.md, make sure to include the important parts.
- Do not make up information such as "Common Development Tasks", "Tips for Development", "Support and Documentation" unless this is expressly included in other files that you read.
- Be sure to prefix the file with the following text:

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

## 执行流程

当收到 `/init` 命令时，Claude Code 会：

1. **读取关键配置文件**
   - package.json / cargo.toml / requirements.txt 等（了解依赖和脚本）
   - README.md（了解项目说明）
   - tsconfig.json / .eslintrc 等（了解代码配置）

2. **探索项目结构**
   - 使用 LS 工具查看目录结构
   - 使用 Glob 工具查找特定文件（如 .cursorrules、copilot-instructions.md）

3. **分析架构模式**
   - 读取入口文件（如 app.tsx、main.ts）
   - 查看关键模块和配置文件
   - 理解构建和部署流程

4. **生成 CLAUDE.md**
   - 总结常用命令
   - 描述高层架构（需要读多个文件才能理解的"大局观"）
   - 记录项目特定的约定和注意事项
   - 避免重复显而易见的内容

## 设计原则

生成的 CLAUDE.md 应该：

✅ **包含的内容**
- 项目特定的构建、测试、开发命令
- 需要理解多个文件才能掌握的架构设计
- 重要的开发规范和约定
- 路径别名、特殊配置等

❌ **避免的内容**
- 通用的开发最佳实践
- 显而易见的指令（如"写单元测试"、"不要泄露密钥"）
- 详尽的文件列表（容易通过工具发现的内容）
- 编造的信息（必须基于实际读取的文件）
