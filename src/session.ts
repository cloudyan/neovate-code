import fs from 'fs';
import path from 'pathe';
import type { ApprovalMode } from './config';
import { History } from './history';
import type { NormalizedMessage } from './message';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

export type SessionId = string;

/**
 * 会话类，用于管理Neovate的会话状态
 * 负责会话的创建、恢复和状态管理
 */
export class Session {
  id: SessionId; // 会话唯一标识符
  usage: Usage; // 会话使用统计
  history: History; // 会话消息历史

  /**
   * 创建会话实例
   * @param opts - 会话选项
   * @param opts.id - 会话ID
   * @param opts.history - 消息历史，可选
   */
  constructor(opts: { id: SessionId; history?: History }) {
    this.id = opts.id;
    this.usage = Usage.empty();
    this.history = opts.history || new History({ messages: [] });
  }

  /**
   * 更新会话历史
   * @param history - 新的历史记录
   */
  updateHistory(history: History) {
    this.history = history;
  }

  /**
   * 创建新会话
   * @returns 新的会话实例
   */
  static create() {
    return new Session({
      id: Session.createSessionId(),
    });
  }

  /**
   * 创建会话ID
   * @returns 8位随机UUID作为会话ID
   */
  static createSessionId() {
    return randomUUID().slice(0, 8);
  }

  /**
   * 从日志文件恢复会话
   * @param opts - 恢复选项
   * @param opts.id - 会话ID
   * @param opts.logPath - 日志文件路径
   * @returns 恢复的会话实例
   */
  static resume(opts: { id: SessionId; logPath: string }) {
    const messages = loadSessionMessages({ logPath: opts.logPath });
    const history = new History({
      messages,
    });
    return new Session({
      id: opts.id,
      history,
    });
  }
}

export type SessionConfig = {
  approvalMode?: ApprovalMode;
  approvalTools: string[];
  summary?: string;
  pastedTextMap?: Record<string, string>;
  pastedImageMap?: Record<string, string>;
};

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  approvalMode: 'default',
  approvalTools: [],
  pastedTextMap: {},
  pastedImageMap: {},
};

/**
 * 会话配置管理器，用于管理会话级别的配置
 * 包括审批模式、工具白名单等会话特定设置
 */
export class SessionConfigManager {
  logPath: string; // 日志文件路径
  config: SessionConfig; // 会话配置

  /**
   * 创建会话配置管理器实例
   * @param opts - 配置选项
   * @param opts.logPath - 日志文件路径
   */
  constructor(opts: { logPath: string }) {
    this.logPath = opts.logPath;
    this.config = this.load(opts.logPath);
  }

  /**
   * 从日志文件加载会话配置
   * @param logPath - 日志文件路径
   * @returns 会话配置
   */
  load(logPath: string): SessionConfig {
    if (!fs.existsSync(logPath)) {
      return DEFAULT_SESSION_CONFIG;
    }
    try {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'config') {
            return parsed.config;
          }
        } catch {}
      }
      return DEFAULT_SESSION_CONFIG;
    } catch {
      return DEFAULT_SESSION_CONFIG;
    }
  }

  /**
   * 将会话配置写入日志文件
   * 会将会话配置保存为JSONL格式，type为'config'
   */
  write() {
    // TODO: add write lock
    const configLine = JSON.stringify({ type: 'config', config: this.config });
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.writeFileSync(this.logPath, configLine + '\n', 'utf-8');
      return;
    }
    try {
      const content = fs.readFileSync(this.logPath, 'utf-8');
      const lines = content.split('\n');
      const filteredLines = lines.filter((line) => {
        if (!line) return false;
        try {
          const parsed = JSON.parse(line);
          return parsed.type !== 'config';
        } catch {
          return true;
        }
      });
      const newContent = [configLine, ...filteredLines].join('\n');
      fs.writeFileSync(this.logPath, newContent + '\n', 'utf-8');
    } catch (e: any) {
      throw new Error(
        `Failed to write config to log file: ${this.logPath}: ${e.message}`,
      );
    }
  }
}

// 过滤消息，只保留当前活动路径上的消息
export function filterMessages(
  messages: NormalizedMessage[],
): NormalizedMessage[] {
  // Filter to message types only
  const messageTypeOnly = messages.filter((message) => {
    const isMessage = message.type === 'message';
    return isMessage;
  });

  if (messageTypeOnly.length === 0) {
    return [];
  }

  // Create a map for O(1) uuid lookups
  const messageMap = new Map<string, NormalizedMessage>();
  for (const message of messageTypeOnly) {
    messageMap.set(message.uuid, message);
  }

  // Start from the last message and walk backward to build the active path
  const activePath = new Set<string>();
  let currentMessage = messageTypeOnly[messageTypeOnly.length - 1];

  while (currentMessage) {
    activePath.add(currentMessage.uuid);
    // Stop if we reached the root (null parent)
    if (currentMessage.parentUuid === null) {
      break;
    }
    // Move to parent if it exists
    const parentMessage = messageMap.get(currentMessage.parentUuid);
    if (!parentMessage) {
      // Parent doesn't exist, stop traversal
      break;
    }
    currentMessage = parentMessage;
  }

  // Filter original messages to only include those in the active path
  return messageTypeOnly.filter((message) => activePath.has(message.uuid));
}

// 从日志文件加载会话消息
export function loadSessionMessages(opts: {
  logPath: string;
}): NormalizedMessage[] {
  if (!fs.existsSync(opts.logPath)) {
    return [];
  }
  const content = fs.readFileSync(opts.logPath, 'utf-8');
  const messages = content
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (e: any) {
        throw new Error(
          `Failed to parse line ${index + 1} of log file: ${opts.logPath}: ${
            e.message
          }`,
        );
      }
    });
  return filterMessages(messages);
}
