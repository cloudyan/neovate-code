#!/usr/bin/env bun

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createCodeReviewTool } from '../src/tools/code-review';

interface PreCommitConfig {
  enabled: boolean;
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  categories: ('security' | 'performance' | 'quality' | 'architecture')[];
  excludePatterns: string[];
  failOnHigh: boolean;
  failOnCritical: boolean;
  maxFilesPerReview: number;
  outputFormat: 'json' | 'markdown' | 'summary';
}

const defaultConfig: PreCommitConfig = {
  enabled: true,
  severityThreshold: 'medium',
  categories: ['security', 'performance', 'quality', 'architecture'],
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.d.ts',
    'coverage/**',
    '*.min.js',
    '*.bundle.js',
  ],
  failOnHigh: true,
  failOnCritical: true,
  maxFilesPerReview: 20,
  outputFormat: 'summary',
};

function loadConfig(): PreCommitConfig {
  const configPath = path.join(process.cwd(), '.neovate', 'code-review.json');

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...defaultConfig, ...userConfig };
    } catch (error) {
      console.warn('Failed to load code review config, using defaults:', error);
    }
  }

  return defaultConfig;
}

function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
    });
    return output
      .trim()
      .split('\n')
      .filter((file) => file.length > 0);
  } catch (error) {
    console.warn('Failed to get staged files:', error);
    return [];
  }
}

function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only HEAD~1', {
      encoding: 'utf-8',
    });
    return output
      .trim()
      .split('\n')
      .filter((file) => file.length > 0);
  } catch (error) {
    console.warn('Failed to get changed files:', error);
    return [];
  }
}

function filterRelevantFiles(
  files: string[],
  excludePatterns: string[],
): string[] {
  return files.filter((file) => {
    // Check if file matches exclude patterns
    return !excludePatterns.some((pattern) => {
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
      );
      return regex.test(file);
    });
  });
}

async function runCodeReview(files: string[], config: PreCommitConfig) {
  if (files.length === 0) {
    console.log('No files to review.');
    return { success: true, issues: [] };
  }

  if (files.length > config.maxFilesPerReview) {
    console.log(
      `Too many files to review (${files.length}). Limiting to ${config.maxFilesPerReview} most recent changes.`,
    );
    files = files.slice(-config.maxFilesPerReview);
  }

  console.log(`🔍 Running code review on ${files.length} files...`);

  try {
    const codeReviewTool = createCodeReviewTool({ cwd: process.cwd() });
    const result = await codeReviewTool.execute({
      files,
      categories: config.categories,
      severity_threshold: config.severityThreshold,
      output_format: config.outputFormat,
      exclude_patterns: config.excludePatterns,
    });

    if (result.isError) {
      console.error('❌ Code review failed:', result.llmContent);
      return { success: false, issues: [], error: result.llmContent };
    }

    // Parse results to check for high/critical issues
    let issues: any[] = [];
    try {
      if (config.outputFormat === 'json') {
        issues = JSON.parse(result.llmContent as string);
      } else {
        // For markdown/summary, we can't easily parse the issues
        // So we'll just display the output
        console.log(result.llmContent);
        return { success: true, issues: [] };
      }
    } catch (parseError) {
      console.warn('Failed to parse review results, displaying raw output:');
      console.log(result.llmContent);
      return { success: true, issues: [] };
    }

    // Display results
    console.log(result.returnDisplay);
    if (config.outputFormat === 'json' && issues.length > 0) {
      console.log('\n📋 Review Results:');
      issues.forEach((issue, index) => {
        console.log(
          `\n${index + 1}. [${issue.category.toUpperCase()}] ${issue.title} (${issue.priority})`,
        );
        if (issue.file) {
          console.log(
            `   📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`,
          );
        }
        console.log(`   📝 ${issue.description}`);
        console.log(`   💡 ${issue.suggestion}`);
      });
    }

    // Check for blocking issues
    const criticalIssues = issues.filter(
      (issue) =>
        issue.priority === 'high' &&
        (issue.category === 'security' ||
          issue.description.toLowerCase().includes('critical')),
    );
    const highIssues = issues.filter((issue) => issue.priority === 'high');

    let shouldBlock = false;
    if (config.failOnCritical && criticalIssues.length > 0) {
      console.log(
        `\n❌ Found ${criticalIssues.length} critical issues that block commit.`,
      );
      shouldBlock = true;
    } else if (config.failOnHigh && highIssues.length > 0) {
      console.log(
        `\n⚠️  Found ${highIssues.length} high-priority issues that block commit.`,
      );
      shouldBlock = true;
    }

    if (shouldBlock) {
      console.log(
        '\n💡 Fix the issues above or run with --no-verify to bypass.',
      );
      return { success: false, issues };
    }

    return { success: true, issues };
  } catch (error) {
    console.error('❌ Code review error:', error);
    return {
      success: false,
      issues: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  const config = loadConfig();

  if (!config.enabled) {
    console.log('Code review is disabled in configuration.');
    process.exit(0);
  }

  // Check command line arguments
  const args = process.argv.slice(2);
  const isStaged = args.includes('--staged');
  const isChanged = args.includes('--changed');
  const allFiles = args.includes('--all');

  let files: string[] = [];

  if (allFiles) {
    // Review all relevant files in the project
    const patterns = config.categories.map(
      (cat) => `src/**/*.${cat === 'architecture' ? 'ts' : 'ts'}`,
    );
    // This is simplified - in practice you'd want to use glob patterns
    console.log('Reviewing all project files (feature not fully implemented)');
    process.exit(0);
  } else if (isStaged) {
    files = getStagedFiles();
  } else if (isChanged) {
    files = getChangedFiles();
  } else {
    // Default: staged files
    files = getStagedFiles();
  }

  // Filter relevant files
  files = filterRelevantFiles(files, config.excludePatterns);

  // Only review source code files
  const sourceExtensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.vue',
    '.py',
    '.java',
    '.cpp',
    '.c',
  ];
  files = files.filter((file) =>
    sourceExtensions.some((ext) => file.endsWith(ext)),
  );

  if (files.length === 0) {
    console.log('No relevant source files to review.');
    process.exit(0);
  }

  const result = await runCodeReview(files, config);

  if (!result.success) {
    process.exit(1);
  }

  console.log('\n✅ Code review completed successfully.');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (import.meta.main) {
  main();
}
