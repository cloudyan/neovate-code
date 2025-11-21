# 工作区获取处理器

**日期：** 2025-11-20

## 上下文

浏览器UI需要高效地获取单个工作区数据。目前，`project.getWorkspacesInfo`返回所有工作区，这在只需要一个工作区数据时效率不高。此设计添加了一个`project.workspaces.get`处理器，通过ID检索单个工作区。

该处理器服务于两个主要用例：
- 按需获取单个工作区详情（性能优化 vs 获取全部）
- 操作后刷新特定工作区状态

此外，此设计将`project.getWorkspacesInfo`重命名为`project.workspaces.list`，以与其他工作区操作处理器保持一致（create, delete, merge, createGithubPR）。

## 讨论

### 方法评估

考虑了三种方法：

**方法1：共享帮助函数（已选择）**
- 提取工作区数据构建逻辑到可重用的`buildWorkspaceData()`帮助函数
- 列表和获取处理器都调用同一帮助函数
- 工作区数据构建的单一事实来源
- 需要重构现有处理器但确保一致性

**方法2：独立实现**
- 重复工作区构建逻辑
- 无需重构但创建代码重复
- 工作区数据结构更改时需要维护两处

**方法3：过滤包装器**
- 内部调用`project.workspaces.list`，过滤到请求的工作区
- 简单但违背性能优化目的
- 计算所有工作区然后丢弃结果

选择方法1以获得性能、可维护性和代码质量的最佳平衡。

### 关键决策

- **共享帮助函数：** 提取逻辑以避免重复并确保一致性
- **命名约定：** 重命名为`project.workspaces.list`以匹配现有工作区操作命名模式
- **破坏性变更：** 处理器重命名需要协调浏览器UI更新（内部API不需要向后兼容层）

## 方法

将工作区数据检索重构为共享模式：

1. 创建`buildWorkspaceData(worktree, context)`帮助函数，封装构建单个WorkspaceData对象的所有逻辑
2. 重命名现有处理器：`project.getWorkspacesInfo` → `project.workspaces.list`
3. 重构`project.workspaces.list`以使用帮助函数
4. 实现新的`project.workspaces.get`处理器，查找特定工作树并使用帮助函数

两个处理器共享相同的数据构建逻辑，确保一致性，同时允许高效单个工作区检索。

## 架构

### 处理器签名

```typescript
'project.workspaces.list': (data: { cwd: string }) => 
  Promise<{ success: true, data: { workspaces: WorkspaceData[] } }>

'project.workspaces.get': (data: { cwd: string, workspaceId: string }) => 
  Promise<{ success: true, data: WorkspaceData }>
```

### 数据流

**project.workspaces.list：**
1. 通过`isGitRepository(cwd)`验证git仓库
2. 通过`getGitRoot(cwd)`获取git根目录
3. 通过`listWorktrees(gitRoot)`列出所有工作树
4. 通过`buildWorkspaceData()`帮助函数映射每个工作树
5. 返回WorkspaceData数组

**project.workspaces.get：**
1. 通过`isGitRepository(cwd)`验证git仓库
2. 通过`getGitRoot(cwd)`获取git根目录
3. 通过`listWorktrees(gitRoot)`列出所有工作树
4. 查找匹配`workspaceId`的工作树
5. 如果未找到，返回错误
6. 为单个工作树调用`buildWorkspaceData()`帮助函数
7. 返回单个WorkspaceData对象

### buildWorkspaceData帮助函数

**位置：** 在`NodeHandlerRegistry`类中作为私有方法

**职责：**
- 提取git状态（currentCommit, isDirty, pendingChanges）
- 通过`Paths.getAllSessions(worktree.path)`检索会话
- 从文件系统统计信息计算创建时间戳
- 从git状态和年龄推导状态
- 提取活动文件（现在为空数组，未来增强）
- 从配置收集工作树级别设置

**输入参数：**
- `worktree`: 来自`listWorktrees()`的工作树对象
- `context`: 用于路径和配置访问的上下文对象

**输出：** 完整的`WorkspaceData`对象，匹配`2025-11-18-project-info-handlers.md`中的接口

### 错误处理

所有错误返回`{ success: false, error: string }`以保持与现有处理器的一致性。

**特定错误情况：**

`project.workspaces.get`：
- 工作区ID未找到 → `"工作区 '{workspaceId}' 未找到"`
- 不是git仓库 → `"不是git仓库"`

**部分数据策略：**
- 如果git命令失败（例如，getCurrentCommit），使用合理默认值：
  - currentCommit: 空字符串
  - isDirty: false
  - pendingChanges: 空数组
- 如果文件系统统计信息不可用：对createdAt使用`Date.now()`
- 会话总是可通过Paths检索（无失败情况）

### 实施步骤

1. 从现有`project.getWorkspacesInfo`处理器中提取`buildWorkspaceData`帮助函数
2. 使用帮助函数注册新的`project.workspaces.get`处理器
3. 将`project.getWorkspacesInfo`重命名为`project.workspaces.list`并重构以使用帮助函数
4. 将浏览器API调用从`project.getWorkspacesInfo`更新为`project.workspaces.list`
5. 测试所有场景
6. 验证现有工作区操作中无回归

**要修改的文件：**
- `src/nodeBridge.ts` - 处理器实现和重命名
- `browser/src/api/project.ts` - 更新API调用名称（如果存在）
- 调用旧处理器名称的任何浏览器组件

### 测试方法

通过浏览器UI手动测试：
1. 测试`project.workspaces.list`正确返回所有工作区
2. 测试`project.workspaces.get`使用有效工作区ID
3. 测试`project.workspaces.get`使用无效工作区ID（错误情况）
4. 测试非git目录中的两个处理器（错误情况）
5. 验证同一工作区的列表和获取之间的数据一致性

### 迁移说明

从`project.getWorkspacesInfo`重命名为`project.workspaces.list`对浏览器UI来说是破坏性变更。需要同步部署：
1. 在nodeBridge.ts中更新处理器
2. 更新浏览器API调用以使用新名称
3. 不需要向后兼容层（内部API）

**无破坏性变更：**
- 现有工作区CRUD操作（create, delete, merge, createGithubPR）
- 工作区数据结构保持相同
- 仅有处理器名称更改
