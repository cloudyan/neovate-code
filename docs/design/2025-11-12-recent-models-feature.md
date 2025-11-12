# Recent Models 功能设计

**Date:** 2025-11-12

## Context
为 neovate-code 实现类似 opencode 的 Select model Recent 功能，允许用户快速访问他们最近使用的 AI 模型，提高在不同模型间切换的工作效率。此外，增加快捷切换功能，允许用户通过 Ctrl+. 快捷键快速循环切换到最近使用的模型。

## Discussion
在分析 opencode 的 Recent 功能后，确定了核心需求：
1. 在模型选择界面显示最近使用的模型
2. 限制最近模型列表长度（最多5个）
3. 将最近使用的模型显示在列表顶部
4. 确保模型选择后自动更新最近使用列表
5. 将数据持久化到全局数据文件中

主要实现方式包括：
- 创建 RecentModelsManager 类管理最近模型数据
- 扩展 ConfigManager 类以支持 recentModels 字段
- 修改 NodeBridge 中的模型相关 API
- 更新 ModelSelect 组件以显示最近模型
- 在模型选择时更新最近使用列表

## Approach
1. 创建 RecentModelsManager 类封装最近模型管理逻辑
2. 修改 ConfigManager 类以支持 recentModels 数据结构
3. 修改 models.list API 以返回最近使用的模型
4. 添加 models.addRecent API 用于更新最近使用列表
5. 更新 ModelSelect 组件将最近模型显示在顶部
6. 修改 setModel 函数在模型选择时更新最近使用列表

## Architecture
- **RecentModelsManager**: 管理最近模型的添加、获取和清空操作
- **ConfigManager**: 扩展支持 recentModels 字段，包含 providerId、modelId 
- **NodeBridge**: 
  - models.list 处理程序返回 recentModels 数据
  - models.addRecent 处理程序更新最近使用列表
- **ModelSelect 组件**: 
  - 显示最近使用模型在模型列表顶部的独立分组
  - 使用 useMemo 优化性能
- **UI Store**: 
  - setModel 方法调用 API 更新最近使用模型
  
## Implementation Details
- 在模型选择时调用 models.addRecent API 更新最近使用列表
