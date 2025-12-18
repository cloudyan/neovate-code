# Skill 工具实现

**日期:** 2025-12-17

## 背景

目标是在 `src/tools/` 中添加一个 Skill 工具，允许 Claude 在主对话中执行技能（基于特定提示的命令）。技能提供从 SKILL.md 文件加载的专业能力和领域知识。

实现应遵循 `skill-tool.md` 中记录的模式，但采用简化方法:
- 无输入验证或权限检查
- 无遥测
- 无上下文修饰符
- 无权限系统

## 讨论

### 关键问题解答

1. **依赖注入模式**: Skill 工具应如何访问 SkillManager?
   - **决定**: 通过 `createSkillTool({ skillManager })` 传递 - 遵循现有模式如 `createTodoTool`, `createBashTool`

2. **输出格式**: llmContent 应包含什么?
   - **决定**: 遵循 skill-tool.md 的第 8 节（"通过 dtB() 进行提示处理"）
   - 返回带命令元数据 XML 和提示内容的消息数组
   - 使用 `safeStringify()` 转换为字符串

### 消息结构

遵循原始实现模式:
- **消息 1**: 带有 `<command-message>` 和 `<command-name>` XML 标签的命令元数据
- **消息 2**: 带有基础目录前缀的技能提示内容，标记为 `isMeta: true`

## 方法

创建一个简单、专注的 Skill 工具，它:
1. 接收技能名称作为输入
2. 在 SkillManager 中查找技能
3. 读取技能正文内容
4. 按照 dtB() 模式将响应格式化为消息数组
5. 返回字符串化的消息作为 llmContent

错误处理是最小的 - 只检查技能是否存在。

## 架构

### 文件位置
`src/tools/skill.ts`

### 接口

```typescript
createSkillTool(opts: { skillManager: SkillManager }): Tool
```

### 输入模式

```typescript
z.object({
  skill: z.string().describe('The skill name to execute'),
})
```

### 输出格式

```typescript
// 成功情况
{
  llmContent: safeStringify([
    {
      type: 'text',
      text: '<command-message>${skillName} is running…</command-message>\n<command-name>${skillName}</command-name>',
    },
    {
      type: 'text',
      text: 'Base directory for this skill: ${baseDir}\n\n${skillBody}',
      isMeta: true,
    },
  ]),
  returnDisplay: 'Loaded skill: ${skillName}',
}

// 错误情况
{
  isError: true,
  llmContent: 'Skill \"${skillName}\" not found',
}
```

### 实现

```typescript
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../tool';
import type { SkillManager } from '../skillManager';
import { safeStringify } from '../utils/safeStringify';

export function createSkillTool(opts: { skillManager: SkillManager }) {
  return createTool({
    name: 'skill',
    description: 'Execute a skill within the conversation',
    parameters: z.object({
      skill: z.string().describe('The skill name to execute'),
    }),
    async execute({ skill }) {
      const skillName = skill.trim();
      const foundSkill = opts.skillManager.getSkills().find(s => s.name === skillName);

      if (!foundSkill) {
        return {
          isError: true,
          llmContent: `Skill \"${skillName}\" not found`,
        };
      }

      const body = await opts.skillManager.readSkillBody(foundSkill);
      const baseDir = path.dirname(foundSkill.path);

      const messages = [
        {
          type: 'text',
          text: `<command-message>${skillName} is running…</command-message>\n<command-name>${skillName}</command-name>`,
        },
        {
          type: 'text',
          text: `Base directory for this skill: ${baseDir}\n\n${body}`,
          isMeta: true,
        },
      ];

      return {
        llmContent: safeStringify(messages),
        returnDisplay: `Loaded skill: ${foundSkill.name}`,
      };
    },
    approval: { category: 'read' },
  });
}
```

### 摘要表

| 方面 | 实现 |
|--------|----------------|
| 输入 | `{ skill: string }` |
| DI | `createSkillTool({ skillManager })` |
| 输出 | 消息数组 → safeStringify |
| 消息 1 | `<command-message>` + `<command-name>` XML |
| 消息 2 | 基础目录 + 技能正文, `isMeta: true` |
| 错误 | `{ isError: true, llmContent: \"Skill not found\" }` |
| 审批 | `{ category: 'read' }` |
| 排除 | 验证、权限、遥测、上下文修饰符 |
