import { useEffect, useRef, useState } from 'react';
import { SettingRow } from './HomeScreen';
import {
  usePWA, promptInstall, isIOS, applyUpdate, checkForUpdate, clearCachesAndReload, storageInfo, requestPersistentStorage, APP_VERSION,
} from '../services/pwa';
import { makeBackup, parseBackup, backupFileName, loadAutoBackups, summaryOf, type ParsedBackup, type AutoBackup, type BackupSummary } from '../store/backup';
import { wipeAll, SAVE_VERSION, type SaveData } from '../store/save';
import type { Settings } from '../store/settings';
import { totalPugs } from '../store/backup';
import { sfx } from '../services/sound';

type Pending = Extract<ParsedBackup, { ok: true }>;

const fmt = (iso: string) => {
  if (!iso) return '不明';
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function Summary({ s }: { s: BackupSummary }) {
  return (
    <dl className="bk-summary">
      <dt>プレイヤー</dt><dd>{s.name}（Lv.{s.lv}）</dd>
      <dt>パグ</dt><dd>{s.pugs} / {totalPugs} 種類</dd>
      <dt>対局数</dt><dd>{s.games} 局</dd>
      <dt>コイン</dt><dd>{s.coins.toLocaleString()}</dd>
      <dt>保存日時</dt><dd>{fmt(s.at)}</dd>
    </dl>
  );
}

export function SettingsScreen({ save, settings, onSettings, onBack, onRestore }: {
  save: SaveData;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  onBack: () => void;
  onRestore: (s: SaveData, st?: Settings) => void;
}) {
  const pwa = usePWA();
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [autos, setAutos] = useState<AutoBackup[]>([]);
  const [wipeStep, setWipeStep] = useState(0);
  const [storage, setStorage] = useState<{ persisted: boolean; usedKB: number | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadAutoBackups().then(setAutos); void storageInfo().then(setStorage); }, []);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2200); };

  const doExport = async () => {
    const text = makeBackup(save, settings);
    const name = backupFileName();
    const file = new File([text], name, { type: 'application/json' });
    // iPhone などはファイル共有（「ファイル」アプリに保存など）を優先
    try {
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (isIOS() && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'PUG REVERSI バックアップ' });
        flash('バックアップを共有しました');
        return;
      }
    } catch { /* キャンセル・非対応 → ダウンロードへ */ }
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      flash(`${name} を保存しました`);
    } catch {
      setExportText(text);
    }
  };

  const copyExport = async () => {
    const text = makeBackup(save, settings);
    try { await navigator.clipboard.writeText(text); flash('バックアップをコピーしました。メモ帳などに貼り付けて保存してね'); }
    catch { setExportText(text); }
  };

  const tryRestore = (text: string) => {
    const r = parseBackup(text);
    if (!r.ok) { flash(r.reason); sfx.tap(); return; }
    setPending(r);
    setPaste(null);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { flash('ファイルが大きすぎます'); return; }
    tryRestore(await f.text());
    if (fileRef.current) fileRef.current.value = '';
  };

  const iosHelp = isIOS() && !pwa.standalone;

  return (
    <div className="screen settings-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">設定</div>
        <span className="icon-spacer" />
      </header>

      {pwa.updateReady && (
        <div className="update-card">
          <b>✨ 新しいバージョンがあります</b>
          <button className="btn small primary" onClick={applyUpdate}>更新する</button>
        </div>
      )}

      <section className="set-card">
        <h4>サウンド・表示</h4>
        <SettingRow label="BGM（画面ごとの音楽）" on={settings.music} onChange={(v) => onSettings({ music: v })} />
        <SettingRow label="効果音" on={settings.sound} onChange={(v) => onSettings({ sound: v })} />
        <SettingRow label="置ける場所を表示" on={settings.showLegal} onChange={(v) => onSettings({ showLegal: v })} />
        <SettingRow label="アニメーション演出（OFFで軽くなる）" on={settings.animation} onChange={(v) => onSettings({ animation: v })} />
      </section>

      <section className="set-card">
        <h4>データのバックアップ</h4>
        <p className="muted">データはこの端末の中（IndexedDB）に保存されています。機種変更やもしものときのために、ときどきバックアップしてね。</p>
        <div className="set-btns">
          <button className="btn small primary" onClick={() => void doExport()}>💾 ファイルに保存</button>
          <button className="btn small" onClick={() => void copyExport()}>📋 コピー</button>
        </div>
        <h4>復元（データをもとに戻す）</h4>
        <div className="set-btns">
          <button className="btn small" onClick={() => fileRef.current?.click()}>📂 ファイルから復元</button>
          <button className="btn small" onClick={() => setPaste('')}>📝 貼り付けて復元</button>
          <input ref={fileRef} type="file" accept=".json,application/json,text/plain" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        <h4>自動バックアップ <small>1日1回・最新3日分</small></h4>
        {autos.length === 0 ? <p className="muted">まだありません（遊ぶと自動で作られます）</p> : (
          <ul className="auto-list">
            {[...autos].reverse().map((b) => (
              <li key={b.day}>
                <span>{fmt(b.at)}<small>Lv.{b.data.player.lv}・パグ{Object.keys(b.data.pugs).length}種・{b.data.stats.games}局</small></span>
                <button className="btn small" onClick={() => setPending({ ok: true, save: b.data, summary: summaryOf(b.data, b.at) })}>この時点に戻す</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="set-card">
        <h4>アプリ</h4>
        <div className="app-rows">
          <div><span>通信</span><b className={pwa.online ? 'ok' : 'warn'}>{pwa.online ? 'オンライン' : 'オフライン（遊べます）'}</b></div>
          <div><span>オフラインプレイ</span><b className={pwa.offlineReady ? 'ok' : ''}>{pwa.offlineReady ? '準備OK' : pwa.swSupported ? '準備中／ホーム画面に追加すると有効' : 'このブラウザは非対応'}</b></div>
          <div><span>ホーム画面</span><b className={pwa.standalone ? 'ok' : ''}>{pwa.standalone ? 'アプリとして起動中' : '未追加'}</b></div>
          <div><span>保存領域</span><b className={storage?.persisted ? 'ok' : ''}>{storage ? `${storage.persisted ? '保護あり' : '通常'}${storage.usedKB !== null ? `・${storage.usedKB.toLocaleString()}KB` : ''}` : '…'}</b></div>
          <div><span>バージョン</span><b>v{APP_VERSION}（データ形式 v{SAVE_VERSION}）</b></div>
          {pwa.swVersion && <div><span>キャッシュ</span><b>{pwa.swVersion}</b></div>}
        </div>
        {!pwa.standalone && pwa.canInstall && <button className="btn small primary" onClick={() => void promptInstall()}>📲 ホーム画面に追加</button>}
        {iosHelp && (
          <div className="ios-help">
            <b>iPhone でホーム画面に追加する方法</b>
            <ol>
              <li>Safari で開く</li>
              <li>画面下の <span className="share-ico">⬆︎</span>（共有ボタン）をタップ</li>
              <li>「ホーム画面に追加」を選んで「追加」</li>
            </ol>
          </div>
        )}
        <div className="set-btns">
          <button className="btn small" onClick={async () => { const u = await checkForUpdate(); flash(u ? '新しいバージョンがあります！' : '最新のバージョンです'); }}>🔄 更新を確認</button>
          <button className="btn small" onClick={async () => { const ok = await requestPersistentStorage(); setStorage(await storageInfo()); flash(ok ? 'データが消されにくくなりました' : 'このブラウザでは設定できませんでした'); }}>🔒 データを保護</button>
          <button className="btn small ghost" onClick={() => void clearCachesAndReload()}>キャッシュを削除して再読み込み</button>
        </div>
        <p className="muted small">キャッシュを削除してもセーブデータは消えません。表示がおかしいときに使ってね。</p>
      </section>

      <section className="set-card danger">
        <h4>データの初期化</h4>
        <p className="muted">すべてのデータ（パグ・コイン・戦績など）を消して最初からにします。元に戻せません。</p>
        <button className="btn small ghost danger-btn" onClick={() => setWipeStep(1)}>データを初期化する…</button>
      </section>

      {pending && (
        <div className="modal-backdrop" onClick={() => setPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>このデータに戻しますか？</h3>
            <div className="bk-compare">
              <div><small>いまのデータ</small><Summary s={summaryOf(save, new Date().toISOString())} /></div>
              <div><small>復元するデータ</small><Summary s={pending.summary} /></div>
            </div>
            <p className="muted">いまのデータは上書きされます（念のため、先に自動バックアップに保存します）。</p>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => { onRestore(pending.save, pending.settings); setPending(null); sfx.win(); }}>復元する</button>
              <button className="btn" onClick={() => setPending(null)}>やめる</button>
            </div>
          </div>
        </div>
      )}

      {paste !== null && (
        <div className="modal-backdrop" onClick={() => setPaste(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>バックアップを貼り付け</h3>
            <textarea className="paste-area" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{"app":"pug-reversi", …}' />
            <div className="modal-actions">
              <button className="btn primary" disabled={!paste.trim()} onClick={() => tryRestore(paste)}>読み込む</button>
              <button className="btn" onClick={() => setPaste(null)}>やめる</button>
            </div>
          </div>
        </div>
      )}

      {exportText !== null && (
        <div className="modal-backdrop" onClick={() => setExportText(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>バックアップの文字</h3>
            <p className="muted">この画面ではファイル保存ができませんでした。下の文字をすべてコピーして、メモなどに保存してね。</p>
            <textarea className="paste-area" readOnly value={exportText} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn wide" onClick={() => setExportText(null)}>とじる</button>
          </div>
        </div>
      )}

      {wipeStep > 0 && (
        <div className="modal-backdrop" onClick={() => setWipeStep(0)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{wipeStep === 1 ? '本当に初期化しますか？' : '最後の確認です'}</h3>
            <p>{wipeStep === 1 ? 'すべてのパグ・コイン・戦績・お庭が消えます。' : '自動バックアップも消えます。バックアップファイルは保存しましたか？'}</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setWipeStep(0)}>やめる</button>
              <button className="btn ghost danger-btn" onClick={async () => {
                if (wipeStep === 1) { setWipeStep(2); return; }
                await wipeAll();
                window.location.reload();
              }}>{wipeStep === 1 ? '初期化する' : 'すべて消して最初から'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast home-toast" role="status">{toast}</div>}
    </div>
  );
}
