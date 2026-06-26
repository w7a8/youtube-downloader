const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

const activeDownloads = new Map();

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const fullArgs = ['--cookies-from-browser', 'chrome', ...args];
    const proc = spawn('yt-dlp', fullArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || stdout || `Exit code: ${code}`));
    });
    proc.on('error', reject);
  });
}

app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const output = await runYtDlp([url, '--dump-json', '--no-playlist']);
    const info = JSON.parse(output);
    const formats = [];

    const seen = new Set();
    for (const fmt of (info.formats || [])) {
      if (!fmt.format_id || !fmt.ext) continue;

      let quality = '';
      if (fmt.resolution && fmt.resolution !== 'audio only') quality = fmt.resolution;
      else if (fmt.height) quality = `${fmt.height}p`;
      else if (fmt.format_note) quality = fmt.format_note;

      const key = `${quality}_${fmt.ext}_${fmt.filesize || 0}_${fmt.tbr || 0}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const rawSize = fmt.filesize || fmt.filesize_approx || 0;
      const filesize = rawSize > 0
        ? (rawSize >= 1024 * 1024 * 1024
            ? `${(rawSize / 1024 / 1024 / 1024).toFixed(2)}GB`
            : rawSize >= 1024 * 1024
              ? `${(rawSize / 1024 / 1024).toFixed(1)}MB`
              : `${(rawSize / 1024).toFixed(1)}KB`)
        : 'Unknown';

      const hasVideo = fmt.vcodec && fmt.vcodec !== 'none';
      const hasAudio = fmt.acodec && fmt.acodec !== 'none';

      formats.push({
        id: fmt.format_id,
        ext: fmt.ext,
        quality: quality || (hasVideo ? 'Video' : 'Audio'),
        filesize,
        filesizeRaw: rawSize,
        note: fmt.format_note || '',
        vcodec: fmt.vcodec || 'none',
        acodec: fmt.acodec || 'none',
        tbr: fmt.tbr || 0,
        fps: fmt.fps || null,
        hasVideo,
        hasAudio,
      });
    }

    formats.sort((a, b) => {
      if (a.hasVideo && a.hasAudio && !(b.hasVideo && b.hasAudio)) return -1;
      if (!(a.hasVideo && a.hasAudio) && b.hasVideo && b.hasAudio) return 1;
      if (a.hasVideo && !b.hasVideo) return -1;
      if (!a.hasVideo && b.hasVideo) return 1;
      const qa = parseInt(a.quality) || 0;
      const qb = parseInt(b.quality) || 0;
      return qb - qa;
    });

    res.json({
      title: info.title,
      duration: info.duration,
      durationString: formatDuration(info.duration),
      thumbnail: info.thumbnail,
      uploader: info.uploader || info.channel,
      viewCount: info.view_count,
      formats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

app.get('/api/download', async (req, res) => {
  const { url, format } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const downloadId = Date.now().toString();
  const dl = { progress: 0, status: 'starting', speed: '', eta: '', fileName: '' };
  activeDownloads.set(downloadId, dl);

  const formatArg = format || 'bestvideo*+bestaudio/best';
  const outputTemplate = path.join(DOWNLOAD_DIR, '%(title).200s-%(id)s.%(ext)s');

  const proc = spawn('yt-dlp', [
    '--cookies-from-browser', 'chrome',
    '--format', formatArg,
    '--output', outputTemplate,
    '--no-playlist',
    '--merge-output-format', 'mp4',
    '--no-mtime',
    url,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  let stderrLog = '';
  let lastFileName = '';

  proc.stdout.on('data', (data) => {
    const text = data.toString();
    const destMatch = text.match(/\[download\] Destination: (.+)/);
    if (destMatch) {
      lastFileName = path.basename(destMatch[1].trim());
      dl.fileName = lastFileName;
    }
    const mergedMatch = text.match(/\[Merger\] Merging formats into "([^"]+)"/);
    if (mergedMatch) {
      lastFileName = path.basename(mergedMatch[1]);
      dl.fileName = lastFileName;
    }
    const progMatch = text.match(/\[download\]\s+([\d.]+)%\s+of\s+(?:~?\s*)?([\d.]+[KMGkmg]i?B)\s+at\s+([\d.]+\s*[KMGkmg]i?B\/s)\s+ETA\s+(\S+)/);
    if (progMatch) {
      dl.progress = parseFloat(progMatch[1]);
      dl.speed = progMatch[3].trim();
      dl.eta = progMatch[4];
    }
  });

  proc.stderr.on('data', (data) => {
    const text = data.toString();
    stderrLog += text;
    const progMatch = text.match(/\[download\]\s+([\d.]+)%\s+of\s+(?:~?\s*)?([\d.]+[KMGkmg]i?B)\s+at\s+([\d.]+\s*[KMGkmg]i?B\/s)\s+ETA\s+(\S+)/);
    if (progMatch) {
      dl.progress = parseFloat(progMatch[1]);
      dl.speed = progMatch[3].trim();
      dl.eta = progMatch[4];
    }
  });

  proc.on('close', (code) => {
    if (code === 0) {
      dl.status = 'complete';
      dl.progress = 100;
      if (lastFileName) dl.fileName = lastFileName;
      if (!dl.fileName) {
        try {
          const files = fs.readdirSync(DOWNLOAD_DIR).sort((a, b) =>
            fs.statSync(path.join(DOWNLOAD_DIR, b)).mtime.getTime() -
            fs.statSync(path.join(DOWNLOAD_DIR, a)).mtime.getTime()
          );
          if (files.length > 0) dl.fileName = files[0];
        } catch {}
      }
    } else {
      dl.status = 'error';
      dl.error = stderrLog.slice(-500) || `Exit code: ${code}`;
    }
  });

  proc.on('error', (err) => {
    dl.status = 'error';
    dl.error = err.message;
  });

  res.json({ downloadId });
});

app.get('/api/progress/:id', (req, res) => {
  const dl = activeDownloads.get(req.params.id);
  if (!dl) return res.status(404).json({ error: 'Download not found' });
  res.json(dl);
});

app.get('/api/file/:name', (req, res) => {
  const filePath = path.join(DOWNLOAD_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => /\.(mp4|webm|mkv|mov|avi|m4a|mp3)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(DOWNLOAD_DIR, f));
        const sizeMB = stat.size / 1024 / 1024;
        return {
          name: f,
          size: sizeMB >= 1000 ? `${(sizeMB / 1024).toFixed(1)}GB` : `${sizeMB.toFixed(1)}MB`,
          date: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/file/:name', (req, res) => {
  const filePath = path.join(DOWNLOAD_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
