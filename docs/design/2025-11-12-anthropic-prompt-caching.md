# Anthropic 提示词缓存

**日期:** 2025-11-12

## 概述

为 Anthropic 模型(Sonnet 和 Opus)添加提示词缓存支持,通过缓存重复的提示词内容来优化 API 成本和延迟。

## 需求

- 创建 `promptCache.ts` 模块以向提示词添加缓存属性
- 当模型名称包含 "sonnet" 或 "opus" 时,对所有消息应用缓存控制
- 向每条消息添加 `providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } }`
- 在提示词构造后集成到 `src/loop.ts` 中

## 架构

### 模块结构

**文件: `src/promptCache.ts`**

单个导出函数:
```typescript
export function addPromptCache(
  prompt: LanguageModelV2Prompt,
  model: ModelInfo
): LanguageModelV2Prompt
```

**核心逻辑流程:**
1. 检查模型名称是否包含 "sonnet" 或 "opus"(不区分大小写)
2. 如果不匹配,返回原始提示词不变
3. 如果匹配,遍历每条消息并添加 Anthropic 特定的缓存控制
4. 返回包含增强消息的新提示词数组

**类型安全:**
- 从 `@ai-sdk/provider` 导入类型
- 从 `./model` 导入 `ModelInfo`
- 保留所有现有消息属性

### 集成点

在 `loop.ts` 第 213 行之后(在 `prompt` 创建并可选地标准化之后):
```typescript
prompt = addPromptCache(prompt, opts.model);
```

这发生在 `At.normalizeLanguageV2Prompt()` 之后,因此缓存控制应用于最终的提示词结构。

## 实现

### 模型检测

```typescript
const modelId = model.model.id.toLowerCase();
const shouldCache = modelId.includes('sonnet') || modelId.includes('opus');
```

检查 `model.model.id` 属性(例如 "claude-3-5-sonnet-20241022")是否包含子字符串。

### 消息转换

```typescript
return prompt.map(message => ({
  ...message,
  providerOptions: {
    anthropic: {
      cacheControl: { type: "ephemeral" }
    }
  }
}));
```

使用展开运算符保留所有现有消息属性,添加嵌套的 `providerOptions` 结构。

### 边界情况

- 如果消息已经有 `providerOptions`,它将被覆盖(按设计)
- 空提示词数组返回空数组
- 不匹配的模型返回原始提示词引用(无分配)

## 完整代码

**文件: `src/promptCache.ts`**
```typescript
import type { LanguageModelV2Prompt } from '@ai-sdk/provider';
import type { ModelInfo } from './model';

export function addPromptCache(
  prompt: LanguageModelV2Prompt,
  model: ModelInfo,
): LanguageModelV2Prompt {
  const modelId = model.model.id.toLowerCase();
  const shouldCache = modelId.includes('sonnet') || modelId.includes('opus');

  if (!shouldCache) {
    return prompt;
  }

  return prompt.map((message) => ({
    ...message,
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
  }));
}
```

**对 `src/loop.ts` 的更改:**
1. 添加导入: `import { addPromptCache } from './promptCache';`
2. 在第 213 行之后添加: `prompt = addPromptCache(prompt, opts.model);`

## 测试策略

**手动测试:**
1. 使用 sonnet/opus 模型运行 - 在调试日志中验证缓存控制
2. 使用非 Anthropic 模型运行 - 验证未添加缓存控制
3. 测试空对话和多轮对话

**单元测试考虑:**
- 测试 sonnet 检测
- 测试 opus 检测
- 测试大小写不敏感性
- 测试不匹配的模型返回原始提示词
- 测试消息结构保留

## 优势

- 降低 Anthropic 模型重复提示词的 API 成本
- 降低缓存内容的延迟
- 对非 Anthropic 模型零影响
- 简单、可维护的实现
