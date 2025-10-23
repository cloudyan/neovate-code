# 多代理代码审查系统

这是一个基于AI代理的全面代码审查系统，使用专门的代理对不同维度进行深度分析，包括安全性、性能、代码质量和架构一致性。

## 🌟 核心特性

### 🤖 专业代理团队
- **🔒 安全分析师** (`security-analyst`): 检测安全漏洞、认证问题、加密弱点
- **⚡ 性能优化师** (`performance-optimizer`): 分析算法效率、内存管理、I/O性能
- **📊 质量评估师** (`quality-assessor`): 评估代码复杂度、命名规范、可维护性
- **🏗️ 架构审查师** (`architect-reviewer`): 检查设计模式、模块耦合、架构一致性

### 🚀 核心功能
- **并行执行**: 多代理同时分析，提高效率
- **优先级驱动**: 按严重程度和影响范围排序问题
- **自动修复**: 支持简单问题的自动修复
- **综合报告**: 详细的HTML、Markdown和JSON报告
- **趋势分析**: 长期代码质量趋势跟踪
- **智能建议**: 基于分析结果的具体改进建议

### 🔧 开发工作流集成
- **预提交钩子**: 自动在提交前进行代码审查
- **自动触发**: 重要变更时自动执行审查
- **CI/CD集成**: 支持持续集成环境
- **结果缓存**: 避免重复分析，提高性能

## 📦 安装和配置

### 1. 启用多代理模式

在你的 `.neovate/config.json` 中添加：

```json
{
  "codeReview": {
    "enabled": true,
    "multiAgent": {
      "enabled": true,
      "agents": [
        "security-analyst",
        "performance-optimizer", 
        "quality-assessor",
        "architect-reviewer"
      ],
      "parallelExecution": true,
      "failOnCritical": true,
      "failOnHigh": true
    }
  }
}
```

### 2. 配置预提交钩子

```bash
# 安装预提交钩子
chmod +x scripts/multi-agent-pre-commit.ts
cp scripts/multi-agent-pre-commit.ts .git/hooks/pre-commit
```

### 3. 详细配置

使用提供的配置文件模板：

```bash
cp .neovate/multi-agent-code-review.json .neovate/code-review.json
```

## 🎯 使用方法

### 基本使用

```bash
# 运行完整的多代理审查
neovate --agent multi-agent-code-review

# 指定特定文件
neovate --agent multi-agent-code-review --files src/**/*.ts

# 指定特定代理
neovate --agent multi-agent-code-review --agents security-analyst,performance-optimizer

# 设置严重程度阈值
neovate --agent multi-agent-code-review --severity-threshold high
```

### 高级配置

```bash
# 并行执行（默认启用）
neovate --agent multi-agent-code-review --parallel-execution true

# 自动修复简单问题
neovate --agent multi-agent-code-review --auto-fix true

# 生成详细报告
neovate --agent multi-agent-code-review --output-format detailed

# 限制文件数量
neovate --agent multi-agent-code-review --max-files 20
```

## 📊 报告和输出

### 报告格式

系统支持多种输出格式：

- **Summary**: 简洁的控制台输出
- **Detailed**: 详细的文本报告
- **JSON**: 机器可读的JSON格式
- **HTML**: 交互式网页报告
- **Markdown**: 文档友好的Markdown格式

### 报告内容

每个报告包含：

1. **执行摘要**: 关键发现和风险概览
2. **按代理分组的结果**: 每个代理的详细分析
3. **优先级排序的问题**: 按严重程度排序
4. **修复建议**: 具体的代码示例和步骤
5. **质量评分**: 各维度的量化评分
6. **趋势分析**: 历史数据对比（如果启用）

### 示例输出

```
🤖 多代理代码审查结果
============================================================
📊 总问题数: 15
🚨 关键问题: 2
⚠️  高优先级问题: 5

📋 按分类统计:
  🔒 security: 6
  ⚡ performance: 3
  📝 quality: 4
  🏗️ architecture: 2

🔥 关键问题 (前5个):
  1. 安全漏洞: SQL注入风险
     在用户认证模块发现SQL注入漏洞
     📍 src/auth/UserService.js:45
  2. 性能问题: 同步I/O操作
     在数据处理模块发现阻塞式I/O操作
     📍 src/utils/DataProcessor.js:23
============================================================
```

## ⚙️ 配置选项

### 代理配置

```json
{
  "multiAgent": {
    "agents": ["security-analyst", "performance-optimizer", "quality-assessor", "architect-reviewer"],
    "parallelExecution": true,
    "failOnCritical": true,
    "failOnHigh": true,
    "maxFilesPerAgent": 20,
    "timeout": 300000
  }
}
```

### 触发条件

```json
{
  "autoExecution": {
    "enabled": true,
    "triggers": {
      "fileChanges": {
        "threshold": 5,
        "patterns": ["src/**/*.ts", "src/**/*.js"]
      },
      "criticalFiles": {
        "enabled": true,
        "patterns": [
          "src/auth/**/*",
          "src/security/**/*",
          "src/payment/**/*"
        ]
      }
    }
  }
}
```

### 报告配置

```json
{
  "reporting": {
    "enabled": true,
    "formats": ["html", "markdown", "json"],
    "includeTrends": true,
    "includeRecommendations": true,
    "saveResults": true,
    "resultsDir": ".neovate/reports",
    "retentionDays": 30
  }
}
```

## 🔍 代理详细说明

### 安全分析师 (security-analyst)

**专注领域**:
- 注入攻击检测 (SQL、NoSQL、命令注入)
- 跨站脚本攻击 (XSS) 防护
- 认证和授权安全
- 加密算法评估
- 敏感信息泄露检测

**检测规则**:
- 硬编码密钥和凭据
- 不安全的随机数生成
- 弱加密算法使用
- 输入验证缺失
- CSRF防护缺失

### 性能优化师 (performance-optimizer)

**专注领域**:
- 算法时间复杂度分析
- 内存泄漏检测
- I/O操作优化
- 数据库查询性能
- 前端渲染优化

**优化建议**:
- 循环和递归优化
- 缓存策略改进
- 异步操作优化
- 资源加载优化
- 数据库索引建议

### 质量评估师 (quality-assessor)

**专注领域**:
- 代码复杂度分析
- 命名规范检查
- 代码重复检测
- 文档质量评估
- 错误处理分析

**质量指标**:
- 圈复杂度
- 认知复杂度
- 函数长度
- 参数数量
- 测试覆盖率

### 架构审查师 (architect-reviewer)

**专注领域**:
- 设计模式应用
- 模块耦合分析
- 架构层次检查
- 接口一致性
- 依赖关系评估

**架构原则**:
- 单一职责原则
- 开闭原则
- 依赖倒置原则
- 接口隔离原则
- 关注点分离

## 🚨 集成示例

### Git预提交钩子

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 运行多代理代码审查..."
node scripts/multi-agent-pre-commit.ts

if [ $? -ne 0 ]; then
  echo "❌ 代码审查发现问题，请修复后再提交"
  exit 1
fi

echo "✅ 代码审查通过"
```

### CI/CD集成

```yaml
# .github/workflows/code-review.yml
name: Code Review
on: [push, pull_request]

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npx neovate --agent multi-agent-code-review --output-format json --file results.json
      - uses: actions/upload-artifact@v2
        with:
          name: code-review-results
          path: results.json
```

### VS Code集成

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Multi-Agent Code Review",
      "type": "shell",
      "command": "npx",
      "args": ["neovate", "--agent", "multi-agent-code-review", "--files", "${workspaceFolder}/src/**/*.ts"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    }
  ]
}
```

## 📈 性能优化

### 缓存策略
- 内存缓存：最近的分析结果
- 文件缓存：跨会话的结果持久化
- 智能失效：基于文件修改时间的缓存失效

### 并行处理
- 代理并行执行：多个代理同时分析
- 文件分片：大文件集合的并行处理
- 资源限制：防止系统过载

### 增量分析
- 变更检测：只分析修改的文件
- 依赖追踪：分析文件依赖关系
- 智能过滤：排除不相关的文件

## 🔧 故障排除

### 常见问题

**Q: 代理执行失败**
A: 检查代理配置和网络连接，查看日志文件获取详细错误信息

**Q: 性能问题**
A: 减少分析的文件数量，启用缓存，调整并行度设置

**Q: 报告生成失败**
A: 检查输出目录权限，确保有足够的磁盘空间

**Q: 预提交钩子不工作**
A: 确保钩子文件有执行权限，检查Git配置

### 调试模式

```bash
# 启用详细日志
DEBUG=neovate* neovate --agent multi-agent-code-review --verbose

# 单步执行
neovate --agent multi-agent-code-review --dry-run

# 检查配置
neovate --config-check
```

## 🤝 贡献指南

### 添加新代理

1. 在 `.iflow/agents/` 目录创建代理定义文件
2. 实现代理的分析逻辑
3. 添加相应的测试用例
4. 更新配置模板

### 扩展检测规则

1. 在相应代理文件中添加新的检测模式
2. 更新修复建议模板
3. 添加文档说明
4. 提交Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 🙏 致谢

感谢所有贡献者和开源社区的支持。

---

如有问题或建议，请提交 Issue 或 Pull Request。