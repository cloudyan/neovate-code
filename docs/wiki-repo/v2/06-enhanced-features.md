# 增强功能设计

> **版本**: v2.0
> **更新日期**: 2025-10-24
> **状态**: 已优化增强功能方案

---

## 🎯 概述

本文档详细说明 v2 版本文档生成系统的增强功能，包括智能增量更新、多维质量评分系统和交互式补充机制。

---

## 🔄 1. 智能增量更新机制

### 1.1 增强的变更检测

```bash
#!/bin/bash
# enhanced-change-detection.sh

# 记录当前状态
CURRENT_COMMIT=$(git rev-parse HEAD)
LAST_COMMIT=$(cat wikirepo/.last-commit 2>/dev/null || echo "INIT")

# 获取变更文件（支持多种情况）
if [ "$LAST_COMMIT" = "INIT" ]; then
    # 首次运行，全量生成
    echo "首次运行，执行全量生成"
    CHANGED_FILES=$(find src -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx")
else
    # 增量运行，检测变更
    CHANGED_FILES=$(git diff --name-only $LAST_COMMIT $CURRENT_COMMIT -- "src/**" | \
        grep -E "\.(ts|js|tsx|jsx)$")
fi

# 分析变更影响范围
TOTAL_FILES=$(find src -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | wc -l)
CHANGED_COUNT=$(echo "$CHANGED_FILES" | wc -l)
CHANGE_PERCENT=$(echo "scale=2; $CHANGED_COUNT / $TOTAL_FILES * 100" | bc)

# 智能更新策略
if [ $(echo "$CHANGE_PERCENT < 5" | bc -l) -eq 1 ]; then
    STRATEGY="minimal"    # 只更新直接影响文件
elif [ $(echo "$CHANGE_PERCENT < 20" | bc -l) -eq 1 ]; then
    STRATEGY="moderate"   # 更新模块级文档
elif [ $(echo "$CHANGE_PERCENT < 40" | bc -l) -eq 1 ]; then
    STRATEGY="significant" # 更新架构级文档
else
    STRATEGY="full"       # 全量重新生成
fi

echo "变更文件数: $CHANGED_COUNT"
echo "总文件数: $TOTAL_FILES"
echo "变更比例: ${CHANGE_PERCENT}%"
echo "更新策略: $STRATEGY"

# 保存当前状态
echo "$CURRENT_COMMIT" > wikirepo/.last-commit
```

### 1.2 依赖关系感知更新

```typescript
interface UpdateStrategy {
    strategy: 'minimal' | 'moderate' | 'significant' | 'full';
    affectedModules: string[];
    affectedDocuments: string[];
    estimatedTime: number;
    changePercentage: number;
}

function calculateUpdateStrategy(changedFiles: string[]): UpdateStrategy {
    // 构建模块依赖图
    const dependencyGraph = buildDependencyGraph();

    // 计算受影响模块
    const affectedModules = new Set<string>();

    changedFiles.forEach(file => {
        const module = extractModuleFromPath(file);
        affectedModules.add(module);

        // 添加依赖该模块的所有模块
        const dependents = dependencyGraph.getDependents(module);
        dependents.forEach(dep => affectedModules.add(dep));
    });

    // 根据影响范围决定策略
    const totalModules = dependencyGraph.getModuleCount();
    const affectedPercent = (affectedModules.size / totalModules) * 100;

    let strategy: UpdateStrategy['strategy'];
    if (affectedPercent < 10) strategy = 'minimal';
    else if (affectedPercent < 30) strategy = 'moderate';
    else if (affectedPercent < 60) strategy = 'significant';
    else strategy = 'full';

    return {
        strategy,
        affectedModules: Array.from(affectedModules),
        affectedDocuments: calculateAffectedDocuments(affectedModules),
        estimatedTime: estimateUpdateTime(strategy, affectedModules.size),
        changePercentage: affectedPercent
    };
}
```

### 1.3 缓存优化配置

```yaml
# cache-config.yaml
cache:
  enabled: true
  ttl: 86400  # 24小时

  storage:
    type: "filesystem"  # 或 "redis", "memory"
    path: "./.wiki-cache"

  # 缓存策略
  strategies:
    - pattern: "**/architecture/**"
      ttl: 172800  # 48小时（架构文档变化较慢）
    - pattern: "**/api-reference/**"
      ttl: 43200   # 12小时（API文档可能频繁变化）
    - pattern: "**/core-modules/**"
      ttl: 86400   # 24小时
    - pattern: "**/guides/**"
      ttl: 259200  # 72小时（指南文档稳定）

# 缓存失效规则
invalidation:
  - on_file_change: true
  - on_dependency_update: true
  - on_template_change: true
  - manual_invalidation: true
  - scheduled_invalidation:
      enabled: true
      interval: 3600  # 每小时检查一次
```

### 1.4 更新策略矩阵

| 变更比例 | 策略 | 更新范围 | 预计时间 |
|----------|------|----------|----------|
| < 5%     | Minimal | 仅变更文件相关文档 | 5-15分钟 |
| 5-20%    | Moderate | 模块级文档更新 | 15-30分钟 |
| 20-40%   | Significant | 架构级文档更新 | 30-60分钟 |
| > 40%    | Full | 全量重新生成 | 60-120分钟 |

---

## 📊 2. 多维质量评分系统

### 2.1 评分维度定义

```typescript
interface QualityScore {
    // 基础维度（0-100）
    completeness: number;    // 完整性
    accuracy: number;       // 准确性
    readability: number;    // 可读性
    usability: number;      // 实用性

    // 高级维度（可选）
    maintainability?: number;  // 可维护性
    performance?: number;      // 性能优化
    security?: number;         // 安全性
    accessibility?: number;    // 可访问性

    // 综合评分
    weightedScore: number;
}

// 评分权重配置
const SCORE_WEIGHTS = {
    completeness: 0.3,      // 30%
    accuracy: 0.3,           // 30%
    readability: 0.2,        // 20%
    usability: 0.2,          // 20%
    maintainability: 0.1,    // 额外加分
    performance: 0.05,
    security: 0.05,
    accessibility: 0.05
};
```

### 2.2 智能评分算法

```typescript
// 完整性评分算法
function calculateCompleteness(doc: Document): number {
    let score = 0;

    // 章节完整性检查（40分）
    const requiredSections = ['概述', '设计原理', '关键流程', '代码解析', '使用示例'];
    const existingSections = extractSections(doc.content);
    score += Math.min((existingSections.filter(sec => requiredSections.includes(sec)).length / requiredSections.length) * 40, 40);

    // 代码示例（30分）
    const codeBlocks = doc.content.match(/```[\s\S]*?```/g) || [];
    score += Math.min((codeBlocks.length / 5) * 30, 30);  // 至少5个代码块

    // 图表完整性（30分）
    const diagrams = doc.content.match(/```mermaid[\s\S]*?```/g) || [];
    score += Math.min((diagrams.length / 3) * 30, 30);    // 至少3个图表

    return Math.round(score);
}

// 准确性评分算法
function calculateAccuracy(doc: Document): number {
    let score = 0;

    // 代码引用准确性（50分）
    const codeReferences = extractCodeReferences(doc.content);
    const accurateReferences = codeReferences.filter(ref =>
        verifyCodeReference(ref.filePath, ref.lineNumbers)
    );
    score += (accurateReferences.length / codeReferences.length) * 50;

    // 技术描述准确性（50分）
    const technicalClaims = extractTechnicalClaims(doc.content);
    const verifiedClaims = technicalClaims.filter(claim =>
        verifyTechnicalClaim(claim)
    );
    score += (verifiedClaims.length / technicalClaims.length) * 50;

    return Math.round(score);
}
```

### 2.3 AI辅助质量评估

```python
def ai_quality_assessment(document_content: str) -> dict:
    """使用AI模型进行文档质量评估"""

    # 语义分析 - 理解文档内容语义
    coherence = analyze_coherence(document_content)
    relevance = analyze_relevance(document_content)
    depth = analyze_technical_depth(document_content)

    # 结构评估
    structure_score = analyze_structure(document_content)
    readability_score = analyze_readability(document_content)

    # 技术准确性检测
    technical_accuracy = detect_technical_errors(document_content)
    best_practices = check_best_practices_compliance(document_content)

    return {
        "semantic_coherence": coherence,
        "content_relevance": relevance,
        "technical_depth": depth,
        "structure_quality": structure_score,
        "readability": readability_score,
        "technical_accuracy": technical_accuracy,
        "best_practices_compliance": best_practices
    }
```

### 2.4 质量等级定义

| 评分范围 | 等级 | 颜色 | 说明 |
|----------|------|------|------|
| 90-100   | 🏆 优秀 | 绿色 | 文档质量极高，无需修改 |
| 80-89    | ✅ 良好 | 蓝色 | 文档质量良好，有小改进空间 |
| 70-79    | ⚠️ 一般 | 黄色 | 文档质量一般，需要改进 |
| 60-69    | ⚠️ 需改进 | 橙色 | 文档质量较差，需要重点改进 |
| 0-59     | ❌ 不合格 | 红色 | 文档质量不合格，需要重写 |

---

## 🤝 3. 交互式补充机制

### 3.1 智能问题识别

```typescript
interface InteractiveEnhancement {
    type: 'background' | 'verification' | 'addition' | 'correction';
    priority: 'high' | 'medium' | 'low';
    target: string;  // 文件或模块
    description: string;
    suggestions: string[];
    estimatedTime: number;
    confidence: number;  // 0-1 置信度
}

// 自动识别需要补充的内容
function identifyEnhancementNeeds(analysisResults: AnalysisResult[]): InteractiveEnhancement[] {
    const enhancements: InteractiveEnhancement[] = [];

    // 业务背景缺失检测
    analysisResults.forEach(result => {
        if (result.complexity > 3 && !hasSufficientBackground(result)) {
            enhancements.push({
                type: 'background',
                priority: result.priority > 3 ? 'high' : 'medium',
                target: result.filePath,
                description: `需要补充${extractModuleName(result.filePath)}模块的业务背景`,
                suggestions: [
                    '添加业务场景说明',
                    '补充使用案例',
                    '解释业务价值'
                ],
                estimatedTime: 10,  // 分钟
                confidence: 0.85
            });
        }
    });

    // 技术验证需求
    analysisResults.forEach(result => {
        const technicalClaims = extractTechnicalClaims(result.content);
        technicalClaims.forEach(claim => {
            if (claim.confidence < 0.8) {
                enhancements.push({
                    type: 'verification',
                    priority: 'medium',
                    target: result.filePath,
                    description: `需要验证技术描述: "${claim.text}"`,
                    suggestions: [
                        '请确认该技术描述是否准确',
                        '是否需要添加官方文档引用',
                        '是否有更好的表达方式'
                    ],
                    estimatedTime: 5,
                    confidence: 0.75
                });
            }
        });
    });

    return enhancements.sort((a, b) => {
        // 按优先级和置信度排序
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] - priorityOrder[a.priority]) ||
               (b.confidence - a.confidence);
    });
}
```

### 3.2 交互式界面设计

```typescript
// 交互式问答界面
interface EnhancementUI {
    // 问题呈现
    showQuestion(question: EnhancementQuestion): Promise<EnhancementResponse>;

    // 多选项界面
    showOptions(options: EnhancementOption[]): Promise<number[]>;

    // 代码编辑器集成
    showCodeEditor(filePath: string, suggestions: CodeSuggestion[]): Promise<CodeEdit[]>;

    // 图表验证
    showDiagramVerification(diagram: Diagram, expectedFlow: string[]): Promise<boolean>;

    // 批量处理
    batchProcess(enhancements: InteractiveEnhancement[]): Promise<BatchResult>;
}

// 示例交互流程
async function interactiveEnhancementWorkflow() {
    const enhancements = identifyEnhancementNeeds(analysisResults);

    for (const enhancement of enhancements) {
        switch (enhancement.type) {
            case 'background':
                const backgroundInfo = await ui.showQuestion({
                    type: 'text_input',
                    question: `请为 ${enhancement.target} 补充业务背景:`,
                    placeholder: '描述该模块的业务场景、使用案例和价值...',
                    maxLength: 1000
                });
                await applyBackgroundEnhancement(enhancement.target, backgroundInfo);
                break;

            case 'verification':
                const isAccurate = await ui.showOptions([
                    { id: 1, text: '技术描述准确', value: true },
                    { id: 2, text: '需要修正', value: false },
                    { id: 3, text: '不确定，需要研究', value: null }
                ]);

                if (!isAccurate) {
                    const correction = await ui.showCodeEditor(
                        enhancement.target,
                        enhancement.suggestions
                    );
                    await applyTechnicalCorrection(enhancement.target, correction);
                }
                break;
        }
    }
}
```

### 3.3 学习与自适应配置

```yaml
# learning-config.yaml
learning:
  enabled: true
  retention_days: 30  # 学习数据保留30天

# 用户偏好配置
user_preferences:
  - user: "developer@example.com"
    preferred_detail_level: "detailed"  # detailed/concise
    preferred_diagram_style: "mermaid"  # mermaid/plantuml/chart
    auto_approve_threshold: 0.85       # 置信度阈值

# 学习规则
learning_rules:
  - pattern: "经常拒绝某种类型的建议"
    action: "降低该类建议的优先级"
    weight: 0.8
  - pattern: "用户经常添加部署指南"
    action: "自动建议添加部署章节"
    weight: 0.9
  - pattern: "用户偏好某种图表风格"
    action: "默认使用该风格"
    weight: 0.95

# 自适应建议系统
adaptive_suggestions:
  enabled: true
  min_confidence: 0.7      # 最小置信度
  max_suggestions_per_session: 5  # 每次会话最多建议数
  cooldown_period: 300      # 5分钟冷却时间

  # 建议类型权重
  suggestion_weights:
    background: 1.0
    verification: 0.9
    addition: 0.8
    correction: 0.7
```

---

## 🚀 4. 集成使用方式

### 4.1 命令行集成

```bash
# 启用增量更新
neo wiki-generate --version v2 --incremental

# 启用质量评分
neo wiki-generate --version v2 --quality-check

# 启用交互式补充
neo wiki-generate --version v2 --interactive

# 组合使用
neo wiki-generate --version v2 --incremental --quality-check --interactive
```

### 4.2 API 调用示例

```typescript
// 使用增强功能的API调用
const result = await wikiGenerator.generate({
    version: 'v2',
    projectPath: './my-project',

    // 增强功能配置
    enhancements: {
        incremental: true,
        qualityScoring: true,
        interactive: true,

        // 详细配置
        incrementalConfig: {
            strategy: 'auto',  // auto/minimal/moderate/significant/full
            cacheEnabled: true
        },

        qualityConfig: {
            enabled: true,
            detailedReport: true,
            aiAssessment: true
        },

        interactiveConfig: {
            enabled: true,
            maxQuestions: 10,
            timeout: 300  // 5分钟
        }
    }
});
```

### 4.3 配置文件方式

```yaml
# wiki-config.yaml
version: "v2"

enhancements:
  incremental:
    enabled: true
    strategy: "auto"
    cache:
      enabled: true
      ttl: 86400

  quality:
    enabled: true
    dimensions:
      - completeness
      - accuracy
      - readability
      - usability
    ai_assessment: true

  interactive:
    enabled: true
    max_questions: 8
    types:
      - background
      - verification
      - addition
    learning: true
```

---

## 📈 5. 性能指标

### 5.1 增量更新性能

| 策略 | 平均时间 | 内存使用 | 文件处理数 |
|------|----------|----------|------------|
| Minimal | 5-15分钟 | 128MB | 1-10个文件 |
| Moderate | 15-30分钟 | 256MB | 10-50个文件 |
| Significant | 30-60分钟 | 512MB | 50-100个文件 |
| Full | 60-120分钟 | 1GB | 全部文件 |

### 5.2 质量评分性能

| 文档大小 | 评分时间 | AI评估时间 |
|----------|----------|------------|
| < 10KB | < 1秒 | 2-3秒 |
| 10-100KB | 1-3秒 | 5-10秒 |
| 100-500KB | 3-10秒 | 10-30秒 |
| > 500KB | 10-30秒 | 30-60秒 |

### 5.3 交互式补充性能

| 功能 | 平均响应时间 | 用户参与度 |
|------|--------------|------------|
| 背景补充 | 2-5分钟 | 高 |
| 技术验证 | 1-3分钟 | 中 |
| 内容添加 | 3-8分钟 | 高 |
| 错误修正 | 2-4分钟 | 中 |

---

## 🎯 6. 最佳实践

### 6.1 增量更新最佳实践

```bash
# 定期全量更新（建议每周一次）
0 2 * * 1 neo wiki-generate --version v2 --full

# 工作日增量更新
0 18 * * 1-5 neo wiki-generate --version v2 --incremental

# 重要提交后立即更新
git commit -m "feat: major changes" && neo wiki-generate --version v2 --incremental
```

### 6.2 质量监控最佳实践

```yaml
# 质量监控配置
quality_monitoring:
  enabled: true
  thresholds:
    min_score: 80
    max_variance: 15  # 允许的最大分数波动

  alerts:
    - condition: "score < 70"
      action: "notify_team"
    - condition: "score_drop > 20"
      action: "auto_rollback"
    - condition: "ai_confidence < 0.6"
      action: "request_human_review"
```

### 6.3 交互式补充最佳实践

```yaml
# 交互式配置优化
interactive_optimization:
  # 时间段优化
  working_hours:
    enabled: true
    start: "09:00"
    end: "18:00"
    max_questions: 5

  non_working_hours:
    enabled: false
    max_questions: 2

  # 问题优先级
  priority_mapping:
    high: ["security", "accuracy"]
    medium: ["completeness", "usability"]
    low: ["readability", "formatting"]
```

---

## 🔧 7. 故障排除

### 7.1 常见问题

```markdown
## 增量更新问题

### 问题: 变更检测不准确
**解决方案**:
- 检查 git 仓库状态: `git status`
- 清除缓存: `neo wiki-generate --clear-cache`
- 手动指定commit范围

### 问题: 缓存失效
**解决方案**:
- 检查缓存配置: 查看 `cache-config.yaml`
- 增加缓存TTL
- 使用更稳定的存储后端

## 质量评分问题

### 问题: 评分偏差较大
**解决方案**:
- 校准评分算法参数
- 增加AI评估权重
- 人工审核样本数据

## 交互式问题

### 问题: 用户响应超时
**解决方案**:
- 调整超时时间配置
- 优化问题表述
- 提供默认选项
```

### 7.2 调试模式

```bash
# 启用详细调试
neo wiki-generate --version v2 --debug --verbose

# 保存中间结果
neo wiki-generate --version v2 --save-intermediate

# 生成性能报告
neo wiki-generate --version v2 --perf-report

# 重置学习数据
neo wiki-generate --version v2 --reset-learning
```

---

## 📊 8. 监控指标

### 8.1 关键性能指标

```json
{
  "performance": {
    "total_time": 125.4,
    "incremental_savings": 65.2,
    "cache_hit_rate": 0.78,
    "memory_peak": 512.5
  },
  "quality": {
    "average_score": 87.3,
    "score_distribution": {
      "90-100": 0.35,
      "80-89": 0.45,
      "70-79": 0.15,
      "below_70": 0.05
    },
    "ai_confidence": 0.82
  },
  "interaction": {
    "questions_asked": 8,
    "user_response_rate": 0.75,
    "average_response_time": 120.5,
    "satisfaction_score": 4.2
  }
}
```

### 8.2 自动化报告

```bash
# 生成日报
neo wiki-generate --version v2 --daily-report

# 生成周报
neo wiki-generate --version v2 --weekly-report

# 生成质量趋势报告
neo wiki-generate --version v2 --trend-report

# 导出JSON格式报告
neo wiki-generate --version v2 --export-report report.json
```

---

## 🔮 9. 未来规划

### 9.1 短期计划
- [ ] 支持更多缓存后端 (Redis, MongoDB)
- [ ] 优化AI评估模型精度
- [ ] 增加多语言交互支持

### 9.2 中长期计划
- [ ] 机器学习优化建议系统
- [ ] 实时协作编辑支持
- [ ] 集成CI/CD流水线
- [ ] 移动端交互界面

---

## 📚 相关文档

- [v2 版本设计总览](../00-main-plan.md)
- [自动化提示词设计](../05-automation-prompts.md)
- [Prompt 使用指南](../07-prompt-usage-guide.md)
- [GitHub 项目地址](https://github.com/cloudyan/neovate-code)

---

**让文档生成更智能、更高效、更贴合项目需求!** 🚀
