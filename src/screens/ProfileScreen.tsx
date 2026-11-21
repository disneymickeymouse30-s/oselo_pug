import { useState } from 'react';
import { FRAMES, TITLE_BY_ID, FRAME_BY_ID } from '../data/achievements';
import { ownedTitles, ownedFrames, summarize } from '../core/achievements';
import { PUGS, PUG_BY_ID } from '../data/pugs';
import { PugArt } from '../components/PugFace';
import { ExpBar } from '../components/Status';
import { playerExpToNext, PLAYER_MAX_LV } from '../data/growth';
import { sfx } from '../services/sound';
import type { SaveData } from '../store/save';

/** プロフィールカード（ホーム・プロフィール画面で共通） */
export function ProfileCard({ save }: { save: SaveData }) {
  const f = FRAME_BY_ID[save.frame] ?? FRAMES[0];
  const sum = summarize(save);
  const fav = PUG_BY_ID[save.favoritePug] ?? PUGS[0];
  const zukan = Math.floor((Object.keys(save.pugs).length / PUGS.length) * 100);
  const max = save.player.lv >= PLAYER_MAX_LV ? 0 : playerExpToNext(save.player.lv);
  return (
    <section className={`profile-cardx frame-${f.id}`} style={{ background: f.bg, borderColor: f.border, color: f.ink }}>
      <div className="pcx-top">
        <div className="pcx-pug"><PugArt coat={fav.coat} hat={fav.hat} acc={fav.acc} mood="happy" framed /></div>
        <div className="pcx-id">
          <div className="pcx-title">{save.title ? TITLE_BY_ID[save.title].name : '称号なし'}</div>
          <div className="pcx-name">{save.playerName}</div>
          <div className="pcx-lv"><span className="lv-badge">Lv.{save.player.lv}</span><ExpBar cur={save.player.exp} max={max} /></div>
          <div className="pcx-fav">パートナー：{fav.name}</div>
        </div>
      </div>
      <dl className="pcx-stats">
        <div><dt>総対局数</dt><dd>{sum.games}</dd></div>
        <div><dt>勝利数</dt><dd>{sum.wins}</dd></div>
        <div><dt>勝率</dt><dd>{sum.winRate}%</dd></div>
        <div><dt>最高連勝</dt><dd>{sum.bestStreak}</dd></div>
        <div><dt>図鑑完成率</dt><dd>{zukan}%</dd></div>
        <div><dt>大会優勝</dt><dd>{sum.cupWins}回</dd></div>
      </dl>
    </section>
  );
}

export function ProfileScreen({ save, onBack, onChange }: { save: SaveData; onBack: () => void; onChange: (s: SaveData) => void }) {
  const [name, setName] = useState(save.playerName);
  const titles = ownedTitles(save);
  const frames = ownedFrames(save);
  const commitName = () => onChange({ ...save, playerName: name.trim().slice(0, 12) || 'パグマスター' });
  return (
    <div className="screen profile-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={() => { commitName(); onBack(); }} aria-label="もどる">‹</button>
        <div className="topbar-title">プロフィール</div>
        <span className="icon-spacer" />
      </header>
      <ProfileCard save={save} />
      <label className="setting-row panel-row">
        <span>プレイヤー名</span>
        <input className="name-input" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
      </label>
      <h4 className="section-title">称号（{titles.length}）</h4>
      <div className="title-grid">
        <button className={`title-pick ${save.title === null ? 'on' : ''}`} onClick={() => onChange({ ...save, title: null })}>なし</button>
        {titles.map((t) => (
          <button key={t.id} className={`title-pick ${save.title === t.id ? 'on' : ''}`} onClick={() => { sfx.tap(); onChange({ ...save, title: t.id }); }}>{t.name}</button>
        ))}
      </div>
      {titles.length === 0 && <p className="muted">実績を解除すると称号が手に入ります。</p>}
      <h4 className="section-title">カードのデザイン</h4>
      <div className="frame-grid">
        {FRAMES.map((f) => {
          const have = frames.some((x) => x.id === f.id);
          return (
            <button key={f.id} className={`frame-pick ${save.frame === f.id ? 'on' : ''} ${have ? '' : 'locked'}`}
              onClick={() => { if (!have) return; sfx.tap(); onChange({ ...save, frame: f.id }); }}>
              <span className="frame-swatch" style={{ background: f.bg, borderColor: f.border }} />
              <small>{have ? f.name : '🔒 実績で解放'}</small>
            </button>
          );
        })}
      </div>
      <p className="muted center">パートナーのパグは「パグ育成」で変えられます。</p>
    </div>
  );
}
