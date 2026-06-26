# YouTube 视频下载器

一个 Web 版的 YouTube 视频下载工具，支持选择清晰度和格式，视频保存到本地文件夹。

## 功能特性

- 🔗 粘贴 YouTube 链接，自动解析视频信息
- 🎬 展示所有可用格式（分辨率、编码、文件大小）
- 📥 一键下载，支持 4K/1080p 高清
- 📊 实时下载进度条（速度、ETA）
- 📁 已下载文件管理（预览、删除）
- 🎨 暗色主题 UI，YouTube 风格


## 项目结构

```
youtube-downloader/
├── server.js              # Express 后端服务
├── public/
│   └── index.html         # 前端页面（原生 JS + CSS）
├── downloads/             # 视频下载目录
├── scripts/
│   └── build-mac.sh       # macOS .app 打包脚本
├── package.json
├── .gitignore
├── REQUIREMENTS.md        # 需求文档
├── DESIGN.md              # 设计文档
└── README.md
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js |
| Web 框架 | Express 4 |
| 前端 | HTML5 + CSS3 + Vanilla JS |
| 下载引擎 | yt-dlp (CLI) |
| 合并工具 | ffmpeg |
| 认证 | Chrome Cookies |
| 打包 | Shell + macOS .app bundle |

## 环境要求

- macOS 10.14+
- [Node.js](https://nodejs.org/) (v16+)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`brew install yt-dlp`)
- [ffmpeg](https://ffmpeg.org/) (`brew install ffmpeg`)
- Chrome 浏览器（用于 Cookie 认证）

## 从源码运行

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

打开浏览器访问 `http://localhost:3000`，粘贴 YouTube 链接即可下载。

## 构建 macOS 应用包

```bash
bash scripts/build-mac.sh
```

产物在 `dist/YouTube Downloader.app`，可直接双击运行。

## 项目文档

- [需求文档](./REQUIREMENTS.md)
- [设计文档](./DESIGN.md)

## 许可证

MIT
