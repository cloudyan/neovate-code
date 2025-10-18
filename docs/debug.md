# Debug

你不需要手动配置 `.vscode/launch.json` 来调试 Neovate。项目已经内置了调试支持，可以直接使用以下方式：

1. VSCode 调试：
    1. 打开项目根目录
    2. 按 `F5` 或点击运行和调试面板中的 "Debug CLI"
    3. 这会自动使用 `tsx ./src/cli.ts` 启动调试会话

    需要安装依赖 `pnpm i -g tsx`

    ```json
    {
      "version": "0.2.0",
      "configurations": [
        {
          "type": "node",
          "request": "launch",
          "name": "Debug cli",
          "program": "${workspaceFolder}/src/cli.ts",
          "args": [],
          "runtimeExecutable": "tsx",
          "runtimeArgs": [],
          "skipFiles": ["<node_internals>/**"],
          "console": "integratedTerminal",
          "sourceMaps": true
        }
      ]
    }
    ```

2. 命令行调试：
    `tsx ./src/cli.ts`
3. 浏览器调试（如果需要）：
    `tsx ./src/cli.ts --server`
    然后在浏览器中打开 `http://localhost:3000`

项目的调试配置已经在 `package.json` 和 VSCode 的默认配置中设置好了，无需额外操作。

## 开发

```bash
pnpm i

npm run dev

# 改变工作目录
npm run dev -- --cwd /path/to/your/directory
# or
bun ./src/cli.ts --cwd /path/to/your/directory
```
