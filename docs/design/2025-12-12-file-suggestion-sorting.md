# 按类型排序文件建议

**日期:** 2025-12-12

## 背景

当前的 `useFileSuggestion.ts` 钩子在用户在聊天输入框中输入 `@` 时提供文件路径建议。文件列表从 `utils.getPaths` 返回并根据查询进行过滤，但结果没有以有意义的方式排序。

目标是通过在建议下拉菜单中**优先显示代码文件而不是文档/配置文件**来改善开发者体验。当开发者输入 `@store` 时，他们最可能想要的是 `src/store.ts` 而不是 `docs/store-guide.md`。

## 讨论

### 语言文件 (优先级 1)
**问题:** 哪些扩展名应被优先视为"语言文件"？

**决定:** 所有常见的编程语言包括:
- TypeScript/JavaScript: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`
- 其他语言: `.py`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.h`, `.hpp`, `.rb`, `.swift`, `.kt`, `.scala`, `.cs`, `.php`, `.vue`, `.svelte`

### 文档/配置文件 (优先级 3 - 最后)
**问题:** 哪些文件类型应被视为"文档文件"？

**决定:** 扩展的文档 + 配置格式:
- 文档: `.md`, `.txt`, `.rst`, `.adoc`
- 配置: `.json`, `.yaml`, `.yml`, `.toml`

### 类内排序
**问题:** 每个类别内的项目应该如何排序？

**决定:** 基于相关性的排序:
1. 文件名以查询开头 → 最高优先级
2. 完整路径以查询开头
3. 文件名包含查询
4. 路径某处包含查询

### 实现方法
**问题:** 内联排序 vs. 提取的实用模块？

**决定:** 提取一个单独的实用模块 (`sortFilePaths.ts`) 用于:
- 更好的独立测试性
- 在代码库其他部分的可重用性
- 更清晰的关注点分离

## 方法

创建一个新的实用函数 `sortFilePaths(paths: string[], query: string): string[]`，该函数:

1. **按扩展名将** 每个文件分为三组:
   - 语言文件 (优先级 0)
   - 其他文件 (优先级 1)
   - 文档/配置文件 (优先级 2)

2. **按** 查询相关性对每个文件**评分**:
   - 文件名以查询开头 (分数 0)
   - 路径以查询开头 (分数 1)
   - 文件名包含查询 (分数 2)
   - 路径包含查询 (分数 3)

3. **先按** 类别**排序**，然后在每个类别内按相关性排序

## 架构

### 新文件: `src/ui/sortFilePaths.ts`

```typescript
const LANGUAGE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
  'rb', 'swift', 'kt', 'scala', 'cs', 'php', 'vue', 'svelte'
]);

const DOC_CONFIG_EXTENSIONS = new Set([
  'md', 'txt', 'rst', 'adoc',
  'json', 'yaml', 'yml', 'toml'
]);

function getExtension(path: string): string;
function getCategoryPriority(path: string): number;  // 0, 1, 或 2
function getRelevanceScore(path: string, query: string): number;  // 0, 1, 2, 或 3

export function sortFilePaths(paths: string[], query: string): string[];
```

### 修改文件: `src/ui/useFileSuggestion.ts`

```typescript
import { sortFilePaths } from './sortFilePaths';

// 在 matchedPaths useMemo 中:
const matchedPaths = useMemo(() => {
  if (!hasQuery) return [];
  
  let filtered = query === '' 
    ? paths 
    : paths.filter(path => path.toLowerCase().includes(query.toLowerCase()));
  
  return sortFilePaths(filtered, query);
}, [paths, hasQuery, query]);
```

### 示例行为

对于查询 `"store"` 和文件:
```
README.md, package.json, src/store.ts, src/ui/store.ts, docs/store-guide.md, utils/dataStore.py
```

排序结果:
```
src/store.ts          ← 语言文件, 文件名以 "store" 开头
src/ui/store.ts       ← 语言文件, 文件名以 "store" 开头
utils/dataStore.py    ← 语言文件, 文件名包含 "store"
package.json          ← 文档/配置文件
README.md             ← 文档/配置文件
docs/store-guide.md   ← 文档/配置文件, 包含 "store"
```
