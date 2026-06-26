#!/bin/bash
set -e

APP_NAME="YouTube Downloader"
BUILD_DIR="dist"
APP_DIR="$BUILD_DIR/$APP_NAME.app"
CONTENTS="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES_DIR="$CONTENTS/Resources"

echo "🧹 Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

echo "📦 Copying project files..."
cp server.js "$RESOURCES_DIR/"
cp -r public "$RESOURCES_DIR/"
cp package.json "$RESOURCES_DIR/"
cp package-lock.json "$RESOURCES_DIR/"

echo "📦 Installing dependencies..."
(cd "$RESOURCES_DIR" && npm install --omit=dev)

echo "📝 Creating launcher script..."
cat > "$MACOS_DIR/start.sh" << 'LAUNCHER'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES="$SCRIPT_DIR/../Resources"

if ! command -v yt-dlp &>/dev/null; then
  osascript -e 'display dialog "请先安装 yt-dlp:\nbrew install yt-dlp" buttons {"OK"} default button "OK" with icon stop with title "缺少依赖"'
  exit 1
fi

if ! command -v ffmpeg &>/dev/null; then
  osascript -e 'display dialog "请先安装 ffmpeg:\nbrew install ffmpeg" buttons {"OK"} default button "OK" with icon stop with title "缺少依赖"'
  exit 1
fi

mkdir -p "$RESOURCES/downloads"
cd "$RESOURCES"
exec node server.js
LAUNCHER
chmod +x "$MACOS_DIR/start.sh"

echo "📝 Creating main executable..."
cat > "$MACOS_DIR/$APP_NAME" << 'MAINEXEC'
#!/bin/bash
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MACOS_DIR="$APP_DIR/Contents/MacOS"

"$MACOS_DIR/start.sh" &
SERVER_PID=$!
sleep 2
open "http://localhost:3000"
wait $SERVER_PID
MAINEXEC
chmod +x "$MACOS_DIR/$APP_NAME"

echo "📝 Creating Info.plist..."
cat > "$CONTENTS/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>YouTube Downloader</string>
    <key>CFBundleIdentifier</key>
    <string>com.w7a8.youtube-downloader</string>
    <key>CFBundleName</key>
    <string>YouTube Downloader</string>
    <key>CFBundleDisplayName</key>
    <string>YouTube Downloader</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.14</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

echo "📝 Creating app icon..."
sips -z 512 512 -c "255 0 0" --out "$RESOURCES_DIR/icon_512.png" &>/dev/null <<< ""
python3 -c "
import subprocess, os
res = '$RESOURCES_DIR'
subprocess.run(['sips', '-z', '512', '512', '-c', '255', '0', '0', '--out', f'{res}/icon_512.png'], check=True) if not os.path.exists(f'{res}/icon_512.png') else None
"

mkdir -p "$RESOURCES_DIR/icon.iconset"
for size in 16 32 64 128 256 512; do
  sips -z $size $size "$RESOURCES_DIR/icon_512.png" --out "$RESOURCES_DIR/icon.iconset/icon_${size}x${size}.png" &>/dev/null
  sips -z $((size*2)) $((size*2)) "$RESOURCES_DIR/icon_512.png" --out "$RESOURCES_DIR/icon.iconset/icon_${size}x${size}@2x.png" &>/dev/null
done
iconutil -c icns "$RESOURCES_DIR/icon.iconset" -o "$RESOURCES_DIR/AppIcon.icns" 2>/dev/null || true
rm -rf "$RESOURCES_DIR/icon.iconset" "$RESOURCES_DIR/icon_512.png"

echo ""
echo "✅ Build complete! App is at: $APP_DIR"
echo ""
echo "📋 To run the app:"
echo "   open \"$APP_DIR\""
echo ""
echo "⚠️  Requirements: yt-dlp, ffmpeg, and Node.js must be installed on the target Mac."
