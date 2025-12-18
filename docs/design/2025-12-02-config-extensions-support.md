# 配置扩展支持

**日期：** 2025-12-02

## 背景

目前，Neo的配置系统通过`VALID_CONFIG_KEYS`执行严格验证，以确保只能设置预定义的配置项。尽管这种设计保证了配置安全性，但也引入了一个限制：基于Neo定制构建的第三方代理无法添加自己的配置项，因为白名单中没有的任何配置键都将在验证期间被拒绝。

**核心问题：**
- 第三方代理需要存储自己的配置信息
- 现有的`VALID_CONFIG_KEYS`验证机制阻止了自定义配置
- 需要一个通用、可扩展的方法来允许第三方添加，同时保留现有的验证机制

## 讨论

### 解决方案选项
在讨论中探索了三种潜在的实现方法：

**选项1：白名单扩展（最小变更）**
- 向白名单添加新的`extensions`字段
- 在`extensions`内部不执行验证
- 重用现有的配置管理逻辑
- **优势：** 最小变更，风险最低，实现简单
- **劣势：** 仍需要在白名单中显式声明

**选项2：双轨系统（保留验证+扩展通道）**
- 在所有验证逻辑中添加特殊处理
- 区分"官方配置"和"扩展配置"
- **优势：** 更灵活，未来可扩展
- **劣势：** 需要修改多个方法，复杂性较高

**选项3：前缀豁免（支持任意扩展字段）**
- 允许具有特定前缀（例如`x-`）的字段绕过验证
- **优势：** 最灵活
- **劣势：** 可能过度工程化（YAGNI）

**最终选择：** 选项1 - 白名单扩展

### 命名讨论
考虑了三个扩展配置字段名称选项：
- `extensions` - 技术性，明确表示扩展功能 ✓ **已选择**
- `custom` - 简洁但语义不够明确
- `agents` - 过于业务导向，限制使用场景

### 功能支持范围
需要支持完整的配置操作：
- **读取（get）：** 检索扩展配置值
- **设置（set）：** 写入扩展配置
- **删除（remove）：** 删除扩展配置
- **嵌套路径访问：** 支持点表示法，如`extensions.myAgent.customKey`

## 方法

采用**最小侵入式**设计方法：

1. **向Config类型添加`extensions`字段**
   - 类型定义为`Record<string, any>`，允许任意结构
   - 第三方可以在此字段下自由组织配置

2. **将`extensions`纳入配置系统管理**
   - 添加到`VALID_CONFIG_KEYS`以确保字段名称保护
   - 添加到`OBJECT_CONFIG_KEYS`以启用对象合并和嵌套访问
   - 在`DEFAULT_CONFIG`中设置默认值为空对象

3. **重用所有现有逻辑**
   - 无需修改任何方法实现
   - 自动支持全局/项目配置合并
   - 自动支持点表示法路径访问
   - 自动支持命令行操作

**核心优势：**
- 对现有代码的最小变更（仅4个常量/类型修改）
- 以零风险引入新功能
- 与现有配置体验一致
- 第三方扩展配置与官方配置具有同等地位

## 架构

### 类型系统扩展

```typescript
export type Config = {
  // ... 现有字段
  extensions?: Record<string, any>;  // 新增
};
```

### 配置常量更新

```typescript
const DEFAULT_CONFIG: Partial<Config> = {
  // ... 现有配置
  extensions: {},  // 新增
};

const VALID_CONFIG_KEYS = [
  // ... 现有键
  'extensions',  // 新增
];

const OBJECT_CONFIG_KEYS = [
  'mcpServers', 
  'commit', 
  'provider', 
  'extensions'  // 新增
];
```

### 配置文件结构示例

**全局配置** (`~/.neo/config.json`)：
```json
{
  "model": "gpt-4",
  "extensions": {
    "myAgent": {
      "apiEndpoint": "https://api.example.com",
      "timeout": 5000
    }
  }
}
```

**项目配置** (`.neo/config.json`)：
```json
{
  "extensions": {
    "myAgent": {
      "timeout": 3000
    },
    "anotherAgent": {
      "customField": "value"
    }
  }
}
```

### 配置合并行为

使用`defu`深度合并策略，项目配置将覆盖全局配置：

```json
{
  "model": "gpt-4",
  "extensions": {
    "myAgent": {
      "apiEndpoint": "https://api.example.com",
      "timeout": 3000  // 项目配置覆盖
    },
    "anotherAgent": {
      "customField": "value"  // 项目特定
    }
  }
}
```

### 使用方法

**编程访问：**
```typescript
const config = configManager.config;
const myAgentConfig = config.extensions?.myAgent;
if (myAgentConfig) {
  const endpoint = myAgentConfig.apiEndpoint;
}
```

**命令行操作：**
```bash
# 设置
neo config set extensions.myAgent.apiEndpoint "https://api.example.com"

# 获取
neo config get extensions.myAgent.apiEndpoint

# 删除
neo config remove extensions.myAgent.timeout
```

### 实现细节

**需要修改的文件：** `src/config.ts`

**修改位置：**
1. Config类型定义（~51-72行）- 添加`extensions?: Record<string, any>`
2. DEFAULT_CONFIG（~74-86行）- 添加`extensions: {}`
3. VALID_CONFIG_KEYS（~87-103行）- 添加`'extensions'`
4. OBJECT_CONFIG_KEYS（~105行）- 添加`'extensions'`

**无需修改的部分：**
- ConfigManager类中的所有方法（自动支持）
- 配置加载/保存逻辑（自动兼容）
- 配置合并逻辑（自动生效）

### 错误处理

**现有保护机制：**
- `VALID_CONFIG_KEYS`验证防止字段名拼写错误
- 点表示法路径验证确保安全嵌套访问
- JSON解析错误将被`loadConfig`捕获并提示

**对于extensions内部：**
- **不执行类型验证**，完全由第三方管理
- 建议第三方在自己的代码中添加配置验证
- 无效的JSON格式将在加载期间被捕获

### 文档更新建议

需要在用户文档中明确：
- `extensions`字段的目的和使用场景
- 第三方代理开发者如何使用扩展配置
- 配置示例和最佳实践
- 配置合并规则说明

## 总结

通过引入`extensions`配置字段，以最少的代码变更（仅4个常量/类型修改）实现了对第三方代理自定义配置的完整支持。此解决方案充分重用了现有的配置管理基础设施，保持了API一致性，并为生态系统扩展提供了安全、灵活的配置通道。
