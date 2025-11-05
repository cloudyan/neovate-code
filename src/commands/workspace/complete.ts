import { exec } from 'child_process';
import { render } from 'ink';
import React from 'react';
import { promisify } from 'util';
import type { Context } from '../../context';
import type { Worktree } from '../../worktree';
import {
  detectMainBranch,
  getGitRoot,
  getWorktreeFromPath,
  listWorktrees,
  mergeWorktree,
} from '../../worktree';
import { CompletionChoice, WorkspaceSelector } from './components';

// 流程是：

// 1. 检测工作区：从当前目录识别 Git worktree 信息
// 2. 加载元数据：读取 .xxx-workspaces/.metadata 文件获取原始分支信息
// 3. 检查未提交更改：如果工作区有未提交的更改则发出警告
// 4. 显示完成选项：通过交互式界面提供三个选择：
//     1. 合并到原始分支
//     2. 创建 PR 到远程仓库
//     3. 取消操作
// 5. 执行合并操作（如果选择）：
//     1. 调用 mergeWorktree 函数合并更改
//     2. 从元数据中删除已完成的工作区记录
//     3. 删除工作区目录和分支
// 6. 执行 PR 操作（如果选择）：
//     1. 推送工作区分支到远程仓库
//     2. 使用 GitHub CLI 创建 PR
//     3. 提示用户在 PR 合并后手动删除工作区

const execAsync = promisify(exec);

export async function runComplete(context: Context, argv: any) {
  const cwd = process.cwd();
  const productName = context.productName.toLowerCase();

  try {
    const gitRoot = await getGitRoot(cwd);

    // Check if we're in a workspace directory
    try {
      const worktreeInPath = await getWorktreeFromPath(cwd);
      // If we found a worktree, we're inside one - this is not allowed
      console.error(
        `Error: Please run this command from the repository root directory, not from inside a workspace.`,
      );
      console.error(`\nCurrent location: ${cwd}`);
      console.error(`Repository root: ${gitRoot}`);
      console.error(
        `\nNavigate to root first:\n  cd ${gitRoot}\n  ${context.productName.toLowerCase()} workspace complete`,
      );
      process.exit(1);
    } catch (error: any) {
      // Good! We're not in a workspace directory, proceed
    }

    // List all available workspaces
    const worktrees = await listWorktrees(gitRoot);

    if (worktrees.length === 0) {
      console.error('Error: No active workspaces found. Create one with:');
      console.error(`  ${context.productName.toLowerCase()} workspace create`);
      process.exit(1);
    }

    let worktree: Worktree;

    if (worktrees.length === 1) {
      // Only one workspace, use it automatically
      worktree = worktrees[0];
      console.log(`Using workspace '${worktree.name}'...\n`);
    } else {
      // Multiple workspaces, let user choose
      const result = await new Promise<Worktree | null>((resolve) => {
        const { waitUntilExit } = render(
          React.createElement(WorkspaceSelector, {
            worktrees,
            onSelect: (selectedWorktree: Worktree) => {
              resolve(selectedWorktree);
            },
            onCancel: () => {
              resolve(null);
            },
          }),
        );
        waitUntilExit();
      });

      if (!result) {
        console.log('\nCancelled.');
        process.exit(0);
      }

      // TypeScript doesn't recognize that process.exit terminates,
      // but we know result is not null here
      worktree = result as Worktree;
    }

    // Load metadata to get original branch
    const fs = await import('fs');
    const metadataPath = `${gitRoot}/.${productName}-workspaces/.metadata`;
    let metadata: Record<string, any> = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch {
        metadata = {};
      }
    }

    const originalBranch =
      metadata[worktree.name]?.originalBranch ||
      (await detectMainBranch(gitRoot));
    worktree.originalBranch = originalBranch;

    // Warn if has uncommitted changes
    if (!worktree.isClean) {
      console.log(
        '\nWarning: Workspace has uncommitted changes. These will be included in the merge/PR.\n',
      );
    }

    // Show completion options
    const { waitUntilExit } = render(
      React.createElement(CompletionChoice, {
        originalBranch,
        worktreeName: worktree.name,
        onMerge: async () => {
          try {
            console.log(
              `\nMerging workspace '${worktree.name}' to '${originalBranch}'...`,
            );
            await mergeWorktree(gitRoot, worktree);

            // Remove from metadata
            if (fs.existsSync(metadataPath)) {
              try {
                const updatedMetadata = JSON.parse(
                  fs.readFileSync(metadataPath, 'utf-8'),
                );
                delete updatedMetadata[worktree.name];
                fs.writeFileSync(
                  metadataPath,
                  JSON.stringify(updatedMetadata, null, 2),
                );
              } catch {
                // Ignore metadata errors
              }
            }

            console.log(
              `\nWorkspace '${worktree.name}' merged successfully to '${originalBranch}'.`,
            );
            console.log(`You are now on branch '${originalBranch}'.`);
            process.exit(0);
          } catch (error: any) {
            console.error(`\nError: ${error.message}`);
            process.exit(1);
          }
        },
        onPR: async () => {
          try {
            console.log(`\nPushing branch '${worktree.branch}' to remote...`);

            // Push branch to remote
            await execAsync(`git push -u origin ${worktree.branch}`, {
              cwd: worktree.path,
            });

            // Create PR using gh CLI
            console.log('\nCreating pull request...');
            const prTitle = `Workspace: ${worktree.name}`;
            const prBody = `This PR contains changes from workspace '${worktree.name}'.\n\nOriginal branch: ${originalBranch}`;

            try {
              const { stdout } = await execAsync(
                `gh pr create --title "${prTitle}" --body "${prBody}" --base ${originalBranch}`,
                { cwd: gitRoot },
              );

              console.log('\nPull request created successfully!');
              console.log(stdout.trim());

              // Navigate back to git root
              console.log(`\nNavigating back to repository root...`);
              process.chdir(gitRoot);

              console.log(
                `\nWorkspace '${worktree.name}' is still active. Delete it when PR is merged:`,
              );
              console.log(`  ${productName} workspace delete ${worktree.name}`);

              process.exit(0);
            } catch (error: any) {
              if (error.message?.includes('gh: command not found')) {
                console.error(
                  '\nError: GitHub CLI (gh) not found. Please install it first:',
                );
                console.error('  https://cli.github.com/');
              } else {
                console.error(`\nError creating PR: ${error.message}`);
              }
              process.exit(1);
            }
          } catch (error: any) {
            console.error(`\nError: ${error.message}`);
            process.exit(1);
          }
        },
        onCancel: () => {
          console.log('\nCancelled.');
          process.exit(0);
        },
      }),
    );

    await waitUntilExit();
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
