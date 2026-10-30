// Timeline for episode 06 (2:14). 100 BPM, BAR = 2.4 s; sections start on bar lines:
// title 9.6 (bar 4), reveal 14.4 (6), memo 38.4 (16), people 45.6 (19), the ten-year run 57.6 (24),
// year 10 67.2 (28), 想 86.4 (36), method 98.4 (41), 想一想 108 (45), back to the plane 120 (50),
// outro 124.8 (52), end 134.4 (56).
// Captions follow the genre's density: one short line per action (<= 18 Chinese characters),
// 140-240 characters a minute, and stretches with no caption at all.
import { C } from './style.js';

export const BEAT = 0.6;
export const BAR = 2.4;

export const T = {
  // 问: the cold open
  flights: [0.7, 1.6, 2.4, 3.1, 3.7, 4.2], // landing times of the six planes we watch come in
  stream0: 4.4,
  stream1: 8.4,
  tags: [6.6, 7.0, 7.4],
  question: 6.2,
  title: 9.6,
  titleEnd: 14.4,
  // 算 · 飞机: the reveal
  pickA: 14.6,
  pickC: 17.4,
  ghosts: 20.2,
  fall: 22.8,
  denom: 23.6,
  pushIn: 25.0,
  silence: [27.6, 28.4],
  redEngine: 28.6,
  pullBack: 31.6,
  redOther: 31.8,
  bars: 32.4,
  gap: 34.8,
  memo: 38.4,
  memoEnd: 45.6,
  // 算 · 人: the same mistake with people
  people: 45.6,
  coin: 48.4,
  steady: 50.4,
  allIn: 53.6,
  collapse: 57.6,
  grow0: 58.4,
  grow1: 66.8,
  stage: 67.2,
  allTop: 69.6,
  quote: 72.0,
  denom2: 74.4,
  redPeople: 76.8,
  steadyGlow: 79.2,
  fractions: 81.6,
  // 想
  life: 86.4,
  fridgeRow: 89.4,
  phone: 93.6,
  phoneStack: 96.0,
  method: 98.4,
  steps: [98.6, 101.2, 104.0],
  think: 108.0,
  callback: 120.0,
  outro: 124.8,
  end: 134.4,
};

const pct = (x) => `${Math.round(100 * x)}%`;
const n = (x) => x.toLocaleString('en-US');

export function buildCaptions(s) {
  const gold = (x) => [x, C.gold];
  const red = (x) => [x, C.red];
  const ice = (x) => [x, C.plane];
  const p = s.planes;
  const g = s.people;
  return [
    // Starts "before" frame 0 so the first frame already carries the whole line (ep03 data: a
    // first frame that is still fading in loses people in the first 2 seconds).
    { t0: -1.2, t1: 3.0, zh: '二战，飞回来的轰炸机，常带着弹孔。', en: 'In the Second World War, bombers often came home full of holes.' },
    { t0: 3.4, t1: 5.9, zh: '装甲很重，只能加在一个地方。', en: 'Armour is heavy. You can only add it in one place.' },
    { t0: 6.2, t1: 9.3, zh: [['如果是你，加在'], gold('哪'), ['？']], en: 'Where would you put it?' },
    { t0: 14.6, t1: 17.2, zh: '大多数人会选 A：洞最多的机翼。', en: 'Most people pick A: the wings, where the holes are.' },
    { t0: 17.4, t1: 20.0, zh: [['据说，统计学家沃尔德选了 '], gold('C'), ['。']], en: 'The statistician Abraham Wald, the story goes, picked C.' },
    { t0: 20.2, t1: 22.8, zh: [['他问：'], gold('没飞回来的'), ['那些呢？']], en: 'He asked: what about the planes that never came back?' },
    { t0: 25.2, t1: 27.6, zh: '发动机上不是没洞——', en: "It isn't that engines don't get hit —" },
    { t0: 28.4, t1: 31.4, zh: [['是打中发动机的，'], red(`${pct(p.engineHitLost)} 没能回来`), ['。']], en: `of the planes hit in an engine, ${pct(p.engineHitLost)} never came back.` },
    { t0: 31.6, t1: 34.6, zh: [['把没回来的也算上，'], gold('弹孔处处一样多'), ['。']], en: 'Count the lost planes too, and the holes are everywhere alike.' },
    { t0: 34.8, t1: 38.0, zh: [['只看回来的，发动机上的洞'], gold(`少了 ${pct(p.engineShortfall)}`), ['。']], en: `Count only the survivors, and the engines show ${pct(p.engineShortfall)} fewer holes.` },
    { t0: 38.4, t1: 41.6, zh: '1943 年，他写了 8 份备忘录，', en: 'In 1943 he wrote eight memoranda' },
    { t0: 41.8, t1: 45.0, zh: [['教人从回来的飞机，'], gold('算出没回来的'), ['。']], en: 'on working out the lost planes from the ones that returned.' },
    // 算 · 人
    { t0: 45.8, t1: 48.2, zh: '飞机如此，人也一样。', en: 'Planes are like this. So are people.' },
    { t0: 48.4, t1: 50.2, zh: `模拟 ${n(g.n)} 人，十年里每年抛一次硬币。`, en: `Simulate ${n(g.n)} people. Every year for ten years, each flips a coin.` },
    { t0: 50.4, t1: 53.4, zh: [['九成人'], ice('求稳'), ['：正面赚一成，反面不赚不亏。']], en: 'Nine in ten play safe: heads, +10%; tails, nothing gained or lost.' },
    { t0: 53.6, t1: 57.2, zh: [['一成人 '], ['all in', C.hole], ['：正面翻倍，反面只剩四成。']], en: 'One in ten goes all in: heads, doubled; tails, down to 40%.' },
    { t0: 61.6, t1: 65.6, zh: [['求稳的挤成一条线，'], ['all in', C.hole], [' 的越走越散。']], en: 'The safe players stay in a narrow band. The all-in players scatter.' },
    { t0: 67.4, t1: 69.4, zh: `十年后，最成功的 ${g.nTop} 人——`, en: `Ten years on, the ${g.nTop} most successful people:` },
    { t0: 69.6, t1: 71.8, zh: [[`${g.nTop} 个，全是 `], gold('all in'), [' 的。']], en: `all ${g.nTop} of them went all in.` },
    { t0: 72.0, t1: 74.2, zh: '他们上台分享经验：要敢赌。', en: 'On stage, their advice: dare to bet.' },
    { t0: 74.4, t1: 76.6, zh: [['可 all in 的 '], gold(`${n(g.gamblers)} 人`), ['里，']], en: `But of the ${n(g.gamblers)} who went all in,` },
    { t0: 76.8, t1: 79.0, zh: [red(`${pct(g.gamblerBelowStart)} 只剩不到本金的三分之一`), ['。']], en: `${pct(g.gamblerBelowStart)} were left with less than a third of their money.` },
    { t0: 79.2, t1: 81.4, zh: [[`求稳的 ${n(g.n - g.gamblers)} 人，`], ice('没有一个亏钱'), ['。']], en: `Of the ${n(g.n - g.gamblers)} who played safe, not one lost money.` },
    { t0: 81.6, t1: 86.0, zh: [['成功的人都赌了，'], gold('不等于赌了能成功'), ['。']], en: 'The successful all took the bet. That does not mean the bet makes you successful.' },
    // 想
    { t0: 86.6, t1: 89.2, zh: '老家电用了 30 年还没坏？', en: 'An old fridge, still running after 30 years?' },
    { t0: 89.4, t1: 93.2, zh: [['同一批卖出的，'], red('坏掉的早被扔了'), ['。']], en: 'The ones from the same batch that broke were thrown out long ago.' },
    { t0: 93.6, t1: 95.8, zh: '你刷到的涨粉经验，', en: 'The growth tips in your feed' },
    { t0: 96.0, t1: 98.2, zh: [['都来自'], gold('做起来的号'), ['。']], en: 'all come from accounts that took off.' },
    { t0: 98.4, t1: 101.0, zh: [['听到成功经验，先找'], gold('没回来的飞机'), ['：']], en: 'When you hear a success story, look for the planes that never came back:' },
    { t0: 101.2, t1: 103.8, zh: '同样的做法，没成功的有多少？', en: 'how many did the same thing and failed?' },
    { t0: 104.0, t1: 107.4, zh: '成功的占几成，再决定学不学。', en: 'What share succeeded? Then decide whether to copy it.' },
    // The 想一想 card carries the Chinese itself; captions give the English.
    { t0: 108.8, t1: 110.4, zh: '', en: 'Successful people are worth learning from.' },
    { t0: 110.6, t1: 113.8, zh: '', en: 'But listen only to them, and all you ever see are the holes in the wings.' },
    { t0: 114.0, t1: 116.2, zh: '', en: "This isn't telling you not to take risks." },
    { t0: 116.4, t1: 119.6, zh: '', en: 'It is: before you do, count the ones that never came back.' },
    { t0: 120.4, t1: 124.4, zh: [['要紧的弹孔，在'], gold('没回来的飞机'), ['上。']], en: 'The holes that matter are on the planes that never came back.' },
    { t0: 125.2, t1: 129.8, zh: '', en: 'Which did you pick at the start: A, B or C?' },
  ];
}

export { pct, n };
