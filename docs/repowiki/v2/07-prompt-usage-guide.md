# Prompt 使用指南

> **版本**: v2.0
> **用途**: 指导如何使用 v2 版本文档生成框架
> **目标用户**: 开发者、技术文档工程师、AI 助手

---

## 🎯 概述

本文档介绍如何将 `/docs/repowiki/v2/` 目录下的文档设计作为 Prompt 提供给大模型，实现智能化的代码仓库文档自动生成。

---

## 📁 v2 版本文档结构

```
/docs/repowiki/v2/
├── 00-main-plan.md                         # 主方案文档 - 四阶段流程总览
├── 01-phase0-project-profile.md            # 阶段0: 项目画像与上下文建立
├── 02-phase1-structure-analysis.md         # 阶段1: 智能结构分析
├── 03-phase2-deep-analysis.md              # 阶段2: 深度模块挖掘
├── 04-phase3-documentation-generation.md   # 阶段3: 文档生成
├── 05-automation-prompts.md                # 自动化提示词设计
├── 06-enhanced-features.md                 # 增强功能设计
└── README.md                               # v2 版本导航首页
```

---

## 🚀 使用方案

### 方案1: 分层递进式 Prompt（推荐）

```markdown
# 角色定义

你是一个专业的代码架构分析师和技术文档工程师，请按照以下四阶段流程为项目生成完整的 Wiki 文档库。

# 参考文档体系

请参考 `/docs/repowiki/v2/` 目录下的文档设计规范：

## 阶段0: 项目画像（先执行）
- `01-phase0-project-profile.md` - 技术栈识别和架构推断
- 三层识别：语言 → 框架 → 架构模式
- 业务层次划分：路由/API/数据模型

## 阶段1: 结构分析
- `02-phase1-structure-analysis.md` - 核心模块识别
- 优先级算法：入口文件×3 + 引用次数×2 + 代码行数×1
- 复杂度评估和文档规划

## 阶段2: 深度挖掘
- `03-phase2-deep-analysis.md` - 模块深度分析
- 数据流追踪和架构模式提取
- 流程图生成规范

## 阶段3: 文档生成
- `04-phase3-documentation-generation.md` - 文档模板
- `05-automation-prompts.md` - 完整提示词

# 执行流程

1. 先从阶段0开始，进行项目画像分析
2. 基于画像结果选择适当的文档模板
3. 按阶段1 → 阶段2 → 阶段3 顺序执行
4. 每个阶段完成后进行质量检查

# 输出要求
- 使用 Mermaid 图表
- 代码引用精确到行号
- 符合 v2 版本的文档结构规范
- 包含框架特定的最佳实践
```

### 方案2: 模块化 Prompt 调用

```bash
# 分阶段调用大模型
neo --prompt @docs/repowiki/v2/01-phase0-project-profile.md --target my-project/
neo --prompt @docs/repowiki/v2/02-phase1-structure-analysis.md --input project-profile.json
neo --prompt @docs/repowiki/v2/03-phase2-deep-analysis.md --input analysis-report.md
neo --prompt @docs/repowiki/v2/04-phase3-documentation-generation.md --input deep-analysis/
```

### 方案3: 配置文件驱动

```yaml
# config.yaml
version: "v2"
prompt_dir: "/docs/repowiki/v2/"

stages:
  - name: "project-profile"
    prompt_file: "01-phase0-project-profile.md"
    output: "project-profile.json"

  - name: "structure-analysis"
    prompt_file: "02-phase1-structure-analysis.md"
    depends_on: "project-profile"

  - name: "deep-analysis"
    prompt_file: "03-phase2-deep-analysis.md"
    depends_on: "structure-analysis"

  - name: "documentation"
    prompt_file: "04-phase3-documentation-generation.md"
    depends_on: "deep-analysis"
```

---

## 📊 集成方式

### 1. 命令行工具集成

```bash
# 使用 v2 版本生成文档
neo wiki-generate --version v2 --project-dir ./my-project

# 指定特定阶段
neo wiki-generate --stage phase0 --version v2
neo wiki-generate --stage phase1 --version v2
neo wiki-generate --stage phase2 --version v2
neo wiki-generate --stage phase3 --version v2

# 使用配置文件
neo wiki-generate --config wiki-config.yaml
```

### 2. API 调用方式

```javascript
// 在代码中调用
const wikiGenerator = require('@neovate/wiki-generator');

const result = await wikiGenerator.generate({
  version: 'v2',
  projectPath: './my-project',
  stages: ['phase0', 'phase1', 'phase2', 'phase3'],
  config: {
    template: 'auto' // 根据项目画像自动选择
  }
});
```

### 3. 配置文件方式

```json
{
  "wikiGeneration": {
    "version": "v2",
    "promptDirectory": "./docs/repowiki/v2/",
    "stages": [
      {
        "name": "phase0",
        "prompt": "01-phase0-project-profile.md",
        "output": "project-profile.json"
      },
      {
        "name": "phase1",
        "prompt": "02-phase1-structure-analysis.md",
        "dependsOn": "phase0"
      },
      {
        "name": "phase2",
        "prompt": "03-phase2-deep-analysis.md",
        "dependsOn": "phase1"
      },
      {
        "name": "phase3",
        "prompt": "04-phase3-documentation-generation.md",
        "dependsOn": "phase2"
      }
    ]
  }
}
```

---

## 🎯 各阶段 Prompt 使用要点

### 阶段0: 项目画像 (`01-phase0-project-profile.md`)

**输入**: 项目源代码目录
**输出**: 项目画像 JSON 和报告
**关键能力**:
- 三层技术栈识别
- 架构模式推断
- 业务结构提取
- 动态模板选择

**使用示例**:
```bash
# 分析 Next.js 项目
neo --prompt @v2/01-phase0-project-profile.md --project ./nextjs-app/
```

### 阶段1: 结构分析 (`02-phase1-structure-analysis.md`)

**输入**: 项目画像结果
**输出**: 结构分析报告和模块优先级
**关键能力**:
- 核心模块识别算法
- 复杂度评估
- 文档规划

### 阶段2: 深度挖掘 (`03-phase2-deep-analysis.md`)

**输入**: 模块优先级列表
**输出**: 深度分析报告和图表
**关键能力**:
- 代码深度分析
- 数据流追踪
- 架构模式提取

### 阶段3: 文档生成 (`04-phase3-documentation-generation.md`)

**输入**: 深度分析结果
**输出**: 完整文档库
**关键能力**:
- 多种文档模板
- 质量检查标准
- 自动化图表生成

---

## 🔧 自定义和扩展

### 添加新的项目类型模板

1. 在阶段0的模板选择逻辑中添加新类型
2. 创建对应的文档模板
3. 更新知识库内容

### 扩展分析维度

```yaml
extensions:
  - name: "security-audit"
    prompt: "security-audit.md"
    depends_on: "phase2"

  - name: "performance-review"
    prompt: "performance-review.md"
    depends_on: "phase2"

  - name: "code-quality"
    prompt: "code-quality.md"
    depends_on: "phase1"
```

### 自定义输出格式

支持多种输出格式：
- Markdown（默认）
- HTML
- PDF
- JSON（机器可读）

---

## 📈 性能优化建议

### 并行处理
```yaml
parallelism:
  stage0: 1    # 串行执行
  stage1: 4    # 并行分析4个模块
  stage2: 2    # 并行分析2个模块
  stage3: 8    # 并行生成8个文档
```

### 缓存机制
```bash
# 启用缓存
neo wiki-generate --version v2 --cache-enabled

# 清除缓存
neo wiki-generate --version v2 --clear-cache
```

### 增量更新
```bash
# 只分析变更的文件
neo wiki-generate --version v2 --incremental

# 指定git commit范围
neo wiki-generate --version v2 --since-commit HEAD~10
```

---

## 🐛 故障排除

### 常见问题

1. **内存不足**
   ```bash
   # 增加内存限制
   neo wiki-generate --version v2 --max-memory 4096
   ```

2. **超时问题**
   ```bash
   # 增加超时时间
   neo wiki-generate --version v2 --timeout 3600
   ```

3. **编码问题**
   ```bash
   # 指定文件编码
   neo wiki-generate --version v2 --encoding utf-8
   ```

### 调试模式

```bash
# 启用详细日志
neo wiki-generate --version v2 --verbose

# 保存中间结果
neo wiki-generate --version v2 --debug --save-intermediate

# 生成执行报告
neo wiki-generate --version v2 --generate-report
```

---

## 🔄 版本管理

### 版本兼容性

| 版本 | 特性 | 兼容性 |
|------|------|--------|
| v1.0 | 基础三阶段 | 向后兼容 |
| v2.0 | 四阶段 + 项目画像 | 当前版本 |

### 升级指南

从 v1.0 升级到 v2.0：

1. 保留原有的三阶段分析逻辑
2. 新增阶段0进行项目画像
3. 根据画像结果优化后续分析
4. 更新提示词和模板系统

---

## 📊 监控和指标

### 性能指标

```json
{
  "performance": {
    "total_time": 125.4,
    "stage0_time": 15.2,
    "stage1_time": 20.1,
    "stage2_time": 45.3,
    "stage3_time": 44.8,
    "memory_peak": 512.5
  },
  "quality": {
    "completeness": 95,
    "accuracy": 92,
    "readability": 88,
    "usability": 90
  }
}
```

### 日志记录

```bash
# 生成执行日志
neo wiki-generate --version v2 --log-file generation.log

# 详细的性能日志
neo wiki-generate --version v2 --perf-log performance.json
```

---

## 🎯 最佳实践

### 1. 分阶段执行
```bash
# 先进行项目画像
neo wiki-generate --stage phase0 --version v2

# 检查画像结果后再继续
neo wiki-generate --stage phase1 --version v2
```

### 2. 质量检查
```bash
# 生成后自动检查质量
neo wiki-generate --version v2 --quality-check

# 生成质量报告
neo wiki-generate --version v2 --quality-report quality.json
```

### 3. 版本控制集成
```bash
# 与git集成
neo wiki-generate --version v2 --git-integration

# 生成变更记录
neo wiki-generate --version v2 --changelog
```

---

## 📝 示例用例

### 用例1: Next.js 项目文档生成

```bash
# 生成 Next.js 项目完整文档
neo wiki-generate --version v2 --project ./nextjs-app/ --template frontend-nextjs

# 输出包含:
# - App Router 架构说明
# - Server Components 指南
# - API Routes 文档
# - 性能优化建议
```

### 用例2: NestJS 项目文档生成

```bash
# 生成 NestJS 项目文档
neo wiki-generate --version v2 --project ./nestjs-api/ --template backend-nestjs

# 输出包含:
# - 模块系统说明
# - 依赖注入文档
# - 守卫和拦截器指南
# - 微服务架构
```

### 用例3: CLI 工具文档生成

```bash
# 生成 CLI 工具文档
neo wiki-generate --version v2 --project ./cli-tool/ --template cli-tool

# 输出包含:
# - 命令系统说明
# - 使用工作流程
# - 插件开发指南
# - 配置系统文档
```

---

## 🔮 未来规划

### 短期计划
- [ ] 支持更多项目类型模板
- [ ] 优化性能和大项目处理
- [ ] 增强可视化图表生成

### 中长期计划
- [ ] 机器学习优化分析精度
- [ ] 实时协作编辑支持
- [ ] 多语言文档生成
- [ ] 集成更多开发工具

---

## 📚 相关资源

- [v2 版本设计总览](../00-main-plan.md)
- [自动化提示词设计](../05-automation-prompts.md)
- [增强功能说明](../06-enhanced-features.md)
- [GitHub 项目地址](https://github.com/cloudyan/neovate-code)

---

**让文档生成更智能、更高效、更贴合项目需求!** 🚀
