# Commit 命令：建议暂存未暂存的文件

**日期:** 2025-12-26

## 上下文

在不使用 `--stage` 标志且没有暂存文件的情况下运行 commit 命令时，命令当前显示错误消息，要求用户使用 `-s` 标志或使用 `git add` 手动暂存文件。这不是理想的用户体验，因为：

1. 用户可能不知道哪些文件有更改
2. 他们必须退出并运行单独的命令来暂存文件
3. 工作流程被中断

目标是检测未暂存的更改并提供交互式暂存选项，在继续之前向用户准确显示将要暂存的文件。

## 讨论

### 信息显示
**问题：** 检测到未暂存更改时应显示什么信息？

**决定：** 显示带有状态代码 (M/A/D/?) 的文件列表，限制为 10 个文件。如果存在超过 10 个文件，显示剩余文件的计数。

### UI 流程
**问题：** 暂存提示应在 UI 流程中的何处出现？

**决定：** 向状态机添加新的 `suggest-stage` 阶段，而不是内联在错误消息中。这提供了更清晰的分离和更好的用户体验。

### 暂存后行为
**问题：** 用户确认暂存后，接下来应该发生什么？

**决定：** 直接继续到 `generating` 阶段以自动生成提交消息，保持工作流程的连续性。

## 方法

使用新的 `suggest-stage` 阶段扩展现有的 commit 命令工作流程：

1. 当没有暂存更改但检测到未暂存更改时激活
2. 显示修改文件列表及其状态指示符
3. 用简单的 y/N 确认提示用户
4. 确认后，暂存所有文件并继续提交消息生成
5. 拒绝后，干净地退出

这使用户保持在提交流程中，同时让他们了解和控制将要暂存的内容。

## 架构

### 状态类型扩展

向 `CommitState` 添加新阶段：

```typescript
type CommitState =
  // ... 现有阶段 ...
  | { 
      phase: 'suggest-stage'; 
      unstagedFiles: Array<{ status: string; file: string }>;
    }
```

### 数据要求

在 `nodeBridge.types.ts` 中扩展 `GitStatusOutput`：

```typescript
type GitStatusOutput = {
  success: boolean;
  data?: {
    // ... 现有字段 ...
    unstagedFiles: Array<{ status: string; file: string }>;
  };
  error?: string;
};
```

### 工作流程逻辑更改

在 `runWorkflow` 中，更新无暂存更改的处理：

```
当前: !hasStagedChanges && !options.stage → 错误

新: !hasStagedChanges && !options.stage:
      if (unstagedFiles.length > 0) → setState({ phase: 'suggest-stage', unstagedFiles })
      else → 错误 (确实没有更改)
```

### UI 组件

```tsx
{state.phase === 'suggest-stage' && (
  <Box flexDirection="column">
    <Text color="yellow">未找到暂存更改。以下文件有修改：</Text>
    <Box flexDirection="column" marginY={1} paddingLeft={2}>
      {state.unstagedFiles.slice(0, 10).map((f, i) => (
        <Text key={i}>
          <Text color="cyan">{f.status}</Text> {f.file}
        </Text>
      ))}
      {state.unstagedFiles.length > 10 && (
        <Text dimColor>... 还有 {state.unstagedFiles.length - 10} 个文件</Text>
      )}
    </Box>
    <Text>暂存所有文件并继续？ (y/N)</Text>
  </Box>
)}
```

### 键盘处理

- `y`/`Y`/Enter → 确认暂存，调用 `git.stage`，继续到 `generating`
- `n`/`N`/Esc → 取消并退出

### 需要修改的文件

1. `src/nodeBridge.types.ts` - 向 `GitStatusOutput` 添加 `unstagedFiles`
2. `src/nodeBridge.ts` - 在处理程序中从 `git status --porcelain` 解析未暂存文件
3. `src/commands/commit.tsx` - 添加 `suggest-stage` 阶段、UI 组件和键盘处理
