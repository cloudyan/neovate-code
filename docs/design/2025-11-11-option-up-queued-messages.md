# 将"编辑队列消息"的快捷键从 Up 改为 Option+Up

**日期:** 2025-11-11  
**状态:** 已实现

## 概述

将编辑队列消息的键盘快捷键从单独的"Up"方向键改为"Option + Up"方向键,同时保留单独的"Up"键用于命令历史导航。

## 需求

- Option + Up 方向键触发"编辑队列消息"功能
- 仅在有队列消息时生效(队列为空时不执行任何操作)
- 单独的 Up 方向键继续用于命令历史导航
- 支持 Mac (Option)、Linux (Alt) 和 Windows (Alt)

## 架构

### 组件变更

**TextInput 组件 (`src/ui/TextInput/index.tsx`):**
- 添加新属性: `onQueuedMessagesUp?: () => void`
- 将此属性传递给 `useTextInput` hook

**useTextInput hook (`src/ui/TextInput/hooks/useTextInput.ts`):**
- 在 props 接口中添加 `onQueuedMessagesUp`
- 在 `mapKey` 函数中,在单独的 `key.upArrow` 之前添加 `key.upArrow && key.meta` 的情况
- 检测到 Option+Up 时路由到新回调
- 注意: `key.meta` 在终端中映射到 Option/Alt 键

**useInputHandlers hook (`src/ui/useInputHandlers.ts`):**
- 创建新处理器: `handleQueuedMessagesUp`
- 在执行操作前检查 `queuedMessages.length > 0`
- 如果队列有消息,触发现有的队列编辑逻辑
- 如果队列为空,不执行任何操作

**ChatInput 组件 (`src/ui/ChatInput.tsx`):**
- 将新的 `onQueuedMessagesUp` 回调传递给 TextInput
- 为单独的 Up 方向键保留现有的 `onHistoryUp`
- 将占位符文本从"Press up to edit queued messages"更新为"Press option+up to edit queued messages"

## 实现流程

1. 用户在终端中按下 Option + Up 方向键
2. Ink 捕获为 `key.upArrow = true` 和 `key.meta = true`
3. `useTextInput.mapKey()` 首先检查 `key.upArrow && key.meta`
4. 路由到 `onQueuedMessagesUp` 回调
5. 处理器检查队列长度,如果有消息则编辑第一条队列消息

## 按键检测顺序

在 `mapKey` 函数中,检查必须按以下顺序进行:
```typescript
case key.upArrow && key.meta:
  return () => onQueuedMessagesUp?.()
case key.upArrow:
  return upOrHistoryUp
```

Option+Up 检查必须在单独的 Up 检查之前,以防止穿透。

## 边界情况

- **空队列:** 按下 Option+Up 时不执行任何操作
- **光标位置:** Option+Up 不受光标位置影响(不像单独的 Up 键会考虑光标移动)
- **单独的 Up 键行为:** 不受影响,继续用于命令历史导航

## 测试

仅手动测试:
1. 在有队列消息时测试 Option+Up → 应编辑第一条消息
2. 在队列为空时测试 Option+Up → 应不执行任何操作
3. 测试单独的 Up 键 → 应仍可导航命令历史
4. 在不同光标位置进行测试
5. 在 Mac (Option)、Linux (Alt)、Windows (Alt) 上验证

不需要自动化测试 - 终端 UI 中的键盘交互不在现有测试结构的覆盖范围内。

## 权衡

**选择的方案: 方案 1 - 新回调属性**
- 关注点清晰分离
- 历史记录和队列导航之间界限清晰
- 需要一个额外的属性/回调
- 复杂度低

**拒绝的替代方案:**
- 带元数据参数的单一回调(双重职责)
- 处理器中的条件逻辑(将 UI 状态与输入处理混合)
