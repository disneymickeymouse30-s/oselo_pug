import { useState } from 'react';
import { ACHIEVEMENTS, CATEGORIES, TITLE_BY_ID, FRAME_BY_ID, type AchCategory } from '../data/achievements';
import { metricValue, claimAchievement, claimAllAchievements } from '../core/achievements';
import { Coins, PP } from '../components/Status';
import { sfx } from '../services/sound';
import type { SaveData } from '../store/save';

const fmt = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };

export function AchievementScreen({ save, onBack, onChange, onProfile }: {
  save: SaveData; onBack: () => void; onChange: (s: SaveData) => void; onProfile: () => void;
}) {
  const [cat, setCat] = useState<AchCategory>('battle');
  const [toast, setToast] = useState<string | null>(null);
  const done = Object.keys(save.achievements).length;
  const claimable = Object.values(save.achievements).filter((a) => !a.claimed).length;
  const list = ACHIEVEMENTS.filter((a) => a.category === cat);
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1600); };

  return (
    <div className="screen ach-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">実績・称号</div>
        <span className="icon-spacer" />
      </header>
      <section className="complete-card">
        <div className="complete-num"><b>{done}</b> / {ACHIEVEMENTS.length}</div>
        <div className="meter"><i style={{ width: `${(done / ACHIEVEMENTS.length) * 100}%` }} /></div>
        <div className="complete-pct">{Math.floor((done / ACHIEVEMENTS.length) * 100)}%</div>
      </section>
      <div className="ach-actions">
        <button className="btn small primary" disabled={!claimable} onClick={() => {
          const r = claimAllAchievements(save);
          sfx.win(); onChange(r.save); flash(`${r.count}件の報酬を受け取った！ コイン+${r.coins}${r.pp ? `・PP+${r.pp}` : ''}`);
        }}>まとめて受け取る{claimable ? `（${claimable}）` : ''}</button>
        <button className="btn small" onClick={onProfile}>🎖 称号・プロフィールを変える</button>
      </div>
      <div className="chips">
        {CATEGORIES.map((c) => {
          const total = ACHIEVEMENTS.filter((a) => a.category === c.id);
          const got = total.filter((a) => save.achievements[a.id]).length;
          return (
            <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => { sfx.tap(); setCat(c.id); }}>
              {c.icon} {c.name}<small>{got}/{total.length}</small>
            </button>
          );
        })}
      </div>
      <section className="ach-list">
        {list.map((a) => {
          const rec = save.achievements[a.id];
          const v = Math.min(metricValue(save, a.metric), a.goal);
          return (
            <div key={a.id} className={`ach ${rec ? (rec.claimed ? 'claimed' : 'ready') : ''}`}>
              <span className="ach-medal">{rec ? '🏅' : '🔒'}</span>
              <div className="ach-main">
                <b>{a.name}</b>
                <small>{a.desc}</small>
                {!rec && <div className="meter small-meter"><i style={{ width: `${(v / a.goal) * 100}%` }} /></div>}
                <div className="ach-reward">
                  {!rec && <span className="muted">{v.toLocaleString()} / {a.goal.toLocaleString()}</span>}
                  {rec && <span className="muted">{fmt(rec.at)} 解除</span>}
                  <Coins n={a.coins} />{a.pp > 0 && <PP n={a.pp} />}
                  {a.title && <span className="title-chip">称号「{TITLE_BY_ID[a.title].name}」</span>}
                  {a.frame && <span className="title-chip frame">フレーム「{FRAME_BY_ID[a.frame].name}」</span>}
                </div>
              </div>
              {rec && !rec.claimed && (
                <button className="btn small primary" onClick={() => {
                  const r = claimAchievement(save, a.id);
                  if (!r.ok) { flash(r.reason); return; }
                  sfx.win(); onChange(r.save); flash(`コイン+${r.coins}${r.pp ? `・PP+${r.pp}` : ''}`);
                }}>受け取る</button>
              )}
            </div>
          );
        })}
      </section>
      {toast && <div className="toast home-toast" role="status">{toast}</div>}
    </div>
  );
}
