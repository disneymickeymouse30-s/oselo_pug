/**
 * 実績の判定・受け取り、戦績の集計（React 非依存）
 */
import { ACHIEVEMENTS, ACH_BY_ID, TITLES, FRAMES, type Metric } from '../data/achievements';
import { PUGS } from '../data/pugs';
import { STAGES } from '../data/challenges';
import { CUPS } from '../data/cups';
import { FURNITURE } from '../data/garden';
import { ownedHats, ownedAccs } from '../data/items';
import { PUG_MAX_LV, LOVE_MAX } from '../data/growth';
import { grant } from './modes';
import type { SaveData } from '../store/save';
import type { Difficulty } from './ai';

export function metricValue(s: SaveData, m: Metric): number {
  const st = s.stats;
  const owned = new Set(Object.keys(s.pugs));
  const growth = Object.values(s.growth);
  switch (m) {
    case 'games': return st.games;
    case 'wins': return st.wins;
    case 'winsEasy': return st.winsByLevel.easy;
    case 'winsNormal': return st.winsByLevel.normal + st.winsByLevel.hard;
    case 'winsHard': return st.winsByLevel.hard;
    case 'bestStreak': return st.bestStreak;
    case 'perfects': return st.perfects;
    case 'corners4': return st.corners4Wins;
    case 'comebacks': return st.comebacks;
    case 'winsWhite': return st.winsAsWhite;
    case 'duo': return st.duoGames;
    case 'draws': return st.draws;
    case 'night': return st.playedAtNight ? 1 : 0;
    case 'monthsPlayed': return st.months.length;
    case 'zukanPct': return Math.floor((owned.size / PUGS.length) * 100);
    case 'legendPugs': return PUGS.filter((p) => p.rarity === 'LEGEND' && owned.has(p.id)).length;
    case 'hats': return ownedHats(owned).size;
    case 'accs': return ownedAccs(owned).size;
    case 'boards': return Object.keys(s.boards).length;
    case 'bgs': return Object.keys(s.bgs).length;
    case 'playerLv': return s.player.lv;
    case 'maxPugLv': return Math.max(1, ...growth.map((g) => g.lv));
    case 'masterPugs': return growth.filter((g) => g.lv >= PUG_MAX_LV).length;
    case 'lovedPugs': return growth.filter((g) => g.love >= LOVE_MAX).length;
    case 'pets': return st.pets;
    case 'stagesCleared': return STAGES.filter((x) => (s.challenge[x.id]?.stars ?? 0) > 0).length;
    case 'stars': return Object.values(s.challenge).reduce((a, c) => a + c.stars, 0);
    case 'cupWins': return st.cupWins;
    case 'cupsWon': return CUPS.filter((c) => (s.cups[c.id]?.wins ?? 0) > 0).length;
    case 'gardenSize': return s.garden.size;
    case 'gardenPlaced': return s.garden.items.length;
    case 'furnitureKinds': return FURNITURE.filter((f) => (s.garden.owned[f.id] ?? 0) > 0).length;
    case 'loginDays': return s.login.total;
    case 'earnedCoins': return s.wallet.earnedCoins;
    case 'earnedPP': return s.wallet.earnedPP;
    case 'achievements': return Object.keys(s.achievements).length;
  }
}

/** 目標に届いた実績を解除する（実績数の実績のため、変化がなくなるまで繰り返す） */
export function checkAchievements(save: SaveData, now: Date): { save: SaveData; newly: string[] } {
  let s = save;
  const newly: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      if (metricValue(s, a.metric) >= a.goal) {
        s = { ...s, achievements: { ...s.achievements, [a.id]: { at: now.toISOString(), claimed: false } } };
        newly.push(a.id);
        changed = true;
      }
    }
  }
  return { save: s, newly };
}

export type AchClaim = { ok: true; save: SaveData; coins: number; pp: number; levelUps: number } | { ok: false; reason: string };

export function claimAchievement(save: SaveData, id: string): AchClaim {
  const a = ACH_BY_ID[id];
  const rec = save.achievements[id];
  if (!a || !rec) return { ok: false, reason: 'まだ解除していません' };
  if (rec.claimed) return { ok: false, reason: 'もう受け取りました' };
  const g = grant({ ...save, achievements: { ...save.achievements, [id]: { ...rec, claimed: true } } }, a.coins, a.pp, 0);
  return { ok: true, save: g.save, coins: a.coins, pp: a.pp, levelUps: g.levelUps };
}

/** 受け取れる実績報酬を全部受け取る */
export function claimAllAchievements(save: SaveData): { save: SaveData; coins: number; pp: number; count: number } {
  let s = save;
  let coins = 0;
  let pp = 0;
  let count = 0;
  for (const id of Object.keys(save.achievements)) {
    const r = claimAchievement(s, id);
    if (r.ok) { s = r.save; coins += r.coins; pp += r.pp; count++; }
  }
  return { save: s, coins, pp, count };
}

export const ownedTitles = (s: SaveData) =>
  TITLES.filter((t) => ACHIEVEMENTS.some((a) => a.title === t.id && s.achievements[a.id]));
export const ownedFrames = (s: SaveData) =>
  FRAMES.filter((f) => f.id === 'basic' || ACHIEVEMENTS.some((a) => a.frame === f.id && s.achievements[a.id]));

// ---------------------------------------------------------------
// 戦績
// ---------------------------------------------------------------

export interface GameLog {
  /** 終了日時 */
  t: string;
  m: '1p' | '2p';
  l: Difficulty;
  /** w=勝ち l=負け d=引き分け（2人対戦は黒から見た結果） */
  r: 'w' | 'l' | 'd';
  my: number;
  op: number;
  /** 対局時間（秒） */
  sec: number;
}
export const HISTORY_MAX = 300;

export interface StatsSummary {
  games: number; wins: number; losses: number; draws: number;
  /** CPU 戦の勝率（%） */
  winRate: number;
  byLevel: { level: Difficulty; games: number; wins: number; rate: number }[];
  bestStreak: number;
  avgSec: number;
  avgDiscs: number;
  challengeClears: number;
  stagesCleared: number;
  cupWins: number;
  earnedCoins: number;
  earnedPP: number;
}

export function summarize(s: SaveData): StatsSummary {
  const st = s.stats;
  const cpuGames = st.wins + st.losses + Math.max(0, st.draws - 0);
  const decided = st.wins + st.losses;
  const byLevel = (['easy', 'normal', 'hard'] as Difficulty[]).map((level) => {
    // 第5段階より前の対局は難易度別の対局数が残っていないため、勝利数を下限にする
    const games = Math.max(st.gamesByLevel[level], st.winsByLevel[level]);
    return { level, games, wins: st.winsByLevel[level], rate: games ? Math.round((st.winsByLevel[level] / games) * 100) : 0 };
  });
  return {
    games: st.games, wins: st.wins, losses: st.losses, draws: st.draws,
    winRate: decided ? Math.round((st.wins / Math.max(1, cpuGames)) * 100) : 0,
    byLevel,
    bestStreak: st.bestStreak,
    avgSec: st.timedGames ? Math.round(st.totalDurationMs / st.timedGames / 1000) : 0,
    avgDiscs: st.discGames ? Math.round((st.totalMyDiscs / st.discGames) * 10) / 10 : 0,
    challengeClears: st.challengeClears,
    stagesCleared: metricValue(s, 'stagesCleared'),
    cupWins: st.cupWins,
    earnedCoins: s.wallet.earnedCoins,
    earnedPP: s.wallet.earnedPP,
  };
}

/** 直近の CPU 戦の勝率の推移（window 局ごとの移動平均、%） */
export function winRateTrend(history: GameLog[], window = 10): { i: number; rate: number; t: string }[] {
  const cpu = history.filter((g) => g.m === '1p');
  const out: { i: number; rate: number; t: string }[] = [];
  for (let i = 0; i < cpu.length; i++) {
    const from = Math.max(0, i - window + 1);
    const slice = cpu.slice(from, i + 1);
    out.push({ i: i + 1, rate: Math.round((slice.filter((g) => g.r === 'w').length / slice.length) * 100), t: cpu[i].t });
  }
  return out;
}
