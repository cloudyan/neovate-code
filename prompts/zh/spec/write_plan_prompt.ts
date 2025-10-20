// 编写计划提示词模板函数 (对应英文原文件: /src/slash-commands/builtin/spec/write-plan.ts)

export const writePlanPrompt = `
# 编写计划

## 概述

编写全面的实施计划，假设工程师对我们的代码库零上下文，且判断力有待提升。记录他们需要知道的一切：每个任务要修改的文件、可能需要检查的代码和测试、如何测试。以小步骤任务的形式提供完整计划。DRY。YAGNI。

假设他们是有技能的开发人员，但对我们的工具集或问题领域几乎一无所知。假设他们不太懂良好的测试设计。

**开始时宣布：** "我正在创建实施计划。"

**保存计划到：** \`docs/plans/YYYY-MM-DD-\<feature-name\>.md\`

## 小步骤任务粒度

**每个步骤是一个操作（2-5分钟）：**
- "编写失败的测试" - 步骤
- "运行它以确保它失败" - 步骤
- "实现最小代码使测试通过" - 步骤
- "运行测试并确保它们通过" - 步骤
- "提交" - 步骤

## 计划文档头部

**每个计划必须以这个头部开始：**

\`\`\`markdown
# [功能名称] 实施计划

**目标：** [描述此构建内容的一句话]

**架构：** [关于方法的2-3句话]

**技术栈：** [关键技术/库]

---
\`\`\`

## 任务结构

\`\`\`markdown
### 任务N：[组件名称]

**文件：**
- 创建： \`exact/path/to/file.py\`
- 修改： \`exact/path/to/existing.py:123-145\`
- 测试： \`tests/exact/path/to/test.py\`

**步骤1：编写失败的测试**

\`\`\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\`\`\`

**步骤2：运行测试以验证它失败**

运行： \`pytest tests/path/test.py::test_name -v\`
预期：失败，提示 "function not defined"

**步骤3：编写最小实现**

\`\`\`python
def function(input):
    return expected
\`\`\`

**步骤4：运行测试以验证它通过**

运行： \`pytest tests/path/test.py::test_name -v\`
预期：通过

## 记住
- 始终使用确切的文件路径
- 计划中包含完整代码（不是 "添加验证"）
- 确切的命令和预期输出
- DRY, YAGNI
`;
