import type { LanguageModelV2FunctionTool } from '@ai-sdk/provider';
import path from 'pathe';
import * as z from 'zod';
import type { Context } from './context';
import type { ImagePart, TextPart } from './message';
import { resolveModelWithContext } from './model';
import {
  createBashOutputTool,
  createBashTool,
  createKillBashTool,
} from './tools/bash';
import { createEditTool } from './tools/edit';
import { createFetchTool } from './tools/fetch';
import { createGlobTool } from './tools/glob';
import { createGrepTool } from './tools/grep';
import { createLSTool } from './tools/ls';
import { createReadTool } from './tools/read';
import { createTodoTool, type TodoItem } from './tools/todo';
import { createWriteTool } from './tools/write';

// WIP
// import { createDocumentTool } from './tools/document';
// import { createEvaluateTool } from './tools/evaluate';
// import { createCodeReviewTool } from './tools/code-review';

type ResolveToolsOpts = {
  context: Context;
  sessionId: string;
  write?: boolean;
  todo?: boolean;
};

export async function resolveTools(opts: ResolveToolsOpts) {
  const { cwd, productName, paths } = opts.context;
  const sessionId = opts.sessionId;
  const model = (
    await resolveModelWithContext(opts.context.config.model, opts.context)
  ).model!;
  const readonlyTools = [
    createReadTool({ cwd, productName }),
    createLSTool({ cwd, productName }),
    createGlobTool({ cwd }),
    createGrepTool({ cwd }),
    createFetchTool({ model }),
    // createDocumentTool({ cwd }),
    // createEvaluateTool({ cwd }),
    // createCodeReviewTool({ cwd }),
  ];
  const writeTools = opts.write
    ? [
        createWriteTool({ cwd }),
        createEditTool({ cwd }),
        createBashTool({
          cwd,
          backgroundTaskManager: opts.context.backgroundTaskManager,
        }),
      ]
    : [];
  const todoTools = (() => {
    if (!opts.todo) return [];
    const { todoWriteTool, todoReadTool } = createTodoTool({
      filePath: path.join(paths.globalConfigDir, 'todos', `${sessionId}.json`),
    });
    return [todoReadTool, todoWriteTool];
  })();
  const backgroundTools = opts.write
    ? [
        createBashOutputTool({
          backgroundTaskManager: opts.context.backgroundTaskManager,
        }),
        createKillBashTool({
          backgroundTaskManager: opts.context.backgroundTaskManager,
        }),
      ]
    : [];
  const mcpTools = await getMcpTools(opts.context);
  return [
    ...readonlyTools,
    ...writeTools,
    ...todoTools,
    ...backgroundTools,
    ...mcpTools,
  ];
}

async function getMcpTools(context: Context): Promise<Tool[]> {
  try {
    const mcpManager = context.mcpManager;
    await mcpManager.initAsync();
    return await mcpManager.getAllTools();
  } catch (error) {
    console.warn('Failed to load MCP tools:', error);
    return [];
  }
}

export class Tools {
  tools: Record<string, Tool>;
  constructor(tools: Tool[]) {
    this.tools = tools.reduce(
      (acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      },
      {} as Record<string, Tool>,
    );
  }

  get(toolName: string) {
    return this.tools[toolName];
  }

  length() {
    return Object.keys(this.tools).length;
  }

  async invoke(toolName: string, args: string): Promise<ToolResult> {
    const tool = this.tools[toolName];
    if (!tool) {
      return {
        llmContent: `Tool ${toolName} not found`,
        isError: true,
      };
    }
    // // @ts-expect-error
    // const result = validateToolParams(tool.parameters, args);
    // if (!result.success) {
    //   return {
    //     llmContent: `Invalid tool parameters: ${result.error}`,
    //     isError: true,
    //   };
    // }
    let argsObj: any;
    try {
      argsObj = JSON.parse(args);
    } catch (error) {
      return {
        llmContent: `Tool parameters parse failed: ${error}`,
        isError: true,
      };
    }
    return await tool.execute(argsObj);
  }

  toLanguageV2Tools(): LanguageModelV2FunctionTool[] {
    return Object.entries(this.tools).map(([key, tool]) => {
      // parameters of mcp tools is not zod object
      const isMCP = key.startsWith('mcp__');
      const schema = isMCP ? tool.parameters : z.toJSONSchema(tool.parameters);
      return {
        type: 'function',
        name: key,
        description: tool.description,
        inputSchema: schema,
        providerOptions: {},
      };
    });
  }
}

// function validateToolParams(schema: z.ZodObject<any>, params: string) {
//   try {
//     if (isZodObject(schema)) {
//       const parsedParams = JSON.parse(params);
//       const result = schema.safeParse(parsedParams);
//       if (!result.success) {
//         return {
//           success: false,
//           error: `Parameter validation failed: ${result.error.message}`,
//         };
//       }
//       return {
//         success: true,
//         message: 'Tool parameters validated successfully',
//       };
//     }
//     return {
//       success: true,
//       message: 'Tool parameters validated successfully',
//     };
//   } catch (error) {
//     return {
//       success: false,
//       error: error,
//     };
//   }
// }

export type ToolUse = {
  name: string;
  params: Record<string, any>;
  callId: string;
};

export type ToolUseResult = {
  toolUse: ToolUse;
  result: any;
  approved: boolean;
};

export interface Tool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  getDescription?: ({
    params,
    cwd,
  }: {
    params: z.output<TSchema>;
    cwd: string;
  }) => string;
  displayName?: string;
  execute: (params: z.output<TSchema>) => Promise<ToolResult> | ToolResult;
  approval?: ToolApprovalInfo;
  parameters: TSchema;
}

type ApprovalContext = {
  toolName: string;
  params: Record<string, any>;
  approvalMode: string;
  context: any;
};

export type ApprovalCategory = 'read' | 'write' | 'command' | 'network';

type ToolApprovalInfo = {
  needsApproval?: (context: ApprovalContext) => Promise<boolean> | boolean;
  category?: ApprovalCategory;
};

type TodoReadReturnDisplay = {
  type: 'todo_read';
  todos: TodoItem[];
};

type TodoWriteReturnDisplay = {
  type: 'todo_write';
  oldTodos: TodoItem[];
  newTodos: TodoItem[];
};

type DiffViewerReturnDisplay = {
  type: 'diff_viewer';
  originalContent: string | { inputKey: string };
  newContent: string | { inputKey: string };
  filePath: string;
  [key: string]: any;
};

export type ReturnDisplay =
  | string
  | DiffViewerReturnDisplay
  | TodoReadReturnDisplay
  | TodoWriteReturnDisplay;

export type ToolResult = {
  llmContent: string | (TextPart | ImagePart)[];
  returnDisplay?: ReturnDisplay;
  isError?: boolean;
};

/**
 *
 */
/**
 * 创建一个新的工具，可以被 AI 代理使用。
 * 适合 MCP 工具的场景(核心原则)：1. 标准化程度高 2. 需要复用 3. 资源密集型（大量计算资源, 特殊环境依赖）
 *
 * 工具是 AI 与文件系统、shell 和其他系统交互的主要方式。
 * 它们遵循模型上下文协议 (MCP) 规范，以确保与外部工具的兼容性。
 *
 * @template TSchema 工具参数的 Zod 模式类型
 * @param config - 工具配置
 * @param config.name - 工具的唯一标识符
 * @param config.description - 工具功能的人类可读描述
 * @param config.parameters - 定义工具输入参数的 Zod 模式
 * @param config.execute - 实现工具行为的函数
 * @param config.approval - 工具的可选审批要求
 * @param config.getDescription - 可选函数，用于生成工具调用的人类可读描述
 * @returns 可以被代理使用的 Tool 对象
 *
 * @example
 * const readTool = createTool({
 *   name: 'read',
 *   description: '从本地文件系统读取文件',
 *   parameters: z.object({
 *     file_path: z.string(),
 *   }),
 *   execute: async ({ file_path }) => {
 *     // 实现代码
 *   }
 * });
 */
export function createTool<TSchema extends z.ZodTypeAny>(config: {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (params: z.output<TSchema>) => Promise<ToolResult> | ToolResult;
  approval?: ToolApprovalInfo;
  getDescription?: ({
    params,
    cwd,
  }: {
    params: z.output<TSchema>;
    cwd: string;
  }) => string;
}): Tool<TSchema> {
  return {
    name: config.name,
    description: config.description,
    getDescription: config.getDescription,
    parameters: config.parameters,
    execute: config.execute,
    approval: config.approval,
  };
}
