/**
 * LlmsContext 模块 - AI 模型上下文管理
 *
 * 核心职责：
 * 1. 为 AI 模型提供完整的运行环境信息
 * 2. 收集项目上下文（Git 状态、目录结构、规则、README）
 * 3. 组装环境变量信息（工作目录、平台、日期等）
 * 4. 支持通过插件钩子扩展上下文内容
 *
 * 设计特点：
 * - 动态生成：每次对话都重新创建，确保信息最新
 * - 可扩展：通过 context 和 env 钩子支持插件扩展
 * - 结构化：使用 XML 标签包装，便于 AI 模型解析
 */

import fs from 'fs';
import path from 'pathe';
import { platform } from 'process';
import type { Context } from './context';
import { PluginHookType } from './plugin';
import { getLlmsRules } from './rules';
import { createLSTool } from './tools/ls';
import { getGitStatus, getLlmGitStatus } from './utils/git';
import { isProjectDirectory } from './utils/project';

/**
 * LlmsContext.create() 方法参数
 */
export type LlmsContextCreateOpts = {
  context: Context; // 全局上下文（包含配置、插件等）
  sessionId: string; // 会话 ID
  userPrompt: string | null; // 用户输入的提示（可能为空，如恢复会话）
};

/**
 * LlmsContext 类 - AI 模型上下文
 *
 * 该类将项目信息和环境信息组装成结构化的消息，
 * 作为系统消息的一部分发送给 AI 模型，帮助 AI 更好地理解上下文。
 *
 * 上下文信息包括：
 *
 * ## Context 部分
 * - gitStatus: Git 仓库状态（分支、修改文件等）
 * - directoryStructure: 目录结构（项目文件树）
 * - rules: 项目规则（代码规范、约定等）
 * - readme: README.md 内容
 * - 自定义上下文（通过 context 钩子扩展）
 *
 * ## Environment 部分
 * - Working directory: 工作目录
 * - Is directory a git repo: 是否为 Git 仓库
 * - Platform: 操作系统平台
 * - Today's date: 当前日期
 * - 自定义环境信息（通过 env 钩子扩展）
 *
 * 使用示例：
 * ```typescript
 * const llmsContext = await LlmsContext.create({
 *   context,
 *   sessionId: 'abc123',
 *   userPrompt: 'Help me fix this bug',
 * });
 *
 * // llmsContext.messages 可以添加到系统消息中
 * // 格式：['# Context\n<context name="...">...</context>', '# Environment\n<env name="...">...</env>']
 * ```
 */
export class LlmsContext {
  messages: string[]; // 上下文消息数组（通常包含 2 个消息：Context 和 Environment）

  constructor(opts: { messages: string[] }) {
    this.messages = opts.messages;
  }

  /**
   * 创建 LlmsContext 实例
   *
   * 创建流程：
   * 1. 获取 Git 状态
   * 2. 获取目录结构（如果是项目目录）
   * 3. 获取项目规则
   * 4. 读取 README.md
   * 5. 触发 context 钩子（允许插件扩展上下文）
   * 6. 组装 Context 部分
   * 7. 准备环境信息
   * 8. 触发 env 钩子（允许插件扩展环境信息）
   * 9. 组装 Environment 部分
   * 10. 返回 LlmsContext 实例
   *
   * @param opts - 创建选项
   * @returns LlmsContext 实例
   */
  static async create(opts: LlmsContextCreateOpts) {
    // 步骤 1: 获取 Git 状态（如果在 Git 仓库中）
    const gitStatus = await getGitStatus({ cwd: opts.context.cwd });

    // 初始化上下文对象（键值对形式）
    let llmsContext: Record<string, string> = {};

    // 步骤 2: 获取并格式化 Git 状态
    // 包括当前分支、修改的文件、未跟踪的文件等
    const llmsGitStatus = await getLlmGitStatus(gitStatus);
    if (llmsGitStatus) {
      llmsContext.gitStatus = llmsGitStatus;
    }

    // 步骤 3: 获取目录结构
    // 只有当前目录是项目目录时才获取（避免在普通目录中显示过多文件）
    const isProject = isProjectDirectory(opts.context.cwd);
    if (isProject) {
      // 使用 LS 工具获取目录结构（自动过滤 node_modules、.git 等）
      const LSTool = createLSTool({
        cwd: opts.context.cwd,
        productName: opts.context.productName,
      });
      const result = (await LSTool.execute({ dir_path: '.' })) as any;
      if (result) {
        llmsContext.directoryStructure = `
${result.returnDisplay}
<directory_structure>
${result.llmContent}
</directory_structure>
        `.trim();
      }
    }

    // 步骤 4: 获取项目规则
    // 规则可以来自：
    // - 全局配置目录的 RULES.md
    // - 项目根目录的 RULES.md
    // - 配置文件中的 rules 字段
    const rules = getLlmsRules({
      cwd: opts.context.cwd,
      productName: opts.context.productName,
      globalConfigDir: opts.context.paths.globalConfigDir,
    });
    if (rules) {
      llmsContext.rules = rules.llmsDescription;
    }

    // 步骤 5: 读取 README.md
    // 提供项目的基本信息和使用说明
    const readmePath = path.join(opts.context.cwd, 'README.md');
    if (fs.existsSync(readmePath)) {
      llmsContext.readme = fs.readFileSync(readmePath, 'utf-8');
    }

    // 步骤 6: 触发 context 钩子
    // 允许插件添加自定义上下文信息
    // 使用 SeriesMerge 类型，插件可以合并对象
    llmsContext = await opts.context.apply({
      hook: 'context',
      args: [
        {
          sessionId: opts.sessionId,
          userPrompt: opts.userPrompt,
        },
      ],
      memo: llmsContext,
      type: PluginHookType.SeriesMerge,
    });

    // 步骤 7: 组装 Context 部分
    // 将所有上下文信息格式化为 XML 标签形式
    // 例如：<context name="gitStatus">...</context>
    const llmsContextStr = `
# Context
As you answer the user's questions, you can use the following context:
${Object.entries(llmsContext)
  .map(([key, value]) => `<context name="${key}">${value}</context>`)
  .join('\n')}
    `.trim();

    // 步骤 8: 准备环境信息
    let llmsEnv = {
      'Working directory': opts.context.cwd,
      'Is directory a git repo': gitStatus ? 'YES' : 'NO',
      Platform: platform,
      "Today's date": new Date().toLocaleDateString(),
    };

    // 步骤 9: 触发 env 钩子
    // 允许插件添加自定义环境信息
    llmsEnv = await opts.context.apply({
      hook: 'env',
      args: [
        {
          sessionId: opts.sessionId,
          userPrompt: opts.userPrompt,
        },
      ],
      memo: llmsEnv,
      type: PluginHookType.SeriesMerge,
    });

    // 步骤 10: 组装 Environment 部分
    // 将所有环境信息格式化为 XML 标签形式
    // 例如：<env name="Platform">darwin</env>
    const llmsEnvStr = `
# Environment
Here is useful information about the environment you are running in.
${Object.entries(llmsEnv)
  .map(([key, value]) => `<env name="${key}">${value}</env>`)
  .join('\n')}
    `.trim();

    // 返回包含两个消息的 LlmsContext 实例
    // 这两个消息通常会作为系统消息的一部分发送给 AI
    return new LlmsContext({ messages: [llmsContextStr, llmsEnvStr] });
  }
}
