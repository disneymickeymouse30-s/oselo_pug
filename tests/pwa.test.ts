import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { buildServiceWorker, versionOf } from '../src/pwa/sw-template';
import { makeBackup, parseBackup, rotateAutoBackups, backupFileName, AUTO_MAX, type AutoBackup } from '../src/store/backup';
import { newSave, SAVE_VERSION } from '../src/store/save';
import { recordGame, unlockAll } from '../src/core/progress';
import { BLACK } from '../src/core/othello';

const NOW = new Date('2026-11-10T12:00:00');
const played = () => recordGame(unlockAll(newSave(NOW), NOW).save, {
  mode: '1p', level: 'normal', human: BLACK, black: 40, white: 24, humanCorners: 1, humanWorstLead: 0, endedAt: NOW, durationMs: 60000,
}).save;

describe('PWA の設定ファイル', () => {
  it('マニフェストにホーム画面追加・全画面表示に必要な項目がある', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(m).toMatchObject({ display: 'standalone', start_url: './', scope: './', lang: 'ja' });
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true);
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
    expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
    for (const i of m.icons) expect(existsSync(`public/${i.src}`), i.src).toBe(true);
  });

  it('index.html に マニフェスト・アップルタッチアイコン・iPhone の起動画面がある', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('apple-touch-icon');
    expect(html).toContain('apple-mobile-web-app-capable');
    const splashes = [...html.matchAll(/apple-touch-startup-image" href="\.\/(icons\/[^"]+)"/g)].map((m) => m[1]);
    expect(splashes.length).toBeGreaterThanOrEqual(6);
    for (const s of splashes) expect(existsSync(`public/${s}`), s).toBe(true);
  });
});

describe('Service Worker', () => {
  const sw = buildServiceWorker(['assets/index-abc.js', 'assets/index-abc.css', 'index.html', 'sw.js', 'icons/icon-192.png'], 'v1');

  it('アプリ一式を事前キャッシュし、sw.js 自身は含めない', () => {
    expect(sw).toContain('"./assets/index-abc.js"');
    expect(sw).toContain('"./index.html"');
    expect(sw).toContain('"./"');
    expect(sw).not.toContain('"./sw.js"');
  });

  it('古いキャッシュを消す・更新の切りかえ・オフラインでの画面遷移に対応', () => {
    expect(sw).toContain("caches.delete");
    expect(sw).toContain("SKIP_WAITING");
    expect(sw).toContain("req.mode === 'navigate'");
    expect(() => new Function(sw)).not.toThrow(); // 文法エラーがない
  });

  it('ファイルが変わるとバージョンも変わる（キャッシュが更新される）', () => {
    expect(versionOf(['a.js', 'b.css'])).toBe(versionOf(['b.css', 'a.js']));
    expect(versionOf(['a.js'])).not.toBe(versionOf(['a2.js']));
  });
});

describe('バックアップ・復元', () => {
  it('書き出したファイルを読み込むと、データと設定が元に戻る', () => {
    const save = played();
    const r = parseBackup(makeBackup(save, { sound: false, music: false, showLegal: true, animation: false }, NOW));
    if (!r.ok) throw new Error(r.reason);
    expect(r.save).toEqual(save);
    expect(r.settings).toEqual({ sound: false, music: false, showLegal: true, animation: false });
    expect(r.summary).toMatchObject({ games: 1, lv: save.player.lv, at: NOW.toISOString() });
  });

  it('古いバージョンのバックアップは変換して読み込む', () => {
    const old = JSON.stringify({ app: 'pug-reversi', data: { version: 1, pugs: { normal: { at: 'x', seen: true } }, stats: { wins: 3 } } });
    const r = parseBackup(old);
    expect(r.ok && r.save.version === SAVE_VERSION && r.save.stats.wins === 3).toBe(true);
  });

  it('関係ないファイル・壊れたファイル・新しすぎるデータは読み込まない', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('{"foo":1}').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'pug-reversi', data: { version: SAVE_VERSION + 1 } })).ok).toBe(false);
  });

  it('ファイル名に日付が入る', () => {
    expect(backupFileName(NOW)).toBe('pug-reversi-backup-20261110.json');
  });

  it('自動バックアップは1日1つ・最新3日分', () => {
    const s = played();
    let list: AutoBackup[] = [];
    for (const d of ['2026-11-01', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']) {
      list = rotateAutoBackups(list, s, new Date(`${d}T10:00:00`));
    }
    expect(list.map((b) => b.day)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
    expect(list).toHaveLength(AUTO_MAX);
  });
});

describe('BGM・カーソル・勝利演出（第8段階）', () => {
  it('4曲（ホーム・対局・お庭・大会）があり、メロディとベースの長さがそろっている', async () => {
    const { TRACK_IDS, trackOf } = await import('../src/services/music');
    expect(TRACK_IDS).toEqual(['home', 'game', 'garden', 'cup']);
    for (const id of TRACK_IDS) {
      const t = trackOf(id);
      expect(t.melody.length).toBe(t.bass.length);
      expect(t.bpm).toBeGreaterThan(40);
      for (const n of [...t.melody, ...t.bass]) if (n !== null) expect(n).toBeGreaterThanOrEqual(24);
    }
  });

  it('カーソル・勝利演出は最初から1つ使え、ほかは条件で解放', async () => {
    const { MARKERS, EFFECTS } = await import('../src/data/items');
    expect(MARKERS.filter((m) => m.unlock.t === 'start')).toHaveLength(1);
    expect(EFFECTS.filter((e) => e.unlock.t === 'start')).toHaveLength(1);
    expect(MARKERS.length).toBeGreaterThanOrEqual(4);
    expect(EFFECTS.length).toBeGreaterThanOrEqual(5);
  });

  it('古い着せ替えデータにはカーソル・演出の初期値が入る', async () => {
    const { migrate } = await import('../src/store/save');
    const d = migrate({ version: 5, outfit: { black: {}, white: {}, board: 'grass', bg: 'cream' } });
    expect(d.outfit.marker).toBe('paw');
    expect(d.outfit.effect).toBe('confetti');
  });
});

describe('将来のオンライン拡張', () => {
  it('初期バージョンはオンラインなしで動き、サービス層だけを差しかえられる', async () => {
    const { online, setOnlineService } = await import('../src/services/online');
    expect(online().available).toBe(false);
    expect(await online().ranking('wins')).toEqual([]);
    const fake = { available: true, uploadSave: async () => {}, downloadSave: async () => null, ranking: async () => [{ name: 'a', title: null, wins: 1, rate: 100 }], findMatch: async () => null };
    setOnlineService(fake);
    expect((await online().ranking('wins')).length).toBe(1);
  });
});
