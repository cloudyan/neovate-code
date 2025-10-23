import fs from 'fs';
import path from 'pathe';
import { execSync } from 'child_process';

/**
 * 综合报告和反馈系统
 * 提供详细的代码审查报告、趋势分析和改进建议
 */

export interface ReviewReport {
  id: string;
  timestamp: string;
  summary: ReviewSummary;
  agentResults: AgentResult[];
  trends?: TrendAnalysis;
  recommendations: Recommendation[];
  metrics: ReviewMetrics;
}

export interface ReviewSummary {
  totalIssues: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byAgent: Record<string, number>;
  criticalIssues: number;
  highPriorityIssues: number;
  executionTime: number;
  filesAnalyzed: number;
}

export interface AgentResult {
  agent: string;
  category: string;
  issues: Issue[];
  confidence: number;
  executionTime: number;
}

export interface Issue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file?: string;
  line?: number;
  codeExample?: string;
  remediation: string;
  autoFixable: boolean;
  tags: string[];
  references: string[];
}

export interface TrendAnalysis {
  period: string;
  trends: {
    category: string;
    direction: 'improving' | 'declining' | 'stable';
    change: number;
    confidence: number;
  }[];
  predictions: {
    category: string;
    prediction: string;
    confidence: number;
  }[];
}

export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  actions: string[];
  expectedBenefit: string;
  dependencies: string[];
}

export interface ReviewMetrics {
  securityScore: number;
  performanceScore: number;
  qualityScore: number;
  architectureScore: number;
  overallScore: number;
  technicalDebt: {
    hours: number;
    cost: number;
    priority: string;
  };
  maintainabilityIndex: number;
}

/**
 * 综合报告生成器
 */
export class ComprehensiveReportGenerator {
  private resultsDir: string;
  private templatesDir: string;

  constructor(baseDir: string = '.neovate/reports') {
    this.resultsDir = path.join(process.cwd(), baseDir);
    this.templatesDir = path.join(__dirname, 'templates');

    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    const archivesDir = path.join(this.resultsDir, 'archives');
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
    }

    const trendsDir = path.join(this.resultsDir, 'trends');
    if (!fs.existsSync(trendsDir)) {
      fs.mkdirSync(trendsDir, { recursive: true });
    }
  }

  /**
   * 生成综合报告
   */
  async generateComprehensiveReport(
    agentResults: AgentResult[],
    options: {
      includeTrends?: boolean;
      includeRecommendations?: boolean;
      format?: 'html' | 'markdown' | 'pdf' | 'json';
      template?: string;
    } = {},
  ): Promise<ReviewReport> {
    const {
      includeTrends = true,
      includeRecommendations = true,
      format = 'html',
      template = 'default',
    } = options;

    // 生成基础报告数据
    const report: ReviewReport = {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(agentResults),
      agentResults,
      recommendations: includeRecommendations
        ? await this.generateRecommendations(agentResults)
        : [],
      metrics: this.calculateMetrics(agentResults),
    };

    // 添加趋势分析
    if (includeTrends) {
      report.trends = await this.analyzeTrends();
    }

    // 保存报告
    await this.saveReport(report, format, template);

    return report;
  }

  /**
   * 生成报告摘要
   */
  private generateSummary(agentResults: AgentResult[]): ReviewSummary {
    const allIssues = agentResults.flatMap((result) => result.issues);

    const summary: ReviewSummary = {
      totalIssues: allIssues.length,
      byCategory: {},
      bySeverity: {},
      byAgent: {},
      criticalIssues: 0,
      highPriorityIssues: 0,
      executionTime: agentResults.reduce(
        (sum, result) => sum + result.executionTime,
        0,
      ),
      filesAnalyzed: this.countUniqueFiles(allIssues),
    };

    // 统计分类
    agentResults.forEach((result) => {
      summary.byAgent[result.agent] = result.issues.length;
      summary.byCategory[result.category] =
        (summary.byCategory[result.category] || 0) + result.issues.length;

      result.issues.forEach((issue) => {
        summary.bySeverity[issue.severity] =
          (summary.bySeverity[issue.severity] || 0) + 1;

        if (issue.severity === 'critical') {
          summary.criticalIssues++;
        } else if (issue.severity === 'high') {
          summary.highPriorityIssues++;
        }
      });
    });

    return summary;
  }

  /**
   * 计算指标
   */
  private calculateMetrics(agentResults: AgentResult[]): ReviewMetrics {
    const allIssues = agentResults.flatMap((result) => result.issues);

    // 计算各维度分数
    const categoryScores = {
      security: this.calculateCategoryScore(allIssues, 'security'),
      performance: this.calculateCategoryScore(allIssues, 'performance'),
      quality: this.calculateCategoryScore(allIssues, 'quality'),
      architecture: this.calculateCategoryScore(allIssues, 'architecture'),
    };

    const overallScore =
      Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 4;

    // 计算技术债务
    const technicalDebt = this.calculateTechnicalDebt(allIssues);

    // 计算可维护性指数
    const maintainabilityIndex = this.calculateMaintainabilityIndex(allIssues);

    return {
      securityScore: categoryScores.security,
      performanceScore: categoryScores.performance,
      qualityScore: categoryScores.quality,
      architectureScore: categoryScores.architecture,
      overallScore,
      technicalDebt,
      maintainabilityIndex,
    };
  }

  /**
   * 计算分类分数
   */
  private calculateCategoryScore(issues: Issue[], category: string): number {
    const categoryIssues = issues.filter(
      (issue) => issue.category === category,
    );

    if (categoryIssues.length === 0) {
      return 100;
    }

    let score = 100;
    categoryIssues.forEach((issue) => {
      const penalty = this.getSeverityPenalty(issue.severity);
      score -= penalty;
    });

    return Math.max(0, score);
  }

  /**
   * 获取严重性惩罚
   */
  private getSeverityPenalty(severity: string): number {
    const penalties = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
    };
    return penalties[severity as keyof typeof penalties] || 0;
  }

  /**
   * 计算技术债务
   */
  private calculateTechnicalDebt(issues: Issue[]) {
    let totalHours = 0;
    let totalCost = 0;
    let highestPriority = 'low';

    issues.forEach((issue) => {
      const hours = this.getIssueHours(issue);
      const cost = hours * 100; // 假设每小时成本100元

      totalHours += hours;
      totalCost += cost;

      if (this.comparePriority(issue.severity, highestPriority) > 0) {
        highestPriority = issue.severity;
      }
    });

    return {
      hours: totalHours,
      cost: totalCost,
      priority: highestPriority,
    };
  }

  /**
   * 获取问题工时估算
   */
  private getIssueHours(issue: Issue): number {
    const baseHours = {
      critical: 8,
      high: 4,
      medium: 2,
      low: 0.5,
    };

    let hours = baseHours[issue.severity as keyof typeof baseHours] || 1;

    // 根据问题类型调整
    if (issue.autoFixable) {
      hours *= 0.3; // 自动修复问题工时减少70%
    }

    return hours;
  }

  /**
   * 比较优先级
   */
  private comparePriority(p1: string, p2: string): number {
    const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
    return (
      (priorities[p1 as keyof typeof priorities] || 0) -
      (priorities[p2 as keyof typeof priorities] || 0)
    );
  }

  /**
   * 计算可维护性指数
   */
  private calculateMaintainabilityIndex(issues: Issue[]): number {
    // 简化的可维护性指数计算
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(
      (i) => i.severity === 'critical',
    ).length;
    const highIssues = issues.filter((i) => i.severity === 'high').length;

    let index = 100;
    index -= totalIssues * 2;
    index -= criticalIssues * 10;
    index -= highIssues * 5;

    return Math.max(0, Math.min(100, index));
  }

  /**
   * 生成改进建议
   */
  async generateRecommendations(
    agentResults: AgentResult[],
  ): Promise<Recommendation[]> {
    const allIssues = agentResults.flatMap((result) => result.issues);
    const recommendations: Recommendation[] = [];

    // 分析高频问题类型
    const issueTypes = this.analyzeIssueTypes(allIssues);

    // 生成基于问题类型的建议
    Object.entries(issueTypes).forEach(([type, count]) => {
      if (count >= 3) {
        // 如果同一类型问题出现3次以上
        const recommendation = this.generateTypeBasedRecommendation(
          type,
          count,
          allIssues,
        );
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    });

    // 生成基于严重性的建议
    const criticalIssues = allIssues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        this.generateCriticalIssuesRecommendation(criticalIssues),
      );
    }

    // 生成基于代理的建议
    agentResults.forEach((result) => {
      if (result.issues.length > 5) {
        const recommendation = this.generateAgentBasedRecommendation(result);
        recommendations.push(recommendation);
      }
    });

    return recommendations.sort((a, b) =>
      this.comparePriority(b.priority, a.priority),
    );
  }

  /**
   * 分析问题类型
   */
  private analyzeIssueTypes(issues: Issue[]): Record<string, number> {
    const types: Record<string, number> = {};

    issues.forEach((issue) => {
      types[issue.type] = (types[issue.type] || 0) + 1;
    });

    return types;
  }

  /**
   * 生成基于类型的建议
   */
  private generateTypeBasedRecommendation(
    type: string,
    count: number,
    issues: Issue[],
  ): Recommendation | null {
    const typeIssues = issues.filter((i) => i.type === type);
    const avgSeverity = this.getAverageSeverity(typeIssues);

    const recommendations: Record<string, Partial<Recommendation>> = {
      injection: {
        title: '加强输入验证和参数化查询',
        description: `发现 ${count} 个注入攻击漏洞，建议统一实施输入验证框架`,
        actions: ['实施输入验证中间件', '使用参数化查询', '进行安全编码培训'],
        expectedBenefit: '消除注入攻击风险，提高系统安全性',
      },
      memory_leak: {
        title: '优化内存管理',
        description: `发现 ${count} 个潜在内存泄漏，需要改进资源管理`,
        actions: ['实施资源清理模式', '添加内存监控', '优化事件监听器管理'],
        expectedBenefit: '减少内存使用30%，提高系统稳定性',
      },
      complex_function: {
        title: '重构复杂函数',
        description: `发现 ${count} 个复杂函数，影响代码可维护性`,
        actions: ['应用单一职责原则', '提取子函数', '使用设计模式简化逻辑'],
        expectedBenefit: '提高代码可读性50%，降低维护成本',
      },
    };

    const template = recommendations[type];
    if (!template) return null;

    return {
      id: this.generateRecommendationId(),
      priority: avgSeverity,
      category: this.getCategoryFromType(type),
      impact: 'high',
      effort: 'medium',
      dependencies: [],
      ...template,
    } as Recommendation;
  }

  /**
   * 生成关键问题建议
   */
  private generateCriticalIssuesRecommendation(
    criticalIssues: Issue[],
  ): Recommendation {
    return {
      id: this.generateRecommendationId(),
      priority: 'critical',
      category: 'security',
      title: '立即修复关键安全问题',
      description: `发现 ${criticalIssues.length} 个关键安全问题，需要立即处理`,
      impact: 'critical',
      effort: 'high',
      actions: [
        '立即停止相关功能',
        '组建安全修复小组',
        '进行安全影响评估',
        '制定修复时间表',
      ],
      expectedBenefit: '避免安全事件，保护系统和用户数据',
      dependencies: criticalIssues.map((i) => i.id),
    };
  }

  /**
   * 生成基于代理的建议
   */
  private generateAgentBasedRecommendation(
    result: AgentResult,
  ): Recommendation {
    return {
      id: this.generateRecommendationId(),
      priority: 'medium',
      category: result.category,
      title: `优化${result.agent}发现的问题`,
      description: `${result.agent}发现了 ${result.issues.length} 个问题，建议系统性改进`,
      impact: 'medium',
      effort: 'medium',
      actions: [
        `深入分析${result.category}相关问题`,
        '制定改进计划',
        '实施最佳实践',
        '定期审查和监控',
      ],
      expectedBenefit: `减少${result.category}问题40%，提高整体质量`,
      dependencies: [],
    };
  }

  /**
   * 分析趋势
   */
  async analyzeTrends(): Promise<TrendAnalysis> {
    const trendsDir = path.join(this.resultsDir, 'trends');
    const trendFiles = fs
      .readdirSync(trendsDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .slice(-30); // 最近30个报告

    if (trendFiles.length < 2) {
      return {
        period: 'insufficient_data',
        trends: [],
        predictions: [],
      };
    }

    const historicalData = trendFiles.map((file) => {
      const content = fs.readFileSync(path.join(trendsDir, file), 'utf-8');
      return JSON.parse(content);
    });

    return this.calculateTrends(historicalData);
  }

  /**
   * 计算趋势
   */
  private calculateTrends(historicalData: any[]): TrendAnalysis {
    const categories = ['security', 'performance', 'quality', 'architecture'];
    const trends = [];
    const predictions = [];

    categories.forEach((category) => {
      const recentData = historicalData.slice(-10); // 最近10个数据点
      const values = recentData.map(
        (d) => d.metrics?.[`${category}Score`] || 0,
      );

      if (values.length >= 3) {
        const trend = this.calculateTrendDirection(values);
        trends.push({
          category,
          direction: trend.direction,
          change: trend.change,
          confidence: trend.confidence,
        });

        // 简单的预测
        const prediction = this.predictNextValue(values);
        predictions.push({
          category,
          prediction:
            prediction.value > 80
              ? 'excellent'
              : prediction.value > 60
                ? 'good'
                : 'needs_improvement',
          confidence: prediction.confidence,
        });
      }
    });

    return {
      period: 'last_30_reports',
      trends,
      predictions,
    };
  }

  /**
   * 计算趋势方向
   */
  private calculateTrendDirection(values: number[]): {
    direction: string;
    change: number;
    confidence: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, confidence: 0 };
    }

    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;

    let direction: string;
    if (Math.abs(change) < 5) {
      direction = 'stable';
    } else if (change > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    // 简单的置信度计算
    const consistency = this.calculateConsistency(values);
    const confidence = Math.min(0.9, consistency * (values.length / 10));

    return { direction, change, confidence };
  }

  /**
   * 计算一致性
   */
  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 0;

    let consistentChanges = 0;
    for (let i = 1; i < values.length; i++) {
      if ((values[i] - values[i - 1]) * (values[i - 1] - values[i - 2]) >= 0) {
        consistentChanges++;
      }
    }

    return consistentChanges / (values.length - 2);
  }

  /**
   * 预测下一个值
   */
  private predictNextValue(values: number[]): {
    value: number;
    confidence: number;
  } {
    if (values.length < 3) {
      return { value: values[values.length - 1], confidence: 0 };
    }

    // 简单的线性预测
    const recent = values.slice(-3);
    const trend = (recent[2] - recent[0]) / 2;
    const prediction = recent[2] + trend;

    const variance = this.calculateVariance(recent);
    const confidence = Math.max(0.1, 1 - variance / 100);

    return {
      value: Math.max(0, Math.min(100, prediction)),
      confidence,
    };
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * 保存报告
   */
  async saveReport(
    report: ReviewReport,
    format: string,
    template: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `review-${timestamp}`;

    // 保存原始JSON数据
    const jsonPath = path.join(this.resultsDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // 保存趋势数据
    await this.saveTrendData(report);

    // 根据格式生成报告
    switch (format) {
      case 'html':
        await this.generateHTMLReport(report, baseFilename, template);
        break;
      case 'markdown':
        await this.generateMarkdownReport(report, baseFilename);
        break;
      case 'pdf':
        await this.generatePDFReport(report, baseFilename);
        break;
    }

    // 清理旧报告
    await this.cleanupOldReports();
  }

  /**
   * 保存趋势数据
   */
  private async saveTrendData(report: ReviewReport): Promise<void> {
    const trendsDir = path.join(this.resultsDir, 'trends');
    const trendFile = path.join(trendsDir, `trend-${report.timestamp}.json`);

    const trendData = {
      timestamp: report.timestamp,
      metrics: report.metrics,
      summary: report.summary,
    };

    fs.writeFileSync(trendFile, JSON.stringify(trendData, null, 2));
  }

  /**
   * 生成HTML报告
   */
  private async generateHTMLReport(
    report: ReviewReport,
    baseFilename: string,
    template: string,
  ): Promise<void> {
    const templatePath = path.join(this.templatesDir, `${template}.html`);
    let templateContent: string;

    try {
      templateContent = fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      templateContent = this.getDefaultHTMLTemplate();
    }

    const htmlContent = templateContent
      .replace('{{REPORT_DATA}}', JSON.stringify(report, null, 2))
      .replace('{{REPORT_ID}}', report.id)
      .replace('{{TIMESTAMP}}', report.timestamp);

    const htmlPath = path.join(this.resultsDir, `${baseFilename}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
  }

  /**
   * 生成Markdown报告
   */
  private async generateMarkdownReport(
    report: ReviewReport,
    baseFilename: string,
  ): Promise<void> {
    const markdownContent = this.generateMarkdownContent(report);
    const mdPath = path.join(this.resultsDir, `${baseFilename}.md`);
    fs.writeFileSync(mdPath, markdownContent);
  }

  /**
   * 生成Markdown内容
   */
  private generateMarkdownContent(report: ReviewReport): string {
    let content = `# 多代理代码审查报告\n\n`;
    content += `**报告ID**: ${report.id}\n`;
    content += `**生成时间**: ${report.timestamp}\n\n`;

    // 摘要
    content += `## 📊 审查摘要\n\n`;
    content += `- **总问题数**: ${report.summary.totalIssues}\n`;
    content += `- **关键问题**: ${report.summary.criticalIssues}\n`;
    content += `- **高优先级问题**: ${report.summary.highPriorityIssues}\n`;
    content += `- **分析文件数**: ${report.summary.filesAnalyzed}\n`;
    content += `- **执行时间**: ${report.summary.executionTime}ms\n\n`;

    // 分数
    content += `## 🎯 质量评分\n\n`;
    content += `- **整体评分**: ${report.metrics.overallScore.toFixed(1)}/100\n`;
    content += `- **安全性**: ${report.metrics.securityScore.toFixed(1)}/100\n`;
    content += `- **性能**: ${report.metrics.performanceScore.toFixed(1)}/100\n`;
    content += `- **代码质量**: ${report.metrics.qualityScore.toFixed(1)}/100\n`;
    content += `- **架构**: ${report.metrics.architectureScore.toFixed(1)}/100\n\n`;

    // 按分类统计
    content += `## 📋 按分类统计\n\n`;
    Object.entries(report.summary.byCategory).forEach(([category, count]) => {
      const icon = this.getCategoryIcon(category);
      content += `- ${icon} ${category}: ${count}\n`;
    });
    content += '\n';

    // 代理结果
    content += `## 🤖 代理分析结果\n\n`;
    report.agentResults.forEach((result) => {
      content += `### ${result.agent}\n\n`;
      content += `- **分类**: ${result.category}\n`;
      content += `- **问题数**: ${result.issues.length}\n`;
      content += `- **置信度**: ${(result.confidence * 100).toFixed(1)}%\n`;
      content += `- **执行时间**: ${result.executionTime}ms\n\n`;
    });

    // 建议
    if (report.recommendations.length > 0) {
      content += `## 💡 改进建议\n\n`;
      report.recommendations.forEach((rec, index) => {
        content += `### ${index + 1}. ${rec.title} (${rec.priority})\n\n`;
        content += `${rec.description}\n\n`;
        content += `**影响**: ${rec.impact}\n`;
        content += `**工作量**: ${rec.effort}\n`;
        content += `**预期收益**: ${rec.expectedBenefit}\n\n`;
        content += `**行动步骤**:\n`;
        rec.actions.forEach((action) => {
          content += `- ${action}\n`;
        });
        content += '\n';
      });
    }

    // 趋势分析
    if (report.trends) {
      content += `## 📈 趋势分析\n\n`;
      report.trends.trends.forEach((trend) => {
        const directionIcon =
          trend.direction === 'improving'
            ? '📈'
            : trend.direction === 'declining'
              ? '📉'
              : '➡️';
        content += `- ${directionIcon} ${trend.category}: ${trend.direction} (${trend.change.toFixed(1)}%)\n`;
      });
      content += '\n';
    }

    return content;
  }

  /**
   * 获取分类图标
   */
  private getCategoryIcon(category: string): string {
    const icons = {
      security: '🔒',
      performance: '⚡',
      quality: '📝',
      architecture: '🏗️',
    };
    return icons[category as keyof typeof icons] || '📋';
  }

  /**
   * 获取默认HTML模板
   */
  private getDefaultHTMLTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多代理代码审查报告 - {{REPORT_ID}}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .chart-container { margin: 30px 0; }
        .issues-list { margin: 20px 0; }
        .issue-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .severity-critical { border-left: 4px solid #dc3545; }
        .severity-high { border-left: 4px solid #fd7e14; }
        .severity-medium { border-left: 4px solid #ffc107; }
        .severity-low { border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 多代理代码审查报告</h1>
            <p>报告ID: {{REPORT_ID}} | 生成时间: {{TIMESTAMP}}</p>
        </div>
        <div class="content">
            <div id="app"></div>
        </div>
    </div>
    <script>
        const reportData = {{REPORT_DATA}};
        // 这里可以添加图表渲染逻辑
        console.log('报告数据:', reportData);
    </script>
</body>
</html>
    `;
  }

  /**
   * 清理旧报告
   */
  private async cleanupOldReports(): Promise<void> {
    const files = fs
      .readdirSync(this.resultsDir)
      .filter(
        (f) =>
          f.startsWith('review-') &&
          (f.endsWith('.json') || f.endsWith('.html')),
      )
      .map((f) => ({
        name: f,
        path: path.join(this.resultsDir, f),
        time: fs.statSync(path.join(this.resultsDir, f)).mtime,
      }))
      .sort((a, b) => b.time - a.time);

    // 保留最新的20个报告
    const filesToDelete = files.slice(20);

    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
    }

    // 移动超过7天的报告到归档目录
    const archivesDir = path.join(this.resultsDir, 'archives');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    files.forEach((file) => {
      if (file.time < sevenDaysAgo) {
        const archivePath = path.join(archivesDir, file.name);
        fs.renameSync(file.path, archivePath);
      }
    });
  }

  /**
   * 辅助方法
   */
  private generateReportId(): string {
    return `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private countUniqueFiles(issues: Issue[]): number {
    const files = new Set();
    issues.forEach((issue) => {
      if (issue.file) {
        files.add(issue.file);
      }
    });
    return files.size;
  }

  private getAverageSeverity(issues: Issue[]): string {
    if (issues.length === 0) return 'low';

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    issues.forEach((issue) => {
      severityCounts[issue.severity as keyof typeof severityCounts]++;
    });

    const total = issues.length;
    if (severityCounts.critical / total > 0.3) return 'critical';
    if (severityCounts.high / total > 0.4) return 'high';
    if (severityCounts.medium / total > 0.5) return 'medium';
    return 'low';
  }

  private getCategoryFromType(type: string): string {
    const categoryMap: Record<string, string> = {
      injection: 'security',
      xss: 'security',
      memory_leak: 'performance',
      complex_function: 'quality',
      high_coupling: 'architecture',
    };
    return categoryMap[type] || 'quality';
  }
}

export default ComprehensiveReportGenerator;
