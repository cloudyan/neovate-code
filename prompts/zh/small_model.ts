// smallModel 提示词 (源文件: /src/ui/store.ts 中 utils.quickQuery)

const smallModelSystemPrompt = `Analyze if this message indicates a new conversation topic. If it does, extract a 2-3 word title that captures the new topic. Format your response as a JSON object with one fields: 'title' (string). Only include these fields, no other text.`;

const smallModelSystemPromptZh = `分析此消息是否表示新的话题。如果是，则提取一个2-3个词的标题来概括新话题。将您的响应格式化为一个JSON对象，包含一个字段：'title'（字符串）。仅包含这些字段，不要包含其他文本。`;
