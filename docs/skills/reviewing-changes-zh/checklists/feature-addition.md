# 功能添加审查检查清单

## 多次通过策略

### 第一次通过：高层评估

<thinking>
在深入细节之前：
1. 这个功能应该做什么？
2. 它如何适应现有架构？
3. 有什么安全影响？
4. 范围是什么？（涉及的文件，受影响的模块）
5. 最高风险领域是什么？
</thinking>

**1. 了解功能：**
- 阅读 PR 描述 - 这解决了什么问题？
- 识别面向用户的变化 vs 内部变化
- 注意任何安全影响（认证、加密、数据处理）

**2. 扫描文件结构：**
- 哪些模块受影响？（app、data、network、ui、core？）
- 文件是否按模块结构正确组织？
- 是否引入了新的公共 API？

**3. 初始风险评估：**
- 这是否涉及敏感数据或安全关键路径？
- 这是否影响现有功能或仅添加新功能？
- 是否有明显的编译或空安全问题？

### 第二次通过：架构深度探究

<thinking>
验证架构完整性：
1. 这是否遵循 MVVM + UDF 模式？
2. Hilt DI 是否正确使用？
3. 状态管理是否正确（StateFlow、不可变性）？
4. 模块是否正确组织？
5. 错误处理是否健壮（Result 类型）？
</thinking>

**4. MVVM + UDF 模式合规性：**
- ViewModels 是否正确结构化？
- 状态管理是否使用 StateFlow？
- 业务逻辑是否在正确层？

**5. 依赖注入：**
- Hilt DI 是否正确使用？
- 依赖是否注入，而不是手动实例化？
- 是否应用了适当的范围？

**6. 模块组织：**
- 代码是否放置在正确模块中？
- 是否引入了循环依赖？
- 是否正确分离关注点？

**7. 错误处理：**
- 使用 Result 类型，而不是基于异常的处理？
- 错误是否正确地在层间传播？

### 第三次通过：细节和质量

<thinking>
检查质量和完整性：
1. 代码质量是否高？（空安全、文档、命名）
2. 测试是否全面？（单元 + 集成）
3. 是否有未覆盖的边缘情况？
4. 文档是否清晰？
5. 是否有任何代码异味或反模式？
</thinking>

**8. 测试：**
- ViewModels 和仓库的单元测试？
- 边缘情况和错误场景的测试覆盖？
- 测试验证行为，而不是实现？

**9. 代码质量：**
- 空安全是否正确处理？
- 公共 API 是否有 KDoc 文档？
- 命名是否遵循项目约定？

**10. 安全性：**
- 敏感数据是否正确加密？
- 认证/授权是否正确处理？
- 零知识架构是否保持？

## 架构审查

### MVVM 模式合规性

阅读 `reference/architectural-patterns.md` 获取详细模式。

**ViewModels 必须：**
- 使用 `@HiltViewModel` 注解
- 使用 `@Inject constructor`
- 公开 `StateFlow<T>`，而不是 `MutableStateFlow<T>`
- 将业务逻辑委托给 Repository/Manager
- 避免直接 Android 框架依赖（除了 ViewModel、SavedStateHandle）

**常见违规：**
```kotlin
// ❌ 坏 - 暴露可变状态
class FeatureViewModel @Inject constructor() : ViewModel() {
    val state: MutableStateFlow<State> = MutableStateFlow(State.Initial)
}

// ✅ 好 - 暴露不可变状态
class FeatureViewModel @Inject constructor() : ViewModel() {
    private val _state = MutableStateFlow<State>(State.Initial)
    val state: StateFlow<State> = _state.asStateFlow()
}

// ❌ 坏 - ViewModel 中的业务逻辑
fun onSubmit() {
    val encrypted = encryptionManager.encrypt(password) // 应该在 Repository 中
    _state.value = State.Success
}

// ✅ 好 - Repository 中的业务逻辑，状态通过内部事件更新
fun onSubmit() {
    viewModelScope.launch {
        // 异步操作的结果被捕获
        val result = repository.submitData(password)
        // 发送带有结果的单个事件，而不是直接更新状态
        sendAction(FeatureAction.Internal.SubmissionComplete(result))
    }
}

// ViewModel 有一个处理内部事件的处理器
private fun handleInternalAction(action: FeatureAction.Internal) {
    when (action) {
        is FeatureAction.Internal.SubmissionComplete -> {
            // 事件处理器评估结果并更新状态
            action.result.fold(
                onSuccess = { _state.value = State.Success },
                onFailure = { _state.value = State.Error(it) }
            )
        }
    }
}
```

**UI 层必须：**
- 仅观察状态，从不修改
- 将用户操作作为事件传递给 ViewModel
- 不包含业务逻辑
- 尽可能使用 `:ui` 模块中的现有 UI 组件

### Hilt 依赖注入

参考：`docs/ARCHITECTURE.md#dependency-injection`

**必需模式：**
- ViewModels: `@HiltViewModel` + `@Inject constructor`
- Repositories: 实现中的 `@Inject constructor`
- 注入接口，而不是具体实现
- 模块必须提供适当的范围（`@Singleton`, `@ViewModelScoped`）

**常见违规：**
```kotlin
// ❌ 坏 - 手动实例化
class FeatureViewModel : ViewModel() {
    private val repository = FeatureRepositoryImpl()
}

// ✅ 好 - 注入的接口
@HiltViewModel
class FeatureViewModel @Inject constructor(
    private val repository: FeatureRepository  // 接口，不是实现
) : ViewModel()

// ❌ 坏 - 注入实现
class FeatureViewModel @Inject constructor(
    private val repository: FeatureRepositoryImpl  // 应该注入接口
)

// ✅ 好 - 接口注入
class FeatureViewModel @Inject constructor(
    private val repository: FeatureRepository  // 接口
)
```

### 模块组织

参考：`docs/ARCHITECTURE.md#module-structure`

**正确放置：**
- `:core` - 共享工具（加密、分析、日志记录）
- `:data` - 仓库、数据库、域模型
- `:network` - API 客户端、网络工具
- `:ui` - 可重用 Compose 组件、主题
- `:app` - 功能屏幕、ViewModels、导航
- `:authenticator` - 身份验证器应用（与密码管理器分离）

**检查：**
- UI 代码在 `:ui` 或 `:app` 模块中
- 数据模型在 `:data` 中
- 网络客户端在 `:network` 中
- 模块间没有循环依赖

### 错误处理

参考：`docs/ARCHITECTURE.md#error-handling`

**必需模式 - 使用 Result 类型：**
```kotlin
// ✅ 好 - Result 类型
suspend fun fetchData(): Result<Data> = runCatching {
    apiService.getData()
}

// ViewModel 处理 Result
repository.fetchData().fold(
    onSuccess = { data -> _state.value = State.Success(data) },
    onFailure = { error -> _state.value = State.Error(error) }
)

// ❌ 坏 - 业务逻辑中的基于异常
suspend fun fetchData(): Data {
    try {
        return apiService.getData()
    } catch (e: Exception) {
        throw FeatureException(e)  // 不要在业务逻辑中抛出
    }
}
```

## 安全审查

参考：`docs/ARCHITECTURE.md#security`

**关键安全检查：**

- **敏感数据加密**：密码、密钥、令牌使用 Android Keystore 或 EncryptedSharedPreferences
- **无明文密钥**：日志、内存转储或 SharedPreferences 中没有密码/密钥
- **输入验证**：所有用户提供数据验证和净化
- **认证令牌**：安全存储和传输
- **零知识架构**：加密发生在客户端，服务器永远不会看到明文

**警告标志：**
```kotlin
// ❌ 关键 - 明文存储
sharedPreferences.edit {
    putString("pin", userPin)  // 必须使用 EncryptedSharedPreferences
}

// ❌ 关键 - 记录敏感数据
Log.d("Auth", "Password: $password")  // 永远不要记录敏感数据
}

// ❌ 关键 - 弱加密
val cipher = Cipher.getInstance("DES")  // 使用 AES-256-GCM

// ✅ 好 - Keystore 加密
val encryptedData = keystoreManager.encrypt(sensitiveData)
secureStorage.store(encryptedData)
```

**如果发现安全问题，使用 `reference/priority-framework.md` 分类为关键**

## 测试审查

参考：`reference/testing-patterns.md`

**必需测试覆盖：**

- **ViewModels**：状态转换、操作、错误场景的单元测试
- **Repositories**：数据转换、错误处理的单元测试
- **业务逻辑**：复杂算法、计算的单元测试
- **边缘情况**：空输入、空状态、网络故障、并发操作

**测试质量：**
```kotlin
// ✅ 好 - 测试行为
@Test
fun `when login succeeds then state updates to success`() = runTest {
    val viewModel = LoginViewModel(mockRepository)

    coEvery { mockRepository.login(any(), any()) } returns Result.success(User())

    viewModel.onLoginClicked("user", "pass")

    viewModel.state.test {
        assertEquals(LoginState.Success, awaitItem())
    }
}

// ❌ 坏 - 测试实现
@Test
fun `repository is called with correct parameters`() {
    // 这是在测试内部实现，而不是行为
}
```

**测试框架：**
- JUnit 5 用于测试结构
- MockK 用于模拟
- Turbine 用于 Flow 测试
- Kotlinx-coroutines-test 用于协程测试

## 代码质量

### 空安全

- 没有 `!!`（非空断言）且没有明确的安全保证
- 平台类型（来自 Java）用明确的空值性处理
- 可空类型有适当的空检查或使用安全操作符（`?.`, `?:`）

```kotlin
// ❌ 坏 - 不安全断言
val result = apiService.getData()!!  // 可能崩溃

// ✅ 好 - 安全处理
val result = apiService.getData() ?: return State.Error("No data")

// ❌ 坏 - 平台类型未检查
val intent: Intent = getIntent()  // 来自 Java 可能为空
intent.getStringExtra("key")  // 潜在 NPE

// ✅ 好 - 明确空值性
val intent: Intent? = getIntent()
intent?.getStringExtra("key")
```

### 文档

- **公共 API**：有 KDoc 注释解释目的、参数、返回值
- **复杂算法**：在注释中解释
- **非明显行为**：用理由文档化

```kotlin
// ✅ 好 - 文档化的公共 API
/**
 * 使用来自 Android Keystore 的密钥通过 AES-256-GCM 加密给定数据。
 *
 * @param plaintext 要加密的数据
 * @return 包含加密数据或加密错误的 Result
 */
suspend fun encrypt(plaintext: ByteArray): Result<EncryptedData>
```

### 风格合规

参考：`docs/STYLE_AND_BEST_PRACTICES.md`

仅在以下情况下标记样式问题：
- 未被 linters（Detekt、ktlint）捕获
- 有架构影响
- 显著影响可读性

跳过小格式（空格、换行等）- linters 处理这些。

## 优先处理发现

使用 `reference/priority-framework.md` 将发现分类为关键/重要/建议/可选。

## 提供反馈

使用 `reference/review-psychology.md` 获取措辞指导。

**关键原则：**
- **对设计决策提问**：\"我们可以在这里使用现有的 BitwardenTextField 组件吗？\"
- **对明确违规行为给出指令**：\"将 MutableStateFlow 更改为 StateFlow（MVVM 模式要求）\"
- **解释理由**：\"这暴露了可变状态，违反了单向数据流\"
- **使用 I-语句**：\"没有注释，我很难理解这个逻辑\"
- **避免居高临下**：不要使用\"just\"、\"simply\"、\"obviously\"

## 输出格式

遵循 `SKILL.md` 步骤 5 中的格式指导（简洁摘要，仅关键问题，详细内联评论，带 `<details>` 标签）。

参见 `examples/review-outputs.md` 获取全面功能审查示例。

```markdown
**总体评估：** 批准 / 请求变更

**关键问题** (如果有的话)：
- [每个关键阻止问题的一行摘要，带文件：行号引用]

请参阅内联评论了解所有问题详细信息。
```
