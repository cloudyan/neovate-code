import type {
  LanguageModelV2,
  LanguageModelV2FunctionTool,
  LanguageModelV2Message,
  LanguageModelV2Prompt,
  SharedV2Headers,
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
import { addPromptCache } from './promptCache';
import { getThinkingConfig } from './thinking-config';
import type { ToolResult, Tools, ToolUse } from './tool';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';
import { safeParseJson } from './utils/safeParseJson';

const DEFAULT_MAX_TURNS = 50;
const DEFAULT_ERROR_RETRY_TURNS = 10;

const debug = createDebug('neovate:loop');

async function exponentialBackoffWithCancellation(
  attempt: number,
  signal?: AbortSignal,
): Promise<void> {
  const baseDelay = 1000;
  const delay = baseDelay * Math.pow(2, attempt - 1);
  const checkInterval = 100;

  const startTime = Date.now();
  while (Date.now() - startTime < delay) {
    if (signal?.aborted) {
      throw new Error('Cancelled during retry backoff');
    }
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.min(checkInterval, delay - (Date.now() - startTime)),
      ),
    );
  }
}

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

type StreamResultBase = {
  requestId: string;
  prompt: LanguageModelV2Prompt;
  model: ModelInfo;
  tools: LanguageModelV2FunctionTool[];
};
export type StreamResult = StreamResultBase & {
  request?: {
    body?: unknown;
  };
  response?: {
    headers?: SharedV2Headers;
    statusCode?: number;
    body?: unknown;
  };
  error?: any;
};

type RunLoopOpts = {
  input: string | NormalizedMessage[]; // 用户输入消息
  model: ModelInfo; // AI 模型信息
  tools: Tools; // 工具管理器
  cwd: string; // 工作目录
  systemPrompt?: string; // 系统提示词
  maxTurns?: number; // 最大交互轮数限制（默认 50）
  errorRetryTurns?: number;
  signal?: AbortSignal; // 取消信号，用于中断操作
  llmsContexts?: string[]; // AI 上下文（来自 LlmsContext）
  autoCompact?: boolean; // 是否自动压缩历史消息
  thinking?: {
    effort: 'low' | 'medium' | 'high';
  };
  temperature?: number;
  onTextDelta?: (text: string) => Promise<void>; // 文本增量回调
  onText?: (text: string) => Promise<void>; // 完整文本回调
  onReasoning?: (text: string) => Promise<void>; // 推理过程回调
  onStreamResult?: (result: StreamResult) => Promise<void>;
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
  let shouldThinking = true;

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

    prompt = addPromptCache(prompt, opts.model);

    let text = '';
    let reasoning = '';
    const toolCalls: Array<{
      toolCallId: string;
      toolName: string;
      input: string;
    }> = [];

    const requestId = randomUUID();
    const m: LanguageModelV2 = opts.model.m;
    const tools = opts.tools.toLanguageV2Tools();

    // Get thinking config based on model's reasoning capability
    let thinkingConfig: Record<string, any> | undefined = undefined;
    if (shouldThinking && opts.thinking) {
      thinkingConfig = getThinkingConfig(opts.model, opts.thinking.effort);
      shouldThinking = false;
    }

    let retryCount = 0;
    const errorRetryTurns = opts.errorRetryTurns ?? DEFAULT_ERROR_RETRY_TURNS;

    while (retryCount <= errorRetryTurns) {
      if (opts.signal?.aborted) {
        return createCancelError();
      }

      try {
        const result = await m.doStream({
          prompt: prompt,
          tools,
          toolChoice: { type: 'auto' },
          abortSignal: abortController.signal,
          ...thinkingConfig,
          ...(opts.temperature !== undefined && {
            temperature: opts.temperature,
          }),
        });
        opts.onStreamResult?.({
          requestId,
          prompt,
          model: opts.model,
          tools,
          request: result.request,
          response: result.response,
        });

        for await (const chunk of result.stream) {
          if (opts.signal?.aborted) {
            return createCancelError();
          }
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
              if (toolCalls.length === 0 && text.trim() === '') {
                const error = new Error(
                  'Empty response: no text or tool calls received',
                );
                (error as any).isRetryable = true;
                throw error;
              }
              break;
            case 'error': {
              const message = (() => {
                if ((chunk as any).error.message) {
                  return (chunk as any).error.message;
                }
                try {
                  const message = JSON.parse(
                    (chunk as any).error.value?.details,
                  )?.error?.message;
                  if (message) {
                    return message;
                  }
                } catch (_e) {}
                return JSON.stringify(chunk.error);
              })();
              const error = new Error(message);
              (error as any).isRetryable = false;
              const value = (chunk.error as any).value;
              if (value) {
                (error as any).statusCode = value?.status;
              }
              throw error;
            }
            default:
              break;
          }
        }

        break;
      } catch (error: any) {
        opts.onStreamResult?.({
          requestId,
          prompt,
          model: opts.model,
          tools,
          response: {
            statusCode: error.statusCode,
            headers: error.responseHeaders,
            body: error.responseBody,
          },
          error: {
            data: error.data || error.message,
            isRetryable: error.isRetryable,
            retryAttempt: retryCount,
            maxRetries: errorRetryTurns,
          },
        });

        if (error.isRetryable && retryCount < errorRetryTurns) {
          retryCount++;
          try {
            await exponentialBackoffWithCancellation(retryCount, opts.signal);
          } catch {
            return createCancelError();
          }
          continue;
        }

        return {
          success: false,
          error: {
            type: 'api_error',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown streaming error',
            details: {
              code: error.data?.error?.code,
              status: error.data?.error?.status,
              url: error.url,
              error,
              stack: error.stack,
              retriesAttempted: retryCount,
            },
          },
        };
      }
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
      // compatible with models that may return an empty value instead of a JSON string for input
      const input = safeParseJson(toolCall.input);
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
        params: safeParseJson(toolCall.input),
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
