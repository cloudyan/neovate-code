import { Agent, Runner, type SystemMessageItem } from '@openai/agents';
import createDebug from 'debug';
import { At } from './at';
import { History, type OnMessage } from './history';
import type { NormalizedMessage, ToolUsePart } from './message';
import type { ModelInfo } from './model';
import type { ToolResult, Tools, ToolUse } from './tool';
import { Usage } from './usage';
import { parseMessage } from './utils/parse-message';
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

    // 创建 Runner 实例, 作为模型提供者的包装器
    const runner = new Runner({
      modelProvider: {
        getModel() {
          return opts.model.aisdk;
        },
      },
    });
    // Agent 实例, 配置了系统提示词和工具描述
    const agent = new Agent({
      name: 'code',
      model: opts.model.model.id, // 如: qwen-coder
      instructions: `
${opts.systemPrompt || ''}
${opts.tools.length() > 0 ? opts.tools.getToolsPrompt() : ''}
      `,
    });

    // 构建完整的输入上下文
    const llmsContexts = opts.llmsContexts || [];
    const llmsContextMessages = llmsContexts.map((llmsContext) => {
      return {
        role: 'system',
        content: llmsContext,
      } as SystemMessageItem;
    });
    // 包含: LLM 上下文消息 && 历史对话记录
    let agentInput = [...llmsContextMessages, ...history.toAgentInput()];
    if (shouldAtNormalize) {
      // add file and directory contents for the last user prompt
      agentInput = At.normalize({
        input: agentInput,
        cwd: opts.cwd,
      });
      shouldAtNormalize = false;
    }
    const requestId = randomUUID();

    // 执行 AI 调用
    const result = await runner.run(agent, agentInput, {
      stream: true, // 启用流式响应
      signal: abortController.signal, // 支持取消操作
    });

    let text = '';
    let textBuffer = '';
    let hasToolUse = false;

    // 采用事件流模式处理 AI 响应
    try {
      for await (const chunk of result.toStream()) {
        // 检查取消信号
        if (opts.signal?.aborted) {
          return createCancelError();
        }

        // Call onChunk for all chunks
        await opts.onChunk?.(chunk, requestId);

        if (
          chunk.type === 'raw_model_stream_event' &&
          chunk.data.type === 'model'
        ) {
          // 处理不同类型的事件
          switch (chunk.data.event.type) {
            case 'text-delta': {
              // 文本增量: 实时显示生成内容
              const textDelta = chunk.data.event.textDelta; // 当前单个文本增量
              textBuffer += textDelta; // 缓冲区中的完整累积文本
              text += textDelta;

              // XML 标签完整性检查，避免解析错误
              // Check if the current text has incomplete XML tags
              if (hasIncompleteXmlTag(text)) {
                continue; // 等待完整标签(文本会被累积到 textBuffer)
              }

              // If we have buffered content, process it
              if (textBuffer) {
                await pushTextDelta(textBuffer, text, opts.onTextDelta);
                textBuffer = '';
              } else {
                // TODO: why textBuffer is falsy ?
                await pushTextDelta(textDelta, text, opts.onTextDelta);
              }
              break;
            }
            case 'reasoning':
              // 推理过程: 展示 AI 思考过程
              await opts.onReasoning?.(chunk.data.event.textDelta);
              break;
            case 'finish':
              // 完成事件: 收集使用统计
              lastUsage = Usage.fromEventUsage(chunk.data.event.usage);
              totalUsage.add(lastUsage);
              break;
            default:
              // console.log('Unknown event:', chunk.data.event);
              break;
          }
        } else {
          // console.log('Unknown chunk:', chunk);
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

    // Handle any remaining buffered content
    // TODO: why have textBuffer here?
    if (textBuffer) {
      await pushTextDelta(textBuffer, text, opts.onTextDelta);
      textBuffer = '';
    }

    // Only accept one tool use per message
    // TODO: fix this...
    const parts = text.split('</use_tool>');
    if (parts.length > 2 && result.history.length > 0) {
      const lastEntry = result.history[result.history.length - 1];
      if (
        lastEntry.type === 'message' &&
        lastEntry.content &&
        lastEntry.content[0]
      ) {
        text = parts[0] + '</use_tool>';
        (lastEntry.content[0] as any).text = text;
      }
    }

    const parsed = parseMessage(text);
    if (parsed[0]?.type === 'text') {
      await opts.onText?.(parsed[0].content);
      finalText = parsed[0].content;
    }
    parsed.forEach((item) => {
      if (item.type === 'tool_use') {
        const callId = randomUUID();
        item.callId = callId;
      }
    });

    const endTime = new Date();
    opts.onTurn?.({
      usage: lastUsage,
      startTime,
      endTime,
    });
    const model = `${opts.model.provider.id}/${opts.model.model.id}`;
    await history.addMessage(
      {
        role: 'assistant',
        content: parsed.map((item) => {
          if (item.type === 'text') {
            return {
              type: 'text',
              text: item.content,
            };
          } else {
            const tool = opts.tools.get(item.name);
            const description = tool?.getDescription?.({
              params: item.params,
              cwd: opts.cwd,
            });
            const displayName = tool?.displayName;
            const toolUse: ToolUsePart = {
              type: 'tool_use',
              id: item.callId!,
              name: item.name,
              input: item.params,
            };
            if (description) {
              toolUse.description = description;
            }
            if (displayName) {
              toolUse.displayName = displayName;
            }
            return toolUse;
          }
        }),
        text,
        model,
        usage: {
          input_tokens: lastUsage.promptTokens,
          output_tokens: lastUsage.completionTokens,
        },
      },
      requestId,
    );

    // 查找工具调用
    let toolUse = parsed.find((item) => item.type === 'tool_use') as ToolUse;
    if (toolUse) {
      // 1. 工具使用前处理
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
        // 更新历史
        await history.addMessage({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              id: toolUse.callId,
              name: toolUse.name,
              input: toolUse.params,
              result: toolResult,
            },
          ],
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
        await history.addMessage({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              id: toolUse.callId,
              name: toolUse.name,
              input: toolUse.params,
              result: toolResult,
            },
          ],
        });
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
      hasToolUse = true;
    }
    if (!hasToolUse) {
      break;
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

// 定义不完整标签模式
const INCOMPLETE_PATTERNS = [
  '<use_tool',
  '<tool_name',
  '<arguments',
  '</use_tool',
  '</tool_name',
  '</arguments',
];

// 检查文本末尾是否存在未闭合的 XML 标签
function hasIncompleteXmlTag(text: string): boolean {
  // 截取末尾文本（15 个字符）
  text = text.slice(-15);

  // 多层次匹配检测
  for (const pattern of INCOMPLETE_PATTERNS) {
    // 1. 完全匹配：文本末尾完全匹配某个不完整模式
    if (text.endsWith(pattern)) {
      return true;
    }
    // 2. 前缀匹配：当文本比模式短时，检查是否为模式的开头部分
    if (text.length < pattern.length) {
      if (
        pattern.startsWith(text.slice(-Math.min(text.length, pattern.length)))
      ) {
        return true;
      }
    } else {
      // 3. 部分匹配：逐字符检查是否存在部分匹配
      const maxCheck = Math.min(pattern.length - 1, text.length);
      for (let i = 1; i <= maxCheck; i++) {
        if (text.slice(-i) === pattern.slice(0, i)) {
          return true;
        }
      }
    }
  }
  return false;
}

// 有条件地推送文本增量
// 只在特定条件下将文本片段推送给回调函数，避免推送不合适的文本内容
async function pushTextDelta(
  content: string, // 要推送的文本内容
  text: string, // 完整的当前文本
  onTextDelta?: (text: string) => Promise<void>, // 文本增量回调
): Promise<void> {
  const parsed = parseMessage(text);

  // 只有当解析结果为文本类型且标记为部分文本(流式输出中)时才推送
  if (parsed[0]?.type === 'text' && parsed[0].partial) {
    await onTextDelta?.(content);
  }
}
