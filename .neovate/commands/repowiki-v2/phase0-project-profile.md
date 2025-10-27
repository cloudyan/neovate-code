---
description: 项目画像（阶段0）
model:
progressMessage: 正在执行项目画像分析...
---

# 阶段0: 项目画像 Prompt

你是一个专业的代码架构分析师和技术文档工程师，擅长：
- 深度理解复杂代码库的架构设计
- 识别核心模块和关键流程
- 生成结构化、高价值的技术文档
- 结合项目特点定制文档内容

请基于当前代码仓库，执行项目画像分析，为后续文档生成提供完整上下文，并为每项结论提供可验证的证据引用（file_path:line_number）。

## 参数
- $1 模式: quick|full（默认 quick）
- $2 输出目录: 默认 repowiki
- $3 深度上限: 默认 2

## 🎯 核心任务

### Step 0.1: 技术栈深度识别

通过配置与运行环境文件识别项目语言、框架与工具链，并给出版本范围与来源（禁止读取锁定文件）：

1. 检查 package.json/pyproject.toml/go.mod 等识别主要语言与框架
2. 从 manifest 与运行环境获取版本范围：engines/peerDependencies/packageManager、.nvmrc/.tool-versions、Dockerfile、CI matrix（如 .github/workflows），必要时通过可执行命令 --version 输出佐证（仅读取脚本定义，不执行）
3. 识别构建与测试工具（Vite/Webpack/Rollup、Jest/Vitest、ESLint/Prettier）
4. 识别运行时与平台（Node/PNPM/NPM/Yarn 版本、Python 版本、Go 版本），以及 asdf/.tool-versions、.nvmrc、.python-version
5. 识别容器/镜像与基础镜像版本（Dockerfile、docker-compose.yml）
6. 识别包管理/工作区（Monorepo: pnpm-workspace.yaml/turbo.json）
7. 每项识别需提供至少一个证据引用
8. 版本可信度: exact|range|approximate

输出格式:
```
语言层: [语言列表]
框架层: [框架列表]
工具链: [工具列表]
版本来源: [文件与行号列表]
版本可信度: [exact|range|approximate]
```

### Step 0.2: 架构模式深度推断

识别并给出判定依据（必须附证据）：

1. 前端架构: 文件路由 vs 配置路由；组件模式（Atomic/Feature-based）；状态管理（Redux/Zustand/Pinia）
2. 后端架构: 分层/DDD/微服务；接口协议（REST/GraphQL/gRPC）；领域与模块边界
3. CLI架构: 命令/子命令树、参数解析、交互式 UI（Inquirer/Prompts）
4. Monorepo架构: 包依赖关系、工作区结构、构建/缓存策略（turbo）
5. 基础设施: 消息/事件（Kafka/RabbitMQ）、缓存（Redis）、数据库与ORM、配置中心
6. 部署与运行: 容器化/K8s/Serverless，CI/CD 编排

输出格式:
```
前端架构: [架构模式]
后端架构: [架构模式]
CLI架构: [架构模式]
Monorepo架构: [架构模式]
基础设施: [组件列表]
判定依据: [文件与行号列表]
```

### Step 0.3: 业务层次自动划分

提取项目的业务结构与关键流：

1. 前端: 路由结构、页面功能、组件层次树与数据流
2. 后端: API 端点、数据模型、服务调用链与领域划分
3. CLI: 命令树、交互流程、子命令职责
4. 事件与任务: 主题/队列、消费者、计划任务/定时器

输出格式:
```
路由结构: [路由列表]
API端点: [API列表]
数据模型: [模型列表]
命令树: [命令列表]
事件/任务: [主题/计划任务列表]
证据: [文件与行号列表]
```

### Step 0.4: 文档结构动态定制

根据项目类型与检测到的组件选择文档模板并允许组合：

1. frontend-nextjs - Next.js 专用
2. backend-nestjs - NestJS 专用
3. cli-tool - CLI 工具专用
4. monorepo-turborepo - Monorepo 专用
5. cross-platform-taro - 跨端专用

选择规则：依据技术栈与架构特征可组合模板（如 monorepo-turborepo + backend-nestjs）。

输出格式:
```
推荐文档模板: [模板名称或组合]
依据: [文件与行号列表]
```

### Step 0.5: 领域知识库加载

整合对应技术栈知识：

1. 最佳实践
2. 常见模式
3. 反模式警告
4. 性能优化建议
5. 安全与合规（依赖审计、SAST/Secrets、供应链/SBOM、策略）

输出格式:
```
加载知识库: [技术栈相关知识]
```

## 📊 输出要求

生成两个文件（输出目录可由 $2 指定，默认 repowiki）：

1. `repowiki/00-project-profile.json` - 项目画像数据
2. `repowiki/00-project-profile.md` - 人类可读报告

JSON 示例（含扩展字段）:
```json
{
  "name": "项目名称",
  "type": "项目类型",
  "tech_stack": {
    "languages": {"primary": "主要语言", "others": ["其他语言"]},
    "frameworks": {"frontend": "前端框架", "backend": "后端框架"},
    "build_tools": ["构建工具"],
    "runtimes": {"node": ">=18", "python": "3.11", "go": "1.22"},
    "package_managers": {"npm": "10", "pnpm": "8"}
  },
  "architecture": {
    "frontend": "架构模式",
    "backend": "架构模式",
    "cli": "架构模式",
    "monorepo": "架构模式",
    "infrastructure": ["Redis", "PostgreSQL"],
    "evidence": ["path/to/file:123"]
  },
  "business": {
    "domain": "业务领域",
    "has_routing": true,
    "apis": ["GET /api/health"],
    "events": ["topic.orders"],
    "jobs": ["daily_cleanup"]
  },
  "scale": {"files_count": 100, "loc": 10000, "packages": 5},
  "scan": {"limits": {"max_file_lines": 12000, "max_file_bytes": 400000}, "phase0": {"whitelist_only": true, "max_files": 20, "max_bytes": 1000000, "max_per_dir": 5, "max_depth": 2, "head_lines": 200, "stop_confidence": 0.9}, "skipped_files_count": 0},
  "ci_cd": {"providers": ["GitHub Actions"], "pipelines": ["build", "test", "release"]},
  "infrastructure": {"container": true, "k8s": false, "iac": ["Terraform"]},
  "security": {"dependency_audit": true, "secret_scanning": true, "sast": true},
  "documentation_strategy": "文档模板",
  "version_confidence": "range",
  "evidence": ["path/to/file:45-60"]
}
```

JSON Schema（草案）（不包含锁定文件来源字段）:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["name", "type", "tech_stack", "architecture", "business", "scale", "documentation_strategy"],
  "properties": {
    "name": {"type": "string", "minLength": 1},
    "type": {"type": "string", "enum": ["frontend", "backend", "cli", "monorepo", "fullstack"]},
    "tech_stack": {
      "type": "object",
      "required": ["languages", "frameworks"],
      "properties": {
        "languages": {
          "type": "object",
          "required": ["primary"],
          "properties": {"primary": {"type": "string"}, "others": {"type": "array", "items": {"type": "string"}}}
        },
        "frameworks": {"type": "object"},
        "build_tools": {"type": "array", "items": {"type": "string"}},
        "runtimes": {"type": "object"},
        "package_managers": {"type": "object"}
      }
    },
    "architecture": {"type": "object"},
    "business": {"type": "object"},
    "scale": {
      "type": "object",
      "required": ["files_count", "loc"],
      "properties": {"files_count": {"type": "integer", "minimum": 0}, "loc": {"type": "integer", "minimum": 0}, "packages": {"type": "integer", "minimum": 0}}
    },
    "ci_cd": {"type": "object"},
    "infrastructure": {"type": "object"},
    "security": {"type": "object"},
    "scan": {"type": "object"},
    "documentation_strategy": {"type": "string"},
    "evidence": {"type": "array", "items": {"type": "string"}},
    "version_confidence": {"type": "string", "enum": ["exact", "range", "approximate"]}
  }
}
```

Markdown 报告要求包含：
- 项目概览（含结论与证据引用）
- 技术栈（版本、来源文件与行号）
- 架构特征（判定依据）
- 业务与接口（路由/API/事件/任务）
- 项目规模（统计方法与排除项）
- CI/CD 与部署
- 基础设施与数据存储
- 安全与合规（审计/SAST/Secrets/SBOM）
- 文档策略
- 知识库

### 证据引用规范
- 使用 `file_path:line_number` 或 `file_path:start-end` 形式
- 对每个关键结论至少提供 1 条证据
- 证据需可在仓库中直接定位并复现

### 规模统计方法
- files_count: 扫描仓库（排除 .git、dist、build、coverage、node_modules、.venv 等）
- loc: 按语言统计有效代码行，排除空行/注释/压缩产物/锁文件
- packages: monorepo 下 package/* 或 apps/*、packages/* 目录计数
- 统计遵循“文件扫描与过滤规则”，记录 skipped_files_count 与可选 skipped_reasons

### 文件扫描与过滤规则
- 目录忽略: .git, node_modules, dist, build, coverage, .cache, .venv, .terraform, vendor, target, .next, .turbo, out, .pnpm-store, tmp
- 文件忽略: 二进制/媒体/归档与映射文件: *.png, *.jpg, *.jpeg, *.gif, *.webp, *.svg, *.pdf, *.zip, *.tar, *.tar.gz, *.tgz, *.7z, *.jar, *.apk, *.exe, *.dll, *.so, *.dylib, *.bin, *.woff, *.woff2, *.map
- 锁定文件忽略: package-lock.json, pnpm-lock.yaml, yarn.lock, poetry.lock, go.sum
- 超大文件忽略: 行数 > 12000 或 大小 > 400000 字节
- 软链接与循环: 跳过符号链接导致的循环引用
- 计数策略: 被忽略文件不计入 loc 与 files_count；记录 skipped_files_count
- 可配置阈值: 支持环境变量 REPOWIKI_MAX_FILE_LINES=12000 与 REPOWIKI_MAX_FILE_BYTES=400000 覆盖

### 阶段0读取策略（最小化）
- 白名单文件: package.json, tsconfig*.json, pnpm-workspace.yaml/yarn.workspaces, turbo.json, next.config.js, vite.config.*, nest-cli.json, biome.json/.eslintrc*, .nvmrc/.tool-versions, Dockerfile, docker-compose.yml, .github/workflows/*.yml, README.md, CONTRIBUTING.md
- 入口源码仅限: src/index.ts, src/main.ts, src/cli.ts, src/server.ts 中最多3个文件；且仅读前200行
- 禁止递归读取 src/**（除上述入口外）
- 每目录采样≤5；总读取文件≤20；总读取字节≤1,000,000
- 早停策略: 一旦确定项目类型与模板，且证据≥3条且置信度≥0.9，立即停止读取
- 若 $1=full: whitelist_only=false,max_files=50,max_per_dir=10,max_depth=3,head_lines=400,stop_confidence=0.95
- 可通过环境变量覆盖：REPOWIKI_PHASE0_WHITELIST_ONLY=true, REPOWIKI_PHASE0_MAX_FILES=20, REPOWIKI_PHASE0_MAX_BYTES=1000000, REPOWIKI_PHASE0_MAX_PER_DIR=5, REPOWIKI_PHASE0_MAX_DEPTH=2, REPOWIKI_PHASE0_HEAD_LINES=200, REPOWIKI_PHASE0_STOP_CONFIDENCE=0.9

### 验收标准
- 禁止读取锁定文件（package-lock.json、pnpm-lock.yaml、yarn.lock、poetry.lock、go.sum）
- 结论均有证据引用，且可复现
- 版本信息来自配置/运行环境/容器/CI，不读取锁定文件
- JSON 通过上述 Schema 校验（新增字段 version_confidence 合法值 exact|range|approximate）
- Markdown 报告章节完整、结构一致

## 🔍 分析方法

1. 扫描项目根目录结构（识别 apps/packages/src 等）
2. 分析配置文件（package.json、tsconfig.json、pyproject.toml、go.mod、Dockerfile、.tool-versions）
3. 识别源码目录组织方式与命名约定
4. 分析核心代码文件内容与入口（main.tsx/index.ts、cmd/main.go 等）
5. 分析 CI/CD（.github/workflows、.gitlab-ci.yml）与部署清单
6. 识别数据库/缓存/消息/IaC（Terraform、Pulumi）
7. 查阅现有文档（README/CONTRIBUTING）
8. 综合推断项目特点并回填证据

## ⚠️ 注意事项

- 确保分析结果准确，有代码与配置文件证据
- 技术栈识别精确到版本与来源文件
- 架构模式推断必须列出判定依据
- 规模统计遵循排除规则，保持可复现
- 不记录和不输出任何密钥/凭据内容
- 禁止读取锁定文件（package-lock.json、pnpm-lock.yaml、yarn.lock、poetry.lock、go.sum）
- 严禁上传外部网络收集数据，除非显式允许
- 输出需稳定、可重复，避免非确定性行为
