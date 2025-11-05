# 高思维努力程度的金色边框

**日期：** 2025-11-04
**状态：** 已实现

## 概述

当思维努力设置为 `'high'` 时，为ChatInput组件添加金色边框颜色。这提供了一个清晰的视觉指示，表明AI正在以最大思维容量运行。

## 需求

1. 当 `thinking.effort === 'high'` 时在ChatInput上显示金色边框
2. 当 `thinking.effort === 'high'` 时在StatusLine中为思维指示器显示金色
3. 金色边框优先于模式特定颜色（memory/bash）
4. 使用金色十六进制颜色 `#FFC046`
5. 与现有边框颜色系统集成

## 架构

### 基于优先级的颜色选择

该设计使用**基于优先级的方法**，其中高努力思维覆盖所有其他视觉状态。这反映了思维指示器的重要性。

**颜色优先级顺序：**
1. **最高：** `thinking.effort === 'high'` → 金色（`#FFC046`）
2. **高：** `mode === 'memory'` → 青色
3. **中等：** `mode === 'bash'` → 洋红色
4. **默认：** 正常模式 → 灰色

### 数据流

```
Store（思维状态）
  ↓
ChatInput组件（解构思维）
  ↓
borderColor useMemo（优先级检查）
  ↓
边框UI元素（带颜色的Text组件）
```

## 实现

### 常量添加

**位置：** `src/ui/constants.ts`

在 `UI_COLORS` 中添加新的颜色常量：

```typescript
export const UI_COLORS = {
  // ... 现有颜色
  CHAT_BORDER: 'gray',
  CHAT_BORDER_MEMORY: 'cyan',
  CHAT_BORDER_BASH: 'magenta',
  CHAT_BORDER_THINKING: 'gray',         // 新增：低/中等思维的灰色
  CHAT_BORDER_THINKING_HARD: '#FFC046', // 新增：高思维的金色
  // ...
} as const;
```

**颜色选择：**
- `CHAT_BORDER_THINKING`（`gray`）：用于低/中等思维努力级别，保持与默认边框的一致性
- `CHAT_BORDER_THINKING_HARD`（`#FFC046`）：高思维努力的暖金色，提供强烈的视觉对比，同时与青色（memory）和洋红色（bash）模式颜色保持区别

### ChatInput组件更改

**位置：** `src/ui/ChatInput.tsx`

#### 步骤1：解构思维状态

在store解构中添加 `thinking`（约第27行）：

```typescript
const {
  log,
  setExitMessage,
  planResult,
  cancel,
  slashCommandJSX,
  approvalModal,
  memoryModal,
  queuedMessages,
  status,
  setStatus,
  showForkModal,
  forkModalVisible,
  bashBackgroundPrompt,
  bridge,
  thinking,  // 添加
} = useAppStore();
```

#### 步骤2：更新边框颜色逻辑

修改 `borderColor` useMemo 以首先检查思维（约第127行）：

```typescript
const borderColor = useMemo(() => {
  if (thinking?.effort === 'high') return UI_COLORS.CHAT_BORDER_THINKING_HARD;
  if (mode === 'memory') return UI_COLORS.CHAT_BORDER_MEMORY;
  if (mode === 'bash') return UI_COLORS.CHAT_BORDER_BASH;
  return UI_COLORS.CHAT_BORDER;
}, [thinking, mode]);
```

**关键设计决策：**

1. **可选链：** 使用 `thinking?.effort` 安全处理思维禁用时的 `undefined`
2. **依赖数组：** 在现有 `mode` 依赖项旁边添加 `thinking`
3. **优先级顺序：** 思维检查优先，确保始终优先

### StatusLine组件更改

**位置：** `src/ui/StatusLine.tsx`

#### 步骤1：导入UI_COLORS

添加 `UI_COLORS` 导入以访问金色常量：

```typescript
import { UI_COLORS } from './constants';
```

#### 步骤2：更新ThinkingIndicator颜色逻辑

修改 `ThinkingIndicator` 组件以对努力级别使用适当的颜色：

```typescript
function ThinkingIndicator() {
  const { thinking } = useAppStore();

  if (!thinking) return null;

  const color = thinking.effort === 'high' ? UI_COLORS.CHAT_BORDER_THINKING_HARD : UI_COLORS.CHAT_BORDER_THINKING;

  return (
    <>
      {' | '}
      <Text color={color}>thinking: {thinking.effort}</Text>
    </>
  );
}
```

**颜色逻辑：**
- `effort === 'high'` → 金色（`CHAT_BORDER_THINKING_HARD`： `#FFC046`）
- `effort === 'low'` 或 `'medium'` → 灰色（`CHAT_BORDER_THINKING`： `gray`）

## 视觉行为

### ChatInput边框颜色

| 条件 | 边框颜色 | 十六进制/名称 |
|-----------|--------------|----------|
| thinking.effort === 'high' | 金色 | `#FFC046` |
| mode === 'memory'（无高思维） | 青色 | `cyan` |
| mode === 'bash'（无高思维） | 洋红色 | `magenta` |
| 默认模式 | 灰色 | `gray` |

### StatusLine思维指示器颜色

| 思维努力 | 文本颜色 | 十六进制/名称 |
|-----------------|------------|----------|
| high | 金色 | `#FFC046` |
| medium | 灰色 | `gray` |
| low | 灰色 | `gray` |

### 示例场景

1. **高思维 + 记忆模式：**
   - ChatInput边框：金色（思维优先）
   - StatusLine：`[model | thinking: high]` 为金色
   
2. **低/中等思维 + Bash模式：**
   - ChatInput边框：洋红色（显示模式颜色）
   - StatusLine：`[model | thinking: low]` 或 `[model | thinking: medium]` 为灰色
   
3. **无思维 + 默认模式：**
   - ChatInput边框：灰色（默认）
   - StatusLine：不显示思维指示器

## 用户体验

用户现在可以：
- 通过ChatInput上的金色边框**快速识别**AI何时处于最大思维容量
- 在ChatInput边框和StatusLine思维指示器中看到**一致的金色**
- 使用 `Ctrl+.` 切换思维级别并在两个组件中看到**即时视觉反馈**
- **理解**金色表示 intensive reasoning 处于活动状态

## 集成点

此功能与以下功能集成：
- **思维切换：** `Ctrl+.` 循环切换努力级别（来自现有的thinking-ui设计）
- **状态行：** 在模型信息旁边显示当前思维级别
- **Store状态：** 从Zustand store中的集中化 `thinking` 状态读取

## 未来增强

潜在改进：
- 为 `medium` 努力添加边框颜色（例如，黄色/琥珀色）
- 为高思维状态添加微妙的动画/脉冲
- 悬停时显示解释金色边框的工具提示
- 在用户设置中持久化边框偏好
