/** Width ÷ height. Most national flags are 2:3; only the exceptions are listed. */
const RATIO_2_1 = 2;
const RATIO_3_5 = 5 / 3;
const RATIO_10_19 = 19 / 10;
const RATIO_5_8 = 8 / 5;
const RATIO_8_11 = 11 / 8;
const RATIO_4_7 = 7 / 4;
const RATIO_3_4 = 4 / 3;
const RATIO_7_10 = 10 / 7;

const ratios: Record<string, number> = {
  // 1:2
  ae: RATIO_2_1, af: RATIO_2_1, ai: RATIO_2_1, am: RATIO_2_1, as: RATIO_2_1, au: RATIO_2_1,
  az: RATIO_2_1, ba: RATIO_2_1, bm: RATIO_2_1, bn: RATIO_2_1, bs: RATIO_2_1, by: RATIO_2_1,
  ca: RATIO_2_1, ck: RATIO_2_1, cu: RATIO_2_1, dm: RATIO_2_1, eh: RATIO_2_1, er: RATIO_2_1,
  et: RATIO_2_1, fj: RATIO_2_1, fk: RATIO_2_1, gb: RATIO_2_1, gi: RATIO_2_1, gs: RATIO_2_1,
  gu: RATIO_2_1, gw: RATIO_2_1, hm: RATIO_2_1, hn: RATIO_2_1, hr: RATIO_2_1, ie: RATIO_2_1,
  im: RATIO_2_1, io: RATIO_2_1, jm: RATIO_2_1, jo: RATIO_2_1, ki: RATIO_2_1, kp: RATIO_2_1,
  kw: RATIO_2_1, ky: RATIO_2_1, kz: RATIO_2_1, lc: RATIO_2_1, lk: RATIO_2_1, lv: RATIO_2_1,
  ly: RATIO_2_1, md: RATIO_2_1, me: RATIO_2_1, mk: RATIO_2_1, mn: RATIO_2_1, mp: RATIO_2_1,
  ms: RATIO_2_1, my: RATIO_2_1, nf: RATIO_2_1, ng: RATIO_2_1, nr: RATIO_2_1, nu: RATIO_2_1,
  nz: RATIO_2_1, ph: RATIO_2_1, pn: RATIO_2_1, ps: RATIO_2_1, sb: RATIO_2_1, sc: RATIO_2_1,
  sd: RATIO_2_1, sh: RATIO_2_1, si: RATIO_2_1, ss: RATIO_2_1, st: RATIO_2_1, tc: RATIO_2_1,
  tj: RATIO_2_1, tl: RATIO_2_1, to: RATIO_2_1, tv: RATIO_2_1, uz: RATIO_2_1, vg: RATIO_2_1,
  ws: RATIO_2_1, zw: RATIO_2_1,
  // 10:19, the United States and flags that copy it
  us: RATIO_10_19, um: RATIO_10_19, lr: RATIO_10_19, mh: RATIO_10_19, fm: RATIO_10_19,
  // 3:5
  bd: RATIO_3_5, bg: RATIO_3_5, bh: RATIO_3_5, bi: RATIO_3_5, bz: RATIO_3_5, cf: RATIO_3_5,
  cr: RATIO_3_5, de: RATIO_3_5, gd: RATIO_3_5, gy: RATIO_3_5, ht: RATIO_3_5, je: RATIO_3_5,
  kg: RATIO_3_5, km: RATIO_3_5, li: RATIO_3_5, lt: RATIO_3_5, lu: RATIO_3_5, ni: RATIO_3_5,
  sv: RATIO_3_5, tt: RATIO_3_5,
  // 5:8
  ar: RATIO_5_8, gt: RATIO_5_8, pl: RATIO_5_8, pw: RATIO_5_8, se: RATIO_5_8,
  // Nordic crosses that are not 2:3
  dk: 37 / 28, fo: RATIO_8_11, no: RATIO_8_11, is: 25 / 18, fi: 18 / 11,
  // Other official ratios
  al: 7 / 5, ad: RATIO_7_10, be: 15 / 13, bo: 22 / 15, br: RATIO_7_10, cd: RATIO_3_4,
  ch: 1, ee: 11 / 7, ga: RATIO_3_4, il: RATIO_8_11, ir: RATIO_4_7, mc: 5 / 4,
  mx: RATIO_4_7, ne: 7 / 6, np: 1 / 1.219, om: RATIO_4_7, pg: RATIO_3_4, py: 20 / 11,
  qa: 28 / 11, sm: RATIO_3_4, tg: (1 + Math.sqrt(5)) / 2, va: 1,
};

/** Fly ÷ hoist for an ISO 3166-1 alpha-2 code. Unknown codes use 2:3. */
export function flagRatio(iso: string) {
  return ratios[iso.toLowerCase()] ?? 3 / 2;
}
