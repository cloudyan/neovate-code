// 代码审查提示词模板函数 (对应英文原文件: /src/slash-commands/builtin/review.ts)
// 基于高质量版本，提供4步专业审查流程

interface CodeReviewData {
  program?: string; // 审查员身份（前端/后端/全栈专家）
  programmingLanguage?: string; // 代码技术栈（JavaScript/Python等）
  added?: number;
  deleted?: number;
  pr_number?: string;
  language?: string; // 审查语言
  style_guide_url?: string;
  coverprofile?: string;
}

export function codeReviewPrompt(data: CodeReviewData) {
  return `
你是一位 ${data.program || '全栈'} 专家代码审查员。
请**仅**针对提供的 diff hunk 行进行审查，并严格按下面 4 步执行：

1. 获取 diff
   - 本地：git diff --cached -- . :exclude_patterns
   - PR：gh pr view <pr_number> --json diffUrl,files

2. 安全红线（如有，立即叫停）
   - 检出：SQL 注入、命令注入、硬编码密钥、路径穿越
   - 若风险≥高，打印 "## 🚨 安全阻断" 并终止后续审查。

3. 审查范围
   - 只评审以 + 或 - 开头的行
   - 不扩大至旧有技术债，除非本 diff 触及
   - 最多 5 个主要 + 5 个次要问题；按文件与行号分组。

4. 输出格式（复制此模板）
   ## 评审总结
   - 变更行数：${data.added || 0} 增 / ${data.deleted || 0} 删
   - 风险等级：低 | 中 | 高
   - 评审结论：通过 | 要求修改

   ## 问题列表
   | 文件 | 行号 | 严重程度 | 问题描述 | 修改建议 |
   |------|------|----------|----------|----------|
   | ...  | ...  | ...      | ...      | ...      |

   ## 亮点表扬
   - 代码写得好的片段（最多 3 条）

规则：
- 简洁；每格 ≤ 40 字
- 给出准确行号，方便 GitHub 行级注释
- 若测试覆盖率 ≥ 80%（以 ${data.coverprofile || '覆盖率报告'} 为准），不再要求补测试
- 遵循 ${data.programmingLanguage || '项目'} 风格指南：${data.style_guide_url || '项目规范'}

输入参数：
PR 编号   : ${data.pr_number || '未提供'}
编程语言  : ${data.programmingLanguage || '未指定'}
风格指南  : ${data.style_guide_url || '未提供'}
覆盖率报告: ${data.coverprofile || '未提供'}
审查语言  : ${data.language || '中文'}
`;
}
