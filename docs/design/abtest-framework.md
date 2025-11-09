# 通用 AB 测试框架设计方案

## 概述

本方案设计一个通用的 AB 测试框架，可嵌入到任何操作流程中。框架支持同时执行两个不同版本的操作，收集用户反馈以评估效果。

## 核心架构

### 组件设计

1. **ABTestFramework** - 通用 AB 测试引擎
   - 管理测试流程和配置
   - 协调各组件工作

2. **ABTestInterceptor** - 操作拦截器
   - 识别需要 AB 测试的操作
   - 拦截并启动测试流程

3. **DualExecutor** - 双版本执行器
   - 支持并行或串行执行两个版本
   - 处理执行结果

4. **ResultAggregator** - 结果聚合器
   - 统一处理不同操作的结果
   - 格式化展示给用户

5. **FeedbackManager** - 反馈管理器
   - 收集和处理用户选择
   - 上报反馈数据

6. **SQLiteStorage** - 数据存储层
   - 存储测试配置、结果和反馈
   - 提供查询接口

## 可嵌入场景

- 斜杠命令：/review, /spec, /abtest 等
- 工具调用：bash, edit, read 等
- AI 决策流程：代码生成、修复、审查等
- 模型选择：不同模型的输出对比

## 数据流

```
任何操作 
  → 检查是否需要 AB 测试 
  → 执行两个版本 
  → 结果合并展示 
  → 用户选择 
  → 反馈记录
```

## 数据库设计

### ab_tests 表
- id: 测试会话ID
- operation_type: 操作类型（命令/工具/AI决策等）
- version_a_config: A版本配置
- version_b_config: B版本配置
- created_at: 创建时间

### results 表
- id: 结果ID
- test_id: 关联的测试ID
- version: 版本标识（A/B）
- result_data: 结果数据（JSON格式）
- execution_time: 执行耗时

### feedbacks 表
- id: 反馈ID
- test_id: 关联的测试ID
- user_choice: 用户选择（A/B/无偏好）
- rating: 评分（1-5）
- comment: 用户评论
- timestamp: 反馈时间

## 扩展机制

通过配置文件定义哪些操作需要 AB 测试，支持动态添加新的 AB 测试场景。
