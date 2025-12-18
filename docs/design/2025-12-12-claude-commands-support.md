# Claude 命令目录支持

**日期：** 2025-12-12

## 背景

当前斜线命令系统从以下位置加载自定义命令：
- `~/.{productName}/commands/`（全局用户命令）
- `./{cwd}/.{productName}/commands/`（项目级命令）

为了提高与 Claude 生态系统的兼容性，我们希望也支持从 `.claude/commands` 和 `~/.claude/commands` 目录加载命令。这允许用户在不同的 Claude 兼容工具之间共享命令文件。

## 讨论

### 探索的关键问题

**Q: `.claude/commands` 应该如何与现有命令源相关？**

考虑了三个选项：
- **A) 替换** — 仅使用 `.claude/commands`，移除产品特定路径
- **B) 添加** — 同时包含 `.claude/commands` AND `.{productName}/commands` 作为源 ✅ **已选择**
- **C) 可配置** — 让用户通过配置选择要使用的路径

选择了选项B以在添加Claude生态系统支持的同时保持向后兼容性。

**Q: 当同一命令存在于多个位置时，应使用什么优先级顺序？**

同意的优先级（后面的源覆盖前面的）：
1. 内置命令
2. 插件命令
3. `~/.claude/commands/`（全局claude）
4. `~/.{productName}/commands/`（全局产品）
5. `.claude/commands/`（项目claude）
6. `.{productName}/commands/`（项目产品）

理由：项目级覆盖全局，产品特定覆盖通用。

### 考虑的方法

| 方法 | 描述 | 复杂度 | 优点 | 缺点 |
|----------|-------------|------------|------|------|
| **A: 最小内联** ✅ | 在构造函数中直接添加路径 | 低 | ~15-20行，易于理解 | `.claude` 字符串硬编码 |
| **B: 可配置路径** | 在Paths类中添加 `getCommandPaths()` | 中等 | 更清晰的分离，可扩展 | 更多重构 |
| **C: 命令加载器抽象** | 创建CommandLoader接口 | 高 | 最可扩展 | 过度工程化（YAGNI） |

选择了方法A以简化实现。

## 方法

修改 `SlashCommandManager` 从6个源而不是4个加载命令，通过在构造函数中内联添加Claude特定路径。现有的 `#loadGlobal()` 和 `#loadProject()` 方法在不修改的情况下重用。

## 架构

### 更改的文件

- `src/slashCommand.ts` — 主要实现更改

### 代码更改

**1. 修改构造函数以加载6个源：**
```typescript
// 3. 全局 (.claude)
const globalClaude = this.#loadGlobal(
  path.join(path.dirname(opts.paths.globalConfigDir), '.claude', 'commands'),
);
globalClaude.forEach((command) => {
  commands.set(command.command.name, command);
});

// 4. 全局 (.{productName})
const global = this.#loadGlobal(path.join(opts.paths.globalConfigDir, 'commands'));
global.forEach((command) => {
  commands.set(command.command.name, command);
});

// 5. 项目 (.claude)
const projectClaude = this.#loadProject(
  path.join(path.dirname(opts.paths.projectConfigDir), '.claude', 'commands'),
);
projectClaude.forEach((command) => {
  commands.set(command.command.name, command);
});

// 6. 项目 (.{productName})
const project = this.#loadProject(path.join(opts.paths.projectConfigDir, 'commands'));
project.forEach((command) => {
  commands.set(command.command.name, command);
});
```

`.claude` 路径从现有的 `globalConfigDir` 和 `projectConfigDir` 使用 `path.dirname()` 衍生，向上一级目录，然后与 `.claude/commands` 连接。这避免了添加新参数或导入。

### 错误处理

- `loadPolishedMarkdownFiles()` 已经优雅地处理缺失目录（返回空数组）
- 不需要额外的错误处理

### 边界情况

| 情况 | 行为 |
|------|----------|
| `.claude/commands` 不存在 | 静默忽略 |
| 同一命令在多个位置 | 后面的源胜出（正确优先级） |
| 空目录 | 从该源不加载命令 |

### 描述显示

- 来自 `~/.claude/commands/` 的命令显示为 `(global)`
- 来自 `.claude/commands/` 的命令显示为 `(project)`
- 由现有的 `#loadGlobal` 和 `#loadProject` 方法处理
