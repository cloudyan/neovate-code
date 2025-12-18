# Commit 命令合并状态检测

**日期:** 2025-12-12

## 背景

在解决合并冲突时，正确的流程是:
1. 执行 `git merge` → 出现冲突
2. 手动解决冲突文件
3. `git add` 已解决的文件
4. `git commit` → 创建合并提交

然而，用户可能会在解决冲突后意外运行 `neo commit --stage`（或仅 `neo commit`）。这会创建一个普通提交而不是正确的合并提交，破坏合并流程并要求用户重新运行整个冲突解决过程。

目标是检测仓库是否处于合并状态并阻止 `neo commit` 命令，引导用户使用正确的 `git commit` 命令。

## 讨论

### 阻止行为
考虑了两个选项:
1. **仅警告**: 显示警告并让用户确认继续
2. **直接阻止**: 显示错误并立即退出

**决定:** 选择直接阻止以防止在合并解决过程中任何意外误用。

### 检测范围
最初，检查仅考虑 `--stage` 标志场景。然而，分析显示即使没有 `--stage`:
- 如果用户在解决冲突后手动 `git add`，然后运行 `neo commit`
- Git 将创建合并提交，但带有不适用于合并提交的 AI 生成消息
- 用户可能没有意识到他们正在完成合并

**决定:** 对所有合并状态都进行阻止，无论是否使用 `--stage`。

### 实现方法
评估了三种方法:

| 方法 | 描述 | 复杂度 |
|----------|-------------|------------|
| A | 扩展 `git.status` 处理程序并添加 `isMerging` 字段 | 低 |
| B | 仅在 `commit.tsx` 中进行本地检测 | 最低 |
| C | 创建通用预提交检查机制 | 中等 |

**决定:** 选择方法 A，因为它在可重用性和简单性之间取得了平衡。合并状态检测是 git 状态的自然扩展，未来其他命令也可能受益于此信息。

## 方法

扩展现有的 `git.status` 处理程序以通过检查 `.git/MERGE_HEAD` 文件检测合并状态。当 Git 遇到合并冲突时，它会创建此文件以跟踪合并状态。合并完成后或中止时会删除该文件。

当 `neo commit` 命令检查 `git.status` 响应中的 `isMerging` 字段并在仓库处于合并状态时立即退出并显示有助的错误消息。

## 架构

### 文件变更

| 文件 | 修改 |
|------|--------------|
| `src/nodeBridge.types.ts` | 在 `GitStatusOutput.data` 中添加 `isMerging: boolean` |
| `src/nodeBridge.ts` | 在 `git.status` 处理程序中添加 `.git/MERGE_HEAD` 检测 |
| `src/commands/commit.tsx` | 在 `GitStatusData` 接口中添加 `isMerging`；在 `runWorkflow` 中添加合并状态检查 |

### 类型定义 (`nodeBridge.types.ts`)

```typescript
type GitStatusOutput = {
  success: boolean;
  data?: {
    isRepo: boolean;
    hasUncommittedChanges: boolean;
    hasStagedChanges: boolean;
    isGitInstalled: boolean;
    isUserConfigured: { name: boolean; email: boolean };
    isMerging: boolean;  // 新增: 当 .git/MERGE_HEAD 存在时为 true
  };
  error?: string;
};
```

### 处理程序实现 (`nodeBridge.ts`)

```typescript
// 在 git.status 处理程序中，现有检查之后:
const { existsSync } = await import('fs');
const { join } = await import('path');
const { getGitRoot } = await import('./worktree');

const gitRoot = await getGitRoot(cwd);
const isMerging = existsSync(join(gitRoot, '.git', 'MERGE_HEAD'));

return {
  success: true,
  data: {
    // ... 现有字段 ...
    isMerging,
  },
};
```

### 前端阻止 (`commit.tsx`)

```typescript
// 在 runWorkflow 中，用户配置验证后:
if (status.isMerging) {
  setState({
    phase: 'error',
    error: `检测到合并状态。\n\n请使用以下命令完成合并:\n  git status    # 检查冲突状态\n  git commit    # 创建合并提交\n\n使用提交命令将创建不正确的提交消息\n并且可能需要重新解决冲突。`,
  });
  return;
}
```

### 数据流

```
用户运行: neo commit [--stage]
     │
     ▼
┌─────────────────────────┐
│ git.status 处理程序     │
│ - 检查 .git/MERGE_HEAD  │
│ - 返回 isMerging 标志   │
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ commit.tsx runWorkflow  │
│ - 检查 status.isMerging │
│ - 如果为 true → 错误状态│
│ - 如果为 false → 继续   │
└─────────────────────────┘
```
