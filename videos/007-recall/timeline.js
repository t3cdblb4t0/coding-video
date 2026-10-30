// Timeline for episode 07 (2:12). BAR = 2.4 s as in episode 06; sections start near bar lines.
// Captions: one short line per action (<= 18 Chinese characters), 66 px, Chinese only.
import { C } from './style.js';

export const BAR = 2.4;

export const T = {
  // 问: the viewer is given 8 words to remember, then told they will be tested at the end
  memoEnd: 5.0,
  dissolve: 5.0,
  title: 9.6,
  titleEnd: 14.4,
  // 算 · 实验: Roediger & Karpicke 2006
  exp: 14.4,
  groups: 17.1,
  tilesL: [19.9, 20.4, 20.9, 21.4],
  tilesR: [22.8, 23.6, 24.2, 24.8],
  shrink: 25.6,
  bars5: 26.4,
  week: 29.6,
  flip: 30.8,
  reads: 33.2,
  less: 36.1,
  confident: 39.1,
  familiar: 42.0,
  retrieve: 44.8,
  expEnd: 48.0,
  // 算 · 打分: Dunlosky et al. 2013
  grades: 48.0,
  high: 51.2,
  low: 54.1,
  gradesEnd: 57.6,
  // 算 · 间隔: the FSRS run
  space: 57.6,
  cells: 60.7,
  sch: [63.4, 65.6, 67.8],
  run0: 70.6, // day 0: A's four reviews, straight after learning
  clock0: 71.6, // day 0 -> TEST_DAY
  clock1: 81.6,
  test: 81.8,
  diff: 85.0,
  lapses: 88.2,
  insight: 91.4,
  spaceEnd: 94.8,
  // 想
  method: 94.8,
  steps: [95.6, 97.6, 99.8],
  methodEnd: 108.6,
  think: 108.6,
  thinkLines: [109.4, 110.9, 112.5, 114.0],
  thinkQ: 115.4,
  thinkEnd: 117.6,
  recall: 117.8,
  countdown: [118.6, 119.6, 120.6],
  reveal: 121.6,
  outro: 124.6,
  end: 132.0,
};

// The day shown by the clock at time t (fractional), 0 before the run, TEST_DAY after.
export const dayAt = (t, testDay) => Math.max(0, Math.min(testDay, ((t - T.clock0) / (T.clock1 - T.clock0)) * testDay));
// When the clock reaches a given day.
export const timeOfDay = (d, testDay) => T.clock0 + (d / testDay) * (T.clock1 - T.clock0);

const pct = (x) => `${Math.round(100 * x)}%`;

export function buildCaptions(s) {
  const gold = (x) => [x, C.gold];
  const red = (x) => [x, C.red];
  const ice = (x) => [x, C.ice];
  const rk = s.rk;
  const [A, , Cc] = s.memory;
  return [
    // 问 (0-5 s carries its own heading: "给你 5 秒，记住这 8 个词")
    // The comment prompt goes in at the start, not only at the end (ep06: asked only at 2:04.8,
    // seen by about 4 plays; see 运营/数据复盘.md 复盘 5).
    { t0: 5.3, t1: 7.2, zh: [['记住了吗？'], gold('最后考你'), ['，评论区报数。']] },
    { t0: 7.4, t1: 9.3, zh: '背的时候都会，过两天就忘？' },
    // 算 · 实验
    { t0: 14.6, t1: 16.9, zh: '2006 年，一个心理学实验：' },
    { t0: 17.1, t1: 19.4, zh: '两组大学生，学同一篇短文。' },
    { t0: 19.6, t1: 22.3, zh: [['一组学 4 轮，每轮都是'], ice('读'), ['。']] },
    { t0: 22.5, t1: 25.4, zh: [['另一组只读 1 轮，后面 3 轮'], gold('默写'), ['。']] },
    { t0: 25.8, t1: 29.2, zh: [['5 分钟后考，重读组赢：'], ice(pct(rk.fiveMin.reread)), [' 比 '], gold(pct(rk.fiveMin.test)), ['。']] },
    { t0: 29.6, t1: 33.0, zh: [['换成一周后考，反过来了：'], ice(pct(rk.week.reread)), [' 比 '], gold(pct(rk.week.test)), ['。']] },
    { t0: 33.2, t1: 35.9, zh: [['重读组读了 '], ice(`${rk.reads.reread} 遍`), ['，自测组 '], gold(`${rk.reads.test} 遍`), ['。']] },
    { t0: 36.1, t1: 38.9, zh: [['读的遍数是 4 倍，记住的反而'], red('少三分之一'), ['。']] },
    { t0: 39.1, t1: 41.8, zh: '而且重读的人，更觉得自己记住了。' },
    { t0: 42.0, t1: 44.6, zh: [['读的时候都'], ice('眼熟'), ['，就以为会了。']] },
    { t0: 44.8, t1: 47.6, zh: [['合上书'], gold('往外掏'), ['，才是真在记。']] },
    // 算 · 打分
    { t0: 48.3, t1: 51.0, zh: '2013 年，心理学家给 10 种学法打了分。' },
    { t0: 51.2, t1: 53.9, zh: [['高效的只有两种：'], gold('自测'), ['，'], gold('隔开复习'), ['。']] },
    { t0: 54.1, t1: 56.8, zh: [['划重点、反复读，都在'], red('最低一档'), ['。']] },
    // 算 · 间隔
    { t0: 57.8, t1: 60.5, zh: [['隔多久测一次？用'], gold('记忆模型'), ['算一算。']] },
    { t0: 60.7, t1: 63.2, zh: `${s.nWords} 个新单词，每个再复习 4 次：` },
    { t0: 63.4, t1: 65.4, zh: [['A '], ['学完当场连背 4 遍', C.text], ['，']] },
    { t0: 65.6, t1: 67.6, zh: 'B 接下来 4 天，天天背，' },
    { t0: 67.8, t1: 70.2, zh: [['C 第 1、3、7、15 天，'], gold('越隔越久'), ['。']] },
    { t0: 71.8, t1: 75.2, zh: [['每次复习，都先'], gold('合上书想'), ['。']] },
    { t0: 75.4, t1: 79.0, zh: [['想不起来的'], red('闪红'), ['：看答案，再记一遍。']] },
    { t0: 82.0, t1: 84.8, zh: `第 ${s.testDay} 天考试，${s.nWords} 个还记得：` },
    { t0: 85.0, t1: 88.0, zh: [['同样背 4 次，C 多记住了 '], gold(`${Cc.kept - A.kept} 个`), ['。']] },
    { t0: 88.2, t1: 91.2, zh: [['C 复习时'], red('想不起来'), ['的次数最多——']] },
    { t0: 91.4, t1: 94.2, zh: [['快忘时再想起来，'], gold('记得最牢'), ['。']] },
    // 想
    { t0: 95.0, t1: 97.2, zh: '照着做，就三步：' },
    { t0: 102.4, t1: 105.2, zh: '背单词、记公式、复习考点，都能用。' },
    { t0: 105.4, t1: 108.2, zh: [['嫌排日子麻烦，'], gold('Anki'), [' 会替你算。']] },
    // the 想一想 card carries its own text
    { t0: 117.9, t1: 121.2, zh: [['现在，开头那 8 个词，'], gold('你还记得几个'), ['？']] },
    { t0: 121.8, t1: 124.4, zh: [['评论区'], gold('打一个数字'), ['。']] },
  ];
}

export { pct };
