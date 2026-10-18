# coding-video · 梵高

为 `梵高.mp4` 这首歌做的 MV。原文件只有音频，画面全黑。画面全部由代码一帧一帧画出来：每帧大约 4.6 万个油画笔触，跟着歌词和 91 BPM 的节拍变化。

- **成片**：[`out/梵高_mv.mp4`](out/梵高_mv.mp4)，1920×1080，24 fps，3:18，83 MB，音频是原曲 AAC 原样复制
- 抽帧预览：[`out/梵高_mv_preview.jpg`](out/梵高_mv_preview.jpg)
- 分镜：[STORYBOARD.md](STORYBOARD.md)

## 目录
| 路径 | 内容 |
|---|---|
| `data/lyrics_timing.json` | 每句歌词和每个字的时间（离线语音识别对齐后，再按节拍网格修正）、押韵字位置、节拍网格 |
| `data/lyrics.srt` | 同一份时间轴的字幕格式 |
| `data/audio_features.json` | 每帧的伴奏音量、人声音量、鼓点 |
| `render/shaders.js` | 各场景的着色器（星夜、信纸、阿尔勒、麦田乌鸦、墓地、信件、现代），以及笔触、泛光、合成 |
| `render/timeline.js` | 整首歌的分镜参数：哪一秒是哪个场景、各参数的关键帧曲线、镜头、年份角标 |
| `render/text.js` | 歌词排版（押韵字放大、换色）、信纸上的手写字、年份角标、签名和价格等图形 |
| `render/main.js` | 渲染流程：按画面内容动态编译着色器、推动笔触、绘制、合成 |
| `tools/render.js` | 用无头 Chrome 逐帧渲染一段画面，再用 WebCodecs 编码成 H.264 |
| `tools/mux.py` | 把各段画面拼接起来，和原曲的 AAC 音轨合成 MP4（音频不重新编码） |
| `tools/check_clip.js` | 直接解析成片 MP4，抽帧生成预览图，并核对音频和原曲的偏移 |

## 渲染
```sh
sh tools/fetch_font.sh                                   # 霞鹜文楷字体（OFL 授权，25 MB，没有提交到仓库）
node tools/render.js sheet 36 44 52                      # 预览几帧静帧 -> out/stills/sheet.jpg
# 整首：在硬切或黑场处分段，各段可以并行渲染（每段开头会先预热，不会看出接缝）
for r in "0 298" "298 638" "638 798" "798 1873" "1873 2301" "2301 3290" "3290 3687" "3687 4464" "4464 4758"; do
  set -- $r; node tools/render.js chunk $1 $2 out/full/c_$(printf %04d $1) &
done; wait
python3 tools/mux.py out/梵高_mv.mp4 $(ls out/full/*.json | sed 's/\.json$//')
node tools/check_clip.js out/梵高_mv.mp4 5 43 103 148           # 抽帧预览，并核对音画同步
```
需要 Node 18+、Python 3，以及安装了 `playwright-core` 的 Chrome（用 `CHROME=/path/to/chrome` 指定路径）。在 8 核 CPU、纯软件渲染的环境下，整首大约 15 分钟。
