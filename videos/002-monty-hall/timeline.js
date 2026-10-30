// Timeline for episode 02. Sections start on 100 BPM bar lines (BAR = 2.4 s) so the user's own
// music can be cut to the same grid. See 分镜.md for the storyboard.
import { C } from './style.js';

export const BEAT = 0.6;
export const BAR = 2.4;
const b = (n) => +(n * BAR).toFixed(4);

export const T = {
  hook: 0, rules: b(2), gut: b(8), hist: b(10), exp: b(16), why: b(24), worlds: b(27),
  hundred: b(34), key: b(40), twist: b(43), outro: b(52), end: b(55),
};

Object.assign(T, {
  legend: T.rules + 0.2, // 5.0: "car x1, goats x2"
  pick: T.rules + 3.6, // 8.4: you pick door 1
  hostTag: T.rules + 6.9, // 11.7
  hostOpen: T.rules + 7.4, // 12.2: host opens door 3, a goat
  offer: T.rules + 10.7, // 15.5: "switch?"
  fifty: T.gut + 0.3, // 19.5
  really: T.gut + 2.6, // 21.8: "真的吗？"
  clip: T.hist, // 24.0: the 1990 clipping
  twoThirds: T.hist + 3.9, // 27.9
  letters: T.hist + 7.3, // 31.3
  erdos: T.hist + 10.9, // 34.9
  games: [T.exp + 3.3, T.exp + 5.9, T.exp + 8.5], // 41.7, 44.3, 46.9 (2.6 s each)
  fill0: T.exp + 11.4, // 49.8
  fill1: T.exp + 17.4, // 55.8: the 10,000th game
  sort: T.why + 0.3, // 57.9
  rows: [T.worlds + 3.7, T.worlds + 7.3, T.worlds + 10.9], // 68.5, 72.1, 75.7
  worldsSum: T.worlds + 13.9, // 78.7
  hOpen0: T.hundred + 3.6, // 85.2
  hOpen1: T.hundred + 6.4, // 88.0
  hFocus: T.hundred + 6.8, // 88.4: the two remaining doors move to centre stage
  hLabels: T.hundred + 10.1, // 91.7
  hReveal: T.hundred + 12.4, // 94.0
  tRoulette: T.twist + 1.0, // 104.2
  tOpen: T.twist + 2.2, // 105.4: the ignorant host opens the car
  tFill0: T.twist + 4.1, // 107.3
  tFill1: T.twist + 7.1, // 110.3
  tSort: T.twist + 11.1, // 114.3
  tDrop: T.twist + 14.5, // 117.7
  tSum: T.twist + 17.9, // 121.1
});

// Log-spaced schedule: count goes from `from` (at t0) to `to` (at t1).
export function logCount(t, t0, t1, from, to) {
  if (t < t0) return from;
  if (t >= t1) return to;
  return Math.floor(from * (to / from) ** ((t - t0) / (t1 - t0)) + 1e-9);
}

const pct = (x) => `${(100 * x).toFixed(1)}%`;

// Captions are built after the simulations run, so every number quoted is the measured one.
export function buildCaptions(s) {
  const amber = (x) => [x, C.amber];
  return [
    { t0: 5.0, t1: 8.3, zh: '三扇门：一扇后面是汽车，另外两扇后面是羊', en: 'Three doors: a car behind one, goats behind the other two' },
    { t0: 8.4, t1: 11.6, zh: '你先随便选一扇，比如 1 号门', en: 'You pick one, say door 1' },
    { t0: 11.7, t1: 15.4, zh: '主持人知道车在哪，他总会打开另一扇有羊的门', en: 'The host knows where the car is. He always opens another door with a goat' },
    { t0: 15.5, t1: 19.0, zh: [['然后问你：要不要'], amber('换'), ['成 2 号门？']], en: 'Then he asks: do you want to switch to door 2?' },
    { t0: 19.3, t1: 23.8, zh: '很多人觉得：剩两扇门，一半一半，换不换都一样', en: "Most people think: two doors left, 50/50, so it doesn't matter" },
    { t0: 24.2, t1: 27.8, zh: '1990 年，美国专栏作家玛丽莲回答：要换！', en: 'In 1990, columnist Marilyn vos Savant answered: switch!' },
    { t0: 27.9, t1: 31.2, zh: [['换门赢的概率是 '], amber('2/3'), ['，不换只有 1/3']], en: 'Switching wins 2/3 of the time; staying, only 1/3' },
    { t0: 31.3, t1: 34.8, zh: '约 1 万名读者来信，大多说她错了，约千人是博士', en: 'About 10,000 readers wrote in, most saying she was wrong; about 1,000 had PhDs' },
    { t0: 34.9, t1: 38.2, zh: '连数学家埃尔德什都不信，直到看了电脑模拟', en: 'Even the mathematician Paul Erdős stayed unconvinced until he saw a computer simulation' },
    { t0: 38.5, t1: 41.6, zh: '那我们也来模拟：同样的游戏，两种玩法', en: "So let's simulate it: the same games, two strategies" },
    { t0: 41.7, t1: 45.4, zh: '一个人永远不换，另一个人每次都换', en: 'One player always stays; the other always switches' },
    { t0: 45.5, t1: 49.6, zh: '每一局，两人里正好有一个人赢', en: 'In every game, exactly one of them wins' },
    { t0: 49.7, t1: 53.6, zh: [['一口气玩 '], amber('1 万局')], en: 'Now play 10,000 games' },
    { t0: 53.7, t1: 57.4, zh: [['换门赢了 '], amber(pct(s.switchRate)), ['，非常接近 2/3']], en: `Switching won ${pct(s.switchRate)}: very close to 2/3` },
    { t0: 57.8, t1: 61.2, zh: [['不换，只有'], amber('第一次就选中车'), ['才赢：1/3']], en: 'Staying wins only if your first pick was the car: 1/3' },
    { t0: 61.3, t1: 64.6, zh: [['剩下 '], amber('2/3'), [' 的局第一次选错，换就一定赢']], en: 'In the other 2/3, your first pick was wrong, so switching wins' },
    { t0: 65.0, t1: 68.4, zh: '把所有情况摆出来：你选 1 号，车在哪扇门后都有可能', en: 'Every case: you pick door 1; the car could be behind any door' },
    { t0: 68.5, t1: 72.0, zh: '车在 1 号：主持人开 2 号或 3 号都行，不换赢', en: 'Car behind 1: the host opens 2 or 3; staying wins' },
    { t0: 72.1, t1: 75.6, zh: '车在 2 号：主持人只能开 3 号，换赢', en: 'Car behind 2: the host must open 3; switching wins' },
    { t0: 75.7, t1: 78.6, zh: '车在 3 号：主持人只能开 2 号，换赢', en: 'Car behind 3: the host must open 2; switching wins' },
    { t0: 78.7, t1: 81.4, zh: [['三种情况一样可能，换赢其中 '], amber('2'), [' 种']], en: 'Three equally likely cases; switching wins two' },
    { t0: 81.8, t1: 84.8, zh: '还觉得一半一半？换成 100 扇门试试', en: 'Still feels like 50/50? Try 100 doors' },
    { t0: 84.9, t1: 88.2, zh: '你选 1 号，主持人打开另外 98 扇，全是羊', en: 'You pick door 1. The host opens 98 others: all goats' },
    { t0: 88.3, t1: 91.6, zh: [['只剩你的 1 号，和他偏偏没开的 '], amber(`${s.keep} 号`)], en: `Left: your door 1, and door ${s.keep}, the one he skipped` },
    { t0: 91.7, t1: 95.8, zh: [['你的门：1/100；他留下的门：'], amber('99/100')], en: 'Your door: 1 in 100. His door: 99 in 100' },
    { t0: 96.2, t1: 99.6, zh: '关键在于：主持人知道车在哪，开门时总会避开汽车', en: 'The key: the host knows where the car is, and always avoids it' },
    { t0: 99.7, t1: 103.0, zh: '所以他偏偏留下的那扇门，藏着他知道的信息', en: 'So the door he leaves shut carries what he knows' },
    { t0: 103.4, t1: 107.0, zh: [['反转：如果主持人'], amber('也不知道'), ['车在哪，随手开一扇呢？']], en: "Twist: what if the host doesn't know either, and opens a door at random?" },
    { t0: 107.1, t1: 110.6, zh: '模拟 3000 局：开出汽车的局作废，只看开出羊的', en: 'Simulate 3,000 games; throw out the ones where he reveals the car' },
    { t0: 110.7, t1: 114.2, zh: [['同样开出一只羊，这回换和不换'], amber('差不多一半一半')], en: `Same goat on stage, but now it's roughly 50/50 (${pct(s.rStay)} vs ${pct(s.rSwitch)})` },
    { t0: 114.3, t1: 117.6, zh: '因为第一次选错时，他有一半机会直接开出车', en: 'When your first pick is wrong, half the time he reveals the car' },
    { t0: 117.7, t1: 121.0, zh: '这些局作废，换门赢的局就被砍掉了一半', en: "Those games are thrown out, cutting switching's wins in half" },
    { t0: 121.1, t1: 124.6, zh: '你的第一反应是换，还是不换？评论区聊聊', en: 'Your first instinct: switch or stay? Tell us in the comments' },
  ];
}
