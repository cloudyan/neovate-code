# 提交和推送命令的实时 Git 输出流

**日期:** 2025-12-12

## 背景

`src/commands/commit.tsx` 中的提交命令当前显示简单的加载消息，如"⏳ 提交更改..."和"⏳ 推送到远程..."，而不显示实际的 git 命令输出。用户希望在提交和推送操作期间实时看到 git 操作的 stdout/stderr，以提供透明度和反馈。

## 讨论

**输出显示选项:**

- 考虑仅在错误时显示输出 vs. 始终显示
- 考虑替换加载消息 vs. 与加载消息一起显示
- 最终决定: 在加载消息下方显示实时 git 命令输出，同时保持 UI 状态指示器和原始 git 输出可见

**UI 布局:**

- 在顶部保持现有的"⏳ 提交更改..."加载消息
- 在其下方实时流式传输 git 输出
- 以暗色文本显示输出，以区别于 UI 消息
- 捕获 stdout 和 stderr，因为 git 将进度写入 stderr

## 方法

使用现有的 MessageBus 事件系统实现流式输出。流程将是:

1. Git 命令使用 `spawn()` 而不是 `execFile()` 来启用流式传输
2. git 实用程序中的输出回调将每行发送到 NodeBridge
3. NodeBridge 发出事件 (`git.commit.output`, `git.push.output`) 并携带输出数据
4. CommitUI 组件订阅这些事件并在加载消息下方显示行

这种方法保持向后兼容性并利用现有的事件驱动架构。

## 架构

### 修改的组件

**1. Git 实用程序 (`src/utils/git.ts`)**

修改 `gitCommit()` 和 `gitPush()` 函数:

- 添加可选参数: `onOutput?: (line: string, stream: 'stdout' | 'stderr') => void`
- 当提供 `onOutput` 时，使用 `spawn()` 进行流式传输（而不是 `execFile()`）
- 当未提供 `onOutput` 时，保持当前行为（向后兼容）
- 逐行流式传输数据，过滤空行
- 缓冲部分行，直到收到换行符
- 捕获 stdout 和 stderr

示例签名:

```typescript
export async function gitCommit(
  cwd: string,
  message: string,
  skipHooks = false,
  onOutput?: (line: string, stream: "stdout" | "stderr") => void
): Promise<void>;
```

**2. NodeBridge 处理程序 (`src/nodeBridge.ts`)**

更新 `git.commit` 和 `git.push` 处理程序:

- 将 `onOutput` 回调传递给 git 实用程序函数
- 为每行发出 `git.commit.output` 和 `git.push.output` 事件
- 在事件数据中包含流类型 (stdout/stderr)

事件结构:

```typescript
{
  type: 'git.commit.output' | 'git.push.output',
  data: {
    line: string,
    stream: 'stdout' | 'stderr'
  }
}
```

示例实现:

```typescript
this.messageBus.registerHandler("git.commit", async (data) => {
  const { cwd, message, noVerify = false } = data;
  try {
    const { gitCommit } = await import("./utils/git");
    await gitCommit(cwd, message, noVerify, (line, stream) => {
      this.messageBus.emitEvent("git.commit.output", { line, stream });
    });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to commit changes",
    };
  }
});
```

**3. CommitUI 组件 (`src/commands/commit.tsx`)**

更新组件状态和渲染:

- 在 'executing', 'success', 和 'completed' 阶段状态中添加 `outputLines?: string[]`
- 在 `useEffect` 中订阅 `git.commit.output` 和 `git.push.output` 事件
- 将接收到的行追加到 `outputLines` 数组
- 在阶段转换之间保留 outputLines（提交 → 推送 → 成功/完成）
- 以暗色在加载/成功消息下方渲染输出行
- 限制显示最后 50 行以防止溢出
- **输出在操作完成后保持** - 在转换到成功/完成阶段时不折叠/隐藏输出

执行期间的 UI 布局:

```
⏳ 提交更改...
   Enumerating objects: 5, done.
   Counting objects: 100% (5/5), done.
   Delta compression using up to 8 threads
   [master abc1234] feat: add new feature
    2 files changed, 10 insertions(+)
```

完成后 UI 布局:

```
✅ 变更已成功提交!
   Enumerating objects: 5, done.
   Counting objects: 100% (5/5), done.
   Delta compression using up to 8 threads
   [master abc1234] feat: add new feature
    2 files changed, 10 insertions(+)
```

### 实现说明

- Git 将进度信息写入 stderr（而不是 stdout），因此必须捕获两个流
- 使用 stdio: 'pipe' 的 `spawn()` 以获得流式传输功能
- 通过使 `onOutput` 参数可选来保持向后兼容性
- 行缓冲确保在显示之前组装部分行
- 应过滤空行以减少噪音
- 从提交阶段转换到推送阶段时，保留先前的输出
- 输出在成功/完成阶段保持可见以供用户查看
