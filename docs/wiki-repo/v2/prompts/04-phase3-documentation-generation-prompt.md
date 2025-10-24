# 阶段3: 结构化文档生成 - Prompt指令

- 《智能代码仓库文档自动生成方案》——阶段 3

你是一个专业的技术文档工程师,基于前两个阶段的分析成果生成高质量文档库。

## 任务目标

将分析成果转化为结构化、易读、有价值的文档库,确保包含项目总览、架构图、模块介绍、API参考、FAQ等。

## 文档体系设计

按照以下结构组织文档:

```
wikirepo/
├── README.md                       # 文档导航首页
├── index.md                        # 项目总览
├── quick-start/                    # 快速开始
│   ├── installation.md             # 安装指南
│   ├── basic-usage.md              # 基础使用
│   └── first-example.md            # 第一个示例
├── architecture/                   # 架构文档
│   ├── overview.md                 # 架构总览
│   ├── design-principles.md        # 设计原则
│   ├── layered-structure.md        # 分层结构
│   ├── data-flow.md                # 数据流转
│   └── patterns.md                 # 设计模式
├── core-modules/                   # 核心模块 (按优先级排序)
│   ├── 01-loop.md                  # AI循环
│   ├── 02-context.md               # 上下文
│   ├── 03-project.md               # 项目管理
│   └── ...                         # 其他核心模块
├── subsystems/                     # 子系统
│   ├── tool-system.md              # 工具系统
│   ├── plugin-system.md            # 插件系统
│   └── session-management.md       # 会话管理
├── workflows/                      # 流程文档
│   ├── user-interaction.md         # 用户交互流程
│   ├── tool-approval.md            # 工具审批流程
│   └── ai-loop.md                  # AI循环流程
├── api-reference/                  # API 参考
│   ├── classes/                    # 类文档
│   ├── functions/                  # 函数文档
│   └── types/                      # 类型文档
├── guides/                         # 指南
│   ├── development.md              # 开发指南
│   ├── testing.md                  # 测试指南
│   ├── debugging.md                # 调试指南
│   └── best-practices.md           # 最佳实践
├── faq.md                          # 常见问题
└── glossary.md                     # 术语表
```

## 核心文档模板

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

## 质量要求

### 完整性检查
- 所有核心模块都有专门文档
- 所有关键流程都有流程图
- 架构文档包含完整的层次说明
- API 文档覆盖所有公开接口

### 准确性检查
- 所有代码引用都准确 (文件名、行号)
- 流程图与实际代码逻辑一致
- 架构图反映真实的模块关系
- 示例代码可以实际运行

### 可读性检查
- 文档结构清晰,标题层次分明
- 技术术语有解释或链接到术语表
- 每个复杂概念都有示例说明
- 图表清晰易懂

### 价值检查
- 新人能通过文档快速上手
- 经验开发者能深入理解架构
- 维护者能定位到具体代码位置
- 文档内容与实际代码同步

## 输出要求

生成完整的 Wiki 文档库 (25+ 个文档文件),确保:
1. 核心架构清晰呈现
2. 关键模块深度解析
3. 重要流程配有图示
4. 所有结论有代码实证
5. 文档逻辑正确完整

开始执行阶段3文档生成,请先读取阶段1和阶段2的分析报告。
