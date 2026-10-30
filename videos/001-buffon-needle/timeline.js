// Timeline for the long cut. 100 BPM: BEAT = 0.6 s, BAR = 2.4 s. Sections start on bar lines so
// the music (audio.js) and the visuals share one grid. See 分镜.md for the storyboard.
import { C } from './style.js';

export const BEAT = 0.6;
export const BAR = 2.4;
const b = (n) => +(n * BAR).toFixed(4);

export const T = {
  hook: 0, hist: b(2), setup: b(5), test: b(9), mystery: b(13),
  p1: b(15), p2: b(19), p3: b(22), p3b: b(24), p4: b(26), p5: b(30),
  flip: b(34), exp: b(36), reveal: b(42), twist: b(45), outro: b(53), end: b(55),
};

// Events inside sections (seconds).
Object.assign(T, {
  stickLand: T.hist + 2 * BAR, // 9.6: the stick hits the planks on the 1777 card
  linesIn: T.setup + 0.2,
  ruleIn: T.setup + 3.3, // 15.3: needle grows to span one gap
  demoZoom: T.setup + 6.3, // 18.3
  testZoom: T.test, // zoom out to the wide floor
  testDrop0: T.test + 3 * BEAT + BAR / 2, // 24.6: first of 1,000 needles
  testDrop1: T.test + 3 * BEAT + BAR / 2 + 7 * BEAT, // 28.8: the 1,000th lands
  theory: T.test + 6.4, // 28.0: "理论值 2/π ≈ 63.7%"
  p1Drop0: T.p1 + 2 * BEAT, // 37.2
  p1Drop1: T.p1 + 10 * BEAT, // 42.0
  p2Drops: [T.p2 + 6 * BEAT, T.p2 + 8 * BEAT, T.p2 + 10 * BEAT], // 49.2, 50.4, 51.6
  p3bDrop0: T.p3b + BEAT, // 58.2
  p3bDrop1: T.p3b + 4 * BEAT, // 60.0: all 1,000 noodles are down before the result caption
  circleDrops: Array.from({ length: 9 }, (_, k) => T.p4 + 5 * BEAT + k * BEAT / 2), // 65.4 ... 67.8
  unroll: T.p4 + 10 * BEAT + 0.2, // 68.6
  expDrop0: T.exp + 2 * BEAT, // 87.6: continue from 1,000 needles
  expDrop1: T.exp + 20 * BEAT, // 98.4: the millionth lands
});

// Log-spaced drop schedule: count goes from `from` (at t0) to `to` (at t1).
export function logCount(t, t0, t1, from, to) {
  if (t < t0) return from === 1 ? 0 : from;
  if (t >= t1) return to;
  return Math.floor(from * (to / from) ** ((t - t0) / (t1 - t0)) + 1e-9);
}
export function logLand(i, t0, t1, from, to) {
  return t0 + ((t1 - t0) * Math.log((i + 1) / from)) / Math.log(to / from);
}
export function logRate(t, t0, t1, from, to) {
  if (t < t0 || t > t1) return 0;
  const n = from * (to / from) ** ((t - t0) / (t1 - t0));
  return (n * Math.log(to / from)) / (t1 - t0);
}

// Main floor needle count over the whole episode.
export function needleCount(t) {
  if (t < T.testDrop0) return 0;
  if (t < T.expDrop0) return logCount(t, T.testDrop0, T.testDrop1, 1, 1000);
  return logCount(t, T.expDrop0, T.expDrop1, 1000, 1_000_000);
}
export function landTime(i) {
  return i < 1000 ? logLand(i, T.testDrop0, T.testDrop1, 1, 1000) : logLand(i, T.expDrop0, T.expDrop1, 1000, 1_000_000);
}

const fix = (v, d = 2) => v.toFixed(d);

// Captions are built after the simulations run, so every number quoted is the measured one.
export function buildCaptions(s) {
  const amber = (x) => [x, C.amber];
  return [
    { t0: 5.0, t1: 8.4, zh: '1777 年，博物学家布丰在书中问：', en: 'In a 1777 book, the naturalist Buffon asked:' },
    { t0: 8.5, t1: 11.9, zh: '小棍扔在木地板上，压到缝的概率？', en: 'Toss a stick on a plank floor: odds it lands on a seam?' },
    { t0: 12.2, t1: 15.2, zh: '把木板缝看成一条条平行线', en: 'Think of the seams as parallel lines' },
    { t0: 15.3, t1: 18.3, zh: [['再拿一根针，'], amber('长度正好等于线距')], en: 'Take a needle exactly as long as the gap' },
    { t0: 18.4, t1: 21.4, zh: '扔下去：要么压线，要么不压线', en: "Drop it: it either crosses a line, or it doesn't" },
    { t0: 21.8, t1: 24.5, zh: '压线的概率是多少？先猜一猜', en: 'So what are the odds? Take a guess' },
    { t0: 24.6, t1: 27.9, zh: '不用猜，直接扔 1000 根', en: 'No need to guess. Drop 1,000' },
    { t0: 28.0, t1: 31.0, zh: [['理论上，这个比例正好是 '], amber('2/π ≈ 63.7%')], en: 'In theory, the ratio is exactly 2/π ≈ 63.7%' },
    { t0: 31.3, t1: 33.6, zh: [['等等，'], amber('π'), [' 不是圆周率吗？']], en: "Wait, isn't π about circles?" },
    { t0: 33.7, t1: 35.9, zh: [['这里一个圆都没有，'], amber('π'), [' 从哪来？']], en: "There's no circle here. Where does π come from?" },
    { t0: 36.1, t1: 39.1, zh: '先做个实验：把针加长一倍', en: 'An experiment: make the needle twice as long' },
    { t0: 39.2, t1: 42.3, zh: '长针能同时压两条线，所以数交点', en: 'A long needle can hit two lines, so count every crossing' },
    { t0: 42.4, t1: 45.4, zh: [['平均压线次数，也跟着'], amber('翻倍')], en: `The average doubles too: ${fix(s.shortAvg)} → ${fix(s.longAvg)}` },
    { t0: 45.7, t1: 49.1, zh: '因为长针 = 两根短针首尾相连', en: 'A long needle is just two short ones, end to end' },
    { t0: 49.2, t1: 52.6, zh: '两段各压各的，次数直接相加', en: 'Each half crosses on its own; the counts add up' },
    { t0: 52.9, t1: 57.4, zh: '就算掰弯，每一小段也照样各压各的', en: 'Bend it, and every little piece still counts on its own' },
    { t0: 57.7, t1: 60.0, zh: '不信？扔 1000 根弯针试试', en: "Don't believe it? Drop 1,000 bent ones" },
    { t0: 60.1, t1: 62.3, zh: [['平均 '], amber(fix(s.noodleAvg)), [' 次，和直针几乎一样']], en: `Average ${fix(s.noodleAvg)}: same as straight. Only length matters` },
    { t0: 62.5, t1: 65.2, zh: [['那就弯成一个圆：'], amber('直径 = 线距')], en: 'Now bend it into a circle as wide as the gap' },
    { t0: 65.3, t1: 68.3, zh: [['不管落在哪，都正好压线 '], amber('2'), [' 次']], en: 'Wherever it lands, it crosses exactly twice' },
    { t0: 68.4, t1: 71.8, zh: [['它的周长 = '], amber('π'), [' × 直径 = '], amber('π'), [' 根针长']], en: 'Its length: π × diameter = π needle-lengths' },
    { t0: 72.1, t1: 75.3, zh: [['长 '], amber('π'), [' 压 2 次，长 1 就压 '], amber('2/π'), [' 次']], en: 'Length π → 2 crossings, so length 1 → 2/π' },
    { t0: 75.4, t1: 78.5, zh: [['直针最多压 1 次，所以 '], amber('2/π'), [' 就是概率']], en: 'A straight needle crosses at most once: 2/π is the chance' },
    { t0: 78.6, t1: 81.4, zh: [amber('π'), ['，原来就藏在这个圆里']], en: 'π was hiding in that circle all along' },
    { t0: 81.7, t1: 84.1, zh: [['反过来：数出压线比例，就能算 '], amber('π')], en: 'Run it backwards: count crossings, get π' },
    { t0: 84.2, t1: 86.3, zh: '接着刚才那 1000 根，继续扔', en: 'Pick up where those 1,000 needles left off' },
    { t0: 86.5, t1: 90.0, zh: [['一直扔到 '], amber('100 万根'), ['！']], en: 'All the way to a million!' },
    { t0: 90.1, t1: 94.6, zh: '看下面这条线：越扔越稳', en: 'Watch the line below: it settles down' },
    { t0: 94.7, t1: 100.6, zh: [['扔得越多，就越接近真正的 '], amber('π')], en: 'The more we drop, the closer we get' },
    { t0: 101.0, t1: 104.4, zh: [['100 万根针，算出 '], amber(`π ≈ ${s.piFinal.toFixed(5)}`)], en: `A million needles: π ≈ ${s.piFinal.toFixed(5)}` },
    { t0: 104.5, t1: 107.8, zh: [['全凭随机，误差只有 '], amber(`${s.errPct}%`)], en: `Pure chance, off by only ${s.errPct}%` },
    { t0: 108.1, t1: 111.3, zh: [['不过，100 万根也只准到 '], amber('3.14')], en: 'Still, a million needles only nails 3.14' },
    { t0: 111.4, t1: 114.7, zh: [['想多准 1 位小数，要多扔约 '], amber('100 倍')], en: 'Each extra digit takes about 100× more needles' },
    { t0: 114.8, t1: 118.0, zh: [['可 1901 年，有人说只扔了 '], amber('3408 次')], en: 'Yet in 1901, Lazzarini said he tossed just 3,408 times' },
    { t0: 118.1, t1: 121.3, zh: [['就得到 '], amber('3.1415929'), ['，准到 6 位小数']], en: '…and got 3.1415929: six correct decimals' },
    { t0: 121.4, t1: 124.6, zh: [['这正是祖冲之的“密率” '], amber('355/113')], en: "Exactly 355/113, Zu Chongzhi's famous fraction" },
    { t0: 124.7, t1: 127.0, zh: '运气太好？还是“凑”出来的？', en: 'Lucky? Or cooked?' },
  ];
}
