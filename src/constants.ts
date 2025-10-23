export const PRODUCT_NAME = 'NEOVATE';
export const PRODUCT_ASCII_ART = `
█▄ █ █▀▀ █▀█ █ █ ▄▀█ ▀█▀ █▀▀
█ ▀█ ██▄ █▄█ ▀▄▀ █▀█  █  ██▄
`.trim();
export const DEFAULT_OUTPUT_STYLE_NAME = 'Default';
export const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.tiff',
  '.tif',
]);
export const CANCELED_MESSAGE_TEXT = '[Request interrupted by user]';

export enum TOOL_NAMES {
  TODO_WRITE = 'todoWrite',
  TODO_READ = 'todoRead',
  BASH = 'bash',
}

// Reserve 20% buffer for small models
export const MIN_TOKEN_THRESHOLD = 32_000 * 0.8;

// 统一语言配置
// 配置文件存储格式为语言代码，如 {"language": "zh-CN"} 等

// 标准语言代码映射：
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  'en-US': 'English', // 英语：en-US（而不是English）
  'zh-CN': '简体中文', // 简体中文：zh-CN（而不是简体中文）
  // 'zh-TW': '繁體中文',
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// 默认语言代码
export const DEFAULT_LANGUAGE: LanguageCode = 'en-US';
