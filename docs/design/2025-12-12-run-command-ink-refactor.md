# Run Command Ink/React 重构

**日期:** 2025-12-12

## 背景

当前 `src/commands/run.ts` 实现使用 AI 将自然语言转换为 shell 命令并可选择性地执行它们。然而，它使用 `@umijs/clack-prompts` 进行交互，这与使用 React/Ink 提供更丰富、更易维护的 UI/UX 的较新命令（如 `commit.tsx`）不一致。

目标是使用 React、Ink 和 `nodeBridge.ts` 将 `run.ts` 重新实现为 `run.tsx`，遵循 `commit.tsx` 中建立的模式，以改善用户体验并保持代码库一致性。

## 讨论

### 关键问题和决定

**命令失败恢复:**
- 决定: **简单重试** - 当命令失败时，显示错误并允许用户重试相同命令或编辑它。
- 被拒绝的替代方案: AI 辅助修复（过于复杂）、仅手动编辑（不够灵活）

**输出显示:**
- 决定: **捕获 + 显示** - 捕获命令输出并在完成后显示格式化结果
- 被拒绝的替代方案: 内联流式传输（复杂）、继承 stdio（破坏 UI 一致性）

**命令历史:**
- 决定: **无历史** - 每次运行都是独立的，保持功能简单
- 理由: YAGNI - 会话历史增加了复杂性而没有明确的即时价值

**编辑流:**
- 决定: **内联 TextInput** - 在 Ink UI 中直接编辑命令（与 commit.tsx 一致）
- 被拒绝的替代方案: 外部编辑器（更复杂，破坏 UI 流程）

**AI 查询集成:**
- 决定: **通过 MessageBus 使用 `utils.quickQuery`** - 遵循与 `commit.tsx` 相同的模式以保持一致性
- 理由: 保持 AI 调用与 UI 组件解耦，使用现有的 NodeBridge 基础设施

## 方法

使用最小状态机模式（类似于 `commit.tsx`）将 `run.ts` 转换为 `run.tsx`。实现将:

1. 通过 MessageBus 使用 `utils.quickQuery` 进行 AI 自然语言 → shell 命令转换
2. 使用本地 `execSync` 与捕获输出（不需要新的 NodeBridge 处理程序）
3. 遵循 commit.tsx 模式: NodeBridge 设置上下文，MessageBus 用于查询，Ink 渲染
4. 支持 `--yes` 标志进行非交互式自动执行
5. 提供带有重试功能的清晰错误消息
6. 支持剪贴板复制操作

## 架构

### 状态机

```typescript
type RunState =
  | { phase: 'idle' }                                    // 等待用户输入
  | { phase: 'generating' }                              // AI 转换为 shell 命令
  | { phase: 'displaying'; command: string }             // 显示命令与操作选项
  | { phase: 'editing'; command: string; editedCommand: string }  // 内联编辑
  | { phase: 'executing'; command: string }              // 运行命令
  | { phase: 'success'; command: string; output: string } // 命令成功
  | { phase: 'error'; command: string; error: string }   // 命令失败，提供重试
  | { phase: 'cancelled' };                              // 用户取消

type RunAction = 'execute' | 'copy' | 'edit' | 'cancel' | 'retry';

interface RunOptions {
  model?: string;
  yes: boolean;  // 无需确认自动执行
}
```

### 组件结构

```
src/commands/run.tsx
├── RunUI (主组件)
│   ├── Header - "🚀 AI Shell Command Generator" + 模型信息
│   ├── 阶段渲染:
│   │   ├── idle → TextInput 用于提示
│   │   ├── generating → "⏳ Converting to shell command..."
│   │   ├── displaying → CommandCard + ActionSelector
│   │   ├── editing → CommandCard + 内联 TextInput
│   │   ├── executing → "⏳ Executing command..."
│   │   ├── success → CommandCard + 绿色框中的输出
│   │   └── error → CommandCard + 红色框中的错误 + 重试选项
│   └── ErrorDisplay (可重用，与 commit.tsx 相同模式)
├── CommandCard (新组件) - 在样式框中显示命令
└── RunActionSelector - execute/copy/edit/cancel 选项
```

### 数据流

**AI 查询集成:**
```typescript
// 通过 MessageBus 使用 utils.quickQuery（与 commit.tsx 相同模式）
const result = await messageBus.request('utils.quickQuery', {
  cwd,
  userPrompt: prompt,
  systemPrompt: SHELL_COMMAND_SYSTEM_PROMPT,
  model: options.model,
});
```

**Shell 执行:**
```typescript
// 本地执行与捕获输出
import { execSync } from 'child_process';

function executeShell(command: string, cwd: string): { success: boolean; output: string } {
  const output = execSync(command, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],  // 捕获 stdout/stderr
    timeout: 60000,  // 60s 超时
  });
  return { success: true, output };
}
```

**入口点:**
```typescript
export async function runRun(context: Context) {
  // 1. 使用 yargs-parser 解析参数
  // 2. 如果 --help → printHelp() → 返回
  // 3. 创建 NodeBridge + MessageBus 对（用于 quickQuery）
  // 4. render(<RunUI ... />)
}
```

### 流程逻辑

1. **提示收集:**
   - 如果通过 CLI 参数提供提示 → 跳过 `idle`，转到 `generating`
   - 否则 → 以 TextInput 的 `idle` 阶段开始

2. **命令生成:**
   - 通过 MessageBus 调用 `utils.quickQuery` 与 `SHELL_COMMAND_SYSTEM_PROMPT`
   - 成功时 → 转换到 `displaying`
   - 错误时 → 显示错误与重试选项

3. **用户决策:**
   - 如果 `--yes` 标志 → 跳过 `displaying`，直接转到 `executing`
   - 否则 → 显示 ActionSelector (execute/copy/edit/cancel)

4. **执行:**
   - 使用 60s 超时捕获 stdout/stderr
   - 成功时 → 在绿色框中显示输出
   - 错误时 → 在红色框中显示错误与重试选项

5. **复制到剪贴板:**
   - 使用 `clipboardy` 将命令复制到剪贴板
   - 显示成功消息并自动退出

6. **错误恢复:**
   - 重试返回到 `displaying` 阶段（不重新生成）
   - 用户可以在重试前编辑命令

### 错误处理

| 场景 | 处理 |
|----------|----------|
| AI 查询失败 | 显示错误，允许重试（重新生成） |
| 命令执行失败 | 显示错误 + 输出，允许重试/编辑 |
| 命令超时（60s） | 视为错误，显示超时消息 |
| 用户按 Escape | 取消当前阶段，如果在 idle/generating 中则退出 |
| 空提示 | 保持在 idle 阶段，不继续 |

**Escape 键行为:**
- `idle` / `generating` → 立即退出
- `editing` → 返回到 `displaying`（丢弃编辑）
- `displaying` / `success` / `error` → 退出

**自动退出:**
- `success` 与 `--yes` 标志 → 1.5s 后退出（简要显示结果）
- `success` 复制后 → 1s 后退出
- `cancelled` → 立即退出

### 实现说明

- **通过 MessageBus 使用 `utils.quickQuery`** - 与 commit.tsx 相同的 AI 查询模式
- **遵循 commit.tsx 模式** - 相同的 NodeBridge 设置、MessageBus 使用、渲染选项
- **CommandCard 组件** - 可重用的样式框用于显示 shell 命令
- **一致的样式** - 使用与 commit.tsx 相同的颜色方案和边框
- **保留 SHELL_COMMAND_SYSTEM_PROMPT** - 现有系统提示已过良好测试
- **复制到剪贴板** - 使用 `clipboardy` 包（与 commit.tsx 相同）

### 范围外（YAGNI）

- 命令历史/会话记忆
- 外部编辑器集成
- AI 辅助错误修复
- 流式命令输出
- 命令预览/模拟运行模式
