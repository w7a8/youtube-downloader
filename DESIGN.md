## 系统架构

```
+-------------------+       +-------------------+       +-------------------+
|    Browser (UI)   | <---> |   Express Server  | <---> |     yt-dlp CLI    |
|  (index.html)     | HTTP  |   (server.js)     | spawn |  + ffmpeg merge   |
+-------------------+       +-------------------+       +-------------------+
                                     |
                                     v
                            +-------------------+
                            |   downloads/      |
                            |   (本地文件系统)    |
                            +-------------------+
```

- **前端**：单页 HTML（原生 JS + CSS），暗色主题风格，零外部依赖
- **后端**：Node.js + Express，通过 `child_process.spawn` 调用 `yt-dlp` CLI
- **存储**：本地文件系统 `downloads/` 目录，无数据库

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML5 + CSS3 + Vanilla JS | 零框架依赖，暗色 YouTube 风格主题 |
| 后端 | Node.js + Express 4.x | 轻量 HTTP 服务 |
| 下载引擎 | yt-dlp (CLI) | Python 工具，支持 YouTube 等数千网站 |
| 格式合并 | ffmpeg | 合并独立视频/音频流为 MP4 |
| 认证 | Chrome Cookies | `--cookies-from-browser chrome` 复用浏览器登录态 |

## API 设计

### `GET /api/info?url=`
获取视频信息和可用格式列表。

**Response:**
```json
{
  "title": "视频标题",
  "duration": 3600,
  "durationString": "1:00:00",
  "thumbnail": "https://...",
  "uploader": "频道名",
  "viewCount": 12345,
  "formats": [
    {
      "id": "137+140",
      "ext": "mp4",
      "quality": "1080p",
      "filesize": "156.2MB",
      "note": "1080p",
      "hasVideo": true,
      "hasAudio": true
    }
  ]
}
```

### `GET /api/download?url=&format=`
启动下载任务，返回任务 ID。

**Response:** `{ "downloadId": "1719408000000" }`

### `GET /api/progress/:id`
轮询下载进度。

**Response:** `{ "progress": 45.2, "status": "downloading", "speed": "5.2MiB/s", "eta": "00:38", "fileName": "video.mp4" }`

### `GET /api/files`
列出已下载文件。

### `GET /api/file/:name`
下载/打开已下载文件。

### `DELETE /api/file/:name`
删除已下载文件。

## 数据流

```
1. 用户粘贴 URL → 2. 前端调用 /api/info
  → 3. server.js spawn yt-dlp --dump-json
  → 4. 解析 JSON 提取格式列表
  → 5. 前端渲染格式表格，用户选择
  → 6. 用户点击下载 → 7. 前端调用 /api/download
  → 8. server.js spawn yt-dlp 执行下载
  → 9. 解析 stdout 进度输出
  → 10. 前端轮询 /api/progress/:id 展示进度条
  → 11. 下载完成，文件保存到 downloads/
```

## 进度解析

`yt-dlp` 在 stderr 输出下载进度，格式为：
```
[download]  45.2% of ~156.2MiB at  5.2MiB/s ETA 00:38
```

`server.js` 用正则匹配提取进度百分比、速度和 ETA，前端每秒轮询更新。

## 格式合并策略

- 默认选择 `bestvideo*+bestaudio/best`（最佳视频+最佳音频，合并输出）
- 若用户选择仅视频格式（无音轨），自动追加 `+bestaudio` 后缀，由 yt-dlp/ffmpeg 合并
- 合并输出格式统一为 MP4

## 部署说明

```bash
# 安装依赖
brew install yt-dlp ffmpeg node

# 启动项目
cd "Project-Youtube Download"
npm install
npm start

# 访问 http://localhost:3000
```

## 目录结构

```
Project-Youtube Download/
├── server.js           # 后端服务
├── public/
│   └── index.html      # 前端页面
├── downloads/          # 下载目录 (gitignored)
├── package.json
├── .gitignore
├── REQUIREMENTS.md     # 需求文档
├── DESIGN.md           # 设计文档 (本文件)
└── README.md           # 项目说明
```
