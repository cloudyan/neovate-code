# 简历评估与筛选系统

这是一个集成在 Neovate Code 中的简历评估与筛选系统，可以帮助您快速评估简历质量并提供改进建议。

## 功能特性

- **多格式支持**: 支持 TXT、PDF、DOCX 等常见简历格式
- **智能解析**: 自动提取简历中的关键信息
- **快速评估**: 10秒内完成简历评估
- **量化评分**: 0-100分量化评分
- **风险识别**: 识别年限注水、技术栈造假等风险
- **技术栈提取**: 提取真实技术栈
- **亮点生成**: 生成核心亮点
- **批量处理**: 支持同时评估多个简历文件
- **灵活输出**: 支持JSON格式报告

## 使用方法

### 1. 文档内容提取

使用 `document` 工具从各种格式的文档文件中提取内容并转换为标准Markdown格式：

```bash
# 提取单个文档
/document files="document.txt"

# 提取简历内容
/document files="resume.txt" content_type="resume"

# 批量提取文档到指定目录
/document files="documents/*.pdf" output="./markdown-docs"

# 自动检测内容类型
/document files="mixed/*.*" content_type="auto"
```

### 2. 简历评估

使用 `evaluate` 工具评估简历质量：

```bash
# 评估单个简历
/evaluate files="resume.md"

# 批量评估简历并生成报告
/evaluate files="resumes/*.md" output="evaluation.json"
```

## 评估标准

### 评分维度
- **技术栈匹配度**: 检查必需技术栈（React、TypeScript等）
- **项目规模和业绩**: 检查是否有量化业绩指标
- **跳槽频率**: 检查工作经历与年限是否匹配
- **关键词堆砌**: 检查是否存在关键词堆砌现象
- **空泛描述**: 检查项目描述是否过于空泛
- **学历要求**: 检查学历是否符合要求
- **STAR结构**: 检查项目描述是否有具体的结果
- **技术栈匹配度**: 检查技术栈与项目描述是否匹配

### 风险识别
- **年限注水**: 工作年限与项目经验不匹配
- **技术栈造假**: 技术栈与项目描述不匹配
- **项目夸大**: 项目描述夸大其词
- **业绩模糊**: 业绩描述不具体
- **关键词堆砌**: 过度使用关键词
- **跳槽频繁**: 工作经历过于频繁
- **学历存疑**: 学历不符合要求

## 输出结果

评估结果包含以下信息：
- 量化评分（0-100分）
- 约面建议（可约/拒）
- 风险点识别
- 真实技术栈提取
- 核心亮点生成

## 示例

### 输入简历 (TXT格式)

```
张三
电话：138-1234-5678
邮箱：zhangsan@example.com

教育背景
2015-2019 北京大学 计算机科学与技术 本科

工作经历
2019-2021 腾讯 高级前端工程师
- 负责公司核心产品的前端开发工作
- 使用React和TypeScript构建大型单页应用
- 优化首屏加载速度，提升15%

技能
- 编程语言：JavaScript, TypeScript, HTML5, CSS3
- 前端框架：React, Vue, Angular
```

### 评估结果 (JSON格式)

```json
{
  "extracted-resumes/张三.md": {
    "score": 85,
    "reason": "可约：React+TS大项目性能优化量化充分",
    "risk": [],
    "stack": [
      "React",
      "TypeScript",
      "Vue",
      "Angular"
    ],
    "highlight": "优化首屏加载速度，提升15%"
  }
}
```

## 技术实现

### 核心组件

1. **document.ts** - 通用文档内容提取工具
   - 支持多种文件格式
   - 可扩展的解析器架构
   - 支持简历和通用文档两种解析模式
   - 标准化输出为Markdown格式

2. **evaluate.ts** - 简历评估工具
   - 10秒快速评估算法
   - 0-100分量化评分系统
   - 风险识别机制
   - 技术栈提取
   - 亮点生成

3. **evaluator.ts** - 插件集成
   - 工具注册
   - 斜杠命令定义

### 集成方式

系统通过 Neovate Code 的插件架构集成，包括：
- 工具注册 (`src/tool.ts`)
- 插件定义 (`src/plugins/evaluator.ts`)
- 斜杠命令配置 (`.neovate/commands/`)

### 扩展架构

文档提取工具采用可扩展的解析器架构：

```typescript
interface DocumentParser {
  supportedExtensions: string[];
  extractText(filePath: string): string;
  parseContent?(content: string): Partial<DocumentInfo>;
}
```

通过实现 `DocumentParser` 接口，可以轻松添加新的文档格式支持，如：
- PDF 解析器（使用 pdfjs-dist 库）
- Word 解析器（使用 mammoth 库）
- Excel 解析器（使用 xlsx 库）
- 自定义格式解析器

## 扩展性

系统设计具有良好的扩展性：
- 可轻松添加新的文件格式支持
- 可自定义评估标准和权重
- 可扩展评估维度和指标
- 支持自定义输出格式

## 注意事项

1. 当前版本主要支持TXT格式文件，PDF和DOCX格式需要额外的依赖库
2. 评估算法基于关键词匹配和模式识别，可能需要根据具体需求调整
3. 建议结合人工审核进行最终决策
4. 系统会自动创建输出目录，如果不存在的话

## 未来改进

1. 支持更多文件格式（PDF、DOCX等）
2. 更智能的内容解析和理解
3. 机器学习驱动的评估算法
4. 可视化评估报告
5. 简历模板推荐功能
