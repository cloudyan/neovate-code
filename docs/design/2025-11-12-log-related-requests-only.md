# Log 命令: 仅加载相关请求

**日期:** 2025-11-12
**状态:** 已批准

## 问题

目前,`loadAllRequestLogs` 从 requests 目录加载所有 `.jsonl` 文件,无论它们是否与当前会话相关。这是低效的,可能包含不相关的请求数据。

## 关键洞察

助手消息 UUID 直接对应于请求文件名(不含 `.jsonl` 扩展名)。我们不需要基于时间戳的匹配 - 我们有直接映射。

## 解决方案

### 架构变更

**函数签名:**
```typescript
// 之前
loadAllRequestLogs(requestsDir: string)

// 之后
loadAllRequestLogs(requestsDir: string, messages: NormalizedMessage[])
```

### 核心逻辑

1. 预先从 messages 数组中提取所有助手消息 UUID
2. 创建一个 Set 用于 O(1) 查找: `const assistantUuids = new Set(messages.filter(m => m.role === 'assistant').map(m => m.uuid))`
3. 过滤文件,仅处理那些 `path.basename(file, '.jsonl')` 存在于 `assistantUuids` 中的文件
4. 返回与之前相同的结构,但使用过滤后的结果

### 代码移除

**删除 `findNearestRequestForAssistant` 函数**(第 115-138 行):
- 直接 UUID 映射后不再需要
- 移除基于时间戳的匹配

**简化 `buildHtml` 函数:**
- 移除基于时间戳的匹配循环(约第 332-340 行)
- 替换为直接映射: `assistantMap[m.uuid] = m.uuid`
- `requestData` 对象将仅包含匹配的请求

### 调用点更新

**在 `generateHtmlForSession` 中:**
```typescript
// 之前
const requestLogs = loadAllRequestLogs(requestsDir);

// 之后
const requestLogs = loadAllRequestLogs(requestsDir, messages);
```

## 边界情况

1. **没有匹配请求文件的助手消息:**
   - UUID 不会匹配任何文件
   - 不加载请求数据
   - HTML 显示 "N/A"(现有行为)

2. **空消息数组:**
   - 空 `assistantUuids` Set
   - 不加载请求文件(返回空数组)
   - HTML 渲染但没有可用的请求详情

3. **缺少 requests 目录:**
   - 现有检查处理此情况: `if (!fs.existsSync(requestsDir)) return []`

4. **格式错误的 .jsonl 文件:**
   - `readJsonlFile` 中的现有 try-catch 处理此情况

## 优势

- **性能:** 仅读取必要的请求文件
- **简洁性:** 移除复杂的时间戳匹配逻辑
- **正确性:** 直接 UUID 映射比时间戳关联更可靠
- **可维护性:** 更清晰、更易理解的代码

## 测试方法

- 测试包含助手消息且有匹配请求文件的会话
- 测试某些助手 UUID 没有对应文件的会话
- 测试没有助手消息的会话
- 验证 HTML 正确渲染,请求详情仅对匹配的消息显示

## 实现步骤

1. 更新 `loadAllRequestLogs` 签名并添加过滤逻辑
2. 简化 `buildHtml` 以使用直接 UUID 映射
3. 移除 `findNearestRequestForAssistant` 函数
4. 更新 `generateHtmlForSession` 中的调用点
5. 使用各种会话场景进行测试
