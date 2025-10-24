# 阶段1: 智能结构分析

> **注意**: 阶段1 在阶段0 完成后执行,基于项目画像进行针对性分析
> **时长**: 15-20分钟
> **目标**: 快速建立项目全局认知,识别核心模块和优先级

---

## 🎯 目标

快速扫描项目结构,建立全局认知,识别核心模块并确定优先级,为后续深度分析提供指导。

---

## 📋 执行步骤

### Step 1.1: 项目元信息收集

```markdown
任务清单:
- [ ] 读取 package.json/pyproject.toml/go.mod 识别项目类型
- [ ] 读取 README.md 理解项目定位
- [ ] 检查 CHANGELOG.md 了解演进历史
- [ ] 分析 .gitignore 识别技术栈
- [ ] 统计代码规模 (文件数、代码行数、贡献者)
```

#### 实现方法

```bash
# 检测项目类型
if [ -f "package.json" ]; then
  echo "Node.js/TypeScript 项目"
  npm_package_name=$(grep '"name"' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[:space:]')
  echo "项目名称: $npm_package_name"
fi

if [ -f "pyproject.toml" ]; then
  echo "Python 项目"
fi

if [ -f "go.mod" ]; then
  echo "Go 项目"
fi

# 统计代码规模
files_count=$(find src -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" | wc -l)
echo "源码文件数: $files_count"

# 统计贡献者
contributors=$(git shortlog -sn | wc -l)
echo "贡献者数量: $contributors"
```

### Step 1.2: 目录结构智能分析

#### 分析报告格式

```typescript
// 生成结构分析报告
interface StructureAnalysisReport {
  项目类型: "CLI工具" | "Web应用" | "库" | "框架" | "移动应用" | "桌面应用";
  技术栈: string[];  // ["TypeScript", "React", "Node.js"]
  核心目录: Record<string, string>; // {"src/": "源码主目录", "src/commands/": "命令系统"}
  复杂度评分: {
    文件数: number;
    代码行数: number;
    目录层级: number;
    评级: "简单" | "中等" | "复杂" | "非常复杂";
  };
}
```

#### 目录分析脚本

```bash
# 分析目录结构
echo "## 目录结构分析"
find src -maxdepth 3 -type d | sort | while read dir; do
  file_count=$(find "$dir" -maxdepth 1 -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | wc -l)
  if [ $file_count -gt 0 ]; then
    echo "- $dir/ ($file_count 个文件)"
  fi
done

# 识别核心目录
core_dirs=("src/commands/" "src/components/" "src/services/" "src/utils/" "src/lib/")
for dir in "${core_dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "核心目录: $dir"
  fi
done
```

### Step 1.3: 核心模块识别

#### 优先级算法

基于以下规则自动识别核心模块:

```markdown
优先级评分 = 入口文件权重×3 + 被引用次数×2 + 代码行数×1 + 关键词匹配

1. **入口文件权重 x3** (index.ts, main.ts, app.ts, App.tsx)
2. **被引用次数权重 x2** (import统计, 使用 grep 命令)
3. **代码行数权重 x1** (LOC > 300的文件)
4. **关键词匹配** (含 core/engine/manager/controller/service/util)
5. **配置文件指向** (tsconfig paths, webpack entry, package.json main)
```

#### 实现脚本

```bash
# 扫描所有 TypeScript/JavaScript 文件
find src -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | while read file; do

  # 计算权重
  weight=0

  # 入口文件检测
  if [[ "$file" == *"index.ts" || "$file" == *"main.ts" || "$file" == *"app.ts" || "$file" == *"App.tsx" ]]; then
    weight=$((weight + 3))
  fi

  # 代码行数检测
  loc=$(wc -l < "$file")
  if [ $loc -gt 300 ]; then
    weight=$((weight + 1))
  fi

  # 关键词匹配
  if grep -q "core\|engine\|manager\|controller\|service\|util" "$file"; then
    weight=$((weight + 1))
  fi

  # 被引用次数
  references=$(grep -r "import.*from.*$(basename "$file" .ts)" src/ | wc -l)
  weight=$((weight + references * 2))

  echo "$file: $weight (LOC: $loc, 引用: $references)"

done | sort -t: -k2 -nr | head -10
```

### Step 1.4: 复杂度评估与文档规划

#### 复杂度评估表

```markdown
| 模块 | 文件数 | LOC | 引用数 | 复杂度 | 文档深度 |
|------|--------|-----|--------|--------|----------|
| src/loop.ts | 1 | 450 | 15 | ⭐⭐⭐⭐⭐ | 深度详解 |
| src/context.ts | 1 | 280 | 32 | ⭐⭐⭐⭐ | 核心架构 |
| src/tools/ | 25 | 3200 | 8 | ⭐⭐⭐ | 分类概览 |
| src/utils/ | 12 | 800 | 45 | ⭐⭐⭐⭐ | 核心工具 |
| src/services/ | 8 | 1200 | 22 | ⭐⭐⭐⭐ | 服务说明 |
```

#### 文档深度规划

根据复杂度制定文档深度:

- **复杂度 ⭐⭐⭐⭐⭐** (5+ 页): 架构图 + 流程图 + 代码解析 + 示例 + 最佳实践
- **复杂度 ⭐⭐⭐⭐** (3-4 页): 设计原理 + 关键代码 + 使用方式 + 常见问题
- **复杂度 ⭐⭐⭐** (1-2 页): 功能列表 + 典型示例 + 快速参考
- **复杂度 ⭐⭐** (0.5-1 页): 简要说明 + 基本用法

---

## 📊 输出产物

```
wikirepo/
├── 00-analysis-report.md          # 结构分析报告
├── 00-module-priority.md          # 模块优先级列表
└── 00-documentation-plan.md       # 文档生成计划
```

### 1. 结构分析报告 (`00-analysis-report.md`)

```markdown
# 项目结构分析报告

> 生成时间: 2025-10-24
> 分析耗时: 2.3 分钟

## 📊 项目概览

- **项目类型**: CLI 工具
- **技术栈**: TypeScript, Node.js, Ink
- **核心目录**:
  - `src/commands/` - 命令系统 (15 文件)
  - `src/tools/` - 工具系统 (25 文件)
  - `src/utils/` - 工具函数 (12 文件)

## 📈 复杂度评估

- **文件总数**: 150
- **代码行数**: 15,000
- **目录层级**: 4
- **总体评级**: 中等复杂度

## 🎯 核心模块识别

基于优先级算法识别出以下核心模块:

1. `src/loop.ts` - AI 循环引擎 (权重: 45)
2. `src/context.ts` - 上下文管理 (权重: 38)
3. `src/project.ts` - 项目管理 (权重: 32)
4. `src/tools/` - 工具系统 (权重: 28)
...
```

### 2. 模块优先级列表 (`00-module-priority.md`)

```markdown
# 模块优先级列表

| 排名 | 模块 | 权重 | LOC | 引用数 | 复杂度 | 文档深度 |
|------|------|------|-----|--------|--------|----------|
| 1 | src/loop.ts | 45 | 450 | 15 | ⭐⭐⭐⭐⭐ | 深度详解 |
| 2 | src/context.ts | 38 | 280 | 32 | ⭐⭐⭐⭐ | 核心架构 |
| 3 | src/project.ts | 32 | 320 | 18 | ⭐⭐⭐⭐ | 核心架构 |
| 4 | src/tools/ | 28 | 3200 | 8 | ⭐⭐⭐ | 分类概览 |
| 5 | src/utils/ | 25 | 800 | 45 | ⭐⭐⭐⭐ | 核心工具 |
```

### 3. 文档生成计划 (`00-documentation-plan.md`)

```markdown
# 文档生成计划

## 📅 生成顺序

按优先级顺序生成文档:

1. **第1批** (高优先级): Loop, Context, Project 模块
2. **第2批** (中优先级): Tools, Utils, Services
3. **第3批** (低优先级): 其他辅助模块

## 📝 文档深度规划

### 深度详解 (5+ 页)
- `src/loop.ts` - AI 循环引擎
  - 架构图 + 流程图
  - 完整代码解析
  - 使用示例
  - 性能优化建议

### 核心架构 (3-4 页)
- `src/context.ts` - 上下文管理
- `src/project.ts` - 项目管理
  - 设计原理
  - 关键代码
  - 使用方式

### 分类概览 (1-2 页)
- `src/tools/` - 工具系统
  - 功能列表
  - 典型示例
  - 快速参考
```

---

## 🔧 技术实现

### 依赖分析工具

```bash
# 使用 madge 生成依赖图
npx madge --extensions ts,tsx,js,jsx --image dependency-graph.svg src/

# 使用 dependency-cruiser 分析依赖
npx dependency-cruiser --config .dependency-cruiser.json src/
```

### 代码统计工具

```bash
# 使用 cloc 统计代码
cloc src/ --by-file --csv

# 使用 wc 统计行数
find src -name "*.ts" -o -name "*.js" | xargs wc -l
```

---

## 🎯 与阶段0的集成

阶段1 基于阶段0的项目画像进行针对性分析:

- 使用 `documentation_strategy` 选择分析重点
- 基于 `architecture.pattern` 调整分析方法
- 参考 `business` 信息决定分析深度
- 利用 `knowledge_base` 补充分析维度

**示例**: 对于 Next.js 项目,重点关注:
- App Router 结构
- Server Components 使用情况
- API Routes 端点
- 数据获取模式

---

## 📈 质量指标

- **分析准确率**: >95%
- **核心模块覆盖率**: 100%
- **复杂度评估误差**: <10%
- **执行时间**: <20 分钟

---

**下一阶段**: [阶段2: 深度模块挖掘](../03-phase2-deep-analysis.md)
