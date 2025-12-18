# utils.open 处理器

**日期：** 2025-12-09

## 背景

向 nodeBridge 添加一个新的 `utils.open` 处理器，允许在指定的工作目录下打开各种应用程序（IDE、终端、文件管理器）。这使得可以从 CLI 以编程方式启动开发工具。

## 讨论

**行为**：处理器应在指定的 `cwd` 目录下打开应用程序（例如，VSCode 打开文件夹，iTerm 在该目录中打开）。

**响应策略**：采用即发即弃的方法 - 在生成进程后立即返回成功，无需等待应用程序打开的确认。这避免了复杂性和潜在的超时。

**应用程序说明**：`antigravity` 是一个类似于 VSCode/Cursor 的 IDE，具有 CLI 命令 `agy`。

## 方法

实现一个简单的处理器，将应用程序名称映射到其 CLI 命令并生成分离的进程。处理器使用 Node.js `child_process.spawn` 与 `detached: true` 和 `stdio: 'ignore'` 以实现即发即弃行为。

## 架构

### 类型 (nodeBridge.types.ts)

```typescript
type UtilsOpenInput = {
  cwd: string;
  sessionId?: string;
  app: 'cursor' | 'vscode' | 'vscode-insiders' | 'zed' | 'windsurf' | 'iterm' | 'warp' | 'terminal' | 'antigravity' | 'finder' | 'sourcetree';
};

// 添加到 HandlerMap:
'utils.open': { input: UtilsOpenInput; output: SuccessResponse };
```

### 应用程序到命令映射

| 应用 | 命令 |
|-----|---------|
| cursor | `cursor <cwd>` |
| vscode | `code <cwd>` |
| vscode-insiders | `code-insiders <cwd>` |
| zed | `zed <cwd>` |
| windsurf | `windsurf <cwd>` |
| antigravity | `agy <cwd>` |
| iterm | `open -a iTerm <cwd>` |
| warp | `open -a Warp <cwd>` |
| terminal | `open -a Terminal <cwd>` |
| finder | `open <cwd>` |
| sourcetree | `open -a SourceTree <cwd>` |

### 处理器实现 (nodeBridge.ts)

```typescript
this.messageBus.registerHandler('utils.open', async (data) => {
  const { cwd, app } = data;
  const { spawn } = await import('child_process');

  const commands: Record<string, { cmd: string; args: string[] }> = {
    cursor: { cmd: 'cursor', args: [cwd] },
    vscode: { cmd: 'code', args: [cwd] },
    'vscode-insiders': { cmd: 'code-insiders', args: [cwd] },
    zed: { cmd: 'zed', args: [cwd] },
    windsurf: { cmd: 'windsurf', args: [cwd] },
    antigravity: { cmd: 'agy', args: [cwd] },
    iterm: { cmd: 'open', args: ['-a', 'iTerm', cwd] },
    warp: { cmd: 'open', args: ['-a', 'Warp', cwd] },
    terminal: { cmd: 'open', args: ['-a', 'Terminal', cwd] },
    finder: { cmd: 'open', args: [cwd] },
    sourcetree: { cmd: 'open', args: ['-a', 'SourceTree', cwd] },
  };

  const config = commands[app];
  const child = spawn(config.cmd, config.args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return { success: true };
});
```

### 注意事项

- `sessionId` 是可选的，在当前实现中未使用（为将来使用保留）
- 以 macOS 为重点的实现，对 GUI 应用程序使用 `open -a`
- IDE 使用其 CLI 命令直接（假设已安装 shell 命令）
