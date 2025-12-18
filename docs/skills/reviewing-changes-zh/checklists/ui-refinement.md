# UI 优化审查检查清单

## 多次通过策略

### 第一次通过：视觉更改

<thinking>
分析 UI 更改：
1. 正在解决什么视觉/UX 问题？
2. 是否有设计或截图可参考？
3. 这是否影响现有屏幕或新屏幕？
4. 视觉更改的范围是什么？
5. 设计令牌（颜色、间距、排版）是否正确使用？
</thinking>

**1. 理解更改：**
- 正在解决什么视觉/UX 问题？
- 是否有设计或截图可参考？
- 这是错误修复还是增强？

**2. 组件使用：**
- 是否使用 `:ui` 模块中的现有组件？
- 是否创建了任何新的自定义组件？
- 是否可以重用现有组件？

### 第二次通过：实现审查

<thinking>
检查实现质量：
1. 是否遵循 Compose 最佳实践？
2. 状态提升是否正确应用？
3. 是否在可能的地方重用现有组件？
4. 无障碍是否正确处理？
5. 这是否遵循设计系统模式？
</thinking>

**3. Compose 最佳实践：**
- Composables 是否正确结构化？
- 状态提升是否正确？
- 是否包含预览 composables？

**4. 无障碍：**
- 图片/图标的 content descriptions？
- 屏幕阅读器的语义属性？
- 触摸目标是否满足最小尺寸（48dp）？

**5. 设计一致性：**
- 是否使用主题颜色、间距、排版？
- 是否与其他屏幕一致？
- 是否响应不同屏幕尺寸？

## 要检查的内容

✅ **Compose 最佳实践**
- Composables 在可能的情况下是无状态的
- 状态提升遵循模式
- 副作用（LaunchedEffect、DisposableEffect）正确使用
- 为开发提供预览 composables

✅ **组件重用**
- 是否使用现有的 BitwardenButton、BitwardenTextField 等？
- 自定义 UI 是否可以替换为现有组件？
- 新的可重用组件是否放置在 `:ui` 模块中？

✅ **无障碍**
- 图标和图片的 `contentDescription`
- 自定义交互的 `semantics`
- 足够的对比度比率
- 触摸目标 ≥ 48dp 最小值

✅ **设计一致性**
- 使用 `BitwardenTheme` 颜色（不是硬编码）
- 使用 `BitwardenTheme` 间距（16.dp、8.dp 等）
- 使用 `BitwardenTheme` 排版样式
- 与现有屏幕模式一致

✅ **响应式设计**
- 是否处理不同屏幕尺寸？
- 在适当时可滚动内容？
- 是否考虑横向方向？

## 要跳过的内容

❌ **深度架构审查** - 除非 ViewModel 更改是实质性的
❌ **业务逻辑审查** - 重点是表示，不是逻辑
❌ **安全审查** - 除非 UI 不当暴露敏感数据

## 警告标志

🚩 **重复现有组件** - 应该从 `:ui` 模块重用
🚩 **硬编码颜色/尺寸** - 应该使用主题
🚩 **缺少无障碍属性** - 对屏幕阅读器至关重要
🚩 **UI 中的状态管理** - 应该提升到 ViewModel

## 要问的关键问题

使用 `reference/review-psychology.md` 进行措辞：

- "我们可以在这里使用 BitwardenButton 而不是这个自定义按钮吗？"
- "这个颜色是否应该来自 BitwardenTheme 而不是硬编码？"
- "这在小屏幕上会是什么样子？"
- "这个图标有 contentDescription 吗？"

## 常见模式

### Composable 结构

```kotlin
// ✅ 好 - 无状态，提升状态
@Composable
fun FeatureScreen(
    state: FeatureState,
    onActionClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // 仅 UI 渲染
}

// ❌ 坏 - 可组合中的业务状态
@Composable
fun FeatureScreen() {
    var userData by remember { mutableStateOf<User?>(null) }  // 业务状态应该在 ViewModel 中
    var isLoading by remember { mutableStateOf(false) }  // 应用状态应该在 ViewModel 中
    // ...
}

// ✅ 可以 - 可组合中的 UI 本地状态
@Composable
fun LoginForm(onSubmit: (String, String) -> Unit) {
    var username by remember { mutableStateOf("") }  // UI 本地输入状态是可以的
    var password by remember { mutableStateOf("") }
    // 仅根据需要提升
}
```

### 主题使用

```kotlin
// ✅ 好 - 使用主题
Text(
    text = "Title",
    style = BitwardenTheme.typography.titleLarge,
    color = BitwardenTheme.colorScheme.primary
)

// 设计系统使用 4.dp 增量（4、8、12、16、24、32 等）
Spacer(modifier = Modifier.height(16.dp))

// ❌ 坏 - 硬编码
Text(
    text = "Title",
    style = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold),  // 应该使用主题
    color = Color(0xFF0000FF)  // 应该使用主题颜色
)

Spacer(modifier = Modifier.height(17.dp))  // 非标准间距
```

### 无障碍

```kotlin
// ✅ 好 - 带描述的交互元素
Icon(
    painter = painterResource(R.drawable.ic_password),
    contentDescription = "Password visibility toggle",
    modifier = Modifier.clickable { onToggle() }
)

// ✅ 好 - 带明确空值的装饰性图标
Icon(
    painter = painterResource(R.drawable.ic_check),
    contentDescription = null,  // 文本旁的装饰性图标
    tint = BitwardenTheme.colorScheme.success
)

// ❌ 坏 - 缺少描述的交互元素
Icon(
    painter = painterResource(R.drawable.ic_delete),
    contentDescription = null,  // 交互元素需要描述
    modifier = Modifier.clickable { onDelete() }
)
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

```markdown
## 摘要
更新登录屏幕布局以改进视觉层次和触摸目标

## 关键问题
无

## 建议改进

**app/auth/LoginScreen.kt:67** - 我们可以使用 BitwardenTextField 吗？
这个自定义文本字段看起来非常类似于 `ui/components/BitwardenTextField.kt:89`。
使用现有组件是否能保持一致性？

**app/auth/LoginScreen.kt:123** - 添加 contentDescription
```kotlin
Icon(
    painter = painterResource(R.drawable.ic_visibility),
    contentDescription = "Show password",  // 为无障碍添加
    modifier = Modifier.clickable { onToggleVisibility() }
)
```

**app/auth/LoginScreen.kt:145** - 使用设计系统间距
```kotlin
// 当前
Spacer(modifier = Modifier.height(17.dp))

// 设计系统使用 4.dp 增量（4、8、12、16、24、32 等）
Spacer(modifier = Modifier.height(16.dp))
```
```
