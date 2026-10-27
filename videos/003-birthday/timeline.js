// Timeline for episode 03. 100 BPM, BAR = 2.4 s, 32 bars = 76.8 s (~1:17). Sections start on bar
// lines so the user's own music cuts to the same grid. See 分镜.md for the storyboard.
import { C } from './style.js';

export const BEAT = 0.6;
export const BAR = 2.4;
const b = (n) => +(n * BAR).toFixed(4);

export const T = {
  hook: 0, choice: b(2), room: b(5), rooms: b(8), callback: b(12), why: b(13),
  twist: b(20), world: b(25), outro: b(28), end: b(32),
};

Object.assign(T, {
  classMatch: T.hook + 2.3, // seats that share a birthday light up
  big97: T.hook + 3.3, // the 97% headline
  cards: [T.choice + 0.6, T.choice + 1.0, T.choice + 1.4, T.choice + 1.8], // A B C D pop in
  gut: T.choice + 3.0, // "直觉：一百多人吧？"
  enter0: T.room + 0.8, // first person walks into the room (12.8 s)
  collide: T.room + 4.4, // the 18th person lands on March 22 (16.4 s)
  shrink: T.rooms + 0.2, // the one room shrinks into a grid of 10,000
  sweepStart: T.rooms + 2.2, // head-count ramps 1 -> 23
  cross50: T.rooms + 4.4, // the curve crosses 50% (at N = 23)
  holdEnd: T.rooms + 7.0, // dwell on N = 23 so the crossing registers
  sweepEnd: T.rooms + 8.6, // then 23 -> 60
  whyCards: T.why + 0.4, // "你以为的" vs "题目问的"
  pairs: T.why + 3.4, // 23 dots, draw all 253 pair-lines
  pairsCount: T.why + 11.8, // all 253 are drawn
  product: T.why + 13.4, // the exact product collapses to 49.3%
  youLines: T.twist + 0.6, // only your 22 lines -> 5.9%
  needMore: T.twist + 3.2, // grow to 253 people -> 50.0%
  twistKey: T.twist + 5.6, // "关键不是人数，而是对数"
  jerseys: T.world + 1.0, // 32 jerseys appear
  jerseyHit: T.world + 2.4, // 16 light up
});

// Log/linear schedule helper: value goes from `from` at t0 to `to` at t1 (clamped).
export function lerpT(t, t0, t1, from, to) {
  if (t <= t0) return from;
  if (t >= t1) return to;
  return from + (to - from) * ((t - t0) / (t1 - t0));
}

const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;

// Captions built after the simulations run, so every number quoted is the measured one.
// Shorter and punchier than earlier episodes; one idea per line.
export function buildCaptions(s) {
  const amber = (x) => [x, C.amber];
  return [
    { t0: 2.5, t1: 4.7, zh: [['50 人的班，'], amber('97%'), [' 会撞']], en: 'In a class of 50, the odds are 97%' },
    { t0: 5.0, t1: 7.0, zh: '至少几个人，概率才过一半？', en: 'How many people for a better-than-even chance?' },
    { t0: 7.1, t1: 9.0, zh: '先选一个，答案在后面', en: 'Pick one; the answer is coming' },
    { t0: 9.1, t1: 11.9, zh: '直觉：怎么也得一百多人吧？', en: 'Gut feeling: surely a hundred-something?' },
    { t0: 12.2, t1: 16.2, zh: '不如直接算：每进来一个人，就在日历上点一下', en: 'Just simulate: each new person marks a day on the calendar' },
    { t0: 16.4, t1: 19.0, zh: [['第 18 个人，'], amber('撞了'), ['！两人都是 3 月 22 日']], en: 'Person 18 collides: both born March 22' },
    { t0: 19.3, t1: 22.2, zh: '一个房间不算数，那就开 1 万个', en: 'One room proves nothing, so run 10,000' },
    { t0: 22.2, t1: 23.6, zh: '房间里人越多，撞的就越多', en: 'The more people per room, the more collisions' },
    { t0: 23.7, t1: 26.1, zh: [['只要 '], amber('23 个人'), ['，概率就过一半了']], en: 'Just 23 people already tips over 50%' },
    { t0: 26.3, t1: 28.7, zh: [['再多一点：50 人 '], amber('97%'), ['，57 人几乎必然']], en: '50 people: 97%. 57: all but certain' },
    { t0: 28.9, t1: 31.0, zh: '所以你们班有人同生日，一点都不奇怪', en: 'So a shared birthday in your class is no surprise' },
    { t0: 31.3, t1: 34.6, zh: '为什么这么少？你想的是"有人跟我同一天"', en: 'Why so few? You pictured "someone shares MY birthday"' },
    { t0: 34.7, t1: 38.0, zh: '但题目问的是"任意两个人"', en: 'But the question is "any two people"' },
    { t0: 38.3, t1: 41.8, zh: [['23 个人，能配出 '], amber('253'), [' 对']], en: '23 people make 253 different pairs' },
    { t0: 41.9, t1: 45.2, zh: '每一对都有机会撞，253 次机会', en: 'Every pair is a chance to collide: 253 of them' },
    { t0: 45.3, t1: 48.0, zh: [['算下来，全都不撞只剩 '], amber('49.3%')], en: 'Do the math: all-different is only 49.3%' },
    { t0: 48.3, t1: 51.6, zh: '要是只问"有人跟你同一天"，22 对，才 5.9%', en: 'Just "someone shares YOUR day"? 22 pairs, only 5.9%' },
    { t0: 51.7, t1: 55.0, zh: [['那得凑够 '], amber('253 个人'), ['，才到一半']], en: "You'd need 253 people to reach half" },
    { t0: 55.1, t1: 59.6, zh: [['关键不是人数，是'], amber('对数')], en: 'What matters is the number of pairs, not people' },
    { t0: 60.2, t1: 63.4, zh: '真实世界：2014 世界杯，每队正好 23 人', en: 'Real world: at the 2014 World Cup, each squad had exactly 23' },
    { t0: 63.5, t1: 67.0, zh: [['32 支队，'], amber('16 支'), [' 真有人同一天生日']], en: 'Of 32 squads, 16 really did have a shared birthday' },
  ];
}
