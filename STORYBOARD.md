# 梵高 · 分镜

框架：一封写给提奥的信。开场是信纸，结尾回到同一张信纸（3:10 重复"亲爱的提奥"），首尾闭环。
节拍：91 BPM，一拍 0.66 秒，一小节 2.64 秒。说唱段每句 2 拍，副歌每句 1 小节（见 `data/lyrics_timing.json`）。

## 不做成 PPT 的规则
1. 画面里没有静止的图片，所有东西都由会流动的笔触画出来。
2. 不用淡入淡出换场景，换场景时让笔触变形过渡（例如太阳旋成漩涡，变成星夜）。
3. 镜头一直在动（推、拉、摇、旋转）；鼓点让镜头轻微前推，星星跟着闪。
4. 歌词按每个字唱出的时间逐字出现，在唱完后向上散开退场；同一时间只显示一句。
5. 视频模型生成的镜头不能直接拼接，要用同一套笔触渲染器重画一遍（见下文），保证整片画风一致。

## 分段
| 时间 | 段落 | 画面 | 做法 |
|---|---|---|---|
| 0:00–0:12 | 前奏独白 | 泛黄信纸，钢笔写出"亲爱的提奥"；镜头推进信上的速写，速写动起来 | 代码 |
| 0:12–0:35 | 主歌 1（1888 阿尔勒，说唱） | 速写本快速翻页，每 2 拍一页；黄色为主；苦艾那句唯一一次用绿色，割耳那句唯一一次用红色 | 代码 + 视频模型 |
| **0:35–1:06** | **副歌 1 → 1889** | **太阳旋成星夜；画家孤零零站在山坡上；"万人"那句满天星；镜头推向最亮的星再拉开；1889 落进角标；三声"耶"各落下一根铁栏** | **代码（已出样片）** |
| 1:06–1:17 | 主歌 2 + 加速段（疗养院） | 铁窗把天空剪成几块；加速段每唱一句添一个元素，四句唱完拼成《星月夜》 | 代码 |
| 1:18–1:23 | 铺垫（麦田、乌鸦） | 黄色麦田，乌鸦越来越多，压住半边天 | 代码 |
| 1:23–1:33 | 鼓停下的独白 | 画面安静地暗下去，只剩一个小白点；两块墓碑，藤蔓用程序长满，年份从 1890 走到 1990 | 代码 |
| 1:36–2:00 | 副歌 2（死后） | 歌词同副歌 1，画面反过来：挤满人、闪光灯不停 | 代码 + 视频模型 |
| 2:02–2:16 | Bridge（六百封信） | 信飘上夜空变成星星；唱到"只有你信"时两颗星之间连起一条光 | 代码 + 视频模型 |
| 2:17–2:32 | Outro（一百年后） | 排队、闪光灯、拍卖锤、八千万、帆布包和手机壳、9.9 包邮，全部跟着鼓点切；"隔着玻璃"时镜头推进笔触 | 视频模型 + 代码 |
| 2:34–2:41 | 结尾独白 | 回到信纸写下"还是很亮" | 代码 |
| 2:44–2:58 | 纯器乐高潮（全曲最响） | 漩涡转速加倍，那颗星亮到发白；3:02 熄灭，黑屏 | 代码 |
| 3:10–3:18 | 重复开头 | 回到开场那封信，落款 Vincent | 代码 |

## 视频模型镜头
这个沙盒不能联网调用视频生成服务。请用你常用的模型（可灵、即梦、Runway、Veo 等）生成下面的镜头，放进 `assets/clips/`。

我拿到素材后的处理方式：把每一帧当作颜色来源，按画面纹理计算笔触方向，按帧间运动推动笔触，用同一套渲染器重画一遍。所以素材本身不用追求画风完全一致，**构图清楚、动作明确**最重要。

通用要求：16:9，1080p 及以上，5 秒，镜头缓慢移动，**画面中不要出现文字、字幕、水印、logo**。
通用提示词后缀：`Van Gogh oil painting style, thick impasto brushstrokes, cobalt blue and chrome yellow, 1880s Provence, cinematic, slow camera move, no text, no watermark`

| 编号 | 用于 | 实际时长 | 提示词主体 |
|---|---|---|---|
| V01 | 0:13.4 画架一扛 往南走 | 1.3 s | A red-bearded painter in a straw hat walks along a sunlit dirt road carrying an easel and canvas on his back, side view, long shadow |
| V02 | 0:17.4 苦艾一口 就上头 | 1.3 s | Close-up of a glass of glowing green absinthe on a café table at night, a hand lifts it, the light warps |
| V03 | 0:20.0–0:22.5 俩猛兽 / 摔门 | 3.8 s | Two empty wooden chairs facing each other in a small yellow room; one chair is suddenly knocked over, a door slams |
| V04 | 0:26.6 全镇签名 堵在门口 | 1.3 s | Silhouettes of townspeople crowding at a doorway at dusk, holding up a petition paper |
| V05 | 1:43.3 死后 万人鼓掌 | 1.9 s | A packed modern museum gallery, crowd applauding in front of a glowing starry night painting, seen from behind |
| V06 | 2:17.1 一百年后 排队看星 | 1.5 s | A long queue of visitors winding through a museum toward a single small painting, high angle |
| V07 | 2:18.6 闪光灯 刺我眼睛 | 1.3 s | Dozens of raised smartphones flashing toward the camera in a dark gallery |
| V08 | 2:19.8 拍卖锤响 全场安静 | 1.3 s | Extreme close-up of an auction gavel striking the block, frozen silent audience behind |
| V09 | 2:22.3 印上帆布包 手机屏 | 1.4 s | Tote bags, phone cases and mugs printed with a swirling starry sky, product shot on a turntable |
| V10 | 2:25.2 可你隔着玻璃 看清 | 1.3 s | A visitor's reflection on museum glass, the camera pushes through the glass into thick brushstrokes |
| V11 | 2:02 六百封信 | 2.5 s | Candlelit desk, a hand writing a letter with a dip pen, small sketches in the margin, stacks of letters |
| V12 | 2:07.4 你给颜料 给体温 | 2.4 s | Two hands passing paint tubes and a few coins across a wooden table, warm lamp light |
