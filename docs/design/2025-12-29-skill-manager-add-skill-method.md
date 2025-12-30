# Skill Manager Add Skill 方法

**日期:** 2025-12-29

## 上下文

`src/skill.ts` 中的 `SkillManager` 当前仅从预定义目录（全局和项目）加载技能。需要添加一个 `addSkill` 方法，可以从 GitHub 仓库安装技能。

需求：
- 支持 `--global`、`--overwrite`、`--name` 参数
- 支持安装多个技能，当仓库包含多个子目录中的 SKILL.md 文件时

## 讨论

### URL 格式支持
应支持短格式和完整 URL 格式，包括子目录：
- `owner/repo` → `github:owner/repo`
- `owner/repo/subdir` → `github:owner/repo/subdir`
- `https://github.com/owner/repo`
- `github:owner/repo#branch` (支持分支/标签)

### 下载机制
使用 `degit` 程序化 API (项目中已安装)：
```typescript
import degit from 'degit';
const emitter = degit('owner/repo');
await emitter.clone(targetDir);
```

### --name 参数行为
当提供 `--name` 但源包含多个技能时，抛出错误。`--name` 选项仅适用于单技能源。

### API 设计替代方案

**方法 A: 简单方法** - 干净但最小结果处理  
**方法 B: 单独检测 + 安装** - 更多控制但两步过程  
**方法 C: 单一方法与全面结果** - 选择的方法，一次调用处理所有内容并提供详细结果

## 方法

使用方法 C：一个单一的 `addSkill` 方法，处理整个流程并返回一个全面的结果对象，显示已安装、已跳过和出错的技能。

## 架构

### 新接口

```typescript
export interface AddSkillOptions {
  global?: boolean;      // 默认: false (项目技能目录)
  overwrite?: boolean;   // 默认: false
  name?: string;         // 自定义文件夹名称，仅适用于单个技能
}
```

export interface AddSkillResult {
  installed: SkillMetadata[];
  skipped: { name: string; reason: string }[];
  errors: SkillError[];
}

### 新方法

```typescript
async addSkill(source: string, options?: AddSkillOptions): Promise<AddSkillResult>
```

### 实现流程

1. **标准化源** → 处理 `owner/repo`、`owner/repo/subdir`、完整 GitHub URLs
2. **通过 degit API 下载** → `degit(source).clone(tempDir)`
3. **扫描 SKILL.md 文件** → 在临时目录中递归查找所有
4. **验证**：
   - 如果为多技能提供 `--name` 则出错
   - 使用现有的 `parseSkillFile` 解析每个 SKILL.md
5. **安装每个技能**：
   - 目标：`global ? globalSkillsDir : projectSkillsDir` + 文件夹名称
   - 文件夹名称：`--name` 或 SKILL.md 的父文件夹
   - 如果存在且无覆盖则跳过，如果覆盖则移除+复制
6. **清理临时目录**
7. **通过 `loadSkills()` 重新加载技能**
8. **返回结果**

### 辅助方法

- `private normalizeSource(source: string): string` - 标准化 URL 格式
- `private async scanForSkills(dir: string): Promise<string[]>` - 递归查找所有 SKILL.md 路径
- `private async copySkillFolder(from: string, to: string): Promise<void>` - 复制技能目录

### 错误处理

| 场景 | 处理 |
|----------|----------|
| degit 失败 (无效仓库, 网络错误) | 抛出错误并带有 degit 的消息 |
| 下载内容中未找到 SKILL.md | 返回 `{ installed: [], skipped: [], errors: [{ path: source, message: 'No skills found' }] }` |
| 多技能源使用 --name | 抛出错误: "Cannot use --name when source contains multiple skills" |
| SKILL.md 解析失败 (无效 frontmatter) | 添加到错误数组，继续处理其他技能 |
| 技能已存在 (无 --overwrite) | 添加到跳过数组，原因 "already exists" |
| 目标目录不可写 | 抛出错误 |
