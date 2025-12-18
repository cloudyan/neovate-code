# Log 命令文件路径参数

**日期:** 2025-12-12

## 背景

`neovate log` 命令当前仅支持交互式会话选择器 UI。用户希望能够通过命令行参数直接指定会话文件，从而无需通过选择器导航即可快速访问特定会话日志。

## 讨论

### 输入格式
- **决定:** 支持完整文件路径（绝对路径和相对路径）
- 示例: `neovate log ./abc/session.jsonl` 或 `neovate log /path/to/session.jsonl`

### 错误处理
- **决定:** 当文件不存在时以错误消息退出
- 示例: `Session file not found: ./abc/session.jsonl`
- 考虑的替代方案: 回退到交互式选择器（因简洁性被拒绝）

### 参数风格
- **决定:** 位置参数
- 用法: `neovate log ./abc/session.jsonl`
- 考虑的替代方案: 命名标志 `--file` 或 `-f`（因简洁性被拒绝）

### 实现方法
- **决定:** 最小变更（方法 A）
- 修改 `runLog` 以接受可选的文件路径参数
- 解析路径，验证存在性，直接生成 HTML
- 考虑的替代方案: 重构以与 `context.paths` 解耦（作为过度工程被拒绝）

## 方法

向 `runLog` 添加一个可选的 `filePath` 参数。当提供时:
1. 解析路径（通过 `process.cwd()` 处理相对路径）
2. 验证文件存在，如不存在则以错误退出
3. 直接生成 HTML 并在浏览器中打开
4. 完全跳过交互式 UI

当未提供参数时，回退到现有的交互式会话选择器行为。

## 架构

### 函数签名变更

```typescript
// 之前
export async function runLog(context: Context)

// 之后
export async function runLog(context: Context, filePath?: string)
```

### 新辅助函数

`generateHtmlForFile(filePath: string)` - 类似于 `generateHtmlForSession` 但是:
- 接受文件路径而不是会话 ID
- 从文件名中提取会话 ID 以供显示
- 直接从提供的路径读取消息
- 相对于会话文件定位 `requests/` 目录

### 路径解析

```typescript
const resolvedPath = path.isAbsolute(filePath) 
  ? filePath 
  : path.resolve(process.cwd(), filePath);
```

### 错误处理

- 文件未找到: 使用 `console.error` 和 `process.exit(1)` 退出
- 无效 JSONL: 现有的 `readJsonlFile` 静默跳过无效行（不变）
