# 日志查看器：用户消息侧边面板

**日期:** 2025-11-13

## 背景

日志命令（`/log`）为会话日志生成一个 HTML 查看器，采用双面板布局。目前，只有助手消息是可点击的，并在右侧面板中显示详细信息（消息 JSON、请求 ID、模型、工具、请求、响应、错误、块）。用户消息不是交互式的。

目标是让用户消息也可以点击，但在侧边面板中只显示"消息 JSON"部分，而不显示助手消息特有的 LLM 请求/响应详细信息。

## 讨论

考虑了三种方法：

1. **条件渲染（最简单）：** 让用户消息可点击，并修改现有的 `renderDetails()` 函数，在没有 `requestId` 时显示最少内容。
2. **分离渲染函数：** 为渲染用户和助手详细信息创建不同的函数。
3. **带类型标志的模板：** 传递消息类型参数并使用模板条件。

**决定：** 选择方法 1，因为它简单且代码改动最少。它重用现有的 `renderDetails()` 函数，通过检查 `requestId` 是否存在来进行条件判断。

## 方案

### 变更内容
1. **CSS：** 在 `.msg.user` 中添加 `cursor: pointer` 以指示可点击性
2. **点击处理程序：** 移除仅允许点击助手消息的限制
3. **renderDetails() 逻辑：** 当 `requestId` 为 `null` 时，只渲染"消息 JSON"部分；否则渲染完整详细信息

### 为什么这有效
- 用户消息没有关联的请求日志，所以 `requestId` 将为 `null`
- 助手消息已具有 `requestId`，所以它们继续显示完整详细信息
- 单个函数处理两种情况，分支最少

## 架构

### CSS 更新
```css
.msg.user { 
  background: #fafafa; 
  cursor: pointer;  /* 新增 */\n}
```

### 点击处理程序变更
**之前：**
```javascript
if (!el.classList.contains('assistant')) return;
```

**之后：**
```javascript
// 移除限制 - 允许用户和助手消息
```

两种消息类型都从 `data-msg-uuid` 提取 `msgId`。助手消息还有 `data-request-id`，而用户消息将有 `requestId = null`。

### renderDetails() 函数
添加条件模板渲染：

```javascript
function renderDetails(requestId) {
  const d = requestId ? requestData[requestId] : null;
  
  if (!requestId) {
    // 用户消息的最小模板
    const html = `
      <div class=\"details\">
        <div><b>消息 JSON:</b></div>
        <pre><code>__MESSAGE__</code></pre>
      </div>
    `;
    const finalHtml = html.replace('__MESSAGE__', pretty(state.lastMessage || null));
    right.innerHTML = finalHtml;
    return;
  }
  
  // 助手消息的完整模板（现有逻辑）
  // ...
}
```

### 边缘情况
1. **没有 msgId 的用户消息：** `state.lastMessage` 将为 `null`，`pretty(null)` 优雅地处理
2. **初始状态：** 占位符文本保持："选择助手消息以查看请求详细信息"（可以更新为"选择消息以查看详细信息"）
3. **状态管理：** 为两种消息类型重用现有 `state.lastMessage`

### 测试
1. 运行 `/log` 命令
2. 点击用户消息 → 验证只出现"消息 JSON"
3. 点击助手消息 → 验证完整详细信息出现
4. 在消息类型之间切换 → 验证面板正确更新
5. 悬停在用户消息上 → 验证光标更改为指针

### 无破坏性变更
- 助手消息像以前一样工作
- 仅添加功能：用户消息变为交互式
- 现有会话日志保持兼容
