import { useState } from 'react';
import { CUPS, CUP_BY_ID, ROUND_NAMES, humanColorFor, type Cup } from '../data/cups';
import { cupUnlocked } from '../core/modes';
import { PUG_BY_ID } from '../data/pugs';
import { PugArt, PugFace } from '../components/PugFace';
import { Coins, PP } from '../components/Status';
import { BLACK } from '../core/othello';
import { sfx } from '../services/sound';
import type { SaveData } from '../store/save';

const LV: Record<string, string> = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

export function CupScreen({ save, onBack, onEnter, onPlayRound }: {
  save: SaveData;
  onBack: () => void;
  /** 大会に出場する（失敗理由を返す） */
  onEnter: (cupId: string) => string | null;
  onPlayRound: () => void;
}) {
  const [open, setOpen] = useState<Cup | null>(save.cupRun ? CUP_BY_ID[save.cupRun.cupId] : null);
  const [msg, setMsg] = useState<string | null>(null);
  const run = save.cupRun;

  return (
    <div className="screen cup-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">パグカップ</div>
        <span className="icon-spacer" />
      </header>

      {!open && (
        <section className="cup-list">
          {CUPS.map((c) => {
            const ok = cupUnlocked(save, c);
            const rec = save.cups[c.id];
            return (
              <button key={c.id} className={`cup-card ${ok ? '' : 'locked'} ${rec?.wins ? 'won' : ''}`} onClick={() => { if (!ok) return; sfx.tap(); setMsg(null); setOpen(c); }}>
                <span className="cup-trophy">{rec?.wins ? '🏆' : ok ? '🎖️' : '🔒'}</span>
                <span className="cup-body">
                  <b>{c.name}</b>
                  <small>{ok ? `${c.matches.length}試合・${c.matches.map((m) => LV[m.level]).join('/')}` : `${c.requires ? `「${CUP_BY_ID[c.requires].name}」優勝・` : ''}Lv.${c.reqLv}で出場`}</small>
                  {rec && <small>優勝 {rec.wins}回 ／ 出場 {rec.tries}回</small>}
                </span>
                {run?.cupId === c.id && <span className="st-tag">進行中</span>}
              </button>
            );
          })}
        </section>
      )}

      {open && (
        <section className="bracket-card">
          <h2>{open.name}</h2>
          <p className="zd-desc">{open.desc}</p>
          <p className="muted">優勝賞品：<Coins n={open.coins} /> <PP n={open.pp} /></p>
          <ol className="bracket">
            {open.matches.map((m, i) => {
              const p = PUG_BY_ID[m.pug];
              const state = run?.cupId === open.id ? (i < run.round ? 'done' : i === run.round ? 'now' : 'next') : 'next';
              const you = humanColorFor(open, i);
              return (
                <li key={i} className={`bracket-row ${state}`}>
                  <span className="round-name">{ROUND_NAMES(open.matches.length, i)}</span>
                  <span className="you"><PugFace variant={you === BLACK ? 'black' : 'white'} mood="happy" /></span>
                  <span className="vs-small">VS</span>
                  <span className="opp"><PugArt coat={p.coat} hat={p.hat} acc={p.acc} mood={p.mood} framed /></span>
                  <span className="opp-name">{p.name}<small>{LV[m.level]}・あなたは{you === BLACK ? '黒' : '白'}</small></span>
                  <span className="round-state">{state === 'done' ? '勝ち！' : state === 'now' ? '次はここ' : ''}</span>
                </li>
              );
            })}
          </ol>
          {msg && <p className="buy-msg">{msg}</p>}
          <div className="modal-actions">
            {run?.cupId === open.id ? (
              <button className="btn primary" onClick={() => { sfx.bark(); onPlayRound(); }}>{ROUND_NAMES(open.matches.length, run.round)}を始める</button>
            ) : (
              <button className="btn primary" onClick={() => {
                const err = onEnter(open.id);
                if (err) { setMsg(err); sfx.tap(); } else { sfx.bark(); }
              }}>出場する</button>
            )}
            <button className="btn" onClick={() => setOpen(null)}>大会一覧へ</button>
          </div>
          <p className="muted center">大会ではヒント・1手戻すは使えません。途中でやめると負けになります。引き分けはその試合をやり直し。</p>
        </section>
      )}
    </div>
  );
}
