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

  // > 对话模式（默认）
  //     YOLO模式 YOLO mode
  //     计划模式 plan mode（按 Shift + Tab 切换）
  //     默认模式 default mode (shift + tab to cycle)
  //     自动接受编辑 accepting edits
  //     / 斜杠模式 slash mode
  //     $ agents 模式（类似于斜杠模式）
  // ! Bash 模式已启用 (按 Esc 键退出) bash mode enabled (esc to disable)
  // # memory 记忆模式已启用

  // ? for shortcuts
  // ! for bash mode       double tap esc to clear input      ctrl + _ to undo
  // / for commands        shift + tab to auto-accept edits   ctrl + z to suspend
  // @ for file paths      ctrl + o for verbose output        ctrl + v to paste images
  // # to memorize         ctrl + t to show todos
  //                       tab to toggle thinking
  //                       backslash (\) + return (⏎) for
  //                       newline

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
