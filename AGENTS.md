Tauri v2 + TypeScript 的轻量 Windows 划词翻译桌面应用，Rust 侧负责系统能力，前端负责设置页、翻译弹窗和 Provider 编排。

## Environment Setup

- Node.js 已用于前端工具链，当前环境验证为 Node 22。
- Rust 已用于 Tauri 后端，当前环境验证为 rustc 1.93。
- 包管理器使用 `pnpm`，版本在 `package.json:9` 固定；不要新增 npm lockfile。`pnpm-workspace.yaml` 记录已批准的构建脚本。
- 安装依赖：`pnpm install`

## Commands

### File-scoped / Focused
- 前端单元测试：`pnpm test`
- 前端类型与构建：`pnpm build`
- Rust 单元测试：`cd src-tauri && cargo test`
- Rust 编译检查：`cd src-tauri && cargo check`

### App runtime
- 开发启动：`pnpm tauri dev`
- 打包：`pnpm tauri build`

## Architecture

```text
src/                    # TypeScript 前端
├── main.ts             # 设置页、弹窗路由、Tauri invoke/listen 入口
├── settings.ts         # Tauri store 持久化设置与默认值
├── providers/          # 翻译 Provider catalog、请求构造、响应解析和单测
├── ui/                 # 前端 UI 通用工具
└── types.ts            # 设置、选区载荷等共享类型
src-tauri/              # Tauri/Rust 后端
├── src/autostart.rs    # 开机自启命令
├── src/hotkey.rs       # 全局热键注册与触发翻译
├── src/popup.rs        # 弹窗定位、显示、隐藏和单测
├── src/selection.rs    # 当前选区读取、文本清洗和单测
├── src/tray.rs         # 系统托盘菜单与事件
├── capabilities/       # Tauri v2 权限声明
├── Cargo.toml          # Rust 依赖
└── tauri.conf.json     # 应用窗口、名称与构建配置
```

## Code Patterns

- 前端通过 `invoke` 调 Rust 命令，通过 `listen` 接收后端事件，入口在 `src/main.ts:1`。
- 设置统一走 Tauri store 的 `settings.json`，默认值和归一化在 `src/settings.ts:8`。
- Provider 配置是结构化对象，默认目录在 `src/providers/catalog.ts:3`；百度通用翻译签名在 `src/providers/baiduGeneral.ts:34`，OpenAI 兼容请求构造在 `src/providers/openaiCompatible.ts:3`。
- Rust 后端按系统能力拆模块：选区读取在 `src-tauri/src/selection.rs:8`，弹窗定位在 `src-tauri/src/popup.rs:40`，热键在 `src-tauri/src/hotkey.rs:10`。
- Tauri capability 新增前端可调用命令时同步更新 `src-tauri/capabilities/default.json`。

## Conventions

- 项目名统一用 `CraftTranslate`，包名用 `crafttranslate`。
- 依赖版本使用最新稳定版；变更前先查公开 registry 或官方文档，不固定到已知旧版本。
- 前端依赖改动使用 `pnpm`，不要使用 `npm install`。
- 单元测试按模块就近放到 `__tests__/` 或 Rust 模块内 `mod tests`。
- 不把真实 API Key、百度 APP ID/密钥、Tauri store 本地配置、构建产物或个人配置提交到仓库。
- 开源协议使用 MIT，见 `LICENSE`。

## Permissions

### 可自主执行
- 读文件、列目录、搜索代码。
- `pnpm test`、`pnpm build`、`cd src-tauri && cargo test`、`cd src-tauri && cargo check` 等本地 focused 验证。

### 需用户确认
- 新增或升级依赖并写 lockfile。
- 创建 GitHub 仓库、添加远端、推送、发布、打包签名。
- 删除文件、重置 Git。
- 触发外部 API 调用产生费用或发送真实内容。

## PR / Commit

- 当前没有仓库内提交规范；如需提交，先查看 Git 状态并让用户明确授权 commit。
- GitHub 远端计划为 `https://github.com/heue/CraftTranslate.git`，创建和推送前需要用户确认。
