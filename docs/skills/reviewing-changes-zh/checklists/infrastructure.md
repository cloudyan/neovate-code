# 基础设施审查检查清单

## 多次通过策略

### 第一次通过：理解变更

<thinking>
评估基础设施变更：
1. 这解决了什么问题？
2. 这是否影响生产构建、CI/CD 或开发工作流？
3. 如果这破裂了，风险是什么？
4. 合并前可以测试吗？
5. 回滚计划是什么？
</thinking>

**1. 识别目标：**
- 这解决了什么问题？
- 这是优化、修复还是新功能？
- 预期影响是什么？

**2. 评估风险：**
- 这是否影响生产构建？
- 这是否会破坏 CI/CD 管道？
- 对开发人员工作流的影响？

**3. 性能影响：**
- 构建会更快还是更慢？
- CI 时间影响？
- 资源使用变化？

### 第二次通过：验证实现

<thinking>
验证配置和影响：
1. 配置语法是否有效？
2. 密钥/凭据是否安全处理？
3. 对构建时间和 CI 性能的影响是什么？
4. 这将如何影响团队的工作流？
5. 是否有足够的测试/验证？
</thinking>

**4. 配置正确性：**
- 语法是否有效？
- 引用是否正确？
- 密钥/凭据是否安全处理？

**5. 影响分析：**
- 哪些工作流/构建受影响？
- 如果这破裂了，回滚计划？
- 团队的文档？

**6. 测试策略：**
- 合并前如何测试？
- 蓝绿/渐进推出可能吗？
- 合并后的问题监控？

## 要检查的内容

✅ **配置正确性**
- YAML/Groovy 语法有效
- 文件引用正确
- 版本号/标签有效
- 条件逻辑可靠

✅ **安全性**
- 无硬编码密钥或凭据
- GitHub 密钥正确使用
- 权限适当范围
- 日志中无敏感数据

✅ **性能影响**
- 构建时间影响已理解
- CI 队列时间影响已评估
- 资源使用合理

✅ **回滚计划**
- 这可以轻松恢复吗？
- 对其他更改的依赖？
- 渐进推出可能吗？

✅ **文档**
- 团队的更改文档？
- README 或 CONTRIBUTING 已更新？
- 破坏性更改已明确注明？

## 要跳过的内容

❌ **配置争论** - 除非有明确的性能/维护好处
❌ **过度优化** - 除非当前系统有已证明的问题
❌ **建议重大重写** - 除非当前方法根本损坏

## 警告标志

🚩 **硬编码密钥** - 使用 GitHub 密钥或安全存储
🚩 **无回滚计划** - 关键基础设施应该是可恢复的
🚩 **未经测试的更改** - CI 更改应验证
🚩 **无通知的破坏性更改** - 团队需要提前警告
🚩 **性能回归** - 构建不应该显著变慢

## 要问的关键问题

使用 `reference/review-psychology.md` 进行措辞：

- "如果这破坏了 CI，回滚计划是什么？"
- "我们可以在主分支之前在功能分支上测试这个吗？"
- "这会影响构建时间吗？多少？"
- "这应该在 CONTRIBUTING.md 中记录吗？"

## 常见基础设施模式

### GitHub Actions

```yaml
# ✅ 好 - 安全、清晰、已测试
name: Build and Test
on:
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # 防止失控构建
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        env:
          API_KEY: ${{ secrets.API_KEY }}  # 安全密钥使用
        run: ./gradlew test

# ❌ 坏 - 不安全、不清楚
name: Build
on: push  # 太宽泛，在所有分支上运行
jobs:
  build:
    runs-on: ubuntu-latest
    # 无超时 - 可能永远运行
    steps:
      - run: |
          export API_KEY="hardcoded_key_here"  # 硬编码密钥！
          ./gradlew test
```

### Gradle 配置

```kotlin
// ✅ 好 - 清晰、可维护
dependencies {
    implementation(libs.androidx.core.ktx)  // 版本目录
    implementation(libs.hilt.android)

    testImplementation(libs.junit5)
    testImplementation(libs.mockk)
}

// ❌ 坏 - 硬编码版本
dependencies {
    implementation("androidx.core:core-ktx:1.12.0")  // 硬编码版本
    implementation("com.google.dagger:hilt-android:2.48")
}
```

### 构建优化

```kotlin
// ✅ 好 - 并行、缓存
tasks.register("checkAll") {
    dependsOn("detekt", "ktlintCheck", "testStandardDebug")
    group = "verification"
    description = "Run all checks in parallel"

    // 启用缓存以便更快构建
    outputs.upToDateWhen { false }
}

// ❌ 坏 - 顺序、无缓存
tasks.register("checkAll") {
    doLast {
        exec { commandLine("./gradlew", "detekt") }
        exec { commandLine("./gradlew", "ktlintCheck") }  // 顺序
        exec { commandLine("./gradlew", "test") }
    }
}
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
通过并行化测试执行和缓存依赖项来优化 CI 构建

影响：预计 CI 时间减少 40%（12 分钟 → 7 分钟每次构建）

## 关键问题
无

## 建议改进

**.github/workflows/build.yml:23** - 添加超时以确保安全
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # 防止构建挂起
    steps:
      # ...
```
如果出现问题，这可以防止失控构建。

**.github/workflows/build.yml:45** - 考虑模块测试的矩阵策略
我们可以使用矩阵策略并行运行模块测试吗？
```yaml
strategy:
  matrix:
    module: [app, data, network, ui]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: ./gradlew :${{ matrix.module }}:test
```
这可以进一步减少 CI 时间。

**build.gradle.kts:12** - 记录缓存策略
我们可以添加一个注释来解释缓存配置吗？
未来的维护人员会感谢理解为什么使用这些特定缓存键。

## 回滚计划
如果 CI 破坏了：
- 恢复提交：`git revert [commit-hash]`
- 以前的工作流在：`.github/workflows/build.yml@main^`
- 在 https://github.com/[org]/[repo]/actions 监控 CI 时间
```
