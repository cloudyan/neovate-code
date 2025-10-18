import type { Plugin } from '../plugin';
import { createDocumentTool } from '../tools/document';
import { createEvaluateTool } from '../tools/evaluate';
import { createPositionDetectTool } from '../tools/position-detect';
import type { Tool } from '../tool';

export default {
  name: 'evaluator',

  // 注册工具
  tool: function (): Tool[] {
    return [
      createDocumentTool({ cwd: process.cwd() }),
      createEvaluateTool({ cwd: process.cwd() }),
      createPositionDetectTool({ cwd: process.cwd() }),
    ];
  },
} satisfies Plugin;
