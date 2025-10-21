import { setTraceProcessors } from '@openai/agents';
import assert from 'assert';
import { render } from 'ink';
import React from 'react';
import { runServer } from './commands/server/server';
import { Context } from './context';
import { GlobalData } from './globalData';
import { parseMcpConfig } from './mcp';
import { DirectTransport } from './messageBus';
import { NodeBridge } from './nodeBridge';
import { Paths } from './paths';
import { type Plugin, PluginHookType } from './plugin';
import { Project } from './project';
import { loadSessionMessages, Session, SessionConfigManager } from './session';
import {
  isSlashCommand,
  parseSlashCommand,
  SlashCommandManager,
} from './slashCommand';
import { App } from './ui/App';
import { useAppStore } from './ui/store';
import { UIBridge } from './uiBridge';
import type { UpgradeOptions } from './upgrade';

export { z as _zod } from 'zod';
export { ConfigManager as _ConfigManager } from './config';
export { query as _query } from './query';
export { createTool } from './tool';

export type { Plugin, Context };

// ref:
// https://github.com/yargs/yargs-parser/blob/6d69295/lib/index.ts#L19
process.env.YARGS_MIN_NODE_VERSION = '18';

type Argv = {
  _: string[]; // 位置参数
  // boolean
  help: boolean; // -h, --help
  mcp: boolean;
  quiet: boolean; // -q, --quiet
  continue?: boolean; // -c, --continue
  version: boolean; // -v, --version
  browser?: boolean;
  // string
  appendSystemPrompt?: string;
  approvalMode?: string; // --approval-mode
  cwd?: string; // --cwd
  language?: string;
  model?: string; // -m, --model
  outputFormat?: string; // --output-format
  outputStyle?: string; // --output-style
  planModel?: string; // --plan-model
  resume?: string; // -r, --resume
  systemPrompt?: string; // --system-prompt
  // array
  plugin: string[]; // --plugin (可多次使用)
  mcpConfig: string[]; // --mcp-config (可多次使用)
};

async function parseArgs(argv: any) {
  const { default: yargsParser } = await import('yargs-parser');
  const args = yargsParser(argv, {
    alias: {
      model: 'm',
      help: 'h',
      resume: 'r',
      quiet: 'q',
      continue: 'c',
      version: 'v',
    },
    default: {
      mcp: true,
      mcpConfig: [],
    },
    array: ['plugin', 'mcpConfig'],
    boolean: ['help', 'mcp', 'quiet', 'continue', 'version', 'browser'],
    string: [
      'appendSystemPrompt',
      'approvalMode',
      'cwd',
      'language',
      'mcpConfig',
      'model',
      'outputFormat',
      'outputStyle',
      'planModel',
      'resume',
      'systemPrompt',
    ],
  }) as Argv;
  if (args.resume && args.continue) {
    throw new Error('Cannot use --resume and --continue at the same time');
  }
  if (args.model === '') {
    throw new Error('Model cannot be empty string');
  }
  return args;
}

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} [options] [command] <prompt>

Run the code agent with a prompt, interactive by default, use -q/--quiet for non-interactive mode.

Arguments:
  prompt                        Prompt to run

Options:
  -h, --help                    Show help
  -m, --model <model>           Specify model to use
  --plan-model <model>          Specify a plan model for some tasks
  -r, --resume <session-id>     Resume a session
  -c, --continue                Continue the latest session
  -q, --quiet                   Quiet mode, non interactive
  --browser                     Enable browser integration
  --cwd <path>                  Specify the working directory
  --system-prompt <prompt>      Custom system prompt for code agent
  --output-format <format>      Output format, text, stream-json, json
  --output-style <style>        Output style (name or path)
  --approval-mode <mode>        Tool approval mode, default, autoEdit, yolo
  --mcp-config <config>         MCP server configuration (JSON string with "mcpServers" object or file path)

Examples:
  ${p} "Refactor this file to use hooks."
  ${p} -m gpt-4o "Add tests for the following code."

Commands:
  config                        Manage configuration
  commit                        Commit changes to the repository
  mcp                           Manage MCP servers
  run                           Run a command
  update                        Check for and apply updates
    `.trimEnd(),
  );
}

// Quiet 安静模式 - 非交互式执行
async function runQuiet(argv: Argv, context: Context) {
  try {
    const exit = () => {
      process.exit(0);
    };
    process.on('SIGINT', exit);
    process.on('SIGTERM', exit);
    const prompt = argv._[0];
    assert(prompt, 'Prompt is required in quiet mode');

    // 1. 获取提示词
    let input = String(prompt) as string;
    let model: string | undefined;

    // 2. 处理 slash 命令
    if (isSlashCommand(input)) {
      const parsed = parseSlashCommand(input);
      // 转换为普通提示词
      const slashCommandManager = await SlashCommandManager.create(context);
      const commandEntry = slashCommandManager.get(parsed.command);
      if (commandEntry) {
        const { command } = commandEntry;
        // TODO: support other slash command types
        if (command.type === 'prompt') {
          const prompt = await command.getPromptForCommand(parsed.args);
          assert(prompt, `Prompt is required for ${parsed.command}`);
          assert(
            prompt.length === 1,
            `Only one prompt is supported for ${parsed.command} in quiet mode`,
          );
          input = prompt?.[0]?.content;
          if (command.model) {
            model = command.model;
          }
        } else {
          throw new Error(`Unsupported slash command: ${parsed.command}`);
        }
      }
    }

    // 3. 恢复会话（如果指定）
    let sessionId = argv.resume;
    if (argv.continue) {
      sessionId = context.paths.getLatestSessionId();
    }

    await context.apply({
      hook: 'telemetry',
      args: [
        {
          name: 'send',
          payload: {
            message: input,
            sessionId,
          },
        },
      ],
      type: PluginHookType.Parallel,
    });

    // 4. 创建项目实例并发送消息
    const project = new Project({
      context,
      sessionId,
    });
    await project.send(input, {
      model,
      onToolApprove: () => Promise.resolve(true), // 自动批准所有工具
    });
    process.exit(0);
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

// 交互模式 - 默认模式
async function runInteractive(
  argv: Argv,
  contextCreateOpts: any,
  cwd: string,
  upgrade?: UpgradeOptions,
) {
  // 1. 创建 UIBridge 和 NodeBridge
  const appStore = useAppStore.getState();
  // 两个 Bridge 解耦，通过 MessageBus 通信，互不依赖
  const uiBridge = new UIBridge({
    // 处理 UI 相关逻辑（Ink/React）
    appStore,
  });
  const nodeBridge = new NodeBridge({
    // 处理业务逻辑（AI 交互、文件操作）
    contextCreateOpts,
  });

  // 2. 创建通信通道--桥接模式 (Bridge Pattern)
  const [uiTransport, nodeTransport] = DirectTransport.createPair();
  uiBridge.messageBus.setTransport(uiTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  // 3. 初始化路径管理
  // Initialize the Zustand store with the UIBridge
  const paths = new Paths({
    productName: contextCreateOpts.productName,
    cwd,
  });

  // 4. 确定会话 ID
  const sessionId = (() => {
    if (argv.resume) {
      // 恢复指定会话 --resume <session-id>
      return argv.resume;
    }
    if (argv.continue) {
      // 继续最新会话 --continue
      return paths.getLatestSessionId() || Session.createSessionId();
    }
    // 创建新会话
    return Session.createSessionId();
  })();

  // 5. 加载会话消息和历史
  const [messages, history] = (() => {
    const logPath = paths.getSessionLogPath(sessionId);
    const messages = loadSessionMessages({ logPath });
    const globalData = new GlobalData({
      globalDataPath: paths.getGlobalDataPath(),
    });
    const history = globalData.getProjectHistory({ cwd });
    return [messages, history];
  })();

  // 6. 初始化应用状态
  const initialPrompt = String(argv._[0] || '');
  await appStore.initialize({
    bridge: uiBridge,
    cwd,
    initialPrompt,
    sessionId,
    logFile: paths.getSessionLogPath(sessionId),
    // TODO: should move to nodeBridge
    messages,
    history,
    upgrade,
  });

  // 7. 渲染 Ink UI
  render(React.createElement(App), {
    patchConsole: true, // 捕获 console 输出
    exitOnCtrlC: false, // 自定义 Ctrl+C 处理
  });

  // 8. 注册退出信号处理
  const exit = () => {
    process.exit(0);
  };
  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
}

// 程序入口
// 负责初始化 Context 并根据参数选择运行模式
export async function runNeovate(opts: {
  productName: string;
  productASCIIArt?: string;
  version: string;
  plugins: Plugin[];
  upgrade?: UpgradeOptions;
}) {
  // clear tracing
  setTraceProcessors([]);
  const argv = await parseArgs(process.argv.slice(2));
  const cwd = argv.cwd || process.cwd();

  // Parse MCP config if provided
  const mcpServers = parseMcpConfig(argv.mcpConfig || [], cwd);

  // 集中管理依赖--依赖注入 (Dependency Injection)
  const contextCreateOpts = {
    // 产品信息
    productName: opts.productName,
    productASCIIArt: opts.productASCIIArt,
    version: opts.version,
    // 命令行参数配置
    argvConfig: {
      model: argv.model, // AI 模型
      planModel: argv.planModel, // 计划模式专用模型
      quiet: argv.quiet, // 安静模式标志
      outputFormat: argv.outputFormat, // 输出格式 (text/json/stream-json)
      plugins: argv.plugin, // 额外插件路径
      systemPrompt: argv.systemPrompt, // 自定义系统提示词
      appendSystemPrompt: argv.appendSystemPrompt, // 追加系统提示词
      language: argv.language, // 语言设置
      outputStyle: argv.outputStyle, // 输出样式
      approvalMode: argv.approvalMode, // 工具审批模式
      mcpServers, // MCP 服务器配置
      browser: argv.browser, // 浏览器集成
    },
    // 插件列表
    plugins: opts.plugins,
  };

  // sub commands
  const command = argv._[0]; // 获取第一个位置参数

  // 一. Server 模式 neo server
  if (command === 'server') {
    await runServer({
      cwd,
      contextCreateOpts,
    });
    return;
  }

  // 二. 子命令处理
  const validCommands = ['config', 'commit', 'mcp', 'run', 'server', 'update'];
  if (validCommands.includes(command)) {
    const context = await Context.create({
      cwd,
      ...contextCreateOpts,
    });

    // 根据命令动态加载并执行
    switch (command) {
      case 'config': {
        // 配置管理 (查看/编辑配置)
        const { runConfig } = await import('./commands/config');
        await runConfig(context);
        break;
      }
      case 'mcp': {
        // MCP 服务器管理
        const { runMCP } = await import('./commands/mcp');
        await runMCP(context);
        break;
      }
      case 'run': {
        // 运行自定义命令
        const { runRun } = await import('./commands/run');
        await runRun(context);
        break;
      }
      case 'commit': {
        // AI 辅助 Git 提交
        const { runCommit } = await import('./commands/commit');
        await runCommit(context);
        break;
      }
      case 'update': {
        // 检查和应用更新
        const { runUpdate } = await import('./commands/update');
        await runUpdate(context, opts.upgrade);
        break;
      }
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
    return;
  }

  // 显示帮助信息和版本号
  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }
  if (argv.version) {
    console.log(opts.version);
    return;
  }

  // 三. Quiet 安静模式 - 非交互式执行
  if (argv.quiet) {
    const context = await Context.create({
      cwd, // 工作目录
      ...contextCreateOpts,
    });

    // 触发插件的 initialized 钩子
    await context.apply({
      hook: 'initialized',
      args: [{ cwd, quiet: true }],
      type: PluginHookType.Series, // 串行执行插件钩子
    });

    // 执行安静模式逻辑
    await runQuiet(argv, context);
  } else {
    // 四. 交互模式 - 默认

    // 不升级的条件
    let upgrade = opts.upgrade;
    if (process.env.NEOVATE_SELF_UPDATE === 'none') {
      upgrade = undefined;
    }
    if (upgrade && !upgrade.installDir.includes('node_modules')) {
      upgrade = undefined;
    }
    if (
      upgrade?.version.includes('-beta.') ||
      upgrade?.version.includes('-alpha.') ||
      upgrade?.version.includes('-rc.') ||
      upgrade?.version.includes('-canary.')
    ) {
      upgrade = undefined;
    }

    // 执行交互模式
    await runInteractive(argv, contextCreateOpts, cwd, upgrade);
  }
}
