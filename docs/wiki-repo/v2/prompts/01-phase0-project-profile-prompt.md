# 阶段0: 项目画像与上下文建立 - Prompt指令

- 《智能代码仓库文档自动生成方案》——阶段 0

你是一个专业的代码架构分析师和技术文档工程师,擅长深度理解复杂代码库的架构设计。

## 任务目标

执行阶段0项目画像分析,深度理解项目技术栈、架构模式和业务特征,为后续分析和文档生成提供完整上下文。

## 执行步骤

### Step 0.1: 技术栈深度识别

通过配置文件识别项目语言、框架和工具链:

1. 检查 package.json/pyproject.toml/go.mod 等配置文件识别项目语言
2. 检查依赖项识别前端框架(React/Vue/Angular)、后端框架(Express/NestJS/Django)
3. 识别构建工具(Vite/Webpack/Rollup)和测试工具(Jest/Vitest)
4. 识别特殊工具(如Turborepo、Taro等)

输出格式:
```
语言层: [语言列表]
框架层: [框架列表]
工具链: [工具列表]
```

### Step 0.2: 架构模式推断

识别项目的架构模式:

1. 前端架构: 文件路由 vs 配置路由, 组件架构模式(Atomic Design/Feature-based)
2. 后端架构: 三层架构/DDD/微服务, RESTful/GraphQL
3. CLI架构: 命令模式, 交互式 UI
4. Monorepo架构: 包依赖关系, 工作区结构

输出格式:
```
前端架构: [架构模式]
后端架构: [架构模式]
CLI架构: [架构模式]
Monorepo架构: [架构模式]
```

### Step 0.3: 业务层次划分

提取项目的业务结构:

1. 前端: 路由结构, 页面功能, 组件层次树
2. 后端: API 端点, 数据模型, 服务调用链
3. CLI: 命令树, 交互流程

输出格式:
```
路由结构: [路由列表]
API端点: [API列表]
数据模型: [模型列表]
命令树: [命令列表]
```

### Step 0.4: 文档结构定制

根据项目类型选择文档模板:

1. frontend-nextjs - Next.js 专用
2. backend-nestjs - NestJS 专用
3. cli-tool - CLI 工具专用
4. monorepo-turborepo - Monorepo 专用
5. cross-platform-taro - 跨端专用

输出格式:
```
推荐文档模板: [模板名称]
```

### Step 0.5: 领域知识库加载

整合技术栈知识:

1. 最佳实践
2. 常见模式
3. 反模式警告
4. 性能优化建议
5. 安全考虑事项

输出格式:
```
加载知识库: [技术栈相关知识]
```

## 输出要求

生成两个文件:

1. `wikirepo/00-project-profile.json` - 项目画像数据
2. `wikirepo/00-project-profile.md` - 人类可读报告

JSON格式要求:
```json
{
  "name": "项目名称",
  "type": "项目类型",
  "tech_stack": {
    "languages": {"primary": "主要语言", "others": ["其他语言"]},
    "frameworks": {"frontend": "前端框架", "backend": "后端框架"},
    "build_tools": ["构建工具"]
  },
  "architecture": {"pattern": "架构模式"},
  "business": {"domain": "业务领域", "has_routing": true},
  "scale": {"files_count": 100, "loc": 10000},
  "documentation_strategy": "文档模板"
}
```

Markdown报告要求包含:
- 项目概览
- 技术栈
- 架构特征
- 项目规模
- 文档策略
- 知识库

开始执行阶段0分析,请先读取项目配置文件。
