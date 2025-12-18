# 测试模式快速参考

在代码审查期间 Bitwarden Android 测试模式的快速参考。有关详细信息，请阅读 `docs/ARCHITECTURE.md` 和 `docs/STYLE_AND_BEST_PRACTICES.md`。

## ViewModel 测试

**✅ 好 - 测试行为**：
```kotlin
@Test
fun `when login succeeds then state updates to success`() = runTest {
    // 准备
    val viewModel = LoginViewModel(mockRepository)
    coEvery { mockRepository.login(any(), any()) } returns Result.success(User())

    // 执行
    viewModel.onLoginClicked("user@example.com", "password")

    // 断言
    viewModel.state.test {
        assertEquals(LoginState.Loading, awaitItem())
        assertEquals(LoginState.Success, awaitItem())
    }
}
```

**❌ 坏 - 测试实现**：
```kotlin
@Test
fun `repository is called with correct parameters`() {
    // ❌ 这测试实现细节，而不是行为
    viewModel.onLoginClicked("user", "pass")
    coVerify { mockRepository.login("user", "pass") }
}
```

**关键规则**：
- 测试行为，而不是实现
- 使用 `runTest` 进行协程测试
- 使用 Turbine 进行 Flow 测试
- 使用 MockK 进行模拟

---

## Repository 测试

**✅ 好 - 测试数据转换**：
```kotlin
@Test
fun `fetchItems maps API response to domain model`() = runTest {
    // 准备
    val apiResponse = listOf(ApiItem(id = "1", name = "Test"))
    coEvery { apiService.getItems() } returns apiResponse

    // 执行
    val result = repository.fetchItems()

    // 断言
    assertTrue(result.isSuccess)
    assertEquals(
        listOf(DomainItem(id = "1", name = "Test")),
        result.getOrThrow()
    )
}
```

**关键规则**：
- 测试数据转换
- 测试错误处理（网络故障、API 错误）
- 如适用，测试缓存行为
- 模拟 API 服务和数据库

参考：项目使用 JUnit 5、MockK、Turbine、kotlinx-coroutines-test

---

## 空安全

**✅ 好 - 安全处理**：
```kotlin
// 带 elvis 操作符的安全调用
val result = apiService.getData() ?: return State.Error("No data")

// 带安全调用的 let
intent?.getStringExtra("key")?.let { value ->
    processValue(value)
}

// 带消息的 require
val data = requireNotNull(response.data) { "Response data must not be null" }
```

**❌ 坏 - 不安全断言**：
```kotlin
// ❌ 不安全 - 可能崩溃
val result = apiService.getData()!!

// ❌ 未检查的平台类型
val intent: Intent = getIntent()  // 来自 Java 可能为空
val value = intent.getStringExtra("key")  // 潜在 NPE
```

**关键规则**：
- 除非安全得到保证（罕见），否则避免 `!!`
- 用明确的空值性处理平台类型
- 使用安全调用（`?.`）、elvis 操作符（`?:`）或显式检查
- 如果可接受崩溃，使用带描述性消息的 `requireNotNull`

---

## 快速检查清单

### 测试
- [ ] ViewModels 有单元测试？
- [ ] 测试验证行为，而不是实现？
- [ ] 边缘情况已覆盖？
- [ ] 错误场景已测试？

### 代码质量
- [ ] 空安全正确处理（没有无保证的 `!!`）？
- [ ] 公共 API 有 KDoc？
- [ ] 遵循命名约定？

---

有关详细信息，请始终参考：
- `docs/ARCHITECTURE.md` - 完整的架构模式
- `docs/STYLE_AND_BEST_PRACTICES.md` - 完整的风格指南
