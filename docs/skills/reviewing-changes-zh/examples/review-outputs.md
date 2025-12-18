# 审查输出示例

展示不同变更类型适当深度、语调和格式的良好结构代码审查。

---

## 快速格式参考

### 内联评论格式（必需）

**必须使用 `<details>` 标签。** 仅严重性 + 描述可见；所有其他内容折叠。

```
[emoji] **[严重性]**: [一行问题描述]

<details>
<summary>详细信息和修复</summary>

[代码示例或具体修复]

[理由解释为何]

参考: [如适用的文档链接]
</details>
```

**严重性级别：**
- ⚠️ **关键** - 阻止，必须修复
- 📋 **重要** - 应该修复
- 💡 **建议** - 好有更好
- ❓ **问题** - 寻求澄清

### 摘要评论格式

**所有 PR 的必需格式：**
```
**总体评估：** 批准 / 请求变更

**关键问题** (如果有的话)：
- [带文件：行号的问题]

请参阅内联评论了解详情。
```

所有 PR 使用相同的最小格式 - 无大小或复杂性的例外。摘要必须最多 5-10 行。

---

## 示例 1：干净 PR（无问题）

**上下文**: 将共享代码移动到公共模块，完整迁移，所有模式遵循

**审查评论：**
```markdown
**总体评估：** 批准

将 ExitManager 移至 :ui 模块的干净重构，消除了应用间的重复。
```

**为什么这样做：**
- 立即批准可见（2-3 行）
- 一句话确认工作
- 无不必要的部分或详细赞扬
- 作者获得快速反馈并可以继续

---

## 示例 2：带有破坏性更改的依赖更新

**上下文**: 需要代码迁移的主要版本更新

**摘要评论：**
```markdown
**总体评估：** 请求变更

**关键问题：**
- 需要 Retrofit 3.0 破坏性更改的 API 迁移 (network/api/BitwardenApiService.kt:34)

请参阅内联评论了解迁移详细信息。
```

**内联评论 1** (在 `network/api/BitwardenApiService.kt:34` 上)：
```markdown
⚠️ **关键**: Retrofit 3.0 需要 API 迁移

<details>
<summary>详细信息和修复</summary>

Retrofit 3.0 移除了 `Call<T>` 返回类型。此文件中的所有 12 个 API 方法需要迁移：

```kotlin
// 当前（Retrofit 3.0 中已弃用）
@GET("api/accounts/profile")
fun getProfile(): Call<ProfileResponse>

// 必须迁移到
@GET("api/accounts/profile")
suspend fun getProfile(): Response<ProfileResponse>
```

破坏性 API 更改影响：
- BitwardenApiService 中的 12 个方法
- VaultApiService 中的 8 个方法
- 使用 enqueue/execute 的所有调用点
- 测试工具

考虑为此迁移创建单独的 PR，鉴于范围。

参考: [Retrofit 3.0 迁移指南](https://square.github.io/retrofit/changelogs/changelog-3.x/)
</details>
```

**关键特性：**
- 最小摘要（2-3 行）
- 完整详细信息在折叠的内联评论中
- 特定文件：行号引用
- <details> 中的代码示例
- 迁移指导和范围评估

---

## 示例 3：带有关键问题的功能添加

**上下文**: 实现 vault 访问的 PIN 解锁

**摘要评论：**
```markdown
**总体评估：** 请求变更

**关键问题：**
- 暴露违反 MVVM 的可变状态 (UnlockViewModel.kt:78)
- PIN 未加密存储 - 安全问题 (UnlockRepository.kt:145)

请参阅内联评论了解所有问题和建议。
```

**内联评论 1** (在 `app/vault/unlock/UnlockViewModel.kt:78` 上)：
```markdown
⚠️ **关键**: 暴露可变状态

<details>
<summary>详细信息和修复</summary>

将 `MutableStateFlow<State>` 更改为 `StateFlow<State>`：

```kotlin
// 当前（有问题的）
val unlockState: MutableStateFlow<UnlockState>

// 应该是
private val _unlockState = MutableStateFlow<UnlockState>()
val unlockState: StateFlow<UnlockState> = _unlockState.asStateFlow()
```

暴露 MutableStateFlow 允许外部变异，违反 MVVM 单向数据流。

参考: docs/ARCHITECTURE.md#mvvm-pattern
</details>
```

**内联评论 2** (在 `data/vault/UnlockRepository.kt:145` 上)：
```markdown
⚠️ **关键**: PIN 未加密存储 - 安全问题

<details>
<summary>详细信息和修复</summary>

在明文 SharedPreferences 中存储 PIN 使其暴露于备份系统和已 root 设备。

```kotlin
// 当前（关键安全问题）
sharedPreferences.edit {
    putString(KEY_PIN, pin)
}

// 必须使用 Android Keystore 加密
suspend fun storePin(pin: String): Result<Unit> = runCatching {
    val encrypted = keystoreManager.encrypt(pin.toByteArray())
    encryptedPrefs.putBytes(KEY_PIN, encrypted)
}
```

使用 Android Keystore 加密或 EncryptedSharedPreferences，按安全架构。

参考: docs/ARCHITECTURE.md#security
</details>
```

**内联评论 3** (在 `app/vault/unlock/UnlockViewModel.kt:92` 上)：
```markdown
📋 **重要**: 缺少错误处理测试

<details>
<summary>详细信息和修复</summary>

添加测试以防止错误处理更改时的回归：

```kotlin
@Test
fun `when incorrect PIN entered then returns error state`() = runTest {
    val viewModel = UnlockViewModel(mockRepository)
    coEvery { mockRepository.validatePin("1234") }
        returns Result.failure(InvalidPinException())

    viewModel.onPinEntered("1234")

    assertEquals(UnlockState.Error("Invalid PIN"), viewModel.state.value)
}
```

确保错误流在重构中保持健壮。
</details>
```

**内联评论 4** (在 `app/vault/unlock/UnlockViewModel.kt:105` 上)：
```markdown
💡 **建议**: 考虑对 PIN 尝试进行速率限制

<details>
<summary>详细信息</summary>

当前允许无限尝试，这可能启用暴力攻击。

```kotlin
private var attemptCount = 0
private var lockoutUntil: Instant? = null

fun onPinEntered(pin: String) {
    if (isLockedOut()) {
        _state.value = UnlockState.LockedOut(lockoutUntil!!)
        return
    }
    // ... 验证 PIN ...
    if (invalid) {
        attemptCount++
        if (attemptCount >= MAX_ATTEMPTS) {
            lockoutUntil = clock.millis() + 15.minutes
        }
    }
}
```

将添加针对暴力攻击的安全层。考虑与安全团队讨论威胁模型。
</details>
```

**内联评论 5** (在 `app/vault/unlock/UnlockScreen.kt:134` 上)：
```markdown
❓ **问题**: 我们可以使用 BitwardenTextField 吗？

<details>
<summary>详细信息</summary>

此自定义 PIN 输入字段看起来类似于 `ui/components/BitwardenTextField.kt:67`。

使用现有组件是否能保持一致性并减少自定义 UI 代码？
</details>
```

**关键特性：**
- 最小摘要（3-4 行）仅关键问题
- 每个问题获得带 `<details>` 标签的单独内联评论
- 演示多种严重性级别（关键、重要、建议、问题）
- 指示性修复和协作性问题的混合
- <details> 中折叠的代码示例
- 无"良好实践"或"行动项"部分

---

## ❌ 要避免的反模式

### 问题：带多个部分的冗长摘要

**不该做的：**
```markdown
### 审查完成 ✅

## 摘要
[PR 做什么的详细描述]

### 优势 👍
1. **优秀文档** - KDoc 注释是全面的
2. **适当的故障关闭设计** - 安全默认为拒绝
3. **深度防御** - 多层验证
[7 个带详细信息的项目]

### 关键问题 ⚠️
- 安全关键代码缺少测试覆盖（带完整详细信息）
- [更多问题带完整解释]

### 推荐 🎨
- [多个推荐]

### 测试覆盖状态 📊
- [分析]

### 架构合规 ✅
- [分析]

## 推荐
**有条件批准** 带后续...
```

**为什么这是错误的：**
- 800+ 代币用于摘要评论
- 多个部分（优势、推荐、测试覆盖、架构）
- 详细阐述积极方面（"优秀文档..."）
- 重复关键问题（摘要有详细信息 + 内联评论有相同详细信息）
- 在 PR 对话中创建视觉混乱

**正确方法：**
```markdown
**总体评估：** 请求变更

**关键问题：**
- 安全关键代码缺少测试覆盖 (PasswordManagerSignatureVerifierImpl.kt:47)

请参阅内联评论了解详情。
```

**关键差异：**
- 3-5 行 vs 800+ 代币
- 结论 + 仅关键问题
- 所有详细信息属于内联评论
- 无积极评论部分
- 规模随 PR 复杂性，而非分析彻底性

### 问题：仅赞扬的内联评论

**不该做的：**

在 `AuthenticatorBridgeManagerImpl.kt:73` 上创建内联评论：
```markdown
👍 **签名验证的优秀集成**

签名验证在连接流中正确集成：
- 在初始化期间检查（第 73 行）
- 在绑定前检查（第 134 行）
- 确保仅验证应用可以连接

这是故障安全安全的正确方法。
```

**为什么这是错误的：**
- 整个评论是积极反馈，无可操作问题
- 在 PR 对话中占用空间
- 转移对实际问题的注意力
- 违反"专注于可操作反馈"原则

**正确方法：**
- 根本不要创建此评论
- 保留内联评论专用于需要关注的问题

### 问题：缺少 `<details>` 标签

**不该做的：**

```markdown
⚠️ **关键**: 安全关键代码缺少测试覆盖

`@OmitFromCoverage` 注解排除此整个类的测试覆盖。

**问题：**
1. 无验证证书哈希是否匹配实际 Bitwarden 证书
2. 无边缘情况下故障关闭行为的验证
3. 无多个签名者拒绝逻辑的测试
4. 证书哈希拼写错误直到生产才会被发现

**推荐：**
用适当单元测试替换 `@OmitFromCoverage`。

示例测试结构：
[长代码块]

安全关键代码应具有最高测试覆盖，而不是被排除。
```

**为什么这是错误的：**
- 所有内容立即可见（代码示例、问题列表、理由）
- 在 PR 对话中创建视觉混乱
- 使快速扫描多个问题困难

**正确方法：**
```markdown
⚠️ **关键**: 安全关键代码缺少测试覆盖

<details>
<summary>详细信息和修复</summary>

`@OmitFromCoverage` 注解排除此整个类的测试覆盖。

**问题：**
1. 无验证证书哈希是否匹配实际 Bitwarden 证书
2. 无边缘情况下故障关闭行为的验证
3. 无多个签名者拒绝逻辑的测试
4. 证书哈希拼写错误直到生产才会被发现

**推荐：**
用适当单元测试替换 `@OmitFromCoverage`。

示例测试结构：
[代码块]

安全关键代码应具有最高测试覆盖，而不是被排除。
</details>
```

**关键差异：** 仅严重性 + 一行描述可见。所有详细信息折叠。

---

## 摘要

**始终使用：**
- 最小摘要（结论 + 关键问题）
- 带 `<details>` 标签的单独内联评论
- 混合 emoji + 文本严重性前缀
- 仅专注于可操作反馈

**永远不要使用：**
- 多个摘要部分（优势、推荐等）
- 仅赞扬的内联评论
- 摘要和内联评论之间的重复
- 摘要中的冗长分析（属于内联评论）
