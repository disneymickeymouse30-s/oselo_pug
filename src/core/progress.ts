/**
 * 対局結果の記録と、パグ・アイテムの解放判定（React 非依存）
 */
import { BLACK, WHITE, type Player } from './othello';
import type { Difficulty } from './ai';
import { type PlayStats, isMet } from '../data/conditions';
import { PUGS } from '../data/pugs';
import { BOARDS, BACKGROUNDS } from '../data/items';
import { newGrowth, dayKey, type SaveData, type Owned, type PugGrowth } from '../store/save';
import { PUG_BY_ID } from '../data/pugs';
import { BOARD_BY_ID, BG_BY_ID } from '../data/items';
import {
  REWARDS, BONUS, GAME_LOVE, LEVELUP_PP, PLAYER_MAX_LV, PUG_MAX_LV, LOVE_MAX, PET_LOVE,
  playerExpToNext, pugExpToNext, TREATS, PUG_PRICE_PP, ITEM_PRICE_COINS,
} from '../data/growth';
import { addMissionEvents, eventsFromGame } from './modes';
import { HISTORY_MAX, type GameLog } from './achievements';
import { activeEvents } from '../data/missions';

export interface GameResult {
  mode: '1p' | '2p';
  level: Difficulty;
  /** 1人モードでのプレイヤーの色 */
  human: Player;
  black: number;
  white: number;
  /** 終局時に人間側が持っている角の数（角は二度と裏返らない） */
  humanCorners: number;
  /** 対局中に人間側が最もリードされた石差（マイナスほどピンチ） */
  humanWorstLead: number;
  endedAt: Date;
  /** 対局時間（ミリ秒） */
  durationMs?: number;
}

export function applyResult(prev: PlayStats, r: GameResult): PlayStats {
  const s: PlayStats = structuredClone(prev);
  s.games++;
  const month = r.endedAt.getMonth() + 1;
  if (!s.months.includes(month)) s.months = [...s.months, month].sort((a, b) => a - b);
  const h = r.endedAt.getHours();
  if (h >= 22 || h < 4) s.playedAtNight = true;
  if (r.durationMs !== undefined) {
    s.totalDurationMs += Math.max(0, Math.min(r.durationMs, 3 * 60 * 60 * 1000));
    s.timedGames++;
  }
  if (r.mode === '1p') { s.totalMyDiscs += r.human === BLACK ? r.black : r.white; s.discGames++; }
  if (r.mode === '1p') s.gamesByLevel[r.level]++;

  if (r.mode === '2p') {
    s.duoGames++;
    if (r.black === r.white) s.draws++;
    return s;
  }
  const mine = r.human === BLACK ? r.black : r.white;
  const theirs = r.human === BLACK ? r.white : r.black;
  if (mine > theirs) {
    s.wins++;
    s.winsByLevel[r.level]++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.bestMargin = Math.max(s.bestMargin, mine - theirs);
    if (theirs === 0) s.perfects++;
    if (r.humanCorners === 4) s.corners4Wins++;
    if (r.human === WHITE) s.winsAsWhite++;
    if (r.humanWorstLead <= -10) s.comebacks++;
  } else if (mine < theirs) {
    s.losses++;
    s.streak = 0;
  } else {
    s.draws++;
    s.streak = 0;
  }
  return s;
}

export interface Unlocked {
  pugs: string[];
  boards: string[];
  bgs: string[];
}

/**
 * 条件を満たしたものをすべて解放する。
 * 「パグを n 種類集める」はパグの解放で数が増えるので、変化がなくなるまで繰り返す。
 * 二重取得はキーの存在チェックで防ぐ（同じパグを2回もらうことはない）。
 */
export function unlockAll(save: SaveData, now: Date): { save: SaveData; unlocked: Unlocked } {
  const at = now.toISOString();
  const pugs: Record<string, Owned> = { ...save.pugs };
  const growth: Record<string, PugGrowth> = { ...save.growth };
  const boards: Record<string, Owned> = { ...save.boards };
  const bgs: Record<string, Owned> = { ...save.bgs };
  const unlocked: Unlocked = { pugs: [], boards: [], bgs: [] };

  let changed = true;
  while (changed) {
    changed = false;
    const n = Object.keys(pugs).length;
    for (const p of PUGS) {
      if (!pugs[p.id] && isMet(p.unlock, save.stats, n)) {
        pugs[p.id] = { at, seen: false };
        growth[p.id] ??= newGrowth();
        unlocked.pugs.push(p.id);
        changed = true;
      }
    }
  }
  const n = Object.keys(pugs).length;
  for (const b of BOARDS) {
    if (!boards[b.id] && isMet(b.unlock, save.stats, n)) { boards[b.id] = { at, seen: false }; unlocked.boards.push(b.id); }
  }
  for (const b of BACKGROUNDS) {
    if (!bgs[b.id] && isMet(b.unlock, save.stats, n)) { bgs[b.id] = { at, seen: false }; unlocked.bgs.push(b.id); }
  }
  for (const id of Object.keys(pugs)) growth[id] ??= newGrowth();
  return { save: { ...save, pugs, boards, bgs, growth }, unlocked };
}

// ---------------------------------------------------------------
// 経験値・レベル
// ---------------------------------------------------------------

export function gainPlayerExp(p: { lv: number; exp: number }, add: number): { player: { lv: number; exp: number }; levelUps: number } {
  let { lv, exp } = p;
  let levelUps = 0;
  if (lv >= PLAYER_MAX_LV) return { player: { lv, exp: 0 }, levelUps: 0 };
  exp += add;
  while (lv < PLAYER_MAX_LV && exp >= playerExpToNext(lv)) {
    exp -= playerExpToNext(lv);
    lv++;
    levelUps++;
  }
  if (lv >= PLAYER_MAX_LV) exp = 0;
  return { player: { lv, exp }, levelUps };
}

export function gainPugExp(g: PugGrowth, add: number, love = 0): { growth: PugGrowth; levelUps: number } {
  let { lv, exp } = g;
  let levelUps = 0;
  if (lv < PUG_MAX_LV) {
    exp += add;
    while (lv < PUG_MAX_LV && exp >= pugExpToNext(lv)) {
      exp -= pugExpToNext(lv);
      lv++;
      levelUps++;
    }
  }
  if (lv >= PUG_MAX_LV) exp = 0;
  return { growth: { ...g, lv, exp, love: Math.min(LOVE_MAX, g.love + love) }, levelUps };
}

// ---------------------------------------------------------------
// 対局の報酬
// ---------------------------------------------------------------

export interface Rewards {
  exp: number;
  coins: number;
  pp: number;
  /** 内訳（リザルト画面に表示） */
  notes: string[];
  player: { from: number; to: number };
  partner: { id: string; exp: number; love: number; from: number; to: number };
}

export function computeRewards(r: GameResult): { exp: number; coins: number; pp: number; love: number; notes: string[] } {
  const notes: string[] = [];
  if (r.mode === '2p') return { ...REWARDS.duo, pp: 0, love: GAME_LOVE.other, notes: ['ふたりであそぶ'] };
  const mine = r.human === BLACK ? r.black : r.white;
  const theirs = r.human === BLACK ? r.white : r.black;
  if (mine === theirs) return { ...REWARDS.draw, pp: 0, love: GAME_LOVE.other, notes: ['引き分け'] };
  const won = mine > theirs;
  const base = won ? REWARDS.win[r.level] : REWARDS.lose[r.level];
  let { coins } = base;
  let pp = 0;
  notes.push(won ? '勝利' : 'ナイスファイト');
  if (won && theirs === 0) { coins += BONUS.perfect.coins; pp += BONUS.perfect.pp; notes.push('パーフェクト'); }
  if (won && r.humanCorners === 4) { coins += BONUS.corners4.coins; pp += BONUS.corners4.pp; notes.push('角4つ'); }
  if (won && r.level === 'hard') { coins += BONUS.hardWin.coins; pp += BONUS.hardWin.pp; notes.push('HARD撃破'); }
  return { exp: base.exp, coins, pp, love: won ? GAME_LOVE.win : GAME_LOVE.other, notes };
}

/** 日付の巻き戻しに強い「今日」：これまでで一番新しい日付より前には戻らない */
export function effectiveDay(save: SaveData, now: Date): string {
  const today = dayKey(now);
  return save.lastSeenDay && save.lastSeenDay > today ? save.lastSeenDay : today;
}

/**
 * 対局終了時の一連の処理：記録 → 報酬 → パートナー育成 → 解放
 * GameScreen は1局につき1回だけ呼ぶ（報酬の二重取得防止）
 */
export function recordGame(save: SaveData, r: GameResult): { save: SaveData; unlocked: Unlocked; rewards: Rewards } {
  const rw = computeRewards(r);
  // 期間限定イベントのコイン倍率
  const rate = Math.max(1, ...activeEvents(effectiveDay(save, r.endedAt)).map((e) => e.coinRate));
  if (rate > 1) { rw.coins = Math.round(rw.coins * rate); rw.notes.push(`イベント×${rate}`); }
  const pl = gainPlayerExp(save.player, rw.exp);
  const pp = rw.pp + pl.levelUps * LEVELUP_PP;
  if (pl.levelUps) rw.notes.push(`レベルアップ ×${pl.levelUps}`);
  const partnerId = save.pugs[save.favoritePug] ? save.favoritePug : 'normal';
  const before = save.growth[partnerId] ?? newGrowth();
  const pg = gainPugExp(before, rw.exp, rw.love);
  const mine = r.mode === '2p' ? r.black : r.human === BLACK ? r.black : r.white;
  const theirs = r.mode === '2p' ? r.white : r.human === BLACK ? r.white : r.black;
  const log: GameLog = {
    t: r.endedAt.toISOString(), m: r.mode, l: r.level, r: mine > theirs ? 'w' : mine < theirs ? 'l' : 'd',
    my: mine, op: theirs, sec: Math.round((r.durationMs ?? 0) / 1000),
  };
  const next: SaveData = {
    ...save,
    history: [...save.history, log].slice(-HISTORY_MAX),
    stats: applyResult(save.stats, r),
    player: pl.player,
    wallet: {
      coins: save.wallet.coins + rw.coins,
      pp: save.wallet.pp + pp,
      earnedCoins: save.wallet.earnedCoins + rw.coins,
      earnedPP: save.wallet.earnedPP + pp,
    },
    growth: { ...save.growth, [partnerId]: pg.growth },
    lastSeenDay: effectiveDay(save, r.endedAt),
  };
  const res = unlockAll(addMissionEvents(next, eventsFromGame(r), r.endedAt), r.endedAt);
  return {
    ...res,
    rewards: {
      exp: rw.exp, coins: rw.coins, pp, notes: rw.notes,
      player: { from: save.player.lv, to: pl.player.lv },
      partner: { id: partnerId, exp: rw.exp, love: rw.love, from: before.lv, to: pg.growth.lv },
    },
  };
}

// ---------------------------------------------------------------
// 育成・お店（失敗時は理由を返し、データは変えない）
// ---------------------------------------------------------------

export type ActionResult = { ok: true; save: SaveData; levelUps: number } | { ok: false; reason: string };

export function canPet(save: SaveData, id: string, now: Date): boolean {
  const g = save.growth[id];
  return Boolean(save.pugs[id] && g && g.lastPet !== effectiveDay(save, now));
}

/** なでる：1日1回・パグごと。親密度アップ */
export function petPug(save: SaveData, id: string, now: Date): ActionResult {
  if (!save.pugs[id]) return { ok: false, reason: 'まだ仲間になっていないパグです' };
  const day = effectiveDay(save, now);
  const g = save.growth[id] ?? newGrowth();
  if (g.lastPet === day) return { ok: false, reason: '今日はもうなでたよ。また明日！' };
  return {
    ok: true,
    levelUps: 0,
    save: addMissionEvents(
      { ...save, lastSeenDay: day, stats: { ...save.stats, pets: save.stats.pets + 1 }, growth: { ...save.growth, [id]: { ...g, love: Math.min(LOVE_MAX, g.love + PET_LOVE), lastPet: day } } },
      ['pet'], now,
    ),
  };
}

/** おやつをあげる：コインまたはパグポイントを使って経験値と親密度アップ */
export function feedPug(save: SaveData, id: string, treatId: string): ActionResult {
  const t = TREATS.find((x) => x.id === treatId);
  if (!t) return { ok: false, reason: 'そのおやつはありません' };
  if (!save.pugs[id]) return { ok: false, reason: 'まだ仲間になっていないパグです' };
  const g = save.growth[id] ?? newGrowth();
  if (g.lv >= PUG_MAX_LV && g.love >= LOVE_MAX) return { ok: false, reason: 'もうおなかいっぱい！（レベル・親密度ともに最大）' };
  if (save.wallet.coins < t.coins) return { ok: false, reason: 'コインが足りません' };
  if (save.wallet.pp < t.pp) return { ok: false, reason: 'パグポイントが足りません' };
  const r = gainPugExp(g, t.exp, t.love);
  return {
    ok: true,
    levelUps: r.levelUps,
    save: {
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins - t.coins, pp: save.wallet.pp - t.pp },
      growth: { ...save.growth, [id]: r.growth },
    },
  };
}

/** パグポイントでパグを迎える（N・R のみ） */
export function buyPug(save: SaveData, id: string, now: Date): ActionResult {
  const p = PUG_BY_ID[id];
  if (!p) return { ok: false, reason: 'そのパグはいません' };
  if (save.pugs[id]) return { ok: false, reason: 'もう仲間になっています' };
  const price = PUG_PRICE_PP[p.rarity];
  if (price === undefined) return { ok: false, reason: 'このパグは条件を達成したときだけ会えます' };
  if (save.wallet.pp < price) return { ok: false, reason: 'パグポイントが足りません' };
  const bought: SaveData = {
    ...save,
    wallet: { ...save.wallet, pp: save.wallet.pp - price },
    pugs: { ...save.pugs, [id]: { at: now.toISOString(), seen: true } },
    growth: { ...save.growth, [id]: save.growth[id] ?? newGrowth() },
  };
  // 「n種類集める」の条件が連鎖で満たされることがある
  return { ok: true, levelUps: 0, save: unlockAll(bought, now).save };
}

/** コインでオセロ盤・背景を先に解放 */
export function buyItem(save: SaveData, kind: 'board' | 'bg', id: string, now: Date): ActionResult {
  const price = ITEM_PRICE_COINS[`${kind}:${id}`];
  const exists = kind === 'board' ? BOARD_BY_ID[id] : BG_BY_ID[id];
  if (!exists || price === undefined) return { ok: false, reason: 'そのアイテムは買えません' };
  const owned = kind === 'board' ? save.boards : save.bgs;
  if (owned[id]) return { ok: false, reason: 'もう持っています' };
  if (save.wallet.coins < price) return { ok: false, reason: 'コインが足りません' };
  const rec = { ...owned, [id]: { at: now.toISOString(), seen: true } };
  return {
    ok: true,
    levelUps: 0,
    save: { ...save, wallet: { ...save.wallet, coins: save.wallet.coins - price }, ...(kind === 'board' ? { boards: rec } : { bgs: rec }) },
  };
}
