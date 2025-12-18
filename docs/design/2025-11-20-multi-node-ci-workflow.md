# 多节点CI工作流与集成测试

**日期：** 2025-11-20

## 背景

项目当前的GitHub Actions工作流仅在Node 22上进行测试。为确保在支持的Node版本之间的兼容性并验证构建的CLI能正确工作，我们需要：

1. 在Node 18、20和22上测试构建和单元测试
2. 添加集成测试以运行构建的CLI与真实模型
3. 使用来自GitHub secrets的API密钥测试`iflow/qwen3-coder-plus`模型
4. 遵循`scripts/ready.ts`中建立的测试模式

目标是尽早发现兼容性问题，并在发布前确保分发的CLI工件按预期工作。

## 讨论

### 作业结构决策

考虑了三种用于组织CI工作流的选项：

**选项A：运行类似ready.ts的内联测试**
- 工作流中的所有步骤都是内联的
- 重复ready.ts逻辑

**选项B：直接运行ready.ts脚本**
- 最简单的方法
- 对CI特定需求的灵活性较低

**选项C：拆分为单独的作业（已选择）**
- 作业1：构建/单元测试
- 作业2：集成/CLI测试
- 关注点明确分离

选择了选项C以获得单元测试和集成测试之间更好的清晰度和分离。

### 多节点测试策略

评估了三种方法：

**方法1：矩阵构建+单一集成测试（已选择）**
- 在Node 18、20、22上进行构建/单元测试矩阵（并行）
- 仅在Node 22上进行集成测试（顺序）
- 重用构建工件
- 快速且高效

**方法2：对所有内容进行全面矩阵**
- 在所有Node版本上进行构建和集成测试
- 最全面但最慢
- 对iflow模型的API调用次数为3倍

**方法3：每个Node版本的组合作业**
- 每个Node版本的单一作业包含所有步骤
- 没有工件共享
- 简单但效率较低

选择了方法1作为全面测试和CI效率之间最佳平衡。它确保核心功能在Node兼容性，同时将集成测试集中在生产Node版本上。

### 关键决策

- **Node版本：** 在18、20、22上测试（当前LTS和最新版本）
- **集成范围：** 使用"hello"提示进行单一烟雾测试
- **模型：** `iflow/qwen3-coder-plus`（来自ready.ts）
- **密钥：** 使用`secrets.IFLOW_API_KEY`进行身份验证
- **工件策略：** 从Node 22构建上传，在集成作业中下载

## 方法

CI工作流拆分为两个顺序作业：

**作业1：构建和测试矩阵**
- 在Node 18、20和22上并行运行
- 每个版本执行：安装→构建→类型检查→格式化→单元测试
- Node 22作业上传构建工件（dist/）供下一个作业使用
- 任何版本失败都会停止整个工作流

**作业2：集成测试**
- 仅在Node 22上运行（依赖作业1的成功）
- 从作业1下载构建工件
- 使用iflow模型执行CLI：`node ./dist/cli.mjs -m iflow/qwen3-coder-plus -q --output-format json "hello"`
- 验证JSON输出
- 使用来自GitHub secrets的`IFLOW_API_KEY`

此设计确保在Node版本之间的兼容性，同时保持高效的集成测试。

## 架构

### 作业1：构建和测试矩阵

**配置：**
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
runs-on: ubuntu-latest
```

**步骤（所有Node版本）：**
1. 检出代码 (`actions/checkout@v4`)
2. 设置Node.js（来自矩阵）(`actions/setup-node@v4`)
3. 设置Bun 1.2.7 (`oven-sh/setup-bun@v1`) - 构建所需
4. 设置pnpm 10.8.0 (`pnpm/action-setup@v2`)
5. 安装依赖项：`pnpm install`
6. 构建项目：`pnpm build`
7. 类型检查：`pnpm typecheck`
8. 格式检查：`pnpm format`
9. 运行单元测试：`pnpm test`

**工件上传（仅Node 22）：**
- 条件：`if: matrix.node-version == '22'`
- 上传：`dist/` 目录
- 工件名称：`dist-node-22`
- 供集成测试作业使用

### 作业2：集成测试

**配置：**
```yaml
needs: [build-and-test]
runs-on: ubuntu-latest
```

**环境：**
- `IFLOW_API_KEY: ${{ secrets.IFLOW_API_KEY }}`

**步骤：**
1. 检出代码（用于依赖项）
2. 设置Node.js 22
3. 设置pnpm 10.8.0
4. 安装生产依赖项：`pnpm install --prod`
5. 下载工件：`dist-node-22`
6. 运行CLI测试：
   ```bash
   node ./dist/cli.mjs -m iflow/qwen3-coder-plus -q --output-format json "hello"
   ```
7. 验证JSON输出（解析以确保有效的JSON）

### 错误处理

**构建矩阵失败：**
- 任何Node版本失败都会停止整个工作流
- 明确归属 - 可以确定哪个Node版本和步骤失败了
- 不允许部分成功

**集成测试失败：**

API身份验证：
- 缺少`IFLOW_API_KEY` → CLI身份验证错误，作业失败
- 无效API密钥 → CLI错误，作业失败
- 解决方案：确保在仓库设置中配置了密钥

CLI执行：
- 非零退出码 → 立即作业失败
- 无效JSON输出 → 验证步骤捕获并失败
- 超时：可以添加步骤超时（例如，10分钟）

网络问题：
- iflow API无法访问 → 作业失败
- 偶尔的波动被接受，支持手动重运行

### 测试覆盖

**单元测试（作业1）：**
- 通过`pnpm test`进行完整测试套件
- 在Node 18、20和22上测试
- 早期发现兼容性问题

**集成测试（作业2）：**
- 使用"hello"提示进行单一烟雾测试
- 验证：CLI执行，模型响应，JSON输出有效
- 范围集中 - 全面的端到端测试是分开的

### 实现细节

**文件：** `.github/workflows/test.yml`（替换现有）

**必需的GitHub密钥：**
- 名称：`IFLOW_API_KEY`
- 范围：仓库密钥
- 必须在第一次工作流运行前配置

**估计CI时间：**
- 作业1（并行）：~5-8分钟
- 作业2（顺序）：~2-3分钟  
- 总计：~7-11分钟每次运行

**迁移说明：**
- 当前工作流仅测试Node 22
- 新工作流扩展到18、20、22并添加集成测试
- 无破坏性变更，纯增强
- 现有触发器（推送到master，PRs）保持不变
