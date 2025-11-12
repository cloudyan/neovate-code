# Spec 保存设计命令

**日期:** 2025-11-12

## 背景

添加一个斜杠命令,将头脑风暴会话设计保存到 `docs/designs/`,文件名带有日期前缀。该命令应位于 `src/slash-commands/builtin/spec/` 下,遵循现有 spec 命令的模式。

## 讨论

### 捕获策略
该命令应自动捕获当前会话的整个对话历史并将其保存为设计文档。具体来说,仅捕获 `/spec:brainstorm` 命令被调用之后的消息(仅头脑风暴对话)。

### 文件名格式
格式: `YYYY-MM-DD-<描述性名称>.md`,其中描述性名称从对话主题自动生成(例如 `2025-11-12-save-design-command.md`)。

### 命令类型
使用 `PromptCommand` 类型斜杠命令,指示 LLM 处理保存过程,而不是实现直接的文件操作逻辑。

## 方案

一个 `PromptCommand`,指示 LLM 审查头脑风暴对话,将其格式化为设计文档,生成适当的文件名,并使用 `write` 工具保存。

### 流程
1. 用户调用 `/spec:save-design`
2. 命令向 LLM 生成带有指令的提示
3. LLM 审查自 `/spec:brainstorm` 以来的对话历史
4. LLM 将内容格式化为结构化设计文档
5. LLM 生成文件名: `YYYY-MM-DD-<主题>.md`
6. LLM 使用 `write` 工具保存到 `docs/designs/`

## 架构

### 文件结构
- 新文件: `src/slash-commands/builtin/spec/save-design.ts`
- 在 `src/slash-commands/builtin/index.ts` 中导出和注册
- 遵循与 `brainstorm.ts`、`write-plan.ts`、`execute-plan.ts` 相同的模式

### 命令定义
- 名称: `spec:save-design`
- 类型: `prompt`
- 描述: 将当前头脑风暴会话保存为设计文档
- 不需要参数(从对话自动生成文件名)

### 提示指令
提示将指示 LLM:
1. 在对话历史中定位 `/spec:brainstorm` 调用
2. 提取该点之后的所有消息(用户 + 助手)
3. 格式化为包含各个部分的连贯设计文档
4. 从主要主题生成 slug(小写,连字符,最多约 3-5 个词)
5. 获取 YYYY-MM-DD 格式的当前日期
6. 使用 write 工具: `docs/designs/{date}-{slug}.md`

### 设计文档格式
```markdown
# [功能名称]

**日期:** YYYY-MM-DD

## 背景
[初始用户请求/想法]

## 讨论
[探讨的关键问题和答案]

## 方案
[最终设计决策]

## 架构
[如果讨论过的技术细节]
```

### 集成
添加到 `src/slash-commands/builtin/index.ts`:
- 导入: `import { saveDesignCommand } from './spec/save-design';`
- 添加到数组: `saveDesignCommand(opts.language),`

### 错误处理
- 如果历史中未找到 `/spec:brainstorm` → 通知用户未检测到头脑风暴会话
- 如果已存在同名文件 → LLM 应追加时间戳或递增编号
- 如果 `docs/designs/` 目录不存在 → 自动创建

## 测试

手动测试:
1. 运行 `/spec:brainstorm` → 进行对话
2. 运行 `/spec:save-design`
3. 验证在 `docs/designs/` 中创建了带有正确日期前缀的文件
4. 验证内容包括头脑风暴以后的对话
5. 检查文件名生成是否合理

不需要自动化测试(遵循其他基于提示的 spec 命令的模式)。
