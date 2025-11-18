import { Box, Text, useInput } from 'ink';
import React from 'react';
import type { Message } from '../message';
import { isCanceledMessage } from '../message';
import { CANCELED_MESSAGE_TEXT } from '../constants';
import { getMessageText } from '../message';
import { copyToClipboard, isClipboardSupported } from '../utils/clipboard';

interface CopyModalProps {
  messages: (Message & {
    uuid: string;
    parentUuid: string | null;
    timestamp: string;
  })[];
  onSelect: (uuid: string) => void;
  onClose: () => void;
}

export function CopyModal({ messages, onSelect, onClose }: CopyModalProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isCopying, setIsCopying] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);

  // Filter to AI messages only and reverse for chronological order (newest first)
  const aiMessages = messages
    .filter(
      (m) =>
        m.role === 'assistant' &&
        !('hidden' in m && m.hidden) &&
        !isCanceledMessage(m) &&
        !(typeof m.content === 'string' && m.content === CANCELED_MESSAGE_TEXT),
    )
    .reverse();

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      setCopyStatus(null);
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(aiMessages.length - 1, prev + 1));
      setCopyStatus(null);
    } else if (key.return && !isCopying) {
      if (aiMessages[selectedIndex]) {
        handleCopy(aiMessages[selectedIndex].uuid!);
      }
    }
  });

  const handleCopy = async (uuid: string) => {
    if (!isClipboardSupported()) {
      setCopyStatus('剪贴板在此平台上不受支持');
      return;
    }

    setIsCopying(true);
    setCopyStatus(null);

    try {
      const message = messages.find((m) => m.uuid === uuid);
      if (!message) {
        setCopyStatus('未找到消息');
        setIsCopying(false);
        return;
      }

      const content = getMessageText(message);
      if (!content.trim()) {
        setCopyStatus('消息内容为空');
        setIsCopying(false);
        return;
      }

      await copyToClipboard(content);
      setCopyStatus('已复制到剪贴板');
      setTimeout(() => {
        onSelect(uuid);
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCopyStatus(`复制失败: ${message}`);
    } finally {
      setIsCopying(false);
    }
  };

  const getMessagePreview = (message: Message): string => {
    let text = '';
    if (typeof message.content === 'string') {
      text = message.content;
    } else if (Array.isArray(message.content)) {
      const textParts = message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text);
      text = textParts.join(' ');
    }
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
  };

  const getTimestamp = (message: Message & { timestamp: string }): string => {
    if (!message.timestamp) return '';
    const date = new Date(message.timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (aiMessages.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        padding={1}
        width="100%"
      >
        <Box marginBottom={1}>
          <Text bold color="cyan">
            复制 AI 响应
          </Text>
        </Box>
        <Box>
          <Text color="gray">没有找到可复制的 AI 响应</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>按 Esc 关闭</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          复制 AI 响应
        </Text>
      </Box>
      <Box flexDirection="column">
        {aiMessages.map((message, index) => {
          const isSelected = index === selectedIndex;
          const preview = getMessagePreview(message);
          const timestamp = getTimestamp(message);

          return (
            <Box key={message.uuid} marginBottom={0}>
              <Text
                color={isSelected ? 'cyan' : 'white'}
                bold={isSelected}
                backgroundColor={isSelected ? 'blue' : undefined}
              >
                {isSelected ? '> ' : '  '}
                {timestamp} | {preview}
              </Text>
            </Box>
          );
        })}
      </Box>
      {copyStatus && (
        <Box marginTop={1}>
          <Text color={copyStatus.includes('失败') ? 'red' : 'green'}>
            {copyStatus}
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          {isCopying ? '正在复制...' : '使用 ↑/↓ 导航, Enter 复制, Esc 取消'}
        </Text>
      </Box>
    </Box>
  );
}
