# 通用反馈收集模块设计方案

## 概述

设计一个独立的反馈收集模块，可嵌入到任何 AI 回答后，允许用户点击按钮上报反馈。类似 Claude Code 的反馈收集机制。

## 核心架构

### 组件设计

1. **FeedbackCollector** - 反馈收集器
   - 独立模块，可嵌入到任何 AI 回答后
   - 提供统一的反馈收集接口

2. **FeedbackUI** - 反馈界面组件
   - 显示反馈按钮（赞/踩）
   - 提供详细反馈输入框
   - 支持自定义反馈选项

3. **FeedbackManager** - 反馈管理器
   - 处理用户反馈数据
   - 上报反馈到服务器或本地存储
   - 管理反馈状态

4. **FeedbackStorage** - 反馈存储层
   - 本地存储：SQLite 数据库
   - 远程存储：可配置的上报接口

## 集成方式

### 1. AI 回答后嵌入
在任何 AI 回答后添加：
```jsx
<FeedbackCollector context={aiResponseContext} />
```

### 2. 工具调用后嵌入
在工具执行完成后添加：
```jsx
<FeedbackCollector context={toolExecutionContext} />
```

### 3. 命令执行后嵌入
在命令执行结果后添加：
```jsx
<FeedbackCollector context={commandContext} />
```

## 数据结构

### feedbacks 表
- id: 反馈ID
- context_type: 上下文类型（AI回答/工具调用/命令执行等）
- context_id: 上下文ID（关联具体操作）
- user_choice: 用户选择（赞/踩/无偏好）
- rating: 评分（1-5）
- comment: 用户评论
- timestamp: 反馈时间
- metadata: 元数据（JSON格式，存储额外信息）

## 用户界面

### 基础反馈按钮
- 👍 赞按钮
- 👎 踩按钮
- 点击后展开详细反馈表单

### 详细反馈表单
- 评分滑块（1-5星）
- 文本输入框（用户评论）
- 提交按钮
- 取消按钮

## 上报机制

### 本地存储
- 反馈数据存储在本地 SQLite 数据库
- 支持批量上报

### 远程上报
- 可配置的上报接口
- 支持异步上报
- 网络失败时缓存到本地

## 扩展机制

### 自定义反馈类型
支持定义不同场景下的反馈类型：
- 代码质量反馈
- 安全性反馈
- 性能反馈
- 易用性反馈

### 元数据收集
自动收集上下文信息：
- 操作类型
- 时间戳
- 用户ID
- 模型信息
- 版本信息

## 集成示例

### 在 AI 回答后添加反馈收集
```jsx
<MessageWrapper>
  <AssistantMessage content={aiResponse} />
  <FeedbackCollector 
    context={{
      type: 'ai_response',
      id: responseId,
      metadata: {
        model: 'gpt-4',
        prompt: truncatedPrompt
      }
    }} 
  />
</MessageWrapper>
```

### 在工具调用后添加反馈收集
```jsx
<ToolRender>
  <ToolOutput content={toolResult} />
  <FeedbackCollector 
    context={{
      type: 'tool_execution',
      id: toolExecutionId,
      metadata: {
        toolName: 'bash',
        command: truncatedCommand
      }
    }} 
  />
</ToolRender>
```
