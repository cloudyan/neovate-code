# Agent 系统设计

**Date:** 2025-11-14

## Context
基于对 opencode agent 实现的分析，设计一个可接入 Neovate 的完整 agent 管理系统。当前 Neovate 仅有静态的 agent 文档模板，缺乏运行时的 agent 管理功能。目标是实现一个完整的 agent 生态，包含创建、配置、选择和权限管理功能。

## Discussion
在设计过程中，考虑了三种实现方案：基于现有 Neovate 架构扩展、独立的 Agent 框架、opencode 集成模式。最终选择了方案1，即基于现有 Neovate 架构的扩展，因为它与现有系统兼容性最好，开发成本适中，且能充分利用 Neovate 现有的配置、权限和UI系统。

关键讨论点包括：
- 如何与现有的 slash 命令系统集成
- 如何复用现有的权限控制系统
- 如何利用现有的 UI 组件（如 PaginatedGroupSelectInput）
- 如何处理 agent 的运行时状态管理

## Approach
采用渐进式扩展的方式，通过以下步骤实现：
1. 创建 Agent 管理模块，扩展现有配置系统
2. 添加 /agent slash 命令支持各种操作
3. 复用现有 UI 组件构建 agent 选择界面
4. 集成权限系统和运行时状态管理

## Architecture
**核心组件：**
- `src/agent/` 目录包含 AgentManager、AgentConfig、AgentStore
- Zod 验证的配置结构支持 name、description、tools、permissions、model 等属性
- 扩展 useAppStore 状态管理 agent 相关状态
- 复用 PaginatedGroupSelectInput 组件构建 agent 选择器

**数据流：**
用户 → /agent create → 配置存储 → /agent 选择 → 应用系统提示词和权限设置

**权限集成：**
复用现有工具权限系统，支持 agent 级别的细粒度权限控制，与 bash、edit、read 等工具权限保持一致。
