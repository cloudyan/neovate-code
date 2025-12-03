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

---

# Agent 系统设计 (更新)

## 概述

Agent 系统采用**两层架构**设计，实现智能路由和执行分离：

```
用户输入
  ↓
[AgentRouter - 智能路由层] - 用 LLM 分析意图，选择 Agent (GPT-4o-mini)
  ↓
[Agent - 执行层] - Agent 执行任务，动态加载 Skills
  ↓
[主 LLM] - 执行具体任务
```

## 核心组件

### 1. AgentRouter (智能路由)
- **职责**: 分析用户意图，选择最合适的 Agent
- **实现**: 使用 GPT-4o-mini 进行意图分析
- **成本**: ~$0.005/次
- **准确性**: ~70-80%

### 2. Agent 抽象基类
- **职责**: 提供 Agent 的通用能力
- **功能**:
  - 解析 Agent 配置文件
  - 动态加载 Skills
  - 构建 system prompt
  - 管理工具权限

### 3. 具体 Agent 实现
- **CodeReviewerAgent**: 代码审查专家
- **TaskExecutorAgent**: 任务执行专家
- **GeneralPurposeAgent**: 通用研究专家

### 4. SkillLoader (技能管理)
- **职责**: 加载 `.claude/skills/` 目录下的技能
- **功能**:
  - 解析 YAML frontmatter
  - 加载 checklists、examples、reference
  - 缓存已加载的 Skills

### 5. AgentManager (统一管理)
- **职责**: 统一管理 Agent 系统
- **功能**:
  - 启用/禁用 Agent 系统
  - 处理用户请求
  - 集成到 Context 系统

## 数据流

### Agent 选择流程
1. 用户输入 → AgentRouter
2. 用 LLM 分析意图 → 选择合适的 Agent
3. 选定 Agent → 分析需要的 Skills
4. 加载 Skills → 构建完整 system prompt
5. 执行任务 → 返回结果

### Skill 动态加载
```
Agent 执行:
  ↓
分析用户任务
  ↓
SkillLoader 获取可用 Skills
  ↓
用 LLM 选择相关 Skills
  ↓
构建包含 Skills 的 system prompt
  ↓
执行任务
```

## 集成点

### 1. Context 系统集成
- 在 `Context` 类中添加 `agentManager` 属性
- 通过 `AgentManager` 统一管理 Agent 功能

### 2. 配置系统集成
- 添加 `AgentConfig` 类型定义
- 支持 `"agent": { "enabled": true }` 配置

### 3. 插件系统集成
- 通过插件钩子集成到 `systemPrompt` 生成流程
- 自动激活 Agent 的 system prompt

### 4. Slash 命令集成
- 提供 `/agent` 命令进行管理
- 支持 `list`, `enable`, `disable`, `status` 等操作

## 关键设计决策

### 1. 两层架构 (而非单层或三层)
- **优势**: 职责分离，成本可控，易于扩展
- **成本**: 两次 LLM 调用 (~$0.01-0.02/次)
- **延迟**: 300-600ms

### 2. 动态 Skill 选择 (而非预定义)
- **优势**: 灵活，token 优化
- **实现**: 用 LLM 根据任务选择相关 Skills

### 3. 向后兼容设计
- 不破坏现有 systemPrompt 系统
- 通过插件钩子平滑集成
- 可通过配置启用/禁用

## 性能指标

| 指标 | 值 | 说明 |
|------|----|------|
| 响应时间 | +300-600ms | 意图分析 + Skill 选择 |
| 成本 | ~$0.01-0.02/次 | GPT-4o-mini 分析 + 主模型执行 |
| 准确率 | 70-80% | 意图识别准确率 |
| Token 优化 | 30-50% | 只加载相关 Skills |

## 使用示例

```bash
# 启用系统
echo '{"agent": {"enabled": true}}' > ~/.neovate/config.json

# 使用
neo
> 帮我 review 这段代码        # 自动激活 CodeReviewerAgent
> 优化这个查询的性能        # 自动激活 TaskExecutorAgent
> 搜索相关的配置文件        # 自动激活 GeneralPurposeAgent
```

## 扩展性

### 支持新 Agent 类型
1. 创建新的 Agent 类继承 `Agent` 基类
2. 实现 `metadata` 和 `execute` 方法
3. 系统自动注册

### 支持新 Skills
1. 在 `.claude/skills/` 目录创建 Skill 文件
2. 使用 YAML frontmatter 定义 metadata
3. 系统自动加载和选择

## 风险与缓解

### 1. API 成本
- **风险**: 频繁调用 LLM 增加成本
- **缓解**: 提供启用/禁用开关，可选配

### 2. 响应延迟
- **风险**: 两次 LLM 调用增加延迟
- **缓解**: 异步执行，提供缓存机制

### 3. 准确率问题  
- **风险**: 意图识别错误
- **缓解**: 提供 fallback 机制，返回通用 agent
