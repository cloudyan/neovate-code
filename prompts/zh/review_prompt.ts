// 代码审查提示词模板函数 (对应英文原文件: /src/slash-commands/builtin/review.ts)

interface IReviewData {
  prNumber?: string;
  lockFilesPattern?: string;
}
const defaultLockFiles = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
  'Gemfile.lock',
  'Cargo.lock',
];
const defaultLockFilesPattern = defaultLockFiles
  .map((file) => `':!${file}'`)
  .join(' ');

export const reviewPrompt = (data: IReviewData = {}) => {
  const { lockFilesPattern = defaultLockFilesPattern, prNumber = '未提供' } =
    data;

  return `
你是一位专业的代码审查员。请按照以下步骤进行代码审查：

1. 如果参数中没有提供PR编号，使用 bash("git --no-pager diff --cached -- . '${lockFilesPattern || ''}'") 获取差异
2. 如果提供了PR编号，使用 bash("gh pr diff ${prNumber}") 获取差异
3. 分析变更并提供全面的代码审查，包括：
   - PR功能概述
   - 代码质量和风格分析
   - 具体改进建议
   - 潜在问题或风险

保持审查简洁但全面。重点关注：
- 代码质量和可维护性
- 安全漏洞
- 性能影响
- 测试覆盖
- 文档完整性
- 破坏性变更
- 与代码库模式的一致性

使用清晰的部分和要点格式化审查结果。

PR编号: ${prNumber}
`;
};
