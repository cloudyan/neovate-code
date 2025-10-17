import { Box, Text } from 'ink';
import React from 'react';
import { SPACING, UI_COLORS } from './constants';
import { useAppStore } from './store';

export function ModeIndicator() {
  const { planMode, bashMode, planResult, slashCommandJSX } = useAppStore();
  if (slashCommandJSX) {
    return null;
  }
  if (planResult) {
    return null;
  }

  // prompt 模式
  //   默认模式 default mode
  //   自动接受编辑 accepting edits
  //   YOLO模式 YOLO mode
  //   计划模式 plan mode
  // shell 模式已启用 (esc 禁用) shell mode enabled (esc to disable)
  // memory 模式已启用

  const text = planMode ? (
    <>
      <Text color={UI_COLORS.MODE_INDICATOR_TEXT}>plan mode</Text>
      <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
        {' '}
        (shift + tab to toggle)
      </Text>
    </>
  ) : bashMode ? (
    <>
      <Text color={UI_COLORS.MODE_INDICATOR_TEXT}>bash mode</Text>
      <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
        {' '}
        (esc to disable)
      </Text>
    </>
  ) : (
    <Text> </Text>
  );
  return (
    <Box
      flexDirection="row"
      gap={1}
      marginTop={SPACING.MODE_INDICATOR_MARGIN_TOP}
    >
      <Box flexGrow={1} />
      <Box>{text}</Box>
    </Box>
  );
}
