import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { useAppStore } from './store';

/**
 *

```bash
Total cost:            $9.63
Total duration (API):  56m 43.1s
Total duration (wall): 16h 14m 51.1s
Total code changes:    4719 lines added, 93 lines removed
Usage by model:
     claude-3-5-haiku: 12.1k input, 836 output, 0 cache read, 0 cache write
        claude-sonnet: 461 input, 111.6k output, 10.8m cache read, 1.3m cache write
```

```bash
Session ended

📁 Working directory: /Volumes/data/xxx/xx
🤖 Model: iflow/qwen3-coder-plus
🍖 Total tokens used: 24389
🆔 Session ID: 991f4834
✅ Approval mode: autoEdit
📝 Log file: /Users/xxx/991f4834.jsonl
```
*/

export function ExitHint() {
  const { status, cwd, model, messages, sessionId, approvalMode, logFile } =
    useAppStore();

  const tokenUsed = useMemo(() => {
    return messages.reduce((acc, message) => {
      if (message.role === 'assistant') {
        return (
          acc +
          (message.usage?.input_tokens ?? 0) +
          (message.usage?.output_tokens ?? 0)
        );
      } else {
        return acc;
      }
    }, 0);
  }, [messages]);

  if (status !== 'exit') return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray" dimColor>
        ---
      </Text>
      <Text color="gray" bold dimColor>
        Session ended
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">📁 Working directory: {cwd}</Text>
        <Text color="gray">
          🤖 Model: {model ? `${model.provider.id}/${model.model.id}` : 'N/A'}
        </Text>
        <Text color="gray">🍖 Total tokens used: {tokenUsed}</Text>
        <Text color="gray">🆔 Session ID: {sessionId || 'N/A'}</Text>
        <Text color="gray">
          ✅ Approval mode:{' '}
          <Text color={approvalMode === 'yolo' ? 'red' : 'gray'}>
            {approvalMode}
          </Text>
        </Text>
        <Text color="gray">📝 Log file: {logFile}</Text>
      </Box>
    </Box>
  );
}
