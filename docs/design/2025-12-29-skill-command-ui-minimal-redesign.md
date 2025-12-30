# Skill 命令 UI 最小化重新设计

## 问题陈述

当前的 `skill.tsx` 命令具有冗长的 UI 模式，感觉与最小/干净的美学不一致：
- 每次操作后都有"按 Esc 退出..."提示
- 简单退出流程中不必要的键盘处理
- 列表视图中多余的间距

## 设计目标

1. **移除所有退出提示** - 完成时自动退出
2. **简化键盘处理** - 移除不需要的 `useInput` 钩子
3. **更紧密的列表布局** - 减少间距以获得更干净的外观
4. **一致的时间** - 成功：1-1.5 秒延迟，错误：2 秒延迟

## 组件更改

### AddSkillUI

**移除：**
- `useInput` 钩子
- `shouldExit` 状态跟踪

**修改：**
- 错误状态：通过 `setTimeout(() => process.exit(0), 2000)` 添加 2 秒自动退出
- 保持现有成功行为 (1.5 秒延迟已实现)

**之前：**
```tsx
if (state.phase === 'error') {
  return (
    <Box flexDirection="column">
      <Text color="red">✗ 错误: {state.error}</Text>
      <Text dimColor>按任意键退出...</Text>
    </Box>
  );
}
```

**之后：**
```tsx
if (state.phase === 'error') {
  return <Text color="red">✗ 错误: {state.error}</Text>;
}
```

### SkillListUI

**移除：**
- `useInput` 钩子
- `shouldExit` 状态跟踪
- 空状态中的"按 Esc 退出..."文本
- 加载状态中的"按 Esc 退出..."文本
- 分隔行的 `marginBottom={1}`

**添加：**
- 在 'done' 状态下渲染后立即退出的 `useEffect`：
  ```tsx
  useEffect(() => {
    if (state.phase === 'done' || state.phase === 'error') {
      process.exit(0);
    }
  }, [state.phase]);
  ```

**简化空状态：**
```tsx
// 之前
<Box flexDirection="column">
  <Text dimColor>无已安装的技能。</Text>
  <Text dimColor>按 Esc 退出...</Text>
</Box>

// 之后
<Text dimColor>无已安装的技能。</Text>
```

**简化列表视图：**
- 移除底部带有退出提示的 `marginTop={1}` 盒子
- 移除分隔符的 `marginBottom={1}` 以获得更紧密的间距

### RemoveSkillUI

**移除：**
- `useInput` 钩子
- `shouldExit` 状态跟踪

**修改：**
- 错误状态：添加 2 秒自动退出
- 保持现有成功行为 (1 秒延迟已实现)

## 实现说明

1. 所有三个组件都变成纯显示焦点，无交互性
2. `useInput` 导入可以从文件中移除
3. 简化状态类型：移除跟踪退出意图的阶段
4. 如果模式在其他地方普遍存在，考虑使用共享的 `useAutoExit(delay: number)` 钩子

## 测试

实现后：
- `neovate skill list` - 应显示并立即退出
- `neovate skill list` (无技能) - 应显示"无已安装的技能。"并退出
- `neovate skill add user/repo` - 应显示进度、结果，1.5 秒后退出
- `neovate skill remove name` - 应显示结果并 1 秒后退出
- 错误情况 - 应显示错误并 2 秒后退出
