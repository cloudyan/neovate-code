// 代码审查提示词模板函数 (对应英文原文件: /src/slash-commands/builtin/review.ts)
// 基于高质量版本，提供4步专业审查流程

export interface CodeReviewData {
  // 审查员专业领域
  specialty?:
    | '前端'
    | '后端'
    | '全栈'
    | '移动端'
    | 'AI/ML'
    | 'DevOps'
    | '安全'
    | '测试'
    | '架构';

  // 技术信息
  programmingLanguage?: string;
  framework?: string; // 框架信息

  // 统计数据
  added?: number;
  deleted?: number;
  filesChanged?: number; // 变更文件数

  // PR信息
  prNumber?: string;
  author?: string; // 作者信息
  reviewers?: string[]; // 审查者列表

  // 质量指标
  coverageReport?: string;
  testCoverage?: number; // 覆盖率百分比
  complexityScore?: number; // 复杂度评分

  // 配置选项
  language?: '中文' | '英文';
  severityThreshold?: '低' | '中' | '高'; // 严重程度阈值
  maxIssues?: number; // 最大问题数

  // 风格指南
  styleGuideUrl?: string;
}

export function codeReviewPrompt(data: CodeReviewData) {
  // 参数解构和默认值
  const {
    specialty = '全栈',
    programmingLanguage,
    framework,
    added = 0,
    deleted = 0,
    filesChanged = 0,
    prNumber,
    author,
    reviewers = [],
    coverageReport,
    testCoverage,
    complexityScore,
    language = '中文',
    severityThreshold = '中',
    maxIssues = 10,
    styleGuideUrl,
  } = data;

  return `
# 📋 代码审查任务 - ${specialty}专家

## 🚨 重要指令
- **严格按照4步执行，不得跳过或调整顺序**
- **每步完成后必须确认再进行下一步**
- **安全红线触发时立即停止，输出"## 🚨 安全阻断"**
- **仅输出指定格式，禁止任何额外解释或格式**

---

## 步骤1：获取差异
${
  prNumber
    ? `执行：bash("gh pr diff ${prNumber}")`
    : `执行：bash("git --no-pager diff --cached -- .")`
}

---

## 步骤2：安全红线检查

### 🚨 高危漏洞（立即阻断）
- **注入攻击**：SQL注入、NoSQL注入、命令注入、代码注入、LDAP注入
- **密钥泄露**：硬编码密钥、API密钥、证书、密码、Token
- **路径安全**：路径穿越、文件包含漏洞、目录遍历
- **反序列化**：不安全的反序列化、XXE攻击
- **认证授权**：权限绕过、身份认证缺陷、会话管理问题

### ⚠️ 中危风险（记录但继续）
- **XSS相关**：反射型XSS、存储型XSS、DOM型XSS
- **CSRF/SSRF**：跨站请求伪造、服务端请求伪造
- **信息泄露**：敏感信息暴露、调试信息泄露
- **加密问题**：弱加密算法、不安全的随机数生成

---

## 步骤3：代码质量审查

### 🎯 审查重点
- **代码逻辑**：算法效率、边界条件、错误处理、异常管理
- **架构设计**：模块耦合、接口设计、扩展性、可维护性
- **性能影响**：时间复杂度、内存使用、并发安全、资源管理
- **测试覆盖**：单元测试、集成测试、边界测试、异常测试
- **文档完整性**：注释质量、API文档、变更日志、README

### 📊 问题分级标准
- **严重**：安全漏洞、功能错误、性能瓶颈、数据丢失风险
- **重要**：代码异味、设计缺陷、测试缺失、性能问题
- **一般**：风格问题、命名规范、注释不足、代码格式

---

## 步骤4：结构化输出

\`\`\`markdown
## 📊 评审总结
- **变更规模**: ${added} 增 / ${deleted} 删 (涉及 ${filesChanged} 个文件)
- **风险等级**: 低 | 中 | 高 | 严重
- **评审结论**: ✅ 通过 | ⚠️ 要求修改 | ❌ 安全阻断
- **测试覆盖**: ${testCoverage ? `${testCoverage}%` : coverageReport ? '已提供' : '未提供'}
- **复杂度评分**: ${complexityScore || '未评估'}

## 🚨 问题列表
| 文件路径 | 行号 | 严重程度 | 问题类型 | 问题描述 | 修改建议 |
|----------|------|----------|----------|----------|----------|
| src/api/auth.ts | 45 | 严重 | 安全漏洞 | SQL注入风险 | 使用参数化查询 |
| ... | ... | ... | ... | ... | ... |

## ✨ 亮点表扬
1. [具体优点1] - [位置和原因]
2. [具体优点2] - [位置和原因]
3. [具体优点3] - [位置和原因]

## 📋 具体建议
- [ ] 修复安全漏洞
- [ ] 补充单元测试
- [ ] 优化性能瓶颈
- [ ] 完善文档注释
- [ ] 调整代码结构
\`\`\`

---

## 📏 输出规范
- **严格格式**：完全按照模板输出，不得修改格式
- **字数限制**：每格≤30字，问题描述≤20字，修改建议≤25字
- **行号精确**：提供GitHub可点击的行号格式
- **数量控制**：最多${maxIssues}个问题（按优先级排序）
- **严重程度阈值**：仅报告≥${severityThreshold}严重程度的问题

---

## 🎯 审查标准
${programmingLanguage ? `- **技术栈**: ${programmingLanguage}` : ''}
${framework ? `- **框架**: ${framework}` : ''}
${styleGuideUrl ? `- **风格指南**: ${styleGuideUrl}` : ''}
${testCoverage ? `- **覆盖率要求**: ≥80% (当前: ${testCoverage}%)` : '- **覆盖率要求**: ≥80%'}
- **审查语言**: ${language}
- **严重程度阈值**: ${severityThreshold}
- **最大问题数**: ${maxIssues}

---

## 📝 项目信息
- **PR编号**: ${prNumber || '本地提交'}
- **作者**: ${author || '未知'}
- **审查者**: ${reviewers.length > 0 ? reviewers.join(', ') : '未指定'}
- **生成时间**: ${new Date().toISOString()}
  `.trim();
}
