# NodeBridge处理器的测试命令

**日期：** 2025-11-18

## 背景

在 `src/commands/` 中添加 `__test` 命令，用于在开发期间测试nodeBridge处理器。该命令应使用Ink进行渲染，并初始支持测试两个处理器：
- `project.getRepoInfo`
- `project.getWorkspacesInfo`

该命令将使用 `@src/ui/PaginatedSelectInput.tsx` 来渲染处理器选择界面。

主要目的是作为**开发/调试工具**，让开发者在开发期间手动测试nodeBridge处理器 - 调用处理器、查看响应、捕获错误。

## 讨论

### 详细程度
该命令将显示**详细**输出，包括：
- 完整的请求负载
- 响应数据
- 时间信息
- 任何带有堆栈跟踪的错误

这种全面的调试输出帮助开发者准确理解处理器执行期间发生的情况。

### 交互模式
该命令使用**交互循环**方法：
1. 启动交互式UI，从中选择处理器
2. 测试选定的处理器并查看结果
3. 可选择测试另一个处理器（重复直到退出）

这允许开发者快速测试多个处理器而无需重启命令。

### 实现方法
选择**方法A：简单处理器注册表**：
- 创建带有元数据的处理器静态映射以供测试
- 主循环：PaginatedSelectInput → 执行处理器 → 显示结果 → 返回选择
- 结果在带有结构化部分的自定义Ink组件中显示
- 通过ESC键退出

**权衡：** 实现简单且易于维护。需要手动将每个处理器添加到注册表，但对于开发工具来说这是可接受的。与自动发现相比灵活性有限，但对于初始用例来说足够。

## 方法

`__test` 命令遵循 `src/index.ts` 中现有的NodeBridge模式：

1. **桥接设置：** 创建带有DirectTransport对的NodeBridge实例（与runInteractive模式相同）
2. **通信：** 使用 `messageBus.request()` 从UI端调用处理器
3. **交互循环：** 显示处理器列表 → 执行 → 显示结果 → 循环返回
4. **退出：** ESC键退出命令

## 架构

### 核心结构

```
__test.ts
├── 命令入口点
│   ├── 创建NodeBridge（类似runInteractive）
│   ├── 创建DirectTransport对
│   ├── 设置消息总线通信
│   └── 渲染TestUI组件
├── TestUI组件（基于Ink）
│   ├── 使用bridge.messageBus.request()调用处理器
│   ├── HandlerSelector（PaginatedSelectInput）
│   ├── ResultsDisplay（详细输出）
│   └── 状态机（选择 → 执行 → 结果 → 循环）
└── 处理器注册表
    └── 测试定义的静态数组
```

### 通信模式

```typescript
// 在__test.ts中（类似runInteractive）
const nodeBridge = new NodeBridge({ contextCreateOpts });
const [uiTransport, nodeTransport] = DirectTransport.createPair();
messageBus.setTransport(uiTransport);
nodeBridge.messageBus.setTransport(nodeTransport);

// 在TestUI组件中（类似UI如何发出请求）
const result = await messageBus.request('project.getRepoInfo', { 
  cwd: process.cwd() 
});
```

### 处理器注册表格式

```typescript
const TEST_HANDLERS = [
  {
    label: 'Project: Get Repo Info',
    handler: 'project.getRepoInfo',
    getData: (cwd: string) => ({ cwd })
  },
  {
    label: 'Project: Get Workspaces Info',
    handler: 'project.getWorkspacesInfo',
    getData: (cwd: string) => ({ cwd })
  }
];
```

### 组件层次结构

```
TestUI（主组件）
├── 状态：'selecting' | 'executing' | 'displaying'
├── 当状态 = 'selecting'
│   └── PaginatedSelectInput（处理器列表）
├── 当状态 = 'executing'
│   └── 加载指示器
└── 当状态 = 'displaying'
    └── ResultsDisplay（详细输出）
```

### 状态机

- **选择中**：显示带有处理器列表的PaginatedSelectInput
  - onSelect → 转换到'executing'
  - ESC → 退出命令
- **执行中**：显示旋转器，调用messageBus.request()
  - 捕获：开始时间、请求负载
  - 响应时：捕获结束时间、响应数据、成功/错误
  - → 转换到'displaying'
- **显示中**：显示ResultsDisplay组件
  - 任何按键 → 转换回'selecting'

### 执行期间捕获的数据

```typescript
interface TestResult {
  handler: string;
  requestPayload: any;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  response?: any;
  error?: { message: string; stack?: string };
}
```

### ResultsDisplay布局

```
┌─ 请求 ────────────┐
│ Handler: project.getRepoInfo
│ Payload: { cwd: "..." }
├─ 响应 ──────────┤
│ Success: true
│ Data: { ... }       （JSON格式化）
├─ 计时 ───────────┤
│ Duration: 45ms
└─ 错误 ───────────┘
│ （如果有，带堆栈跟踪）
```

### 错误处理

1. **NodeBridge初始化错误：**
   - 在桥接设置期间捕获
   - 显示错误消息并优雅退出
   - 示例：无效的cwd、配置加载失败

2. **处理器执行错误：**
   - 将messageBus.request()包装在try/catch中
   - 捕获错误消息和堆栈跟踪
   - 在ResultsDisplay的"错误"部分显示
   - 仍允许返回选择（不崩溃）

3. **UI渲染错误：**
   - Ink错误边界（如果组件崩溃）
   - 回退到基本错误文本显示

4. **超时处理：**
   - 为请求设置合理的超时（例如30秒）
   - 如果超时，显示错误并允许重试

### 测试方法

由于这是一个开发/调试工具：
- **仅手动测试** - 运行命令并验证处理器工作
- 初始不需要自动化测试
- 测试成功和错误情况：
  - 有效的git仓库（成功）
  - 非git目录（错误）
  - 无效的cwd（错误）

### 实现注意事项

- 使用代码库中现有的错误模式
- 遵循nodeBridge错误响应格式：`{ success: false, error: string }`
- 显示原始JSON用于详细调试（使用带有2空格缩进的JSON.stringify）
- 遵循 `src/commands/` 中现有的命令模式
- 注册表易于扩展 - 只需向TEST_HANDLERS数组添加新条目
