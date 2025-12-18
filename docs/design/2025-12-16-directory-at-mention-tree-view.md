# 目录 @-提及 树视图

**日期:** 2025-12-16

## 背景

目前，当用户在提示中使用 `@directory` 语法时，`src/at.ts` 模块将其处理为文件组 - 递归读取目录中的所有文件并以 XML 格式返回它们的完整内容。这种方法存在限制:

- 对于大型目录返回太多内容
- 不提供目录结构的快速概览
- 当用户只想了解目录中有什么时效率低下

目标是改变行为，以便当使用 `@directory` 时，系统返回树结构可视化（类似于 `src/tools/ls.ts` 的输出）而不是读取所有文件内容。

## 讨论

### 关键问题和决定

**Q1: 目录输出应该使用什么格式?**
- **决定:** 使用缩进的树结构（类似于 `ls` 工具输出）
- 清晰显示层次关系
- 与现有工具行为一致

**Q2: 文件（非目录）应该如何处理?**
- **决定:** 文件应保持当前行为（读取并返回完整内容）
- 只有目录更改为树视图
- 这允许混合使用: `@src @README.md` 将显示 `src` 的树和 `README.md` 的内容

**Q3: 目录列表应该是递归的还是单层的?**
- **决定:** 递归的（重用 `ls.ts` 中现有的 `listDirectory` 逻辑）
- 匹配用户熟悉的 ls 工具的行为
- 尊重现有限制（MAX_FILES = 1000）和忽略模式

**Q4: 什么标签应该包装目录树输出?**
- **决定:** 使用 `<directory_structure>` 标签
- 与文件内容区分（`<files>` 标签）
- 描述性强且清晰

### 考虑的权衡

**方法 A (已选择): 直接重用 ls 工具逻辑**
- ✅ 代码重用 - 利用现有的 `listDirectory`, `createFileTree`, `printTree` 函数
- ✅ 与 ls 工具的行为一致性
- ✅ 无依赖注入问题
- ⚠️ 需要通过 `productName` 参数

**方法 B: 返回标记并委托给调用者**
- ✅ `at.ts` 的单一职责
- ❌ 需要对调用链进行更广泛的重构
- ❌ 更复杂的集成

**方法 C: 在 at.ts 中实现简化的树**
- ✅ 完全独立
- ❌ 代码重复
- ❌ 与 ls 工具行为的潜在不一致性

## 方法

修改 `src/at.ts` 中的 `At` 类以:

1. **检测和分类** `@` 路径为文件 vs 目录
2. **处理文件** 使用现有的 `renderFilesToXml()` 方法
3. **处理目录** 使用新的 `renderDirectoriesToTree()` 方法，该方法:
   - 调用 `listDirectory()` 获取所有文件/子目录
   - 调用 `createFileTree()` 构建树结构
   - 调用 `printTree()` 格式化为可读字符串
   - 用 `<directory_structure>` 标签包装输出
4. **合并** 文件和目录处理的结果

## 架构

### 组件更改

**文件: `src/at.ts`**

**新导入:**
```typescript
import {
  createFileTree,
  listDirectory,
  printTree,
} from './utils/list';
```

**修改的构造函数:**
```typescript
private productName: string;

constructor(opts: { 
  userPrompt: string; 
  cwd: string; 
  productName?: string;
}) {
  this.userPrompt = opts.userPrompt;
  this.cwd = opts.cwd;
  this.productName = opts.productName || 'neovate-code';
}
```

**重构的 `getContent()` 方法:**
```typescript
getContent() {
  const prompt = this.userPrompt || '';
  const ats = this.extractAtPaths(prompt);
  const files: string[] = [];
  const directories: string[] = [];
  
  // 步骤 1: 分类文件 vs 目录
  for (const at of ats) {
    const filePath = path.resolve(this.cwd, at);
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isFile()) {
        files.push(filePath);
      } else if (fs.statSync(filePath).isDirectory()) {
        directories.push(filePath);
      }
    }
  }
  
  // 步骤 2: 分别处理并合并
  let result = '';
  if (files.length > 0) {
    result += this.renderFilesToXml(files);
  }
  if (directories.length > 0) {
    result += this.renderDirectoriesToTree(directories);
  }
  
  return result || null;
}
```

**新方法 `renderDirectoriesToTree()`:**
```typescript
private renderDirectoriesToTree(directories: string[]): string {
  let treeOutput = '';
  
  for (const dir of directories) {
    try {
      // 使用现有实用程序获取文件列表
      const fileList = listDirectory(
        dir, 
        this.cwd, 
        this.productName
      ).sort();
      
      // 处理空目录
      if (fileList.length === 0) {
        treeOutput += `\\n<directory_structure path=\"${path.relative(this.cwd, dir)}\">\\n(Empty directory)\\n</directory_structure>`;
        continue;
      }
      
      // 构建和格式化树
      const tree = createFileTree(fileList);
      const treeString = printTree(dir, tree);
      
      treeOutput += `\\n<directory_structure path=\"${path.relative(this.cwd, dir)}\">\\n${treeString}\\n</directory_structure>`;
    } catch (error) {
      // 优雅处理权限错误
      treeOutput += `\\n<directory_structure path=\"${path.relative(this.cwd, dir)}\">\\nError: Unable to read directory\\n</directory_structure>`;
    }
  }
  
  return treeOutput;
}
```

**更新的静态方法签名:**
```typescript
static normalizeLanguageV2Prompt(opts: {
  input: LanguageModelV2Prompt;
  cwd: string;
  productName?: string;  // 新参数
}): LanguageModelV2Prompt {
  // ... 现有代码 ...
  const at = new At({
    userPrompt,
    cwd: opts.cwd,
    productName: opts.productName,  // 传递
  });
  // ... 代码其余部分 ...
}
```

### 数据流

```
用户输入: "@src/components @README.md explain this"
    ↓
extractAtPaths() → ["src/components", "README.md"]
    ↓
分类:
  - 文件: ["README.md"]
  - 目录: ["src/components"]
    ↓
renderFilesToXml(文件) → <files>...</files>
renderDirectoriesToTree(目录) → <directory_structure>...</directory_structure>
    ↓
合并输出到 LLM
```

### 错误处理

1. **空目录:** 显示 `(Empty directory)` 消息
2. **权限错误:** 显示错误消息但继续处理其他路径
3. **文件计数限制:** 由 `listDirectory` 自动处理（MAX_FILES = 1000）
4. **不存在的路径:** 静默跳过（现有行为）

### 集成点

**需要修改的调用者:**
- 定位所有 `At.normalizeLanguageV2Prompt()` 的调用
- 向选项对象添加 `productName` 参数
- 确保 `productName` 在调用上下文中可用

### 测试覆盖

推荐的测试场景:
- ✅ 单个文件: `@README.md`
- ✅ 单个目录: `@src`
- ✅ 混合: `@src @package.json`
- ✅ 嵌套目录: `@src/utils`
- ✅ 空目录
- ✅ 大目录 (>1000 文件)
- ✅ 权限被拒目录

### 输出格式示例

**输入:** `@src`

**输出:**
```
<directory_structure path="src">
- /Users/xierenhong/project/src/
  - at.ts
  - constants.ts
  - tools/
    - ls.ts
    - read.ts
  - utils/
    - list.ts
</directory_structure>
```

## 实现检查清单

- [ ] 向 `src/at.ts` 添加导入
- [ ] 向 `At` 类添加 `productName` 字段
- [ ] 更新构造函数以接受 `productName` 参数
- [ ] 重构 `getContent()` 以分类文件 vs 目录
- [ ] 实现 `renderDirectoriesToTree()` 方法
- [ ] 更新 `normalizeLanguageV2Prompt()` 签名
- [ ] 定位并更新所有调用者以传递 `productName`
- [ ] 测试上述列出的所有场景
- [ ] 如需更新文档
