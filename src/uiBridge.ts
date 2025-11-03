import { type EventHandler, MessageBus } from './messageBus';
import { BASH_EVENTS } from './constants';
import type { ApprovalCategory, ToolUse } from './tool';
import type { AppStore, BashPromptBackgroundEvent } from './ui/store';

/*
 * 作用：处理前端 UI 相关逻辑，作为 UI 层与后端的通信桥梁
 * 核心功能：
     1. 注册 UI 事件处理器（如 toolApproval 工具审批）
     2. 提供 request/emitEvent/onEvent 方法供 UI 组件调用后端功能
     3. 将后端事件转发给 Zustand 状态管理器更新 UI
 * 关键设计：
     * 简化 UI 组件与后端通信的 API
     * 集中处理用户交互事件（如工具审批确认）
 */

export class UIBridge {
  appStore: AppStore;
  messageBus: MessageBus;
  constructor(opts: { appStore: AppStore }) {
    this.appStore = opts.appStore;
    this.messageBus = new MessageBus();
    new UIHandlerRegistry(this.messageBus, this.appStore);
  }
  request(method: string, params: any, options: { timeout?: number } = {}) {
    return this.messageBus.request(method, params, options);
  }
  emitEvent(event: string, data: any) {
    return this.messageBus.emitEvent(event, data);
  }
  onEvent(event: string, handler: EventHandler) {
    return this.messageBus.onEvent(event, handler);
  }

  async requestMoveToBackground(taskId: string) {
    return this.messageBus.emitEvent(BASH_EVENTS.MOVE_TO_BACKGROUND, {
      taskId,
    });
  }
}

class UIHandlerRegistry {
  private messageBus: MessageBus;
  private appStore: AppStore;
  constructor(messageBus: MessageBus, appStore: AppStore) {
    this.messageBus = messageBus;
    this.appStore = appStore;
    this.registerHandlers();
  }

  private registerHandlers() {
    this.messageBus.registerHandler(
      'toolApproval',
      async ({
        toolUse,
        category,
      }: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => {
        const result = await this.appStore.approveToolUse({
          toolUse,
          category,
        });
        return { approved: result };
      },
    );

    this.messageBus.onEvent(
      BASH_EVENTS.PROMPT_BACKGROUND,
      (data: BashPromptBackgroundEvent) => {
        this.appStore.setBashBackgroundPrompt(data);
      },
    );

    this.messageBus.onEvent(BASH_EVENTS.BACKGROUND_MOVED, () => {
      this.appStore.clearBashBackgroundPrompt();
    });
  }
}
