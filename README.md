# Starlink

一个基于现代Web技术构建的跨平台网络聊天应用，既可直接作为Web应用使用，也可打包为原生桌面应用。

![Starlink应用主界面截图](docs/assets/promotion_image.png)

## 主要特性

- **跨平台体验**：在多种设备和操作系统上提供一致、顺畅的使用体验。
- **开箱即用的Web应用**：无需安装，直接通过浏览器访问 **[星链](https://starlink.zhangxichang.com)** 即可使用。
- **高性能Rust后端**：应用核心（WebAssembly模块与原生后端）由Rust编写，兼顾高性能与内存安全。

## 快速开始

项目支持Web与原生（基于Tauri）两种形式，可独立开发和构建。

### 安装项目依赖

在开始任何操作前，请确保安装所有必要的依赖。

```bash
bun run build:deps
bun install
```

## Web应用

### 开发

1.  启动本地开发服务器：

```bash
bun run dev
```

2.  在浏览器中打开：http://localhost:5173

### 构建

构建生产环境使用的Web应用：

```bash
bun run build
```

构建产物将生成在 `dist` 目录中。

## 原生桌面应用

### 初始化

首次开发或构建前，需要生成应用图标：

```bash
bun tauri icon ./public/icon.svg
```

### 开发

此命令将同时启动Web开发服务器和带热重载的桌面应用窗口：

```bash
bun tauri dev
```

### 构建

构建可发布的安装包：

```bash
bun tauri build
```

- **发布版本**输出至：`target/release/`

- 如需构建**调试版本**，可添加 `--debug` 标志：

```bash
  bun tauri build --debug
```

**调试版本**输出至：`target/debug/`

## 贡献

请参阅[贡献指南](CONTRIBUTING.md)。

---

如有其他问题或建议，请通过 [Issues](https://github.com/ZhangXiChang/starlink/issues) 与我们交流。
