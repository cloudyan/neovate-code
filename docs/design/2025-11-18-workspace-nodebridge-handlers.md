# 工作区NodeBridge处理器

**日期：** 2025-11-18

## 背景

工作区管理功能目前仅存在于CLI（`src/commands/workspace.ts`）中，使用来自 `src/worktree.ts` 的worktree方法。为了支持浏览器UI中的工作区操作，我们需要通过nodeBridge消息总线系统暴露这些功能。

目标是为创建、删除、合并工作区以及创建GitHub PR添加处理器，使这些操作通过现有的nodeBridge架构对浏览器UI可访问。

## 讨论

### 参数处理策略

关键的架构决策是处理器应该：
- A) 显式要求所有参数（UI进行选择/提示）
- B) 支持类似CLI的自动选择逻辑（处理器在需要时提示）
- C) 不同操作采用不同方法

**决策：方法A** - 浏览器UI将处理所有交互选择和提示，处理器需要显式参数。这保持了表示层（UI）和业务逻辑（处理器）之间的清晰分离。

### 实现方法

探索了三种方法：

1. **直接Worktree方法映射** - 每个处理器直接调用worktree.ts方法，具有最少的包装逻辑
2. **重用命令层逻辑** - 导入和适配工作区命令函数，需要重构CLI代码
3. **混合** - 带有增强验证和状态管理的直接调用

**决策：直接Worktree方法映射** - 最简单的方法，保持处理器独立性，避免CLI特定关注点，并使nodeBridge专注于协议适配而不是业务逻辑重复。

## 方法

向 `src/nodeBridge.ts` 添加四个新的消息总线处理器：

1. **`project.workspaces.create`** - 创建新的工作区worktree
2. **`project.workspaces.delete`** - 删除工作区而不合并
3. **`project.workspaces.merge`** - 将工作区合并回去并清理
4. **`project.workspaces.createGithubPR`** - 推送分支并创建GitHub PR

所有处理器遵循现有的nodeBridge模式：
- 直接调用 `worktree.ts` 方法
- 标准错误处理与try-catch
- 一致的响应格式：`{ success: boolean, data?: any, error?: string }`
- UI显式提供所有参数

## 架构

### 处理器签名

#### `project.workspaces.create`

**请求：**
```typescript
{
  cwd: string;
  name?: string;           // 可选：如果未提供则使用随机城市名
  skipUpdate?: boolean;    // 跳过更新主分支（默认：false）
}
```

**响应：**
```typescript
{
  success: boolean;
  data?: {
    workspace: {
      name: string;
      path: string;
      branch: string;
    }
  };
  error?: string;
}
```

**实现流程：**
1. 获取上下文并验证git仓库（`isGitRepository`）
2. 获取git根目录（`getGitRoot`）
3. 检测主分支（`detectMainBranch`）
4. 如果未跳过则更新主分支（`updateMainBranch`）
5. 生成或使用提供的工作区名称（`generateWorkspaceName`）
6. 使用基础分支创建worktree（`createWorktree`）
7. 将workspaces目录添加到git exclude（`addToGitExclude`）

#### `project.workspaces.delete`

**请求：**
```typescript
{
  cwd: string;
  name: string;            // 必需：显式工作区名称
  force?: boolean;         // 即使有未提交更改也删除（默认：false）
}
```

**响应：**
```typescript
{
  success: boolean;
  error?: string;
}
```

**实现流程：**
1. 获取上下文并验证git仓库
2. 获取git根目录
3. 使用可选的force标志删除worktree（`deleteWorktree`）

#### `project.workspaces.merge`

**请求：**
```typescript
{
  cwd: string;
  name: string;            // 必需：显式工作区名称
}
```

**响应：**
```typescript
{
  success: boolean;
  error?: string;
}
```

**实现流程：**
1. 获取上下文并验证git仓库
2. 获取git根目录
3. 列出worktrees以找到目标工作区（`listWorktrees`）
4. 按名称查找工作区
5. 将worktree合并回原始分支（`mergeWorktree`）

#### `project.workspaces.createGithubPR`

**请求：**
```typescript
{
  cwd: string;
  name: string;              // 必需：工作区名称
  title?: string;            // PR标题（默认：从分支生成）
  description?: string;      // PR描述（默认：空）
  baseBranch?: string;       // 目标分支（默认：检测的主分支）
}
```

**响应：**
```typescript
{
  success: boolean;
  data?: {
    prUrl: string;           // GitHub PR URL
    prNumber: number;        // PR编号
  };
  error?: string;
}
```

**实现流程：**
1. 获取上下文并验证git仓库
2. 获取git根目录
3. 列出worktrees以找到目标工作区（`listWorktrees`）
4. 按名称查找工作区
5. 确保工作区没有未提交的更改（`ensureCleanWorkingDirectory`）
6. 使用bash将工作区分支推送到远程（`git push origin <branch>`）
7. 如果未提供则检测基础分支（`detectMainBranch`）
8. 通过bash使用GitHub CLI创建PR（`gh pr create`）
9. 从输出解析PR URL和编号

### 错误处理

所有处理器遵循一致的错误处理模式：

**常见错误：**
- 不在git仓库中 → `{ success: false, error: "Not a git repository" }`
- Git操作失败 → `{ success: false, error: <git错误消息> }`

**创建特定：**
- 工作区名称已存在
- 主分支更新期间的网络错误
- 没有可用的城市名称（回退到基于时间戳的名称）

**删除特定：**
- 找不到工作区
- 没有force标志的未提交更改

**合并特定：**
- 找不到工作区
- 合并冲突
- 目标分支在不存在的worktree中检出

**创建PR特定：**
- 找不到工作区
- 未提交的更改
- GitHub CLI未安装/未认证
- 分支已有PR

### 测试命令集成

更新 `src/commands/__test.ts` 添加四个新的测试处理器：

```typescript
{
  label: 'Project: Create Workspace',
  handler: 'project.workspaces.create',
  getData: (cwd: string) => ({ cwd, name: 'test-workspace', skipUpdate: true }),
}
{
  label: 'Project: Delete Workspace',
  handler: 'project.workspaces.delete',
  getData: (cwd: string) => ({ cwd, name: 'test-workspace', force: false }),
}
{
  label: 'Project: Merge Workspace',
  handler: 'project.workspaces.merge',
  getData: (cwd: string) => ({ cwd, name: 'test-workspace' }),
}
{
  label: 'Project: Create GitHub PR',
  handler: 'project.workspaces.createGithubPR',
  getData: (cwd: string) => ({ 
    cwd, 
    name: 'test-workspace',
    title: 'Test PR',
    description: 'Test PR description'
  }),
}
```

这允许通过 `__test` 命令的交互式UI进行手动测试。

### 实现注意事项

- 所有处理器使用async/await模式
- 处理器在现有的 `NodeHandlerRegistry.registerHandlers()` 方法中注册
- 遵循与 `project.getRepoInfo` 和 `project.getWorkspacesInfo` 相同的上下文管理模式
- 使用现有的worktree.ts方法而不修改
- 错误消息匹配CLI命令模式以保持一致性
- GitHub PR创建通过bash工具使用 `gh` CLI 以简化
