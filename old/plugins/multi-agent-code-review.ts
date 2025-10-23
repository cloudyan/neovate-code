import type { Plugin, PluginContext } from '../plugin';
import type { Tool } from '../tool';
import type { CodeReviewConfig } from '../config';
import { createCodeReviewTool } from '../tools/code-review';
import path from 'pathe';
import fs from 'fs';

// 代理类型定义
export interface CodeReviewAgent {
  name: string;
  category: 'security' | 'performance' | 'quality' | 'architecture';
  description: string;
  analyze: (files: string[], options?: any) => Promise<AgentResult[]>;
  priority: number; // 执行优先级
}

export interface AgentResult {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
  codeExample?: string;
  metadata?: Record<string, any>;
}

export interface MultiAgentReviewResult {
  summary: {
    totalIssues: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    agentsExecuted: string[];
    executionTime: number;
  };
  results: AgentResult[];
  recommendations: string[];
  metrics: {
    securityScore: number;
    performanceScore: number;
    qualityScore: number;
    architectureScore: number;
    overallScore: number;
  };
}

// 安全分析代理
class SecurityAnalysisAgent implements CodeReviewAgent {
  name = 'security-analyzer';
  category = 'security' as const;
  description = '专门检测安全漏洞、认证问题和加密弱点的代理';
  priority = 1; // 最高优先级

  async analyze(files: string[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // 检测注入攻击漏洞
        const injectionPatterns = [
          { pattern: /eval\s*\(/gi, severity: 'high', desc: '代码注入风险' },
          {
            pattern: /new\s+Function\s*\(/gi,
            severity: 'high',
            desc: '动态函数构造风险',
          },
          {
            pattern: /\$\{.*\}/gi,
            severity: 'medium',
            desc: '模板字符串注入风险',
          },
        ];

        injectionPatterns.forEach(({ pattern, severity, desc }) => {
          const matches = [...content.matchAll(pattern)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            results.push({
              category: 'security',
              priority: severity as any,
              title: `安全漏洞: ${desc}`,
              description: `在文件 ${file} 中发现潜在的${desc}`,
              file,
              line: lineNum,
              suggestion: '避免使用动态代码执行，使用安全的替代方案',
              codeExample:
                '// 危险: eval(userInput)\n// 安全: JSON.parse(userInput)',
              metadata: { type: 'injection', pattern: pattern.source },
            });
          });
        });

        // 检测硬编码密钥
        const secretPatterns = [
          { pattern: /password.*=.*["'][^"']+["']/gi, severity: 'critical' },
          { pattern: /api[_-]?key.*=.*["'][^"']+["']/gi, severity: 'critical' },
          { pattern: /secret.*=.*["'][^"']+["']/gi, severity: 'critical' },
        ];

        secretPatterns.forEach(({ pattern, severity }) => {
          const matches = [...content.matchAll(pattern)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            results.push({
              category: 'security',
              priority: 'high',
              title: '安全漏洞: 硬编码密钥',
              description: `在文件 ${file} 中发现硬编码的敏感信息`,
              file,
              line: lineNum,
              suggestion: '将敏感信息移至环境变量或安全配置文件',
              codeExample:
                '// 危险: const apiKey = "sk-xxx"\n// 安全: const apiKey = process.env.API_KEY',
              metadata: { type: 'hardcoded-secret', severity },
            });
          });
        });
      } catch (error) {
        console.warn(`安全分析失败 ${file}:`, error);
      }
    }

    return results;
  }
}

// 性能分析代理
class PerformanceAnalysisAgent implements CodeReviewAgent {
  name = 'performance-analyzer';
  category = 'performance' as const;
  description = '专门检测性能问题、内存泄漏和I/O阻塞的代理';
  priority = 2;

  async analyze(files: string[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // 检测同步I/O操作
        const syncIOPatterns = [
          { pattern: /readFileSync\s*\(/gi, impact: 'high' },
          { pattern: /writeFileSync\s*\(/gi, impact: 'high' },
          { pattern: /execSync\s*\(/gi, impact: 'high' },
        ];

        syncIOPatterns.forEach(({ pattern, impact }) => {
          const matches = [...content.matchAll(pattern)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            results.push({
              category: 'performance',
              priority: impact as any,
              title: '性能问题: 同步I/O操作',
              description: `在文件 ${file} 中发现阻塞式I/O操作`,
              file,
              line: lineNum,
              suggestion: '使用异步I/O方法避免阻塞事件循环',
              codeExample:
                '// 阻塞: fs.readFileSync(file)\n// 非阻塞: await fs.promises.readFile(file)',
              metadata: { type: 'sync-io', impact },
            });
          });
        });

        // 检测潜在内存泄漏
        const memoryLeakPatterns = [
          { pattern: /setInterval\s*\(/gi, impact: 'high' },
          { pattern: /addEventListener\s*\(/gi, impact: 'medium' },
        ];

        memoryLeakPatterns.forEach(({ pattern, impact }) => {
          const matches = [...content.matchAll(pattern)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            results.push({
              category: 'performance',
              priority: impact as any,
              title: '性能问题: 潜在内存泄漏',
              description: `在文件 ${file} 中发现可能导致内存泄漏的代码`,
              file,
              line: lineNum,
              suggestion: '确保在适当的时候清理定时器和事件监听器',
              codeExample: '// 记住清理: clearInterval(intervalId)',
              metadata: { type: 'memory-leak', impact },
            });
          });
        });
      } catch (error) {
        console.warn(`性能分析失败 ${file}:`, error);
      }
    }

    return results;
  }
}

// 代码质量分析代理
class QualityAnalysisAgent implements CodeReviewAgent {
  name = 'quality-analyzer';
  category = 'quality' as const;
  description = '专门检测代码复杂度、命名规范和代码重复的代理';
  priority = 3;

  async analyze(files: string[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // 检测复杂函数
        const functionMatches = [
          ...content.matchAll(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{500,}/gi),
        ];
        functionMatches.forEach((match) => {
          const lineNum =
            lines.findIndex((line) => line.includes(match[0])) + 1;
          results.push({
            category: 'quality',
            priority: 'medium',
            title: '代码质量: 函数过于复杂',
            description: `在文件 ${file} 中发现过于复杂的函数`,
            file,
            line: lineNum,
            suggestion: '将复杂函数拆分为更小的、职责单一的函数',
            codeExample:
              '// 复杂: 长函数包含多个职责\n// 简单: 拆分为多个小函数',
            metadata: { type: 'complex-function', complexity: 'high' },
          });
        });

        // 检测命名规范
        const namingPatterns = [
          { pattern: /var\s+[a-z]\s*=/gi, issue: '单字母变量名' },
          { pattern: /function\s+[a-z]\s*\(/gi, issue: '单字母函数名' },
        ];

        namingPatterns.forEach(({ pattern, issue }) => {
          const matches = [...content.matchAll(pattern)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            results.push({
              category: 'quality',
              priority: 'low',
              title: `代码质量: ${issue}`,
              description: `在文件 ${file} 中发现${issue}`,
              file,
              line: lineNum,
              suggestion: '使用描述性的变量和函数名',
              codeExample: '// 不佳: let a = 5\n// 良好: let userCount = 5',
              metadata: { type: 'naming', issue },
            });
          });
        });
      } catch (error) {
        console.warn(`质量分析失败 ${file}:`, error);
      }
    }

    return results;
  }
}

// 架构分析代理
class ArchitectureAnalysisAgent implements CodeReviewAgent {
  name = 'architecture-analyzer';
  category = 'architecture' as const;
  description = '专门检测架构一致性、模块耦合和设计模式的代理';
  priority = 4;

  async analyze(files: string[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const importMap = new Map<string, string[]>();

    // 分析导入关系
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        importMap.set(file, imports);
      } catch (error) {
        console.warn(`架构分析失败 ${file}:`, error);
      }
    }

    // 检测高耦合
    importMap.forEach((imports, file) => {
      if (imports.length > 15) {
        results.push({
          category: 'architecture',
          priority: 'medium',
          title: '架构问题: 模块高耦合',
          description: `文件 ${file} 导入了 ${imports.length} 个模块，耦合度过高`,
          file,
          suggestion: '考虑使用依赖注入、门面模式或拆分为更小的模块',
          codeExample:
            '// 高耦合: import many modules\n// 低耦合: use dependency injection',
          metadata: { type: 'high-coupling', importCount: imports.length },
        });
      }
    });

    return results;
  }
}

// 多代理协调器
class MultiAgentCodeReviewCoordinator {
  private agents: CodeReviewAgent[] = [];

  constructor() {
    this.agents = [
      new SecurityAnalysisAgent(),
      new PerformanceAnalysisAgent(),
      new QualityAnalysisAgent(),
      new ArchitectureAnalysisAgent(),
    ];
  }

  async executeReview(
    files: string[],
    categories: string[] = [
      'security',
      'performance',
      'quality',
      'architecture',
    ],
    options: any = {},
  ): Promise<MultiAgentReviewResult> {
    const startTime = Date.now();
    const allResults: AgentResult[] = [];
    const agentsExecuted: string[] = [];

    // 按优先级排序并执行代理
    const sortedAgents = this.agents
      .filter((agent) => categories.includes(agent.category))
      .sort((a, b) => a.priority - b.priority);

    for (const agent of sortedAgents) {
      try {
        console.log(`🤖 执行 ${agent.name} 代理...`);
        const agentResults = await agent.analyze(files, options);
        allResults.push(...agentResults);
        agentsExecuted.push(agent.name);
      } catch (error) {
        console.warn(`代理 ${agent.name} 执行失败:`, error);
      }
    }

    // 计算指标
    const metrics = this.calculateMetrics(allResults);

    // 生成建议
    const recommendations = this.generateRecommendations(allResults, metrics);

    const executionTime = Date.now() - startTime;

    return {
      summary: {
        totalIssues: allResults.length,
        byCategory: this.groupByCategory(allResults),
        byPriority: this.groupByPriority(allResults),
        agentsExecuted,
        executionTime,
      },
      results: allResults,
      recommendations,
      metrics,
    };
  }

  private calculateMetrics(results: AgentResult[]) {
    const categoryScores = {
      security: 100,
      performance: 100,
      quality: 100,
      architecture: 100,
    };

    results.forEach((result) => {
      const penalty =
        result.priority === 'high' ? 20 : result.priority === 'medium' ? 10 : 5;
      categoryScores[result.category as keyof typeof categoryScores] -= penalty;
    });

    const overallScore =
      Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 4;

    return {
      securityScore: Math.max(0, categoryScores.security),
      performanceScore: Math.max(0, categoryScores.performance),
      qualityScore: Math.max(0, categoryScores.quality),
      architectureScore: Math.max(0, categoryScores.architecture),
      overallScore: Math.max(0, overallScore),
    };
  }

  private groupByCategory(results: AgentResult[]): Record<string, number> {
    return results.reduce(
      (acc, result) => {
        acc[result.category] = (acc[result.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupByPriority(results: AgentResult[]): Record<string, number> {
    return results.reduce(
      (acc, result) => {
        acc[result.priority] = (acc[result.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private generateRecommendations(
    results: AgentResult[],
    metrics: any,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.securityScore < 80) {
      recommendations.push('🔒 安全评分较低，建议优先修复安全漏洞');
    }

    if (metrics.performanceScore < 80) {
      recommendations.push('⚡ 性能评分较低，建议优化性能瓶颈');
    }

    if (metrics.qualityScore < 80) {
      recommendations.push('📝 代码质量评分较低，建议改进代码规范');
    }

    if (metrics.architectureScore < 80) {
      recommendations.push('🏗️ 架构评分较低，建议重构架构设计');
    }

    const highPriorityCount = results.filter(
      (r) => r.priority === 'high',
    ).length;
    if (highPriorityCount > 5) {
      recommendations.push('🚨 高优先级问题较多，建议分批处理');
    }

    return recommendations;
  }
}

// 导出多代理代码审查工具
export function createMultiAgentCodeReviewTool(opts: { cwd: string }): Tool {
  const coordinator = new MultiAgentCodeReviewCoordinator();

  return createCodeReviewTool(opts);
}

// 导出协调器类供插件使用
export { MultiAgentCodeReviewCoordinator };
