# Bash风格反向搜索重构

**日期：** 2025-12-12

## 背景

当前的反向搜索功能（Ctrl+R）存在一个UX问题：当反向搜索激活时，光标导航快捷键如Ctrl+A（行首）、Ctrl+E（行尾）和箭头键无法工作。这是因为搜索模式下完全阻止了光标位置变化，光标被强制到搜索查询的末尾。

目标是重构反向搜索功能以符合终端（Bash/Zsh）UX，为开发者提供熟悉且直观的体验。

## 讨论

### 终端风格选择
考虑了三种终端风格：
- **Bash/Zsh风格（Ctrl+R）** - 内联显示与基于模式的行为 ✅ 已选择
- **Fish shell风格** - 集成的历史筛选与上下箭头
- **Fzf风格模糊查找器** - 完整下拉显示所有匹配项

### UI显示格式
探索的选项：
- 保持当前下拉UI与固定键盘行为
- **切换到内联显示** 类似bash：`(reverse-i-search)'query': matched_command` ✅ 已选择
- 混合方法，带下拉但bash风格键盘行为

### 无匹配行为
探索的选项：
- 带"失败"指示器和蜂鸣声的bash默认行为
- **静默** - 只显示空命令区域，无特殊指示 ✅ 已选择
- 明确的"[no match]"消息

### 实现方法
考虑了三种方法：
- 单个输入与模式切换 - 最小变更但光标处理棘手
- **独立搜索TextInput** - 清晰分离，专用搜索输入 ✅ 已选择
- 虚拟显示层 - 最少侵入但状态管理混乱

## 方法

实现 **独立搜索TextInput** 架构，其中：
- 当反向搜索激活时，渲染完全不同的布局
- 专用`TextInput`处理带完整光标支持的搜索查询
- 匹配的命令以内联只读文本显示
- Ctrl+A/E/箭头键触发两步操作：退出搜索模式，然后应用光标移动

这提供了关注点的清晰分离，允许搜索查询输入具有正常的光标行为。

## 架构

### 组件结构

```
┌─────────────────────────────────────────────────────────────────┐
│ (reverse-i-search)'          │ matched_command_here             │
│                    ↑         │                                  │
│            SearchTextInput   │   MatchDisplay (Text)            │
│            (editable)        │   (read-only)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 新组件：ReverseSearchInput

一个包装以下内容的新组件：
- 前缀标签：`(reverse-i-search)'`
- 用于搜索查询的`TextInput`（光标在此处，Ctrl+A/E在查询内正常工作）
- 结尾引号：`':`
- 显示当前匹配命令的`Text`组件

### 键盘行为

**在反向搜索模式下：**

| 键 | 操作 |
|-----|--------|
| 输入 | 更新搜索查询，自动查找最新匹配项 |
| `Ctrl+R` | 循环到下一个（更旧的）匹配项 |
| `Ctrl+S` | 循环到上一个（更新的）匹配项 |
| `Enter` / `Tab` | 退出搜索，将主输入设置为匹配命令，光标在末尾 |
| `Escape` | 退出搜索，丢弃匹配，返回原始输入 |
| `Ctrl+A/E`，箭头键 | 退出搜索，设置输入为匹配项，然后应用光标操作 |

### 退出并执行操作回调

```typescript
onExitWithAction: (match: string, action: 'start' | 'end' | 'left' | 'right') => void
```

这启用了光标移动键的两步退出行为。

### 数据流

```
useInputHandlers
  ├── reverseSearchActive: boolean
  ├── handleReverseSearch() → 设置 active = true
  └── handleReverseSearchExit(match, cursorAction?) →
        设置 inputState.value = match
        设置 active = false
        如果提供则应用 cursorAction
          │
          ▼
ChatInput
  如果 (reverseSearchActive)
     渲染 <ReverseSearchInput />
  否则
     渲染 <TextInput /> (当前行为)
          │
          ▼
ReverseSearchInput (新)
  ├── 使用 useReverseHistorySearch hook
  ├── 渲染：前缀 + TextInput(query) + ':' + matchDisplay
  └── 处理：Ctrl+R/S 循环，退出触发器
```

### 需修改的文件

1. `useInputHandlers.ts` - 添加 `handleReverseSearchExit(match, cursorAction)`
2. `ChatInput.tsx` - 条件渲染，移除反向搜索的下拉UI
3. **新文件**：`ReverseSearchInput.tsx` - 内联搜索组件
4. `useReverseHistorySearch.ts` - 为光标操作支持进行小调整

### 视觉样式

```
(reverse-i-search)'query': matched_command_here
        ↑              ↑    ↑
      暗色           暗色      正常颜色
```

- 前缀和引号：暗色
- 查询：有光标（反色字符）
- 匹配命令：正常颜色（突出显示）

### 边界情况

| 情况 | 行为 |
|----------|----------|
| 空历史 | 进入搜索模式，显示空匹配区域 |
| 查询无匹配 | 显示空匹配区域（静默） |
| 找到匹配，然后查询更改为无匹配 | 清除匹配显示 |
| 退出时无匹配（Enter/Tab） | 退出搜索，保持原始输入不变 |
| Ctrl+A/E 无匹配时 | 退出搜索，保持原始输入，应用光标操作 |

### 将被移除的内容

- `ChatInput.tsx` 中 `reverseSearch.matches` 的 `<Suggestion>` 下拉渲染（第255-280行）
- 不再需要 `reverseSearch.placeholderText`
