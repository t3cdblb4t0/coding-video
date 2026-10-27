# coding-video · 算给你看

用代码"算"出来的知识短视频。画面和计算全部由 AI 写的代码生成：**不配音、中英双语字幕**。

> 你不需要写代码。你把选题告诉 Kiro，它写代码、渲染、自检；你负责核对内容、配乐、发布和看数据。

## 成片

| 期 | 标题 | 文件 | 画幅 | 时长 | 声音 |
|---|---|---|---|---|---|
| 01 | 随手扔针，竟能算出 π？ | [001-扔针算圆周率.mp4](output/001-扔针算圆周率.mp4) | 竖屏 9:16 | 2 分 12 秒 | 合成配乐（另有 `-无声` 版） |
| 02 | 三门问题：换，还是不换？ | [002-三门问题.mp4](output/002-三门问题.mp4) | 横屏 16:9 | 2 分 12 秒 | 无音轨，后期自己配乐 |
| 03 | 你们班有没有两个人同一天生日？ | [003-生日问题.mp4](output/003-生日问题.mp4) | 横屏 16:9 | 1 分 17 秒 | 无音轨，后期自己配乐 |

每期的分镜、片中用到的事实和实测结果都在 `videos/<期>/分镜.md`：[第 01 期](videos/001-buffon-needle/分镜.md) · [第 02 期](videos/002-monty-hall/分镜.md) · [第 03 期](videos/003-birthday/分镜.md)。

第 03 期的文案做了调整（前两期发完只涨了 3 个粉）：开头第一帧就直接问观众本人、2 秒甩出 97%；砍到 1 分 17 秒、每段只讲一件事；字号整体放大；结尾把"评论区报生日看第几条撞车"做成互动钩子。详见 [第 03 期分镜](videos/003-birthday/分镜.md) 开头的对比表。

**下载方法**：在 GitHub 上点开文件，再点右上角的下载按钮（Download raw file）。

**配乐**：第 02 期起没有音轨，导入剪映后直接加音乐即可。各段落都从 100 BPM 的小节线开始（每 2.4 秒一小节），选 100 BPM 左右的曲子更容易卡点。

## 发布前检查

- [ ] 核对内容：分镜.md 末尾列出了片中用到的全部事实和数字
- [ ] 发布时打开「AI 生成内容」声明（《人工智能生成合成内容标识办法》的要求）
- [ ] 封面直接用第一帧（标题已经在画面里）
- [ ] 加话题：#vibe知识大赏 #数学 #科普
- [ ] 置顶一条评论，写上下期预告，引导关注

## 下一条怎么做

在 Kiro 里说「做第 4 期：随机游走」（第 03 期片尾已预告"喝醉的人能走回家吗"），有参考视频就一起传上来。流程：

1. Kiro 先写分镜（每段画面 + 字幕），你确认后再做
2. Kiro 渲染并自检，然后推送到这个仓库
3. 你下载、配乐、发布；48 小时后把播放量、完播率、点赞和涨粉数告诉 Kiro，用来调整下一条

制作约定（画幅、音频、种子等）写在 [.kiro/steering/video-conventions.md](.kiro/steering/video-conventions.md)，Kiro 每次都会按它来做。

---

## 技术说明（给 Kiro / 开发者）

**流程**：每期一个场景目录（`videos/<id>/scene.js` 是入口），用 Canvas 2D 按时间逐帧绘制，可选地用 Web Audio 合成配乐。在无头 Chrome 里用 WebCodecs 编码：视频 H.264 High、BT.709 有限范围，音频（如果有）Opus 192 kbps。最后由 `engine/mp4.js` 封装成 faststart MP4。全程不需要 ffmpeg，也不需要联网。场景不写 `audio()` 时，输出只有画面。

```sh
node engine/render.mjs videos/002-monty-hall                          # 渲染成片到 output/（约 1.5 分钟）
node engine/render.mjs videos/002-monty-hall --preview 0,5,12.5       # 指定时刻的静帧 + 拼图，输出到 previews/
node engine/inspect.mjs output/xxx.mp4 --every 1 [--frames]           # 抽帧拼图、镜头切换、音量、BPM（横竖屏都行）
node engine/audio-bench.mjs videos/001-buffon-needle 10,30            # 测配乐渲染耗时
```

- `inspect.mjs` 也用来拆解参考视频。支持 H.264 / VP8 / VP9，不支持 HEVC（H.265 的视频请先导出成 H.264）。
- 依赖：Node 22、`playwright-core`、`chrome-headless-shell`，都会自动查找；找不到时用 `PLAYWRIGHT_CORE` / `CHROME_BIN` 环境变量指定。
- 场景接口见 `engine/runtime.js` 文件头。`draw(ctx, t)` 必须支持随机跳转到任意时刻，预览会跳着渲染。
- 配乐的音频节点按 1 秒窗口逐段创建（`OfflineAudioContext.suspend/resume`），播完就断开。如果一次建好整张图，2 分钟的配乐要渲染 10 分钟以上；现在约 8 秒。
- 版式：竖屏要避开抖音的界面遮挡（顶部 y < 220，右侧按钮栏 x > 930，底部文案区 y > 1520）；横屏的字幕放在 y ≈ 970，避开 B 站等播放器底部的进度条。
- 字体在 `fonts/`，全部是 SIL OFL 1.1 授权，可免费商用：Noto Sans SC（思源黑体）、IM Fell French Canon（没有 π、≈ 等符号）、EB Garamond、Source Code Pro。
- 门、汽车、羊等图形全部用代码画，不用图片或 emoji，没有版权问题。
- 随机种子事先定好，不为结果去挑。各期的种子和实测结果见对应的分镜.md。
