import type { Context } from './context';
import { JsonlLogger } from './jsonl';
import { LlmsContext } from './llmsContext';
import { runLoop } from './loop';
import type { ImagePart, NormalizedMessage, UserContent } from './message';
import { resolveModelWithContext } from './model';
import { OutputFormat } from './outputFormat';
import { OutputStyleManager } from './outputStyle';
import { generatePlanSystemPrompt } from './planSystemPrompt';
import { PluginHookType } from './plugin';
import { Session, SessionConfigManager, type SessionId } from './session';
import { generateSystemPrompt } from './systemPrompt';
import type { ApprovalCategory, Tool, ToolUse } from './tool';
import { resolveTools, Tools } from './tool';
import type { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

export class Project {
  session: Session;
  context: Context;
  constructor(opts: { sessionId?: SessionId; context: Context }) {
    // 会话管理
    this.session = opts.sessionId
      ? Session.resume({
          id: opts.sessionId,
          logPath: opts.context.paths.getSessionLogPath(opts.sessionId),
        })
      : Session.create();
    this.context = opts.context;
  }

  // 消息发送
  async send(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onToolApprove?: (opts: { toolUse: ToolUse }) => Promise<boolean>;
      onTextDelta?: (text: string) => Promise<void>;
      onChunk?: (chunk: any, requestId: string) => Promise<void>;
      signal?: AbortSignal;
      attachments?: ImagePart[];
      parentUuid?: string;
    } = {},
  ) {
    // 解析可用的工具
    let tools = await resolveTools({
      context: this.context,
      sessionId: this.session.id,
      write: true,
      todo: true,
    });
    tools = await this.context.apply({
      hook: 'tool',
      args: [{ sessionId: this.session.id }],
      memo: tools,
      type: PluginHookType.SeriesMerge,
    });
    const outputStyleManager = await OutputStyleManager.create(this.context);
    const outputStyle = outputStyleManager.getOutputStyle(
      this.context.config.outputStyle,
      this.context.cwd,
    );

    // 生成系统提示词
    let systemPrompt = generateSystemPrompt({
      todo: this.context.config.todo!,
      productName: this.context.productName,
      language: this.context.config.language,
      outputStyle,
    });
    systemPrompt = await this.context.apply({
      hook: 'systemPrompt',
      args: [{ sessionId: this.session.id }],
      memo: systemPrompt,
      type: PluginHookType.SeriesLast,
    });

    // 调用核心发送逻辑
    return this.sendWithSystemPromptAndTools(message, {
      ...opts,
      tools,
      systemPrompt,
    });
  }

  // 规划模式
  async plan(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onTextDelta?: (text: string) => Promise<void>;
      onChunk?: (chunk: any, requestId: string) => Promise<void>;
      signal?: AbortSignal;
      attachments?: ImagePart[];
      parentUuid?: string;
    } = {},
  ) {
    // 解析只读工具
    let tools = await resolveTools({
      context: this.context,
      sessionId: this.session.id,
      write: false, // 禁止写操作
      todo: false, // 禁止 todo 操作
    });
    tools = await this.context.apply({
      hook: 'tool',
      args: [{ isPlan: true, sessionId: this.session.id }],
      memo: tools,
      type: PluginHookType.SeriesMerge,
    });

    // 生成规划专用系统提示词
    let systemPrompt = generatePlanSystemPrompt({
      todo: this.context.config.todo!,
      productName: this.context.productName,
      language: this.context.config.language,
    });
    systemPrompt = await this.context.apply({
      hook: 'systemPrompt',
      args: [{ isPlan: true, sessionId: this.session.id }],
      memo: systemPrompt,
      type: PluginHookType.SeriesLast,
    });

    // 调用核心发送逻辑
    return this.sendWithSystemPromptAndTools(message, {
      ...opts,
      model: opts.model || this.context.config.planModel,
      tools,
      systemPrompt,
      onToolApprove: () => Promise.resolve(true), // 自动批准所有工具
    });
  }

  // 核心发送逻辑
  private async sendWithSystemPromptAndTools(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onToolApprove?: (opts: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => Promise<boolean>;
      onTextDelta?: (text: string) => Promise<void>;
      onChunk?: (chunk: any, requestId: string) => Promise<void>;
      signal?: AbortSignal;
      tools?: Tool[];
      systemPrompt?: string;
      attachments?: ImagePart[];
      parentUuid?: string;
    } = {},
  ) {
    // 1. 初始化组件
    const startTime = new Date();
    const tools = opts.tools || [];
    const outputFormat = new OutputFormat({
      format: this.context.config.outputFormat!,
      quiet: this.context.config.quiet,
    });
    const jsonlLogger = new JsonlLogger({
      filePath: this.context.paths.getSessionLogPath(this.session.id),
    });

    // 2. 处理用户消息
    if (message !== null) {
      // 用户提示词钩子
      message = await this.context.apply({
        hook: 'userPrompt',
        memo: message,
        args: [
          {
            sessionId: this.session.id,
          },
        ],
        type: PluginHookType.SeriesLast,
      });
    }
    const model = (
      await resolveModelWithContext(opts.model || null, this.context)
    ).model!;
    const llmsContext = await LlmsContext.create({
      context: this.context,
      sessionId: this.session.id,
      userPrompt: message,
    });
    if (message !== null) {
      outputFormat.onInit({
        text: message,
        sessionId: this.session.id,
        tools,
        model,
        cwd: this.context.cwd,
      });
    }
    let userMessage: NormalizedMessage | null = null;
    if (message !== null) {
      const lastMessageUuid =
        opts.parentUuid ||
        this.session.history.messages[this.session.history.messages.length - 1]
          ?.uuid;

      let content: UserContent = message;
      if (opts.attachments?.length) {
        content = [
          {
            type: 'text' as const,
            text: message,
          },
          ...opts.attachments, // 处理附件（如图片）
        ];
      }

      // 构建标准化的用户消息对象
      userMessage = {
        parentUuid: lastMessageUuid || null, // 设置消息父子关系（用于消息链）
        uuid: randomUUID(),
        role: 'user',
        content,
        type: 'message',
        timestamp: new Date().toISOString(),
      };

      // 记录用户消息（将消息与会话 ID 关联）
      const userMessageWithSessionId = {
        ...userMessage,
        sessionId: this.session.id,
      };
      // 记录到 JSONL 日志文件中（用于会话恢复和历史查询）
      jsonlLogger.addMessage({
        message: userMessageWithSessionId,
      });

      // 通知监听者
      await opts.onMessage?.({
        message: userMessage,
      });
    }

    // 3. 构建消息历史上下文（根据 parentUuid 构建消息链，将用户消息添加到历史消息末尾）
    const historyMessages = opts.parentUuid
      ? this.session.history.getMessagesToUuid(opts.parentUuid)
      : this.session.history.messages;
    const input =
      historyMessages.length > 0
        ? [...historyMessages, userMessage]
        : [userMessage];
    const filteredInput = input.filter((message) => message !== null);
    const toolsManager = new Tools(tools);

    // 4. 执行 AI 交互循环
    const result = await runLoop({
      input: filteredInput, // 包含用户消息的历史上下文
      model,
      tools: toolsManager,
      cwd: this.context.cwd,
      systemPrompt: opts.systemPrompt,
      llmsContexts: llmsContext.messages,
      signal: opts.signal,
      autoCompact: this.context.config.autoCompact,
      onMessage: async (message) => {
        const normalizedMessage = {
          ...message,
          sessionId: this.session.id,
        };
        outputFormat.onMessage({
          message: normalizedMessage,
        });
        jsonlLogger.addMessage({
          message: normalizedMessage,
        });
        await opts.onMessage?.({
          message: normalizedMessage,
        });
      },
      onTextDelta: async (text) => {
        await opts.onTextDelta?.(text);
      },
      onChunk: async (chunk, requestId) => {
        await opts.onChunk?.(chunk, requestId);
      },
      onText: async (text) => {},
      onReasoning: async (text) => {},
      onToolUse: async (toolUse) => {
        // 工具使用钩子
        return await this.context.apply({
          hook: 'toolUse',
          args: [
            {
              sessionId: this.session.id,
            },
          ],
          memo: toolUse,
          type: PluginHookType.SeriesLast,
        });
      },
      onToolResult: async (toolUse, toolResult, approved) => {
        return await this.context.apply({
          hook: 'toolResult',
          args: [
            {
              toolUse,
              approved,
              sessionId: this.session.id,
            },
          ],
          memo: toolResult,
          type: PluginHookType.SeriesLast,
        });
      },
      onTurn: async (turn: {
        usage: Usage;
        startTime: Date;
        endTime: Date;
      }) => {
        await this.context.apply({
          hook: 'query',
          args: [
            {
              startTime: turn.startTime,
              endTime: turn.endTime,
              usage: turn.usage,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      // 工具审批逻辑
      onToolApprove: async (toolUse) => {
        // TODO: if quiet return true

        // ✅ 规则 1: YOLO 模式（全部自动批准）
        // 1. if yolo return true
        const approvalMode = this.context.config.approvalMode;
        if (approvalMode === 'yolo') {
          return true;
        }

        // 2. if category is read return true
        const tool = toolsManager.get(toolUse.name);
        if (!tool) {
          // ✅ 规则 2: 工具不存在（让 invoke 处理错误）
          // Let the tool invoke handle the `tool not found` error
          return true;
        }

        // ✅ 规则 3: 只读工具（自动批准）
        if (tool.approval?.category === 'read') {
          return true;
        }

        // ✅ 规则 4: 工具自定义审批逻辑
        // 3. run tool should approve if true return true
        const needsApproval = tool.approval?.needsApproval;
        if (needsApproval) {
          const needsApprovalResult = await needsApproval({
            toolName: toolUse.name,
            params: toolUse.params,
            approvalMode: this.context.config.approvalMode,
            context: this.context,
          });
          if (!needsApprovalResult) {
            return true; // 工具决定不需要审批
          }
        }

        // ✅ 规则 5: autoEdit 模式（写入工具自动批准）
        // 4. if category is edit check autoEdit config (including session config)
        const sessionConfigManager = new SessionConfigManager({
          logPath: this.context.paths.getSessionLogPath(this.session.id),
        });
        if (tool.approval?.category === 'write') {
          if (
            sessionConfigManager.config.approvalMode === 'autoEdit' ||
            approvalMode === 'autoEdit'
          ) {
            return true;
          }
        }

        // ✅ 规则 6: 会话级别的审批白名单
        // 5. check session config's approvalTools config
        if (sessionConfigManager.config.approvalTools.includes(toolUse.name)) {
          return true;
        }

        // ❓ 规则 7: 请求用户审批
        // 6. request user approval
        return (
          (await opts.onToolApprove?.({
            toolUse,
            category: tool.approval?.category,
          })) ?? false
        );
      },
    });
    const endTime = new Date();

    // 对话结束钩子
    await this.context.apply({
      hook: 'conversation',
      args: [
        {
          userPrompt: message,
          result,
          startTime,
          endTime,
          sessionId: this.session.id,
        },
      ],
      type: PluginHookType.Series,
    });
    outputFormat.onEnd({
      result,
      sessionId: this.session.id,
    });

    // 5. 更新会话历史
    if (result.success && result.data.history) {
      this.session.updateHistory(result.data.history);
    }
    return result;
  }
}
