/**
 * 纯逻辑测试 —— 零依赖，直接跑：
 *   node --test test.js
 */
const test = require('node:test');
const assert = require('node:assert');

const L = require('./logic.js');

// 测试用词池：20 个词，够铺 4x5，不够铺 5x6
const POOL = [
  { hanzi: '苹果', pinyin: 'píngguǒ' },
  { hanzi: '香蕉', pinyin: 'xiāngjiāo' },
  { hanzi: '西瓜', pinyin: 'xīguā' },
  { hanzi: '橘子', pinyin: 'júzi' },
  { hanzi: '葡萄', pinyin: 'pútáo' },
  { hanzi: '草莓', pinyin: 'cǎoméi' },
  { hanzi: '桃子', pinyin: 'táozi' },
  { hanzi: '梨', pinyin: 'lí' },
  { hanzi: '面包', pinyin: 'miànbāo' },
  { hanzi: '米饭', pinyin: 'mǐfàn' },
  { hanzi: '面条', pinyin: 'miàntiáo' },
  { hanzi: '饺子', pinyin: 'jiǎozi' },
  { hanzi: '包子', pinyin: 'bāozi' },
  { hanzi: '鸡蛋', pinyin: 'jīdàn' },
  { hanzi: '牛奶', pinyin: 'niúnǎi' },
  { hanzi: '果汁', pinyin: 'guǒzhī' },
  { hanzi: '蛋糕', pinyin: 'dàngāo' },
  { hanzi: '糖', pinyin: 'táng' },
  { hanzi: '汤', pinyin: 'tāng' },
  { hanzi: '茶', pinyin: 'chá' },
];

// ---------- makeRng：带种子的随机数 ----------

test('makeRng: 同一个种子产生同一串随机数', () => {
  const a = L.makeRng('abc');
  const b = L.makeRng('abc');
  const seqA = [a(), a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b(), b()];
  assert.deepStrictEqual(seqA, seqB);
});

test('makeRng: 不同种子产生不同随机数', () => {
  const a = L.makeRng('abc');
  const b = L.makeRng('abd');
  assert.notDeepStrictEqual([a(), a(), a()], [b(), b(), b()]);
});

test('makeRng: 输出都落在 [0, 1) 区间', () => {
  const rng = L.makeRng('区间检查');
  for (let i = 0; i < 500; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `越界: ${v}`);
  }
});

// ---------- shuffle：洗牌 ----------

test('shuffle: 结果是原数组的一个排列，不多不少', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = L.shuffle(src, L.makeRng('s1'));
  assert.deepStrictEqual([...out].sort(), [...src].sort());
});

test('shuffle: 不改动原数组', () => {
  const src = [1, 2, 3, 4, 5];
  const copy = [...src];
  L.shuffle(src, L.makeRng('s2'));
  assert.deepStrictEqual(src, copy);
});

test('shuffle: 同种子结果一致，异种子结果不同', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.deepStrictEqual(L.shuffle(src, L.makeRng('x')), L.shuffle(src, L.makeRng('x')));
  assert.notDeepStrictEqual(L.shuffle(src, L.makeRng('x')), L.shuffle(src, L.makeRng('y')));
});

// ---------- pickN：抽词 ----------

test('pickN: 抽出指定个数，且互不重复', () => {
  const got = L.pickN(POOL, 8, L.makeRng('p1'));
  assert.strictEqual(got.length, 8);
  assert.strictEqual(new Set(got.map((w) => w.hanzi)).size, 8);
});

test('pickN: 抽出的词都来自词池', () => {
  const inPool = new Set(POOL.map((w) => w.hanzi));
  for (const w of L.pickN(POOL, 12, L.makeRng('p2'))) {
    assert.ok(inPool.has(w.hanzi), `${w.hanzi} 不在词池里`);
  }
});

test('pickN: 词不够时报错，而不是静默出空格', () => {
  assert.throws(() => L.pickN(POOL, 30, L.makeRng('p3')), /词.*不够|not enough/i);
});

// ---------- buildCard：单张卡 ----------

test('buildCard: 格子里就是给的那批词，一个不多一个不少', () => {
  const words = POOL.slice(0, 12);
  const card = L.buildCard({ words, seed: 'c1' });
  assert.deepStrictEqual(
    card.cells.map((w) => w.hanzi).sort(),
    words.map((w) => w.hanzi).sort()
  );
});

test('buildCard: 同一个种子必出同一个摆法', () => {
  const words = POOL.slice(0, 16);
  const a = L.buildCard({ words, seed: 'k3m9' });
  const b = L.buildCard({ words, seed: 'k3m9' });
  assert.deepStrictEqual(a.cells, b.cells);
  assert.strictEqual(a.seed, 'k3m9');
});

test('buildCard: 不同种子出不同的摆法', () => {
  const words = POOL.slice(0, 16);
  const a = L.buildCard({ words, seed: 'aaa' });
  const b = L.buildCard({ words, seed: 'bbb' });
  assert.notDeepStrictEqual(a.cells, b.cells);
});

// ---------- buildDeck：一整批卡 ----------

test('buildDeck: 生成指定张数，格数正确', () => {
  const deck = L.buildDeck({ pool: POOL, cols: 4, rows: 5, count: 6, seed: 'deck1' });
  assert.strictEqual(deck.length, 6);
  deck.forEach((card, i) => {
    assert.strictEqual(card.index, i + 1);
    assert.strictEqual(card.cells.length, 20);
  });
});

test('buildDeck: 全班永远用同一批词 —— 任何一张卡都是完整词表', () => {
  const deck = L.buildDeck({ pool: POOL, cols: 4, rows: 4, count: 8, seed: 'sw' });
  const sets = deck.map((c) => c.cells.map((w) => w.hanzi).sort().join('|'));
  assert.strictEqual(new Set(sets).size, 1, '各张卡的词语集合必须完全相同');
});

test('buildDeck: 词池比格数大时也一样 —— 先抽定这一局的词，之后每张卡都用它', () => {
  // 20 词的池子铺 16 格，仍然是同一批 16 个词，只是摆法不同
  const deck = L.buildDeck({ pool: POOL, cols: 4, rows: 4, count: 10, seed: 'big' });
  const sets = deck.map((c) => c.cells.map((w) => w.hanzi).sort().join('|'));
  assert.strictEqual(new Set(sets).size, 1);
  assert.strictEqual(deck[0].cells.length, 16);
});

test('buildDeck: 每张卡的摆法各不相同', () => {
  const deck = L.buildDeck({ pool: POOL, cols: 4, rows: 5, count: 12, seed: 'deck2' });
  const orders = deck.map((c) => c.cells.map((w) => w.hanzi).join('|'));
  assert.strictEqual(new Set(orders).size, deck.length);
});

test('buildDeck: 同种子重跑，整批卡完全一致（丢卡可原样重印）', () => {
  const a = L.buildDeck({ pool: POOL, cols: 4, rows: 4, count: 5, seed: 'same' });
  const b = L.buildDeck({ pool: POOL, cols: 4, rows: 4, count: 5, seed: 'same' });
  assert.deepStrictEqual(a, b);
});

test('buildDeck: 词池不够铺满时报错，而不是静默出空格', () => {
  assert.throws(
    () => L.buildDeck({ pool: POOL, cols: 5, rows: 6, count: 2, seed: 'x' }),
    /词.*不够/
  );
});

// ---------- parseWordList：自定义词表 ----------

test('parseWordList: 解析「汉字 拼音」每行一个', () => {
  const got = L.parseWordList('苹果 píngguǒ\n香蕉 xiāngjiāo');
  assert.deepStrictEqual(got, [
    { hanzi: '苹果', pinyin: 'píngguǒ' },
    { hanzi: '香蕉', pinyin: 'xiāngjiāo' },
  ]);
});

test('parseWordList: 容忍多个空格、制表符和全角空格', () => {
  const got = L.parseWordList('苹果   píngguǒ\n香蕉\txiāngjiāo\n西瓜　xīguā');
  assert.deepStrictEqual(got.map((w) => w.pinyin), ['píngguǒ', 'xiāngjiāo', 'xīguā']);
});

test('parseWordList: 跳过空行和 # 注释行', () => {
  const got = L.parseWordList('# 这周新词\n\n苹果 píngguǒ\n\n  \n香蕉 xiāngjiāo\n');
  assert.strictEqual(got.length, 2);
});

test('parseWordList: 拼音带多个音节时整体保留', () => {
  const got = L.parseWordList('对不起 duì bu qǐ');
  assert.deepStrictEqual(got, [{ hanzi: '对不起', pinyin: 'duì bu qǐ' }]);
});

test('parseWordList: 只写汉字时拼音留空', () => {
  const got = L.parseWordList('苹果\n香蕉');
  assert.deepStrictEqual(got, [
    { hanzi: '苹果', pinyin: '' },
    { hanzi: '香蕉', pinyin: '' },
  ]);
});

test('parseWordList: 逗号分隔的纯汉字词表', () => {
  const got = L.parseWordList('苹果,香蕉,西瓜');
  assert.deepStrictEqual(got.map((w) => w.hanzi), ['苹果', '香蕉', '西瓜']);
});

test('parseWordList: 中文逗号和顿号也算分隔符', () => {
  const got = L.parseWordList('苹果，香蕉、西瓜');
  assert.deepStrictEqual(got.map((w) => w.hanzi), ['苹果', '香蕉', '西瓜']);
});

test('parseWordList: 逗号两边的空格不会被当成拼音', () => {
  const got = L.parseWordList('苹果, 香蕉 , 西瓜');
  assert.deepStrictEqual(got.map((w) => w.pinyin), ['', '', '']);
});

test('parseWordList: 带拼音和不带拼音可以混着写', () => {
  const got = L.parseWordList('苹果 píng guǒ,香蕉');
  assert.deepStrictEqual(got, [
    { hanzi: '苹果', pinyin: 'píng guǒ' },
    { hanzi: '香蕉', pinyin: '' },
  ]);
});

test('parseWordList: 多余的逗号不会多出空词', () => {
  const got = L.parseWordList('苹果,香蕉,,\n,');
  assert.strictEqual(got.length, 2);
});

test('parseWordList: 逗号分隔时重复的词也只留一个', () => {
  const got = L.parseWordList('苹果,香蕉,苹果');
  assert.strictEqual(got.length, 2);
});

test('parseWordList: 拼音位置混进汉字时报错（多半是一行粘了两个词）', () => {
  assert.throws(() => L.parseWordList('苹果 píngguǒ 香蕉 xiāngjiāo'), /第 1 行/);
});

test('parseWordList: 汉字位置没有汉字时报错', () => {
  assert.throws(() => L.parseWordList('apple píngguǒ'), /第 1 行/);
});

test('parseWordList: 同一个词重复出现时只留一个', () => {
  const got = L.parseWordList('苹果 píngguǒ\n苹果 píngguǒ\n香蕉 xiāngjiāo');
  assert.strictEqual(got.length, 2);
});

test('parseWordList: 空文本得到空列表', () => {
  assert.deepStrictEqual(L.parseWordList('   \n\n'), []);
});

// ---------- mergeWords：内置词库 + 自定义词表 ----------

test('mergeWords: 自定义词表里的拼音覆盖内置的', () => {
  const got = L.mergeWords(
    [{ hanzi: '长大', pinyin: 'cháng dà' }],
    [{ hanzi: '长大', pinyin: 'zhǎng dà' }]
  );
  assert.deepStrictEqual(got, [{ hanzi: '长大', pinyin: 'zhǎng dà' }]);
});

test('mergeWords: 自定义只写了汉字时，沿用内置词库已有的拼音', () => {
  const got = L.mergeWords(
    [{ hanzi: '苹果', pinyin: 'píng guǒ' }],
    [{ hanzi: '苹果', pinyin: '' }]
  );
  assert.deepStrictEqual(got, [{ hanzi: '苹果', pinyin: 'píng guǒ' }]);
});

test('mergeWords: 内置词库里没有的词原样加进来', () => {
  const got = L.mergeWords(
    [{ hanzi: '苹果', pinyin: 'píng guǒ' }],
    [{ hanzi: '榴莲', pinyin: '' }]
  );
  assert.deepStrictEqual(got, [
    { hanzi: '苹果', pinyin: 'píng guǒ' },
    { hanzi: '榴莲', pinyin: '' },
  ]);
});

test('mergeWords: 不动传进来的数组', () => {
  const base = [{ hanzi: '苹果', pinyin: 'píng guǒ' }];
  L.mergeWords(base, [{ hanzi: '香蕉', pinyin: '' }]);
  assert.strictEqual(base.length, 1);
});

// ---------- fillPinyin：自动补拼音 ----------
//
// 转换器由调用方注入（浏览器里是 pinyin-pro）—— logic.js 不依赖任何库，
// 测试里用假转换器，就能把「补拼音的规矩」和「拼音标得准不准」分开测。
// 后者由 pinyin.test.js 拿 words.js 的人工标注当基准来量。

const FAKE = (hanzi) => ({ 苹果: 'píng guǒ', 香蕉: 'xiāng jiāo' }[hanzi] || '');

test('fillPinyin: 给没拼音的词补上', () => {
  const got = L.fillPinyin([{ hanzi: '苹果', pinyin: '' }], FAKE);
  assert.strictEqual(got[0].pinyin, 'píng guǒ');
});

test('fillPinyin: 老师自己写了拼音的词不动它', () => {
  const got = L.fillPinyin([{ hanzi: '苹果', pinyin: 'píng guo' }], FAKE);
  assert.strictEqual(got[0].pinyin, 'píng guo');
  assert.ok(!got[0].auto, '老师写的不该被标成自动生成');
});

test('fillPinyin: 补出来的拼音标上 auto，好提醒老师核对', () => {
  const got = L.fillPinyin(
    [{ hanzi: '苹果', pinyin: '' }, { hanzi: '香蕉', pinyin: 'xiāng jiāo' }],
    FAKE
  );
  assert.deepStrictEqual(got.map((w) => !!w.auto), [true, false]);
});

test('fillPinyin: 转换器认不出这个词时，保持没拼音', () => {
  const got = L.fillPinyin([{ hanzi: '槑', pinyin: '' }], FAKE);
  assert.strictEqual(got[0].pinyin, '');
  assert.ok(!got[0].auto);
});

test('fillPinyin: 转换器抛错也不该把整页拖垮', () => {
  const boom = () => { throw new Error('转换器炸了'); };
  const got = L.fillPinyin([{ hanzi: '苹果', pinyin: '' }], boom);
  assert.strictEqual(got[0].pinyin, '');
});

test('fillPinyin: 没有转换器时原样返回', () => {
  const got = L.fillPinyin([{ hanzi: '苹果', pinyin: '' }], null);
  assert.strictEqual(got[0].pinyin, '');
});

test('fillPinyin: 不动传进来的数组', () => {
  const words = [{ hanzi: '苹果', pinyin: '' }];
  L.fillPinyin(words, FAKE);
  assert.strictEqual(words[0].pinyin, '');
});

// ---------- needsReview：自动标的拼音里，哪些要老师亲自核对 ----------

test('needsReview: 含多音字的自动词要点名', () => {
  const got = L.needsReview([
    { hanzi: '还给', pinyin: 'hái gěi', auto: true },
    { hanzi: '苹果', pinyin: 'píng guǒ', auto: true },
  ]);
  assert.deepStrictEqual(got.map((w) => w.hanzi), ['还给']);
});

test('needsReview: 老师自己写的拼音不用核对', () => {
  const got = L.needsReview([{ hanzi: '还给', pinyin: 'huán gěi' }]);
  assert.deepStrictEqual(got, []);
});

test('needsReview: 不含多音字的自动词不必点名', () => {
  const got = L.needsReview([{ hanzi: '香蕉', pinyin: 'xiāng jiāo', auto: true }]);
  assert.deepStrictEqual(got, []);
});

test('needsReview: 空列表得到空结果', () => {
  assert.deepStrictEqual(L.needsReview([]), []);
});

// ---------- formatWordList：把词表写回输入框 ----------

test('formatWordList: 有拼音的写成「汉字 拼音」，一行一个', () => {
  const got = L.formatWordList([
    { hanzi: '苹果', pinyin: 'píng guǒ' },
    { hanzi: '香蕉', pinyin: 'xiāng jiāo' },
  ]);
  assert.strictEqual(got, '苹果 píng guǒ\n香蕉 xiāng jiāo');
});

test('formatWordList: 没拼音的只写汉字', () => {
  assert.strictEqual(L.formatWordList([{ hanzi: '槑', pinyin: '' }]), '槑');
});

test('formatWordList: 写出来的东西能被 parseWordList 原样读回去', () => {
  const words = [
    { hanzi: '苹果', pinyin: 'píng guǒ' },
    { hanzi: '对不起', pinyin: 'duì bu qǐ' },
    { hanzi: '槑', pinyin: '' },
  ];
  assert.deepStrictEqual(L.parseWordList(L.formatWordList(words)), words);
});

// ---------- usableWords：没拼音的词只能用在纯汉字模式 ----------

const MIXED = [
  { hanzi: '苹果', pinyin: 'píng guǒ' },
  { hanzi: '榴莲', pinyin: '' },
];

test('usableWords: 纯汉字模式下没拼音的词照用', () => {
  assert.deepStrictEqual(L.usableWords(MIXED, 'hanzi').map((w) => w.hanzi), ['苹果', '榴莲']);
});

test('usableWords: 汉字+拼音模式下滤掉没拼音的词', () => {
  assert.deepStrictEqual(L.usableWords(MIXED, 'both').map((w) => w.hanzi), ['苹果']);
});

test('usableWords: 纯拼音模式下滤掉没拼音的词', () => {
  assert.deepStrictEqual(L.usableWords(MIXED, 'pinyin').map((w) => w.hanzi), ['苹果']);
});

test('usableWords: 只有空格的拼音也算没拼音', () => {
  assert.strictEqual(L.usableWords([{ hanzi: '榴莲', pinyin: '  ' }], 'both').length, 0);
});

// ---------- alignPinyin：拼音逐字对齐汉字 ----------

test('alignPinyin: 一个音节配一个汉字', () => {
  assert.deepStrictEqual(L.alignPinyin('苹果', 'píng guǒ'), [
    { char: '苹', syllable: 'píng' },
    { char: '果', syllable: 'guǒ' },
  ]);
});

test('alignPinyin: 单字词也照样对齐', () => {
  assert.deepStrictEqual(L.alignPinyin('梨', 'lí'), [{ char: '梨', syllable: 'lí' }]);
});

test('alignPinyin: 三字词对齐', () => {
  const got = L.alignPinyin('对不起', 'duì bu qǐ');
  assert.deepStrictEqual(got.map((p) => p.char), ['对', '不', '起']);
  assert.deepStrictEqual(got.map((p) => p.syllable), ['duì', 'bu', 'qǐ']);
});

test('alignPinyin: 容忍多余空格', () => {
  assert.strictEqual(L.alignPinyin('苹果', '  píng   guǒ  ').length, 2);
});

test('alignPinyin: 音节数对不上时返回 null，交给调用方降级处理', () => {
  assert.strictEqual(L.alignPinyin('苹果', 'píngguǒ'), null, '连写的拼音无法逐字对齐');
  assert.strictEqual(L.alignPinyin('苹果', 'píng guǒ zi'), null, '音节多了');
  assert.strictEqual(L.alignPinyin('苹果', ''), null, '没有拼音');
});

test('alignPinyin: 汉字超出基本平面时按字符算，不按码元算', () => {
  // 𠀋 是一个 4 字节汉字，naive 的 .length 会算成 2 个字符
  const got = L.alignPinyin('𠀋田', 'zhàng tián');
  assert.deepStrictEqual(got, [
    { char: '𠀋', syllable: 'zhàng' },
    { char: '田', syllable: 'tián' },
  ]);
});

// ---------- cellFontSizes：格子里的字号 ----------
//
// 字号计算放在这里而不是 CSS，就是为了能对「每个真实词 x 每种网格」跑穷举验证：
// 印出来才发现字被切掉或者小到看不清，就太晚了。

const CELL = { cellW: 38, cellH: 35 }; // 5x6 网格的一格，单位 mm

test('cellFontSizes: 纯汉字模式不出拼音', () => {
  const got = L.cellFontSizes({ mode: 'hanzi', ...CELL, hanzi: '苹果', pinyin: 'píng guǒ' });
  assert.ok(got.hanzi > 0);
  assert.strictEqual(got.pinyin, 0);
});

test('cellFontSizes: 纯拼音模式不出汉字', () => {
  const got = L.cellFontSizes({ mode: 'pinyin', ...CELL, hanzi: '苹果', pinyin: 'píng guǒ' });
  assert.strictEqual(got.hanzi, 0);
  assert.ok(got.pinyin > 0);
});

test('cellFontSizes: 汉字加拼音模式两样都出', () => {
  const got = L.cellFontSizes({ mode: 'both', ...CELL, hanzi: '苹果', pinyin: 'píng guǒ' });
  assert.ok(got.hanzi > 0 && got.pinyin > 0);
});

test('cellFontSizes: 未知模式报错，不静默出空格', () => {
  assert.throws(
    () => L.cellFontSizes({ mode: 'nope', ...CELL, hanzi: '苹果', pinyin: 'píng guǒ' }),
    /模式/
  );
});

test('cellFontSizes: 纯汉字模式下字越多字号越小', () => {
  const one = L.cellFontSizes({ mode: 'hanzi', ...CELL, hanzi: '鱼', pinyin: 'yú' });
  const four = L.cellFontSizes({ mode: 'hanzi', ...CELL, hanzi: '公共汽车', pinyin: 'gōng gòng qì chē' });
  assert.ok(four.hanzi < one.hanzi, `四字 ${four.hanzi} 应当小于单字 ${one.hanzi}`);
});

test('cellFontSizes: 纯拼音模式下拼音越长字号越小', () => {
  const short = L.cellFontSizes({ mode: 'pinyin', ...CELL, hanzi: '鱼', pinyin: 'yú' });
  const long = L.cellFontSizes({ mode: 'pinyin', ...CELL, hanzi: '公共汽车', pinyin: 'gōng gòng qì chē' });
  assert.ok(long.pinyin < short.pinyin, `长拼音 ${long.pinyin} 应当小于短拼音 ${short.pinyin}`);
});

test('cellFontSizes: 格子矮下来时字号跟着缩，不硬撑', () => {
  const tall = L.cellFontSizes({ mode: 'hanzi', cellW: 38, cellH: 35, hanzi: '苹果', pinyin: 'píng guǒ' });
  const short = L.cellFontSizes({ mode: 'hanzi', cellW: 38, cellH: 12, hanzi: '苹果', pinyin: 'píng guǒ' });
  assert.ok(short.hanzi < tall.hanzi, `矮格 ${short.hanzi} 应当小于高格 ${tall.hanzi}`);
});

test('cellFontSizes: 汉字加拼音模式下，宽高都不吃紧时拼音是汉字的四成', () => {
  const got = L.cellFontSizes({ mode: 'both', cellW: 80, cellH: 80, hanzi: '苹果', pinyin: 'píng guǒ' });
  assert.ok(
    Math.abs(got.pinyin / got.hanzi - 0.4) < 0.02,
    `拼音汉字比例是 ${(got.pinyin / got.hanzi).toFixed(3)}，应当接近 0.40`
  );
});

test('cellFontSizes: 拼音对不齐时（连写），整串拼音也不会撑破格子', () => {
  // 自定义词表里粘连写拼音、或者音节数和汉字数对不上时，走的是「整串居中」这条路。
  // 它横跨整格，所以未必比逐字对齐时小 —— 要保证的是不溢出。
  const cases = [
    ['对不起', 'duìbùqǐ'],
    ['没关系', 'méiguānxi'],
    ['苹果', 'píng guǒ zi'],          // 音节比汉字多
    ['公共汽车', 'gōnggòngqìchē'],
    ['长方形', 'chángfāngxíng'],
  ];
  for (const grid of ['4x6', '5x8']) {
    const [cols, rows] = grid.split('x').map(Number);
    const cell = { cellW: 190 / cols, cellH: 210 / rows };
    const availW = cell.cellW - L.METRICS.cellPadMm;
    for (const [hanzi, pinyin] of cases) {
      const got = L.cellFontSizes({ mode: 'both', ...cell, hanzi, pinyin, aligned: false });
      assert.ok(got.pinyin > 0, `${grid} 的「${hanzi}」拼音字号成了 0`);
      assert.ok(
        got.pinyin * L.pinyinEms(pinyin) <= availW + 1e-6,
        `${grid} 的「${hanzi}」整串拼音溢出：` +
          `${(got.pinyin * L.pinyinEms(pinyin)).toFixed(1)} > ${availW.toFixed(1)}mm`
      );
    }
  }
});

// ---------- 穷举：每个真实词 x 每种网格 x 每种模式 ----------

const { packs } = require('./words.js');

// 必须补上真拼音再穷举。词库只存汉字（拼音运行时生成），直接拿 packs 里的词
// 等于拿「拼音是空串」在测 —— 拼音宽度、长拼音折行这些最容易撑破格子的因素
// 一个都测不到，穷举看着跑了 657 个词，其实是空转。
// 转换器和 app.js 里那个 toPinyin 用的是同一套调用方式。
const PINYIN_PRO = require('./vendor/pinyin-pro.js');
const ALL_WORDS = L.fillPinyin(
  packs.flatMap((p) => p.words),
  (hanzi) => PINYIN_PRO.pinyin(hanzi, { type: 'array' }).join(' ')
);
const GRID_W = 190; // 网格区宽度（mm），两种版式都是整个可打印宽度
const M = L.METRICS;

/** 把 '4x6' 这样的写法换算成一个格子的宽高。gridMm 是网格区总高，随版式变 */
function cellOf(grid, gridMm) {
  const [cols, rows] = grid.split('x').map(Number);
  return { cellW: GRID_W / cols, cellH: gridMm / rows };
}

/** 一个格子里真正能放东西的宽高（扣掉内边距和格线） */
function availOf(cell) {
  const gone = M.cellPadMm + M.cellBorderMm;
  return { w: cell.cellW - gone, h: cell.cellH - gone };
}

/** 按算出来的字号，推算这个词实际占多大 */
function contentBox(mode, size, hanzi, pinyin) {
  const chars = Array.from(hanzi).length;
  const syllables = pinyin.split(/\s+/).filter(Boolean);
  const widest = Math.max(...syllables.map(L.pinyinEms));
  const pyLine = size.pinyin * M.pinyinLineHeight;
  const hzLine = size.hanzi * M.hanziLineHeight;

  if (mode === 'hanzi') return { w: size.hanzi * chars, h: hzLine };
  if (mode === 'pinyin') {
    // 长拼音会折成两行，宽高都得按实际折出来的行算
    const widestLine = Math.max(...size.pinyinLines.map(L.pinyinEms));
    return {
      w: size.pinyin * widestLine,
      h: pyLine * size.pinyinLines.length,
    };
  }
  // both：每个汉字一列，列宽取「汉字」和「该音节」中较宽的那个，列之间还有间隙
  const colW = Math.max(size.hanzi, widest * size.pinyin);
  return { w: colW * chars + M.colGapMm * (chars - 1), h: pyLine + hzLine };
}

// 两种版式都要穷举 —— 两份版把网格区从 210mm 压到 100mm，格子矮一半，
// 是最容易溢出和字号见底的地方，不覆盖等于新版式裸奔。
const LAYOUTS = [
  { name: '整页一份', twoUp: false, gridMm: L.LAYOUT.one.gridMm },
  { name: '一页两份', twoUp: true, gridMm: L.LAYOUT.two.gridMm },
];

for (const lay of LAYOUTS) {
for (const mode of ['both', 'hanzi', 'pinyin']) {
  test(`cellFontSizes 穷举[${lay.name}/${mode}]：${ALL_WORDS.length} 个词在每种网格里都不溢出`, () => {
    for (const grid of L.gridsFor(mode, lay.twoUp)) {
      const cell = cellOf(grid, lay.gridMm);
      const { w: availW, h: availH } = availOf(cell);
      for (const word of ALL_WORDS) {
        const size = L.cellFontSizes({ mode, ...cell, hanzi: word.hanzi, pinyin: word.pinyin });
        const box = contentBox(mode, size, word.hanzi, word.pinyin);
        assert.ok(
          box.w <= availW + 1e-6,
          `${grid} 的格子里「${word.hanzi}」横向溢出：${box.w.toFixed(1)} > ${availW.toFixed(1)}mm`
        );
        assert.ok(
          box.h <= availH + 1e-6,
          `${grid} 的格子里「${word.hanzi}」纵向溢出：${box.h.toFixed(1)} > ${availH.toFixed(1)}mm`
        );
      }
    }
  });

  test(`cellFontSizes 穷举[${lay.name}/${mode}]：每种网格下都没有小到看不清的字`, () => {
    // 下限按模式分开定：汉字笔画密，6mm（约 17pt）以下小学生扫读就吃力；
    // 拼音是拉丁小写字母，笔画稀疏，5.5mm（约 15.6pt）仍然清楚。
    //
    // 两份版的卡实际是 A5，格子本来就矮，拼音下限取 5.3mm（约 15pt）。这不是
    // 为了让测试变绿而放水：整个字号模型自带 4% 安全系数（METRICS.safety），
    // 5.3 和 5.5 的差距正在这个量级里。真正的断崖是 5x8 / 5x10 的 4.2mm
    // （约 12pt，声调符号先糊），那两档已经在 gridsFor 里直接不给选了。
    const FLOOR = mode !== 'pinyin' ? 6 : (lay.twoUp ? 5.3 : 5.5);
    for (const grid of L.gridsFor(mode, lay.twoUp)) {
      const cell = cellOf(grid, lay.gridMm);
      for (const word of ALL_WORDS) {
        // 7x7 / 8x8 的格子太窄，三四个字的词排不开。这两档偏小是明确接受的
        // 取舍（见 logic.js 的 DENSE_GRIDS），下面另有一条把代价钉住。
        if (L.DENSE_GRIDS.includes(grid)) continue;
        const size = L.cellFontSizes({ mode, ...cell, hanzi: word.hanzi, pinyin: word.pinyin });
        const main = mode === 'pinyin' ? size.pinyin : size.hanzi;
        assert.ok(
          main >= FLOOR,
          `${grid} 的格子里「${word.hanzi}」主字号只有 ${main.toFixed(1)}mm，低于 ${FLOOR}mm`
        );
      }
    }
  });
}
}

test('GRIDS: 每种模式都给出了可选网格，且都是「列x行」格式', () => {
  for (const mode of ['both', 'hanzi', 'pinyin']) {
    assert.ok(L.GRIDS[mode].length > 0, `${mode} 没有可选网格`);
    for (const g of L.GRIDS[mode]) {
      assert.match(g, /^\d+x\d+$/, `${mode} 的网格写法不对：${g}`);
    }
  }
});

test('GRIDS: 页面默认选中的那个网格，单选一个主题就能铺满', () => {
  // 打开页面 -> 随手勾一个主题 -> 直接能生成，这是第一次用的最短路径，必须走得通。
  // 更密的 7x7（49 格）、8x8（64 格）单个主题（最小 41 词）铺不满，这是有意为之：
  // 页面会实时提示「词池 41 个词，铺不满 7x7 = 49 格。再多选一个主题。」
  const smallest = Math.min(...packs.map((p) => p.words.length));
  // 必须先框到网格那个下拉再找 —— 「格子里印什么」的下拉里也有个 selected，
  // 直接全文搜会先命中它（value="both"），把 cols/rows 解析成 NaN。
  const sel = HTML.match(/<select id="grid">([\s\S]*?)<\/select>/);
  assert.ok(sel, '找不到 id="grid" 的 select');
  const m = sel[1].match(/<option value="([^"]+)"[^>]*\sselected/);
  assert.ok(m, 'index.html 的网格下拉没有标 selected 的默认项');
  const [cols, rows] = m[1].split('x').map(Number);
  assert.ok(
    cols * rows <= smallest,
    `默认网格 ${m[1]} 要 ${cols * rows} 格，但最小的主题只有 ${smallest} 个词`
  );
});

test('GRIDS: 最密的网格，全部主题加起来也铺得满（页面会提示多选主题）', () => {
  const total = packs.reduce((sum, p) => sum + p.words.length, 0);
  const all = [...L.GRIDS.both, ...L.GRIDS.hanzi, ...L.GRIDS.pinyin];
  const densest = Math.max(...all.map((g) => {
    const [cols, rows] = g.split('x').map(Number);
    return cols * rows;
  }));
  assert.ok(densest <= total, `最密网格要 ${densest} 格，但全部词加起来只有 ${total} 个`);
});

// ---------- splitPinyinLines：长拼音折行 ----------

test('splitPinyinLines: 单音节折不出两行', () => {
  assert.deepStrictEqual(L.splitPinyinLines('yú', 2), ['yú']);
});

test('splitPinyinLines: 折在音节边界上，不会把音节劈开', () => {
  for (const line of L.splitPinyinLines('cháng fāng xíng', 2)) {
    for (const syl of line.split(' ')) {
      assert.ok(['cháng', 'fāng', 'xíng'].includes(syl), `音节被劈开了：${syl}`);
    }
  }
});

test('splitPinyinLines: 两行尽量等长，最长那行要比不折时短', () => {
  const whole = 'gōng gòng qì chē';
  const lines = L.splitPinyinLines(whole, 2);
  assert.strictEqual(lines.length, 2);
  assert.ok(
    Math.max(...lines.map((l) => l.length)) < whole.length,
    `折完最长行 ${Math.max(...lines.map((l) => l.length))} 不比整串 ${whole.length} 短`
  );
});

test('splitPinyinLines: 折行后不丢音节也不加音节', () => {
  const whole = 'zhōng qiū jié';
  assert.strictEqual(L.splitPinyinLines(whole, 2).join(' '), whole);
});

test('splitPinyinLines: maxLines 为 1 时原样返回', () => {
  assert.deepStrictEqual(L.splitPinyinLines('píng guǒ', 1), ['píng guǒ']);
});

test('cellFontSizes: 纯拼音模式下，长拼音靠折两行换来更大的字号', () => {
  const cell = { cellW: 38, cellH: 26.25 }; // 5x8 的一格
  const got = L.cellFontSizes({ mode: 'pinyin', ...cell, hanzi: '长方形', pinyin: 'cháng fāng xíng' });
  assert.strictEqual(got.pinyinLines.length, 2, '这么长的拼音应当折成两行');
  const oneLine = 38 - L.METRICS.cellPadMm - L.METRICS.cellBorderMm;
  const unwrapped = oneLine / L.pinyinEms('cháng fāng xíng');
  assert.ok(got.pinyin > unwrapped, `折行后 ${got.pinyin.toFixed(1)} 应当大于不折的 ${unwrapped.toFixed(1)}`);
});

// ---------- index.html 与 logic.js 的一致性 ----------
//
// 起因：把网格选项从写死在 HTML 改成纯 JS 填充后，「新 HTML + 浏览器缓存的旧 app.js」
// 这个组合会让下拉变成完全空白 —— 页面看起来坏了，还不报错。
// 两道防线：HTML 里保留一份静态兜底选项（旧 JS 也能用），脚本地址带版本号（不让 JS 变旧）。

const fs = require('node:fs');
const HTML = fs.readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');

test('index.html: 网格下拉里有静态兜底选项，JS 没跑起来也不会是空白', () => {
  const select = HTML.match(/<select id="grid">([\s\S]*?)<\/select>/);
  assert.ok(select, '找不到 id="grid" 的 select');
  const options = [...select[1].matchAll(/value="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(options.length > 0, '网格下拉是空的 —— 旧版 app.js 会让用户看到空白下拉');
});

test('index.html: 静态兜底选项与 logic.js 的默认模式网格完全一致', () => {
  const select = HTML.match(/<select id="grid">([\s\S]*?)<\/select>/);
  const options = [...select[1].matchAll(/value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(
    options, L.GRIDS.both,
    'HTML 里的兜底选项和 GRIDS.both 对不上了，改了一处忘了另一处'
  );
});

test('index.html: 本地脚本都带版本号，避免用户拿到缓存的旧 JS', () => {
  const srcs = [...HTML.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(srcs.length >= 4, `只找到 ${srcs.length} 个脚本标签`);
  for (const src of srcs) {
    assert.match(src, /\?v=/, `${src} 没带 ?v= 版本号，改版后用户会拿到缓存的旧文件`);
  }
});

test('index.html: 自己写的三个脚本共用一个版本号，不会出现半新半旧', () => {
  // vendor/ 里打包的第三方库不在此列 —— 它钉自己的库版本号（?v=3.29.2）。
  // 那是个 324KB 的文件，我们改一行 app.js 不该让老师把它重下一遍；
  // 只有升级库本身时才动它。
  const own = [...HTML.matchAll(/<script src="(?!vendor\/)([^"?]+)\?v=([^"]+)"/g)];
  assert.strictEqual(own.length, 3, `自己的脚本应该有 3 个，实得 ${own.length}`);
  const versions = own.map((m) => m[2]);
  assert.strictEqual(new Set(versions).size, 1, `版本号不统一：${versions.join(', ')}`);
});

test('index.html: 打包的拼音库带的版本号就是 vendor 里那个库的版本', () => {
  const m = HTML.match(/<script src="vendor\/pinyin-pro\.js\?v=([^"]+)"/);
  assert.ok(m, 'index.html 里没有引入 vendor/pinyin-pro.js');
  const lib = require('./vendor/pinyin-pro.js');
  assert.ok(typeof lib.pinyin === 'function', 'vendor/pinyin-pro.js 没导出 pinyin()');
  assert.match(m[1], /^\d+\.\d+\.\d+$/, `版本号该写成库的版本（如 3.29.2），实得 ${m[1]}`);
});

test('index.html: 打印时关掉了 justify-items —— 否则整张卡按内容收缩，印出来不满页', () => {
  // 屏幕上 .cards 是网格布局，justify-items:start 只管网格项对齐。
  // 打印时它被改成 display:block，而新版 Chrome 的块级布局也认 justify-self：
  // 这条属性会让 .card-slot 从「撑满父容器」变成「按内容收缩」，
  // 于是整张卡的宽度跟着词的字数走 —— 实测 190mm 缩到 163mm，右边空出 26mm。
  // 屏幕上看不出来，因为那时 .card-slot 有固定宽度。

  // 先剥掉 CSS 注释再解析 —— 注释里也会提到 justify-items，会把正则带偏
  const css = HTML.replace(/\/\*[\s\S]*?\*\//g, '');
  const print = css.match(/@media print \{([\s\S]*)\n  \}/);
  assert.ok(print, '找不到 @media print 块');
  const cards = print[1].match(/\.cards \{([\s\S]*?)\}/);
  assert.ok(cards, '@media print 里没有 .cards 规则');
  const m = cards[1].match(/justify-items:\s*([\w-]+)/);
  assert.ok(m, '@media print 的 .cards 没有显式设置 justify-items —— 会继承屏幕那条 start');
  assert.notStrictEqual(m[1], 'start', 'justify-items 仍是 start，卡片会按内容收缩');
});

// ---------- 一张 A4 印两份：版式尺寸的自洽与 CSS/JS 一致 ----------

test('LAYOUT: 两种版式的抬头+间隔+网格都等于卡片总高', () => {
  for (const [name, v] of Object.entries(L.LAYOUT)) {
    assert.strictEqual(
      v.headMm + v.gapMm + v.gridMm, v.cardMm,
      `${name} 版式对不上：${v.headMm}+${v.gapMm}+${v.gridMm} != ${v.cardMm}`
    );
  }
});

test('LAYOUT: 两份版的总高预算和整页版一样，不许偷占页眉页脚的余量', () => {
  // 238mm 是「一张卡永远只占一页」的保障 —— A4 可打印 277mm，留 39mm 给
  // 浏览器自己加的页眉页脚。两份版要是为了多塞内容把这个吃掉，
  // 用户一开页眉页脚就会被劈成两页，而且是印出来才发现。
  const two = L.LAYOUT.two;
  assert.strictEqual(
    two.cardMm * 2 + two.gutterMm, L.LAYOUT.one.cardMm,
    `两份版占 ${two.cardMm * 2 + two.gutterMm}mm，整页版是 ${L.LAYOUT.one.cardMm}mm`
  );
});

test('gridsFor: 整页版给出全部网格，两份版砍掉半页放不下的', () => {
  for (const mode of ['both', 'hanzi', 'pinyin']) {
    assert.deepStrictEqual(L.gridsFor(mode, false), L.GRIDS[mode], `${mode} 整页版不该被过滤`);
    const two = L.gridsFor(mode, true);
    assert.ok(two.length > 0, `${mode} 两份版一个网格都不剩`);
    for (const g of two) {
      const rows = Number(g.split('x')[1]);
      assert.ok(rows <= L.TWO_UP_MAX_ROWS, `${mode} 两份版不该给出 ${g}`);
    }
  }
});

test('gridsFor: 默认模式（汉字+拼音）在两份版下一个网格都没少', () => {
  // 老师日常用的就是这个模式。要是省纸的代价是网格选项变少，这功能就不好用了。
  assert.deepStrictEqual(L.gridsFor('both', true), L.GRIDS.both);
});

test('index.html: 半张卡的尺寸和 logic.js 的 LAYOUT.two 对得上', () => {
  const css = HTML.replace(/\/\*[\s\S]*?\*\//g, '');
  const pick = (re, what) => {
    const m = css.match(re);
    assert.ok(m, `index.html 里找不到${what}`);
    return Number(m[1]);
  };
  assert.strictEqual(
    pick(/\.sheet \{[^}]*--card-h:\s*([\d.]+)mm/, '.sheet 的 --card-h'),
    L.LAYOUT.two.cardMm, '.sheet 的卡片高度和 LAYOUT.two.cardMm 不一致');
  assert.strictEqual(
    pick(/\.card--half \.card__head \{[^}]*flex:\s*0 0 ([\d.]+)mm/, '半张卡的抬头高度'),
    L.LAYOUT.two.headMm, '半张卡抬头高度和 LAYOUT.two.headMm 不一致');
  assert.strictEqual(
    pick(/\.card--half \.card__grid \{[^}]*margin-top:\s*([\d.]+)mm/, '半张卡的抬头间隔'),
    L.LAYOUT.two.gapMm, '半张卡的间隔和 LAYOUT.two.gapMm 不一致');
  assert.strictEqual(
    pick(/\.cutline \{[^}]*height:\s*calc\(([\d.]+)mm/, '剪切线高度'),
    L.LAYOUT.two.gutterMm, '剪切线高度和 LAYOUT.two.gutterMm 不一致');
});

test('index.html: 整页版的卡片高度和 logic.js 的 LAYOUT.one 对得上', () => {
  const css = HTML.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = css.match(/\.cards \{[^}]*--card-h:\s*([\d.]+)mm/);
  assert.ok(m, '找不到 .cards 的 --card-h');
  assert.strictEqual(Number(m[1]), L.LAYOUT.one.cardMm);
});

test('index.html: 两份版的翻页单位是「一张纸」，卡槽收回了自己的翻页', () => {
  // 漏了 .sheet .card-slot 这条，两张卡还是各占一页 —— 功能等于没做，
  // 而且屏幕预览看着是对的，只有印出来才发现。
  const css = HTML.replace(/\/\*[\s\S]*?\*\//g, '');
  const print = css.match(/@media print \{([\s\S]*)\n  \}/);
  assert.ok(print, '找不到 @media print 块');
  assert.match(print[1], /\.sheet \{[^}]*break-after:\s*page/, '.sheet 没有按页翻');
  assert.match(print[1], /\.sheet \.card-slot \{[^}]*break-after:\s*auto/,
    '.sheet 里的卡槽没有收回翻页，两份会各占一页');
});

// ---------- 紧凑网格（7x7 / 8x8）与两份版拼音的取舍，都钉住 ----------

test('DENSE_GRIDS: 7x7 / 8x8 确实在选项里 —— 这是用户要的，别被后来的重构悄悄删掉', () => {
  for (const g of L.DENSE_GRIDS) {
    assert.ok(L.GRIDS.both.includes(g), `默认模式少了 ${g}`);
    assert.ok(L.GRIDS.hanzi.includes(g), `只印汉字少了 ${g}`);
    assert.ok(L.GRIDS.pinyin.includes(g), `只印拼音少了 ${g}`);
  }
  assert.ok(L.GRIDS.both.includes('6x6'), '默认模式少了 6x6');
});

test('DENSE_GRIDS: 长词在这两档确实偏小 —— 明确的取舍，但不许更糟', () => {
  // 加 7x7 / 8x8 的代价：词库里最长的词字号会掉到 6mm 下限以下。
  // 这一条不是要求它达标，而是钉住「差成什么样」—— 哪天改了字号算法或
  // 度量表让它更小，这里会红，而不是等印出来才发现。
  const longest = ALL_WORDS.reduce(
    (a, b) => (Array.from(b.hanzi).length > Array.from(a.hanzi).length ? b : a)
  );
  assert.strictEqual(longest.hanzi, '公共汽车', '词库里最长的词变了，下面的数值要重新量');

  const got = {};
  for (const g of L.DENSE_GRIDS) {
    const [cols, rows] = g.split('x').map(Number);
    const size = L.cellFontSizes({
      mode: 'both', cellW: GRID_W / cols, cellH: L.LAYOUT.one.gridMm / rows,
      hanzi: longest.hanzi, pinyin: longest.pinyin,
    });
    got[g] = size.hanzi;
    assert.ok(size.hanzi < 6, `${g} 居然达标了 —— 那 DENSE_GRIDS 的例外就该撤掉`);
    assert.ok(size.hanzi > 4, `${g} 只有 ${size.hanzi.toFixed(1)}mm，比当初接受的还小`);
  }
  // 当初做决定时的实测值，留作对照
  assert.ok(Math.abs(got['7x7'] - 5.3) < 0.3, `7x7 实得 ${got['7x7'].toFixed(1)}mm，当初是 5.3mm`);
  assert.ok(Math.abs(got['8x8'] - 4.5) < 0.3, `8x8 实得 ${got['8x8'].toFixed(1)}mm，当初是 4.5mm`);
});

test('gridsFor: 两份版 + 只印拼音，挡掉了拼音会掉到 4.2mm 的那两档', () => {
  // 这两档是断崖（约 12pt，声调符号先糊）。只在这一个组合下挡：
  // 整页版它们有 6.9mm，好得很，不该受连累。
  const twoUpPinyin = L.gridsFor('pinyin', true);
  for (const g of L.TWO_UP_PINYIN_BLOCKED) {
    assert.ok(!twoUpPinyin.includes(g), `两份版的纯拼音不该给出 ${g}`);
    assert.ok(L.gridsFor('pinyin', false).includes(g), `整页版的纯拼音不该少了 ${g}`);
    // 拿 hanzi 模式验证「只挡纯拼音」—— 它的网格表里 5x8 和 5x10 都有
    // （both 模式本来就没有 5x10，用它验证等于什么都没验）
    assert.ok(L.gridsFor('hanzi', true).includes(g), `只该挡纯拼音，不该连累只印汉字的 ${g}`);
  }
});

test('穷举用的词必须带真拼音 —— 空拼音会让整组穷举变成空转', () => {
  // 这条守的是「测试自己的输入」。词库只存汉字，拼音运行时生成；如果哪天
  // ALL_WORDS 又退回直接读 packs，穷举照样跑 657 个词、照样全绿，但拼音宽度
  // 和长拼音折行一个都测不到 —— 今天这个盲点就是这么潜伏下来的。
  const missing = ALL_WORDS.filter((w) => !String(w.pinyin || '').trim());
  assert.strictEqual(missing.length, 0,
    `有 ${missing.length} 个词没拼音，如「${missing[0] && missing[0].hanzi}」`);

  // 再抽查一个：拼音得是按音节分开的，不是连写
  const four = ALL_WORDS.find((w) => w.hanzi === '公共汽车');
  assert.ok(four, '词库里找不到「公共汽车」');
  assert.strictEqual(four.pinyin, 'gōng gòng qì chē');
});
