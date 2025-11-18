import React from 'react';
import { useAppStore } from '../../ui/store';
import { getMessageText } from '../../message';
import { copyToClipboard, isClipboardSupported } from '../../utils/clipboard';
import type { LocalJSXCommand } from '../types';

export const copyCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'copy',
  description: 'Copy the last AI response to clipboard',
  async call(onDone) {
    return React.createElement(() => {
      const { messages } = useAppStore();
      const [isProcessing, setIsProcessing] = React.useState(true);

      React.useEffect(() => {
        if (!isProcessing) return;

        let isCancelled = false;

        const processCopy = async () => {
          try {
            // 检查剪贴板支持
            if (!isClipboardSupported()) {
              if (!isCancelled) {
                setIsProcessing(false);
                setTimeout(
                  () => onDone('Clipboard not supported on this platform'),
                  0,
                );
              }
              return;
            }

            // 找到最后一条AI消息
            const lastAiMessage = messages
              .filter((msg) => msg.role === 'assistant')
              .pop();

            if (!lastAiMessage) {
              if (!isCancelled) {
                setIsProcessing(false);
                setTimeout(() => onDone('No AI response found in history'), 0);
              }
              return;
            }

            // 提取消息内容
            const content = getMessageText(lastAiMessage);

            if (!content.trim()) {
              if (!isCancelled) {
                setIsProcessing(false);
                setTimeout(
                  () => onDone('Last AI response contains no text to copy'),
                  0,
                );
              }
              return;
            }

            // 异步复制到剪贴板
            await copyToClipboard(content);
            if (!isCancelled) {
              setIsProcessing(false);
              setTimeout(
                () => onDone('Last AI response copied to clipboard'),
                0,
              );
            }
          } catch (error) {
            if (!isCancelled) {
              setIsProcessing(false);
              const message =
                error instanceof Error ? error.message : String(error);
              setTimeout(
                () => onDone(`Failed to copy to clipboard: ${message}`),
                0,
              );
            }
          }
        };

        processCopy();

        return () => {
          isCancelled = true;
        };
      }, [messages, isProcessing]);

      return null;
    });
  },
};
