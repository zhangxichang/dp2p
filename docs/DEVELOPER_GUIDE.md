# 开发者指南

## 环境依赖

开始开发或构建前，请确保安装以下必要工具：

- **[Rust](https://rust-lang.org)** - 系统编程语言和构建工具链
- **[Bun](https://bun.com)** - JavaScript 运行时和包管理器
- **[uv](https://docs.astral.sh/uv)** - Python包管理工具
- **[wasm-pack](https://drager.github.io/wasm-pack)** - Rust WebAssembly 打包和发布工具
- **[wasm32-unknown-unknown](https://doc.rust-lang.org/beta/rustc/platform-support/wasm32-unknown-unknown.html)** - Rust WebAssembly 编译目标

## 初始化项目

构建安装和生成所有依赖

```bash
uv sync
bun run build:deps
bun install
bun run generate:deps
```

## 🌏Web开发构建

```bash
# 开发
bun run dev
# 构建
bun run build
```

## 💻桌面应用开发构建

```bash
# 开发
bun tauri dev
# 构建
bun tauri build
```
