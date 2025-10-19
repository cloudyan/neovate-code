import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

// 退出应用程序
export const exitCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'exit',
  description: 'Exit the application',
  async call() {
    return React.createElement(() => {
      const { setStatus } = useAppStore();

      React.useEffect(() => {
        setStatus('exit');
        setTimeout(() => {
          process.exit(0);
        }, 100);
      }, []);

      return null;
    });
  },
};
