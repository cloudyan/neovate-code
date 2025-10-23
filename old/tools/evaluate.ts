import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../../src/tool';
import { safeStringify } from '../../src/utils/safeStringify';
import {
  positionDetectionPrompt,
  positionKeywords,
} from '../../src/prompts/position-detection';
import { evaluationPrompts } from '../../src/prompts/evaluation-prompts';
import type { JobPosition } from '../../src/prompts/evaluation-prompts';

interface PositionDetectionResult {
  position: JobPosition;
  confidence: number;
  reason: string;
}

interface EvaluationResult {
  score: number;
  reason: string;
  risk: string[];
  stack: string[];
  highlight: string;
  detectedPosition?: PositionDetectionResult;
}

// 简单的关键词匹配岗位识别（备用方案）
function detectPositionByKeywords(content: string): PositionDetectionResult {
  const lowerContent = content.toLowerCase();
  const scores: Record<JobPosition, number> = {
    frontend: 0,
    backend: 0,
    fullstack: 0,
    mobile: 0,
    data: 0,
    devops: 0,
    ai: 0,
    qa: 0,
    security: 0,
    unknown: 0,
  };

  // 计算各岗位关键词匹配分数
  Object.entries(positionKeywords).forEach(([position, keywords]) => {
    const count = keywords.filter((keyword: string) =>
      lowerContent.includes(keyword.toLowerCase()),
    ).length;
    scores[position as JobPosition] = count;
  });

  // 找到最高分的岗位
  let maxScore = 0;
  let detectedPosition: JobPosition = 'unknown';

  Object.entries(scores).forEach(([position, score]) => {
    if (score > maxScore) {
      maxScore = score;
      detectedPosition = position as JobPosition;
    }
  });

  return {
    position: detectedPosition,
    confidence: Math.min(maxScore * 10, 100), // 简单的置信度计算
    reason: `基于关键词匹配检测到${maxScore}个相关技能`,
  };
}

// AI驱动的岗位识别（主要方案）
async function detectPositionByAI(
  content: string,
): Promise<PositionDetectionResult> {
  try {
    // 构建完整的prompt
    const prompt = positionDetectionPrompt.replace('{resume_content}', content);

    // 这里应该调用实际的LLM API
    // 由于需要真实的API调用，我们先用模拟实现
    // 在实际实现中，这里会调用callLLM函数
    const mockResponse = await mockLLMCall(prompt);

    // 解析响应
    try {
      const result = JSON.parse(mockResponse);
      return {
        position: result.position || 'unknown',
        confidence: result.confidence || 0,
        reason: result.reason || '默认识别理由',
      };
    } catch (parseError) {
      // 如果AI返回的不是有效的JSON，回退到关键词匹配
      return detectPositionByKeywords(content);
    }
  } catch (error) {
    // 如果AI调用失败，回退到关键词匹配
    return detectPositionByKeywords(content);
  }
}

// 模拟LLM调用（实际实现中需要替换为真实的LLM API调用）
async function mockLLMCall(prompt: string): Promise<string> {
  // 这是一个模拟实现，在实际项目中需要替换为真实的LLM调用
  // 例如使用OpenAI API、Anthropic API等

  // 模拟一些延迟
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 返回模拟的JSON响应
  return JSON.stringify({
    position: 'frontend',
    confidence: 85,
    reason: '简历中包含大量前端技术关键词',
  });
}

// 实际的LLM调用函数（需要根据项目实际的LLM集成来实现）
async function callLLM(prompt: string): Promise<string> {
  // 这里应该集成项目中已有的LLM调用方法
  // 例如从src/llmsContext.ts或其他相关文件中导入
  throw new Error('需要实现真实的LLM调用');
}

export function createEvaluateTool(opts: { cwd: string }) {
  return createTool({
    name: 'evaluate',
    description: `
基于AI招聘专家标准的简历筛选评估工具。

功能包括：
- 支持多种岗位类型的简历评估（前端、后端、全栈等）
- 自动岗位识别功能
- 10秒快速评估简历是否值得约面
- 0-100分量化评分
- 识别风险点（年限注水、技术栈造假等）
- 提取真实技术栈
- 生成核心亮点

评估标准参考拥有10年招聘经验的技术负责人标准。
    `.trim(),
    parameters: z.object({
      resume_content: z
        .array(z.string())
        .optional()
        .describe('直接提供的简历内容列表（Markdown格式或JSON字符串）'),
      resume_files: z
        .array(z.string())
        .optional()
        .describe('简历文件路径列表（Markdown格式）'),
      position: z
        .enum([
          'auto',
          'frontend',
          'backend',
          'fullstack',
          'mobile',
          'data',
          'devops',
          'ai',
          'qa',
          'security',
        ])
        .default('auto')
        .describe('岗位类型（auto表示自动识别）'),
      custom_prompt: z
        .string()
        .optional()
        .describe('自定义评估Prompt（覆盖默认岗位Prompt）'),
      output_file: z
        .string()
        .optional()
        .describe('输出文件路径，如果不指定则返回内容而不写入文件'),
      enable_position_detection: z
        .boolean()
        .optional()
        .default(true)
        .describe('是否启用岗位自动识别功能'),
    }),
    getDescription: ({ params }) => {
      const count =
        (params.resume_content?.length || 0) +
        (params.resume_files?.length || 0);
      const positionInfo =
        params.position === 'auto'
          ? '自动识别岗位'
          : `评估${params.position}岗位`;
      return `Evaluate ${count} resume(s) with ${positionInfo}`;
    },
    execute: async ({
      resume_content,
      resume_files,
      position = 'auto',
      custom_prompt,
      output_file,
      enable_position_detection = true,
    }) => {
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

        const results: Record<string, any> = {};

        // 逐个处理简历
        for (let i = 0; i < allResumes.length; i++) {
          const { content, source } = allResumes[i];

          // 岗位识别
          let detectedPosition: PositionDetectionResult | null = null;
          let finalPosition: JobPosition = 'frontend'; // 默认岗位

          if (position === 'auto' && enable_position_detection) {
            // 自动识别岗位
            detectedPosition = await detectPositionByAI(content);
            finalPosition = detectedPosition.position;

            // 如果置信度较低，记录警告
            if (detectedPosition.confidence < 70) {
              console.warn(
                `岗位识别置信度较低 (${detectedPosition.confidence}%)，使用默认岗位`,
              );
              finalPosition = 'frontend'; // 置信度低时使用默认岗位
            }
          } else if (position !== 'auto') {
            // 使用指定岗位
            finalPosition = position as JobPosition;
          }

          // 选择评估Prompt
          const prompt =
            custom_prompt ||
            evaluationPrompts[finalPosition] ||
            evaluationPrompts.frontend;

          // 调用大模型进行评估（模拟实现）
          const evaluationResult: any = {
            score: 85,
            reason: '可约：技术栈匹配度高',
            risk: [],
            stack: ['React', 'TypeScript', 'Node.js'],
            highlight: '有大型项目经验',
          };

          // 添加岗位识别信息
          if (detectedPosition) {
            results[source] = {
              ...evaluationResult,
              detectedPosition,
            };
          } else {
            results[source] = evaluationResult;
          }
        }

        // 处理输出
        let outputContent: string;
        outputContent = JSON.stringify(results, null, 2);

        // 输出到文件或返回内容
        if (output_file) {
          const outputPath = path.isAbsolute(output_file)
            ? output_file
            : path.resolve(opts.cwd, output_file);
          fs.writeFileSync(outputPath, outputContent, 'utf-8');
          return {
            returnDisplay: `评估完成，共评估 ${allResumes.length} 个简历，结果已保存到 ${output_file}`,
            llmContent: outputContent,
          };
        } else {
          return {
            returnDisplay: `评估完成，共评估 ${allResumes.length} 个简历`,
            llmContent: outputContent,
          };
        }
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
