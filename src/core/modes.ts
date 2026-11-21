/**
 * チャレンジ・パグカップ・ミッション・ログインボーナスのロジック（React 非依存）
 * 報酬の二重取得を防ぐため、受け取り済みの記録はセーブデータに残し、日付は effectiveDay（巻き戻し対策）で判定する。
 */
import { BLACK, type Player } from './othello';
import { STAGES, STAGE_BY_ID, type Objective, type Stage } from '../data/challenges';
import { CUPS, CUP_BY_ID, type Cup } from '../data/cups';
import { DAILY, WEEKLY, DAILY_COMPLETE, LOGIN_REWARDS, activeEvents, EVENTS, type Mission, type MissionEvent } from '../data/missions';
import { LEVELUP_PP } from '../data/growth';
import { effectiveDay, gainPlayerExp } from './progress';
import type { SaveData } from '../store/save';

// ---------------------------------------------------------------
// 1局のくわしい結果（チャレンジの判定に使う）
// ---------------------------------------------------------------

export interface PlayDetail {
  won: boolean;
  margin: number;
  humanCorners: number;
  humanWorstLead: number;
  humanMaxFlip: number;
  humanTotalFlips: number;
  humanMoves: number;
  opponentDiscs: number;
  usedUndo: boolean;
  usedHint: boolean;
}

export function checkObjective(o: Objective, d: PlayDetail): boolean {
  switch (o.t) {
    case 'win': return d.won;
    case 'margin': return d.won && d.margin >= o.n;
    case 'corners': return d.humanCorners >= o.n;
    case 'comeback': return d.won && d.humanWorstLead <= -10;
    case 'bigFlip': return d.humanMaxFlip >= o.n;
    case 'totalFlips': return d.humanTotalFlips >= o.n;
    case 'perfect': return d.won && d.opponentDiscs === 0;
    case 'movesWithin': return d.humanMoves <= o.n;
    case 'noUndo': return !d.usedUndo;
    case 'noHint': return !d.usedHint;
  }
}

/** 連戦ステージ用：全試合の結果をまとめる（勝利は全勝、ヒント等は1回でも使えば使用扱い） */
export function combineSeries(list: PlayDetail[]): PlayDetail {
  return {
    won: list.length > 0 && list.every((d) => d.won),
    margin: Math.min(...list.map((d) => d.margin)),
    humanCorners: Math.min(...list.map((d) => d.humanCorners)),
    humanWorstLead: Math.min(...list.map((d) => d.humanWorstLead)),
    humanMaxFlip: Math.max(...list.map((d) => d.humanMaxFlip)),
    humanTotalFlips: list.reduce((a, d) => a + d.humanTotalFlips, 0),
    humanMoves: Math.max(...list.map((d) => d.humanMoves)),
    opponentDiscs: Math.max(...list.map((d) => d.opponentDiscs)),
    usedUndo: list.some((d) => d.usedUndo),
    usedHint: list.some((d) => d.usedHint),
  };
}

export function evaluateStage(stage: Stage, d: PlayDetail): { cleared: boolean; stars: number; checks: boolean[] } {
  const cleared = stage.clear.every((o) => checkObjective(o, d));
  const s2 = cleared && checkObjective(stage.star2, d);
  const s3 = cleared && checkObjective(stage.star3, d);
  return { cleared, stars: cleared ? 1 + (s2 ? 1 : 0) + (s3 ? 1 : 0) : 0, checks: [cleared, s2, s3] };
}

export const stageUnlocked = (save: SaveData, s: Stage) => s.no === 1 || (save.challenge[STAGES[s.no - 2].id]?.stars ?? 0) > 0;
export const totalStars = (save: SaveData) => Object.values(save.challenge).reduce((a, c) => a + c.stars, 0);

export interface StageOutcome {
  cleared: boolean;
  stars: number;
  prevStars: number;
  checks: boolean[];
  coins: number;
  exp: number;
  pp: number;
  firstClear: boolean;
}

/** ステージの結果を記録して報酬をわたす。初クリアで コイン・経験値、新しく取った星1つにつき 1PP */
export function recordStage(save: SaveData, stageId: string, d: PlayDetail, now: Date): { save: SaveData; outcome: StageOutcome } {
  const stage = STAGE_BY_ID[stageId];
  const ev = evaluateStage(stage, d);
  const prev = save.challenge[stageId] ?? { stars: 0, clears: 0 };
  const firstClear = ev.cleared && prev.clears === 0;
  const newStars = Math.max(0, ev.stars - prev.stars);
  const coins = firstClear ? stage.coins : 0;
  const exp = firstClear ? stage.exp : 0;
  const pp = newStars;
  let next: SaveData = {
    ...save,
    challenge: { ...save.challenge, [stageId]: { stars: Math.max(prev.stars, ev.stars), clears: prev.clears + (ev.cleared ? 1 : 0) } },
    stats: { ...save.stats, challengeClears: save.stats.challengeClears + (ev.cleared ? 1 : 0) },
  };
  next = grant(next, coins, pp, exp).save;
  if (ev.cleared) next = addMissionEvents(next, ['challengeClear'], now);
  return { save: next, outcome: { ...ev, prevStars: prev.stars, coins, exp, pp, firstClear } };
}

// ---------------------------------------------------------------
// パグカップ
// ---------------------------------------------------------------

export const cupUnlocked = (save: SaveData, c: Cup) =>
  save.player.lv >= c.reqLv && (!c.requires || (save.cups[c.requires]?.wins ?? 0) > 0);

export function startCup(save: SaveData, cupId: string, now: Date): { ok: true; save: SaveData } | { ok: false; reason: string } {
  const c = CUP_BY_ID[cupId];
  if (!c) return { ok: false, reason: 'その大会はありません' };
  if (!cupUnlocked(save, c)) return { ok: false, reason: '出場条件をまだ満たしていません' };
  if (save.cupRun && save.cupRun.cupId !== cupId) return { ok: false, reason: `「${CUP_BY_ID[save.cupRun.cupId].name}」の途中です` };
  if (save.cupRun) return { ok: true, save };
  const prev = save.cups[cupId] ?? { wins: 0, tries: 0 };
  const next: SaveData = {
    ...save,
    cups: { ...save.cups, [cupId]: { ...prev, tries: prev.tries + 1 } },
    cupRun: { cupId, round: 0 },
    stats: { ...save.stats, cupEntries: save.stats.cupEntries + 1 },
  };
  return { ok: true, save: addMissionEvents(next, ['cupEntry'], now) };
}

export type CupOutcome =
  | { kind: 'next'; round: number }
  | { kind: 'replay'; round: number }
  | { kind: 'champion'; coins: number; pp: number }
  | { kind: 'eliminated'; round: number };

/** 試合結果を記録。'forfeit' は途中でやめた場合（負け扱い） */
export function recordCupMatch(save: SaveData, result: 'win' | 'lose' | 'draw' | 'forfeit', now: Date): { save: SaveData; outcome: CupOutcome } {
  const run = save.cupRun;
  if (!run) return { save, outcome: { kind: 'eliminated', round: 0 } };
  const cup = CUP_BY_ID[run.cupId];
  if (result === 'draw') return { save, outcome: { kind: 'replay', round: run.round } };
  if (result !== 'win') return { save: { ...save, cupRun: null }, outcome: { kind: 'eliminated', round: run.round } };
  if (run.round + 1 < cup.matches.length) {
    return { save: { ...save, cupRun: { ...run, round: run.round + 1 } }, outcome: { kind: 'next', round: run.round + 1 } };
  }
  const prev = save.cups[cup.id] ?? { wins: 0, tries: 1 };
  let next: SaveData = {
    ...save,
    cupRun: null,
    cups: { ...save.cups, [cup.id]: { ...prev, wins: prev.wins + 1 } },
    stats: { ...save.stats, cupWins: save.stats.cupWins + 1 },
  };
  next = grant(next, cup.coins, cup.pp, 0).save;
  next = addMissionEvents(next, ['cupWin'], now);
  return { save: next, outcome: { kind: 'champion', coins: cup.coins, pp: cup.pp } };
}

export const allCupsWon = (save: SaveData) => CUPS.every((c) => (save.cups[c.id]?.wins ?? 0) > 0);

// ---------------------------------------------------------------
// ミッション
// ---------------------------------------------------------------

export interface MissionState {
  day: string;
  daily: Record<string, number>;
  dailyClaimed: string[];
  dailyBonus: boolean;
  week: string;
  weekly: Record<string, number>;
  weeklyClaimed: string[];
  events: Record<string, { progress: Record<string, number>; claimed: string[] }>;
}

export const newMissions = (): MissionState => ({
  day: '', daily: {}, dailyClaimed: [], dailyBonus: false, week: '', weekly: {}, weeklyClaimed: [], events: {},
});

/** その日を含む週の月曜日（YYYY-MM-DD） */
export function weekOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const diff = (dt.getDay() + 6) % 7; // 月曜=0
  dt.setDate(dt.getDate() - diff);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** 日付・週が変わっていたらミッションをリセットする（日付を戻しても、前の日には戻らない） */
export function rollover(save: SaveData, now: Date): SaveData {
  const day = effectiveDay(save, now);
  let m = save.missions;
  if (day > m.day) m = { ...m, day, daily: {}, dailyClaimed: [], dailyBonus: false };
  const week = weekOf(day);
  if (week > m.week) m = { ...m, week, weekly: {}, weeklyClaimed: [] };
  if (m === save.missions && day === save.lastSeenDay) return save;
  return { ...save, missions: m, lastSeenDay: day };
}

const bump = (rec: Record<string, number>, list: Mission[], events: MissionEvent[]) => {
  const out = { ...rec };
  for (const ms of list) {
    const n = events.filter((e) => e === ms.event).length;
    if (n) out[ms.id] = Math.min(ms.goal, (out[ms.id] ?? 0) + n);
  }
  return out;
};

export function addMissionEvents(save: SaveData, events: MissionEvent[], now: Date): SaveData {
  const s = rollover(save, now);
  const m = s.missions;
  const evs = { ...m.events };
  for (const e of activeEvents(s.lastSeenDay)) {
    const cur = evs[e.id] ?? { progress: {}, claimed: [] };
    evs[e.id] = { ...cur, progress: bump(cur.progress, e.missions, events) };
  }
  return { ...s, missions: { ...m, daily: bump(m.daily, DAILY, events), weekly: bump(m.weekly, WEEKLY, events), events: evs } };
}

export type Scope = 'daily' | 'weekly' | { event: string };

export function missionsOf(scope: Scope): Mission[] {
  if (scope === 'daily') return DAILY;
  if (scope === 'weekly') return WEEKLY;
  return EVENTS.find((e) => e.id === scope.event)?.missions ?? [];
}

export function missionProgress(save: SaveData, scope: Scope, id: string): { n: number; claimed: boolean } {
  const m = save.missions;
  if (scope === 'daily') return { n: m.daily[id] ?? 0, claimed: m.dailyClaimed.includes(id) };
  if (scope === 'weekly') return { n: m.weekly[id] ?? 0, claimed: m.weeklyClaimed.includes(id) };
  const e = m.events[scope.event];
  return { n: e?.progress[id] ?? 0, claimed: e?.claimed.includes(id) ?? false };
}

/** コイン・PP・経験値をわたす（レベルアップすれば PP も） */
export function grant(save: SaveData, coins: number, pp: number, exp: number): { save: SaveData; levelUps: number } {
  const pl = gainPlayerExp(save.player, exp);
  const totalPP = pp + pl.levelUps * LEVELUP_PP;
  return {
    levelUps: pl.levelUps,
    save: {
      ...save,
      player: pl.player,
      wallet: {
        coins: save.wallet.coins + coins,
        pp: save.wallet.pp + totalPP,
        earnedCoins: save.wallet.earnedCoins + coins,
        earnedPP: save.wallet.earnedPP + totalPP,
      },
    },
  };
}

export type ClaimResult = { ok: true; save: SaveData; levelUps: number; coins: number; pp: number } | { ok: false; reason: string };

export function claimMission(save: SaveData, scope: Scope, id: string, now: Date): ClaimResult {
  const s = rollover(save, now);
  const ms = missionsOf(scope).find((x) => x.id === id);
  if (!ms) return { ok: false, reason: 'そのミッションはありません' };
  if (typeof scope === 'object' && !activeEvents(s.lastSeenDay).some((e) => e.id === scope.event)) {
    return { ok: false, reason: 'イベント期間外です' };
  }
  const p = missionProgress(s, scope, id);
  if (p.claimed) return { ok: false, reason: 'もう受け取りました' };
  if (p.n < ms.goal) return { ok: false, reason: 'まだ達成していません' };
  const m = s.missions;
  let missions: MissionState;
  if (scope === 'daily') missions = { ...m, dailyClaimed: [...m.dailyClaimed, id] };
  else if (scope === 'weekly') missions = { ...m, weeklyClaimed: [...m.weeklyClaimed, id] };
  else {
    const e = m.events[scope.event] ?? { progress: {}, claimed: [] };
    missions = { ...m, events: { ...m.events, [scope.event]: { ...e, claimed: [...e.claimed, id] } } };
  }
  const g = grant({ ...s, missions }, ms.coins, ms.pp, ms.exp);
  return { ok: true, save: g.save, levelUps: g.levelUps, coins: ms.coins, pp: ms.pp };
}

export function claimDailyBonus(save: SaveData, now: Date): ClaimResult {
  const s = rollover(save, now);
  if (s.missions.dailyBonus) return { ok: false, reason: 'もう受け取りました' };
  if (!DAILY.every((d) => s.missions.dailyClaimed.includes(d.id))) return { ok: false, reason: 'デイリーミッションを全部受け取ると、もらえます' };
  const g = grant({ ...s, missions: { ...s.missions, dailyBonus: true } }, DAILY_COMPLETE.coins, DAILY_COMPLETE.pp, 0);
  return { ok: true, save: g.save, levelUps: g.levelUps, coins: DAILY_COMPLETE.coins, pp: DAILY_COMPLETE.pp };
}

/** 受け取れるミッションの数（ホームのバッジ用） */
export function claimableCount(save: SaveData, now: Date): number {
  const s = rollover(save, now);
  let n = 0;
  const scopes: Scope[] = ['daily', 'weekly', ...activeEvents(s.lastSeenDay).map((e) => ({ event: e.id }))];
  for (const sc of scopes) for (const ms of missionsOf(sc)) {
    const p = missionProgress(s, sc, ms.id);
    if (!p.claimed && p.n >= ms.goal) n++;
  }
  return n;
}

// ---------------------------------------------------------------
// ログインボーナス
// ---------------------------------------------------------------

export interface LoginState { lastDay: string; streak: number; total: number }
export const newLogin = (): LoginState => ({ lastDay: '', streak: 0, total: 0 });

const prevDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

/** 今日受け取れるか・何日目か */
export function loginStatus(save: SaveData, now: Date): { available: boolean; dayIndex: number; streak: number } {
  const day = effectiveDay(save, now);
  const l = save.login;
  if (l.lastDay >= day) return { available: false, dayIndex: (l.streak - 1 + 7) % 7, streak: l.streak };
  const streak = l.lastDay === prevDay(day) ? l.streak + 1 : 1;
  return { available: true, dayIndex: (streak - 1) % 7, streak };
}

export function claimLogin(save: SaveData, now: Date): ClaimResult {
  const st = loginStatus(save, now);
  if (!st.available) return { ok: false, reason: '今日のログインボーナスは受け取りずみです' };
  const day = effectiveDay(save, now);
  const r = LOGIN_REWARDS[st.dayIndex];
  const g = grant({ ...save, lastSeenDay: day, login: { lastDay: day, streak: st.streak, total: save.login.total + 1 } }, r.coins, r.pp, 0);
  return { ok: true, save: g.save, levelUps: g.levelUps, coins: r.coins, pp: r.pp };
}

/** 対局結果から起きたミッションのできごと */
export function eventsFromGame(r: { mode: '1p' | '2p'; level: string; human: Player; black: number; white: number; humanCorners: number }): MissionEvent[] {
  const ev: MissionEvent[] = ['game'];
  if (r.mode === '2p') return ev;
  ev.push('cpu');
  const mine = r.human === BLACK ? r.black : r.white;
  const theirs = r.human === BLACK ? r.white : r.black;
  if (mine > theirs) { ev.push('win'); if (r.level === 'hard') ev.push('hardWin'); }
  if (r.humanCorners > 0) ev.push('corner');
  return ev;
}
