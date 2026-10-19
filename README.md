# coding-video · 梵高

为 `梵高.mp4` 这首歌做的 MV。原文件只有音频，画面全黑。画面全部由代码一帧一帧画出来：每帧大约 4.6 万个油画笔触，跟着歌词和 91 BPM 的节拍变化。

- **成片下载**：本仓库的 [Releases](https://github.com/t3cdblb4t0/coding-video/releases) 页面
  - `van-gogh-mv-1080p.mp4`：高画质版，1920×1080，24 fps，x264 CRF 22，约 460 MB
  - `van-gogh-mv-1080p_preview.mp4`：预览版，约 94 MB
- 抽帧预览：[`out/van-gogh-mv-1080p_preview.jpg`](out/van-gogh-mv-1080p_preview.jpg)
- 分镜：[STORYBOARD.md](STORYBOARD.md)

成片由 GitHub Actions 工作流 [`build-mv.yml`](.github/workflows/build-mv.yml) 渲染并发布。`render/`、`data/` 或 `tools/` 有改动推送时会自动重新构建，也可以在 Actions 页面手动运行，运行时可以改 CRF。高画质版超过 GitHub 单文件 100 MB 的限制，所以不提交到 Git 仓库，只放在 Release 里。

## 目录
| 路径 | 内容 |
|---|---|
| `data/lyrics_timing.json` | 每句歌词和每个字的时间（离线语音识别对齐后，再按节拍网格修正）、押韵字位置、节拍网格 |
| `data/lyrics.srt` | 同一份时间轴的字幕格式 |
| `data/audio_features.json` | 每帧的伴奏音量、人声音量、鼓点 |
| `render/shaders.js` | 各场景的着色器（星夜、信纸、阿尔勒、麦田乌鸦、墓地、信件、现代），以及笔触、泛光、合成 |
| `render/timeline.js` | 整首歌的分镜参数：哪一秒是哪个场景、各参数的关键帧曲线、镜头、年份角标 |
| `render/text.js` | 歌词排版（押韵字放大、换色）、提奥介绍、信纸上的手写字、年份角标和各种图形 |
| `render/main.js` | 渲染流程：按画面内容动态编译着色器、推动笔触、绘制、合成 |
| `tools/build_mv.js` | 整首构建：分段并行渲染，把无损画面直接送进 x264，拼接各段，再接上原曲 AAC 音频 |
| `tools/render.js` | 用无头 Chrome 渲染一段画面：`raw` 输出无损画面给 x264；`sheet` 输出静帧预览图 |
| `tools/check_clip.js` | 直接解析成片 MP4，抽帧生成预览图，并核对音频和原曲的偏移 |
| `tools/mux.py` | 旧流程用的封装器（浏览器 WebCodecs 编码的分段 + 原曲 AAC），新流程已不用 |

## 在本地渲染
```sh
sh tools/fetch_font.sh                                   # 霞鹜文楷字体（OFL 授权，25 MB，没有提交到仓库）
node tools/render.js sheet 36 44 52                      # 预览几帧静帧 -> out/stills/sheet.jpg
node tools/build_mv.js --crf 22 --jobs 3 --preview-mbps 3.6   # 整首 -> out/van-gogh-mv-1080p.mp4（另出一个预览版）
node tools/check_clip.js out/van-gogh-mv-1080p.mp4 5 43 103 148 # 抽帧预览，并核对音画同步
```
需要 Node 18+，带 libx264 的 ffmpeg（用 `FFMPEG=` 指定路径），以及能被 `playwright-core` 启动的 Chrome（用 `CHROME=` 指定路径）。8 核机器上整首大约 21 分钟；GitHub 的 4 核服务器上大约 30 分钟，再加上预览版的编码时间。
