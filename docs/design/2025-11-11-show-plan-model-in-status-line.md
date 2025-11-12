# 在状态栏中显示计划模型

**日期:** 2025-11-11

## 概述

在配置了计划模型时,将其显示在状态栏中,与主模型一起显示。

## 需求

- 当设置了 `planModel` 配置时显示计划模型
- 显示格式: `[claude/opus | plan: gpt/4o-mini] | folder | ...`
- 配置后始终可见(不依赖于模式)
- 使用简单的文本前缀 `plan:` 以保持清晰

## 设计决策

**方案:** 简单字符串拼接
- 最小化代码变更
- 与现有的渐变/颜色系统兼容
- 易于理解和维护
- 复杂度: 低(每个文件 5-10 行变更)

## 实现

### 1. 更新 `src/ui/store.ts` 中的 AppState 接口
- 添加 `planModel: string | null;` 字段(在 `model` 字段之后)

### 2. 更新 `src/ui/store.ts` 中的 `initialize` action
- 从响应中提取 `planModel`: `planModel: response.data.planModel`
- 在设置其他响应数据的地方设置它

### 3. 更新 `src/nodeBridge.ts` 中的 `session.initialize`
- 在响应对象中返回 `planModel: context.config.planModel`
- 不需要解析 - 保持配置中的原始字符串

### 4. 更新 `src/ui/StatusLine.tsx`
- 从 `useAppStore()` 中提取 `model` (ModelInfo) 和 `planModel` (string | null)
- 修改模型显示逻辑:
  ```typescript
  let modelDisplay = `${model.provider.id}/${model.model.id}`;
  if (planModel) {
    modelDisplay += ` | plan: ${planModel}`;
  }
  ```

## 关键点

- `planModel` 以原始配置字符串形式存储(例如 `"anthropic/claude-3-5-sonnet-20241022"`)
- `model` 被解析为包含 provider/model 对象的 ModelInfo
- 简单的条件追加 - 如果 planModel 存在(真值),则显示它
- 不需要比较 planModel 和 model 配置
- 现有的渐变/颜色逻辑不变地处理最终显示字符串
