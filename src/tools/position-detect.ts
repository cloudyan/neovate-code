import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../tool';
import { positionDetectionPrompt } from '../prompts/position-detection';
import type { JobPosition } from '../prompts/evaluation-prompts';

interface PositionDetectionResult {
  position: JobPosition;
  confidence: number;
  reason: string;
}

export function createPositionDetectTool(opts: { cwd: string }) {
  return createTool({
    name: 'position-detect',
    description: '自动识别简历最适合的岗位类型',
    parameters: z.object({
      resume_content: z
        .array(z.string())
        .optional()
        .describe('直接提供的简历内容列表'),
      resume_files: z.array(z.string()).optional().describe('简历文件路径列表'),
    }),
    getDescription: ({ params }) => {
      const count =
        (params.resume_content?.length || 0) +
        (params.resume_files?.length || 0);
      return `Detect position for ${count} resume(s)`;
    },
    execute: async ({ resume_content, resume_files }) => {
      try {
        // 合并简历内容来源
        const allResumes: { content: string; source: string }[] = [];

        // 处理直接提供的内容
        if (resume_content) {
          resume_content.forEach((content, index) => {
            allResumes.push({
              content,
              source: `content_${index + 1}`,
            });
          });
        }

        // 处理文件内容
        if (resume_files) {
          for (const filePath of resume_files) {
            const fullPath = path.isAbsolute(filePath)
              ? filePath
              : path.resolve(opts.cwd, filePath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            allResumes.push({
              content,
              source: path.basename(filePath),
            });
          }
        }

        const results: Record<string, PositionDetectionResult> = {};

        // 逐个识别岗位
        for (const { content, source } of allResumes) {
          // 构建完整的prompt
          const prompt = positionDetectionPrompt.replace(
            '{resume_content}',
            content,
          );

          // 这里应该调用实际的LLM API
          // 模拟实现
          const mockResponse = JSON.stringify({
            position: 'frontend',
            confidence: 85,
            reason: '简历中包含大量前端技术关键词',
          });

          try {
            const result = JSON.parse(mockResponse);
            results[source] = {
              position: result.position,
              confidence: result.confidence,
              reason: result.reason,
            };
          } catch (error) {
            results[source] = {
              position: 'unknown',
              confidence: 0,
              reason: '识别失败',
            };
          }
        }

        return {
          returnDisplay: `岗位识别完成，共处理 ${allResumes.length} 个简历`,
          llmContent: JSON.stringify(results, null, 2),
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
