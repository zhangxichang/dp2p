# 开发者指南

## 开始之前

开始之前需要先初始化项目

```bash
bun run build:deps
bun install
#如果是开发构建桌面应用你需要生成应用图标
bun tauri icon public/icon.svg
```

## 🌏Web开发构建

```bash
#开发
bun run dev
#或构建
bun run build
```

## 💻桌面应用开发构建

```bash
#开发
bun tauri dev
#或构建
bun tauri build
```
