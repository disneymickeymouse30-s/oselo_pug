/**
 * バックアップと復元
 * - 手動：JSON ファイルに書き出し／ファイル・貼り付けから読み込み（設定も一緒に保存）
 * - 自動：1日1回、端末の中（IndexedDB）に最大3日分を保存。データが壊れたときに戻せる
 */
import { migrate, idbGet, idbSet, dayKey, SAVE_VERSION, type SaveData } from './save';
import type { Settings } from './settings';
import { PUGS } from '../data/pugs';

export interface BackupFile {
  app: 'pug-reversi';
  kind: 'backup';
  saveVersion: number;
  exportedAt: string;
  data: SaveData;
  settings?: Settings;
}

export interface BackupSummary {
  name: string;
  lv: number;
  pugs: number;
  games: number;
  coins: number;
  at: string;
}

export function summaryOf(s: SaveData, at: string): BackupSummary {
  return { name: s.playerName, lv: s.player.lv, pugs: Object.keys(s.pugs).length, games: s.stats.games, coins: s.wallet.coins, at };
}

export function makeBackup(save: SaveData, settings: Settings | undefined, now = new Date()): string {
  const file: BackupFile = { app: 'pug-reversi', kind: 'backup', saveVersion: SAVE_VERSION, exportedAt: now.toISOString(), data: save, settings };
  return JSON.stringify(file);
}

export type ParsedBackup = { ok: true; save: SaveData; settings?: Settings; summary: BackupSummary } | { ok: false; reason: string };

/** バックアップを読み込む。古いバージョンのデータは自動で変換（マイグレーション）する */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try { raw = JSON.parse(text.trim()); } catch { return { ok: false, reason: 'ファイルの形式が正しくありません（JSON ではありません）' }; }
  const f = raw as Partial<BackupFile>;
  if (!f || f.app !== 'pug-reversi' || !f.data) return { ok: false, reason: 'PUG REVERSI のバックアップファイルではありません' };
  try {
    const save = migrate(f.data);
    const st = f.settings && typeof f.settings === 'object'
      ? { sound: Boolean(f.settings.sound), music: f.settings.music !== false, showLegal: Boolean(f.settings.showLegal), animation: Boolean(f.settings.animation) }
      : undefined;
    return { ok: true, save, settings: st, summary: summaryOf(save, typeof f.exportedAt === 'string' ? f.exportedAt : '') };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : '読み込めませんでした' };
  }
}

export const backupFileName = (now = new Date()) => `pug-reversi-backup-${dayKey(now).replace(/-/g, '')}.json`;

// ---------------- 自動バックアップ ----------------

export interface AutoBackup { day: string; at: string; data: SaveData }
export const AUTO_MAX = 3;

/** その日の分を追加（同じ日なら最新に置きかえ）、古いものは3日分まで */
export function rotateAutoBackups(list: AutoBackup[], save: SaveData, now: Date): AutoBackup[] {
  const day = dayKey(now);
  const entry: AutoBackup = { day, at: now.toISOString(), data: save };
  const rest = list.filter((b) => b.day !== day);
  return [...rest, entry].sort((a, b) => a.day.localeCompare(b.day)).slice(-AUTO_MAX);
}

export async function loadAutoBackups(): Promise<AutoBackup[]> {
  try {
    const v = await idbGet('autoBackups');
    return Array.isArray(v) ? (v as AutoBackup[]).filter((b) => b && typeof b.day === 'string' && b.data) : [];
  } catch { return []; }
}

export async function autoBackup(save: SaveData, now = new Date()): Promise<void> {
  // 何も遊んでいない新しいデータは保存しない
  if (save.stats.games === 0 && Object.keys(save.pugs).length <= 2) return;
  try {
    const list = await loadAutoBackups();
    await idbSet(rotateAutoBackups(list, save, now), 'autoBackups');
  } catch { /* 保存できない環境 */ }
}

export const totalPugs = PUGS.length;
