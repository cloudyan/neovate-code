import { Box, Text } from 'ink';
import React from 'react';
import { SPACING, UI_COLORS } from './constants';
import { useAppStore } from './store';

export function ModeIndicator() {
  const { planMode, brainstormMode, planResult, slashCommandJSX, mode } =
    useAppStore();
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

  function getModeText() {
    if (mode === 'bash' || mode === 'memory') {
      const color = `MODE_INDICATOR_TEXT_${mode.toUpperCase()}` as
        | 'MODE_INDICATOR_TEXT_BASH'
        | 'MODE_INDICATOR_TEXT_MEMORY';
      return (
        <>
          <Text color={UI_COLORS[color]}>{mode} mode</Text>
          <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
            {' '}
            (esc to disable)
          </Text>
        </>
      );
    }

    if (mode === 'prompt') {
      if (planMode) {
        return (
          <>
            <Text color={UI_COLORS.MODE_INDICATOR_TEXT}>plan mode</Text>
            <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
              {' '}
              (shift + tab to toggle)
            </Text>
          </>
        );
      }
      if (brainstormMode) {
        return (
          <>
            <Text color={UI_COLORS.MODE_INDICATOR_TEXT}>
              🧠 brainstorm mode
            </Text>
            <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
              {' '}
              (shift + tab to toggle)
            </Text>
          </>
        );
      }
    }

    return <Text> </Text>;
  }

  return (
    <Box
      flexDirection="row"
      gap={1}
      marginTop={SPACING.MODE_INDICATOR_MARGIN_TOP}
    >
      <Box flexGrow={1} />
      <Box>{getModeText()}</Box>
    </Box>
  );
}
