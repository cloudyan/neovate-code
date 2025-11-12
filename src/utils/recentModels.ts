import { ConfigManager } from '../config';

export class RecentModelsManager {
  private configManager: ConfigManager;

  constructor(cwd: string, productName: string) {
    this.configManager = new ConfigManager(cwd, productName, {});
  }

  /**
   * 获取最近使用的模型列表
   */
  getRecentModels(): string[] {
    const config = this.configManager.globalConfig;
    const recentModels = config.recentModels || [];
    if (Array.isArray(recentModels)) {
      // 确保返回的列表中没有重复项
      return [...new Set(recentModels)];
    }
    return [];
  }

  /**
   * 添加模型到最近使用列表
   */
  addRecentModel(providerId: string, modelId: string): void {
    const config = this.configManager.globalConfig;
    let recentModels = this.getRecentModels();

    // 创建新的模型列表，确保最新使用的模型在最前面
    const modelKey = `${providerId}/${modelId}`;
    // 从列表中移除已存在的相同模型，然后将新模型添加到开头
    const filteredModels = recentModels.filter((model) => model !== modelKey);
    const newRecentModels = [modelKey, ...filteredModels].slice(0, 5); // 限制最近模型数量为5

    // 首先移除旧的 recentModels 值，然后添加新值
    this.configManager.removeConfig(true, 'recentModels');
    this.configManager.addConfig(true, 'recentModels', newRecentModels);
  }

  /**
   * 清空最近使用模型列表
   */
  clearRecentModels(): void {
    this.configManager.removeConfig(true, 'recentModels');
    this.configManager.addConfig(true, 'recentModels', []);
  }
}
