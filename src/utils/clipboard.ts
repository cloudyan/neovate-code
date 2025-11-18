import { spawn } from 'node:child_process';
import type { SpawnOptions } from 'node:child_process';

/**
 * 跨平台剪贴板复制工具
 * 参考 qwen-code 实现，支持 Windows、macOS、Linux
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  const run = (cmd: string, args: string[], options?: SpawnOptions) =>
    new Promise<void>((resolve, reject) => {
      const child = options ? spawn(cmd, args, options) : spawn(cmd, args);
      let stderr = '';
      let isResolved = false;

      // 添加超时保护
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          child.kill('SIGTERM');
          reject(new Error(`Clipboard command '${cmd}' timed out`));
        }
      }, 5000);

      if (child.stderr) {
        child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
      }

      child.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      });

      child.on('close', (code) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          if (code === 0) return resolve();
          const errorMsg = stderr.trim();
          reject(
            new Error(
              `'${cmd}' exited with code ${code}${errorMsg ? `: ${errorMsg}` : ''}`,
            ),
          );
        }
      });

      if (child.stdin) {
        child.stdin.on('error', (error) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            reject(error);
          }
        });
        child.stdin.write(text);
        child.stdin.end();
      } else {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          reject(new Error('Child process has no stdin stream to write to.'));
        }
      }
    });

  // Linux 环境配置 stdio
  const linuxOptions: SpawnOptions = {
    stdio: ['pipe', 'inherit', 'pipe'],
  };

  switch (process.platform) {
    case 'win32':
      return run('clip', []);
    case 'darwin':
      return run('pbcopy', []);
    case 'linux':
      try {
        await run('xclip', ['-selection', 'clipboard'], linuxOptions);
      } catch (primaryError) {
        try {
          // xclip 失败时尝试 xsel 作为备选
          await run('xsel', ['--clipboard', '--input'], linuxOptions);
        } catch (fallbackError) {
          const xclipNotFound =
            primaryError instanceof Error &&
            (primaryError as NodeJS.ErrnoException).code === 'ENOENT';
          const xselNotFound =
            fallbackError instanceof Error &&
            (fallbackError as NodeJS.ErrnoException).code === 'ENOENT';

          if (xclipNotFound && xselNotFound) {
            throw new Error(
              'Please install xclip or xsel for clipboard support on Linux',
            );
          }

          // 提供更友好的错误信息和解决方案
          const isPermissionError =
            (primaryError instanceof Error &&
              primaryError.message.includes('permission')) ||
            (fallbackError instanceof Error &&
              fallbackError.message.includes('permission'));

          if (isPermissionError) {
            throw new Error(
              'Permission denied when accessing clipboard. Please check display server access.',
            );
          }

          const primaryMsg = xclipNotFound
            ? 'xclip not found'
            : primaryError instanceof Error
              ? primaryError.message
              : String(primaryError);
          const fallbackMsg = xselNotFound
            ? 'xsel not found'
            : fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);

          throw new Error(
            `Clipboard operation failed. Try installing xclip: sudo apt-get install xclip`,
          );
        }
      }
      return;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
};

/**
 * 检查剪贴板功能是否可用
 */
export const isClipboardSupported = (): boolean => {
  try {
    return (
      typeof process !== 'undefined' &&
      ['win32', 'darwin', 'linux'].includes(process.platform)
    );
  } catch {
    return false;
  }
};
