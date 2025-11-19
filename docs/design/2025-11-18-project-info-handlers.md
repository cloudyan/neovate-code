# 浏览器UI的项目信息处理器

**日期：** 2025-11-18

## 背景

浏览器UI需要访问全面的项目和工作区信息。这需要在 `nodeBridge.ts` 中添加新的处理器来暴露：
- 仓库级别数据（git remote、分支、工作区列表）
- 详细的工作区数据（git状态、会话、元数据）

目标是为浏览器提供关于当前项目仓库及其关联工作区（git worktrees）的结构化数据，包括会话管理和git同步状态。

## 讨论

### 关键决策

**主要用例：** 浏览器UI消费，用于显示项目/工作区信息。

**数据源策略：** 所有数据即时计算，来源包括：
- Git命令（复用 `src/utils/git.ts` 和 `src/worktree.ts`）
- 文件系统状态
- 现有的会话和配置文件
- 无需新的存储文件

**架构模式：** 使用两个独立的处理器而不是一个组合处理器：
- 更好的灵活性 - 只获取需要的数据
- 渐进式加载能力（先显示仓库信息，再显示工作区）
- 部分数据足够时更轻量的API调用

**工作区-会话关系：** 一个工作区可以有多个会话。使用 `paths.getAllSessions()` 为每个工作区路径检索会话。

**Git信息范围：** 仅包含基本必要信息：
- 仓库级别：origin URL、默认分支、同步状态
- 工作区级别：当前提交、脏状态、待处理更改列表

**元数据处理：** 无新存储文件。如 `description` 等元数据字段保持为空，`preferences` 保持为空对象。状态从git状态计算得出。

## 方法

### 双处理器设计

**处理器1：`project.getRepoInfo`**
- 输入：`{ cwd: string }`
- 返回：`{ success: true, data: { repoData: RepoData } }`
- 提供仓库级别概览和工作区列表

**处理器2：`project.getWorkspacesInfo`**
- 输入：`{ cwd: string }`
- 返回：`{ success: true, data: { workspaces: WorkspaceData[] } }`
- 提供所有工作区的详细信息

这种分离允许浏览器：
1. 快速显示仓库信息和工作区名称
2. 按需渐进式加载详细工作区数据
3. 独立刷新特定数据

## 架构

### 数据结构

**RepoData 接口：**
```typescript
export interface RepoData {
  path: string;              // Git根路径
  name: string;              // 仓库名称（basename）
  workspaceIds: string[];    // 工作区名称列表
  metadata: {
    lastAccessed: number;    // 来自GlobalData（新字段）
    settings?: Record<string, any>;  // 项目级配置
  };
  gitRemote: {
    originUrl: string | null;        // 远程origin URL
    defaultBranch: string | null;    // 默认分支名称
    syncStatus: 'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown';
  };
}
```

**WorkspaceData 接口：**
```typescript
export interface WorkspaceData {
  id: string;                // 工作区名称
  repoPath: string;          // Git根路径
  branch: string;            // 工作区分支
  worktreePath: string;      // Worktree目录路径
  sessionIds: string[];      // 关联的会话ID
  gitState: {
    currentCommit: string;        // HEAD提交哈希
    isDirty: boolean;             // 有未提交的更改
    pendingChanges: string[];     // 修改文件列表
  };
  metadata: {
    createdAt: number;            // Worktree创建时间戳
    description: string;          // 始终为""（空）
    status: 'active' | 'archived' | 'stale';  // 计算得出的状态
  };
  context: {
    activeFiles: string[];        // 来自最新会话
    settings?: Record<string, any>;    // 来自worktree配置
    preferences?: Record<string, any>; // 始终为{}（空）
  };
}
```

### 实现流程

**project.getRepoInfo 处理器：**
1. 使用 `worktree.getGitRoot(cwd)` 获取git根目录
2. 使用新的 `getGitRemoteUrl()` 辅助函数获取远程URL
3. 使用新的 `getDefaultBranch()` 辅助函数获取默认分支
4. 使用新的 `getGitSyncStatus()` 辅助函数计算同步状态
5. 使用 `worktree.listWorktrees()` 列出工作区名称
6. 从GlobalData获取最后访问时间戳
7. 从配置获取项目设置
8. 构建并返回RepoData对象

**project.getWorkspacesInfo 处理器：**
1. 获取git根路径
2. 使用 `worktree.listWorktrees()` 列出所有工作区
3. 对每个工作区：
   - 使用新的 `getCurrentCommit()` 辅助函数获取当前提交
   - 检查是否为脏状态（来自worktree.isClean）
   - 使用新的 `getPendingChanges()` 辅助函数获取待处理更改列表
   - 使用 `paths.getAllSessions(worktreePath)` 获取会话
   - 从文件系统状态获取创建时间戳
   - 从git状态计算状态
   - 从最新会话提取活跃文件（如果存在）
   - 从配置获取工作区级别设置
4. 构建并返回WorkspaceData[]数组

### 新的辅助函数

添加到 `src/utils/git.ts`：

```typescript
// 获取远程origin URL
export async function getGitRemoteUrl(cwd: string): Promise<string | null>

// 从远程获取默认分支  
export async function getDefaultBranch(cwd: string): Promise<string | null>

// 检查与远程的同步状态
export async function getGitSyncStatus(cwd: string): Promise<'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown'>

// 获取当前提交哈希
export async function getCurrentCommit(cwd: string): Promise<string>

// 获取待处理更改列表
export async function getPendingChanges(cwd: string): Promise<string[]>
```

所有函数都使用代码库中现有的 `execGit()` 模式。

### 错误处理

- 关键失败时处理器返回 `{ success: false, error: string }`
- Git命令错误 → 尽可能返回部分数据，字段值为null/空
- 非git仓库 → 返回错误"Not a git repository"
- 缺失工作区 → 返回空数组
- 网络错误（fetch）→ 同步状态变为'unknown'

### 处理器注册

- 在 `nodeBridge.ts` 中的现有 `project.*` 处理器后添加处理器（约第450行）
- 与其他处理器使用一致的模式（async、错误处理）
- 利用现有的 `getContext()` 访问路径和配置
- 需要时为每个工作区创建新的Paths实例

### 数据源参考

- Git信息：`src/utils/git.ts` 和 `src/worktree.ts`
- 会话：`paths.getAllSessions()` 来自 `src/paths.ts`
- 配置：Context配置和ConfigManager
- GlobalData：`src/globalData.ts`（扩展以支持lastAccessed跟踪）
