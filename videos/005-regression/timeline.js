// Timeline for episode 05. 100 BPM, BAR = 2.4 s, 54 bars = 129.6 s (2:10). Sections start on
// bar lines so the user's own music cuts to the same grid. See 分镜.md for the storyboard.
import { C } from './style.js';

export const BEAT = 0.6;
export const BAR = 2.4;
const b = (n) => +(n * BAR).toFixed(4);

export const T = {
  hook: 0, story: b(2), gut: b(8), setup: b(10), pick: b(13), second: b(15), why: b(20),
  coins: b(26), galton: b(31), life: b(34), control: b(40), think: b(44), outro: b(50), end: b(54),
};

Object.assign(T, {
  question: 1.6, // "你信「严师出高徒」吗？" pops in the hook
  kahneman: T.story + 0.2, // 5.0
  quote: T.story + 3.9, // 8.7: the instructor objects
  quote2: T.story + 7.6, // 12.4: second half of his words
  turn: T.story + 11.6, // 16.4: "现象是真的，结论错了"
  gutBars: T.gut + 0.3, // 19.5
  fill0: T.setup + 1.2, // 25.2: ▶ the first flights pour in
  fill1: T.setup + 5.6, // 29.6
  noPraise: T.setup + 3.7, // 27.7: "谁也不夸，谁也不骂"
  pickTop: T.pick + 0.3, // 31.5
  pickBot: T.pick + 1.7, // 32.9
  fly2Top: T.second + 0.3, // 36.3
  fly2Bot: T.second + 4.1, // 40.1
  punch: T.second + 8.1, // 44.1
  whyTop1: T.why + 4.1, // 52.1
  whyTop2: T.why + 8.1, // 56.1
  whyBot: T.why + 12.1, // 60.1
  toss1: T.coins + 1.0, // 63.4
  coinMark: T.coins + 3.7, // 66.1
  toss2: T.coins + 4.4, // 66.8
  coinResult: T.coins + 7.5, // 69.9
  galtonKids: T.galton + 3.9, // 78.3
  cards: [T.life + 3.1, T.life + 6.1, T.life + 9.1], // 84.7, 87.7, 90.7
  lifeSum: T.life + 12.1, // 93.7
  split: T.control + 3.5, // 99.5
  gains: T.control + 6.7, // 102.7
});

// Log-spaced count: 1 at t0 -> `to` at t1.
export function logCount(t, t0, t1, to) {
  if (t <= t0) return 0;
  if (t >= t1) return to;
  return Math.max(1, Math.floor(to ** ((t - t0) / (t1 - t0))));
}

const f1 = (x) => x.toFixed(1);
const pct = (x) => `${Math.round(100 * x)}%`;
// Luck shown as (rounded score − rounded skill), so every sum on screen adds up exactly.
export const r1 = (x) => Math.round(x * 10) / 10;
export const luck = (score, skill) => (r1(score) - r1(skill)).toFixed(1);
// Same for the control group's gains: 38.8 -> 48.8 is shown as +10.0 (exact 10.05), not +10.1.
export const gain = (m1, m2) => (r1(m2) - r1(m1)).toFixed(1);

// Captions are built after the simulations run, so every number quoted is the measured one.
// zh: '' means the picture already carries the Chinese (quote card, 想一想 card); vzh gives the
// Chinese for the vertical cut, where the picture is too small to read.
export function buildCaptions(s) {
  const amber = (x) => [x, C.amber];
  const cyan = (x) => [x, C.cyan];
  const c = s.cad;
  const k = s.coin;
  const g = s.ctrl;
  return [
    { t0: 3.0, t1: 4.7, zh: '这要从诺贝尔奖得主卡尼曼讲过的一个故事说起', en: 'It starts with a story the Nobel laureate Daniel Kahneman liked to tell' },
    { t0: 5.0, t1: 8.6, zh: '心理学家卡尼曼给以色列空军的飞行教官上课，讲"奖励比惩罚更管用"', en: 'The psychologist was teaching Israeli Air Force flight instructors that praise works better than punishment' },
    { t0: 8.7, t1: 12.3, zh: '', vzh: [['老教官反对："我夸过的学员，下次通常'], amber('飞得更差'), ['。"']], en: 'A senior instructor objected: "When I praise a cadet, he usually does worse next time.' },
    { t0: 12.4, t1: 16.2, zh: '', vzh: [['"我骂过的，下次通常'], amber('飞得更好'), ['。别跟我说夸比骂有用。"']], en: 'When I scream at one, he usually does better. So don\'t tell me praise works."' },
    { t0: 16.4, t1: 19.0, zh: [['卡尼曼发现：他说的现象是真的，但'], amber('结论错了')], en: 'Kahneman realised: what he saw was real. His conclusion was wrong.' },
    { t0: 19.4, t1: 23.8, zh: '你是不是也觉得，骂比夸管用？我们来算一算', en: 'Do you also feel that scolding works better than praise? Let\'s run the numbers' },
    { t0: 24.2, t1: 27.6, zh: [['模拟 1 万个学员，每人飞两次。每次成绩 = '], amber('实力 + 运气')], en: 'Simulate 10,000 cadets, two flights each. Every score = skill + luck' },
    { t0: 27.7, t1: 31.0, zh: [['关键是：这一次，'], amber('谁也不夸，谁也不骂')], en: 'The key: this time, nobody is praised and nobody is scolded' },
    { t0: 31.4, t1: 35.8, zh: [['第一次最好的 10%，本该被'], amber('夸'), ['；最差的 10%，本该被'], cyan('骂')], en: 'The best 10% of first flights would have been praised; the worst 10%, scolded' },
    { t0: 36.2, t1: 40.0, zh: [['再飞一次：最好的那组，平均从 ', C.text], amber(`${f1(c.top1)} 掉到 ${f1(c.top2)}`)], en: `Second flight: the best group drops from ${f1(c.top1)} to ${f1(c.top2)} on average` },
    { t0: 40.1, t1: 44.0, zh: [['最差的那组，平均从 '], cyan(`${f1(c.bot1)} 涨到 ${f1(c.bot2)}`)], en: `The worst group rises from ${f1(c.bot1)} to ${f1(c.bot2)}` },
    { t0: 44.1, t1: 47.8, zh: [['没人夸也没人骂，可'], amber('"夸了变差、骂了变好"'), ['照样出现了']], en: 'Nobody praised, nobody scolded, and still: "praise makes you worse, scolding makes you better"' },
    { t0: 48.2, t1: 52.0, zh: '为什么？因为成绩 = 实力 + 运气，而运气每次都会重新来过', en: 'Why? A score is skill plus luck, and luck is drawn again every time' },
    { t0: 52.1, t1: 56.0, zh: [['能进前 10% 的，多半实力好、'], amber('又碰上了好运气')], en: `To make the top 10%, you usually need skill and good luck: ${f1(c.top1)} = ${f1(c.topSkill)} + ${luck(c.top1, c.topSkill)}` },
    { t0: 56.1, t1: 60.0, zh: [['第二次，实力还在，'], amber('运气却回到了平常')], en: `Second time, the skill stays, but the luck is back to ordinary: ${f1(c.topSkill)} + ${luck(c.top2, c.topSkill)} = ${f1(c.top2)}` },
    { t0: 60.1, t1: 62.2, zh: [['最差那组正好反过来：'], cyan('坏运气走了')], en: 'The worst group is the mirror image: the bad luck goes away' },
    { t0: 62.6, t1: 66.0, zh: '卡尼曼当场在地上画了个粉笔靶，让教官们背对靶子，各扔两枚硬币', en: 'Kahneman drew a chalk target on the floor; the instructors turned their backs and each tossed two coins' },
    { t0: 66.1, t1: 69.8, zh: [['我们照做了 30 人：第一次离靶最近的 10 人，第二次平均从 '], amber(`${Math.round(k.best1)} 厘米变成 ${Math.round(k.best2)} 厘米`)], en: `We did it with 30 people: the 10 closest went from ${Math.round(k.best1)} cm to ${Math.round(k.best2)} cm on average` },
    { t0: 69.9, t1: 74.2, zh: [['这里根本没有技术，只有运气。'], amber('最好的照样变差，最差的照样变好')], en: `No skill at all, only luck. The best still got worse; the worst 10 still improved (${Math.round(k.worst1)} → ${Math.round(k.worst2)} cm)` },
    { t0: 74.6, t1: 78.2, zh: [['这就是'], amber('"回归均值"'), ['。"回归"这个词，来自 1886 年高尔顿对身高的研究']], en: 'This is "regression to the mean". The word comes from Francis Galton\'s 1886 study of height' },
    { t0: 78.3, t1: 81.4, zh: '特别高的父母，孩子通常也高，但平均没父母那么高', en: 'Very tall parents usually have tall children, but on average not as tall as themselves' },
    { t0: 81.8, t1: 84.6, zh: '它在生活里，天天骗我们', en: 'In everyday life, it fools us all the time' },
    { t0: 84.7, t1: 87.6, zh: '考砸之后挨了顿骂，下次考好了', en: 'You fail a test, get told off, and do better next time' },
    { t0: 87.7, t1: 90.6, zh: '最难受的时候吃了个偏方，病就好了', en: 'You try a folk remedy at your sickest, and then you recover' },
    { t0: 90.7, t1: 93.6, zh: '运动员上了杂志封面，下个赛季就变差，人称"封面魔咒"', en: 'An athlete makes the magazine cover and slumps the next season: the "cover jinx"' },
    { t0: 93.7, t1: 95.8, zh: [['共同点：'], amber('极端之后，总会往回走')], en: 'What they share: after an extreme, things drift back' },
    { t0: 96.2, t1: 99.4, zh: '那怎么知道，到底是"骂"有用，还是回归？', en: 'So how can you tell whether the scolding worked, or it was just regression?' },
    { t0: 99.5, t1: 102.6, zh: [['把最差的那组随机分两半：一半挨骂，一半'], amber('不管')], en: 'Split the worst group at random: scold one half, leave the other alone' },
    { t0: 102.7, t1: 105.4, zh: [['都进步了约 10 分：要看骂有没有用，得'], amber('和不骂的比')], en: `Both improve by about 10 points (+${gain(g.scolded1, g.scolded2)} vs +${gain(g.alone1, g.alone2)}). To judge scolding, compare with not scolding` },
    // The 想一想 card carries the Chinese itself; captions give the English, vzh the vertical Chinese.
    { t0: 106.4, t1: 110.8, zh: '', vzh: [['卡尼曼说：我们夸人，会被统计"'], amber('惩罚'), ['"；骂人，反而被统计"'], amber('奖励'), ['"']], en: 'Kahneman: we are statistically punished for rewarding others, and rewarded for punishing them' },
    { t0: 111.0, t1: 115.0, zh: '', vzh: [['这不是说严格没用，而是'], amber('"骂完变好了"证明不了骂有用')], en: 'This does not mean strictness never works. It means "better after scolding" proves nothing' },
    { t0: 115.2, t1: 119.7, zh: '', vzh: [['下次看到"做了 X 之后变好了"，先问：'], amber('不做，会不会也变好？')], en: 'Next time you see "it got better after X", ask first: would it have got better without X?' },
  ];
}

export { pct };
