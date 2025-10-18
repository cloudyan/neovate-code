---
name: evaluate
description: 基于AI招聘专家标准的简历筛选评估工具
disabled: false
params:
  - name: content
    description: 直接提供的简历内容（Markdown格式或JSON）
    type: string
    required: false
  - name: files
    description: 简历文件路径（支持通配符）
    type: string
    required: false
  - name: position
    description: 岗位类型（auto/frontend/backend/fullstack/mobile/data/devops/ai/qa/security）
    type: string
    required: false
    default: auto
  - name: prompt
    description: 自定义评估Prompt
    type: string
    required: false
  - name: output
    description: 输出文件路径
    type: string
    required: false
---

基于AI招聘专家标准的简历筛选评估工具。

## 使用示例

### 自动识别岗位并评估简历
```
/evaluate content="张三\n电话：138-1234-5678\n邮箱：zhangsan@example.com\n\n教育背景\n2015-2019 北京大学 计算机科学与技术 本科\n\n工作经历\n2019-2021 腾讯 高级前端工程师\n- 负责公司核心产品的前端开发工作\n- 使用React和TypeScript构建大型单页应用\n- 优化首屏加载速度，提升15%"
```

### 指定岗位类型评估
```
/evaluate content="简历内容" position="backend"
```

### 批量评估并自动识别岗位
```
/evaluate files="resumes/*.md" output="evaluations.json"
```

## 功能特性

- **岗位自动识别**: 智能识别简历最适合的岗位类型
- **多岗位支持**: 支持前端、后端、全栈、移动端、数据、DevOps、AI、测试、安全等岗位
- **10秒快速评估**: 快速判断简历是否值得约面
- **0-100分量化评分**: 客观量化评估结果
- **风险识别**: 识别年限注水、技术栈造假等风险点
- **技术栈提取**: 提取简历中的真实技术栈
- **核心亮点生成**: 自动生成候选人核心亮点
- **批量处理**: 支持同时评估多个简历文件

## 评估标准

评估标准参考拥有10年招聘经验的技术负责人标准：
- 检查必需技术栈
- 检查项目规模和业绩量化指标
- 检查跳槽频率是否合理
- 检查是否存在关键词堆砌
- 检查项目描述是否空泛
- 检查学历是否符合要求
- 检查项目描述是否有具体结果（STAR结构）
- 检查技术栈与项目描述是否匹配

## 风险识别

系统能够识别以下风险点：
- **年限注水**: 工作年限与项目经验不匹配
- **技术栈造假**: 技术栈与项目描述不匹配
- **项目夸大**: 项目描述夸大其词
- **业绩模糊**: 业绩描述不具体
- **关键词堆砌**: 过度使用关键词
- **跳槽频繁**: 工作经历过于频繁
- **学历存疑**: 学历不符合要求

## 输出结果

评估结果包含以下信息：
- **评分**: 0-100分量化评分
- **建议**: 可约/拒的明确建议
- **风险**: 识别出的风险点
- **技术栈**: 提取的真实技术栈
- **亮点**: 候选人核心亮点
- **岗位识别**: 自动识别的岗位类型及置信度

## 输出格式

工具默认输出JSON格式的评估结果：

```json
{
  "简历文件名.md": {
    "score": 85,
    "reason": "可约：React+TS大项目性能优化量化充分",
    "risk": [],
    "stack": ["React", "TypeScript", "Vite", "Node", "微前端"],
    "highlight": "首屏从2.1s优化到0.9s，UV+25%",
    "detectedPosition": {
      "position": "frontend",
      "confidence": 95,
      "reason": "简历中包含大量前端技术关键词"
    }
  }
}
```
