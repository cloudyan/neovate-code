// Glob工具提示词模板函数

export function createGlobPrompt() {
  return `
Glob - 快速文件模式匹配工具，适用于任何代码库大小
- 支持 glob 模式，如 "**/*.js" 或 "src/**/*.ts"
- 返回按修改时间排序的匹配文件路径
- 当您需要按名称模式查找文件时，请使用此工具
  `;
}
