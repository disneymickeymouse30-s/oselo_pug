import { useState } from 'react';
import { BLACK, WHITE, type Player } from '../core/othello';
import type { Difficulty } from '../core/ai';
import { PugFace, PugArt } from '../components/PugFace';
import { PUGS, PUG_BY_ID, RARITY_INFO } from '../data/pugs';
import type { SaveData } from '../store/save';
import { StatusBar } from '../components/Status';
import { usePWA, promptInstall, isIOS } from '../services/pwa';
import { DAILY, activeEvents } from '../data/missions';
import { claimableCount, rollover } from '../core/modes';
import { sfx } from '../services/sound';
import type { GameConfig } from './GameScreen';

// 今後の段階で解放されるメニュー（第1段階ではロック表示）
export type HomeNav = 'zukan' | 'dress' | 'ikusei' | 'garden' | 'challenge' | 'cup' | 'missions' | 'achievements' | 'stats' | 'profile' | 'settings';
type MenuItem = { icon: string; label: string; stage: number; to?: HomeNav };
const MENU: MenuItem[] = [
  { icon: '📖', label: 'パグ図鑑', stage: 2, to: 'zukan' },
  { icon: '👒', label: '着せ替え', stage: 2, to: 'dress' },
  { icon: '🦴', label: 'パグ育成', stage: 3, to: 'ikusei' },
  { icon: '🏡', label: 'お庭', stage: 4, to: 'garden' },
  { icon: '🏆', label: 'チャレンジ', stage: 5, to: 'challenge' },
  { icon: '🎖️', label: 'パグカップ', stage: 5, to: 'cup' },
  { icon: '🏅', label: '実績・称号', stage: 6, to: 'achievements' },
  { icon: '📊', label: '戦績', stage: 6, to: 'stats' },
];

const LEVELS: { id: Difficulty; label: string; desc: string; pug: 'happy' | 'normal' | 'surprised' }[] = [
  { id: 'easy', label: 'EASY', desc: 'のんびりパグ', pug: 'happy' },
  { id: 'normal', label: 'NORMAL', desc: 'かしこいパグ', pug: 'normal' },
  { id: 'hard', label: 'HARD', desc: '最強パグ', pug: 'surprised' },
];

export function HomeScreen({ onStart, lastConfig, save, onNav }: {
  onStart: (c: GameConfig) => void;
  lastConfig: GameConfig;
  save: SaveData;
  onNav: (to: HomeNav) => void;
}) {
  const fav = PUG_BY_ID[save.favoritePug] ?? PUGS[0];
  const pugCount = Object.keys(save.pugs).length;
  const newPugs = Object.values(save.pugs).some((o) => !o.seen);
  const newItems = [...Object.values(save.boards), ...Object.values(save.bgs)].some((o) => !o.seen);
  const now = new Date();
  const rs = rollover(save, now);
  const events = activeEvents(rs.lastSeenDay);
  const dailyDone = DAILY.filter((d) => (rs.missions.daily[d.id] ?? 0) >= d.goal).length;
  const claimable = claimableCount(save, now);
  const [sheet, setSheet] = useState<null | 'solo'>(null);
  const pwa = usePWA();
  const [hideInstall, setHideInstall] = useState(() => { try { return localStorage.getItem('pug-reversi:hide-install') === '1'; } catch { return false; } });
  const [level, setLevel] = useState<Difficulty>(lastConfig.level);
  const [color, setColor] = useState<Player | 'random'>(lastConfig.human);
  const [notice, setNotice] = useState<string | null>(null);

  const startSolo = () => {
    const human = color === 'random' ? (Math.random() < 0.5 ? BLACK : WHITE) : color;
    sfx.bark();
    onStart({ mode: '1p', level, human });
  };

  const locked = (stage: number) => {
    sfx.tap();
    setNotice(`第${stage}段階で追加予定です`);
    window.setTimeout(() => setNotice(null), 1400);
  };

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div className="logo">
          <div className="logo-en">PUG REVERSI</div>
          <div className="logo-ja">パグパグ オセロ大作戦！</div>
        </div>
        <div className="home-head-right">
          {!pwa.online && <span className="offline-chip">オフライン</span>}
          <button className="icon-btn" onClick={() => { sfx.tap(); onNav('settings'); }} aria-label="設定">⚙︎</button>
        </div>
      </header>

      <StatusBar save={save} onName={() => { sfx.tap(); onNav('profile'); }} />

      {!pwa.standalone && !hideInstall && (pwa.canInstall || isIOS()) && (
        <div className="install-card">
          <span className="ic-ico">📲</span>
          <span className="ic-body"><b>ホーム画面に追加しよう</b><small>アプリのように全画面で、オフラインでも遊べます</small></span>
          <button className="btn small primary" onClick={() => { sfx.tap(); if (pwa.canInstall) void promptInstall(); else onNav('settings'); }}>{pwa.canInstall ? '追加' : 'やり方'}</button>
          <button className="ic-close" aria-label="とじる" onClick={() => { setHideInstall(true); try { localStorage.setItem('pug-reversi:hide-install', '1'); } catch { /* なし */ } }}>×</button>
        </div>
      )}

      <section className="hero">
        <div className="hero-mini left"><PugFace variant="black" mood="happy" hat={save.outfit.black.hat} acc={save.outfit.black.acc} /></div>
        <button className="hero-fav" onClick={() => { sfx.bark(); onNav('ikusei'); }} aria-label={`パートナー：${fav.name}（育成へ）`}>
          <PugArt coat={fav.coat} hat={fav.hat} acc={fav.acc} mood="happy" framed />
        </button>
        <div className="hero-mini right"><PugFace variant="white" mood="happy" hat={save.outfit.white.hat} acc={save.outfit.white.acc} /></div>
        <div className="hero-plate">
          <span className="rarity-dot" style={{ background: RARITY_INFO[fav.rarity].color }}>{fav.rarity}</span>
          {fav.name}
          <span className="hero-count">図鑑 {pugCount}/{PUGS.length}</span>
        </div>
        <p className="catch">遊んで、集めて、育てて、<br />世界一のパグマスターへ！</p>
      </section>

      {events.map((e) => (
        <button key={e.id} className="event-banner" style={{ ['--ec' as string]: e.color }} onClick={() => { sfx.tap(); onNav('missions'); }}>
          <b>{e.icon} {e.name}</b><small>{e.desc}（〜{e.to.slice(5).replace('-', '/')}）</small>
        </button>
      ))}

      <button className="mission-card" onClick={() => { sfx.tap(); onNav('missions'); }}>
        <span className="mc-ico">📋</span>
        <span className="mc-body"><b>今日のミッション</b><small>{dailyDone} / {DAILY.length} 達成{save.cupRun ? '・大会が進行中' : ''}</small></span>
        {claimable > 0 && <span className="mc-badge">{claimable}つ受け取れる！</span>}
      </button>

      <section className="main-buttons">
        <button className="big-btn solo" onClick={() => { sfx.tap(); setSheet('solo'); }}>
          <span className="big-ico">🐾</span>
          <span><b>ひとりであそぶ</b><small>CPUと対戦</small></span>
        </button>
        <button className="big-btn duo" onClick={() => { sfx.bark(); onStart({ mode: '2p', level, human: BLACK }); }}>
          <span className="big-ico">🐶</span>
          <span><b>ふたりであそぶ</b><small>1台でかわりばんこ</small></span>
        </button>
      </section>

      <section className="menu-grid">
        {MENU.map((m) => (
          m.to ? (
            <button key={m.label} className="menu-tile" onClick={() => { sfx.tap(); onNav(m.to!); }}>
              <span className="tile-ico">{m.icon}</span>
              <span className="tile-label">{m.label}</span>
              {((m.to === 'zukan' && newPugs) || (m.to === 'dress' && newItems) || (m.to === 'cup' && save.cupRun)
                || (m.to === 'achievements' && Object.values(save.achievements).some((a) => !a.claimed))) && <span className="new-dot" />}
            </button>
          ) : (
            <button key={m.label} className="menu-tile locked" onClick={() => locked(m.stage)}>
              <span className="tile-ico">{m.icon}</span>
              <span className="tile-label">{m.label}</span>
              <span className="tile-lock">🔒</span>
            </button>
          )
        ))}
      </section>

      {notice && <div className="toast home-toast" role="status">{notice}</div>}

      {sheet === 'solo' && (
        <div className="modal-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <h3>CPUの強さ</h3>
            <div className="level-row">
              {LEVELS.map((l) => (
                <button key={l.id} className={`level-card ${level === l.id ? 'on' : ''} lv-${l.id}`} onClick={() => { sfx.tap(); setLevel(l.id); }}>
                  <span className="level-pug"><PugFace variant="white" mood={l.pug} /></span>
                  <b>{l.label}</b>
                  <small>{l.desc}</small>
                </button>
              ))}
            </div>
            <h3>あなたの駒</h3>
            <div className="seg">
              <button className={color === BLACK ? 'on' : ''} onClick={() => setColor(BLACK)}>黒パグ<small>先手</small></button>
              <button className={color === WHITE ? 'on' : ''} onClick={() => setColor(WHITE)}>白パグ<small>後手</small></button>
              <button className={color === 'random' ? 'on' : ''} onClick={() => setColor('random')}>おまかせ</button>
            </div>
            <button className="btn primary wide" onClick={startSolo}>対局スタート！</button>
          </div>
        </div>
      )}

    </div>
  );
}

export function SettingRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input type="checkbox" className="toggle" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
