/**
 * Context 模块 - 全局上下文管理和依赖注入容器
 *
 * 核心职责：
 * 1. 作为依赖注入容器，管理所有核心依赖（配置、插件、路径、MCP 等）
 * 2. 配置集中管理，合并多个来源的配置（文件、命令行、插件）
 * 3. 插件生命周期管理，协调插件的加载、初始化和销毁
 * 4. 提供统一的路径访问接口
 *
 * 设计模式：
 * - 依赖注入容器模式：通过 Context 注入所有依赖
 * - 工厂模式：使用 Context.create() 静态方法创建实例
 * - 单例模式（应用级）：每个应用实例通常只有一个 Context
 */

import fs from 'fs';
import { createJiti } from 'jiti';
import path from 'pathe';
import resolve from 'resolve';
import { type Config, ConfigManager } from './config';
import { MCPManager } from './mcp';
import { Paths } from './paths';
import {
  type Plugin,
  type PluginApplyOpts,
  PluginHookType,
  PluginManager,
} from './plugin';

/**
 * Context 构造函数参数（内部使用）
 * 包含所有已初始化的依赖，由 Context.create() 方法准备
 */
type ContextOpts = {
  cwd: string; // 当前工作目录
  productName: string; // 产品名称（小写）
  productASCIIArt?: string; // ASCII 艺术字标题
  version: string; // 版本号
  config: Config; // 合并后的最终配置
  pluginManager: PluginManager; // 插件管理器
  paths: Paths; // 路径管理器
  argvConfig: Record<string, any>; // 原始命令行参数
  mcpManager: MCPManager; // MCP 服务器管理器
};

/**
 * Context.create() 方法参数（公开 API）
 * 用户提供的创建 Context 所需的基础信息
 */
export type ContextCreateOpts = {
  cwd: string; // 当前工作目录
  productName: string; // 产品名称
  productASCIIArt?: string; // ASCII 艺术字标题
  version: string; // 版本号
  argvConfig: Record<string, any>; // 命令行参数对象
  plugins: (string | Plugin)[]; // 插件列表（路径或对象）
};

/**
 * Context 类 - 全局上下文和依赖注入容器
 *
 * 生命周期：
 * 1. Context.create() - 创建实例
 * 2. initialized 钩子 - 初始化完成
 * 3. 使用阶段 - 通过 apply() 触发各种钩子
 * 4. destroy() - 销毁资源
 *
 * 使用示例：
 * ```typescript
 * const context = await Context.create({
 *   cwd: process.cwd(),
 *   productName: 'neovate',
 *   version: '1.0.0',
 *   argvConfig: {},
 *   plugins: [],
 * });
 *
 * // 使用 context
 * const project = new Project({ context });
 *
 * // 销毁
 * await context.destroy();
 * ```
 */
export class Context {
  cwd: string; // 当前工作目录，所有相对路径的基准
  productName: string; // 产品名称（小写），用于路径和配置文件查找
  productASCIIArt?: string; // ASCII 艺术字，用于终端显示
  version: string; // 版本号，用于显示和兼容性检查
  config: Config; // 最终配置对象（合并所有来源）
  paths: Paths; // 路径管理器，统一管理全局和项目路径
  #pluginManager: PluginManager; // 插件管理器（私有），通过 apply() 访问
  argvConfig: Record<string, any>; // 原始命令行参数，某些场景需要区分命令行配置
  mcpManager: MCPManager; // MCP 服务器管理器，管理外部工具集成

  /**
   * 构造函数（私有设计）
   * 不应直接使用，请使用 Context.create() 静态方法
   *
   * @param opts - 已初始化的所有依赖
   */
  constructor(opts: ContextOpts) {
    this.cwd = opts.cwd;
    this.productName = opts.productName;
    this.productASCIIArt = opts.productASCIIArt;
    this.version = opts.version;
    this.config = opts.config;
    this.paths = opts.paths;
    this.mcpManager = opts.mcpManager;
    this.#pluginManager = opts.pluginManager;
    this.argvConfig = opts.argvConfig;
  }

  /**
   * 触发插件钩子
   *
   * 这是 Context 与插件交互的核心方法，允许插件：
   * - 扩展功能（如添加工具、提供商）
   * - 修改行为（如修改系统提示词、配置）
   * - 监听事件（如对话完成、查询结束）
   *
   * @param applyOpts - 钩子选项
   * @param applyOpts.hook - 钩子名称（如 'tool', 'systemPrompt'）
   * @param applyOpts.args - 传递给钩子的参数
   * @param applyOpts.memo - 初始值或累积值
   * @param applyOpts.type - 钩子类型（Series/SeriesLast/SeriesMerge/Parallel）
   * @returns 钩子执行后的结果
   *
   * 示例：
   * ```typescript
   * // 扩展工具
   * const tools = await context.apply({
   *   hook: 'tool',
   *   args: [{ sessionId: 'abc' }],
   *   memo: [],
   *   type: PluginHookType.SeriesMerge,
   * });
   * ```
   */
  async apply(applyOpts: Omit<PluginApplyOpts, 'pluginContext'>) {
    return this.#pluginManager.apply({
      ...applyOpts,
      pluginContext: this,
    });
  }

  /**
   * 销毁上下文，清理资源
   *
   * 执行顺序：
   * 1. 销毁 MCP 管理器（关闭所有 MCP 服务器连接）
   * 2. 并行触发所有插件的 destroy 钩子
   *
   * 应在应用退出前调用，确保资源正确释放
   *
   * 示例：
   * ```typescript
   * try {
   *   await doWork(context);
   * } finally {
   *   await context.destroy();
   * }
   * ```
   */
  async destroy() {
    await this.mcpManager.destroy();
    await this.apply({
      hook: 'destroy',
      args: [],
      type: PluginHookType.Parallel,
    });
  }

  /**
   * 创建 Context 实例（推荐使用方式）
   *
   * 创建流程：
   * 1. 初始化 Paths（路径管理器）
   * 2. 创建 ConfigManager，加载和合并配置
   * 3. 扫描插件（内置 → 全局 → 项目 → 配置文件 → 命令行）
   * 4. 规范化插件（字符串路径 → Plugin 对象）
   * 5. 创建 PluginManager
   * 6. 触发 config 钩子，允许插件修改配置
   * 7. 合并 MCP 配置，创建 MCPManager
   * 8. 创建并返回 Context 实例
   *
   * @param opts - 创建选项
   * @returns Context 实例
   *
   * 示例：
   * ```typescript
   * const context = await Context.create({
   *   cwd: process.cwd(),
   *   productName: 'neovate',
   *   version: '1.0.0',
   *   argvConfig: parseArgs(process.argv),
   *   plugins: ['my-plugin'],
   * });
   * ```
   */
  static async create(opts: ContextCreateOpts) {
    const { cwd, version, productASCIIArt } = opts;
    // 统一使用小写产品名称，避免路径大小写问题
    const productName = opts.productName.toLowerCase();

    // 步骤 1: 初始化路径管理器
    // 提供统一的路径访问，包括全局配置目录、项目配置目录、会话日志路径等
    const paths = new Paths({
      productName,
      cwd,
    });

    // 步骤 2: 创建配置管理器，加载和合并配置
    // 配置优先级：命令行 > 项目配置 > 全局配置 > 默认配置
    const configManager = new ConfigManager(
      cwd,
      productName,
      opts.argvConfig || {},
    );
    const initialConfig = configManager.config;

    // 步骤 3: 扫描和收集所有插件
    // 内置插件：硬编码的核心插件
    const buildInPlugins: Plugin[] = [];

    // 全局插件：~/.neovate/plugins/*.{js,ts}
    const globalPlugins = scanPlugins(
      path.join(paths.globalConfigDir, 'plugins'),
    );

    // 项目插件：<cwd>/.neovate/plugins/*.{js,ts}
    const projectPlugins = scanPlugins(
      path.join(paths.projectConfigDir, 'plugins'),
    );

    // 合并所有插件来源，后面的覆盖前面的（同名插件）
    const pluginsConfigs: (string | Plugin)[] = [
      ...buildInPlugins, // 1. 内置插件（最低优先级）
      ...globalPlugins, // 2. 全局插件
      ...projectPlugins, // 3. 项目插件
      ...(initialConfig.plugins || []), // 4. 配置文件中的插件
      ...(opts.plugins || []), // 5. 命令行指定的插件（最高优先级）
    ];

    // 步骤 4: 规范化插件（字符串路径 → Plugin 对象）
    const plugins = await normalizePlugins(opts.cwd, pluginsConfigs);

    // 步骤 5: 创建插件管理器
    const pluginManager = new PluginManager(plugins);

    // 步骤 6: 创建临时上下文，用于在实例创建前触发 config 钩子
    // 这是一个"先有鸡还是先有蛋"的问题：
    // - 需要 context 才能触发钩子
    // - 需要触发 config 钩子才能得到最终配置
    // - 需要最终配置才能创建 context
    // 解决方案：创建临时的部分 context
    const apply = async (hookOpts: any) => {
      return pluginManager.apply({ ...hookOpts, pluginContext: tempContext });
    };
    const tempContext = {
      ...opts,
      config: initialConfig,
      apply,
      pluginManager,
    };

    // 触发 config 钩子，允许插件修改配置
    // 使用 SeriesMerge 类型，插件可以合并配置对象
    const resolvedConfig = await apply({
      hook: 'config',
      args: [{ config: initialConfig, argvConfig: opts.argvConfig }],
      memo: initialConfig,
      type: PluginHookType.SeriesMerge,
    });
    // 更新临时上下文的配置（后续钩子可能需要）
    tempContext.config = resolvedConfig;

    // 步骤 7: 合并 MCP 服务器配置
    // 优先级：命令行 > 配置文件（已经过插件处理）
    const mcpServers = {
      ...(resolvedConfig.mcpServers || {}),
      ...opts.argvConfig.mcpServers,
    };
    // 创建 MCP 管理器（不立即连接，延迟到使用时）
    const mcpManager = MCPManager.create(mcpServers);

    // 步骤 8: 创建最终的 Context 实例
    return new Context({
      cwd,
      productName,
      productASCIIArt,
      version,
      pluginManager,
      argvConfig: opts.argvConfig,
      config: resolvedConfig, // 使用经过插件处理的配置
      paths,
      mcpManager,
    });
  }
}

/**
 * 规范化插件列表
 * 将字符串路径转换为 Plugin 对象
 *
 * 处理逻辑：
 * 1. Plugin 对象直接返回
 * 2. 字符串路径：
 *    - 使用 resolve 解析完整路径（支持 node_modules）
 *    - 使用 jiti 动态导入（支持 TypeScript 和 ESM）
 *    - 提取默认导出作为插件对象
 *
 * @param cwd - 当前工作目录，作为路径解析基准
 * @param plugins - 插件列表（路径或对象）
 * @returns 规范化后的插件对象数组
 */
function normalizePlugins(cwd: string, plugins: (string | Plugin)[]) {
  let jiti: any = null; // 懒加载 jiti，避免不必要的初始化
  return Promise.all(
    plugins.map(async (plugin) => {
      if (typeof plugin === 'string') {
        // 解析插件路径（支持相对路径和 node_modules）
        const pluginPath = resolve.sync(plugin, { basedir: cwd });
        // 懒加载 jiti（只在第一次遇到字符串插件时初始化）
        if (!jiti) {
          jiti = createJiti(import.meta.url);
        }
        // 动态导入插件（支持 TypeScript、ESM、CommonJS）
        return (await jiti.import(pluginPath, {
          default: true, // 提取默认导出
        })) as Plugin;
      }
      // Plugin 对象直接返回
      return plugin;
    }),
  );
}

/**
 * 扫描插件目录，返回插件文件路径列表
 *
 * 扫描规则：
 * - 只扫描 .js 和 .ts 文件
 * - 不递归扫描子目录
 * - 目录不存在或扫描失败返回空数组（静默失败）
 *
 * @param pluginDir - 插件目录路径
 * @returns 插件文件路径数组
 *
 * 示例：
 * ```typescript
 * // ~/.neovate/plugins/
 * //   ├── my-plugin.ts
 * //   ├── another-plugin.js
 * //   └── not-plugin.txt
 *
 * scanPlugins('~/.neovate/plugins')
 * // => [
 * //   '~/.neovate/plugins/my-plugin.ts',
 * //   '~/.neovate/plugins/another-plugin.js'
 * // ]
 * ```
 */
function scanPlugins(pluginDir: string): string[] {
  try {
    // 目录不存在，返回空数组
    if (!fs.existsSync(pluginDir)) {
      return [];
    }
    const files = fs.readdirSync(pluginDir);
    return files
      .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))
      .map((file) => path.join(pluginDir, file));
  } catch (error) {
    // 扫描失败（权限问题等），返回空数组，避免中断应用启动
    return [];
  }
}
