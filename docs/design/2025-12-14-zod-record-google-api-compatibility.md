# Zod Record 与 Google API 的兼容性问题

## 问题

在 Zod v4 中使用 `z.record(z.string(), z.string())` 作为工具参数模式时，Google Gemini API 会返回错误：

```
Invalid JSON payload received. Unknown name \"propertyNames\" at 
'request.tools[N].function_declarations[0].parameters.properties[M].value': 
Cannot find field.
```

## 根本原因

在 Zod v4 中，`z.record(KeySchema, ValueSchema)` 生成的 JSON 模式包含 `propertyNames` 关键字来验证键类型：

```json
{
  "type": "object",
  "additionalProperties": {
    "type": "string"
  },
  "propertyNames": {
    "type": "string"
  }
}
```

**Google 的 Gemini API 不支持在函数/工具声明中使用 `propertyNames` JSON 模式关键字**。这是 API 的限制 - 它只支持 JSON 模式功能的子集。

## 为什么 Zod v4 需要两个参数

在 Zod v3 中，您可以使用 `z.record(z.string())` 只带一个参数来定义值类型。然而，**Zod v4 删除了单参数支持** - 现在必须指定键和值模式：`z.record(z.string(), z.string())`。

参考：https://zod.dev (Zod 4 迁移指南)

## 解决方案

将 `z.record()` 替换为包含对象模式的 `z.array()`：

### 之前（导致错误）
```typescript
answers: z
  .record(z.string(), z.string())
  .optional()
  .describe('User answers')
```

生成的 JSON 模式：
```json
{
  "type": "object",
  "additionalProperties": { "type": "string" },
  "propertyNames": { "type": "string" }
}
```

### 之后（与 Google API 兼容）
```typescript
answers: z
  .array(z.object({ question: z.string(), answer: z.string() }))
  .optional()
  .describe('User answers')
```

生成的 JSON 模式：
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "question": { "type": "string" },
      "answer": { "type": "string" }
    },
    "required": ["question", "answer"]
  }
}
```

## 权衡

| 方面 | `z.record()` | `z.array()` |
|--------|-------------|-------------|
| Google API | ❌ 不支持 | ✅ 支持 |
| 数据访问 | `answers[question]` | `answers.find(a => a.question === ...)` |
| 唯一性 | 键天然唯一 | 如需要需手动验证 |
| 冗长性 | 更紧凑 | 更明确的结构 |

## 受影响的文件

1. **`src/tools/askUserQuestion.ts`** - 模式定义和执行函数
2. **`src/ui/ApprovalModal.tsx`** - 将 UI Record 格式转换为数组格式

## 考虑的替代解决方案

1. **使用 `z.record(z.string())`（单参数）** - 在 Zod v4 中不可用
2. **自定义 JSON 模式覆盖** - 更复杂，更难维护
3. **后处理模式以删除 `propertyNames`** - 黑客手段，更新时可能损坏

## 建议

定义需要与 Google API 配合使用的工具模式时：

1. **避免 `z.record()`** - 它生成不受支持的 `propertyNames`
2. **使用 `z.array()` 与显式对象模式** - 完全兼容
3. **使用简单的 `z.object()` 与已知键** - 当键是预定义的时
4. **与所有目标提供商测试** - 不同的 API 支持不同的 JSON 模式子集

## 相关链接

- [JSON Schema: propertyNames](https://json-schema.org/understanding-json-schema/reference/object.html#property-names)
- [Zod v4 迁移指南](https://zod.dev)
- [Google Gemini 函数调用](https://ai.google.dev/docs/function_calling)
