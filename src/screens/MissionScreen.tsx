import { useState } from 'react';
import { DAILY, WEEKLY, DAILY_COMPLETE, activeEvents, type Mission } from '../data/missions';
import { missionProgress, claimMission, claimDailyBonus, rollover, type Scope, type ClaimResult } from '../core/modes';
import { Coins, PP } from '../components/Status';
import { LevelUpModal } from '../components/LevelUpModal';
import { sfx } from '../services/sound';
import type { SaveData } from '../store/save';

export function MissionScreen({ save, onBack, onChange }: { save: SaveData; onBack: () => void; onChange: (s: SaveData) => void }) {
  const now = new Date();
  const s = rollover(save, now);
  const events = activeEvents(s.lastSeenDay);
  const [tab, setTab] = useState<'daily' | 'weekly' | string>('daily');
  const [toast, setToast] = useState<string | null>(null);
  const [lu, setLu] = useState<{ from: number; to: number } | null>(null);

  const done = (r: ClaimResult) => {
    if (!r.ok) { setToast(r.reason); sfx.tap(); }
    else {
      sfx.win();
      if (r.levelUps) setLu({ from: s.player.lv, to: r.save.player.lv });
      onChange(r.save);
      setToast(`コイン+${r.coins}${r.pp ? `・PP+${r.pp}` : ''} を受け取った！`);
    }
    window.setTimeout(() => setToast(null), 1600);
  };

  const scope: Scope = tab === 'daily' || tab === 'weekly' ? tab : { event: tab };
  const list: Mission[] = tab === 'daily' ? DAILY : tab === 'weekly' ? WEEKLY : events.find((e) => e.id === tab)?.missions ?? [];
  const ev = events.find((e) => e.id === tab);
  const allDaily = DAILY.every((d) => s.missions.dailyClaimed.includes(d.id));

  return (
    <div className="screen mission-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">ミッション</div>
        <span className="icon-spacer" />
      </header>
      <div className="tabs">
        <button className={tab === 'daily' ? 'on' : ''} onClick={() => setTab('daily')}>デイリー</button>
        <button className={tab === 'weekly' ? 'on' : ''} onClick={() => setTab('weekly')}>ウィークリー</button>
        {events.map((e) => <button key={e.id} className={tab === e.id ? 'on' : ''} onClick={() => setTab(e.id)}>{e.icon} イベント</button>)}
      </div>
      <p className="muted center">
        {tab === 'daily' ? '毎日0時にリセット' : tab === 'weekly' ? '毎週月曜日にリセット' : ev ? `${ev.name}（${ev.from.slice(5).replace('-', '/')}〜${ev.to.slice(5).replace('-', '/')}）` : ''}
      </p>
      {ev && <div className="event-banner" style={{ ['--ec' as string]: ev.color }}><b>{ev.icon} {ev.name}</b><small>{ev.desc}</small></div>}

      <section className="mission-list">
        {list.map((m) => {
          const p = missionProgress(s, scope, m.id);
          const ready = p.n >= m.goal && !p.claimed;
          return (
            <div key={m.id} className={`mission ${p.claimed ? 'claimed' : ready ? 'ready' : ''}`}>
              <div className="ms-main">
                <b>{m.label}</b>
                <div className="meter small-meter"><i style={{ width: `${(Math.min(p.n, m.goal) / m.goal) * 100}%` }} /></div>
                <small>{Math.min(p.n, m.goal)} / {m.goal} ・ <Coins n={m.coins} />{m.pp > 0 && <> <PP n={m.pp} /></>} ・ {m.exp}EXP</small>
              </div>
              <button className="btn small primary" disabled={!ready} onClick={() => done(claimMission(save, scope, m.id, new Date()))}>
                {p.claimed ? '受け取りずみ' : ready ? '受け取る' : 'まだ'}
              </button>
            </div>
          );
        })}
        {tab === 'daily' && (
          <div className={`mission bonus ${s.missions.dailyBonus ? 'claimed' : allDaily ? 'ready' : ''}`}>
            <div className="ms-main"><b>🎁 デイリーをぜんぶ受け取る</b><small>ボーナス <Coins n={DAILY_COMPLETE.coins} /> <PP n={DAILY_COMPLETE.pp} /></small></div>
            <button className="btn small primary" disabled={!allDaily || s.missions.dailyBonus} onClick={() => done(claimDailyBonus(save, new Date()))}>
              {s.missions.dailyBonus ? '受け取りずみ' : '受け取る'}
            </button>
          </div>
        )}
      </section>
      {toast && <div className="toast home-toast" role="status">{toast}</div>}
      {lu && <LevelUpModal info={{ kind: 'player', ...lu }} onClose={() => setLu(null)} />}
    </div>
  );
}
