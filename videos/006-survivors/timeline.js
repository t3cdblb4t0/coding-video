// Timeline for episode 06. 100 BPM, BAR = 2.4 s; sections start on bar lines (title 9.6 = bar 4,
// reveal 14.4 = bar 6, the memo 38.4 = bar 16). The 30-second sample ends at 45.6 (bar 19).
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
  // 算: the reveal
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
  sampleEnd: 45.6,
};

const pct = (x) => `${Math.round(100 * x)}%`;

export function buildCaptions(s) {
  const gold = (x) => [x, C.gold];
  const red = (x) => [x, C.red];
  const p = s.planes;
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
  ];
}

export { pct };
