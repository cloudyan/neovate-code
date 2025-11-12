import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecentModelsManager } from './recentModels';

// 直接测试 RecentModelsManager 的方法，而不模拟 ConfigManager
describe('RecentModelsManager', () => {
  it('should deduplicate models correctly when getting recent models', () => {
    // 创建一个模拟的 RecentModelsManager 实例
    const manager: any = new RecentModelsManager('/test', 'test');

    // 模拟 configManager 的行为
    manager.configManager = {
      globalConfig: {
        recentModels: [
          'provider1/model1',
          'provider2/model2',
          'provider1/model1', // duplicate
          'provider3/model3',
          'provider2/model2', // duplicate
        ],
      },
    };

    // 调用方法
    const result = manager.getRecentModels();

    // 验证结果
    expect(result).toEqual([
      'provider1/model1',
      'provider2/model2',
      'provider3/model3',
    ]);
  });

  it('should move existing model to the front and limit to 5 items', () => {
    // 创建一个模拟的 RecentModelsManager 实例
    const manager: any = new RecentModelsManager('/test', 'test');

    // 模拟 configManager 的行为
    const mockGlobalConfig = {
      recentModels: [
        'provider1/model1',
        'provider2/model2',
        'provider3/model3',
        'provider4/model4',
        'provider5/model5',
      ],
    };

    manager.configManager = {
      globalConfig: mockGlobalConfig,
      addConfig: vi.fn((global: boolean, key: string, values: string[]) => {
        if (key === 'recentModels') {
          mockGlobalConfig.recentModels = values;
        }
      }),
      removeConfig: vi.fn(),
    };

    // 调用方法
    manager.addRecentModel('provider1', 'model1');

    // 验证结果
    expect(manager.configManager.addConfig).toHaveBeenCalledWith(
      true,
      'recentModels',
      [
        'provider1/model1',
        'provider2/model2',
        'provider3/model3',
        'provider4/model4',
        'provider5/model5',
      ],
    );
  });
});
