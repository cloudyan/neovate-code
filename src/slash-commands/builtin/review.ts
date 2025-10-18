import type { PromptCommand } from '../types';

export function createReviewCommand() {
  return {
    type: 'prompt',
    name: 'review',
    description: 'Review a pull request or staged changes',
    progressMessage: 'Analyzing changes...',
    async getPromptForCommand(args?: string) {
      const prNumber = args?.trim();
      const lockFiles = [
        'pnpm-lock.yaml',
        'package-lock.json',
        'yarn.lock',
        'bun.lockb',
        'Gemfile.lock',
        'Cargo.lock',
      ];
      const lockFilesPattern = lockFiles.map((file) => `':!${file}'`).join(' ');
      return [
        {
          role: 'user',
          content: `You are an expert code reviewer. Follow these steps:

1. If no PR number is provided in the args, use bash("git --no-pager diff --cached -- . ${lockFilesPattern}") to get the diff
2. If a PR number is provided, use bash("gh pr diff <number>") to get the diff
3. Analyze the changes and provide a thorough code review that includes:
   - Overview of what the PR does
   - Analysis of code quality and style
   - Specific suggestions for improvements
   - Any potential issues or risks

Keep your review concise but thorough. Focus on:
- Code quality and maintainability
- Security vulnerabilities
- Performance implications
- Test coverage
- Documentation completeness
- Breaking changes
- Consistency with codebase patterns

Format your review with clear sections and bullet points.

PR number: ${prNumber || 'not provided'}`,
        },
      ];
    },
  } as PromptCommand;
}

const CodeReviewPrompt = (data: Record<string, any>) => {
  return `
你是一位 ${data.program} 专家代码审查员。
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
   - 变更行数：${data.added} 增 / ${data.deleted} 删
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
- 若测试覆盖率 ≥ 80 %（以 coverprofile 为准），不再要求补测试
- 遵循 ${data.language} 风格指南：${data.style_guide_url}

输入参数：
PR 编号   : ${data.pr_number}
语言      : ${data.language}
风格指南  : ${data.style_guide_url}
覆盖率报告: ${data.coverprofile}
`;
};
