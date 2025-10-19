import assert from 'assert';
import type { Context } from './context';
import { runLoop } from './loop';
import type { NormalizedMessage } from './message';
import { type ModelInfo, resolveModelWithContext } from './model';
import { Tools } from './tool';
import { randomUUID } from './utils/randomUUID';

/**
 * 简化版的AI查询函数，用于执行不涉及工具调用的纯文本对话
 * 这是Project类中完整功能的简化版本，去除了工具解析、审批流程等复杂逻辑。
 *
 * 适用场景：
 * - 纯文本对话，不需要文件系统操作
 * - Git提交信息生成和分支命名 commit.ts
 * - 对话历史压缩 compact.ts
 * - 轻量级AI集成，快速原型开发
 * - 内部组件中需要AI能力但不涉及工具调用的场景
 *
 * 不适用场景：
 * - 需要文件读写操作的任务
 * - 需要执行系统命令的任务
 * - 需要工具审批的安全敏感操作
 *
 * @param opts - 查询选项
 * @param opts.userPrompt - 用户输入的提示词
 * @param opts.messages - 历史消息数组，可选
 * @param opts.context - 上下文对象，用于解析模型配置，可选
 * @param opts.model - 模型信息，如果未提供则从上下文解析
 * @param opts.systemPrompt - 系统提示词，可选
 * @param opts.onMessage - 消息回调函数，当AI生成消息时调用
 *
 * @returns 返回AI响应的结果
 *
 * @example
 * ```typescript
 * const result = await query({
 *   userPrompt: 'Hello, how are you?',
 *   context: myContext,
 *   onMessage: (message) => console.log(message.content)
 * });
 * ```
 */
export async function query(opts: {
  userPrompt: string;
  messages?: NormalizedMessage[];
  context?: Context;
  model?: ModelInfo;
  systemPrompt?: string;
  onMessage?: (message: NormalizedMessage) => Promise<void>;
}) {
  const messages: NormalizedMessage[] = [
    ...(opts.messages || []),
    {
      role: 'user',
      content: opts.userPrompt,
      type: 'message',
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
      parentUuid: null,
    },
  ];
  assert(opts.model || opts.context, 'model or context is required');
  const model =
    opts.model || (await resolveModelWithContext(null, opts.context!)).model!;
  return await runLoop({
    input: messages,
    model,
    tools: new Tools([]),
    cwd: '',
    systemPrompt: opts.systemPrompt || '',
    onMessage: async (message) => {
      await opts.onMessage?.(message);
    },
    autoCompact: false,
  });
}
