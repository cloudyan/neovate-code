# project.generateCommit 处理程序

**日期:** 2025-12-12

## 背景

`commit.ts` 命令直接使用 `query()` 来生成提交消息和分支名称。为了启用重用并为通过 LLM 生成提交相关内容提供干净的 API，应在 `nodeBridge.ts` 中添加一个新的 `project.generateCommit` 处理程序，该处理程序使用带有结构化 JSON 输出的 `utils.quickQuery`。

## 讨论

**输出结构:** 处理程序应返回带有以下内容的结构化 JSON:
- `commitMessage` - 生成的提交消息
- `branchName` - 建议的分支名称
- `isBreakingChange` - 指示重大更改的布尔值
- `summary` - 更改的简要摘要

**输入处理:** 混合方法选择 - 调用者可以选择性地提供 `diff` 和 `fileList`，否则处理程序通过 git 命令获取它们。

**考虑的架构方法:**
1. **最小处理程序（已选择）** - 处理程序仅关注 LLM 调用，git 操作提取到共享工具
2. **全功能处理程序** - 处理程序执行所有操作，包括 git 操作

选择了方法 A，因为它简单，关注点分离更好，并且更容易测试。

## 方法

- 从 `commit.ts` 提取 `getStagedDiff` 和 `getStagedFileList` 到 `utils/git.ts`
- 添加使用带有 JSON responseFormat 的 `utils.quickQuery` 的 `project.generateCommit` 处理程序
- 处理程序在未提供时获取 git 数据，然后使用组合系统提示调用 LLM
- 更新 `commit.ts` 从 `utils/git.ts` 导入 git 函数

## 架构

### 类型定义 (`nodeBridge.types.ts`)

```typescript
type ProjectGenerateCommitInput = {
  cwd: string;
  language?: string;      // 默认为 'English'
  systemPrompt?: string;  // 自定义系统提示覆盖
  model?: string;         // 传递给 quickQuery
  diff?: string;          // git diff，如果不提供则获取
  fileList?: string;      // 暂存文件列表，如果不提供则获取
};

type ProjectGenerateCommitOutput = {
  success: boolean;
  error?: string;
  data?: {
    commitMessage: string;
    branchName: string;
    isBreakingChange: boolean;
    summary: string;
  };
};
```

### 处理程序流 (`nodeBridge.ts`)

1. 获取 cwd 的上下文
2. 如果未提供，则通过 git 工具获取 `diff` 和 `fileList`
3. 如果没有暂存更改则返回错误
4. 使用暂存文件和差异构建用户提示
5. 使用 JSON 架构调用 `utils.quickQuery` 以获得结构化输出
6. 返回解析的 JSON 结果

### 系统提示

组合提示，生成提交消息和分支名称，指示 LLM 输出包含所有四个字段的 JSON。包括约定提交格式规则、字符限制和语言偏好。

### 要修改的文件

1. **`src/utils/git.ts`** - 添加 `getStagedDiff()` 和 `getStagedFileList()`
2. **`src/nodeBridge.types.ts`** - 添加输入/输出类型和 HandlerMap 条目
3. **`src/nodeBridge.ts`** - 添加处理程序和系统提示辅助函数
4. **`src/commands/commit.ts`** - 从工具导入 git 函数，删除本地实现
