# 提交模型配置

**日期：** 2025-11-19

## 背景

代码库当前对所有AI操作使用全局 `config.model` 设置，包括提交消息生成和分支名称生成。用户可能希望为提交操作使用不同的（通常是更小/更快的）模型，同时为一般编码任务保持更强大的模型。

目标是添加一个可选的 `commit.model` 配置，允许用户为 `src/commands/commit.ts` 中的提交相关操作指定不同的模型。

## 讨论

### 范围澄清

**问题：** `commit.model` 是否应该覆盖提交消息生成和分支名称生成两者的主模型选择，还是仅覆盖提交消息生成？

**答案：** 提交消息和分支名称生成都覆盖（选项A）。

### 方法探索

考虑了两种方法：

**方法1：直接配置检查（简单）**
- 向 `CommitConfig` 类型添加 `model?: string`
- 在每次 `query()` 调用前直接检查配置
- 如果存在提交模型则临时覆盖 `context.config.model`
- 权衡：
  - ✅ 最少的代码更改（约10行）
  - ✅ 易于理解
  - ❌ 需要在多个地方检查配置
  - ❌ 基于变更（临时更改context.config）

**方法2：上下文覆盖助手（清洁）**
- 创建返回带有模型覆盖的新上下文的助手
- 在每次 `query()` 调用前使用助手
- 权衡：
  - ✅ 无变更，创建新对象
  - ✅ 可为未来的提交配置重用的模式
  - ✅ 更清洁的关注点分离
  - ❌ 稍微更多的代码（约15-20行）

**选择的方法：** 方法1（简单）

然而，在实现讨论期间，方法被优化以避免变更并正确使用现有的模型解析系统。

## 方法

最终实现使用现有的模型解析基础设施：

1. 向 `src/config.ts` 中的 `CommitConfig` 类型添加可选的 `model?: string` 字段
2. 在 `generateCommitMessage()` 和 `generateBranchName()` 中：
   - 检查是否设置了 `context.config.commit?.model`
   - 如果设置了，使用 `resolveModelWithContext(modelConfig, context)` 解析它
   - 将解析的模型作为 `model` 参数传递给 `query()`
3. 如果未设置 `commit.model`，`query()` 回退到 `context.config.model`（现有行为）

这种方法：
- 使用正确的模型解析系统
- 显式传递模型给 `query()`
- 避免上下文变更
- 利用现有的无效模型错误处理

## 架构

### 类型定义更改

**文件：** `src/config.ts`

```typescript
export type CommitConfig = {
  language: string;
  systemPrompt?: string;
  model?: string;  // 新增：提交操作的覆盖模型
};
```

`'commit'` 键已在 `OBJECT_CONFIG_KEYS` 中，因此不需要额外的验证更改。

### 实现更改

**文件：** `src/commands/commit.ts`

**在 `generateCommitMessage()` 中：**

```typescript
async function generateCommitMessage(opts: GenerateCommitMessageOpts) {
  const language = opts.language ?? 'English';
  const systemPrompt = opts.systemPrompt ?? createCommitSystemPrompt(language);
  
  // 新增：如果配置了则解析提交特定模型
  let model: ModelInfo | undefined;
  if (opts.context.config.commit?.model) {
    const resolved = await resolveModelWithContext(
      opts.context.config.commit.model,
      opts.context
    );
    model = resolved.model || undefined;
  }
  
  const result = await query({
    userPrompt: opts.prompt,
    systemPrompt,
    context: opts.context,
    model,  // 传递解析的模型或undefined
  });
  
  // ... 其余保持不变
}
```

**在 `generateBranchName()` 中：**

```typescript
async function generateBranchName(opts: GenerateBranchNameOpts) {
  // 新增：如果配置了则解析提交特定模型
  let model: ModelInfo | undefined;
  if (opts.context.config.commit?.model) {
    const resolved = await resolveModelWithContext(
      opts.context.config.commit.model,
      opts.context
    );
    model = resolved.model || undefined;
  }
  
  const result = await query({
    userPrompt: opts.commitMessage,
    systemPrompt: createBranchSystemPrompt(),
    context: opts.context,
    model,  // 传递解析的模型或undefined
  });
  
  // ... 其余保持不变
}
```

### 错误处理

`resolveModelWithContext()` 中的现有错误处理将处理无效配置：
- 无效提供者 → "Provider X not found, valid providers: ..."
- 无效模型 → "Model X not found in provider Y, valid models: ..."

### 回退行为

```typescript
// 如果未设置commit.model
context.config.commit?.model  // undefined

// query() 接收 model: undefined
// query() 回退到：context.config.model（现有行为）
```

### 用户配置

用户可以使用现有的配置命令配置提交模型：

```bash
# 全局设置提交特定模型
neo config set commit.model "anthropic/claude-3-5-sonnet-20241022"

# 为项目设置提交特定模型
neo config set --local commit.model "openai/gpt-4o"

# 检查当前提交配置
neo config get commit.model

# 移除提交模型覆盖
neo config remove commit.model
```

### 实现大小

估计跨两个函数约25-30行新代码。

## 完整流程

1. 用户运行 `neo commit`
2. 系统检查 `context.config.commit?.model`
3. 如果设置 → 通过 `resolveModelWithContext()` 解析模型
4. 如果未设置 → 在 `query()` 中回退到 `context.config.model`
5. 模型用于提交消息和分支名称生成
