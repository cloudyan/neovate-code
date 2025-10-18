import type { Plugin } from '../plugin';
import { createCodeReviewTool } from '../tools/code-review';
import type { Tool } from '../tool';
import type { CodeReviewConfig } from '../config';
import path from 'pathe';
import fs from 'fs';

const defaultConfig: CodeReviewConfig = {
  enabled: true,
  autoRunOnCommit: true,
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
  ],
  outputFormat: 'summary',
  autoFix: false,
  maxFilesPerReview: 50,
  cacheResults: true,
};

export default {
  name: 'code-review',
  config: function ({ config, argvConfig }) {
    const codeReviewConfig = { ...defaultConfig };

    // Override with user config
    if (config.codeReview) {
      Object.assign(codeReviewConfig, config.codeReview);
    }

    // Override with command line arguments
    if (argvConfig['code-review-severity']) {
      codeReviewConfig.severityThreshold = argvConfig['code-review-severity'];
    }
    if (argvConfig['code-review-categories']) {
      codeReviewConfig.categories =
        argvConfig['code-review-categories'].split(',');
    }
    if (argvConfig['code-review-auto-fix']) {
      codeReviewConfig.autoFix = true;
    }

    return {
      ...config,
      codeReview: codeReviewConfig,
    };
  },

  tool: function ({ isPlan, sessionId }): Tool[] {
    if (isPlan) return [];

    return [createCodeReviewTool({ cwd: process.cwd() })];
  },

  // Hook into the conversation to automatically run code review
  conversation: async function (opts) {
    const { result, sessionId } = opts;
    const codeReviewConfig = (this as any).config
      .codeReview as CodeReviewConfig;

    if (!codeReviewConfig.enabled) return;

    // Check if any tools were used that modified files
    const hasModifications =
      result.success && result.metadata?.toolCallsCount > 0;

    if (hasModifications && codeReviewConfig.autoRunOnCommit) {
      console.log('\n🔍 Running automatic code review...');

      try {
        const codeReviewTool = createCodeReviewTool({ cwd: process.cwd() });
        const reviewResult = await codeReviewTool.execute({
          include_patterns: [
            'src/**/*.ts',
            'src/**/*.js',
            'src/**/*.tsx',
            'src/**/*.jsx',
          ],
          categories: codeReviewConfig.categories,
          severity_threshold: codeReviewConfig.severityThreshold,
          output_format: codeReviewConfig.outputFormat,
          auto_fix: codeReviewConfig.autoFix,
          exclude_patterns: codeReviewConfig.excludePatterns,
        });

        if (reviewResult.isError) {
          console.warn('Code review failed:', reviewResult.llmContent);
        } else {
          console.log(reviewResult.returnDisplay);

          // Save review results to cache if enabled
          if (codeReviewConfig.cacheResults) {
            const content =
              typeof reviewResult.llmContent === 'string'
                ? reviewResult.llmContent
                : JSON.stringify(reviewResult.llmContent);
            await saveReviewResults(sessionId, content);
          }
        }
      } catch (error) {
        console.warn('Failed to run automatic code review:', error);
      }
    }
  },

  status: function () {
    return {
      'code-review': {
        description: 'Multi-agent code review system',
        items: [
          'Security vulnerability detection',
          'Performance issue identification',
          'Code quality analysis',
          'Architectural consistency checking',
          'Priority-based recommendations',
          'Pre-commit integration',
        ],
      },
    };
  },
} satisfies Plugin;

async function saveReviewResults(sessionId: string, results: string) {
  try {
    const cacheDir = path.join(
      process.cwd(),
      '.neovate',
      'cache',
      'code-review',
    );
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFile = path.join(cacheDir, `${sessionId}.json`);
    fs.writeFileSync(
      cacheFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          sessionId,
          results,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.warn('Failed to save review results:', error);
  }
}
