# 思维状态UI设计

**日期:** 2025-11-02
**状态:** 已批准

## 概述

在StatusLine中添加一个思维状态指示器，可以使用 `Ctrl+.` 切换。思维状态在 `undefined`、`{ effort: 'low' }`、`{ effort: 'medium' }` 和 `{ effort: 'high' }` 之间循环。对于Google和Anthropic提供商，思维状态默认初始化为 `{ effort: 'low' }`。

## 需求

1. 在StatusLine中的模型名称后添加思维状态显示
2. 使用 `Ctrl+.` 键盘快捷键切换思维状态
3. 循环切换4种状态：`undefined` → `low` → `medium` → `high` → `undefined`
4. 对于Google和Anthropic提供商初始化为 `{ effort: 'low' }`
5. 显示格式：`[model | thinking: low]`（激活时）

## 架构

### 状态结构

**位置：** `src/ui/store.ts`

在 `AppState` 中添加新的状态字段：

```typescript
interface AppState {
  // ... 现有字段
  thinking: { effort: 'low' | 'medium' | 'high' } | undefined;
}
```

### Store动作

#### 切换动作

在 `AppActions` 中添加新动作：

```typescript
interface AppActions {
  // ... 现有动作
  toggleThinking: () => void;
}
```

实现：

```typescript
toggleThinking: () => {
  const current = get().thinking;
  let next: { effort: 'low' | 'medium' | 'high' } | undefined;

  if (!current) {
    next = { effort: 'low' };
  } else if (current.effort === 'low') {
    next = { effort: 'medium' };
  } else if (current.effort === 'medium') {
    next = { effort: 'high' };
  } else {
    next = undefined;
  }

  set({ thinking: next });
}
```

#### 初始化逻辑

在 `initialize` 动作中（约第266-282行），检测提供商并设置初始思维状态：

```typescript
const providerId = response.data.model?.split('/')[0];
const shouldEnableThinking = providerId === 'google' || providerId === 'anthropic';

set({
  // ... 现有状态
  thinking: shouldEnableThinking ? { effort: 'low' } : undefined,
});
```

#### 模型更改逻辑

在 `setModel` 动作中（约第820-838行），根据新模型的提供商重置思维状态：

```typescript
setModel: async (model: string) => {
  // ... 现有逻辑

  // 确定提供商并设置思维状态
  const providerId = model?.split('/')[0];
  const shouldEnableThinking = providerId === 'google' || providerId === 'anthropic';

  set({
    model,
    modelContextLimit: modelsResponse.data.currentModelInfo.modelContextLimit,
    thinking: shouldEnableThinking ? { effort: 'low' } : undefined,
  });
}
```

### 提供商ID检测

提供商ID使用以下方式从模型字符串中提取：

```typescript
const providerId = model?.split('/')[0];
```

例如：
- `"google/gemini-2.0-flash-exp"` → `"google"`
- `"anthropic/claude-3-5-sonnet-20241022"` → `"anthropic"`
- `null` 或 `undefined` → `undefined`

## 键盘快捷键

**位置：** `src/ui/TextInput/hooks/useTextInput.ts`

在 `handleCtrl` 映射中添加处理器（约第200-222行）：

```typescript
const handleCtrl = mapInput([
  // ... 现有处理器
  ['.', () => {
    get().toggleThinking();
    return cursor;
  }],
]);
```

注意：需要在文件顶部导入 `useAppStore`。

## UI显示

**位置：** `src/ui/StatusLine.tsx`

### ThinkingIndicator组件

在 `StatusMain` 之前添加新组件：

```typescript
function ThinkingIndicator() {
  const { thinking } = useAppStore();

  if (!thinking) return null;

  return (
    <>
      {' | '}
      <Text color="cyan">thinking: {thinking.effort}</Text>
    </>
  );
}
```

### StatusMain集成

更新状态行显示（约第103-104行）以包含思维指示器：

```typescript
function StatusMain() {
  const {
    cwd,
    model,
    modelContextLimit,
    status,
    exitMessage,
    messages,
    sessionId,
    approvalMode,
    thinking, // 添加这个
  } = useAppStore();

  // ... 现有代码

  return (
    <Box>
      <Text color="gray">
        [{model ? model : <Text color="red">use /model to select a model</Text>}
        {thinking && (
          <>
            {' | '}
            <Text color="cyan">thinking: {thinking.effort}</Text>
          </>
        )}
        ] | {folderName} | {(tokenUsed / 1000).toFixed(1)}K |{' '}
        <Text color={getContextLeftColor(contextLeftPercentage)}>
          {contextLeftPercentage}%
        </Text>{' '}
        {approval}
      </Text>
    </Box>
  );
}
```

视觉示例：
- 无思维状态：`[google/gemini-2.0-flash-exp] | folder | 10.5K | 80%`
- 有思维状态：`[google/gemini-2.0-flash-exp | thinking: low] | folder | 10.5K | 80%`

## 消息集成

**位置：** `src/ui/store.ts`

更新 `sendMessage` 动作（约第653-664行）以传递思维状态：

```typescript
const response: LoopResult = await bridge.request('session.send', {
  message: opts.message,
  cwd,
  sessionId,
  planMode: opts.planMode,
  model: opts.model,
  attachments,
  parentUuid: get().forkParentUuid || undefined,
  thinking: get().thinking, // 添加这一行
});
```

思维配置将由后端使用 `src/thinking-config.ts` 中的现有 `getThinkingConfig` 函数进行处理。

## 状态生命周期

1. **初始化**：对于Google/Anthropic设置为 `{ effort: 'low' }`，否则为 `undefined`
2. **切换**：使用 `Ctrl+.` 循环切换状态
3. **模型更改**：根据新模型的提供商重置
4. **会话恢复**：最初将为 `undefined`（稍后可以增强以持久化）
5. **消息发送**：当前状态传递给后端

## 未来增强

- 在会话配置中持久化思维状态
- 切换时显示视觉反馈（提示消息）
- 在帮助文本中添加键盘快捷键提示
- 随着更多提供商添加思维功能而支持它们
