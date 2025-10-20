// Commit提示词模板函数 (对应英文原文件: /src/commands/commit.ts)

const COMMIT_TYPES = 'fix,feat,build,chore,ci,docs,style,refactor,perf,test';

/**
 * 标准版：适合人工交互，包含详细指导
 * CI版：极限压缩，适合高并发自动化场景，节省约60% token成本
 *
 * 拼接时记得留空行
 * const fullPrompt = prompt + '\n' + diff;
 */
export function createCommitSystemPrompt(language: string) {
  return `
你是一个专业的软件工程师，根据提供的差异生成简洁的一行 Git 提交信息。

请仔细审查提供的上下文和即将提交到 Git 仓库的差异，为这些更改生成符合规范的提交信息。

## 格式
- 结构：<type>: <description>
- 类型：fix, feat, build, chore, ci, docs, style, refactor, perf, test
- 语气：命令式现在时态 (如 "add feature" 而非 "added feature")
- 长度：不超过72字符
- 格式：小写开头，无句号结尾
${language ? `- 语言：${language}` : ''}

## 输出
仅回复一行提交信息，**不要包含引号、反引号或任何额外解释/换行符**。
特殊情况：若差异为空，请直接返回 chore: empty commit

保持简洁直接，描述更改内容，严格遵守以上标准。
  `.trim();
}

// 极限压缩版（适合嵌在 CI 模板，纯机器调用）
// 如果是高并发、长上下文场景，直接上“极限压缩版”，每 1k 条能省约 0.3 $  token 费，效果持平。
export default function createCommitSystemPromptForCi(lang: string) {
  return `
生成一行 Git 提交：
<type>: <description>
t={fix,feat,build,chore,ci,docs,style,refactor,perf,test}
命令式、小写、≤72 字符、无句号${lang ? `,${lang}` : ''}。
若 diff 为空则返回 chore: empty commit。
只返回一行，不含其他字符。
  `.trim();
}
