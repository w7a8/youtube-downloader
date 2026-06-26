# YouTube 视频下载器

一个 Web 版的 YouTube 视频下载工具，支持选择清晰度和格式，视频保存到本地文件夹。

## 功能特性

- 🔗 粘贴 YouTube 链接，自动解析视频信息
- 🎬 展示所有可用格式（分辨率、编码、文件大小）
- 📥 一键下载，支持 4K/1080p 高清
- 📊 实时下载进度条（速度、ETA）
- 📁 已下载文件管理（预览、删除）
- 🎨 暗色主题 UI，YouTube 风格

## 环境要求

- [Node.js](https://nodejs.org/) (v16+)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`brew install yt-dlp`)
- [ffmpeg](https://ffmpeg.org/) (`brew install ffmpeg`)
- Chrome 浏览器（用于 Cookie 认证）

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

打开浏览器访问 `http://localhost:3000`，粘贴 YouTube 链接即可下载。

## 项目文档

- [需求文档](./REQUIREMENTS.md)
- [设计文档](./DESIGN.md)

## 许可证

MIT
