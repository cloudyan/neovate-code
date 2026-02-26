import type { Provider } from './types';

export const nvidiaProvider: Provider = {
  id: 'nvidia',
  source: 'built-in',
  env: ['NVIDIA_API_KEY'],
  name: 'NVIDIA',
  api: 'https://integrate.api.nvidia.com/v1/',
  doc: 'https://nvidia.com/',
  models: {
    'z-ai/glm5': {},
    'z-ai/glm4.7': {},
    'minimaxai/minimax-m2.5': {},
    'minimaxai/minimax-m2.1': {},
    'moonshotai/kimi-k2.5': {},
    'moonshotai/kimi-k2-thinking': {},
    'moonshotai/kimi-k2-instruct-0905': {},
    'moonshotai/kimi-k2-instruct': {},
    'openai/gpt-oss-120b': {},
    'qwen/qwen3-coder-480b-a35b-instruct': {},
    'qwen/qwen3.5-397b-a17b': {},
    'deepseek-ai/deepseek-v3.2': {},
    'deepseek-ai/deepseek-v3.1-terminus': {},
    'deepseek-ai/deepseek-v3.1': {},
  },
  interleaved: {},
};
