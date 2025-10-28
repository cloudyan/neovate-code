// Fetch工具提示词模板函数

export function createFetchPrompt() {
  return `
从 URL 获取内容。

注意事项：
- 重要：如果有 MCP 提供的网页获取工具，请优先使用该工具，因为它可能限制更少。所有 MCP 提供的工具都以 "mcp__" 开头。
  `;
}
