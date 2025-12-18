# utils.detectApps 处理器

## 目的

向用户显示系统上可用的开发工具以供状态显示。

## 类型

```typescript
// 在 nodeBridge.types.ts 中

type App =
  | 'cursor'
  | 'vscode'
  | 'vscode-insiders'
  | 'zed'
  | 'windsurf'
  | 'iterm'
  | 'warp'
  | 'terminal'
  | 'antigravity'
  | 'finder'
  | 'sourcetree';

type UtilsDetectAppsInput = {
  cwd: string;
  apps?: App[];  // 如果省略，则检测所有
};

type UtilsDetectAppsOutput = {
  success: boolean;
  data: {
    apps: App[];  // 已安装应用列表
  };
};

// 添加到 HandlerMap:
'utils.detectApps': { input: UtilsDetectAppsInput; output: UtilsDetectAppsOutput };
```

注意：提取 `App` 类型以便与现有的 `UtilsOpenInput` 共享。

## 处理器实现

```typescript
// 在 nodeBridge.ts 中

this.messageBus.registerHandler('utils.detectApps', async (data) => {
  const { apps: appsToCheck } = data;
  const { existsSync } = await import('fs');
  const { execSync } = await import('child_process');

  const allApps = [
    'cursor', 'vscode', 'vscode-insiders', 'zed', 'windsurf',
    'iterm', 'warp', 'terminal', 'antigravity', 'finder', 'sourcetree'
  ] as const;

  const cliCommands: Record<string, string> = {
    cursor: 'cursor',
    vscode: 'code',
    'vscode-insiders': 'code-insiders',
    zed: 'zed',
    windsurf: 'windsurf',
    antigravity: 'agy',
  };

  const macApps: Record<string, string> = {
    iterm: '/Applications/iTerm.app',
    warp: '/Applications/Warp.app',
    terminal: '/Applications/Utilities/Terminal.app',
    finder: '/System/Applications/Finder.app',
    sourcetree: '/Applications/Sourcetree.app',
  };

  const checkApp = (app: string): boolean => {
    if (cliCommands[app]) {
      try {
        execSync(`which ${cliCommands[app]}`, { stdio: 'ignore' });
        return true;
      } catch { return false; }
    }
    if (macApps[app]) {
      return existsSync(macApps[app]);
    }
    return false;
  };

  const targetApps = appsToCheck || [...allApps];
  const installedApps = targetApps.filter(checkApp);

  return { success: true, data: { apps: installedApps } };
});
```

## 检测策略

- **CLI 应用**: 使用 `which <command>` 检查 CLI 命令是否存在
- **GUI 应用 (macOS)**: 检查 `/Applications` 目录中的 `.app` 包

## CLI 命令映射

| 应用 | 命令 |
|-----|------|
| cursor | `cursor` |
| vscode | `code` |
| vscode-insiders | `code-insiders` |
| zed | `zed` |
| windsurf | `windsurf` |
| antigravity | `agy` |

## macOS 应用路径

| 应用 | 路径 |
|-----|------|
| iterm | `/Applications/iTerm.app` |
| warp | `/Applications/Warp.app` |
| terminal | `/Applications/Utilities/Terminal.app` |
| finder | `/System/Applications/Finder.app` |
| sourcetree | `/Applications/Sourcetree.app` |
