# runNeovate 函数详解

> 文件位置: `src/index.ts:259`

`runNeovate` 是整个 Neovate Code CLI 应用的核心入口函数，负责路由和分发不同的执行模式。它是理解整个应用架构的最佳起点。

---

## 函数签名

```typescript
export async function runNeovate(opts: {
  productName: string;        // 产品名称 (如 "Neovate")
  productASCIIArt?: string;   // ASCII 艺术字
  version: string;            // 版本号
  plugins: Plugin[];          // 插件列表
  upgrade?: UpgradeOptions;   // 升级配置
}): Promise<void>
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `productName` | string | ✅ | 产品名称，用于显示和配置路径 |
| `productASCIIArt` | string | ❌ | 启动时显示的 ASCII 艺术字 |
| `version` | string | ✅ | 当前版本号 |
| `plugins` | Plugin[] | ✅ | 插件数组，可以为空 |
| `upgrade` | UpgradeOptions | ❌ | 自动更新配置 |

---

## 执行流程概览

```
┌──────────────────────────────────────────────────────────────┐
│                      runNeovate()                            │
└──────────────┬───────────────────────────────────────────────┘
               │
               ├─ 1. 初始化阶段
               │   ├─ 清除追踪处理器
               │   ├─ 解析命令行参数
               │   └─ 获取工作目录
               │
               ├─ 2. 配置准备阶段
               │   ├─ 解析 MCP 配置
               │   └─ 构建上下文配置对象
               │
               ├─ 3. 路由分发阶段
               │   ├─ servernext 命令
               │   ├─ 子命令 (config/commit/mcp/run/update)
               │   ├─ --help / --version 标志
               │   ├─ --quiet 模式 → runQuiet()
               │   └─ 默认交互模式 → runInteractive()
               │
               └─ 4. 执行对应模式的处理逻辑
```

---

## 详细步骤拆解

### 1. 初始化阶段 (L266-269)

```typescript
// 清除 OpenAI agents 的追踪处理器
setTraceProcessors([]);

// 解析命令行参数 (使用 yargs-parser)
const argv = await parseArgs(process.argv.slice(2));

// 获取工作目录
const cwd = argv.cwd || process.cwd();
```

#### 关键点

- **`setTraceProcessors([])`**: 清空 `@openai/agents` 的追踪处理器，避免不必要的日志输出
- **`process.argv.slice(2)`**: 跳过 Node 可执行文件路径和脚本路径
- **工作目录**: 支持通过 `--cwd` 参数指定，否则使用当前目录

#### parseArgs 函数

位于 `src/index.ts:61-99`，负责解析命令行参数：

```typescript
// 支持的参数类型
interface Argv {
  _: string[];               // 位置参数
  help: boolean;            // -h, --help
  version: boolean;         // -v, --version
  quiet: boolean;           // -q, --quiet
  continue?: boolean;       // -c, --continue
  model?: string;           // -m, --model
  planModel?: string;       // --plan-model
  resume?: string;          // -r, --resume
  cwd?: string;             // --cwd
  systemPrompt?: string;    // --system-prompt
  outputFormat?: string;    // --output-format
  outputStyle?: string;     // --output-style
  approvalMode?: string;    // --approval-mode
  plugin: string[];         // --plugin (可多次使用)
  mcpConfig: string[];      // --mcp-config (可多次使用)
  // ... 更多参数
}
```

---

### 2. 配置准备阶段 (L271-293)

#### 2.1 解析 MCP 配置 (L271-272)

```typescript
const mcpServers = parseMcpConfig(argv.mcpConfig || [], cwd);
```

**MCP (Model Context Protocol)** 配置解析，支持两种方式：

1. **JSON 字符串**:
   ```bash
   neovate --mcp-config '{"mcpServers": {"server1": {...}}}'
   ```

2. **文件路径**:
   ```bash
   neovate --mcp-config ./mcp-config.json
   ```

#### 2.2 构建上下文配置 (L274-293)

```typescript
const contextCreateOpts = {
  // 产品信息
  productName: opts.productName,
  productASCIIArt: opts.productASCIIArt,
  version: opts.version,

  // 命令行参数配置
  argvConfig: {
    model: argv.model,                    // AI 模型
    planModel: argv.planModel,            // 计划模式专用模型
    quiet: argv.quiet,                    // 安静模式标志
    outputFormat: argv.outputFormat,      // 输出格式 (text/json/stream-json)
    plugins: argv.plugin,                 // 额外插件路径
    systemPrompt: argv.systemPrompt,      // 自定义系统提示词
    appendSystemPrompt: argv.appendSystemPrompt, // 追加系统提示词
    language: argv.language,              // 语言设置
    outputStyle: argv.outputStyle,        // 输出样式
    approvalMode: argv.approvalMode,      // 工具审批模式
    mcpServers,                           // MCP 服务器配置
    browser: argv.browser,                // 浏览器集成
  },

  // 插件列表
  plugins: opts.plugins,
};
```

**设计亮点**:
- 将所有配置集中到一个对象
- 便于传递和扩展
- 清晰区分产品配置和用户配置

---

### 3. 路由分发阶段

#### 3.1 Server Next 模式 (L296-302)

```typescript
const command = argv._[0]; // 获取第一个位置参数
if (command === 'servernext') {
  await runServerNext({
    contextCreateOpts,
  });
  return;
}
```

**用途**: 启动服务器模式，提供：
- HTTP API 接口
- WebSocket 实时通信
- Web UI 界面支持

**调用示例**:
```bash
neovate servernext
```

---

#### 3.2 子命令处理 (L303-339)

```typescript
const validCommands = ['config', 'commit', 'mcp', 'run', 'server', 'update'];

if (validCommands.includes(command)) {
  // 创建全局上下文
  const context = await Context.create({
    cwd,
    ...contextCreateOpts,
  });

  // 根据命令动态加载并执行
  switch (command) {
    case 'config': {
      const { runConfig } = await import('./commands/config');
      await runConfig(context);
      break;
    }

    case 'mcp': {
      const { runMCP } = await import('./commands/mcp');
      await runMCP(context);
      break;
    }

    case 'run': {
      const { runRun } = await import('./commands/run');
      await runRun(context);
      break;
    }

    case 'commit': {
      const { runCommit } = await import('./commands/commit');
      await runCommit(context);
      break;
    }

    case 'update': {
      const { runUpdate } = await import('./commands/update');
      await runUpdate(context, opts.upgrade);
      break;
    }

    default:
      throw new Error(`Unsupported command: ${command}`);
  }
  return;
}
```

##### 子命令说明

| 命令 | 文件 | 功能 |
|------|------|------|
| `config` | `commands/config.ts` | 配置管理 (查看/编辑配置) |
| `commit` | `commands/commit.ts` | AI 辅助 Git 提交 |
| `mcp` | `commands/mcp.ts` | MCP 服务器管理 |
| `run` | `commands/run.ts` | 运行自定义命令 |
| `update` | `commands/update.ts` | 检查和应用更新 |

##### 设计亮点

**懒加载优化**: 使用动态 `import()` 实现按需加载
- ✅ 减少启动时间
- ✅ 降低内存占用
- ✅ 只加载实际需要的模块

**调用示例**:
```bash
neovate config          # 配置管理
neovate commit          # Git 提交
neovate mcp list        # 列出 MCP 服务器
neovate update          # 检查更新
```

---

#### 3.3 Help 和 Version 标志 (L341-348)

```typescript
if (argv.help) {
  printHelp(opts.productName.toLowerCase());
  return;
}

if (argv.version) {
  console.log(opts.version);
  return;
}
```

**简单直接的信息输出**:

```bash
neovate --help     # 显示帮助信息
neovate -h         # 简写形式

neovate --version  # 显示版本号
neovate -v         # 简写形式
```

`printHelp` 函数位于 `src/index.ts:101-139`，输出使用说明。

---

#### 3.4 Quiet 模式 - 非交互式执行 (L350-360)

```typescript
if (argv.quiet) {
  // 创建上下文
  const context = await Context.create({
    cwd,
    ...contextCreateOpts,
  });

  // 触发插件的 initialized 钩子
  await context.apply({
    hook: 'initialized',
    args: [{ cwd, quiet: true }],
    type: PluginHookType.Series,  // 串行执行插件钩子
  });

  // 执行安静模式逻辑
  await runQuiet(argv, context);
}
```

##### Quiet 模式特点

- ✅ **非交互式**: 无 UI，适合脚本调用
- ✅ **直接执行**: 执行任务后输出结果并退出
- ✅ **插件支持**: 仍然触发插件钩子
- ✅ **输出控制**: 可配合 `--output-format` 输出 JSON

##### 调用示例

```bash
# 非交互式执行任务
neovate -q "创建一个 hello.txt 文件"

# 指定模型
neovate -q -m gpt-4o "分析这段代码"

# JSON 输出
neovate -q --output-format json "列出所有文件"
```

##### runQuiet 函数

位于 `src/index.ts:141-193`，处理安静模式的执行逻辑：

```typescript
async function runQuiet(argv: Argv, context: Context) {
  // 1. 获取提示词
  let input = String(argv._[0]);

  // 2. 处理 slash 命令
  if (isSlashCommand(input)) {
    const parsed = parseSlashCommand(input);
    // ... 转换为普通提示词
  }

  // 3. 恢复会话（如果指定）
  let sessionId = argv.resume;
  if (argv.continue) {
    sessionId = context.paths.getLatestSessionId();
  }

  // 4. 创建项目实例并发送消息
  const project = new Project({ context, sessionId });
  await project.send(input, {
    model,
    onToolApprove: () => Promise.resolve(true), // 自动批准所有工具
  });

  process.exit(0);
}
```

---

#### 3.5 交互模式 - 默认模式 (L361-378)

```typescript
else {
  let upgrade = opts.upgrade;

  // 升级功能的条件判断

  // 1. 环境变量禁用自动更新
  if (process.env.NEOVATE_SELF_UPDATE === 'none') {
    upgrade = undefined;
  }

  // 2. 非全局安装不自动更新
  if (upgrade && !upgrade.installDir.includes('node_modules')) {
    upgrade = undefined;
  }

  // 3. 预发布版本不自动更新
  if (
    upgrade?.version.includes('-beta.') ||
    upgrade?.version.includes('-alpha.') ||
    upgrade?.version.includes('-rc.') ||
    upgrade?.version.includes('-canary.')
  ) {
    upgrade = undefined;
  }

  // 执行交互模式
  await runInteractive(argv, contextCreateOpts, cwd, upgrade);
}
```

##### 升级策略说明

| 条件 | 说明 | 是否提供更新 |
|------|------|-------------|
| 环境变量 `NEOVATE_SELF_UPDATE=none` | 用户明确禁用 | ❌ |
| 安装目录不含 `node_modules` | 开发模式 | ❌ |
| 版本包含 beta/alpha/rc/canary | 预发布版本 | ❌ |
| 全局安装的正式版本 | 正常使用 | ✅ |

##### runInteractive 函数

位于 `src/index.ts:195-257`，处理交互模式：

```typescript
async function runInteractive(
  argv: Argv,
  contextCreateOpts: any,
  cwd: string,
  upgrade?: UpgradeOptions,
) {
  // 1. 创建 UIBridge 和 NodeBridge
  const appStore = useAppStore.getState();
  const uiBridge = new UIBridge({ appStore });
  const nodeBridge = new NodeBridge({ contextCreateOpts });

  // 2. 创建通信通道
  const [uiTransport, nodeTransport] = DirectTransport.createPair();
  uiBridge.messageBus.setTransport(uiTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  // 3. 初始化路径管理
  const paths = new Paths({
    productName: contextCreateOpts.productName,
    cwd,
  });

  // 4. 确定会话 ID
  const sessionId = (() => {
    if (argv.resume) {
      return argv.resume;              // 恢复指定会话
    }
    if (argv.continue) {
      return paths.getLatestSessionId(); // 继续最新会话
    }
    return Session.createSessionId();   // 创建新会话
  })();

  // 5. 加载会话消息和历史
  const [messages, history] = (() => {
    const logPath = paths.getSessionLogPath(sessionId);
    const messages = loadSessionMessages({ logPath });
    const globalData = new GlobalData({
      globalDataPath: paths.getGlobalDataPath(),
    });
    const history = globalData.getProjectHistory({ cwd });
    return [messages, history];
  })();

  // 6. 初始化应用状态
  const initialPrompt = String(argv._[0] || '');
  await appStore.initialize({
    bridge: uiBridge,
    cwd,
    initialPrompt,
    sessionId,
    logFile: paths.getSessionLogPath(sessionId),
    messages,
    history,
    upgrade,
  });

  // 7. 渲染 Ink UI
  render(React.createElement(App), {
    patchConsole: true,      // 捕获 console 输出
    exitOnCtrlC: false,      // 自定义 Ctrl+C 处理
  });

  // 8. 注册退出信号处理
  const exit = () => {
    process.exit(0);
  };
  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
}
```

##### 交互模式特点

- ✅ **Ink + React UI**: 丰富的终端交互界面
- ✅ **会话管理**: 支持创建/恢复/继续会话
- ✅ **实时交互**: 用户可以批准/拒绝工具调用
- ✅ **历史记录**: 保存所有对话历史
- ✅ **自动更新**: 检测新版本并提示更新

##### 调用示例

```bash
# 启动交互模式
neovate

# 带初始提示词启动
neovate "帮我重构这个函数"

# 恢复指定会话
neovate --resume abc123

# 继续最新会话
neovate --continue
neovate -c

# 指定模型启动
neovate -m gpt-4o
```

---

## 核心设计模式

### 1. 策略模式 (Strategy Pattern)

根据参数和命令选择不同的执行策略：

```
runNeovate
    ├─ ServerNext 策略
    ├─ 子命令策略 (config/commit/mcp/run/update)
    ├─ Quiet 策略
    └─ Interactive 策略 (默认)
```

**优点**:
- 各策略独立，易于维护
- 添加新模式无需修改现有代码
- 清晰的职责分离

---

### 2. 依赖注入 (Dependency Injection)

通过 `contextCreateOpts` 集中管理依赖配置：

```typescript
const contextCreateOpts = {
  productName,
  version,
  argvConfig: { /* ... */ },
  plugins,
};

// 传递给各个模块
Context.create({ cwd, ...contextCreateOpts });
```

**优点**:
- 配置集中管理
- 便于测试和扩展
- 降低模块间耦合

---

### 3. 懒加载 (Lazy Loading)

子命令使用动态 `import()`：

```typescript
case 'config': {
  const { runConfig } = await import('./commands/config');
  await runConfig(context);
  break;
}
```

**优点**:
- 减少启动时间
- 降低初始内存占用
- 按需加载模块

---

### 4. 桥接模式 (Bridge Pattern)

UI 和 Node 通过 MessageBus 解耦：

```typescript
const [uiTransport, nodeTransport] = DirectTransport.createPair();
uiBridge.messageBus.setTransport(uiTransport);
nodeBridge.messageBus.setTransport(nodeTransport);
```

**优点**:
- UI 和业务逻辑分离
- 支持不同传输方式
- 易于扩展和测试

---

## 执行流程图

```
用户执行: neovate [command] [options]
            ↓
      runNeovate()
            ↓
   ┌────────┴────────┐
   │  解析参数       │
   │  parseArgs()    │
   └────────┬────────┘
            ↓
   ┌────────┴────────┐
   │  解析 MCP 配置  │
   │  parseMcpConfig()│
   └────────┬────────┘
            ↓
   ┌────────┴────────┐
   │  构建上下文配置  │
   │  contextCreateOpts│
   └────────┬────────┘
            ↓
   ┌────────┴────────┐
   │   路由分发      │
   └────────┬────────┘
            │
    ┌───────┼───────┬─────────┬─────────┬─────────┐
    ↓       ↓       ↓         ↓         ↓         ↓
servernext 子命令  --help  --version --quiet  交互模式
    ↓       ↓       ↓         ↓         ↓         ↓
启动服务器 动态加载 打印    打印    创建     创建UI
WebSocket 执行命令 帮助    版本   Context  渲染Ink
    ↓       ↓       ↓         ↓         ↓         ↓
   返回    返回    返回      返回   runQuiet runInteractive
                                      ↓         ↓
                                   直接执行   用户交互
                                      ↓         ↓
                                    退出      会话循环
```

---

## 核心依赖关系

```typescript
runNeovate
  │
  ├─ parseArgs()              // 参数解析
  │   └─ yargs-parser         // 第三方库
  │
  ├─ parseMcpConfig()         // MCP 配置解析
  │   └─ mcp.ts
  │
  ├─ Context.create()         // 上下文创建
  │   ├─ ConfigManager        // 配置管理
  │   ├─ PluginManager        // 插件管理
  │   ├─ McpManager           // MCP 管理
  │   └─ Paths                // 路径管理
  │
  ├─ runServerNext()          // 服务器模式
  │   ├─ Fastify              // Web 服务器
  │   └─ WebSocket            // 实时通信
  │
  ├─ commands/                // 子命令模块
  │   ├─ runConfig()
  │   ├─ runMCP()
  │   ├─ runRun()
  │   ├─ runCommit()
  │   └─ runUpdate()
  │
  ├─ runQuiet()               // 安静模式
  │   ├─ Project              // 项目管理
  │   └─ Session              // 会话管理
  │
  └─ runInteractive()         // 交互模式
      ├─ UIBridge             // UI 桥接
      ├─ NodeBridge           // Node 桥接
      ├─ DirectTransport      // 通信通道
      ├─ Session              // 会话管理
      ├─ GlobalData           // 全局数据
      └─ render(App)          // Ink UI 渲染
          └─ App.tsx          // 主应用组件
```

---

## 关键代码片段

### Context 创建

```typescript
const context = await Context.create({
  cwd,                          // 工作目录
  productName: opts.productName,
  version: opts.version,
  argvConfig: {
    model: argv.model,
    // ... 更多配置
  },
  plugins: opts.plugins,
});
```

**Context 的作用**:
- 全局依赖注入容器
- 管理配置、插件、MCP 服务器
- 提供统一的资源访问接口

---

### 插件钩子触发

```typescript
await context.apply({
  hook: 'initialized',              // 钩子名称
  args: [{ cwd, quiet: true }],     // 传递给钩子的参数
  type: PluginHookType.Series,      // 执行类型：串行
});
```

**插件钩子类型**:
- `initialized`: 初始化完成
- `beforeSend`: 发送消息前
- `afterReceive`: 接收消息后
- 更多钩子见 `src/plugin.ts`

---

### 会话 ID 确定逻辑

```typescript
const sessionId = (() => {
  if (argv.resume) {
    return argv.resume;              // --resume abc123
  }
  if (argv.continue) {
    return paths.getLatestSessionId(); // --continue
  }
  return Session.createSessionId();   // 新会话
})();
```

**会话策略**:
- 恢复指定会话: `--resume <session-id>`
- 继续最新会话: `--continue` 或 `-c`
- 创建新会话: 默认行为

---

## 常见使用场景

### 1. 普通交互使用

```bash
# 启动交互模式
neovate

# 带初始提示词
neovate "帮我写一个排序函数"
```

### 2. 脚本自动化

```bash
# 非交互式执行
neovate -q "运行测试并生成报告"

# JSON 输出，便于解析
neovate -q --output-format json "列出所有 TODO"
```

### 3. 会话管理

```bash
# 继续上次会话
neovate -c

# 恢复特定会话
neovate --resume 20250114-abc123
```

### 4. 配置管理

```bash
# 查看配置
neovate config

# 管理 MCP 服务器
neovate mcp list
neovate mcp add my-server
```

### 5. Git 集成

```bash
# AI 辅助提交
neovate commit
```

### 6. 自定义模型和插件

```bash
# 指定模型
neovate -m gpt-4o

# 加载插件
neovate --plugin ./my-plugin.ts
```

---

## 调试技巧

### 1. 启用调试日志

```bash
# 显示所有调试信息
DEBUG=neovate* neovate

# 只显示特定模块
DEBUG=neovate:tool* neovate
DEBUG=neovate:llm* neovate
```

### 2. 查看会话日志

```bash
# 日志文件位置
~/.neovate/projects/<project-hash>/sessions/<session-id>.jsonl

# 查看最新会话
ls -lt ~/.neovate/projects/*/sessions/ | head -n 2
```

### 3. VSCode 断点调试

在 `runNeovate` 函数设置断点：
1. 按 `⌘+⇧+D` (Mac) 或 `Ctrl+Shift+D` (Windows/Linux)
2. 选择 "Debug cli" 配置
3. 启动调试

### 4. 打印配置信息

在代码中添加：
```typescript
console.log('contextCreateOpts:', JSON.stringify(contextCreateOpts, null, 2));
```

---

## 常见问题

### Q1: 为什么需要清除追踪处理器？

```typescript
setTraceProcessors([]);
```

**原因**: `@openai/agents` 默认会输出大量追踪日志，影响用户体验。清空处理器可以禁用这些日志。

---

### Q2: 为什么使用动态 import？

```typescript
const { runConfig } = await import('./commands/config');
```

**原因**:
- 减少启动时间（只加载需要的模块）
- 降低内存占用
- 支持按需编译（使用 Bun 时）

---

### Q3: 升级策略为什么这么复杂？

```typescript
if (upgrade?.version.includes('-beta.')) {
  upgrade = undefined;
}
```

**原因**:
- 开发版本不应提示更新
- 预发布版本用户可能想保持在该版本
- 本地开发时避免误更新

---

### Q4: 为什么要创建两个 Bridge？

```typescript
const uiBridge = new UIBridge({ appStore });
const nodeBridge = new NodeBridge({ contextCreateOpts });
```

**原因**:
- **UIBridge**: 处理 UI 相关逻辑（Ink/React）
- **NodeBridge**: 处理业务逻辑（AI 交互、文件操作）
- **解耦**: 两者通过 MessageBus 通信，互不依赖

---

### Q5: 会话 ID 的格式是什么？

```typescript
Session.createSessionId()
// 返回格式: "20250114-abc123"
```

**格式**: `YYYYMMDD-随机字符串`
- 日期部分便于查找
- 随机部分保证唯一性

---

## 扩展建议

### 1. 添加新的子命令

在 `src/commands/` 创建新文件：

```typescript
// src/commands/my-command.ts
export async function runMyCommand(context: Context) {
  // 实现命令逻辑
}
```

在 `runNeovate` 中注册：

```typescript
const validCommands = [..., 'my-command'];
case 'my-command': {
  const { runMyCommand } = await import('./commands/my-command');
  await runMyCommand(context);
  break;
}
```

---

### 2. 添加新的命令行参数

修改 `parseArgs` 函数：

```typescript
interface Argv {
  // ... 现有参数
  myOption?: string;  // 新增参数
}

const args = yargsParser(argv, {
  string: ['myOption'],  // 声明参数类型
});
```

在 `contextCreateOpts` 中使用：

```typescript
argvConfig: {
  // ... 现有配置
  myOption: argv.myOption,
}
```

---

### 3. 添加新的执行模式

实现新的 `run*` 函数：

```typescript
async function runMyMode(argv: Argv, context: Context) {
  // 实现新模式逻辑
}
```

在 `runNeovate` 中添加路由：

```typescript
if (argv.myMode) {
  await runMyMode(argv, context);
  return;
}
```

---

## 总结

`runNeovate` 是一个精心设计的**路由分发器**，具有以下特点：

### 核心职责

1. ✅ **参数解析**: 统一处理命令行参数
2. ✅ **配置准备**: 构建上下文配置对象
3. ✅ **路由分发**: 根据参数选择执行模式
4. ✅ **依赖注入**: 传递配置给各个模块

### 设计优势

1. ✅ **清晰的职责分离**: 只负责路由，具体逻辑委托给专门模块
2. ✅ **灵活的配置管理**: 统一收集配置，便于传递和扩展
3. ✅ **智能的更新策略**: 根据安装方式和版本类型决定是否提供更新
4. ✅ **懒加载优化**: 动态导入减少启动时间
5. ✅ **完善的模式支持**: 服务器/交互/安静/子命令多种模式
6. ✅ **良好的扩展性**: 易于添加新命令和模式

### 学习建议

1. **从这个函数开始**: 理解整体架构
2. **顺着分支深入**: 选择感兴趣的模式深入学习
3. **关注设计模式**: 学习策略、依赖注入、桥接等模式的应用
4. **调试实践**: 通过调试加深理解

**最佳起点**: 从 `runNeovate` 开始，可以快速建立对整个项目的全局认知！🚀

---

## 相关文件

- **入口**: `src/cli.ts`
- **核心**: `src/index.ts`
- **子命令**: `src/commands/*`
- **上下文**: `src/context.ts`
- **会话**: `src/session.ts`
- **项目**: `src/project.ts`
- **UI**: `src/ui/App.tsx`

---

## 参考资源

- [源码学习指南](./learn.md)
- [贡献指南](../CONTRIBUTING.md)
- [架构说明](../AGENTS.md)
