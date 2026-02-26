import { ApiFormat, type Provider } from './types';

export const opencodeZenProvider: Provider = {
  id: 'opencode',
  source: 'built-in',
  env: ['OPENCODE_API_KEY'],
  name: 'OpenCode Zen',
  api: 'https://opencode.ai/zen/v1',
  doc: 'https://opencode.ai/docs/zen',
  models: {
    // 免费模型
    'big-pickle': {},
    'minimax-m2.5-free': {},
    'kimi-k2.5-free': {},
    'gpt-5-nano': {},
    'glm-4.7-free': {},

    'glm-4.7': {},
    'glm-4.6': {},
    'qwen3-coder': {},
    'claude-4.1-opus': {
      apiFormat: ApiFormat.Anthropic,
    },
    'kimi-k2': {},
    'gpt-5.2-codex': {
      apiFormat: ApiFormat.Responses,
    },
    'gpt-5.1-codex': {
      apiFormat: ApiFormat.Responses,
    },
    'claude-haiku-4-5': {
      apiFormat: ApiFormat.Anthropic,
    },
    'claude-opus-4-5': {
      apiFormat: ApiFormat.Anthropic,
    },
    'kimi-k2.5': {},
    'gemini-3-pro': {
      apiFormat: ApiFormat.Google,
    },
    'claude-4-5-sonnet': {
      apiFormat: ApiFormat.Anthropic,
    },
    'gpt-5.1-codex-mini': {
      apiFormat: ApiFormat.Responses,
    },
    'kimi-k2-thinking': {},
    'gpt-5.1': {
      apiFormat: ApiFormat.Responses,
    },
    'gpt-5-codex': {
      apiFormat: ApiFormat.Responses,
    },
    'gemini-3-flash': {
      apiFormat: ApiFormat.Google,
    },
    'gpt-5.1-codex-max': {
      apiFormat: ApiFormat.Responses,
    },
    'claude-4-sonnet': {
      apiFormat: ApiFormat.Anthropic,
    },
    'gpt-5': {
      apiFormat: ApiFormat.Responses,
    },
    'minimax-m2.1': {},
    'gpt-5.2': {
      apiFormat: ApiFormat.Responses,
    },
  },
  apiFormat: ApiFormat.OpenAI,
};
