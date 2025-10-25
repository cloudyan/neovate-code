# ccm config

ccm config

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
    zhipu: {
      url: 'https://open.bigmodel.cn/api/anthropic',
      token: zhuipuToken,
      description: '智谱AI (Zhipu)',
      models: ['GLM-4.6'],
      created: new Date().toISOString()
    },
    qwen: {
      url: 'https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy',
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

通过命令行，可以配置使用哪个供应商，哪个模型，对应 claude 的配置 `~/.claude/settings.json` 中的变量 `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`。

```js
// 魔搭（ModelScope）
// apiKey: 你的魔搭Access Token（去掉ms-前缀）
// models
//   - qwen3-coder-plus
//   - Qwen/Qwen3-Coder-480B-A35B-Instruct
{
  "env": {
    "ANTHROPIC_API_KEY": "你的魔搭API Key（去掉ms-前缀）",
    "ANTHROPIC_BASE_URL": "https://api-inference.modelscope.cn",
  },
  "model": "ZhipuAI/GLM-4.6"
}
```

```bash
⚙️  Available configurations:

* modelscope --- https://api-inference.modelscope.cn
  zhipu -------- https://open.bigmodel.cn/api/anthropic
  deepseek ----- https://api.deepseek.com/anthropic
  qwen --------- https://dashscope.aliyuncs.com/api/v2/apps/
  kimi --------- https://api.moonshot.cn/anthropic
  anyrouter ---- https://anyrouter.top

📍 Current: modelscope (Qwen/Qwen3-Coder-480B-A35B-Instruct)
```

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
