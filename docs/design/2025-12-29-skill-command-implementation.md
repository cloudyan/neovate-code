# Skill 命令实现

## 摘要

添加 `neovate skill` CLI 命令，包含三个子命令：`add`、`list` 和 `remove`。使用 Ink/React UI 提供丰富的视觉反馈，包括加载指示器和格式化表格。

## 背景

技能系统允许用户安装可重用的代理功能。`src/skill.ts` 中的 `SkillManager` 已经处理技能的加载和添加。此设计添加了一个 CLI 界面并完成移除功能。

## 设计

### 文件结构

**新文件：** `src/commands/skill.tsx`

```
skill.tsx
├── Types (SkillCommandState, SkillOptions)
├── Components
│   ├── SkillListTable - list 命令的表格显示
│   ├── AddSkillUI - add 命令的进度/结果 UI
│   └── RemoveSkillUI - remove 的确认/结果 UI
├── printHelp() - 帮助文本
├── resolveTargetDir() - 解析 --target/--global 到路径
└── runSkill(context) - 入口点
```

### CLI 界面

```
用法: neovate skill <command> [options]

命令:
  add <source>     从源安装技能
  list             列出所有可用技能
  remove <name>    移除已安装的技能

全局选项:
  -h, --help       显示帮助
  --target <dir>   技能的目标目录
```

#### `add` 命令

```
neovate skill add [options] <source>

选项:
  --target <dir>   技能的目标目录
  --global, -g     安装到全局技能目录 (~/.neovate/skills/)
  --overwrite      覆盖同名的现有技能
  --name <name>    以自定义本地名称安装
```

**行为：**
- 默认目标：项目技能目录 (`.neovate/skills/`)
- `--global` 覆盖为 `~/.neovate/skills/`
- `--target` 覆盖两者
- 使用现有的 `SkillManager.addSkill()` 方法
- 克隆期间显示加载指示器，然后显示结果 (已安装/跳过/错误)

#### `list` 命令

```
neovate skill list [options]

选项:
  --target <dir>   技能的目标目录
  --json           JSON 格式输出
```

**行为：**
- 默认情况下列出所有 4 个源的技能 (global-claude, global, project-claude, project)
- `--json` 输出原始 JSON 数组，绕过 Ink
- 表格列：名称 | 源 | 描述

#### `remove` 命令

```
neovate skill remove [options] <name>

选项:
  --target <dir>   技能的目标目录
```

**行为：**
- 需要 `--target` 或默认为项目技能目录
- 用户必须指定位置 (不会自动跨源搜索)
- 完全删除技能文件夹

### `src/skill.ts` 需要的更改

向 `SkillManager` 添加 `removeSkill()` 方法：

```typescript
async removeSkill(
  name: string,
  targetDir?: string
): Promise<{ success: boolean; error?: string }> {
  const skillsDir = targetDir || path.join(this.paths.projectConfigDir, 'skills');
  const skillDir = path.join(skillsDir, name);
  
  if (!fs.existsSync(skillDir)) {
    return { success: false, error: '技能未找到' };
  }
  
  const skillPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    return { success: false, error: '无效技能目录 (无 SKILL.md)' };
  }
  
  fs.rmSync(skillDir, { recursive: true });
  await this.loadSkills();
  return { success: true };
}
```

### 组件设计

#### AddSkillUI

```tsx
type AddState = 
  | { phase: 'cloning' }
  | { phase: 'done'; result: AddSkillResult }
  | { phase: 'error'; error: string };

const AddSkillUI: React.FC<{
  source: string;
  options: AddSkillOptions;
  skillManager: SkillManager;
  onExit: () => void;
}>;
```

- 克隆期间显示 `<Spinner>`
- 完成后显示：
  - 已安装的技能 (绿色)
  - 跳过的技能 (黄色，带原因)
  - 错误 (红色)
- 1.5 秒后自动退出

#### SkillListTable

```tsx
const SkillListTable: React.FC<{
  skills: SkillMetadata[];
  onExit: () => void;
}>;
```

- 渲染包含列的表格：名称 | 源 | 描述
- 使用 Ink 的 `<Box>` 进行布局
- 源显示为标签：`[global]`, `[project]`, 等

#### RemoveSkillUI

```tsx
type RemoveState =
  | { phase: 'removing' }
  | { phase: 'done' }
  | { phase: 'error'; error: string };

const RemoveSkillUI: React.FC<{
  name: string;
  targetDir: string;
  skillManager: SkillManager;
  onExit: () => void;
}>;
```

- 移除期间显示加载指示器
- 确认成功或显示错误

### 入口点集成

更新 `src/cli.ts` 以路由 `skill` 命令：

```typescript
case 'skill':
  const { runSkill } = await import('./commands/skill');
  await runSkill(context);
  break;
```

### 目标目录解析

```typescript
function resolveTargetDir(
  argv: { target?: string; global?: boolean },
  paths: Paths
): string {
  if (argv.target) return path.resolve(argv.target);
  if (argv.global) return path.join(paths.globalConfigDir, 'skills');
  return path.join(paths.projectConfigDir, 'skills');
}
```

## 考虑的替代方案

1. **纯 CLI (如 mcp.ts)**：更简单，但在克隆等长时间操作期间缺乏视觉反馈
2. **CLI + chalk**：中间方案，但无交互性

选择 Ink/React 以与 `run.tsx` 保持一致，并在异步操作期间提供更好的用户体验。

## 测试

- 单元测试 skill.ts 中的 `removeSkill()` 方法
- add/list/remove 流程的 E2E 测试

## 实施计划

1. 向 `SkillManager` 添加 `removeSkill()` 方法
2. 创建包含组件的 `src/commands/skill.tsx`
3. 在 `src/cli.ts` 中连接
4. 添加测试
