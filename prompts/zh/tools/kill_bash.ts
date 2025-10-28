// KillBash工具提示词模板函数

export function createKillBashPrompt() {
  return `
终止正在运行的后台 bash 任务。

用法：
- 接受 task_id 参数来标识要终止的任务
- 首先发送 SIGTERM，然后在需要时发送 SIGKILL（类 Unix 系统）
- 返回成功或失败状态
- 当您需要停止长时间运行的后台任务时使用此工具
  `;
}
