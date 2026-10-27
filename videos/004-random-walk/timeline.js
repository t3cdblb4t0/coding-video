// Timeline for episode 04. 100 BPM, BAR = 2.4 s, 42 bars = 100.8 s (1:41). Sections start on
// bar lines so the user's own music cuts to the same grid. See 分镜.md for the storyboard.
import { C } from './style.js';

export const BEAT = 0.6;
export const BAR = 2.4;
const b = (n) => +(n * BAR).toFixed(4);

export const T = {
  hook: 0, story: b(2), rules: b(7), d1: b(10), d2: b(13), wait: b(17), d3: b(22),
  why: b(27), think: b(32), outro: b(38), end: b(42),
};

Object.assign(T, {
  parkMeet: T.story + 0.4, // two walkers in the park keep meeting
  polyaCard: T.story + 7.4, // 12.2: name card + the 1921 paper
  ruleSpin: T.rules + 0.6, // crossroads with four 1/4 arrows
  d1Run0: T.d1 + 1.2, // 25.2: ▶ simulation starts
  d1Run1: T.d1 + 5.6, // 29.6: all 10,000 steps done
  d2Run0: T.d2 + 1.0, // 32.2
  d2Run1: T.d2 + 6.2, // 37.4
  d2Proof: T.d2 + 6.9, // 38.1: "迟早 100%"
  waitCount0: T.wait + 3.4, // 44.2: step counter spins up
  waitCount1: T.wait + 5.4, // 46.2: lands on 42,637,698 (the caption gives the number only then)
  waitInf: T.wait + 8.4, // 49.2: "平均等待 = ∞"
  d3Run0: T.d3 + 1.4, // 54.2
  d3Run1: T.d3 + 6.6, // 59.4
  d3Never: T.d3 + 7.5, // 60.3: "66% 永远回不去"
  whyCols: T.why + 0.4, // three columns
  quote: T.why + 7.6, // 72.4: Kakutani
});

// Simulated step count shown at time t: log-spaced from 1 to `to` between t0 and t1.
export function stepsAt(t, t0, t1, to) {
  if (t <= t0) return 0;
  if (t >= t1) return to;
  return Math.max(1, Math.floor(to ** ((t - t0) / (t1 - t0))));
}

const pct = (x) => `${(100 * x).toFixed(1)}%`;

// Captions are built after the simulations run, so every number quoted is the measured one.
export function buildCaptions(s) {
  const amber = (x) => [x, C.amber];
  const f = (n) => n.toLocaleString('en-US');
  return [
    { t0: 3.0, t1: 4.7, zh: '这事，要从 1921 年一位数学家的散步说起', en: "It all starts with a mathematician's walk in 1921" },
    { t0: 5.0, t1: 8.6, zh: '数学家波利亚在苏黎世散步时，总撞见同一对情侣', en: 'Out walking in Zürich, the mathematician George Pólya kept running into the same couple' },
    { t0: 8.7, t1: 12.1, zh: '他想：大家都是随便走，为什么老能碰上？', en: 'Everyone was wandering at random. So why did they keep meeting?' },
    { t0: 12.2, t1: 16.5, zh: [['1921 年，他写了一篇论文：'], amber('《街道网中的随机漫步》')], en: 'In 1921 he wrote it up: "Random walks in a street network"' },
    { t0: 17.0, t1: 20.3, zh: '规则很简单：每到一个路口，东南西北随便选一个', en: 'The rule: at every corner, pick north, south, east or west at random' },
    { t0: 20.4, t1: 23.8, zh: [['问题是：只要走得够久，他'], amber('一定'), ['能回到家门口吗？']], en: 'The question: given enough time, is he sure to get back to his door?' },
    { t0: 24.2, t1: 27.6, zh: '先看最简单的：只能在一条直线上左右走', en: 'Simplest case first: a line, left or right' },
    { t0: 27.7, t1: 31.0, zh: [['1 万个醉汉，各走 1 万步：'], amber(pct(s.r1)), [' 回过家']], en: `10,000 drunks, 10,000 steps each: ${pct(s.r1)} made it home` },
    { t0: 31.4, t1: 34.8, zh: '再看城市街道：东南西北，四个方向', en: 'Now a city grid: four directions' },
    { t0: 34.9, t1: 38.0, zh: [['1 万步内 '], amber(pct(s.r2)), [' 回过家，而且还在涨']], en: `${pct(s.r2)} home within 10,000 steps, and still rising` },
    { t0: 38.1, t1: 40.6, zh: [['数学证明：时间无限长，迟早 '], amber('100%'), [' 都会回家']], en: 'Proven: given forever, 100% eventually get home' },
    { t0: 41.0, t1: 44.1, zh: '但「一定会回来」，不等于「很快就回来」', en: "But 'certain to return' doesn't mean 'soon'" },
    { t0: 44.2, t1: 46.2, zh: '开头那位醉汉，到底走了多少步才回到家？', en: 'So how many steps did our drunk take to get home?' },
    { t0: 46.3, t1: 49.0, zh: [['整整 '], amber(`${f(s.home)} 步`), ['，一秒一步要走 16 个月']], en: `${f(s.home)} steps: 16 months at a step a second` },
    { t0: 49.1, t1: 52.6, zh: [['而平均要等多久？答案是'], amber('无穷大')], en: 'And the average wait? Infinite' },
    { t0: 53.0, t1: 56.4, zh: '换成一只喝醉的鸟：它还能往上、往下飞', en: 'Now a drunk bird: it can also fly up and down' },
    { t0: 56.5, t1: 60.2, zh: [['1 万只鸟，各飞 1 万步：只有 '], amber(pct(s.r3)), [' 回过巢']], en: `10,000 birds, 10,000 steps: only ${pct(s.r3)} came back` },
    { t0: 60.3, t1: 64.6, zh: [['理论上，约 '], amber('66%'), [' 的鸟永远都回不去了']], en: 'In theory, about 66% never return. Ever.' },
    { t0: 65.0, t1: 68.6, zh: '为什么？每多一个维度，就多两个能走的方向', en: 'Why? Each extra dimension adds two more directions to stray in' },
    { t0: 68.7, t1: 72.3, zh: '1 万步里平均回家：直线 77 次，平面 2.7 次，空间 0.54 次', en: 'Average visits home in 10,000 steps: line 77, plane 2.7, space 0.54' },
    { t0: 72.4, t1: 76.6, zh: '数学家角谷静夫说：喝醉的人终会回家，喝醉的鸟可能永远迷路', en: 'As Shizuo Kakutani put it: a drunk man will find his way home, but a drunk bird may get lost forever' },
    // The 想一想 card carries the Chinese text itself; captions give the English only.
    { t0: 77.6, t1: 81.9, zh: '', en: 'The drunk man is sure to get home because he has so few places to go.' },
    { t0: 82.2, t1: 86.2, zh: '', en: 'The bird has one more direction of freedom, and with it, a chance of never coming back.' },
    { t0: 86.4, t1: 90.9, zh: '', en: 'Which would you rather be: the man who always gets home, or the bird that can go anywhere?' },
  ];
}
