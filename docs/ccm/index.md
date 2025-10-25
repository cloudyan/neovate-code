# ccm

> Claude Configuration Manager - 管理多个 Claude API 配置的工具

[![npm version](https://badge.fury.io/js/ccm.svg)](https://badge.fury.io/js/ccm)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)


## 安装

```bash
# 全局安装
npm install -g ccm

# 或者本地安装
npm install ccm
```

## 使用方法

```bash
# 显示交互菜单（推荐）
ccm

# 列出所有可用配置
ccm list
# 或使用别名
ccm ls
ccm ls

# 切换到指定配置
ccm zhipu

# 显示当前配置状态
ccm status

# 添加新配置
ccm add <alias> <url> <token> [描述]

# 删除配置
ccm remove <alias>

# 初始化配置
ccm init

# 显示帮助
ccm help
```

## 命令示例

```bash
# 切换到智谱AI
ccm zhipu

# 切换到魔搭平台
ccm modelscope

# 添加自定义配置
ccm add myapi "https://api.example.com" "sk-your-token" "My Custom API"

# 删除配置
ccm remove myapi
```

## 配置输出格式

配置列表采用类似 npm 镜像源的格式显示：

```
⚙️  Available configurations:

* modelscope --- https://api-inference.modelscope.cn
  zhipu -------- https://open.bigmodel.cn/api/anthropic
  deepseek ----- https://api.deepseek.com/anthropic
  qwen --------- https://dashscope.aliyuncs.com/api/v2/apps/
  kimi --------- https://api.moonshot.cn/anthropic
  anyrouter ---- https://anyrouter.top
  iflow --------

📍 Current: modelscope (Qwen/Qwen3-Coder-480B-A35B-Instruct)
```

- deepseek: https://api.deepseek.com/anthropic
- bailian: https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy
  - qwen3-coder-plus
- zhipu: https://open.bigmodel.cn/api/anthropic
- moonshot: https://api.moonshot.cn/anthropic
  - kimi-k2-turbo-preview
- modelscope: https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy
  - qwen/qwen2.5-coder-32b-instruct

## 预配置的服务商

工具内置了以下 Claude API 服务商配置：

- **zhipu** - 智谱AI (GLM-4.6)
- **modelscope** - 魔搭平台
- **deepseek** - DeepSeek
- **qwen** - 阿里云百炼平台 (Qwen3)
- **kimi** - 月之暗面 (Kimi K2)
- **anyrouter** - AnyRouter 代理服务

## 环境变量

切换配置后，工具会自动设置以下环境变量：

```bash
export ANTHROPIC_BASE_URL="<服务商URL>"
export ANTHROPIC_AUTH_TOKEN="<访问令牌>"

# Claude Code 环境变量配置
# 配置鉴权密钥，ANTHROPIC_API_KEY （或 ANTHROPIC_AUTH_TOKEN，二者只能任选一个配置，不可同时配）
export ANTHROPIC_API_KEY="sk-your-api-key-here"
# export ANTHROPIC_AUTH_TOKEN ="sk-your-api-key-here"
# 配置接口地址🪜 服务商URL
export ANTHROPIC_BASE_URL="https://openai.qiniu.com"
# 配置默认主要的模型
export ANTHROPIC_MODEL="deepseek-v3.1"
# 配置默认的 SONNET 模型
export ANTHROPIC_DEFAULT_SONNET_MODEL="x-ai/grok-code-fast-1"
# 新版本针对简单问题的处理模型配置
export ANTHROPIC_DEFAULT_HAIKU_MODEL="x-ai/grok-code-fast-1"
# 老版本针对简单问题的处理模型配置，根据测试，建议新版本也配上，减少报错情况
export ANTHROPIC_SMALL_FAST_MODEL="x-ai/grok-code-fast-1"
```

### --help

```bash
Claude 配置管理器 v1.0

一个用于管理多个 Claude API 配置的工具

用法:
    ccm [COMMAND] [OPTIONS]

命令:
    (no args)              显示交互菜单
    <alias>                通过别名切换配置
    status                 显示当前配置
    list                   列出所有配置
    add <alias> <url> <token> [desc]  添加新配置
    remove <alias>         删除配置
    init                   初始化配置
    help                   显示此帮助

示例:
    ccm                           # 交互菜单
    ccm zhipu                     # 切换到智谱配置
    ccm modelscope                # 切换到魔搭配置
    ccm status                    # 显示当前配置
    ccm list                      # 列出所有配置
    ccm add official "https://api.anthropic.com" "sk-ant-xxx" "官方 API"

配置:
    配置文件: ~/.ccm/config.json
    备份目录:  ~/.ccm/backup/`);
```

## 配置文件

- 配置文件：`~/.claude-configs/config.json`
- 备份目录：`~/.claude-configs/backup/`
- 历史日志：`~/.claude-configs/history.log`

## 特性

- ✨ 简洁的交互式配置切换
- 🔄 自动更新 shell 环境变量
- 📋 类 npm 镜像源的配置列表格式
- 🔒 安全的 token 掩码显示
- 🗂️ 自动备份配置历史
- 🎯 智能配置合并和更新

## 开发

```bash
# 克隆仓库
git clone <repository-url>
cd ccm

# 安装依赖
npm install

# 运行测试
npm test

# 开发模式
npm start
```

### 内置配置

```js
const defaultConfig = {
  configs: {
    modelscope: {
      url: 'https://api-inference.modelscope.cn',
      token: 'modelscope-example-token-1234567890',
      description: '魔搭 (ModelScope)',
      models: [
        'Qwen/Qwen3-Coder-480B-A35B-Instruct',
        'ZhipuAI/GLM-4.6'
      ],
      created: new Date().toISOString()
    },
    iflow: {
      url: 'https://apis.iflow.cn',
      token: zhuipuToken,
      description: 'IFlow',
      models: ['GLM-4.6'],
      created: new Date().toISOString()
    },
    zhipu: {
      url: 'https://open.bigmodel.cn/api/anthropic',
      token: zhuipuToken,
      description: '智谱AI (Zhipu)',
      models: ['GLM-4.6'],
      created: new Date().toISOString()
    },
    qwen: {
      url: 'https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy',
      // https://dashscope.aliyuncs.com/apps/anthropic
      token: 'qwen-example-token-1234567890',
      description: '阿里云百炼平台 (Qwen3)',
      models: ['qwen3-coder-plus'],
      created: new Date().toISOString()
    },
    kimi: {
      url: 'https://api.moonshot.cn/anthropic',
      token: 'kimi-example-token-1234567890',
      description: '月之暗面 (Kimi K2)',
      models: ['kimi-k2-0905-preview'],
      created: new Date().toISOString()
    },
    deepseek: {
      url: 'https://api.deepseek.com/anthropic',
      token: 'deepseek-example-token-1234567890',
      description: 'DeepSeek',
      models: ['deepseek-chat'],
      created: new Date().toISOString()
    },
    anyrouter: {
      url: anyrouterUrl,
      token: anyrouterToken,
      description: 'AnyRouter 代理服务',
      created: new Date().toISOString()
    }
  },
  current: 'zhipu',
  last_updated: new Date().toISOString()
};
```

通过命cms，可以配置供应商，及模型


config list 以及选择交互如下

```bash
Select Model

current model: iFlow/GLM-4.6 (glm-4.6)

▶ Anthropic官方
    claude-sonnet-4-5-20250929
────────────────────────────────────────
▶ ModelScope
  > Qwen/Qwen3-Coder-480B-A35B-Instruct
    moonshotai/Kimi-K2-Instruct
────────────────────────────────────────
▶ Moonshot
    kimi-k2-0711-preview
    kimi-k2-0905-preview
────────────────────────────────────────
▶ ZhipuAI
    glm-4.6
────────────────────────────────────────
▶ DeepSeek
    deepseek-reasoner
    deepseek-chat
────────────────────────────────────────
▶ iFlow
    qwen3-coder
    qwen3-coder-plus

(/: search, ↑↓: navigate, ←→: page, Enter: select, ESC: cancel)
```

切换选择对应会修改 claude 的 `~/.claude/settings.json` 如下配置

```js
// 魔搭（ModelScope）
// apiKey: 你的魔搭Access Token（去掉ms-前缀）
// 可选 models
//   - qwen3-coder-plus
//   - Qwen/Qwen3-Coder-480B-A35B-Instruct

{
  "env": {
    "ANTHROPIC_API_KEY": "你的魔搭API Key（去掉ms-前缀）",
    "ANTHROPIC_BASE_URL": "https://api-inference.modelscope.cn"
  },
  "model": "ZhipuAI/GLM-4.6"
}
```

## 许可证

[Apache-2.0](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！
