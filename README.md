# coding-video · 梵高

为 `梵高.mp4` 这首歌做的 MV。原文件只有音频，画面全黑。画面全部由代码一帧一帧画出来：每帧大约有 4 万个会流动的油画笔触，跟着歌词和 91 BPM 的节拍变化。

- 分镜和视频模型镜头清单：[STORYBOARD.md](STORYBOARD.md)
- 样片（副歌 1，0:34.5–1:09.3）：[`out/sample_chorus1.mp4`](out/sample_chorus1.mp4)，预览图 [`out/sample_chorus1_preview.jpg`](out/sample_chorus1_preview.jpg)

## 目录
| 路径 | 内容 |
|---|---|
| `data/lyrics_timing.json` | 每句歌词的时间（离线语音识别逐字对齐后，再按节拍网格修正）、每个字的时间、节拍网格 |
| `data/lyrics.srt` | 同一份时间轴的字幕格式，可导入剪映核对 |
| `data/audio_features.json` | 每帧（30 fps）的伴奏音量、人声音量、鼓点 |
| `render/` | 浏览器端渲染器：`shaders.js` 场景和笔触，`timeline.js` 分镜参数，`text.js` 歌词排版，`main.js` 渲染流程 |
| `tools/render.js` | 用无头 Chrome 逐帧渲染，并用 WebCodecs 编码成 H.264 |
| `tools/mux.py` | 把画面和原曲的 AAC 音轨直接合成 MP4（音频不重新编码，偏移精确到采样点） |
| `tools/check_clip.js` | 解码成片抽帧做预览图，并核对音频偏移 |

## 渲染
```sh
sh tools/fetch_font.sh                                     # 下载霞鹜文楷字体（OFL 授权，25 MB，未提交进仓库）
node tools/render.js sheet 36 44 52                        # 渲染几帧静帧，生成预览图 out/stills/sheet.jpg
node tools/render.js clip 34.5 69.3 out/sample_chorus1     # 渲染片段，约 1 秒一帧（纯 CPU 软件渲染）
python3 tools/mux.py out/sample_chorus1                    # 合成 out/sample_chorus1.mp4
node tools/check_clip.js out/sample_chorus1 36 44 52       # 抽帧预览并核对音画同步
```
需要 Node 18+、Python 3，以及安装了 `playwright-core` 的 Chrome（可用 `CHROME=/path/to/chrome` 指定）。
