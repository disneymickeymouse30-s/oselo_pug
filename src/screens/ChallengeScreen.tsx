import { useState } from 'react';
import { STAGES, describeObjective, type Stage } from '../data/challenges';
import { stageUnlocked, totalStars } from '../core/modes';
import { Coins } from '../components/Status';
import { BoardView } from '../components/BoardView';
import { initialBoard, BLACK } from '../core/othello';
import { sfx } from '../services/sound';
import type { SaveData } from '../store/save';

const LV: Record<string, string> = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
const EMPTY_SET = new Set<number>();
const NO_DELAY = new Map<number, number>();

export function ChallengeScreen({ save, onBack, onPlay }: { save: SaveData; onBack: () => void; onPlay: (s: Stage) => void }) {
  const [open, setOpen] = useState<Stage | null>(null);
  const stars = totalStars(save);
  return (
    <div className="screen challenge-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">チャレンジ</div>
        <span className="icon-spacer" />
      </header>
      <section className="complete-card">
        <div className="complete-num"><b>★ {stars}</b> / {STAGES.length * 3}</div>
        <div className="meter"><i style={{ width: `${(stars / (STAGES.length * 3)) * 100}%` }} /></div>
        <div className="complete-pct">{Object.values(save.challenge).filter((c) => c.stars > 0).length}/{STAGES.length} クリア</div>
      </section>
      <section className="stage-grid">
        {STAGES.map((s) => {
          const rec = save.challenge[s.id];
          const unlocked = stageUnlocked(save, s);
          return (
            <button key={s.id} className={`stage-card lv-${s.level} ${unlocked ? '' : 'locked'} ${rec?.stars ? 'cleared' : ''}`}
              onClick={() => { if (!unlocked) return; sfx.tap(); setOpen(s); }}>
              <span className="st-no">{unlocked ? s.no : '🔒'}</span>
              <span className="st-title">{unlocked ? s.title : '？？？'}</span>
              <span className="st-stars">{[1, 2, 3].map((i) => <i key={i} className={(rec?.stars ?? 0) >= i ? 'on' : ''}>★</i>)}</span>
              {s.start && unlocked && <span className="st-tag">詰め</span>}
              {s.series && unlocked && <span className="st-tag">{s.series.length}連戦</span>}
            </button>
          );
        })}
      </section>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(null)}>
          <div className="modal stage-detail" onClick={(e) => e.stopPropagation()}>
            <div className="zd-head"><span className="zd-no">STAGE {open.no}</span><span className={`level-pill lv-${open.level}`}>{open.series ? open.series.map((l) => LV[l]).join('→') : LV[open.level]}</span></div>
            <h2>{open.title}</h2>
            <p className="zd-desc">{open.hint}</p>
            <div className="mini-preview">
              <BoardView board={open.start?.board ?? initialBoard()} legal={EMPTY_SET} showLegal={false} hint={null} lastPos={null}
                flipDelay={NO_DELAY} disabled onCell={() => {}} />
            </div>
            <p className="muted">あなたは {open.human === BLACK ? '黒パグ（先手）' : '白パグ（後手）'}</p>
            <ul className="star-goals">
              <li><b>★1</b> {open.clear.map(describeObjective).join('・')}</li>
              <li><b>★2</b> クリア＋{describeObjective(open.star2)}</li>
              <li><b>★3</b> クリア＋{describeObjective(open.star3)}</li>
            </ul>
            <p className="muted">初クリア報酬：<Coins n={open.coins} /> ＋ {open.exp} EXP ／ 新しい★1つにつき 1PP</p>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => { sfx.bark(); onPlay(open); }}>スタート！</button>
              <button className="btn" onClick={() => setOpen(null)}>とじる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
