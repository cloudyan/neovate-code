import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

export const copyCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'copy',
  description: '选择并复制 AI 响应到剪贴板',
  async call(onDone) {
    return React.createElement(() => {
      const { showCopyModal } = useAppStore();

      React.useEffect(() => {
        // 显示复制选择模态框
        showCopyModal();
        // 命令执行完成，不添加任何消息到历史记录
        setTimeout(() => onDone(null), 0);
      }, [showCopyModal]);

      return null;
    });
  },
};
