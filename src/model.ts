import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import {
  createOpenRouter,
  type LanguageModelV1,
} from '@openrouter/ai-sdk-provider';
import assert from 'assert';
import defu from 'defu';
import path from 'path';
import type { ProviderConfig } from './config';
import type { Context } from './context';
import { PluginHookType } from './plugin';
import { GithubProvider } from './providers/githubCopilot';
import type { AiSdkModel } from './utils/ai-sdk';
import { aisdk } from './utils/ai-sdk';

export interface ModelModalities {
  input: ('text' | 'image' | 'audio' | 'video' | 'pdf')[];
  output: ('text' | 'audio' | 'image')[];
}

interface ModelCost {
  input: number; // 输入令牌成本(每百万令牌)
  output: number;
  cache_read?: number; // 缓存读取成本(每百万令牌，可选)
  cache_write?: number;
}

interface ModelLimit {
  context: number; // 上下文窗口大小(令牌数)
  output: number; // 最大输出长度(令牌数)
}

// 模型能力标签枚举，用于描述模型适用场景
export type ModelCapability =
  // | 'reasoning' // 推理能力 // 使用 reasoning 字段
  // | 'long_context' // 长上下文处理, 根据 limit 判断即可
  | 'fast' // 快速响应
  | 'coding' // 编程能力
  | 'chat' // 对话能力
  | 'creative' // 创造性任务
  | 'precise' // 精确性任务
  | 'multimodal' // 多模态处理
  | 'low_cost' // 低成本
  | 'high_performance'; // 高性能

export interface Model {
  id: string; // 模型唯一标识符
  name: string; // 模型显示名称
  shortName?: string; // 模型短名称(可选)
  attachment: boolean; // 是否支持附件(如图片、文件等) for GPT-4o, Gemini
  reasoning: boolean; // 是否支持推理模式 for o3, DeepSeek-R1
  temperature: boolean; // 是否支持温度参数调节
  tool_call: boolean; // 是否支持工具调用
  knowledge: string; // 模型知识截止日期
  release_date: string; // 模型发布日期
  last_updated: string; // 模型最后更新日期
  modalities: ModelModalities; // 模型支持的输入/输出模态
  open_weights: boolean; // 是否使用开源权重
  cost: ModelCost; // 模型使用成本
  limit: ModelLimit; // 模型限制(上下文长度、输出长度等)
  capabilities?: ModelCapability[]; // 模型能力标签
}

export interface Provider {
  id: string; // 提供商唯一标识符
  env: string[]; // 必需的环境变量列表
  name: string; // 提供商显示名称
  apiEnv?: string[]; // API 地址环境变量(可选)
  api?: string; // 默认 API 地址
  doc: string; // 提供商文档链接
  models: Record<string, string | Omit<Model, 'id' | 'cost'>>; // 支持的模型列表
  // 创建模型实例的函数
  createModel(
    name: string,
    provider: Provider,
    globalConfigDir: string,
  ): Promise<LanguageModelV1> | LanguageModelV1;
  // 额外配置选项
  options?: {
    baseURL?: string; // 基础 API 地址
    apiKey?: string; // API 密钥
    headers?: Record<string, string>; // 请求头部
  };
}

export type ProvidersMap = Record<string, Provider>;
export type ModelMap = Record<string, Omit<Model, 'id' | 'cost'>>;

// 预定义的所有模型映射表
export const models: ModelMap = {
  'deepseek-v3-0324': {
    name: 'DeepSeek-V3-0324',
    shortName: 'DeepSeek V3',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-06',
    release_date: '2025-03-24',
    last_updated: '2025-03-24',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 128000, output: 8192 },
    capabilities: ['coding', 'high_performance'],
  },
  'deepseek-v3-1': {
    name: 'DeepSeek V3.1',
    shortName: 'DeepSeek V3.1',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-07',
    release_date: '2025-08-21',
    last_updated: '2025-08-21',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 163840, output: 163840 },
    capabilities: ['coding', 'high_performance'],
  },
  'deepseek-v3-1-terminus': {
    name: 'DeepSeek V3.1 Terminus',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-07',
    release_date: '2025-09-22',
    last_updated: '2025-09-22',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 65536 },
    capabilities: ['coding'],
  },
  'deepseek-v3-2-exp': {
    name: 'DeepSeek V3.2 Exp',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09',
    release_date: '2025-09-29',
    last_updated: '2025-09-29',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 65536 },
    capabilities: ['coding'],
  },
  'deepseek-r1-0528': {
    name: 'DeepSeek-R1-0528',
    shortName: 'DeepSeek R1',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-06',
    release_date: '2025-05-28',
    last_updated: '2025-05-28',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 65536, output: 8192 },
    capabilities: ['coding', 'high_performance'],
  },
  'doubao-seed-1.6': {
    name: 'Doubao Seed 1.6',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-06-11',
    last_updated: '2025-09-23',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: true,
    limit: { context: 163840, output: 163840 },
    capabilities: ['creative', 'multimodal'],
  },
  'kimi-k2': {
    name: 'Kimi K2',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10',
    release_date: '2025-07-11',
    last_updated: '2025-07-11',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 16384 },
    capabilities: ['chat', 'fast'],
  },
  'kimi-k2-turbo-preview': {
    name: 'Kimi K2 Turbo',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10',
    release_date: '2025-07-14',
    last_updated: '2025-07-14',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 16384 },
    capabilities: ['chat', 'fast'],
  },
  'kimi-k2-0905': {
    name: 'Kimi K2 Instruct 0905',
    shortName: 'Kimi K2 0905',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10',
    release_date: '2025-09-05',
    last_updated: '2025-09-05',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 16384 },
    capabilities: ['chat'],
  },
  'qwen3-coder-480b-a35b-instruct': {
    name: 'Qwen3 Coder 480B A35B Instruct',
    shortName: 'Qwen3 Coder',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-07-23',
    last_updated: '2025-07-23',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 66536 },
    capabilities: ['coding'],
  },
  'qwen3-235b-a22b-07-25': {
    name: 'Qwen3 235B A22B Instruct 2507',
    shortName: 'Qwen3',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-04-28',
    last_updated: '2025-07-21',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 131072 },
    capabilities: ['chat'],
  },
  'qwen3-max': {
    name: 'Qwen3 Max',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09',
    release_date: '2025-09-05',
    last_updated: '2025-09-05',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 262144, output: 32768 },
    capabilities: [],
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-03-20',
    last_updated: '2025-06-05',
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 1048576, output: 65536 },
    capabilities: ['multimodal', 'fast'],
  },
  'gemini-2.5-flash-preview-09-2025': {
    name: 'Gemini 2.5 Flash Preview 2025 09',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-09-25',
    last_updated: '2025-09-25',
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 1048576, output: 65536 },
    capabilities: ['multimodal', 'fast'],
  },
  'gemini-2.5-flash-lite-preview-06-17': {
    name: 'Gemini 2.5 Flash Lite Preview 06-17',
    shortName: 'Gemini 2.5 Flash Lite',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-06-17',
    last_updated: '2025-06-17',
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 65536, output: 65536 },
    capabilities: ['multimodal', 'fast', 'low_cost'],
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-03-20',
    last_updated: '2025-06-05',
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 1048576, output: 65536 },
    capabilities: ['multimodal', 'high_performance'],
  },
  'grok-4': {
    name: 'Grok 4',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-07',
    release_date: '2025-07-09',
    last_updated: '2025-07-09',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 256000, output: 64000 },
    capabilities: ['high_performance'],
  },
  'grok-code-fast-1': {
    name: 'Grok Code Fast 1',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-08',
    release_date: '2025-08-20',
    last_updated: '2025-08-20',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 256000, output: 32000 },
    capabilities: ['coding', 'fast'],
  },
  'grok-4-fast': {
    name: 'Grok 4 Fast',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-11',
    release_date: '2025-08-19',
    last_updated: '2025-08-19',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 2000000, output: 2000000 },
    capabilities: ['high_performance'],
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude Sonnet 3.5 v2',
    shortName: 'Sonnet 3.5',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-04-30',
    release_date: '2024-10-22',
    last_updated: '2024-10-22',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 8192 },
    capabilities: ['chat', 'multimodal'],
  },
  'claude-3-7-sonnet': {
    name: 'Claude Sonnet 3.7',
    shortName: 'Sonnet 3.7',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10-31',
    release_date: '2025-02-19',
    last_updated: '2025-02-19',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 64000 },
    capabilities: ['multimodal'],
  },
  'claude-4-sonnet': {
    name: 'Claude Sonnet 4',
    shortName: 'Sonnet 4',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-05-22',
    last_updated: '2025-05-22',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 64000 },
    capabilities: ['multimodal'],
  },
  'claude-4-opus': {
    name: 'Claude Opus 4',
    shortName: 'Opus 4',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-05-22',
    last_updated: '2025-05-22',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 32000 },
    capabilities: ['multimodal', 'high_performance'],
  },
  'gpt-oss-120b': {
    name: 'GPT OSS 120B',
    shortName: 'GPT OSS',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-08',
    release_date: '2025-08-05',
    last_updated: '2025-08-05',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 32768 },
    capabilities: ['coding'],
  },
  'gpt-5': {
    name: 'GPT-5',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09-30',
    release_date: '2025-08-07',
    last_updated: '2025-08-07',
    modalities: {
      input: ['text', 'audio', 'image', 'video'],
      output: ['text', 'audio', 'image'],
    },
    open_weights: false,
    limit: { context: 400000, output: 128000 },
    capabilities: ['multimodal', 'high_performance'],
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05-30',
    release_date: '2025-08-07',
    last_updated: '2025-08-07',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 272000, output: 128000 },
    capabilities: ['multimodal', 'high_performance'],
  },
  'gpt-5-codex': {
    name: 'GPT-5-Codex',
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09-30',
    release_date: '2025-09-15',
    last_updated: '2025-09-15',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 64000 },
    capabilities: ['coding'],
  },
  'gpt-4.1': {
    name: 'GPT-4.1',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-04',
    release_date: '2025-04-14',
    last_updated: '2025-04-14',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 1047576, output: 32768 },
    capabilities: ['chat', 'multimodal'],
  },
  'gpt-4': {
    name: 'GPT-4',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2023-11',
    release_date: '2023-11-06',
    last_updated: '2024-04-09',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 8192, output: 8192 },
    capabilities: ['chat'],
  },
  'gpt-4o': {
    name: 'GPT-4o',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2023-09',
    release_date: '2024-05-13',
    last_updated: '2024-05-13',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 16384 },
    capabilities: ['chat', 'multimodal'],
  },
  o3: {
    name: 'o3',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2025-04-16',
    last_updated: '2025-04-16',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
    capabilities: ['multimodal'],
  },
  'o3-pro': {
    name: 'o3-pro',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2025-06-10',
    last_updated: '2025-06-10',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
    capabilities: ['multimodal'],
  },
  'o3-mini': {
    name: 'o3-mini',
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2024-12-20',
    last_updated: '2025-01-29',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
    capabilities: ['fast'],
  },
  'o4-mini': {
    name: 'o4-mini',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2025-04-16',
    last_updated: '2025-04-16',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
    capabilities: ['multimodal'],
  },
  'glm-4.5': {
    name: 'GLM 4.5',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-07-28',
    last_updated: '2025-07-28',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 98304 },
    capabilities: [],
  },
  'glm-4.5-air': {
    name: 'GLM-4.5-Air',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-07-28',
    last_updated: '2025-07-28',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 98304 },
    capabilities: [],
  },
  'glm-4.5-flash': {
    name: 'GLM-4.5-Flash',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-07-28',
    last_updated: '2025-07-28',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 98304 },
    capabilities: ['fast'],
  },
  'glm-4.5v': {
    name: 'GLM 4.5V',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-08-11',
    last_updated: '2025-08-11',
    modalities: { input: ['text', 'image', 'video'], output: ['text'] },
    open_weights: true,
    limit: { context: 64000, output: 16384 },
    capabilities: ['multimodal'],
  },
  'glm-4.6': {
    name: 'GLM-4.6',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-09-30',
    last_updated: '2025-09-30',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 204800, output: 131072 },
    capabilities: [],
  },
  'sonoma-dusk-alpha': {
    name: 'Sonoma Dusk Alpha',
    attachment: true,
    reasoning: false,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09',
    release_date: '2024-09-05',
    last_updated: '2024-09-05',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 2000000, output: 2000000 },
  },
  'sonoma-sky-alpha': {
    name: 'Sonoma Sky Alpha',
    attachment: true,
    reasoning: false,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09',
    release_date: '2024-09-05',
    last_updated: '2024-09-05',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 2000000, output: 2000000 },
  },
  'claude-4.1-opus': {
    name: 'Claude Opus 4.1',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-08-05',
    last_updated: '2025-08-05',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 32000 },
  },
  'claude-4-5-sonnet': {
    name: 'Claude Sonnet 4.5 (Preview)',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-09-29',
    last_updated: '2025-09-29',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 32000 },
  },
  'claude-haiku-4-5': {
    name: 'Claude Haiku 4.5',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-02-31',
    release_date: '2025-10-15',
    last_updated: '2025-10-15',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 64000 },
  },
  'ling-1t': {
    name: 'InclusionAI Ling-1T',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-10-09',
    release_date: '2025-10-09',
    last_updated: '2025-10-09',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
    capabilities: ['chat'],
  },
  'ring-1t': {
    name: 'InclusionAI Ring-1T',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-10-14',
    release_date: '2025-10-14',
    last_updated: '2025-10-14',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
    capabilities: [],
  },
  'ring-flash-2.0': {
    name: 'InclusionAI Ring-flash-2.0',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
    capabilities: ['fast'],
  },
  'ling-flash-2.0': {
    name: 'InclusionAI Ling-flash-2.0',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
    capabilities: ['chat', 'fast'],
  },
  'ring-mini-2.0': {
    name: 'InclusionAI Ring-mini-2.0',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
    capabilities: ['fast'],
  },
  'ling-mini-2.0': {
    name: 'InclusionAI Ling-mini-2.0',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
    capabilities: ['chat', 'fast'],
  },
};

function getProviderBaseURL(provider: Provider) {
  if (provider.options?.baseURL) {
    return provider.options.baseURL;
  }
  let api = provider.api;
  for (const env of provider.apiEnv || []) {
    if (process.env[env]) {
      api = process.env[env];
      break;
    }
  }
  return api;
}

function getProviderApiKey(provider: Provider) {
  if (provider.options?.apiKey) {
    return provider.options.apiKey;
  }
  const envs = provider.env || [];
  for (const env of envs) {
    if (process.env[env]) {
      return process.env[env];
    }
  }
  return '';
}

export const defaultModelCreator = (name: string, provider: Provider) => {
  if (provider.id !== 'openai') {
    assert(provider.api, `Provider ${provider.id} must have an api`);
  }
  const baseURL = getProviderBaseURL(provider);
  const apiKey = getProviderApiKey(provider);
  return createOpenAI({
    baseURL,
    apiKey,
  })(name);
};

// 预定义的所有提供商映射表
export const providers: ProvidersMap = {
  'github-copilot': {
    id: 'github-copilot',
    env: [],
    apiEnv: [],
    api: 'https://api.githubcopilot.com',
    name: 'GitHub Copilot',
    doc: 'https://docs.github.com/en/copilot',
    models: {
      'claude-opus-4': models['claude-4-opus'],
      'grok-code-fast-1': models['grok-code-fast-1'],
      'claude-3.5-sonnet': models['claude-3-5-sonnet-20241022'],
      'o3-mini': models['o3-mini'],
      'gpt-5-codex': models['gpt-5-codex'],
      'gpt-4o': models['gpt-4o'],
      'gpt-4.1': models['gpt-4.1'],
      'o4-mini': models['o4-mini'],
      'claude-opus-41': models['claude-4.1-opus'],
      'gpt-5-mini': models['gpt-5-mini'],
      'claude-3.7-sonnet': models['claude-3-7-sonnet'],
      'gemini-2.5-pro': models['gemini-2.5-pro'],
      o3: models['o3'],
      'claude-sonnet-4': models['claude-4-sonnet'],
      'gpt-5': models['gpt-5'],
      'claude-3.7-sonnet-thought': models['claude-3-7-sonnet'],
      'claude-sonnet-4.5': models['claude-4-5-sonnet'],
    },
    async createModel(name, provider, globalConfigDir) {
      const githubDataPath = path.join(globalConfigDir, 'githubCopilot.json');
      const githubProvider = new GithubProvider({ authFile: githubDataPath });
      const token = await githubProvider.access();
      if (!token) {
        throw new Error(
          'Failed to get GitHub Copilot token, use /login to login first',
        );
      }
      return createOpenAI({
        baseURL: 'https://api.individual.githubcopilot.com',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'GitHubCopilotChat/0.26.7',
          'Editor-Version': 'vscode/1.99.3',
          'Editor-Plugin-Version': 'copilot-chat/0.26.7',
          'Copilot-Integration-Id': 'vscode-chat',
        },
        // fix Failed: OpenAI API key is missing
        apiKey: '',
      })(name);
    },
  },
  openai: {
    id: 'openai',
    env: ['OPENAI_API_KEY'],
    apiEnv: ['OPENAI_API_BASE'],
    name: 'OpenAI',
    doc: 'https://platform.openai.com/docs/models',
    models: {
      'gpt-4.1': models['gpt-4.1'],
      'gpt-4': models['gpt-4'],
      'gpt-4o': models['gpt-4o'],
      o3: models['o3'],
      'o3-mini': models['o3-mini'],
      'o4-mini': models['o4-mini'],
      'gpt-5': models['gpt-5'],
      'gpt-5-mini': models['gpt-5-mini'],
      'gpt-5-codex': models['gpt-5-codex'],
    },
    createModel: defaultModelCreator,
  },
  google: {
    id: 'google',
    env: ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
    apiEnv: ['GOOGLE_GENERATIVE_AI_API_BASE'],
    name: 'Google',
    doc: 'https://ai.google.dev/gemini-api/docs/pricing',
    models: {
      'gemini-2.5-flash': models['gemini-2.5-flash'],
      'gemini-2.5-flash-preview-09-2025':
        models['gemini-2.5-flash-preview-09-2025'],
      'gemini-2.5-flash-lite': models['gemini-2.5-flash-lite-preview-06-17'],
      'gemini-2.5-pro': models['gemini-2.5-pro'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL,
      });
      return google(name);
    },
  },
  deepseek: {
    id: 'deepseek',
    env: ['DEEPSEEK_API_KEY'],
    name: 'DeepSeek',
    api: 'https://api.deepseek.com',
    apiEnv: ['DEEPSEEK_API_BASE'],
    doc: 'https://platform.deepseek.com/api-docs/pricing',
    models: {
      'deepseek-chat': models['deepseek-v3-2-exp'],
      'deepseek-reasoner': models['deepseek-r1-0528'],
    },
    createModel: defaultModelCreator,
  },
  xai: {
    id: 'xai',
    env: ['XAI_API_KEY'],
    apiEnv: ['XAI_BASE_URL'],
    name: 'xAI',
    doc: 'https://xai.com/docs/models',
    models: {
      'grok-4': models['grok-4'],
      'grok-4-fast': models['grok-4-fast'],
      'grok-code-fast-1': models['grok-code-fast-1'],
    },
    createModel(name, provider) {
      const api = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createXai({
        baseURL: api,
        apiKey,
      })(name);
    },
  },
  anthropic: {
    id: 'anthropic',
    env: ['ANTHROPIC_API_KEY'],
    apiEnv: ['ANTHROPIC_API_BASE'],
    name: 'Anthropic',
    doc: 'https://docs.anthropic.com/en/docs/models',
    models: {
      'claude-opus-4-20250514': models['claude-4-opus'],
      'claude-opus-4-1-20250805': models['claude-4.1-opus'],
      'claude-sonnet-4-20250514': models['claude-4-sonnet'],
      'claude-sonnet-4-5-20250929': models['claude-4-5-sonnet'],
      'claude-3-7-sonnet-20250219': models['claude-3-7-sonnet'],
      'claude-3-7-sonnet-20250219-thinking': models['claude-3-7-sonnet'],
      'claude-3-5-sonnet-20241022': models['claude-3-5-sonnet-20241022'],
      'claude-haiku-4-5': models['claude-haiku-4-5'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createAnthropic({
        apiKey,
        baseURL,
      })(name);
    },
  },
  aihubmix: {
    id: 'aihubmix',
    env: ['AIHUBMIX_API_KEY'],
    name: 'AIHubMix',
    api: 'https://aihubmix.com/v1',
    doc: 'https://docs.aihubmix.com/',
    models: {
      'gemini-2.5-pro': models['gemini-2.5-pro'],
      'gemini-2.5-flash': models['gemini-2.5-flash'],
      'gemini-2.5-flash-lite': models['gemini-2.5-flash-lite-preview-06-17'],
      'DeepSeek-R1': models['deepseek-r1-0528'],
      'DeepSeek-V3': models['deepseek-v3-0324'],
      'claude-opus-4-20250514': models['claude-4-opus'],
      'claude-sonnet-4-20250514': models['claude-4-sonnet'],
      'claude-3-7-sonnet-20250219': models['claude-3-7-sonnet'],
      'claude-3-5-sonnet-20241022': models['claude-3-5-sonnet-20241022'],
      'gpt-4.1': models['gpt-4.1'],
      'gpt-4': models['gpt-4'],
      'gpt-4o': models['gpt-4o'],
      o3: models['o3'],
      'o3-mini': models['o3-mini'],
      'o4-mini': models['o4-mini'],
      'gpt-5': models['gpt-5'],
      'gpt-5-mini': models['gpt-5-mini'],
    },
    createModel: defaultModelCreator,
  },
  openrouter: {
    id: 'openrouter',
    env: ['OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY'],
    name: 'OpenRouter',
    doc: 'https://openrouter.ai/docs/models',
    models: {
      'anthropic/claude-3.5-sonnet': models['claude-3-5-sonnet-20241022'],
      'anthropic/claude-3.7-sonnet': models['claude-3-7-sonnet'],
      'anthropic/claude-sonnet-4': models['claude-4-sonnet'],
      'anthropic/claude-sonnet-4.5': models['claude-4-5-sonnet'],
      'anthropic/claude-haiku-4.5': models['claude-haiku-4-5'],
      'anthropic/claude-opus-4': models['claude-4-opus'],
      'anthropic/claude-opus-4.1': models['claude-4.1-opus'],
      'deepseek/deepseek-r1-0528': models['deepseek-r1-0528'],
      'deepseek/deepseek-chat-v3-0324': models['deepseek-v3-0324'],
      'deepseek/deepseek-chat-v3.1': models['deepseek-v3-1'],
      'deepseek/deepseek-v3.1-terminus': models['deepseek-v3-1-terminus'],
      'deepseek/deepseek-v3.2-exp': models['deepseek-v3-2-exp'],
      'openai/gpt-4.1': models['gpt-4.1'],
      'openai/gpt-4': models['gpt-4'],
      'openai/gpt-4o': models['gpt-4o'],
      'openai/o3': models['o3'],
      'openai/o3-pro': models['o3-pro'],
      'openai/o3-mini': models['o3-mini'],
      'openai/o4-mini': models['o4-mini'],
      'openai/gpt-oss-120b': models['gpt-oss-120b'],
      'openai/gpt-5': models['gpt-5'],
      'openai/gpt-5-mini': models['gpt-5-mini'],
      'openai/gpt-5-codex': models['gpt-5-codex'],
      'moonshotai/kimi-k2': models['kimi-k2'],
      'moonshotai/kimi-k2-0905': models['kimi-k2-0905'],
      'qwen/qwen3-coder': models['qwen3-coder-480b-a35b-instruct'],
      'qwen/qwen3-max': models['qwen3-max'],
      'x-ai/grok-code-fast-1': models['grok-code-fast-1'],
      'x-ai/grok-4': models['grok-4'],
      'x-ai/grok-4-fast:free': models['grok-4-fast'],
      'openrouter/sonoma-dusk-alpha': models['sonoma-dusk-alpha'],
      'openrouter/sonoma-sky-alpha': models['sonoma-sky-alpha'],
      'z-ai/glm-4.5': models['glm-4.5'],
      'z-ai/glm-4.5v': models['glm-4.5v'],
      'z-ai/glm-4.6': models['glm-4.6'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenRouter({
        apiKey,
        baseURL,
      })(name);
    },
  },
  iflow: {
    id: 'iflow',
    env: ['IFLOW_API_KEY'],
    name: 'iFlow',
    api: 'https://apis.iflow.cn/v1/',
    doc: 'https://iflow.cn/',
    models: {
      'qwen3-coder': models['qwen3-coder-480b-a35b-instruct'],
      'kimi-k2': models['kimi-k2'],
      'kimi-k2-0905': models['kimi-k2-0905'],
      'deepseek-v3': models['deepseek-v3-0324'],
      'deepseek-v3.1': models['deepseek-v3-1'],
      'deepseek-v3.2': models['deepseek-v3-2-exp'],
      'deepseek-r1': models['deepseek-r1-0528'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.6': models['glm-4.6'],
      'qwen3-max-preview': models['qwen3-max'],
    },
    createModel: defaultModelCreator,
  },
  moonshotai: {
    id: 'moonshotai',
    env: ['MOONSHOT_API_KEY'],
    name: 'Moonshot',
    api: 'https://api.moonshot.ai/v1',
    doc: 'https://platform.moonshot.ai/docs/api/chat',
    models: {
      'kimi-k2-0711-preview': models['kimi-k2'],
      'kimi-k2-0905-preview': models['kimi-k2-0905'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenAI({
        baseURL,
        apiKey,
        // include usage information in streaming mode
        compatibility: 'strict',
      })(name);
    },
  },
  'moonshotai-cn': {
    id: 'moonshotai-cn',
    env: ['MOONSHOT_API_KEY'],
    name: 'MoonshotCN',
    api: 'https://api.moonshot.cn/v1',
    doc: 'https://platform.moonshot.cn/docs/api/chat',
    models: {
      'kimi-k2-0711-preview': models['kimi-k2'],
      'kimi-k2-0905-preview': models['kimi-k2-0905'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenAI({
        baseURL,
        apiKey,
        // include usage information in streaming mode why? https://platform.moonshot.cn/docs/guide/migrating-from-openai-to-kimi#stream-模式下的-usage-值
        compatibility: 'strict',
      })(name);
    },
  },
  groq: {
    id: 'groq',
    env: ['GROQ_API_KEY'],
    name: 'Groq',
    api: 'https://api.groq.com/openai/v1',
    doc: 'https://console.groq.com/docs/models',
    models: {},
    createModel: defaultModelCreator,
  },
  siliconflow: {
    id: 'siliconflow',
    env: ['SILICONFLOW_API_KEY'],
    name: 'SiliconFlow',
    api: 'https://api.siliconflow.com/v1',
    doc: 'https://docs.siliconflow.com',
    models: {
      'Qwen/Qwen3-235B-A22B-Instruct-2507': models['qwen3-235b-a22b-07-25'],
      'Qwen/Qwen3-Coder-480B-A35B-Instruct':
        models['qwen3-coder-480b-a35b-instruct'],
      'moonshotai/Kimi-K2-Instruct-0905': models['kimi-k2-0905'],
      'moonshotai/Kimi-K2-Instruct': models['kimi-k2'],
      'deepseek-ai/DeepSeek-R1': models['deepseek-r1-0528'],
      'deepseek-ai/DeepSeek-V3.1': models['deepseek-v3-1'],
      'deepseek-ai/DeepSeek-V3': models['deepseek-v3-0324'],
      'zai-org/GLM-4.5': models['glm-4.5'],
    },
    createModel: defaultModelCreator,
  },
  'siliconflow-cn': {
    id: 'siliconflow-cn',
    env: ['SILICONFLOW_API_KEY'],
    name: 'SiliconFlow CN',
    api: 'https://api.siliconflow.cn/v1',
    doc: 'https://docs.siliconflow.cn',
    models: {
      'Qwen/Qwen3-235B-A22B-Instruct-2507': models['qwen3-235b-a22b-07-25'],
      'Qwen/Qwen3-Coder-480B-A35B-Instruct':
        models['qwen3-coder-480b-a35b-instruct'],
      'moonshotai/Kimi-K2-Instruct-0905': models['kimi-k2-0905'],
      'moonshotai/Kimi-K2-Instruct': models['kimi-k2'],
      'deepseek-ai/DeepSeek-R1': models['deepseek-r1-0528'],
      'deepseek-ai/DeepSeek-V3.1': models['deepseek-v3-1'],
      'deepseek-ai/DeepSeek-V3': models['deepseek-v3-0324'],
      'zai-org/GLM-4.5': models['glm-4.5'],
    },
    createModel: defaultModelCreator,
  },
  modelscope: {
    id: 'modelscope',
    env: ['MODELSCOPE_API_KEY'],
    name: 'ModelScope',
    api: 'https://api-inference.modelscope.cn/v1',
    doc: 'https://modelscope.cn/docs/model-service/API-Inference/intro',
    models: {
      'Qwen/Qwen3-Coder-480B-A35B-Instruct':
        models['qwen3-coder-480b-a35b-instruct'],
      'Qwen/Qwen3-235B-A22B-Instruct-2507': models['qwen3-235b-a22b-07-25'],
      'moonshotai/Kimi-K2-Instruct': models['kimi-k2'],
      'moonshotai/Kimi-K2-Instruct-0905': models['kimi-k2-0905'],
      'deepseek-ai/DeepSeek-V3.1-Terminus': models['deepseek-v3-1-terminus'],
      'deepseek-ai/DeepSeek-V3.1': models['deepseek-v3-1'],
      'ZhipuAI/GLM-4.5': models['glm-4.5'],
      'ZhipuAI/GLM-4.5V': models['glm-4.5v'],
      'ZhipuAI/GLM-4.6': models['glm-4.6'],
    },
    createModel: defaultModelCreator,
  },
  volcengine: {
    id: 'volcengine',
    env: ['VOLCENGINE_API_KEY'],
    name: 'VolcEngine',
    api: 'https://ark.cn-beijing.volces.com/api/v3',
    doc: 'https://www.volcengine.com/docs/82379/1330310',
    models: {
      'deepseek-v3-1-250821': models['deepseek-v3-1'],
      'deepseek-v3-1-terminus': models['deepseek-v3-1-terminus'],
      'doubao-seed-1-6-250615': models['doubao-seed-1.6'],
      'kimi-k2-250905': models['kimi-k2-0905'],
    },
    createModel: defaultModelCreator,
  },
  'zai-coding-plan': {
    id: 'zai-coding-plan',
    env: ['ZHIPU_API_KEY'],
    name: 'Z.AI Coding Plan',
    api: 'https://api.z.ai/api/coding/paas/v4',
    doc: 'https://docs.z.ai/devpack/overview',
    models: {
      'glm-4.5-flash': models['glm-4.5-flash'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.5-air': models['glm-4.5-air'],
      'glm-4.5v': models['glm-4.5v'],
      'glm-4.6': models['glm-4.6'],
    },
    createModel: defaultModelCreator,
  },
  'zhipuai-coding-plan': {
    id: 'zhipuai-coding-plan',
    env: ['ZHIPU_API_KEY'],
    name: 'Zhipu AI Coding Plan',
    api: 'https://open.bigmodel.cn/api/coding/paas/v4',
    doc: 'https://docs.bigmodel.cn/cn/coding-plan/overview',
    models: {
      'glm-4.6': models['glm-4.6'],
      'glm-4.5v': models['glm-4.5v'],
      'glm-4.5-air': models['glm-4.5-air'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.5-flash': models['glm-4.5-flash'],
    },
    createModel: defaultModelCreator,
  },
  zhipuai: {
    id: 'zhipuai',
    env: ['ZHIPU_API_KEY'],
    name: 'Zhipu AI',
    api: 'https://open.bigmodel.cn/api/paas/v4',
    doc: 'https://docs.z.ai/guides/overview/pricing',
    models: {
      'glm-4.6': models['glm-4.6'],
      'glm-4.5v': models['glm-4.5v'],
      'glm-4.5-air': models['glm-4.5-air'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.5-flash': models['glm-4.5-flash'],
    },
    createModel: defaultModelCreator,
  },
  zenmux: {
    id: 'zenmux',
    env: ['ZENMUX_API_KEY'],
    name: 'ZenMux',
    api: 'https://zenmux.ai/api/v1',
    doc: 'https://docs.zenmux.ai/',
    models: {
      'inclusionai/ling-1t': models['ling-1t'],
      'inclusionai/ring-1t': models['ring-1t'],
      'inclusionai/ring-flash-2.0': models['ring-flash-2.0'],
      'inclusionai/ling-flash-2.0': models['ling-flash-2.0'],
      'inclusionai/ring-mini-2.0': models['ring-mini-2.0'],
      'inclusionai/ling-mini-2.0': models['ling-mini-2.0'],
    },
    createModel: defaultModelCreator,
  },
};

// value format: provider/model
export type ModelAlias = Record<string, string>;
// 模型别名映射表，用于简化模型引用，对应 Provider 下的 models 的 key
export const modelAlias: ModelAlias = {
  deepseek: 'deepseek/deepseek-chat',
  r1: 'deepseek/deepseek-reasoner',
  '41': 'openai/gpt-4.1',
  '4': 'openai/gpt-4',
  '4o': 'openai/gpt-4o',
  'flash-lite': 'google/gemini-2.5-flash-lite',
  flash: 'google/gemini-2.5-flash',
  gemini: 'google/gemini-2.5-pro',
  grok: 'xai/grok-4',
  'grok-code': 'xai/grok-code-fast-1',
  sonnet: 'anthropic/claude-sonnet-4-5-20250929',
  haiku: 'anthropic/claude-haiku-4-5',
  'sonnet-3.5': 'anthropic/claude-3-5-sonnet-20241022',
  'sonnet-3.7': 'anthropic/claude-3-7-sonnet-20250219',
  'sonnet-3.7-thinking': 'anthropic/claude-3-7-sonnet-20250219-thinking',
  k2: 'moonshotai-cn/kimi-k2-0711-preview',
  'k2-turbo': 'moonshotai-cn/kimi-k2-turbo-preview',
};

export type ModelInfo = {
  provider: Provider;
  model: Omit<Model, 'cost'>;
  aisdk: AiSdkModel;
};

function mergeConfigProviders(
  hookedProviders: ProvidersMap,
  configProviders: Record<string, ProviderConfig>,
): ProvidersMap {
  const mergedProviders = { ...hookedProviders };
  Object.entries(configProviders).forEach(([providerId, config]) => {
    let provider = mergedProviders[providerId] || {};
    provider = defu(config, provider) as Provider;
    if (!provider.createModel) {
      provider.createModel = defaultModelCreator;
    }
    if (provider.models) {
      for (const modelId in provider.models) {
        const model = provider.models[modelId];
        if (typeof model === 'string') {
          const actualModel = models[model];
          assert(actualModel, `Model ${model} not exists.`);
          provider.models[modelId] = actualModel;
        }
      }
    }
    if (!provider.id) {
      provider.id = providerId;
    }
    if (!provider.name) {
      provider.name = providerId;
    }
    mergedProviders[providerId] = provider;
  });
  return mergedProviders;
}

/**
 * 带上下文的模型解析函数（核心入口）
 *
 * 这是模型解析的核心入口函数，集成了插件系统、配置管理和模型解析三大功能模块。
 * 它协调整个解析流程，支持插件扩展和配置覆盖。
 *
 * @param name - 模型名称（可为 null，将使用配置中的默认模型）
 *               支持格式：
 *               - 完整格式: "provider/model" (如 "anthropic/claude-3-7-sonnet-20250219-thinking")
 *               - 别名格式: "sonnet-3.7-thinking" (会通过 modelAlias 转换)
 * @param context - 应用上下文，包含配置、插件、路径等信息
 * @returns 返回包含以下内容的对象：
 *          - providers: 最终的提供商映射（经过插件钩子和配置合并）
 *          - modelAlias: 模型别名映射（经过插件钩子处理）
 *          - model: 解析后的模型信息（如果指定了模型名称）
 *
 * @example
 * ```typescript
 * const { providers, modelAlias, model } = await resolveModelWithContext(
 *   'gpt-4o',
 *   context
 * );
 * // model 包含 provider、model 元数据和 aisdk 实例
 * ```
 *
 * 工作流程：
 * 1. 通过 provider 钩子允许插件扩展提供商
 * 2. 合并用户配置文件中的提供商定义
 * 3. 通过 modelAlias 钩子允许插件自定义别名
 * 4. 确定模型名称（参数优先，否则使用配置）
 * 5. 调用 resolveModel 进行实际解析
 * 6. 返回完整的解析结果
 */
export async function resolveModelWithContext(
  name: string | null,
  context: Context,
) {
  // 1. 插件钩子: provider
  // 允许插件扩展或修改提供商定义
  // 使用 SeriesLast 类型，以内置 providers 为基础，插件可以添加新提供商或修改现有提供商
  const hookedProviders = await context.apply({
    hook: 'provider',
    args: [
      {
        models, // 所有预定义的模型
        defaultModelCreator, // 默认的模型创建函数
        createOpenAI, // OpenAI SDK 创建函数（供插件使用）
      },
    ],
    memo: providers, // 初始值为内置的提供商映射
    type: PluginHookType.SeriesLast,
  });

  // 2. 配置合并
  // 如果配置文件中定义了提供商，则深度合并到已处理的提供商中
  // 支持覆盖现有提供商或添加新的提供商
  const finalProviders = context.config.provider
    ? mergeConfigProviders(hookedProviders, context.config.provider)
    : hookedProviders;

  // 3. 插件钩子: modelAlias
  // 允许插件自定义模型别名映射
  // 使用 SeriesLast 类型，以内置 modelAlias 为基础
  const hookedModelAlias = await context.apply({
    hook: 'modelAlias',
    args: [],
    memo: modelAlias, // 初始值为内置的别名映射
    type: PluginHookType.SeriesLast,
  });

  // 4. 确定模型名称
  // 优先使用传入的 name 参数，否则使用配置中的默认模型
  const modelName = name || context.config.model;

  // 5. 解析模型
  // 如果有模型名称，调用 resolveModel 进行实际解析
  // resolveModel 是纯粹的解析函数，不处理插件和配置
  const model = modelName
    ? await resolveModel(
        modelName,
        finalProviders,
        hookedModelAlias,
        context.paths.globalConfigDir,
      )
    : null;

  // 6. 返回完整结果
  return {
    providers: finalProviders, // 经过插件钩子和配置合并后的最终提供商
    modelAlias, // 注意：这里返回的是原始 modelAlias，而非 hookedModelAlias
    model, // 解析后的模型信息（包含 provider、model、aisdk）
  };
}

// 模型解析
export async function resolveModel(
  name: string,
  providers: ProvidersMap,
  modelAlias: Record<string, string>,
  globalConfigDir: string,
): Promise<ModelInfo> {
  // 1. 别名解析
  const alias = modelAlias[name];
  if (alias) {
    name = alias;
  }

  // 2. 提供商查找
  const [providerStr, ...modelNameArr] = name.split('/');
  const provider = providers[providerStr];
  assert(
    provider,
    `Provider ${providerStr} not found, valid providers: ${Object.keys(providers).join(', ')}`,
  );

  // 3. 模型验证
  const modelId = modelNameArr.join('/');
  const model = provider.models[modelId] as Model;
  assert(
    model,
    `Model ${modelId} not found in provider ${providerStr}, valid models: ${Object.keys(provider.models).join(', ')}`,
  );

  // 4. 实例创建
  model.id = modelId;
  let m = provider.createModel(modelId, provider, globalConfigDir);
  if (isPromise(m)) {
    m = await m;
  }
  return {
    provider,
    model,
    aisdk: aisdk(m as LanguageModelV1),
  };
}

function isPromise(m: any): m is Promise<LanguageModelV1> {
  return m instanceof Promise;
}
