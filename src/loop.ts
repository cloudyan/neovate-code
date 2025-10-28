import type {
  LanguageModelV2,
  LanguageModelV2Message,
  LanguageModelV2Prompt,
} from '@ai-sdk/provider';
import createDebug from 'debug';
import { At } from './at';
import { History, type OnMessage } from './history';
import type {
  AssistantContent,
  NormalizedMessage,
  ToolUsePart,
} from './message';
import type { ModelInfo } from './model';
import type { ToolResult, Tools, ToolUse } from './tool';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

const DEFAULT_MAX_TURNS = 50;

const debug = createDebug('neovate:loop');

export type LoopResult =
  | {
      success: true;
      data: Record<string, any>;
      metadata: {
        turnsCount: number; // 交互论数
        toolCallsCount: number; // 工具调用次数
        duration: number; // 执行时长
      };
    }
  | {
      success: false;
      error: {
        type: 'tool_denied' | 'max_turns_exceeded' | 'api_error' | 'canceled';
        message: string;
        details?: Record<string, any>;
      };
    };

type RunLoopOpts = {
  input: string | NormalizedMessage[]; // 用户输入消息
  model: ModelInfo; // AI 模型信息
  tools: Tools; // 工具管理器
  cwd: string; // 工作目录
  systemPrompt?: string; // 系统提示词
  maxTurns?: number; // 最大交互轮数限制（默认 50）
  signal?: AbortSignal; // 取消信号，用于中断操作
  llmsContexts?: string[]; // AI 上下文（来自 LlmsContext）
  autoCompact?: boolean; // 是否自动压缩历史消息
  onTextDelta?: (text: string) => Promise<void>; // 文本增量回调
  onText?: (text: string) => Promise<void>; // 完整文本回调
  onReasoning?: (text: string) => Promise<void>; // 推理过程回调
  onChunk?: (chunk: any, requestId: string) => Promise<void>; // 原始数据块处理回调，当接收到响应数据块时触发
  onToolUse?: (toolUse: ToolUse) => Promise<ToolUse>; // 工具使用前
  onToolResult?: (
    toolUse: ToolUse,
    toolResult: ToolResult,
    approved: boolean,
  ) => Promise<ToolResult>; // 工具结果处理回调
  onTurn?: (turn: {
    usage: Usage;
    startTime: Date;
    endTime: Date;
  }) => Promise<void>; // 每轮交互结束回调，包含用量统计
  onToolApprove?: (toolUse: ToolUse) => Promise<boolean>; // 工具审批回调，当需要审批工具调用时触发，返回是否批准
  onMessage?: OnMessage; // 消息处理回调，当 AI 生成新消息时触发
};

// 核心函数，实现了一个完整的 AI 交互循环
// TODO: support retry
export async function runLoop(opts: RunLoopOpts): Promise<LoopResult> {
  // 1. 初始化阶段
  const startTime = Date.now();
  let turnsCount = 0;
  let toolCallsCount = 0;
  let finalText = '';
  let lastUsage = Usage.empty();
  const totalUsage = Usage.empty(); // 用量统计

  // 创建消息历史管理器
  const history = new History({
    messages: Array.isArray(opts.input)
      ? opts.input
      : [
          {
            role: 'user',
            content: opts.input,
            type: 'message',
            timestamp: new Date().toISOString(),
            uuid: randomUUID(),
            parentUuid: null,
          },
        ],
    onMessage: opts.onMessage,
  });

  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  const abortController = new AbortController();

  const createCancelError = (): LoopResult => ({
    success: false,
    error: {
      type: 'canceled',
      message: 'Operation was canceled',
      details: { turnsCount, history, usage: totalUsage },
    },
  });

  let shouldAtNormalize = true;

  // 主循环逻辑
  while (true) {
    // 检查取消信号
    // Must use separate abortController to prevent ReadStream locking
    if (opts.signal?.aborted && !abortController.signal.aborted) {
      abortController.abort();
      return createCancelError();
    }

    const startTime = new Date();
    turnsCount++;

    // 检查最大轮数限制
    if (turnsCount > maxTurns) {
      return {
        success: false,
        error: {
          type: 'max_turns_exceeded',
          message: `Maximum turns (${maxTurns}) exceeded`,
          details: {
            turnsCount,
            history,
            usage: totalUsage,
          },
        },
      };
    }

    // compress 自动压缩历史消息（如果启用）
    if (opts.autoCompact) {
      const compressed = await history.compress(opts.model);
      if (compressed.compressed) {
        debug('history compressed', compressed);
      }
    }
    lastUsage.reset();

    const systemPromptMessage = {
      role: 'system',
      content: opts.systemPrompt || '',
    } as LanguageModelV2Message;
    const llmsContexts = opts.llmsContexts || [];
    const llmsContextMessages = llmsContexts.map((llmsContext) => {
      return {
        role: 'system',
        content: llmsContext,
      } as LanguageModelV2Message;
    });
    let prompt: LanguageModelV2Prompt = [
      systemPromptMessage,
      ...llmsContextMessages,
      ...history.toLanguageV2Messages(),
    ];

    if (shouldAtNormalize) {
      // add file and directory contents for the last user prompt
      prompt = At.normalizeLanguageV2Prompt({
        input: prompt,
        cwd: opts.cwd,
      });
      shouldAtNormalize = false;
    }
    const requestId = randomUUID();
    const m: LanguageModelV2 = opts.model.m;
    const result = await m.doStream({
      prompt: prompt,
      tools: opts.tools.toLanguageV2Tools(),
      abortSignal: abortController.signal,
    });

    let text = '';
    let reasoning = '';

    const toolCalls: Array<{
      toolCallId: string;
      toolName: string;
      input: string;
    }> = [];

    // 采用事件流模式处理 AI 响应
    try {
      for await (const chunk of result.stream) {
        if (opts.signal?.aborted) {
          return createCancelError();
        }

        // Call onChunk for all chunks
        await opts.onChunk?.(chunk, requestId);

        switch (chunk.type) {
          case 'text-delta': {
            const textDelta = chunk.delta;
            text += textDelta;
            await opts.onTextDelta?.(textDelta);
            break;
          }
          case 'reasoning-delta':
            reasoning += chunk.delta;
            break;
          case 'tool-call':
            toolCalls.push({
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              input: chunk.input,
            });
            break;
          case 'finish':
            lastUsage = Usage.fromEventUsage(chunk.usage);
            totalUsage.add(lastUsage);
            break;
          default:
            // console.log('Unknown event:', chunk.data.event);
            break;
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'api_error',
          message:
            error instanceof Error ? error.message : 'Unknown streaming error',
          details: {
            code: error.data?.error?.code,
            status: error.data?.error?.status,
            url: error.url,
            error,
            stack: error.stack,
          },
        },
      };
    }

    // Exit early if cancellation signal is received
    if (opts.signal?.aborted) {
      return createCancelError();
    }

    await opts.onText?.(text);
    if (reasoning) {
      await opts.onReasoning?.(reasoning);
    }

    const endTime = new Date();
    opts.onTurn?.({
      usage: lastUsage, // 本轮用量数据
      startTime,
      endTime,
    });
    const model = `${opts.model.provider.id}/${opts.model.model.id}`;
    const assistantContent: AssistantContent = [];
    if (reasoning) {
      assistantContent.push({
        type: 'reasoning',
        text: reasoning,
      });
    }
    if (text) {
      finalText = text;
      assistantContent.push({
        type: 'text',
        text: text,
      });
    }
    for (const toolCall of toolCalls) {
      const tool = opts.tools.get(toolCall.toolName);
      const input = JSON.parse(toolCall.input);
      const description = tool?.getDescription?.({
        params: input,
        cwd: opts.cwd,
      });
      const displayName = tool?.displayName;
      const toolUse: ToolUsePart = {
        type: 'tool_use',
        id: toolCall.toolCallId,
        name: toolCall.toolName,
        input: input,
      };
      if (description) {
        toolUse.description = description;
      }
      if (displayName) {
        toolUse.displayName = displayName;
      }
      assistantContent.push(toolUse);
    }
    await history.addMessage(
      {
        role: 'assistant',
        content: assistantContent,
        text,
        model,
        usage: {
          input_tokens: lastUsage.promptTokens,
          output_tokens: lastUsage.completionTokens,
        },
      },
      requestId,
    );
    if (!toolCalls.length) {
      break;
    }

    const toolResults: any[] = [];
    for (const toolCall of toolCalls) {
      let toolUse: ToolUse = {
        name: toolCall.toolName,
        params: JSON.parse(toolCall.input),
        callId: toolCall.toolCallId,
      };
      if (opts.onToolUse) {
        toolUse = await opts.onToolUse(toolUse as ToolUse);
      }
      // 2. 工具审批
      const approved = opts.onToolApprove
        ? await opts.onToolApprove(toolUse as ToolUse)
        : true;
      if (approved) {
        toolCallsCount++;
        let toolResult = await opts.tools.invoke(
          toolUse.name,
          JSON.stringify(toolUse.params),
        );
        // 3. 工具结果处理
        if (opts.onToolResult) {
          toolResult = await opts.onToolResult(toolUse, toolResult, approved);
        }
        toolResults.push({
          toolCallId: toolUse.callId,
          toolName: toolUse.name,
          input: toolUse.params,
          result: toolResult,
        });
        // Prevent normal turns from being terminated due to exceeding the limit
        turnsCount--;
      } else {
        // 5. 拒绝使用工具
        const message = 'Error: Tool execution was denied by user.';
        let toolResult: ToolResult = {
          llmContent: message,
          isError: true,
        };
        if (opts.onToolResult) {
          toolResult = await opts.onToolResult(toolUse, toolResult, approved);
        }
        toolResults.push({
          toolCallId: toolUse.callId,
          toolName: toolUse.name,
          input: toolUse.params,
          result: toolResult,
        });
        await history.addMessage({
          role: 'tool',
          content: toolResults.map((tr) => {
            return {
              type: 'tool-result',
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              input: tr.input,
              result: tr.result,
            };
          }),
        } as any);
        return {
          success: false,
          error: {
            type: 'tool_denied',
            message,
            details: {
              toolUse,
              history,
              usage: totalUsage,
            },
          },
        };
      }
    }
    if (toolResults.length) {
      await history.addMessage({
        role: 'tool',
        content: toolResults.map((tr) => {
          return {
            type: 'tool-result',
            toolCallId: tr.toolCallId,
            toolName: tr.toolName,
            input: tr.input,
            result: tr.result,
          };
        }),
      } as any);
    }
  }
  const duration = Date.now() - startTime;
  return {
    success: true,
    data: {
      text: finalText,
      history,
      usage: totalUsage,
    },
    metadata: {
      turnsCount,
      toolCallsCount,
      duration,
    },
  };
}
