import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

// 清空聊天历史记录
export const clearCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'clear',
  description: 'Start a new session',
  async call(onDone) {
    return React.createElement(() => {
      const { clear } = useAppStore();

      React.useEffect(() => {
        clear().then(({ sessionId }: any) => {
          onDone(`Messages cleared, new session id: ${sessionId}`);
        });
      }, []);

      return null;
    });
  },
};
