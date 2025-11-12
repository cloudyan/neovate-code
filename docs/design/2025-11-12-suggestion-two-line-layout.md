# Suggestion 组件两行布局

**日期:** 2025-11-12

## 背景

Suggestion 组件存在对齐问题,长的斜杠命令名称(如 `/spec2:using-git-worktrees`)导致不一致的间距和下拉菜单中的文本换行效果不佳。描述被推到最右侧并换行很难看,造成视觉上不一致的界面。

该组件服务于两个不同的用例:
1. **斜杠命令** - 命令名称带描述
2. **文件搜索** - 文件路径无描述

## 讨论

**初始问题分析:**
- `firstColumnWidth` 仅基于可见建议使用 `maxNameLength + 4` 计算
- 长命令名称创建了固定宽度的第一列,将描述推得太靠右
- 长度混合的命令导致视觉对齐不一致

**探索的方案:**

1. **简单阈值** - 当命令超过固定长度时切换到两行
   - 简单且可预测
   - 混合布局可能看起来不一致

2. **智能自适应** - 基于终端宽度和可用空间计算
   - 空间高效且自适应
   - 复杂计算,调整大小时行为会改变

3. **一致的两行** (已选择)
   - 始终对斜杠命令使用两行布局
   - 完全一致的视觉模式
   - 最简单的实现
   - 权衡: 使用更多垂直空间

**关键决策:**
选择方案 3 以保持一致性和简洁性。垂直空间权衡是可接受的,因为 `maxVisible={10}` 即使使用两行布局也能提供足够的建议。

**优化:**
认识到文件搜索建议应保持单行,因为它们没有描述。添加了 `variant` 属性以优雅地处理两种用例。

## 方案

向 `SuggestionItem` 引入 `variant` 属性,具有两种模式:
- `'two-line'` 用于斜杠命令 - 名称在第一行,描述缩进在第二行
- `'single-line'` 用于文件建议 - 原始水平布局

完全移除复杂的 `firstColumnWidth` 计算,简化组件及其使用。

## 架构

**组件变更:**

`src/ui/Suggestion.tsx` 中的 `SuggestionItem`:
- 添加 `variant?: 'single-line' | 'two-line'` 属性(默认: `'single-line'`)
- 两行变体: 使用 `flexDirection="column"`,描述缩进使用 `marginLeft={2}`
- 单行变体: 使用 `flexDirection="row"`,简单文本连接
- 保持空描述的条件渲染

**`ChatInput.tsx` 中的使用变更:**

斜杠命令:
- 从渲染函数中移除 `visibleSuggestions`
- 移除 `maxNameLength` 计算
- 向 `SuggestionItem` 添加 `variant="two-line"`

文件建议:
- 从渲染函数中移除 `visibleSuggestions`
- 移除 `maxNameLength` 计算
- 使用 `variant="single-line"`(或省略,因为这是默认值)

**不需要更改:**
- `Suggestion` 容器组件逻辑
- 滚动/窗口行为
- 选择高亮
- 终端宽度处理(Ink 自动处理文本换行)
