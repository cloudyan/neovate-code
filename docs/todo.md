# TODO

```bash
入门提示：
1. 提问、编辑文件或运行命令。
2. 具体描述可获得更好的结果。
3. 通过 /init 命令创建 IFLOW.md 文件，然后自定义与 iFlow 的交互。
4. /help 获取更多信息。
5. 默认启用 Yolo 模式。如需每次操作都确认，请使用 ctrl+y 禁用。
6. 输入 /docs 查看文档，/demo 快速演示。

※ 小贴士: 使用 ! 直接执行 shell 命令


```

其他

```bash
※ Tip: Use /memory to manage AI instructions
※ Tip: Use ! to execute shell commands directly
※ Tip: Use /compress to save tokens by summarizing context
※ Tip: Use /mcp to manage external tool servers
※ Tip: Use @ to include file contents in your prompt
※ Tip: Use /tools to view available tools
※ Tip: Use Ctrl+L to clear screen anytime
※ Tip: Use /stats to check session statistics
```

/help

```bash
基础操作:                                                                                              │
│ 添加上下文: 使用 @ 来指定上下文文件（例如，@src/myFile.ts）以针对特定文件或文件夹。                    │
│ Shell 模式: 通过 ! 执行 shell 命令（例如，!npm run start）或使用自然语言（例如 start server）。        │
│                                                                                                        │
│ 命令:                                                                                                  │
│  /about - show version info                                                                            │
│  /language - change the language                                                                       │
│    zh-CN - 简体中文                                                                                    │
│    en-US - English                                                                                     │
│  /agents - Commands for interacting with agents.                                                       │
│    list - List available agents.                                                                       │
│    refresh - Refresh agents from source files.                                                         │
│    online - Browse and install agents from online repository                                           │
│    install - Install a new agent with guided setup                                                     │
│  /auth - change the auth method                                                                        │
│  /bug - submit a bug report                                                                            │
│  /chat - Manage conversation history.                                                                  │
│    list - List saved conversation checkpoints                                                          │
│    save - Save the current conversation as a checkpoint. Usage: /chat save <tag>                       │
│    resume - Resume a conversation from a checkpoint. Usage: /chat resume <tag>                         │
│    delete - Delete a conversation checkpoint. Usage: /chat delete <tag>                                │
│  /clear - clear the screen and conversation history                                                    │
│  /commands - Manage marketplace commands: list local, browse online, get details, add/remove from CLI  │
│ (project/global scope)                                                                                 │
│    list - List locally installed commands from project and global scopes                               │
│    online - Browse available commands from online marketplace in an interactive dialog                 │
│    get - Get details about a specific command by ID                                                    │
│    add - Add a specific command by ID to local CLI (use --scope global for system-wide install)        │
│    remove - Remove a locally installed command (use --scope global to remove from global)              │
│  /compress - Compresses the context by replacing it with a summary. (aliases: /compact, /summarize)    │
│  /copy - Copy the last result or code snippet to clipboard                                             │
│  /corgi - Toggles corgi mode.                                                                          │
│  /demo - Interactive task for research and brainstorming workflows                                     │
│  /docs - open full iFlow CLI documentation in your browser                                             │
│  /directory - Manage workspace directories                                                             │
│    add - Add directories to the workspace. Use comma to separate multiple paths                        │
│    show - Show all directories in the workspace                                                        │
│  /editor - set external editor preference                                                              │
│  /export - Export conversation history                                                                 │
│    clipboard - Copy the conversation to your system clipboard                                          │
│    file - Save the conversation to a file in the current directory                                     │
│  /extensions - list active extensions                                                                  │
│  /help - for help on iflow-cli                                                                         │
│  /ide - manage IDE connection                                                                          │
│  /init - Analyzes the project and creates or updates a tailored IFLOW.md file.                         │
│  /log - show current session log storage location                                                      │
│  /mcp - list configured MCP servers and tools, browse online repository, or authenticate with          │
│ OAuth-enabled servers                                                                                  │
│    list - Interactive list of configured MCP servers and tools                                         │
│    auth - Authenticate with an OAuth-enabled MCP server                                                │
│    online - Browse and install MCP servers from online repository                                      │
│    refresh - Refresh the list of MCP servers and tools, and reload settings files                      │
│  /memory - Commands for interacting with memory.                                                       │
│    show - Show the current memory contents.                                                            │
│    add - Add content to the memory.                                                                    │
│    refresh - Refresh the memory from the source.                                                       │
│  /model - change the model                                                                             │
│  /output-style - change your output style preferences (use --scope global for global settings)         │
│  /output-style:new - use '/output-style:new <description>' to create a custom output style             │
│  /quit - exit the cli                                                                                  │
│  /resume - Resume a previous conversation from history                                                 │
│  /stats - check session stats. Usage: /stats [model|tools]                                             │
│    model - Display model usage statistics                                                              │
│    tools - Display tool usage statistics                                                               │
│  /theme - change the theme                                                                             │
│  /tools - list available iFlow CLI tools                                                               │
│  /vim - toggle vim mode on/off                                                                         │
│  /setup-github - Set up GitHub Actions                                                                 │
│  ! - shell 命令                                                                                        │
│                                                                                                        │
│ 键盘快捷键:                                                                                            │
│ Alt+Left/Right - 在输入中跳转单词                                                                      │
│ Ctrl+C - 退出应用程序                                                                                  │
│ Ctrl+J - 新行                                                                                          │
│ Ctrl+L - 清除屏幕                                                                                      │
│ Ctrl+X / Meta+Enter - 在外部编辑器中打开输入                                                           │
│ Ctrl+Y - 切换 YOLO 模式                                                                                │
│ Enter - 发送消息                                                                                       │
│ Esc - 取消操作                                                                                         │
│ Shift+Tab / Alt+M - 切换模式                                                                           │
│ Up/Down - 循环浏览您的提示历史                                                                         │
│                                                                                                        │
│ 完整的快捷键列表，请查看 docs/keyboard-shortcuts.md
```
