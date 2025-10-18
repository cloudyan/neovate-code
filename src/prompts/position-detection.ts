import type { JobPosition } from './evaluation-prompts';

type PositionKeywords = Record<JobPosition, string[]>;

export const positionDetectionPrompt = `
你是一个专业的HR岗位识别专家，能够根据简历内容快速准确地识别出候选人最适合的岗位类型。

请分析以下简历内容，并识别出最适合的岗位类型。

支持的岗位类型包括：
1. frontend - 前端开发工程师
2. backend - 后端开发工程师
3. fullstack - 全栈开发工程师
4. mobile - 移动端开发工程师（Android/iOS）
5. data - 数据工程师/数据分析师
6. devops - DevOps工程师/运维工程师
7. ai - AI工程师/机器学习工程师
8. qa - 测试工程师
9. security - 安全工程师

分析维度：
- 技术栈关键词（编程语言、框架、工具等）
- 项目经验描述
- 工作职责说明
- 专业技能列表

请严格按照以下JSON格式输出结果：
{
  "position": "岗位类型（从上述列表中选择最匹配的一个）",
  "confidence": 0-100的置信度分数,
  "reason": "识别理由，不超过50字"
}

简历内容：
{resume_content}

输出JSON格式结果：
`;

export const positionKeywords: PositionKeywords = {
  frontend: [
    'React',
    'Vue',
    'Angular',
    'JavaScript',
    'TypeScript',
    'HTML',
    'CSS',
    'Webpack',
    'Vite',
    '前端',
    'UI',
    '组件',
    'Redux',
    'Next.js',
    'Nuxt.js',
  ],
  backend: [
    'Java',
    'Python',
    'Go',
    'Node.js',
    'Spring',
    '微服务',
    'API',
    '数据库',
    '后端',
    '服务器',
    'Django',
    'Flask',
    'Express',
    'Koa',
    'MySQL',
    'PostgreSQL',
    'MongoDB',
  ],
  fullstack: ['全栈', 'MERN', 'MEAN', '前后端', 'Full Stack', '前后端分离'],
  mobile: [
    'Android',
    'iOS',
    'React Native',
    'Flutter',
    '移动端',
    '移动开发',
    'Kotlin',
    'Swift',
    'Xcode',
    'Android Studio',
    '跨平台',
  ],
  data: [
    '数据',
    'Python',
    'SQL',
    '数据分析',
    '机器学习',
    'AI',
    'TensorFlow',
    'PyTorch',
    '数据挖掘',
    '大数据',
    'Hadoop',
    'Spark',
    'Pandas',
    'NumPy',
    'R语言',
  ],
  devops: [
    'Docker',
    'Kubernetes',
    'CI/CD',
    'Jenkins',
    'AWS',
    'Azure',
    'GCP',
    '运维',
    '部署',
    '监控',
    'Ansible',
    'Terraform',
    'Prometheus',
    'Grafana',
  ],
  ai: [
    '机器学习',
    '深度学习',
    'AI',
    'TensorFlow',
    'PyTorch',
    '神经网络',
    '算法',
    'NLP',
    '计算机视觉',
    '自然语言处理',
    '图像识别',
    '模型训练',
  ],
  qa: [
    '测试',
    'Test',
    'QA',
    '自动化测试',
    'Selenium',
    'JUnit',
    '质量保证',
    '测试用例',
    '性能测试',
    '接口测试',
    '功能测试',
  ],
  security: [
    '安全',
    'Security',
    '渗透测试',
    '漏洞',
    '加密',
    '网络安全',
    'OWASP',
    '防火墙',
    '入侵检测',
    '安全审计',
  ],
  unknown: [],
};
