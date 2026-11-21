/**
 * オンライン機能のための独立したサービス層（将来の拡張用）
 *
 * 初期バージョンはローカル保存だけで動くので、ここでは「オンラインなし」の実装だけを用意している。
 * オンライン対戦・フレンド対戦・ランキング・プレイヤー大会・クラウドセーブ・複数端末同期を追加するときは、
 * OnlineService を実装したクラス（例：Firebase 版）を作って setOnlineService() で差しかえる。
 * ゲーム本体（core/ のロジックと画面）はこのインターフェースだけを使うので、基本のゲームには影響しない。
 */
import type { SaveData } from '../store/save';

export interface RankingEntry { name: string; title: string | null; wins: number; rate: number }

export interface OnlineService {
  readonly available: boolean;
  /** クラウドセーブ：保存 */
  uploadSave(save: SaveData): Promise<void>;
  /** クラウドセーブ：読み込み（なければ null） */
  downloadSave(): Promise<SaveData | null>;
  /** オンラインランキング */
  ranking(kind: 'wins' | 'rate'): Promise<RankingEntry[]>;
  /** オンライン対戦の相手さがし（相手の手は onMove で届く） */
  findMatch(onMove: (pos: number) => void): Promise<{ sendMove: (pos: number) => void; leave: () => void } | null>;
}

/** 初期バージョン：オンライン機能なし（すべて「使えない」を返す） */
class LocalOnly implements OnlineService {
  readonly available = false;
  async uploadSave() { /* なし */ }
  async downloadSave() { return null; }
  async ranking() { return []; }
  async findMatch() { return null; }
}

let service: OnlineService = new LocalOnly();
export const online = () => service;
export function setOnlineService(s: OnlineService) { service = s; }
