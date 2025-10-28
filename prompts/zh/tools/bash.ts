// Bash工具提示词模板函数

import { TOOL_NAMES } from '@/constants';
import { BANNED_COMMANDS } from '@/tools/bash';

export function createBashPrompt() {
  return `
运行终端命令的工具，确保适当的处理和安全措施。

后台执行：
- 设置 run_in_background=true 强制后台执行
- 后台任务返回一个 task_id，可与 \`\${TOOL_NAMES.BASH_OUTPUT}\` 和 \`\${TOOL_NAMES.KILL_BASH}\` 工具一起使用
- 移至后台时显示初始输出

使用此工具前，请遵循以下步骤：
- 验证命令是否属于禁止命令：\${BANNED_COMMANDS.join(', ')}.
- 始终用双引号引用包含空格的文件路径（例如，cd "path with spaces/file.txt"）
- 捕获命令的输出。

注意事项：
- command 参数是必需的。
- 您可以指定可选的超时时间（毫秒）（最多 600000ms / 10 分钟）。如果未指定，命令将在 30 分钟后超时。
- 非常重要：您必须避免使用 find 和 grep 等搜索命令。请使用 grep 和 glob 工具进行搜索。您必须避免使用 cat、head、tail 和 ls 等读取工具，请使用 read 和 ls 工具读取文件。
- 如果您仍然需要运行 grep，请停止。请始终优先使用所有用户都预装的 ripgrep（rg）。
- 发出多个命令时，请使用 ';' 或 '&&' 运算符分隔它们。不要使用换行符（换行符在引用字符串中是可以的）。
- 尝试在整个会话中保持当前工作目录，通过使用绝对路径并避免使用 cd。如果用户明确要求，您可以使用 cd。
- 不要添加 <command> 包装器到命令中。

<good-example>
pytest /foo/bar/tests
</good-example>
<bad-example>
cd /foo/bar && pytest tests
</bad-example>
<bad-example>
<command>pytest /foo/bar/tests</command>
</bad-example>
  `;
}
