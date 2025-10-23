import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import PaginatedSelectInput from '../../ui/PaginatedSelectInput';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

// 引入统一语言配置
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../../constants';

interface LanguageSelectProps {
  onExit: (languageCode: string) => void;
  onSelect: (languageCode: string, languageName: string) => void;
}

const LanguageSelect: React.FC<LanguageSelectProps> = ({
  onExit,
  onSelect,
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const { bridge, cwd } = useAppStore();
  const [selectItems, setSelectItems] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);

  useEffect(() => {
    // 获取当前语言设置
    bridge
      .request('config.get', { cwd, key: 'language' })
      .then((result) => {
        setCurrentLanguage(result.data.value || DEFAULT_LANGUAGE);
      })
      .catch((error) => {
        console.error('Failed to get language config:', error);
        setCurrentLanguage(DEFAULT_LANGUAGE);
      });

    // 构建语言选择项
    const items = Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
      label: `${code}: (${name})`,
      value: code,
    }));
    setSelectItems(items);
  }, [cwd]);

  const initialIndex = useMemo(() => {
    if (!currentLanguage) return 0;
    // 直接使用语言代码查找索引
    return selectItems.findIndex((item) => item.value === currentLanguage);
  }, [selectItems, currentLanguage]);

  useInput((_: string, key) => {
    if (key.escape) {
      onExit(currentLanguage || DEFAULT_LANGUAGE);
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>Select Language</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">
          Current language:{' '}
          <Text bold color="cyan">
            {currentLanguage
              ? SUPPORTED_LANGUAGES[
                  currentLanguage as keyof typeof SUPPORTED_LANGUAGES
                ]
              : 'Unknown'}
          </Text>
        </Text>
      </Box>
      <Box>
        <PaginatedSelectInput
          items={selectItems}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          itemsPerPage={10}
          onSelect={(item) => {
            // 语言设置保存为全局配置，因为语言偏好是用户个人的全局设置
            // 不同于 output-style（项目级），语言选择应该在所有项目中保持一致
            bridge
              .request('config.set', {
                cwd,
                isGlobal: true, // 全局配置
                key: 'language',
                value: item.value, // 存储语言代码而不是名称
              })
              .then(() => {
                onSelect(
                  item.value,
                  SUPPORTED_LANGUAGES[
                    item.value as keyof typeof SUPPORTED_LANGUAGES
                  ],
                );
              })
              .catch((error) => {
                console.error('Failed to set language config:', error);
              });
          }}
        />
      </Box>
    </Box>
  );
};

// 语言切换命令
export const languageCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'language',
  description: 'Switch the language for AI responses',
  async call(onDone) {
    const LanguageComponent = () => {
      return (
        <LanguageSelect
          onExit={(languageCode) => {
            const languageName =
              SUPPORTED_LANGUAGES[
                languageCode as keyof typeof SUPPORTED_LANGUAGES
              ] || 'Unknown';
            onDone(`Kept language as ${languageName} (${languageCode})`);
          }}
          onSelect={(languageCode, languageName) => {
            onDone(
              `Language changed to ${languageName} (${languageCode})\nAll subsequent AI responses will be in ${languageName}.`,
            );
          }}
        />
      );
    };
    return <LanguageComponent />;
  },
};
