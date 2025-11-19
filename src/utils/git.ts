/**
 * Git 信息获取工具
 * 用于收集项目的 Git 状态信息，供 AI 理解项目上下文
 */
import { execFileNoThrow } from './execFileNoThrow';

/**
 * 获取 Git 仓库的状态信息
 * @param opts.cwd - 工作目录
 * @returns Git 状态对象，如果不是 Git 仓库则返回 null
 *          返回值注释说明了每个字段的含义
 */
export async function getGitStatus(opts: { cwd: string }) {
  const cwd = opts.cwd;

  // 1. 检查是否为 Git 仓库
  const isGit = await (async () => {
    const { code } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      undefined,
      undefined,
      false,
    );
    return code === 0;
  })();
  if (!isGit) {
    return null;
  }

  // 2: 获取当前分支名
  // 格式: "dev_20251014_start"
  const branch = await (async () => {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['branch', '--show-current'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();

  // 步骤 3: 获取主分支名（通常是 master 或 main）
  // 格式: "master" 或 "main"
  const mainBranch = await (async () => {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--abbrev-ref', 'origin/HEAD'],
      undefined,
      undefined,
      false,
    );
    return stdout.replace('origin/', '').trim();
  })();

  // 步骤 4: 获取工作区状态
  // 格式: "M docs/arch.md" (M=修改, A=新增, D=删除, ??=未跟踪)
  const status = await (async () => {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['status', '--short'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();

  // 步骤 5: 获取最近 5 条提交记录
  // 格式: "63b5afa docs: add architecture documentation"（每行一条）
  const log = await (async () => {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['log', '--oneline', '-n', '5'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();

  // 步骤 6: 获取当前用户邮箱
  // 格式: "user@example.com"
  const author = await (async () => {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['config', 'user.email'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();

  // 步骤 7: 获取当前用户的最近 5 条提交记录
  // 格式: "63b5afa docs: add architecture documentation"（每行一条）
  const authorLog = await (async () => {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['log', '--author', author, '--oneline', '-n', '5'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();
  return {
    branch, // 当前分支名（如 "dev_20251014_start"）
    mainBranch, // 主分支名（如 "master" 或 "main"）
    status, // 工作区状态（修改的文件列表）（如 "M docs/arch.md" (M=修改, A=新增, D=删除, ??=未跟踪)）
    log, // 最近的提交记录（所有作者）5 条
    author, // 当前用户邮箱
    authorLog, // 当前用户的最近提交记录 5 条
  };
}

/**
 * 将 Git 状态格式化为 AI 可读的文本
 * 这段文本会作为系统上下文发送给 AI，帮助 AI 理解项目当前状态
 *
 * @param status - getGitStatus() 返回的状态对象
 * @returns 格式化后的状态文本，如果不是 Git 仓库则返回 null
 */
export async function getLlmGitStatus(
  status: Awaited<ReturnType<typeof getGitStatus>>,
) {
  if (!status) {
    return null;
  }
  return `
This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.
Current branch: ${status.branch}

Main branch (you will usually use this for PRs): ${status.mainBranch}

Status:
${status.status || '(clean)'}

Recent commits:
${status.log}

Your recent commits:
${status.authorLog || '(no recent commits)'}
  `.trim();
}

/**
 * Get remote origin URL
 */
export async function getGitRemoteUrl(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['config', '--get', 'remote.origin.url'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get default branch from remote
 */
export async function getDefaultBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--abbrev-ref', 'origin/HEAD'],
      undefined,
      undefined,
      false,
    );
    return stdout.replace('origin/', '').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Check sync status with remote
 */
export async function getGitSyncStatus(
  cwd: string,
): Promise<'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown'> {
  try {
    // Fetch remote to get latest info
    await execFileNoThrow(
      cwd,
      'git',
      ['fetch', 'origin', '--quiet'],
      undefined,
      undefined,
      false,
    );

    // Get current branch
    const { stdout: branch } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      undefined,
      undefined,
      false,
    );
    const currentBranch = branch.trim();

    // Check if remote tracking branch exists
    const { code: trackingExists } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--verify', `origin/${currentBranch}`],
      undefined,
      undefined,
      false,
    );

    if (trackingExists !== 0) {
      return 'unknown';
    }

    // Get ahead/behind counts
    const { stdout: counts } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-list', '--left-right', '--count', `origin/${currentBranch}...HEAD`],
      undefined,
      undefined,
      false,
    );

    const [behind, ahead] = counts.trim().split('\t').map(Number);

    if (ahead === 0 && behind === 0) {
      return 'synced';
    }
    if (ahead > 0 && behind === 0) {
      return 'ahead';
    }
    if (ahead === 0 && behind > 0) {
      return 'behind';
    }
    return 'diverged';
  } catch {
    return 'unknown';
  }
}

/**
 * Get current commit hash
 */
export async function getCurrentCommit(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', 'HEAD'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  } catch {
    return '';
  }
}

/**
 * Get list of pending changes
 */
export async function getPendingChanges(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['status', '--porcelain'],
      undefined,
      undefined,
      false,
    );
    if (!stdout.trim()) {
      return [];
    }
    return stdout
      .trim()
      .split('\n')
      .map((line) => line.substring(3).trim());
  } catch {
    return [];
  }
}
