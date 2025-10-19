import * as p from '@umijs/clack-prompts';
import assert from 'assert';
import { execSync } from 'child_process';
import pc from 'picocolors';
import type { Context } from '../context';
import { query } from '../query';
import * as logger from '../utils/logger';

async function executeShell(
  command: string,
  cwd: string,
): Promise<{ success: boolean; output: string }> {
  try {
    logger.logAction({ message: `Executing command: ${command}` });
    const output = execSync(command, {
      cwd, // 在指定工作目录(cwd)中执行命令，限制影响范围
      encoding: 'utf-8',
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    logger.logAction({ message: `Command executed successfully` });
    return { success: true, output: output?.toString() || '' };
  } catch (error: any) {
    logger.logError({
      error: `Command execution failed: ${error.message || 'Unknown error'}`,
    });
    return {
      success: false,
      output: error.message || 'Command execution failed',
    };
  }
}

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} run [options] <prompt>

Convert natural language to shell commands using AI and optionally execute them.

Arguments:
  prompt                Natural language description of what you want to do

Options:
  -h, --help            Show help
  -m, --model <model>   Specify model to use
  --yes                 Execute the command without confirmation

Examples:
  ${p} run "list all files in current directory"
  ${p} run "find all .js files modified in last 7 days"
  ${p} run --yes "update all npm dependencies"
    `.trim(),
  );
}

/**
 * 运行自定义指令
 *
 * 该函数将自然语言转换为 shell 命令并执行
 * 支持交互式确认和直接执行两种模式
 *
 * 设计原理：
 * 1. 参数解析：使用 yargs-parser 解析命令行参数，支持 prompt、model、yes 等选项
 * 2. AI 转换：通过 query 函数调用 AI 模型，将自然语言转换为 shell 命令
 * 3. 安全执行：提供交互式确认机制，用户可选择执行、编辑或取消命令
 * 4. 直接执行：支持 --yes 参数跳过确认，直接执行生成的命令
 * 5. 错误处理：捕获命令执行异常并记录日志
 *
 * @param context - 应用上下文对象
 * @returns Promise<void>
 */
export async function runRun(context: Context) {
  // 1. 解析命令行参数
  const { default: yargsParser } = await import('yargs-parser');
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
      help: 'h',
      yes: 'y', // 直接执行模式
    },
    boolean: ['help', 'yes'],
    string: ['model'],
  });

  if (argv.help) {
    printHelp(context.productName.toLowerCase());
    return;
  }

  logger.logIntro({
    productName: context.productName,
    version: context.version,
  });

  let prompt = argv._[1] as string;
  if (!prompt || prompt.trim() === '') {
    prompt = await logger.getUserInput();
  } else {
    logger.logUserInput({ input: prompt });
  }

  // Use AI to convert natural language to shell command
  logger.logAction({
    message: `AI is converting natural language to shell command...`,
  });

  // 2. 自然语言转 shell 命令
  const result = await query({
    userPrompt: prompt,
    systemPrompt: SHELL_COMMAND_SYSTEM_PROMPT,
    context,
  });
  let command = result.success ? result.data.text : null;
  assert(command, 'Command is not a string');

  // 使用彩色输出显示 AI 生成的 shell 命令
  // Display the generated command and request confirmation
  logger.logInfo(
    `
${pc.bold(pc.blueBright('AI generated shell command:'))}
${command}
`.trim(),
  );

  // 3. 直接执行模式（--yes 参数）
  // If --yes mode is enabled, execute the command without confirmation
  if (argv.yes) {
    const result = await executeShell(command, process.cwd());

    if (!result.success) {
      logger.logError({
        error: `Command execution failed: ${result.output}`,
      });
    }
    return;
  }

  // 4. 交互执行，提供三个选项：执行、编辑、取消
  // Default behavior: request confirmation
  const execution = await p.select({
    message: 'Confirm execution',
    options: [
      { value: 'execute', label: 'Execute' },
      { value: 'edit', label: 'Edit' },
      { value: 'cancel', label: 'Cancel' },
    ],
  });

  if (logger.isCancel(execution)) {
    logger.logInfo('Command execution cancelled');
    return;
  }

  if (execution === 'edit') {
    const editedCommand = await logger.getUserInput({
      message: 'Edit command',
      defaultValue: command,
    });

    if (editedCommand) {
      command = editedCommand;
    }

    const confirmExecution = await logger.confirm({
      message: `Execute command: ${pc.reset(pc.gray(command))}`,
      active: pc.green('Execute'),
      inactive: pc.red('Cancel'),
    });

    if (!confirmExecution || logger.isCancel(confirmExecution)) {
      logger.logInfo('Command execution cancelled');
      return;
    }
  }

  if (execution === 'cancel') {
    logger.logInfo('Command execution cancelled');
    return;
  }

  const executeResult = await executeShell(command, process.cwd());

  if (executeResult.success) {
    logger.logOutro();
  } else {
    // 5. 错误处理
    logger.logError({
      error: `Command execution failed: ${executeResult.output}`,
    });
  }
}

const SHELL_COMMAND_SYSTEM_PROMPT = `
You are a tool that converts natural language instructions into shell commands.
Your task is to transform user's natural language requests into precise and effective shell commands.

Please follow these rules:
1. Output only the shell command, without explanations or additional content
2. If the user directly provides a shell command, return that command as is
3. If the user describes a task in natural language, convert it to the most appropriate shell command
4. Avoid using potentially dangerous commands (such as rm -rf /)
5. Provide complete commands, avoiding placeholders
6. Reply with only one command, don't provide multiple options or explanations
7. When no suitable command can be found, return the recommended command directly

Examples:
User: "List all files in the current directory"
Reply: "ls -la"

User: "Create a new directory named test"
Reply: "mkdir test"

User: "Find all log files containing 'error'"
Reply: "find . -name '*.log' -exec grep -l 'error' {} \\;"

User: "ls -la" (user directly provided a command)
Reply: "ls -la"

User: "I want to compress all images in the current directory"
Reply: "find . -type f ( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" ) -exec mogrify -quality 85% {} \\;"
`;
