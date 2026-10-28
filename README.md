# coding-video · 算给你看

用代码"算"出来的知识短视频。画面和计算全部由 AI 写的代码生成：**不配音、中英双语字幕**。

> 你不需要写代码。你把选题告诉 Kiro，它写代码、渲染、自检；你负责核对内容、配乐、发布和看数据。

## 成片

| 期 | 标题 | 文件 | 画幅 | 时长 | 声音 |
|---|---|---|---|---|---|
| 01 | 随手扔针，竟能算出 π？ | [001-扔针算圆周率.mp4](output/001-扔针算圆周率.mp4) | 竖屏 9:16 | 2 分 12 秒 | 合成配乐（另有 `-无声` 版） |
| 02 | 三门问题：换，还是不换？ | [002-三门问题.mp4](output/002-三门问题.mp4) | 横屏 16:9 | 2 分 12 秒 | 无音轨，后期自己配乐 |
| 03 | 你们班有没有两个人同一天生日？ | [003-生日问题.mp4](output/003-生日问题.mp4) | 横屏 16:9 | 1 分 17 秒 | 无音轨，后期自己配乐 |
| 04 | 喝醉的人能回家，鸟却可能永远迷路 | [004-随机游走.mp4](output/004-随机游走.mp4) | 横屏 16:9 | 1 分 41 秒 | 无音轨，后期自己配乐 |
| 04 | 同上 · **抖音竖版** | [004-随机游走-抖音竖版.mp4](output/004-随机游走-抖音竖版.mp4) | 竖屏 9:16 | 1 分 41 秒 | 无音轨，和横版同一节拍 |
| 05 | 骂完就变好，是骂的功劳吗？（回归均值） | [005-回归均值.mp4](output/005-回归均值.mp4) | 横屏 16:9 | 2 分 10 秒 | 无音轨，后期自己配乐 |
| 05 | 同上 · **抖音竖版** | [005-回归均值-抖音竖版.mp4](output/005-回归均值-抖音竖版.mp4) | 竖屏 9:16 | 2 分 10 秒 | 无音轨，和横版同一节拍 |
| 06 | 弹孔（幸存者偏差）· **样片**，新做法 | [006-弹孔-样片.mp4](output/006-弹孔-样片.mp4) | 横屏 16:9 | 45.6 秒（开头） | **自带音效**；另有 [音效 WAV](output/006-弹孔-样片-音效.wav) |
| 06 | 同上 · **抖音竖版样片** | [006-弹孔-样片-抖音竖版.mp4](output/006-弹孔-样片-抖音竖版.mp4) | 竖屏 9:16 | 45.6 秒 | 自带音效，和横版同一条 |

**第 06 期起整体改版**：对照了这个赛道里爆款的逐帧拆解，开头、字幕、画面、声音都按爆款的做法改了，见 [运营/爆款拆解.md](运营/爆款拆解.md)。现在先给 45.6 秒样片，确认后再做全片（约 2 分 30 秒），分镜见 [第 06 期分镜](videos/006-survivors/分镜.md)。

**数据和发布文案**：每期发布后的后台数据、判断和下一期的改法记在 [运营/数据复盘.md](运营/数据复盘.md)，里面也有每期的抖音标题、话题和置顶评论。

每期的分镜、片中用到的事实和实测结果都在 `videos/<期>/分镜.md`：[第 01 期](videos/001-buffon-needle/分镜.md) · [第 02 期](videos/002-monty-hall/分镜.md) · [第 03 期](videos/003-birthday/分镜.md) · [第 04 期](videos/004-random-walk/分镜.md) · [第 05 期](videos/005-regression/分镜.md)。

**封面**：第 03–05 期另有 16:9 / 4:3 / 3:4 三张封面图（`output/00N-xxx-封面-*.jpg`）。抖音用 3:4 竖封面，B 站用 16:9 或 4:3。

### 系列风格（第 04 期起固定）

内容开始往**心理、哲学**方向靠：仍然是一道用代码真实算出来的题，但最后落到一个关于人的问题上。每期都有：

- 三段式「**问 → 算 → 想**」，右上角小进度条显示现在在哪一段；左上角台标「算给你看 · 05」
- 每次大模拟开始时，弹出统一的「▶ 模拟 1 万个学员 · 每人飞两次」这样的标签
- 收尾固定栏目「**算完了，想一想**」：宋体、暖色纸面，像一页读书笔记，最后给一个能带走的方法或观点题
- 评论区问题是人人都能答的观点题（第 04 期："你是醉汉，还是鸟？"；第 05 期："你信「严师出高徒」吗？"）
- 第 05 期起：时长可以长，重点是给观众带来价值；每期给一个能带走的方法（第 05 期：看到"做了 X 就变好"，先问"不做 X 呢？"）

第 03 期起的文案调整（前两期发完只涨了 3 个粉）见 [第 03 期分镜](videos/003-birthday/分镜.md) 开头的对比表。

**下载方法**：在 GitHub 上点开文件，再点右上角的下载按钮（Download raw file）。

**配乐**：第 02–05 期没有音轨，导入剪映后直接加音乐即可。各段落都从 100 BPM 的小节线开始（每 2.4 秒一小节），选 100 BPM 左右的曲子更容易卡点。

**音效（第 06 期起）**：片子自带音效（飞机掠过、弹孔落下的"嗒"、片名的钟声）。在剪映电脑版里：
1. 导入视频和 `-音效.wav`，WAV 拖到音频轨道的第 0 秒，和视频对齐（如果视频自带的声音能正常播放，也可以直接用视频里的，不用 WAV）。
2. 音乐放另一条音频轨道，音量调低一些，让音效听得见。
3. 可选：第 27.6–28.4 秒把音乐也压下去，答案前这 0.8 秒的静音最有冲击力。

## 发布前检查

- [ ] 核对内容：分镜.md 末尾列出了片中用到的全部事实和数字
- [ ] 发布时打开「AI 生成内容」声明（《人工智能生成合成内容标识办法》的要求）
- [ ] 抖音发 `-抖音竖版.mp4`，B 站等横屏平台发横版
- [ ] 封面：上传 `-封面-3x4.jpg`。不要直接用横屏画面的某一帧，会被裁成竖图、标题缺字
- [ ] 标题和话题对应本期内容，不要沿用上一期（第 03 期标题曾误写成"三门问题"）
- [ ] 话题：#vibe知识大赏 + 本期相关的话题（每期的标题、话题和置顶评论写在 [运营/数据复盘.md](运营/数据复盘.md)）
- [ ] 置顶一条评论，写上下期预告，引导关注

## 下一条怎么做

第 06 期样片看完后，在 Kiro 里说"样片可以，做全片"，或者说哪里要改。流程：

1. Kiro 先写分镜（每段画面 + 字幕），再做开头 30–45 秒的样片给你看
2. 你确认后，Kiro 做全片、自检，然后推送到这个仓库
3. 你下载、配乐、发布；4 小时和 24 小时各把后台数据告诉 Kiro（平均播放时长、2 秒跳出、5 秒完播、涨粉、收藏），用来调整下一条

制作约定（画幅、音频、种子等）写在 [.kiro/steering/video-conventions.md](.kiro/steering/video-conventions.md)，Kiro 每次都会按它来做。

---

## 技术说明（给 Kiro / 开发者）

**流程**：每期一个场景目录（`videos/<id>/scene.js` 是入口），用 Canvas 2D 按时间逐帧绘制，可选地用 Web Audio 合成配乐。在无头 Chrome 里用 WebCodecs 编码：视频 H.264 High、BT.709 有限范围，音频（如果有）Opus 192 kbps。最后由 `engine/mp4.js` 封装成 faststart MP4。全程不需要 ffmpeg，也不需要联网。场景不写 `audio()` 时，输出只有画面。

```sh
node engine/render.mjs videos/002-monty-hall                          # 渲染成片到 output/（约 1.5 分钟）
node engine/render.mjs videos/002-monty-hall --preview 0,5,12.5       # 指定时刻的静帧 + 拼图，输出到 previews/
node engine/render.mjs videos/004-random-walk --cover                 # 导出 16:9 / 4:3 / 3:4 三张封面（场景需实现 cover()）
node engine/render.mjs videos/004-random-walk-vertical                # 抖音竖版（包装 16:9 场景：上标题、中画面、下大字幕）
node engine/caption-check.mjs videos/004-random-walk-vertical         # 用真实字体打印竖版每条字幕的字号和换行
node engine/caption-density.mjs videos/006-survivors                  # 字幕密度：每分钟字数、每句字数、有字幕的时间占比
node engine/render.mjs videos/006-survivors --no-silent --wav         # 带音效的 MP4 + 单独的 -音效.wav（给剪映）
node engine/render.mjs videos/006-survivors --audio-only              # 只出音效 WAV（几秒），调声音时用
node engine/inspect.mjs output/xxx.mp4 --every 1 [--frames]           # 抽帧拼图、镜头切换、音量、BPM（横竖屏都行）
node engine/audio-bench.mjs videos/001-buffon-needle 10,30            # 测配乐渲染耗时
```

- `inspect.mjs` 也用来拆解参考视频。支持 H.264 / VP8 / VP9，不支持 HEVC（H.265 的视频请先导出成 H.264）。
- 依赖：Node 22、`playwright-core`、`chrome-headless-shell`，都会自动查找；找不到时用 `PLAYWRIGHT_CORE` / `CHROME_BIN` 环境变量指定。
- 场景接口见 `engine/runtime.js` 文件头。`draw(ctx, t)` 必须支持随机跳转到任意时刻，预览会跳着渲染。
- 配乐的音频节点按 1 秒窗口逐段创建（`OfflineAudioContext.suspend/resume`），播完就断开。如果一次建好整张图，2 分钟的配乐要渲染 10 分钟以上；现在约 8 秒。
- 版式：竖屏要避开抖音的界面遮挡（顶部 y < 220，右侧按钮栏 x > 930，底部文案区 y > 1520）；横屏的字幕放在 y ≈ 970，避开 B 站等播放器底部的进度条。
- 系列组件在 `engine/brand.js`：`drawBadge`（台标）、`drawActs`（问→算→想 进度条）、`drawSimTag`（▶ 模拟标签）、`drawThinkCard`（想一想卡片）、`drawCover`（任意比例封面）。
- 第 06 期起的画面语法在 `engine/film.js`：`developText`（逐字从模糊到清楚）、`drawFilmCaptions`、`drawTitleCard`、`drawFlash`、`makeDust/drawDust`、`drawChapter`（左上章节标 + 问算想）、`drawDenominator`（右上分母表）、`drawAnchor`（年份 · 地点 · 人物）。全部是时间 t 的纯函数，预览可以随便跳。
- 音效工具在 `engine/sfx.js`（`createSfx`：tick、bell、whoosh、impact、riser、swell、bed、hum、typewriter、rain），音符按 1 秒窗口懒创建。`runtime.js` 可以另存 16-bit WAV（`--wav`、`--audio-only`），场景可用 `audioPeakDb` 设峰值（音效轨用 −3 dBFS）。
- `drawRich`（`engine/kit.js`）会把 `ctx.textAlign` 改成 `'left'`。之后如果还要用 `fillText` 居中，先重新设成 `'center'`（第 05 期的对照组方框就因此整体偏右，箭头压住了数字）。
- 字体在 `fonts/`，全部是 SIL OFL 1.1 授权，可免费商用：Noto Sans SC（思源黑体）、Noto Serif SC（思源宋体，用于"想一想"和片名）、IM Fell French Canon（没有 π、≈ 等符号）、EB Garamond、Source Code Pro（等宽数字；**没有中文字形**，中文必须换回黑体，否则会显示成方框）、Courier Prime（打字机字体，只有西文，用于历史文件）。
- 门、汽车、羊等图形全部用代码画，不用图片或 emoji，没有版权问题。
- 随机种子事先定好，不为结果去挑。各期的种子和实测结果见对应的分镜.md。
