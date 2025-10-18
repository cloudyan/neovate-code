# 工具系统架构设计

## 概述

Neovate 的工具系统是其核心功能之一，允许 AI 代理与文件系统、网络和 shell 环境进行交互。工具系统具有以下特点：

1. **模块化设计** - 每个工具独立实现，易于扩展
2. **类型安全** - 使用 Zod 进行参数验证
3. **权限控制** - 支持工具审批机制
4. **统一接口** - 所有工具遵循统一的执行接口

## 核心架构

### Tool 接口

```typescript
interface Tool<T = any> {
  name: string;                    // 工具名称
  description: string;             // 工具描述
  getDescription?: ({ params, cwd }: { params: T; cwd: string }) => string;
  displayName?: string;            // 显示名称
  execute: (params: T) => Promise<ToolResult> | ToolResult;  // 执行函数
  approval?: ToolApprovalInfo;     // 审批信息
  parameters: z.ZodSchema<T>;      // 参数模式定义
}

interface ToolApprovalInfo {
  needsApproval?: (context: ApprovalContext) => Promise<boolean> | boolean;
  category?: ApprovalCategory;     // 'read' | 'write' | 'command' | 'network'
}
```

### ToolResult 接口

```typescript
type ToolResult = {
  llmContent: string | (TextPart | ImagePart)[];  // 返回给 LLM 的内容
  returnDisplay?: string | DiffViewerReturnDisplay | TodoReadReturnDisplay | TodoWriteReturnDisplay;
  isError?: boolean;               // 是否出错
};
```

## 工具实现

### 文件操作工具

1. **read** - 读取文件内容，支持文本和图像文件
   - 自动处理大文件截断
   - 支持图像文件的 Base64 编码
   - 支持行偏移和限制参数

2. **write** - 写入文件内容
   - 自动创建目录
   - 格式化输出（确保文件以换行符结尾）
   - 提供差异视图

3. **edit** - 编辑文件内容
   - 基于字符串替换的精确编辑
   - 使用 `applyEdit` 工具进行安全编辑
   - 提供差异视图

### 搜索工具

1. **grep** - 使用 ripgrep 搜索文件内容
   - 快速文件内容搜索
   - 支持文件模式过滤
   - 按修改时间排序结果

2. **glob** - 使用 glob 模式匹配文件
   - 支持复杂的文件模式匹配
   - 按修改时间排序结果
   - 限制返回结果数量

### 系统工具

1. **ls** - 列出目录内容
   - 生成文件树结构
   - 处理大量文件的截断

2. **bash** - 执行 shell 命令
   - 安全检查和命令验证
   - 超时控制
   - 禁止危险命令
   - 后台进程管理

### 网络工具

1. **fetch** - 获取 URL 内容
   - HTML 到 Markdown 转换
   - 内容长度限制
   - 结果缓存
   - 使用 LLM 处理获取的内容

### 任务管理工具

1. **todoRead** - 读取任务列表
2. **todoWrite** - 写入任务列表
   - 支持任务状态管理（pending, in_progress, completed）
   - 本地文件持久化
   - 详细的使用指南和最佳实践

## 工具解析和管理

### resolveTools 函数

```typescript
async function resolveTools(opts: ResolveToolsOpts) {
  // 根据上下文和权限解析可用工具
  const readonlyTools = [read, ls, glob, grep, fetch];
  const writeTools = opts.write ? [write, edit, bash] : [];
  const todoTools = opts.todo ? [todoRead, todoWrite] : [];
  const mcpTools = await getMcpTools(context);
  return [...readonlyTools, ...writeTools, ...todoTools, ...mcpTools];
}
```

### Tools 类

```typescript
class Tools {
  tools: Record<string, Tool>;

  get(toolName: string) { /* 获取工具 */ }
  length() { /* 获取工具数量 */ }

  async invoke(toolName: string, args: string): Promise<ToolResult> {
    // 验证参数并执行工具
    const result = validateToolParams(tool.parameters, args);
    const argsObj = JSON.parse(args);
    return await tool.execute(argsObj);
  }

  getToolsPrompt() { /* 生成工具使用提示 */ }
}
```

## 安全机制

1. **参数验证** - 使用 Zod 进行严格的参数验证
2. **路径限制** - 防止路径遍历攻击
3. **命令过滤** - 禁止危险命令（如 rm, sudo 等）
4. **审批机制** - 根据工具类别和配置进行审批
5. **超时控制** - 限制命令执行时间
6. **内容截断** - 限制返回内容大小

## 扩展机制

1. **MCP 工具集成** - 动态加载 MCP 提供的工具
2. **插件支持** - 通过钩子机制扩展工具集
3. **配置覆盖** - 允许通过配置文件自定义工具行为


## MCP vs Agent 选择考量

在决定是创建 MCP 工具还是使用 Agent 内部实现时，需要考虑以下因素：

### 适合 MCP 工具的场景：

1. **无自主决策需求**
   - 任务为“输入 A → 输出 B”的幂等计算，不会自行决定下一步动作
   - 例：简历打分、仓库→Wiki、千亿模型补全

2. **标准化程度高**
   - 有明确的输入输出规范
   - 可以独立运行，不依赖特定项目上下文
   - 例如：通用代码格式化工具

3. **需要复用**
   - 多个项目或团队都需要相同功能
   - 可以作为独立服务提供

4. **资源密集型**
   - 需要大量计算资源
   - 需要特殊环境依赖
   - 量化阈值建议：>5 s 或内存 >512 MB 的任务一律 MCP 化，否则 Agent 内联。

### 适合 Agent 内部实现的场景：

1. **需要自主决策闭环**
   - 需根据中间结果、外部反馈或记忆状态，动态规划下一步
   - 例：增量 CR 中“追问→补测试→再评审”、运维自愈中“告警→日志→决定重启”

2. **项目特定逻辑**
   - 与项目结构、规范深度耦合
   - 需要访问项目特定配置

3. **轻量级任务**
   - 实现简单，不需要独立服务

4. **安全性要求高**
   - 涉及敏感数据处理
   - 需要严格控制执行环境

### 划分原则：

- **决策权**：只要任务需要“自己决定下一步”，**一票否决 MCP**，必须留在 Agent 内部；其余再按复杂度、复用性、安全性、性能四维度打分。
- **复杂度**：简单任务用 Agent，复杂任务用 MCP
- **复用性**：通用功能用 MCP，专用功能用 Agent
- **安全性**：敏感操作优先考虑 Agent
- **性能**：资源密集型任务考虑 MCP

**一句话总结**:

> 先问“要不要脑”——有脑→Agent，无脑→再按“低延迟高耦合 vs 高消耗高复用”四象限切。
> Agent 内函数 = 低延迟 + 高耦合 + 快迭代；MCP 工具 = 高消耗 + 高复用 + 强契约

对于代码审查、文档生成这类任务，通常建议先在 Agent 内部实现原型，验证需求后再考虑是否抽象为独立的 MCP 工具。

这种设计使得 Neovate 的工具系统既安全又灵活，能够满足各种开发任务的需求。

## 常见场景示例

### 一、单步重算力 → 必拆 MCP（4 个）

| # | 场景               | 用户原始诉求                          | 拆 MCP 理由                                     | 标杆案例                                                      |
| - | ---------------- | ------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| 1 | 代码补全 **生成式** 大模型 | “用 go 写个并发爬虫，用 redis 做去重”       | GPU>6G、TTFT<300ms、需要连续采样5次；放进程内会拖垮 Agent 主线程 | GitHub Copilot 官方架构图：Completion Service 独立 k8s deployment |
| 2 | 语义检索（向量版）        | “找一下库里所有‘忘记关闭文件句柄’的类似代码”        | 需要 milvus/onnx 服务常驻显存，Agent 只做召回后重排序         | SourceGraph Cody 2024 博客：Embedding Index Service          |
| 3 | 图片/文档 **多模态** 理解 | “把这张 UI 截图转成 React Tailwind 代码” | Vision-LM 需要 40 层 Transformer，单独扩缩容          | iflow\.cn 模板「截图→代码」即调用外部 vision-mcp                       |
| 4 | 批量安全扫描           | “全仓库扫一遍硬编码密钥”                   | 需要拉 10G 镜像（truffleHog+regex+entropy），跑在隔离容器  | GitHub Advanced Security 的 secret-scanning 微服务            |

### 二、强项目上下文 → 放 Agent 内部（4 个）

| # | 场景             | 用户原始诉求                    | 留在 Agent 理由                                    | 标杆案例                           |
| - | -------------- | ------------------------- | ---------------------------------------------- | ------------------------------ |
| 5 | 私有规范 **Lint**  | “按我司‘函数必须带 ctx 作为第一参数’检查” | 规范 JSON 只在 .vscode/company-lint.json 存在，无需外泄源码 | 阿里飞冰 Lint 插件：本地 worker 线程完成    |
| 6 | 增量 **依赖可视化**   | “只显示本次 PR 新增的直接依赖”        | 需要实时对比 git diff + package.json AST，数据量<1MB     | iflow 模板「依赖影响面」在 Agent 侧本地跑    |
| 7 | 业务词典 **敏感词检测** | “提示我把‘黑白名单’改成‘允许/禁止列表’”   | 业务词典.csv 在私有 GitLab，不能走外网 API                  | 腾讯文档 Copilot：本地敏感词 Trie 树      |
| 8 | **动态** 模板生成    | “根据路由文件自动生成菜单配置”          | 需要把 @/router/index.ts 的异步 import() 语法实时解析      | 字节跳动 Arco 设计工场：本地 babel-parser |

### 三、必须「Agent 决策 + MCP 重算」混合（4 个）

| #  | 场景              | Agent 负责                                 | MCP 负责                           | 协同要点                                   | 标杆案例                            |
| -- | --------------- | ---------------------------------------- | -------------------------------- | -------------------------------------- | ------------------------------- |
| 9  | 自然语言 → SQL → 图表 | 1) 把“上个月各渠道 GMV”转义成标准 schema+指标  2) 校验权限 | 生成最优 SQL、预计算宽表、返回 Vega-Lite JSON | 约定 `sql_hash` 一致，才能命中缓存                | iflow「NL2SQL」模板                 |
| 10 | 报错一键修复          | 1) 解析 stack + 源码上下文  2) 问用户是否接受          | 走 GPT-4 生成 patch + 单元测试          | patch 带 `confidence`≥0.85 才展示 Apply 按钮 | Cursor 0.31 版本「Fix with AI」     |
| 11 | 性能火焰图 → 优化代码    | 1) 本地跑 `perf` 生成折叠栈 2) 选 top-3 热点        | 返回向量化/并行化改写后的函数                  | 需要返回 `speedup` 预测值                     | SourceGraph Cody「perf-cody-mcp」 |
| 12 | 需求 → 任务拆分 → 代码  | 1) 把用户 story 拆成子任务 2) 维护内存对话状态           | 针对每个子任务生成文件级变更（git diff）         | 用 `dependency_graph` 字段告诉 Agent 文件先后序  | GitHub Copilot Workspace 预览版    |

> “GPU/大镜像/跨项目”一定 MCP；
> “规范/增量/敏感”就地 Agent；
> “先生成再决策”拆成两段，其余全部本地跑。

## 示例1

简历「批量评估筛选」是典型的 **CPU+内存双密集、可完全无状态、需要横向扩缩** 的任务，完全符合前面总结的**“GPU/大镜像/跨项目”一定 MCP** 这条规则。因此应该做成 **MCP 工具**，而不是塞进 Agent 内部。

可直接落地的设计要点与参考数字

### 业务拆解与边界

| 步骤 | 是否放 MCP | 理由 / 关键指标 |
|---|---|---|
| ① 简历 PDF/Doc 解析 | ✅ MCP | 平均 1 份 2~4 MB，Tika+OCR 需要 1.2 s CPU 核心；1000 份 ≈ 20 min，必须并发 |
| ② 实体提取（学校、技能、年限） | ✅ MCP | 需要跑 NER + regex 双通道，内存峰值 1.5 GB；放 Agent 会 OOM |
| ③ 与 JD 匹配打分 | ✅ MCP | 需要加载 110 M 参数 MiniLM 微调模型，GPU 4 GB；Agent 进程内无法常驻 |
| ④ 敏感信息脱敏 | ✅ MCP | 身份证号、手机号必须走本地 onnx 模型，满足 GDPR/个保法“数据不出域” |
| ⑤ 最终排序 & 切片返回 | ✅ MCP | 返回 top-k 候选 ID（≤100 条），带宽 <50 KB，Agent 只负责展示/推送 |

### 接口级定义（可直接写进 OpenAPI）

POST /cv-batch/screen

```js
// 请求
{
  "jd_text": "负责高并发交易系统后端开发，要求 Go+Redis 经验 3 年以上",
  "cv_file_uris": [
      "s3://hr-bucket/001.pdf",
      // ...
    ],
  "top_k": 20,
  "hard_filters": {"max_degree_gap": 2, "min_work_years": 3}
}

// 返回
{
"results": [
  {"candidate_id": "001", "score": 0.91, "matched_skills": ["Go", "Redis"], "risk_labels": []},
    // ...
  ],
  "summary": {"total": 1000, "valid": 952, "filtered": 48}
}
```

### 安全&合规

- 镜像内置 ClamAV，简历先杀毒再解析；
- 解析后原文立刻写临时卷，任务结束 shred -n 3 删除；
- 返回给 Agent 的只有 candidate_id + 结构化字段，原文不落库；
- 支持「本地私有化」模式：镜像交付到客户 VPC，调用外部零流量。

### 跟 Agent 的交互流程（时序）

Agent（HR Bot）
└─▶ 用户输入 JD + 批量上传简历
└─▶ 调用 MCP：/cv-batch/screen
└─▶ MCP 异步轮询 /task/{task_id}/status
└─▶ 100% 完成后拉回 top-20 列表
└─▶ 在聊天窗口生成「可点击卡片」+ 一键发起面试

一句话结论

简历批量筛选 = **重计算 + 零状态 + 高并发 + 合规敏感**，完全符合 “**必拆 MCP**” 的 4 个特征；

Agent 只负责「需求收集 + 结果展示」，把 CPU/GPU  heavy lifting 全部交给独立 MCP 服务，是最省成本、最易横向扩展、也最容易通过 HR 合规审计的方案。

## 示例 2

把整仓代码一键生成可浏览的 Wiki 文档站点

属于典型的

- 要完整遍历文件系统 → IO 重
- 要跑 AST/Doc 抽取 → CPU 重
- 要产出一堆静态 HTML → 可完全无状态
- 最终产物只占总仓库体积 1~3 % → 带宽轻

因此**应当做成 MCP 工具**，而不是塞进 Agent 进程。

可直接落地的「仓库→Wiki」MCP 设计，包含边界划分、接口定义、性能基线与标杆案例。

### 任务拆解与归属

| 步骤                      | 是否放 MCP | 关键开销 / 理由                                                |
| ----------------------- | ------- | -------------------------------------------------------- |
| ① clone 仓库（深度可选）        | ✅ MCP   | 大仓 5 GB+，需要 LFS、sparse-checkout；Agent 侧无必要持有一整份拷贝        |
| ② 语言识别 & AST 解析         | ✅ MCP   | 需要加载 tree-sitter / rustc 解析器，内存 1–2 GB；并发跑 4 语言即打满 CPU   |
| ③ 抽取注释、docstring、类型     | ✅ MCP   | 单行→块级→跨文件链接，需全局符号表；Agent 内做会 OOM                         |
| ④ 生成 Markdown/HTML      | ✅ MCP   | 用 mdBook / Docusaurus 编译，npm install 就 400 MB+ 依赖，必须容器隔离 |
| ⑤ 推送到 GitHub Pages / S3 | ✅ MCP   | 产物体积 50–200 MB，需要 aws-cli 密钥；走 Agent 会把密钥暴露在插件进程         |
| ⑥ 把站点 URL 回传聊天窗口        | ✅ Agent | 纯字符串，<1 KB；Agent 负责渲染可点击卡片                               |

### 接口定义（OpenAPI 片段）

POST /wiki/generate

```js
{
  "repo_url": "https://github.com/acme/api-service.git",
  "ref": "v2.3.0",               // 可 commit/branch/tag
  "depth": 1,                    // 浅克隆节省 IO
  "include_lang": ["go", "proto"],
  "theme": "docusaurus",         // 或 mkdocs、vitepress
  "deploy_target": {
    "type": "github_pages",
    "token_secret": "$GITHUB_TOKEN"  // 运行时注入，不落盘
  }
}

// 返回
{
"task_id": "wiki-6c1c2d",
"estimated_seconds": 180,
"preview_url": "https://acme.github.io/api-service/v2.3.0/"
}
```

WebSocket /task/{task_id}/log 实时推流编译日志，前端可展示进度条。

### 缓存策略（大幅降低重复克隆）

- 镜像层自带 /cache/gits —— 裸仓统一挂只读 volume；
- 用 --reference 克隆，节省 95 % 流量；
- AST 产物按 repo+commit+lang 做 LRU 本地 RocksDB，24h 内重复请求直接跳过解析阶段。

### 安全 & 合规

- 容器运行时只给 read-only rootfs + seccomp=runtime/default；
- 仓库源码在临时 volume，任务结束 shred -n 2 -z -u 全目录；
- GitHub Token 通过 env 注入，容器日志自动脱敏；
- 支持私有化：镜像+缓存盘交付到客户 VPC，零外网出站。

### 与 Agent 的交互时序（极简）

Agent（Dev-Bot）
└─▶ 用户输入：「给这个仓库生成 Wiki，推到我们项目组 GitHub Pages」
└─▶ 调用 MCP：/wiki/generate
└─▶ 轮播 /task/{id}/log → 实时显示 0–100 %
└─▶ 拿到 preview_url，渲染成「可点击卡片」+「一键打开」按钮

### 标杆案例对照

- GitHub Pages + Jekyll 官方 Action：本质就是「独立容器做 wiki 编译」，与 Agent 零耦合；
- SourceGraph Cody「Docsite Generator」插件：把仓库→静态站点拆成独立微服务，接口与上述设计 95 % 一致；
- iflow.cn 模板「代码仓库→Wiki」：背后同样调用外部 MCP，Agent 侧仅保留 30 行 JS 胶水代码。


### 一句话结论

「仓库生成 Wiki」＝ IO 重 + CPU 重 + 大依赖 + 产物轻，完全符合「必拆 MCP」原则；

Agent 只负责「触发 + 进度展示 + 结果回传」，把克隆、AST、静态编译全部扔进隔离容器，才能满足

- 横向扩容（1 k 个仓库并发）
- 低成本（单次 <1 分钱）
- 密钥不落地、源码及时销毁的合规要求。

## 示例 3

增量代码 Code Review

分析，链路保持“项目私有、轻量、零状态”，复杂度远低于 5s/512 MB 阈值，亦无跨项目复用需求，因此完全在 Agent 内部实现即可，不必外拆 MCP。

