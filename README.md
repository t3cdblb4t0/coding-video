# coding-video · 算给你看

用代码"算"出来的知识短视频。画面、音乐和计算全部由 AI 写的代码生成：**不配音、中英双语字幕、竖屏 1080×1920**。

> 你不需要写代码。你把选题告诉 Kiro，它写代码、渲染、自检；你负责核对内容、发布和看数据。

## 成片

| 期 | 标题 | 文件 | 时长 |
|---|---|---|---|
| 01 | 随手扔针，竟能算出 π？ | [001-扔针算圆周率.mp4](output/001-扔针算圆周率.mp4) | 2 分 12 秒 |

第 01 期的结构：提问 → 1777 年布丰的问题 → 实测 1000 根 → 悬念：π 从哪来？→ 不用微积分的证明（"布丰的面条"，每一步都配真实小实验）→ 扔到 100 万根 → 1901 年的"凑数"疑案。分镜和需要核对的事实见 [分镜.md](videos/001-buffon-needle/分镜.md)。

每期有两个文件：

- `xxx.mp4`：带合成配乐，优先用这个。
- `xxx-无声.mp4`：只有画面。如果上传后没声音或提示格式不支持，就用这个，在抖音或剪映里配乐。

**下载方法**：在 GitHub 上点开文件，再点右上角的下载按钮（Download raw file）。

## 发布前检查

- [ ] 核对内容：分镜.md 末尾列出了片中用到的全部事实和数字
- [ ] 发布时打开「AI 生成内容」声明（《人工智能生成合成内容标识办法》的要求）
- [ ] 封面直接用第一帧（标题已经在画面里）
- [ ] 加话题：#vibe知识大赏 #数学 #科普
- [ ] 置顶一条评论，写上下期预告，引导关注

## 下一条怎么做

在 Kiro 里说「做第 2 期：三门问题」，有参考视频就一起传上来。流程：

1. Kiro 先给出文字分镜（每段画面 + 字幕），你确认后再做
2. Kiro 渲染并自检，然后推送到这个仓库
3. 你下载、发布；48 小时后把播放量、完播率、点赞和涨粉数告诉 Kiro，用来调整下一条

---

## 技术说明（给 Kiro / 开发者）

**流程**：每期一个场景目录（`videos/<id>/scene.js` 是入口），用 Canvas 2D 按时间逐帧绘制，用 Web Audio 合成配乐。在无头 Chrome 里用 WebCodecs 编码：视频 H.264 High、BT.709 有限范围，音频 Opus 192 kbps。最后由 `engine/mp4.js` 封装成 faststart MP4。全程不需要 ffmpeg，也不需要联网。

```sh
node engine/render.mjs videos/001-buffon-needle                       # 渲染成片到 output/（约 2 分钟）
node engine/render.mjs videos/001-buffon-needle --preview 0,5,12.5    # 指定时刻的静帧 + 拼图，输出到 previews/
node engine/inspect.mjs output/xxx.mp4 --every 1 [--frames]           # 抽帧拼图、镜头切换、音量、BPM
node engine/audio-bench.mjs videos/001-buffon-needle 10,30            # 测配乐渲染耗时
```

- `inspect.mjs` 也用来拆解参考视频。支持 H.264 / VP8 / VP9，不支持 HEVC（H.265 的视频请先导出成 H.264）。
- 依赖：Node 22、`playwright-core`、`chrome-headless-shell`，都会自动查找；找不到时用 `PLAYWRIGHT_CORE` / `CHROME_BIN` 环境变量指定。
- 场景接口见 `engine/runtime.js` 文件头。`draw(ctx, t)` 必须支持随机跳转到任意时刻，预览会跳着渲染。
- 配乐的音频节点按 1 秒窗口逐段创建（`OfflineAudioContext.suspend/resume`），播完就断开。如果一次建好整张图，Chrome 每个音频块都要遍历全部节点，2 分钟的配乐要渲染 10 分钟以上；现在约 8 秒。
- 版式要避开抖音的界面遮挡：顶部 y < 220，右侧按钮栏 x > 930（y 在 900–1600 之间），底部文案区 y > 1520。
- 字体在 `fonts/`，全部是 SIL OFL 1.1 授权，可免费商用：Noto Sans SC（思源黑体，可变字重）、IM Fell French Canon（没有 π、≈ 等符号，这些要用黑体写）、Source Code Pro。
- 随机种子事先定好，不为结果去挑。第 01 期的种子和实测结果见分镜.md。
