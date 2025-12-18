# 架构模式快速参考

在代码审查期间 Bitwarden Android 架构模式的快速参考。有关详细信息，请阅读 `docs/ARCHITECTURE.md` 和 `docs/STYLE_AND_BEST_PRACTICES.md`。

## MVVM + UDF 模式

### ViewModel 结构

**✅ 好 - 适当的状态封装**：
```kotlin
@HiltViewModel
class FeatureViewModel @Inject constructor(
    private val repository: FeatureRepository
) : ViewModel() {
    // 私有可变状态
    private val _state = MutableStateFlow<FeatureState>(FeatureState.Initial)

    // 公共不可变状态
    val state: StateFlow<FeatureState> = _state.asStateFlow()

    // 操作作为函数，状态通过内部操作更新
    fun onActionClicked() {
        viewModelScope.launch {
            val result = repository.performAction()
            sendAction(FeatureAction.Internal.ActionComplete(result))
        }
    }

    // ViewModel 有一个处理内部操作的处理器
    private fun handleInternalAction(action: FeatureAction.Internal) {
        when (action) {
            is FeatureAction.Internal.ActionComplete -> {
                // 操作处理器评估结果并更新状态
                action.result.fold(
                    onSuccess = { _state.value = State.Success },
                    onFailure = { _state.value = State.Error(it) }
                )
            }
        }
    }
}
```

**❌ 坏 - 常见违规**：
```kotlin
class FeatureViewModel : ViewModel() {
    // ❌ 暴露可变状态
    val state: MutableStateFlow<FeatureState>

    // ❌ ViewModel 中的业务逻辑
    fun onSubmit() {
        val encrypted = encryptionManager.encrypt(data)  // 应该在 Repository 中
        _state.value = FeatureState.Success
    }

    // ❌ 直接 Android 框架依赖
    fun onCreate(context: Context) {  // ViewModels 不应该依赖 Context
        // ...
    }
}
```

**关键规则**：
- 暴露 `StateFlow<T>`，永远不要 `MutableStateFlow<T>`
- 将业务逻辑委托给 Repository/Manager
- 不要直接 Android 框架依赖（除了 ViewModel、SavedStateHandle）
- 使用 `viewModelScope` 进行协程

参考：`docs/ARCHITECTURE.md#mvvm-pattern`

---

### UI 层 (Compose)

**✅ 好 - 无状态，仅观察**：
```kotlin
@Composable
fun FeatureScreen(
    state: FeatureState,
    onActionClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        when (state) {
            is FeatureState.Loading -> LoadingIndicator()
            is FeatureState.Success -> SuccessContent(state.data)
            is FeatureState.Error -> ErrorMessage(state.error)
        }

        BitwardenButton(
            text = "Action",
            onClick = onActionClick  // 向 ViewModel 发送事件
        )
    }
}
```

**❌ 坏 - 有状态，修改状态**：
```kotlin
@Composable
fun FeatureScreen(viewModel: FeatureViewModel) {
    var localState by remember { mutableStateOf(...) }  // ❌ UI 中的状态

    Button(onClick = {
        viewModel._state.value = FeatureState.Loading  // ❌ 直接修改 ViewModel 状态
    })
}
```

**关键规则**：
- Compose 屏幕观察状态，永远不修改
- 用户操作作为事件/回调传递到 ViewModel
- UI 层中无业务逻辑
- 使用 `:ui` 模块中的现有组件

---

## Hilt 依赖注入

### ViewModels

**✅ 好 - 接口注入**：
```kotlin
@HiltViewModel
class FeatureViewModel @Inject constructor(
    private val repository: FeatureRepository,  // 接口，不是实现
    private val authManager: AuthManager,
    savedStateHandle: SavedStateHandle
) : ViewModel()
```

**❌ 坏 - 常见违规**：
```kotlin
// ❌ 没有 @HiltViewModel 注解
class FeatureViewModel @Inject constructor(...)

// ❌ 注入实现而不是接口
class FeatureViewModel @Inject constructor(
    private val repository: FeatureRepositoryImpl  // 应该注入接口
)

// ❌ 手动实例化
class FeatureViewModel : ViewModel() {
    private val repository = FeatureRepositoryImpl()  // 应该使用 @Inject
}
```

**关键规则**：
- 用 `@HiltViewModel` 注解
- 使用 `@Inject constructor`
- 注入接口，不是实现
- 使用 `SavedStateHandle` 以在进程死亡时生存

参考：`docs/ARCHITECTURE.md#dependency-injection`

---

### Repositories 和 Managers

**✅ 好 - 带 @Inject 的实现**：
```kotlin
interface FeatureRepository {
    suspend fun fetchData(): Result<Data>
}

class FeatureRepositoryImpl @Inject constructor(
    private val apiService: FeatureApiService,
    private val database: FeatureDao
) : FeatureRepository {
    override suspend fun fetchData(): Result<Data> = runCatching {
        apiService.getData()
    }
}
```

**模块提供接口**：
```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class DataModule {
    @Binds
    @Singleton
    abstract fun bindFeatureRepository(
        impl: FeatureRepositoryImpl
    ): FeatureRepository
}
```

**关键规则**：
- 定义接口用于抽象
- 实现使用 `@Inject constructor`
- 模块将实现绑定到接口
- 适当的范围（`@Singleton`, `@ViewModelScoped`）

---

## 模块组织

```
android/
├── core/           # 共享工具（加密、分析、日志记录）
├── data/           # Repositories、数据库、域模型
├── network/        # API 客户端、网络工具
├── ui/             # 可重用 Compose 组件、主题
├── app/            # 应用、功能屏幕、ViewModels
└── authenticator/  # 身份验证器应用（与密码管理器分离）
```

**正确放置**：
- UI 屏幕和 ViewModels → `:app`
- 可重用 Compose 组件 → `:ui`
- 数据模型和 Repositories → `:data`
- API 服务 → `:network`
- 加密、日志记录 → `:core`

**检查**：
- 无循环依赖
- 正确的模块放置
- 适当的可见性（internal vs public）

参考：`docs/ARCHITECTURE.md#module-structure`

---

## 错误处理

### 使用 Result 类型，而不是异常

**✅ 好 - 基于 Result**：
```kotlin
// Repository
suspend fun fetchData(): Result<Data> = runCatching {
    apiService.getData()
}

// ViewModel
fun onFetch() {
    viewModelScope.launch {
        val result = repository.fetchData()
        sendAction(FeatureAction.Internal.FetchComplete(result))
    }
}
```

**❌ 坏 - 业务逻辑中的基于异常**：
```kotlin
// ❌ 不要在业务逻辑中抛出
suspend fun fetchData(): Data {
    try {
        return apiService.getData()
    } catch (e: Exception) {
        throw FeatureException(e)  // 不要在 repositories 中抛出
    }
}

// ❌ ViewModel 中的 Try-catch
fun onFetch() {
    viewModelScope.launch {
        try {
            val data = repository.fetchData()
            sendAction(FeatureAction.Internal.FetchComplete(data))
        } catch (e: Exception) {
            sendAction(FeatureAction.Internal.FetchComplete(e))
        }
    }
}
```

**关键规则**：
- 在 repositories 中使用 `Result<T>` 返回类型
- 使用 `runCatching { }` 包装 API 调用
- 在 ViewModels 中使用 `.fold()` 处理结果
- 不要在业务逻辑中抛出异常

参考：`docs/ARCHITECTURE.md#error-handling`

---

## 快速检查清单

### 架构
- [ ] ViewModels 暴露 StateFlow，不是 MutableStateFlow？
- [ ] 业务逻辑在 Repository，不是 ViewModel？
- [ ] 使用 Hilt DI (@HiltViewModel, @Inject constructor)？
- [ ] 注入接口，不是实现？
- [ ] 正确的模块放置？

### 错误处理
- [ ] 在业务逻辑中使用 Result 类型，不是异常？
- [ ] 在 ViewModels 中使用 .fold() 处理错误？

---

有关详细信息，请始终参考：
- `docs/ARCHITECTURE.md` - 完整的架构模式
- `docs/STYLE_AND_BEST_PRACTICES.md` - 完整的风格指南
