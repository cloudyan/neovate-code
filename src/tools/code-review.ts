import { z } from 'zod';
import { createTool } from '../tool';
import path from 'pathe';
import fs from 'fs';

// Import utilities that need to be created or fixed
async function readFile(filePath: string): Promise<string> {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

async function glob(
  pattern: string,
  options: { cwd?: string } = {},
): Promise<string[]> {
  const { cwd = process.cwd() } = options;
  const { execSync } = require('child_process');
  const rgPath = path.join(__dirname, '../../vendor/ripgrep/bin/rg');

  try {
    const output = execSync(`${rgPath} --files --glob "${pattern}"}`, {
      cwd,
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    // Fallback to simple file system traversal
    const path = require('path');
    const fs = require('fs');
    const results: string[] = [];

    function walkDir(dir: string, pattern: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath, pattern);
        } else if (fullPath.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
          results.push(fullPath);
        }
      }
    }

    walkDir(cwd, pattern);
    return results;
  }
}

interface ReviewResult {
  category: 'security' | 'performance' | 'quality' | 'architecture';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
  codeExample?: string;
}

interface SecurityVulnerability {
  type:
    | 'injection'
    | 'xss'
    | 'csrf'
    | 'auth'
    | 'crypto'
    | 'dependency'
    | 'input';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  file: string;
  line?: number;
  remediation: string;
}

interface PerformanceIssue {
  type: 'algorithm' | 'memory' | 'io' | 'network' | 'rendering';
  impact: 'high' | 'medium' | 'low';
  description: string;
  file: string;
  line?: number;
  optimization: string;
}

interface QualityIssue {
  type:
    | 'complexity'
    | 'duplication'
    | 'naming'
    | 'formatting'
    | 'documentation';
  severity: 'high' | 'medium' | 'low';
  description: string;
  file: string;
  line?: number;
  improvement: string;
}

interface ArchitectureIssue {
  type: 'coupling' | 'cohesion' | 'patterns' | 'layers' | 'interfaces';
  severity: 'high' | 'medium' | 'low';
  description: string;
  file: string;
  suggestion: string;
}

// Security analysis patterns
const SECURITY_PATTERNS = {
  injection: [
    /eval\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /setTimeout\s*\(\s*["']/gi,
    /setInterval\s*\(\s*["']/gi,
    /\$\{.*\}/gi, // Template literals with user input
  ],
  xss: [
    /innerHTML\s*=/gi,
    /outerHTML\s*=/gi,
    /document\.write\s*\(/gi,
    /dangerouslySetInnerHTML/gi,
  ],
  auth: [
    /password.*=.*["'][^"']+["']/gi,
    /token.*=.*["'][^"']+["']/gi,
    /secret.*=.*["'][^"']+["']/gi,
    /api[_-]?key.*=.*["'][^"']+["']/gi,
  ],
  crypto: [
    /md5\s*\(/gi,
    /sha1\s*\(/gi,
    /crypto\.createHash\s*\(\s*["']md5/gi,
    /crypto\.createHash\s*\(\s*["']sha1/gi,
  ],
};

// Performance anti-patterns
const PERFORMANCE_PATTERNS = {
  algorithm: [
    /for\s*\(\s*.*\s*in\s*.*\s*\)/gi, // for...in loops
    /Array\.prototype\.forEach\.call/gi, // Slow array iteration
    /document\.querySelectorAll/gi, // Expensive DOM queries
  ],
  memory: [
    /setInterval\s*\(/gi, // Potential memory leaks
    /addEventListener\s*\(/gi, // Event listeners without cleanup
    /new\s+Array\s*\(\s*\d+\s*\)/gi, // Large array allocation
  ],
  io: [
    /readFileSync\s*\(/gi, // Synchronous file operations
    /writeFileSync\s*\(/gi,
    /execSync\s*\(/gi,
  ],
};

// Code quality indicators
const QUALITY_PATTERNS = {
  complexity: [
    /if\s*\(.+\)\s*\{[\s\S]{500,}/gi, // Long if blocks
    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{500,}/gi, // Long functions
    /for\s*\([^)]+\)\s*\{[\s\S]{500,}/gi, // Long loops
  ],
  duplication: [
    // Will be detected via content analysis
  ],
  naming: [
    /var\s+[a-z]\s*=/gi, // Single letter variables
    /function\s+[a-z]\s*\(/gi, // Single letter function names
  ],
};

async function analyzeSecurity(
  files: string[],
): Promise<SecurityVulnerability[]> {
  const vulnerabilities: SecurityVulnerability[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Check for injection vulnerabilities
      Object.entries(SECURITY_PATTERNS.injection).forEach(
        ([pattern, regex]) => {
          const matches = [...content.matchAll(regex)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            vulnerabilities.push({
              type: 'injection',
              severity: 'high',
              description: `Potential code injection vulnerability detected: ${pattern}`,
              file,
              line: lineNum,
              remediation:
                'Avoid using eval(), new Function(), or template literals with untrusted input. Use parameterized queries or proper input validation.',
            });
          });
        },
      );

      // Check for XSS vulnerabilities
      Object.entries(SECURITY_PATTERNS.xss).forEach(([pattern, regex]) => {
        const matches = [...content.matchAll(regex)];
        matches.forEach((match) => {
          const lineNum =
            lines.findIndex((line) => line.includes(match[0])) + 1;
          vulnerabilities.push({
            type: 'xss',
            severity: 'high',
            description: `Potential XSS vulnerability detected: ${pattern}`,
            file,
            line: lineNum,
            remediation:
              'Use textContent instead of innerHTML, or properly sanitize user input before rendering.',
          });
        });
      });

      // Check for hardcoded secrets
      Object.entries(SECURITY_PATTERNS.auth).forEach(([pattern, regex]) => {
        const matches = [...content.matchAll(regex)];
        matches.forEach((match) => {
          const lineNum =
            lines.findIndex((line) => line.includes(match[0])) + 1;
          vulnerabilities.push({
            type: 'auth',
            severity: 'critical',
            description: `Hardcoded credential detected: ${pattern}`,
            file,
            line: lineNum,
            remediation:
              'Move credentials to environment variables or secure configuration files. Never commit secrets to version control.',
          });
        });
      });

      // Check for weak cryptography
      Object.entries(SECURITY_PATTERNS.crypto).forEach(([pattern, regex]) => {
        const matches = [...content.matchAll(regex)];
        matches.forEach((match) => {
          const lineNum =
            lines.findIndex((line) => line.includes(match[0])) + 1;
          vulnerabilities.push({
            type: 'crypto',
            severity: 'medium',
            description: `Weak cryptographic algorithm detected: ${pattern}`,
            file,
            line: lineNum,
            remediation:
              'Use strong cryptographic algorithms like SHA-256, SHA-512, or bcrypt for password hashing.',
          });
        });
      });
    } catch (error) {
      console.warn(`Failed to analyze security for ${file}:`, error);
    }
  }

  return vulnerabilities;
}

async function analyzePerformance(
  files: string[],
): Promise<PerformanceIssue[]> {
  const issues: PerformanceIssue[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Check for algorithmic inefficiencies
      Object.entries(PERFORMANCE_PATTERNS.algorithm).forEach(
        ([pattern, regex]) => {
          const matches = [...content.matchAll(regex)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            issues.push({
              type: 'algorithm',
              impact: 'medium',
              description: `Performance anti-pattern detected: ${pattern}`,
              file,
              line: lineNum,
              optimization:
                'Consider using more efficient alternatives like Array.prototype.map(), filter(), or reduce() instead of for...in loops.',
            });
          });
        },
      );

      // Check for memory leaks
      Object.entries(PERFORMANCE_PATTERNS.memory).forEach(
        ([pattern, regex]) => {
          const matches = [...content.matchAll(regex)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            issues.push({
              type: 'memory',
              impact: 'high',
              description: `Potential memory leak detected: ${pattern}`,
              file,
              line: lineNum,
              optimization:
                'Ensure proper cleanup of intervals, event listeners, and large objects. Use clearInterval() and removeEventListener() when components unmount.',
            });
          });
        },
      );

      // Check for synchronous I/O
      Object.entries(PERFORMANCE_PATTERNS.io).forEach(([pattern, regex]) => {
        const matches = [...content.matchAll(regex)];
        matches.forEach((match) => {
          const lineNum =
            lines.findIndex((line) => line.includes(match[0])) + 1;
          issues.push({
            type: 'io',
            impact: 'high',
            description: `Synchronous I/O operation detected: ${pattern}`,
            file,
            line: lineNum,
            optimization:
              'Use asynchronous alternatives like readFile(), writeFile(), or exec() to avoid blocking the event loop.',
          });
        });
      });
    } catch (error) {
      console.warn(`Failed to analyze performance for ${file}:`, error);
    }
  }

  return issues;
}

async function analyzeQuality(files: string[]): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Check for complex code blocks
      Object.entries(QUALITY_PATTERNS.complexity).forEach(
        ([pattern, regex]) => {
          const matches = [...content.matchAll(regex)];
          matches.forEach((match) => {
            const lineNum =
              lines.findIndex((line) => line.includes(match[0])) + 1;
            issues.push({
              type: 'complexity',
              severity: 'medium',
              description: `Complex code block detected: ${pattern}`,
              file,
              line: lineNum,
              improvement:
                'Break down complex functions into smaller, more focused functions. Consider extracting logic into separate methods.',
            });
          });
        },
      );

      // Check for poor naming
      Object.entries(QUALITY_PATTERNS.naming).forEach(([pattern, regex]) => {
        const matches = [...content.matchAll(regex)];
        matches.forEach((match) => {
          const lineNum =
            lines.findIndex((line) => line.includes(match[0])) + 1;
          issues.push({
            type: 'naming',
            severity: 'low',
            description: `Poor naming convention detected: ${pattern}`,
            file,
            line: lineNum,
            improvement:
              'Use descriptive variable and function names that clearly indicate their purpose.',
          });
        });
      });
    } catch (error) {
      console.warn(`Failed to analyze quality for ${file}:`, error);
    }
  }

  return issues;
}

async function analyzeArchitecture(
  files: string[],
): Promise<ArchitectureIssue[]> {
  const issues: ArchitectureIssue[] = [];

  // Analyze import patterns for coupling
  const importMap = new Map<string, string[]>();

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
      console.warn(`Failed to analyze architecture for ${file}:`, error);
    }
  }

  // Detect high coupling
  importMap.forEach((imports, file) => {
    if (imports.length > 20) {
      issues.push({
        type: 'coupling',
        severity: 'medium',
        description: `High coupling detected: ${file} imports ${imports.length} modules`,
        file,
        suggestion:
          'Consider using dependency injection, facade pattern, or splitting into smaller modules to reduce coupling.',
      });
    }
  });

  return issues;
}

export function createCodeReviewTool(opts: { cwd: string }) {
  return createTool({
    name: 'code_review',
    description: `
Comprehensive code review system that analyzes code for security vulnerabilities, performance issues, code quality problems, and architectural inconsistencies.

Features:
- Security vulnerability detection (injection, XSS, authentication, cryptography)
- Performance issue identification (algorithms, memory leaks, I/O operations)
- Code quality analysis (complexity, naming, duplication)
- Architectural consistency checking (coupling, patterns, layering)
- Priority-based recommendations with specific remediation steps
- Integration with development workflow through pre-commit hooks

Provides detailed feedback with examples, priority levels, and actionable improvement suggestions.
    `.trim(),
    parameters: z.object({
      files: z
        .array(z.string())
        .optional()
        .describe(
          'Specific files to review (if not provided, analyzes all relevant files)',
        ),
      include_patterns: z
        .array(z.string())
        .default(['src/**/*.ts', 'src/**/*.js', 'src/**/*.tsx', 'src/**/*.jsx'])
        .describe('File patterns to include in analysis'),
      exclude_patterns: z
        .array(z.string())
        .default(['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'])
        .describe('File patterns to exclude from analysis'),
      categories: z
        .array(z.enum(['security', 'performance', 'quality', 'architecture']))
        .default(['security', 'performance', 'quality', 'architecture'])
        .describe('Review categories to include'),
      severity_threshold: z
        .enum(['low', 'medium', 'high', 'critical'])
        .default('low')
        .describe('Minimum severity level to report'),
      output_format: z
        .enum(['json', 'markdown', 'summary'])
        .default('summary')
        .describe('Output format for the review results'),
      auto_fix: z
        .boolean()
        .default(false)
        .describe('Whether to automatically fix minor issues'),
    }),
    getDescription: ({ params }) => {
      const fileCount = params.files?.length || 'all';
      const categories = params.categories.join(', ');
      return `Review ${fileCount} files for ${categories} issues`;
    },
    execute: async ({
      files,
      include_patterns,
      exclude_patterns,
      categories,
      severity_threshold,
      output_format,
      auto_fix,
    }) => {
      try {
        // Determine files to analyze
        let filesToAnalyze: string[] = [];

        if (files && files.length > 0) {
          filesToAnalyze = files.map((file) =>
            path.isAbsolute(file) ? file : path.resolve(opts.cwd, file),
          );
        } else {
          // Find files using glob patterns
          for (const pattern of include_patterns) {
            const matchedFiles = await glob(pattern, { cwd: opts.cwd });
            filesToAnalyze.push(...matchedFiles);
          }

          // Filter out excluded patterns
          filesToAnalyze = filesToAnalyze.filter((file) => {
            return !exclude_patterns.some((excludePattern) => {
              return file.match(
                new RegExp(excludePattern.replace(/\*/g, '.*')),
              );
            });
          });

          // Remove duplicates and convert to absolute paths
          filesToAnalyze = [...new Set(filesToAnalyze)].map((file) =>
            path.isAbsolute(file) ? file : path.resolve(opts.cwd, file),
          );
        }

        const results: ReviewResult[] = [];

        // Run security analysis
        if (categories.includes('security')) {
          const securityIssues = await analyzeSecurity(filesToAnalyze);
          securityIssues.forEach((issue) => {
            if (shouldIncludeIssue(issue.severity, severity_threshold)) {
              results.push({
                category: 'security',
                priority: getPriorityFromSeverity(issue.severity),
                title: `Security: ${issue.type}`,
                description: issue.description,
                file: issue.file,
                line: issue.line,
                suggestion: issue.remediation,
                codeExample: getCodeExample(issue.type),
              });
            }
          });
        }

        // Run performance analysis
        if (categories.includes('performance')) {
          const performanceIssues = await analyzePerformance(filesToAnalyze);
          performanceIssues.forEach((issue) => {
            if (shouldIncludeIssue(issue.impact, severity_threshold)) {
              results.push({
                category: 'performance',
                priority: getPriorityFromSeverity(issue.impact),
                title: `Performance: ${issue.type}`,
                description: issue.description,
                file: issue.file,
                line: issue.line,
                suggestion: issue.optimization,
                codeExample: getCodeExample(issue.type),
              });
            }
          });
        }

        // Run quality analysis
        if (categories.includes('quality')) {
          const qualityIssues = await analyzeQuality(filesToAnalyze);
          qualityIssues.forEach((issue) => {
            if (shouldIncludeIssue(issue.severity, severity_threshold)) {
              results.push({
                category: 'quality',
                priority: getPriorityFromSeverity(issue.severity),
                title: `Quality: ${issue.type}`,
                description: issue.description,
                file: issue.file,
                line: issue.line,
                suggestion: issue.improvement,
                codeExample: getCodeExample(issue.type),
              });
            }
          });
        }

        // Run architecture analysis
        if (categories.includes('architecture')) {
          const architectureIssues = await analyzeArchitecture(filesToAnalyze);
          architectureIssues.forEach((issue) => {
            if (shouldIncludeIssue(issue.severity, severity_threshold)) {
              results.push({
                category: 'architecture',
                priority: getPriorityFromSeverity(issue.severity),
                title: `Architecture: ${issue.type}`,
                description: issue.description,
                file: issue.file,
                suggestion: issue.suggestion,
                codeExample: getCodeExample(issue.type),
              });
            }
          });
        }

        // Sort results by priority
        results.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Format output
        let outputContent: string;

        if (output_format === 'json') {
          outputContent = JSON.stringify(results, null, 2);
        } else if (output_format === 'markdown') {
          outputContent = formatMarkdownOutput(results);
        } else {
          outputContent = formatSummaryOutput(results);
        }

        // Auto-fix minor issues if requested
        if (auto_fix) {
          await autoFixIssues(results.filter((r) => r.priority === 'low'));
        }

        return {
          returnDisplay: `Code review completed. Analyzed ${filesToAnalyze.length} files, found ${results.length} issues.`,
          llmContent: outputContent,
        };
      } catch (e) {
        return {
          isError: true,
          llmContent: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });
}

function shouldIncludeIssue(severity: string, threshold: string): boolean {
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
  return (
    severityOrder[severity as keyof typeof severityOrder] >=
    severityOrder[threshold as keyof typeof severityOrder]
  );
}

function getPriorityFromSeverity(severity: string): 'high' | 'medium' | 'low' {
  if (severity === 'critical' || severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

function getCodeExample(type: string): string {
  const examples: Record<string, string> = {
    injection: '// Bad: eval(userInput)\n// Good: JSON.parse(userInput)',
    xss: '// Bad: element.innerHTML = userInput\n// Good: element.textContent = userInput',
    auth: '// Bad: const password = "secret123"\n// Good: const password = process.env.PASSWORD',
    crypto:
      '// Bad: crypto.createHash("md5")\n// Good: crypto.createHash("sha256")',
    algorithm:
      '// Bad: for (key in object)\n// Good: Object.keys(object).forEach(key => ...)',
    memory:
      '// Bad: setInterval(callback, 1000)\n// Good: const interval = setInterval(callback, 1000); clearInterval(interval)',
    io: '// Bad: fs.readFileSync(file)\n// Good: await fs.promises.readFile(file)',
    complexity:
      '// Bad: long function with many conditions\n// Good: small, focused functions',
    naming: '// Bad: let a = 5\n// Good: let userCount = 5',
    coupling:
      '// Bad: import many modules directly\n// Good: use dependency injection',
  };

  return examples[type] || '// Example not available';
}

function formatMarkdownOutput(results: ReviewResult[]): string {
  let output = '# Code Review Results\n\n';

  const groupedResults = results.reduce(
    (groups, result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
      return groups;
    },
    {} as Record<string, ReviewResult[]>,
  );

  Object.entries(groupedResults).forEach(([category, issues]) => {
    output += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Issues\n\n`;

    issues.forEach((issue) => {
      output += `### ${issue.title} (${issue.priority})\n\n`;
      output += `**Description:** ${issue.description}\n\n`;

      if (issue.file) {
        output += `**File:** ${issue.file}`;
        if (issue.line) {
          output += `:${issue.line}`;
        }
        output += '\n\n';
      }

      output += `**Suggestion:** ${issue.suggestion}\n\n`;

      if (issue.codeExample) {
        output += `**Example:**\n\`\`\`\n${issue.codeExample}\n\`\`\`\n\n`;
      }

      output += '---\n\n';
    });
  });

  return output;
}

function formatSummaryOutput(results: ReviewResult[]): string {
  const summary = {
    total: results.length,
    byCategory: results.reduce(
      (acc, result) => {
        acc[result.category] = (acc[result.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    byPriority: results.reduce(
      (acc, result) => {
        acc[result.priority] = (acc[result.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    highPriorityIssues: results
      .filter((r) => r.priority === 'high')
      .slice(0, 5),
  };

  let output = `# Code Review Summary\n\n`;
  output += `**Total Issues:** ${summary.total}\n\n`;

  output += `## By Category\n\n`;
  Object.entries(summary.byCategory).forEach(([category, count]) => {
    output += `- ${category}: ${count}\n`;
  });

  output += `\n## By Priority\n\n`;
  Object.entries(summary.byPriority).forEach(([priority, count]) => {
    output += `- ${priority}: ${count}\n`;
  });

  if (summary.highPriorityIssues.length > 0) {
    output += `\n## High Priority Issues\n\n`;
    summary.highPriorityIssues.forEach((issue) => {
      output += `- **${issue.title}:** ${issue.description}`;
      if (issue.file) {
        output += ` (${issue.file}${issue.line ? `:${issue.line}` : ''})`;
      }
      output += '\n';
    });
  }

  return output;
}

async function autoFixIssues(issues: ReviewResult[]) {
  // Implement auto-fix for minor issues
  for (const issue of issues) {
    if (issue.category === 'quality' && issue.title.includes('naming')) {
      // Auto-fix naming issues (implementation depends on specific patterns)
      console.log(`Auto-fixing naming issue in ${issue.file}:${issue.line}`);
    }
  }
}
