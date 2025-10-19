import type { AssistantMessage } from './message';

/**
 * AI模型用量数据接口
 * 来自@openai/agents库的StreamEventResponseCompleted事件中的usage字段
 */
interface ModelUsageData {
  promptTokens: number; // 输入token数量（用户发送给模型的提示词）
  completionTokens: number; // 输出token数量（模型生成的回复）
  [key: string]: any; // 可能存在的其他字段
}

/**
 * 用量统计类，用于跟踪AI模型的token使用情况
 * 包括提示词token、完成token和总token数量
 *
 * 核心工作流程：
 * 1. 初始化: 创建空的用量统计对象 Usage.empty()
 * 2. 数据收集：从AI模型的finish事件中提取用量数据 Usage.fromEventUsage
 * 2. 数据传播：通过onTurn回调和插件钩子传播用量信息
 * 3. 数据存储：将用量信息保存到助手消息记录中
 * 4. 数据应用：用于历史压缩决策和会话级别的用量跟踪
 */
export class Usage {
  /* 提示词token数量 - 用户输入和系统提示词消耗的token */
  promptTokens: number;
  /* 完成token数量 - AI模型生成响应消耗的token */
  completionTokens: number;
  /* 总token数量 - 提示词和完成token的总和 */
  totalTokens: number;

  /**
   * 创建用量统计实例
   * @param init - 初始化选项
   * @param init.promptTokens - 提示词token数量
   * @param init.completionTokens - 完成token数量
   * @param init.totalTokens - 总token数量
   */
  constructor(init?: Partial<Usage>) {
    this.promptTokens = init?.promptTokens ?? 0;
    this.completionTokens = init?.completionTokens ?? 0;
    this.totalTokens = init?.totalTokens ?? 0;
  }

  /**
   * 创建空的用量统计实例
   * @returns 空的用量统计实例
   */
  static empty(): Usage {
    return new Usage();
  }

  /**
   * 从事件用量数据创建用量统计实例
   * 通常在AI模型完成生成时，从finish事件中提取用量数据
   * 这是数据收集阶段的核心方法
   *
   * 设计原因：
   * 1. 不可变性：每次返回新实例避免修改原始事件数据
   * 2. 数据清洗：处理可能的NaN值并确保数据一致性
   * 3. 格式转换：将AI SDK的原始数据转换为内部统一格式
   *
   * @param eventUsage - 事件用量数据 ModelUsageData
   * @returns 用量统计实例
   */
  static fromEventUsage(eventUsage: ModelUsageData | any): Usage {
    const promptTokens = Number.isNaN(eventUsage?.promptTokens)
      ? 0
      : (eventUsage?.promptTokens ?? 0);
    const completionTokens = Number.isNaN(eventUsage?.completionTokens)
      ? 0
      : (eventUsage?.completionTokens ?? 0);
    const totalTokens = promptTokens + completionTokens;

    // 返回新的用量统计实例，遵循不可变性设计原则
    return new Usage({
      promptTokens,
      completionTokens,
      totalTokens,
    });
  }

  /**
   * 从助手消息创建用量统计实例
   * 用于历史压缩决策，从最后一条助手消息中提取用量数据
   * 这是数据应用阶段的核心方法
   * @param message - 助手消息
   * @returns 用量统计实例
   */
  static fromAssistantMessage(message: AssistantMessage): Usage {
    return new Usage({
      promptTokens: message.usage?.input_tokens,
      completionTokens: message.usage?.output_tokens,
      totalTokens: message.usage?.input_tokens + message.usage?.output_tokens,
    });
  }

  /**
   * 将另一个用量统计添加到当前实例
   * 用于累加每轮交互的用量数据到总用量中
   * 这是数据累积阶段的核心方法
   * @param other - 要添加的用量统计
   */
  add(other: Usage): void {
    this.promptTokens += other.promptTokens;
    this.completionTokens += other.completionTokens;
    this.totalTokens += other.totalTokens;
  }

  /**
   * 重置用量统计为0
   */
  reset(): void {
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.totalTokens = 0;
  }

  /**
   * 克隆当前用量统计实例
   * @returns 新的用量统计实例
   */
  clone(): Usage {
    return new Usage({
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
    });
  }

  /**
   * 检查用量统计是否有效
   * @returns 如果所有token数量都大于等于0则返回true
   */
  isValid(): boolean {
    return (
      this.promptTokens >= 0 &&
      this.completionTokens >= 0 &&
      this.totalTokens >= 0
    );
  }
}
