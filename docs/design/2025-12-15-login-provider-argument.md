# 登录提供商参数支持

**日期:** 2025-12-15

## 背景

`/login` 命令当前要求用户在配置 API 密钥之前导航提供商选择 UI。当用户已经知道他们想要配置哪个提供商时，这会增加摩擦。目标是支持直接将提供商名称作为参数传递（例如，`/login iflow`）以跳过选择 UI。

## 讨论

**Q: 当使用 `/login iflow` 时应该发生什么？**
- 决定: 完全跳过选择 UI，直接进入该提供商的登录流程

**Q: 提供商名称匹配应该如何工作？**
- 决定: 仅对提供商 ID 进行精确匹配（例如，`iflow` 匹配 `iflow`，区分大小写）

**Q: 如果提供商 ID 与任何提供商不匹配怎么办？**
- 决定: 显示错误消息并退出（例如，"Provider 'xyz' not found"）

## 方法

通过重用当前的 `handleProviderSelect` 逻辑对现有代码进行最小更改：

1. 在 `createLoginCommand` 中接受 `args` 并作为 `initialProviderId` 属性传递给 `LoginSelect`
2. 在 `LoginSelect` 中，提供商加载后，如果提供了 `initialProviderId`：
   - 查找具有精确 ID 匹配的提供商
   - 如果找到：触发现有的 `handleProviderSelect` 流程
   - 如果未找到：使用错误消息调用 `onExit`
3. 不更改 OAuth 流程、API 密钥输入或 UI 组件

## 架构

**流程:**
```
/login iflow
  → providers.list 加载
  → 查找 id === "iflow" 的提供商
  → 找到? → handleProviderSelect → 现有的 OAuth/API 密钥流程
  → 未找到? → onExit("Provider 'xyz' not found")
```

**代码更改 (login.tsx):**

1. 更新 `LoginSelectProps`:
   - 添加 `initialProviderId?: string`

2. 更新 `LoginSelect` 组件:
   - 接受 `initialProviderId` 属性
   - 在加载提供商的 `useEffect` 中，在 `setProviders` 之后：
     - 检查 `initialProviderId` 是否设置
     - 通过精确 ID 查找匹配的提供商
     - 相应地调用 `handleProviderSelect` 或 `onExit`

3. 更新 `createLoginCommand`:
   - 将 `args` 参数传递给 `LoginSelect` 作为 `initialProviderId`

**范围:** ~15 行代码
