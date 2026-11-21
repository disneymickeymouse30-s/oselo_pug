import { useMemo, useState } from 'react';
import { PUGS, RARITIES, RARITY_INFO, type PugDef, type Rarity } from '../data/pugs';
import { describe, progressOf } from '../data/conditions';
import { PugArt } from '../components/PugFace';
import { HATS, ACCS } from '../components/parts';
import { sfx } from '../services/sound';
import type { SaveData } from '../store/save';
import { PUG_PRICE_PP, stageOf } from '../data/growth';
import { Hearts, PP } from '../components/Status';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function ZukanScreen({ save, onBack, onSeen, onFavorite, onRaise, onBuy }: {
  save: SaveData;
  onBack: () => void;
  onSeen: (id: string) => void;
  onFavorite: (id: string) => void;
  onRaise: (id: string) => void;
  /** パグポイントで迎える。失敗理由を返す */
  onBuy: (id: string) => string | null;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [open, setOpen] = useState<PugDef | null>(null);
  const owned = save.pugs;
  const count = Object.keys(owned).length;
  const pct = Math.floor((count / PUGS.length) * 100);
  const list = useMemo(() => (filter === 'all' ? PUGS : PUGS.filter((p) => p.rarity === filter)), [filter]);

  const show = (p: PugDef) => {
    sfx.tap();
    setOpen(p);
    if (owned[p.id] && !owned[p.id].seen) onSeen(p.id);
  };

  return (
    <div className="screen zukan-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">パグ図鑑</div>
        <span className="icon-spacer" />
      </header>

      <section className="complete-card">
        <div className="complete-num"><b>{count}</b> / {PUGS.length} 種類</div>
        <div className="meter"><i style={{ width: `${pct}%` }} /></div>
        <div className="complete-pct">完成率 {pct}%</div>
      </section>

      <div className="chips" role="tablist">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>すべて</button>
        {RARITIES.map((r) => (
          <button key={r} className={filter === r ? 'on' : ''} style={{ ['--rc' as string]: RARITY_INFO[r].color }} onClick={() => setFilter(r)}>
            {r}
            <small>{PUGS.filter((p) => p.rarity === r && owned[p.id]).length}/{PUGS.filter((p) => p.rarity === r).length}</small>
          </button>
        ))}
      </div>

      <section className="zukan-grid">
        {list.map((p) => {
          const have = Boolean(owned[p.id]);
          return (
            <button key={p.id} className={`zukan-card ${have ? '' : 'unknown'}`} style={{ ['--rc' as string]: RARITY_INFO[p.rarity].color }} onClick={() => show(p)}>
              <span className="zc-no">No.{String(p.no).padStart(3, '0')}</span>
              {have && !owned[p.id].seen && <span className="new-badge">NEW</span>}
              <span className="zc-art"><PugArt coat={p.coat} hat={p.hat} acc={p.acc} mood={p.mood} framed /></span>
              <span className="zc-name">{have ? p.name : '？？？'}</span>
              <span className="zc-rarity">{p.rarity}</span>
            </button>
          );
        })}
      </section>

      {open && (() => {
        const p = open;
        const o = owned[p.id];
        const [cur, goal] = progressOf(p.unlock, save.stats, count);
        const r = RARITY_INFO[p.rarity];
        return (
          <div className="modal-backdrop" onClick={() => { setOpen(null); setMsg(null); }}>
            <div className="modal zukan-detail" style={{ ['--rc' as string]: r.color }} onClick={(e) => e.stopPropagation()}>
              <div className={`zd-art ${o ? '' : 'unknown'}`}>
                <PugArt coat={p.coat} hat={p.hat} acc={p.acc} mood={o ? (p.mood ?? 'happy') : p.mood} framed />
              </div>
              <div className="zd-head">
                <span className="zd-no">No.{String(p.no).padStart(3, '0')}</span>
                <span className="rarity-badge" style={{ background: r.color }}>{p.rarity}・{r.label}</span>
              </div>
              <h2>{o ? p.name : '？？？'}</h2>
              <p className="zd-desc">{o ? p.desc : 'まだ出会っていないパグ。どんな子なんだろう？'}</p>
              <dl className="zd-table">
                <dt>入手方法</dt>
                <dd>
                  {describe(p.unlock)}
                  {!o && goal > 1 && (
                    <span className="mini-meter"><i style={{ width: `${Math.min(100, (cur / goal) * 100)}%` }} /><em>{Math.min(cur, goal)} / {goal}</em></span>
                  )}
                </dd>
                {o && (p.hat || p.acc) && (
                  <>
                    <dt>着せ替え</dt>
                    <dd>{[p.hat && HATS[p.hat].name, p.acc && ACCS[p.acc].name].filter(Boolean).join('・')} が使えます</dd>
                  </>
                )}
                <dt>入手日時</dt>
                <dd>{o ? fmtDate(o.at) : '—'}</dd>
                <dt>レベル</dt>
                <dd>{o ? `Lv.${save.growth[p.id]?.lv ?? 1}（${stageOf(save.growth[p.id]?.lv ?? 1).name}）` : '—'}</dd>
                <dt>親密度</dt>
                <dd>{o ? <Hearts love={save.growth[p.id]?.love ?? 0} /> : '—'}</dd>
              </dl>
              <div className="modal-actions">
                {o && (
                  <>
                    <button className="btn primary" onClick={() => { sfx.tap(); onRaise(p.id); }}>🦴 育成する</button>
                    <button className="btn" disabled={save.favoritePug === p.id} onClick={() => { sfx.bark(); onFavorite(p.id); }}>
                      {save.favoritePug === p.id ? '★ パートナー' : '☆ パートナーにする'}
                    </button>
                  </>
                )}
                {!o && PUG_PRICE_PP[p.rarity] !== undefined && (
                  <button className="btn primary" onClick={() => {
                    const err = onBuy(p.id);
                    if (err) { setMsg(err); sfx.tap(); } else { setMsg(null); sfx.win(); }
                  }}>
                    <PP n={PUG_PRICE_PP[p.rarity]!} /> で今すぐ迎える
                  </button>
                )}
                {msg && <p className="buy-msg">{msg}（所持 {save.wallet.pp}PP）</p>}
                <button className="btn" onClick={() => { setOpen(null); setMsg(null); }}>とじる</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
