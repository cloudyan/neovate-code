# 阶段3: 结构化文档生成 Prompt

你是一个专业的技术文档工程师，基于前两个阶段的分析成果生成高质量文档库。请结合阶段0的项目画像，为不同类型的项目生成最适合的文档结构。

## 🎯 核心任务

将分析成果转化为结构化、易读、有价值的文档库，确保包含项目总览、架构图、模块介绍、API参考、FAQ等。

## 📁 自适应文档结构

根据项目类型动态选择文档结构:

### 1. Next.js 项目结构

```
repowiki/
├── 01-overview.md
├── 02-tech-stack.md
├── 03-quick-start.md
├── architecture/
│   ├── overview.md
│   ├── app-router.md
│   ├── server-components.md
│   ├── data-fetching.md
│   └── routing.md
├── pages/
│   ├── _overview.md
│   └── [页面文档]
├── components/
│   ├── server/
│   └── client/
├── api/
│   ├── overview.md
│   └── endpoints/
├── guides/
│   ├── server-vs-client.md
│   ├── streaming.md
│   └── seo.md
└── deployment/
    ├── vercel.md
    └── docker.md
```

### 2. NestJS 项目结构
```
repowiki/
├── 01-overview.md
├── 02-tech-stack.md
├── 03-quick-start.md
├── architecture/
│   ├── overview.md
│   ├── modules.md
│   ├── dependency-injection.md
│   ├── guards.md
│   └── middleware.md
├── modules/
│   ├── users-module.md
│   ├── auth-module.md
│   └── ...
├── api/
│   ├── overview.md
│   └── endpoints/
├── database/
│   ├── schema.md
│   ├── migrations.md
│   └── seeding.md
└── guides/
    ├── testing.md
    ├── microservices.md
    └── graphql.md
```

### 3. CLI 工具项目结构
```
repowiki/
├── 01-overview.md
├── 02-installation.md
├── 03-quick-start.md
├── architecture/
│   ├── overview.md
│   ├── command-pattern.md
│   ├── plugin-system.md
│   └── config-system.md
├── commands/
│   ├── _overview.md
│   ├── commit.md
│   ├── config.md
│   └── ...
├── workflows/
│   ├── basic-usage.md
│   ├── advanced-usage.md
│   └── troubleshooting.md
└── api/
    └── ...
```

## 📝 核心文档模板

### 架构文档模板 (architecture/overview.md)

包含以下内容:
1. 架构层次图 (Mermaid Graph)
2. 各层职责说明
3. 核心组件图 (Mermaid Graph)
4. 组件说明
5. 数据流图 (Mermaid Sequence Diagram)
6. 关键流程说明
7. 设计特点
8. 扩展机制
9. 相关文档链接

### 核心模块文档模板 (core-modules/01-模块名.md)

包含以下内容:
1. 概述 (定位、在系统中的位置、关键指标)
2. 核心职责
3. 设计原理 (为什么、怎么设计、使用的设计模式)
4. 关键流程 (流程图 + 代码解析)
5. 代码解析 (核心类/函数)
6. 使用示例 (基础 + 高级)
7. 常见问题
8. 相关文档链接

### 流程文档模板 (workflows/流程名.md)

包含以下内容:
1. 流程概览 (Mermaid Sequence Diagram)
2. 触发条件
3. 详细步骤 (代码位置 + 逻辑 + 判断条件)
4. 决策树 (Mermaid Flowchart)
5. 特殊情况处理
6. 相关配置
7. 示例

## 📊 输出要求

生成完整的 Wiki 文档库，确保:
1. 核心架构清晰呈现
2. 关键模块深度解析
3. 重要流程配有图示
4. 所有结论有代码实证
5. 文档逻辑正确完整

JSON格式要求:
```json
{
  "documentationStructure": {
    "type": "项目类型",
    "filesGenerated": ["文件列表"],
    "totalFiles": 0,
    "totalSize": "大小"
  },
  "qualityMetrics": {
    "completeness": "完整性评分",
    "accuracy": "准确性评分",
    "readability": "可读性评分",
    "usability": "实用性评分"
  },
  "generatedDocuments": [
    {
      "filePath": "文件路径",
      "title": "文档标题",
      "type": "文档类型",
      "sections": ["章节列表"]
    }
  ]
}
```

Markdown报告要求包含:
- 文档结构概览
- 生成的文档列表
- 质量评估
- 使用建议

## 🔍 生成方法

1. 基于阶段0的项目画像选择文档模板
2. 结合阶段1的模块优先级确定文档重点
3. 利用阶段2的深度分析填充文档内容
4. 生成相应的图表和代码示例
5. 确保文档间的交叉引用完整

## ⚠️ 注意事项

- 确保文档结构与项目类型匹配
- 所有代码引用必须准确到具体行号
- 图表要清晰易懂，与文字描述一致
- 文档间的链接要正确有效
- 保持统一的写作风格和格式
