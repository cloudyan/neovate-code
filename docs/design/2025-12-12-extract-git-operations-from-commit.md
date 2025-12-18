# 从 Commit 命令中提取 Git 操作

**日期:** 2025-12-12

## 背景

`src/commands/commit.ts` 文件包含约 12 个内联的 `execSync` git 操作，应该提取到 `src/utils/git.ts` 以获得更好的代码组织。现有的 `git.ts` 已经有一些工具，但始终使用 `execFileNoThrow`，而 `commit.ts` 使用原始的 `execSync` 调用。

主要目标:
- **可重用性** - 使 git 操作在代码库的其他部分可用
- **一致性** - 所有 git 操作应使用相同的模式 (`execFileNoThrow`)
- **清理** - 在 `commit.ts` 中更清晰的关注点分离

## 讨论

考虑了三种方法:

**方法 A: 薄包装器 (最小化)** - 将操作提取为简单的异步函数，返回结果，使用 `execFileNoThrow` 保持一致。错误处理保留在 `commit.ts` 中。

**方法 B: 丰富包装器 (完整错误处理)** - 将所有错误处理和重试逻辑移到 `git.ts` 中，返回类型化结果或抛出特定领域的错误。

**方法 C: 按关注点分组** - 将相关操作按类别分组，如 GitValidation、GitOperations、GitQueries。

**决定:** 选择方法 A，因为它简单且易于测试，同时将详细错误处理（如重试逻辑）保留在调用代码中。

## 方法

向 `git.ts` 添加薄包装函数，这些函数:
- 使用 `execFileNoThrow` 与现有模式保持一致
- 返回简单类型（boolean、string、void）
- 失败时抛出带有简单错误消息的异常
- 将详细错误处理保留在 `commit.ts` 中

此外，通过添加内部辅助函数和重新组织文件结构来重构 `git.ts` 以实现 DRY。

## 架构

### 要添加的新函数

```typescript
// 验证函数
export async function isGitInstalled(): Promise<boolean>
export async function isGitRepository(cwd: string): Promise<boolean>
export async function isGitUserConfigured(cwd: string): Promise<{ name: boolean; email: boolean }>

// 查询函数
export async function hasUncommittedChanges(cwd: string): Promise<boolean>
export async function hasRemote(cwd: string): Promise<boolean>
export async function branchExists(cwd: string, branchName: string): Promise<boolean>
export async function getRecentCommitMessages(cwd: string, count?: number): Promise<string>

// 操作函数
export async function stageAll(cwd: string): Promise<void>
export async function gitCommit(cwd: string, message: string, skipHooks?: boolean): Promise<void>
export async function gitPush(cwd: string): Promise<void>
export async function createAndCheckoutBranch(cwd: string, branchName: string): Promise<void>
```

### 内部辅助函数 (DRY)

```typescript
async function gitExec(cwd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return execFileNoThrow(cwd, 'git', args, undefined, undefined, false);
}

async function gitCheck(cwd: string, args: string[]): Promise<boolean> {
  const { code } = await gitExec(cwd, args);
  return code === 0;
}

async function gitOutput(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await gitExec(cwd, args);
  return stdout.trim();
}
```

### 文件组织

```
1. 导入
2. 内部辅助函数 (gitExec, gitCheck, gitOutput)
3. 验证函数 (isGitInstalled, isGitRepository, isGitUserConfigured)
4. 查询函数 (hasUncommittedChanges, hasRemote, branchExists, getRecentCommitMessages, getStagedFileList, getStagedDiff, etc.)
5. 操作函数 (stageAll, gitCommit, gitPush, createAndCheckoutBranch)
6. 复合函数 (getGitStatus, getLlmGitStatus)
7. 克隆相关函数 (现有的 cloneRepository, etc.)
```

### 重构后的 getGitStatus 示例

```typescript
export async function getGitStatus(opts: { cwd: string }) {
  const { cwd } = opts;
  if (!(await isGitRepository(cwd))) return null;
  
  const [branch, mainBranch, status, log, author] = await Promise.all([
    gitOutput(cwd, ['branch', '--show-current']),
    gitOutput(cwd, ['rev-parse', '--abbrev-ref', 'origin/HEAD']).then(s => s.replace('origin/', '')),
    gitOutput(cwd, ['status', '--short']),
    gitOutput(cwd, ['log', '--oneline', '-n', '5']),
    gitOutput(cwd, ['config', 'user.email']),
  ]);
  
  const authorLog = await gitOutput(cwd, ['log', '--author', author, '--oneline', '-n', '5']);
  
  return { branch, mainBranch, status, log, author, authorLog };
}
```

### commit.ts 的变更

- 移除 `execSync` 导入
- 从 `git.ts` 导入新函数
- 用异步函数调用替换内联的 `execSync` 调用
- 将 `escapeShellArg`、详细错误处理和重试逻辑保留在 `commit.ts` 中
