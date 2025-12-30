# 从提交消息 JSON 中剥离 think 标签

**日期:** 2025-12-26

## 上下文

通过 AI 生成提交消息时，某些模型返回的响应在实际 JSON 内容之前被包装在 `<tool_call>` 标签中：

```
<tool_call>
{
  "commitMessage": "feat: add b.js file",
  "branchName": "feat/add-bjs-file",
  "isBreakingChange": false,
  "summary": "Added new empty b.js file to the repository."
}
```

这导致 `nodeBridge.ts` 中的 `project.generateCommit` 处理程序中的 `JSON.parse()` 失败，破坏了提交命令功能。

## 讨论

### 探索的关键问题

1. **在何处实现剥离逻辑？**
   - 选项 A: 仅在 `nodeBridge.ts` 中直接实现
   - 选项 B: 创建可重用的工具函数
   - **决定：** 创建工具函数以实现可重用性

2. **将工具函数放在何处？**
   - 选项 A: 添加到现有的 `utils/safeParseJson.ts`
   - 选项 B: 添加到 `utils/string.ts`
   - 选项 C: 创建新的专用文件
   - **决定：** 添加到 `safeParseJson.ts`，因为它与 JSON 解析工具相关

3. **使用哪个正则表达式模式？**
   - 选项 A: `/<tool_call>[\\s\\S]*?<\\/think>/g` - 处理多行内容
   - 选项 B: `/<tool_call>(?:.|\\n)*?<\\/think>/g` - 替代模式
   - **决定：** 使用 `[\s\S]*?` 的标准正则表达式以提高清晰度和可靠性

## 方法

添加一个 `stripThinkTags()` 工具函数，用于在 JSON 解析之前从文本中移除所有 `<tool_call>...</tool_call>
