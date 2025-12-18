# 重构审查检查清单

## 多次通过策略

### 第一次通过：理解重构

<thinking>
分析重构范围：
1. 正在改进什么模式？
2. 为什么需要此重构？
3. 这是否改变行为或只是结构？
4. 范围是什么？（受影响的文件、迁移完整性）
5. 如果某些东西破损了，风险是什么？
</thinking>

**1. 理解目标：**
- 正在改进什么模式？
- 为什么需要此重构？
- 更改的范围是什么？

**2. 评估完整性：**
- 所有实例都被重构还是只是一些？
- 是否有相关区域也应该更改？
- 迁移是完整的还是部分的？

**3. 风险评估：**
- 这是否改变行为？
- 多少文件受影响？
- 测试是否已更新以反映更改？

### 第二次通过：验证一致性

<thinking>
验证重构质量：
1. 新模式是否在整个代码库中一致应用？
2. 是否有错过的旧模式实例？
3. 测试是否仍以相同行为通过？
4. 迁移是完整的还是部分的？
5. 这是否引入任何新问题？
</thinking>

**4. 模式一致性：**
- 新模式是否在整个代码库中一致应用？
- 是否有错过的旧模式实例？
- 这是否匹配已建立的项目模式？

**5. 迁移完整性：**
- 旧模式完全移除或已弃用？
- 所有使用已更新？
- 文档已更新？

**6. 测试覆盖：**
- 测试是否仍通过？
- 测试是否已重构以匹配？
- 行为是否保持不变？

## 要检查的内容

✅ **模式一致性**
- 新模式在所有受影响代码中一致应用
- 遵循已建立的项目模式（MVVM、DI、错误处理）
- 无新旧模式混合

✅ **迁移完整性**
- 旧模式的所有实例都已更新？
- 弃用的方法已移除或标记 @Deprecated？
- 相关代码也已更新（测试、文档）？

✅ **行为保持**
- 重构不改变行为
- 测试仍通过
- 边缘情况仍处理

✅ **弃用策略**（如适用）
- 旧 API 标记 @Deprecated 并提供迁移指导
- 替换清楚文档化
- 移除时间表已指定

## 要跳过的内容

❌ **建议额外重构** - 除非直接与当前更改相关
❌ **范围蔓延** - 不要请求重构未触及的代码
❌ **完美主义** - 更好的代码比完美的代码更好

## 警告标志

🚩 **不完整迁移** - 新旧模式混合
🚩 **行为更改** - 重构不应改变行为
🚩 **测试破损** - 测试应更新以匹配重构
🚩 **未文档化模式** - 新模式应对团队清晰

## 要问的关键问题

使用 `reference/review-psychology.md` 进行措辞：

- "我在[file:line]中看到旧模式仍在使用 - 也应该更新吗？"
- "我们可以将 @Deprecated 添加到旧方法并提供迁移指导吗？"
- "我们如何确保此行为保持相同？"
- "此模式是否应在 ARCHITECTURE.md 中记录？"

## 常见重构模式

### 提取接口/仓库

```kotlin
// ✅ 好 - 完整迁移
interface FeatureRepository {
    suspend fun getData(): Result<Data>
}

class FeatureRepositoryImpl @Inject constructor(
    private val apiService: FeatureApiService
) : FeatureRepository {
    override suspend fun getData(): Result<Data> = runCatching {
        apiService.fetchData()
    }
}

// 所有使用已更新为注入接口
class FeatureViewModel @Inject constructor(
    private val repository: FeatureRepository  // 接口
) : ViewModel()

// ❌ 坏 - 不完整迁移
// 一些文件仍直接注入 FeatureRepositoryImpl
```

### 现代化错误处理

```kotlin
// ✅ 好 - 完整迁移
// 旧基于异常的已移除
suspend fun fetchData(): Result<Data> = runCatching {
    apiService.getData()
}

// 所有调用点已更新
repository.fetchData().fold(
    onSuccess = { /* 处理 */ },
    onFailure = { /* 处理 */ }
)

// ❌ 坏 - 混合模式
// 一些函数使用 Result，其他仍抛出异常
```

### 提取可重用组件

```kotlin
// ✅ 好 - 完整提取
// 组件移至 :ui 模块
@Composable
fun BitwardenButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
)

// 所有使用已更新以使用新组件
// 旧内联按钮实现已移除

// ❌ 坏 - 不完整提取
// 一些屏幕使用新组件，其他仍内联实现
```

## 优先处理发现

使用 `reference/priority-framework.md` 将发现分类为关键/重要/建议/可选。

## 输出格式

遵循 `SKILL.md` 步骤 5 中的格式指导（简洁摘要，仅关键问题，详细内联评论，带 `<details>` 标签）。

```markdown
**总体评估：** 批准 / 请求变更

**关键问题** (如果有的话)：
- [每个关键阻止问题的一行摘要，带文件：行号引用]

请参阅内联评论了解所有问题详细信息。
```

## 审查示例

### 示例 1：带有不完整迁移的重构

**上下文**: 重构认证为仓库模式，但一个 ViewModel 仍使用旧模式

**摘要评论：**
```markdown
**总体评估：** 请求变更

**关键问题：**
- 不完整迁移（app/vault/VaultViewModel.kt:89）

请参阅内联评论了解详情。
```

**内联评论 1** (在 `app/vault/VaultViewModel.kt:89` 上)：
```markdown
**重要**: 不完整迁移

<details>
<summary>详细信息和修复</summary>

此 ViewModel 仍直接注入 AuthManager。它是否应该像其他 11 个 ViewModels 一样使用 AuthRepository？

\\```kotlin
// 当前（旧模式）
class VaultViewModel @Inject constructor(
    private val authManager: AuthManager
)

// 应该是（新模式）
class VaultViewModel @Inject constructor(
    private val authRepository: AuthRepository
)
\\```

这是唯一仍在使用旧模式的 ViewModel。
</details>
```

**内联评论 2** (在 `data/auth/AuthManager.kt:1` 上)：
```markdown
**建议**: 添加弃用通知

<details>
<summary>详细信息</summary>

我们可以将 @Deprecated 添加到 AuthManager 以指导未来开发吗？

\\```kotlin
@Deprecated(
    message = "使用 AuthRepository 接口代替",
    replaceWith = ReplaceWith("AuthRepository"),
    level = DeprecationLevel.WARNING
)
class AuthManager @Inject constructor(...)
\\```

这有助于防止新代码使用旧模式。
</details>
```

---

### 示例 2：干净重构（无问题）

**上下文**: 完整迁移的重构，所有模式正确遵循，测试通过

**审查评论：**
```markdown
**总体评估：** 批准

将 ExitManager 移至 :ui 模块的干净重构。遵循既定模式，消除重复，测试正确更新。
```

**代币计数：** ~30 代币（vs ~800 用于详细格式）

**为什么这样做：**
- 总计 3 行
- 明确批准决定
- 简要说明已完成的内容
- 无详细部分、复选标记或过度赞扬
- 作者立即获得合并绿灯

**对于干净重构不要做的：**
```markdown
❌ 不要创建这些部分：

## 摘要
此 PR 成功将 ExitManager 重构为共享代码...

## 关键优势
- ✅ 遵循既定的模块组织模式
- ✅ 消除应用间的代码重复
- ✅ 改进测试覆盖
- ✅ 保持一致行为
[...20 个更多复选标记...]

## 代码质量与架构
**架构合规性：** ✅
- 正确将管理器放置在 :ui 模块中
- 遵循 UI 层管理器的既定模式
[...详细分析...]

## 更改
- ✅ 将 ExitManager 接口从 app → ui 模块移动
- ✅ 将 ExitManagerImpl 从 app → ui 模块移动
[...列出每个文件...]
```

这过于冗长。**对于干净 PR：最多 2-3 行。**
