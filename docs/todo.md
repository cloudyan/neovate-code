# TODO

- [x] commit
  - [ ] 增强意图识别
- [ ] review
- [ ] wiki
- [ ] evaluate
- [ ] language
- [ ] config 支持多层级

## 小提示

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

## 代理 (Agent) vs 工具 (Tool) 的核心区别

### 工具 (Tool)

1. 被动执行: 工具是被动的，只有在被调用时才执行
2. 单一功能: 通常专注于完成一个特定的任务
3. 无状态或简单状态: 工具通常不维护复杂的内部状态
4. 同步或异步执行: 执行完毕后返回结果
5. 受控执行: 工具的执行完全受调用者控制

### 代理 (Agent)

1. 主动行为: 代理可以主动决策和行动
2. 复合能力: 代理可以组合使用多个工具完成复杂任务
3. 复杂状态: 代理维护任务状态、上下文和历史
4. 自主决策: 代理可以根据环境变化做出决策
5. 持续交互: 代理可以与用户或其他代理持续交互

## 参考类似系统的实现

在类似 Neovate 这样的 AI 驱动开发工具中：

### 工具的典型实现 (如 Neovate 中的 Tool)

```js
// 工具是被动的函数式实现
export function createReadTool() {
  return createTool({
    name: 'read',
    description: 'Read a file from the filesystem',
    parameters: z.object({
      file_path: z.string()
    }),
    execute: async ({ file_path }) => {
      // 执行单一功能
      const content = await fs.readFile(file_path, 'utf-8');
      return { content };
    }
  });
}
```

### 代理的典型实现 (如真正的多代理系统)

```js
// 代理是主动的、有状态的实体
class SecurityAnalysisAgent {
  private state: AgentState;
  private tools: Tool[];

  constructor() {
    this.state = new AgentState();
    this.tools = [createReadTool(), createGrepTool()];
  }

  // 主动决策和执行
  async analyzeProject(projectPath: string) {
    // 1. 规划分析步骤
    const plan = await this.createAnalysisPlan(projectPath);

    // 2. 执行分析任务
    const results = [];
    for (const task of plan.tasks) {
      const result = await this.executeTask(task);
      results.push(result);
    }

    // 3. 整合和报告结果
    return this.generateReport(results);
  }

  private async executeTask(task: AnalysisTask) {
    // 根据任务类型选择合适的工具
    switch (task.type) {
      case 'file_scan':
        return await this.tools[0].execute({ file_path: task.path });
      case 'pattern_match':
        return await this.tools[1].execute({
          pattern: task.pattern,
          search_path: task.path
        });
    }
  }
}
```

## 在 Neovate 上下文中的实现差异

### 当前 Neovate 的实现 (工具模式)

```js
// 这是一个工具，被动执行
export function createCodeReviewTool(opts: { cwd: string }) {
  return createTool({
    name: 'code_review',
    // 当被调用时才执行
    execute: async (params) => {
      // 顺序执行各项分析
      const securityIssues = await analyzeSecurity(files);
      const performanceIssues = await analyzePerformance(files);
      // ...
      return results;
    }
  });
}
```

### 真正的多代理实现应该像这样

```js
// 这是一个代理，主动管理多个分析任务
class CodeReviewAgent {
  private agents: Map<string, AnalysisAgent>;
  private coordinator: AgentCoordinator;

  constructor() {
    // 创建多个专门的分析代理
    this.agents = new Map([
      ['security', new SecurityAnalysisAgent()],
      ['performance', new PerformanceAnalysisAgent()],
      ['quality', new QualityAnalysisAgent()],
      ['architecture', new ArchitectureAnalysisAgent()]
    ]);

    this.coordinator = new AgentCoordinator();
  }

  // 主动协调多个代理完成代码审查
  async reviewCode(files: string[]) {
    // 1. 任务分发 - 将文件分发给不同的代理
    const tasks = this.distributeTasks(files);

    // 2. 并行执行 - 各代理并行分析
    const promises = [];
    for (const [agentType, agent] of this.agents) {
      if (tasks[agentType]) {
        promises.push(
          agent.analyze(tasks[agentType])
            .catch(error => this.handleAgentFailure(agentType, error))
        );
      }
    }

    // 3. 结果聚合
    const results = await Promise.all(promises);
    return this.aggregateResults(results);
  }

  private distributeTasks(files: string[]) {
    // 智能分发任务给不同的代理
    // 可以根据文件类型、大小、复杂度等因素分配
  }
}
```

## 总结

在 Neovate 当前的实现中：

* 工具是被动的、单一功能的执行单元
* 缺少真正的代理概念，即主动决策、有状态、能够协调多个工具的智能实体

要实现真正的多代理系统，需要：

1. 创建专门的代理类来管理分析任务
2. 实现代理间的通信和协调机制
3. 建立任务分发和结果聚合系统
4. 添加状态管理和自主决策能力

这样，代码审查就不是一个被动的工具，而是一个能够主动协调多个专门代理完成复杂任务的智能系统。


## Shell 模式

当前实现的问题

1. **不是真正的 shell 模式**：命令不会自动在本地执行
2. **需要明确的前缀**：用户必须记住使用 `!` 前缀
3. **依赖 AI 决策**：是否执行命令取决于 AI 是否选择使用 bash 工具
4. **安全性考虑不足**：没有在本地沙盒中执行命令的机制

代码库 AST 相关信息，如何在上下文中产生价值
