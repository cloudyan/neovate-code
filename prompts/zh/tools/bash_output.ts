// BashOutput工具提示词模板函数

export function createBashOutputPrompt() {
  return `
检索后台 bash 任务的输出。

用法：
- 接受 task_id 参数来标识后台任务
- 返回累积的 stdout 和 stderr 输出
- 显示当前任务状态（运行中/已完成/已终止/失败）
- 使用此工具监控或检查长时间运行的后台任务的输出
- 任务 ID 在命令移至后台时返回
  `;
}
