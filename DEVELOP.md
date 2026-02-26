# 开发调试

### 两种方式：

#### 推荐：使用 link（软链接，方便开发调试）

```bash
npm run build
pnpm link --global
```

之后只需 npm run build 即可更新全局命令。

#### 方式二：直接安装

```bash
pnpm install -g .
```

### 取消链接：

```bash
pnpm unlink --global
```
