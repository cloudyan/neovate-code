# Compose UI 模式快速参考

在代码审查期间 Bitwarden Android Compose UI 模式的快速参考。有关详细信息，请阅读 `docs/ARCHITECTURE.md` 和 `docs/STYLE_AND_BEST_PRACTICES.md`。

## 组件重用

**✅ 好 - 使用现有组件**：
```kotlin
BitwardenButton(
    text = "Submit",
    onClick = onSubmit
)

BitwardenTextField(
    value = text,
    onValueChange = onTextChange,
    label = "Email"
)
```

**❌ 坏 - 重复现有组件**：
```kotlin
// ❌ 重新创建 BitwardenButton
Button(
    onClick = onSubmit,
    colors = ButtonDefaults.buttonColors(
        containerColor = BitwardenTheme.colorScheme.primary
    )
) {
    Text("Submit")
}
```

**关键规则**：
- 在创建自定义组件之前检查 `:ui` 模块中的现有组件
- 使用 BitwardenButton、BitwardenTextField 等以保持一致性
- 将新的可重用组件放在 `:ui` 模块中

---

## 主题使用

**✅ 好 - 使用主题**：
```kotlin
Text(
    text = "Title",
    style = BitwardenTheme.typography.titleLarge,
    color = BitwardenTheme.colorScheme.primary
)

Spacer(modifier = Modifier.height(16.dp))  // 标准间距
```

**❌ 坏 - 硬编码值**：
```kotlin
Text(
    text = "Title",
    style = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold),  // 使用主题
    color = Color(0xFF0066FF)  // 使用主题颜色
)

Spacer(modifier = Modifier.height(17.dp))  // 非标准间距
```

**关键规则**：
- 使用 `BitwardenTheme.colorScheme` 作为颜色
- 使用 `BitwardenTheme.typography` 作为文本样式
- 使用标准间距（4.dp、8.dp、16.dp、24.dp）

---

## 快速检查清单

### UI 模式
- [ ] 使用来自 `:ui` 模块的现有 Bitwarden 组件？
- [ ] 使用 BitwardenTheme 作为颜色和排版？
- [ ] 使用标准间距值（4、8、16、24 dp）？
- [ ] 没有硬编码颜色或文本样式？
- [ ] UI 是无状态的（观察状态，不修改）？

---

有关详细信息，请始终参考：
- `docs/ARCHITECTURE.md` - 完整的架构模式
- `docs/STYLE_AND_BEST_PRACTICES.md` - 完整的风格指南
