# CraftTranslate

CraftTranslate 是一个轻量 Windows 划词翻译工具。目标很简单：选中文字，按热键，在鼠标附近看到译文。

## 功能

- 全局热键触发，默认 `CommandOrControl+Shift+T`。
- 托盘常驻：打开设置、翻译当前选区、退出。
- 设置页配置热键、开机自启、源语言、目标语言和翻译提供者。
- 弹窗定位到鼠标附近，显示原文和译文。
- Provider 列表式配置，当前支持百度通用文本翻译和 OpenAI 兼容 `/chat/completions` API。

## 开发

```bash
pnpm install
pnpm tauri dev
```

## 验证

```bash
pnpm test
pnpm build
cd src-tauri && cargo test && cargo check
```

## 使用

1. 启动后打开设置页。
2. 在 Provider 列表里选择“百度通用文本翻译”，填写 APP ID 和密钥。
3. 需要大模型翻译时，切到“OpenAI 兼容接口”，填写接口地址、API Key 和模型。
4. 如果希望后台常驻，从托盘打开设置并启用“开机后自动启动”。

## GitHub

计划仓库名：`CraftTranslate`。首次推送前确认远端地址，例如：

```bash
git remote add origin https://github.com/heue/CraftTranslate.git
git branch -M main
git push -u origin main
```

不要把本地 `settings.json`、真实 API Key、构建产物或个人配置提交到仓库。

## 开源协议

MIT，见 `LICENSE`。
