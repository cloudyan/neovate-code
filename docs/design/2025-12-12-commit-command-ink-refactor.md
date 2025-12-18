# Commit Command Ink/React 重构

**日期:** 2025-12-12

## 背景

现有的 `src/commands/commit.ts` 实现了一个使用 clack-prompts 进行 CLI 交互的 AI 驱动提交消息生成器。目标是重构此命令以：

1. 使用 Ink/React 模式（参考 `src/commands/__test.tsx`）
2. 调用 `nodeBridge` 处理程序进行所有操作，而不是直接导入
3. 使用 `project.generateCommit` 处理程序，返回丰富数据：`commitMessage`、`branchName`、`isBreakingChange`、`summary`
4. 移除 `--ai` 标志（不再需要）
5. 使用丰富的视觉反馈改进 UI/UX

## 讨论

### 功能与操作
重构后的命令将支持 **完整功能对等**，提供 6 个交互操作：
- 复制到剪贴板
- 提交更改
- 提交并推送
- 创建分支并提交
- 编辑提交消息
- 取消操作

### CLI 标志
保留所有原始标志（除了 `--ai`）：
| 标志 | 别名 | 目的 |
|------|-------|---------|
| `--stage` | `-s` | 提交前暂存所有更改 |
| `--commit` | `-c` | 自动提交更改 |
| `--push` | - | 提交后推送 |
| `--copy` | - | 复制到剪贴板 |
| `--checkout` | - | 创建分支并提交 |
| `--no-verify` | `-n` | 跳过预提交钩子 |
| `--model` | `-m` | 指定 AI 模型 |
| `--language` | - | 提交消息语言 |
| `--follow-style` | - | 匹配仓库提交风格 |
| `--interactive` | `-i` | 强制交互模式 |
| `--help` | `-h` | 显示帮助 |

### UI 显示
选择 **丰富卡片** 显示 `project.generateCommit` 的全部 4 个字段：
- 提交消息
- 建议的分支名称
- 重大变更警告（条件性）
- 摘要

### 错误处理
选择 **详细+恢复** 方法：
- 带有提示的详细错误消息
- 适用时的交互恢复选项（例如，钩子失败时的"使用 --no-verify 重试？"）
- 检测到无暂存更改时提供暂存文件

### 架构方法
选择 **组件提取**（选项 2）而非整体或完整状态机方法：
- 在简单性和可重用性之间平衡
- 清晰的关注点分离
- 组件可以独立测试

### Git 操作
选择 **添加新的 nodeBridge 处理程序** 而不是使用 bash 执行或直接导入：
- 保持 UI 层清洁
- 类型安全操作
- 集中的 git 操作

## 方法

重构后的提交命令将：

1. **用 Ink/React 替换 clack-prompts** 以实现现代化、可组合的 UI
2. **仅使用 nodeBridge 处理程序** 进行所有后端操作
3. **利用 `project.generateCommit`** 进行 AI 驱动的提交消息生成，包含丰富的元数据
4. **提取可重用的 UI 组件** 用于结果卡片和操作选择器
5. **实现详细的错误处理** 带恢复选项
6. **通过 CLI 标志支持交互和非交互模式**

## 架构

### 文件结构

```
src/commands/commit.tsx           # 主入口，CLI 解析，CommitUI 组件
src/ui/CommitResultCard.tsx       # 丰富的卡片显示提交信息（新增）
src/ui/CommitActionSelector.tsx   # 操作菜单组件（新增）
src/nodeBridge.types.ts           # 添加 git 处理程序类型（修改）
src/nodeBridge.ts                 # 添加 git 处理程序实现（修改）
src/commands/commit.ts            # 迁移后删除
```

### 新的 NodeBridge 处理程序

添加到 `nodeBridge.types.ts` 并在 `nodeBridge.ts` 中实现：

```typescript
// 类型
type GitStatusInput = { cwd: string };
type GitStatusOutput = {
  success: boolean;
  data?: {
    isRepo: boolean;
    hasUncommittedChanges: boolean;
    hasStagedChanges: boolean;
    isGitInstalled: boolean;
    isUserConfigured: { name: boolean; email: boolean };
  };
  error?: string;
};
type GitStageInput = { cwd: string; all?: boolean };
type GitCommitInput = { cwd: string; message: string; noVerify?: boolean };
type GitPushInput = { cwd: string };
type GitCreateBranchInput = { cwd: string; name: string };

// 处理程序映射条目
'git.status': { input: GitStatusInput; output: GitStatusOutput };
'git.stage': { input: GitStageInput; output: SuccessResponse };
'git.commit': { input: GitCommitInput; output: SuccessResponse };
'git.push': { input: GitPushInput; output: SuccessResponse };
'git.createBranch': { input: GitCreateBranchInput; output: SuccessResponse };
```

### 组件接口

**CommitResultCard:**
```typescript
interface CommitResultCardProps {
  commitMessage: string;
  branchName: string;
  isBreakingChange: boolean;
  summary: string;
}
```

**CommitActionSelector:**
```typescript
type CommitAction = 'copy' | 'commit' | 'push' | 'checkout' | 'edit' | 'cancel';

interface CommitActionSelectorProps {
  onSelect: (action: CommitAction) => void;
  onCancel: () => void;
  disabled?: boolean;
}
```

### 状态机

```typescript
type CommitState =
  | { phase: 'validating' }
  | { phase: 'staging' }
  | { phase: 'generating' }
  | { phase: 'displaying'; data: GenerateCommitData }
  | { phase: 'editing'; data: GenerateCommitData; editedMessage: string }
  | { phase: 'executing'; action: CommitAction; data: GenerateCommitData }
  | { phase: 'success'; message: string }
  | { phase: 'error'; error: string; recoveryAction?: () => void };
```

### 状态流

```
validating → staging (如果需要) → generating → displaying
                                                    ↓
                              ┌─────────────────────┼─────────────────┐
                              ↓                     ↓                 ↓
                           editing            executing            cancel
                              ↓                     ↓
                         displaying          success / error
```

### 视觉设计 (CommitResultCard)

```
╭─────────────────────────────────────────────────────────────╮
│  📝 提交消息                                                │
│  ───────────────────────────────────────────────────────── │
│  feat(auth): add JWT token validation                      │
│                                                             │
│  🌿 建议的分支                                              │
│  feat/add-jwt-token-validation                             │
│                                                             │
│  ⚠️  重大变更                        (条件性)                │
│                                                             │
│  📋 摘要                                                   │
│  Added token validation middleware with expiry checking    │
╰─────────────────────────────────────────────────────────────╯
```

### 视觉设计 (CommitActionSelector)

```
您想做什么？

  ○ 📋 复制到剪贴板
  ● ✅ 提交更改                        ← 高亮显示
  ○ 🚀 提交并推送
  ○ 🌿 创建分支并提交
  ○ ✏️ 编辑提交消息
  ○ ❌ 取消

  ↑↓ 导航  Enter 选择  Esc 取消
```

### 错误处理矩阵

| 阶段 | 错误 | 恢复 |
|-------|-------|----------|
| validating | 不是 git 仓库 | 带提示退出 |
| validating | 无暂存更改 | 提供"暂存全部？" |
| validating | 未安装 Git | 带安装提示退出 |
| generating | API 错误 | 提供"重试？" |
| executing:commit | 钩子失败 | 提供"使用 --no-verify 重试？" |
| executing:push | 认证失败 | 退出并提供凭证提示 |
| executing:push | 被拒绝 | 提示："先 git pull" |
| executing:checkout | 分支存在 | 自动附加时间戳，重试 |

### 实现顺序

1. 将 git 处理程序添加到 `nodeBridge.types.ts` 和 `nodeBridge.ts`
2. 创建 `CommitResultCard.tsx`
3. 创建 `CommitActionSelector.tsx`
4. 使用完整工作流创建 `commit.tsx`
5. 测试交互和非交互模式
6. 删除旧的 `commit.ts`
