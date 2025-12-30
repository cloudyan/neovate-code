# 引号感知命令替换检查

**日期:** 2025-12-24

## 上下文

当前在 `src/tools/bash.ts` 中的命令替换检测使用简单的子字符串检查：

```typescript
if (command.includes('$(') || command.includes('`')) {
  return '出于安全原因，不允许命令替换。';
}
```

这会阻止合法的使用情况，例如出现在文字字符串内容中的反引号，如 Markdown 代码围栏: `echo "\`\`\`console.log()\`\`\`"`。

## 讨论

### 解析复杂度
考虑了三种方法：
1. **引号感知解析** - 仅在不在单引号内时标记 ✓ 已选择
2. **转义字符感知** - 还允许引号外的转义反引号
3. **完整 shell 解析** - 使用适当的 shell 词元化器

### 引号规则
选择标准 shell 语义：
- 单引号转义所有内容（无替换）
- 双引号允许替换，除非已转义

### 转义反引号
双引号中的转义反引号应被允许: `echo "\\`not substitution\\`"`

### 实现方法
考虑了两种方法：
1. **状态机解析器** - 逐字符遍历，跟踪引号状态 ✓ 已选择
2. **带负向后查找的正则表达式** - 更短但更难处理边界情况

状态机因与现有 `splitPipelineSegments()` 模式的一致性而被选择。

## 方法

创建一个新函数 `hasCommandSubstitution(command: string): boolean`，使用尊重 shell 引号规则的状态机解析器。

在 `validateCommand()` 和 `isSegmentHighRisk()` 中都用这个新函数替换简单检查。

## 架构

### 函数设计

```typescript
function hasCommandSubstitution(command: string): boolean
```

**状态跟踪：**
- `inSingleQuote: boolean`
- `inDoubleQuote: boolean`
- `escaped: boolean`

**规则：**
1. 在单引号内 → 跳过所有检测（所有内容都是文字）
2. 反斜杠为下一个字符设置 `escaped=true`
3. 在双引号内且已转义 → 跳过（文字反引号）
4. 在引号外或在双引号内未转义 → 检测 `$(` 或 `` ` ``

### 集成点

```
validateCommand(command)
    └── hasCommandSubstitution(command) → boolean
    isSegmentHighRisk(segment)
    └── hasCommandSubstitution(segment) → boolean
```

### 测试用例

| 输入 | 预期 | 原因 |
|-------|----------|--------|
| `echo $(whoami)` | `true` | 未加引号的替换 |
| `echo \\`whoami\\`` | `true` | 未加引号的反引号 |
| `echo '$(whoami)'` | `false` | 单引号文字 |
| `echo '\\`test\\`'` | `false` | 单引号反引号 |
| `echo \"\\`test\\`\"` | `false` | 双引号中的转义反引号 |
| `echo \"$(whoami)\"` | `true` | 双引号中的替换 |
| `echo \"\\`\\`\\`js\\`\\`\\`\"` | `false` | Markdown 代码围栏 |
| `echo 'foo' $(cmd)` | `true` | 引号部分后的替换 |
