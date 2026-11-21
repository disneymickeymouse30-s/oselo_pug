import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  FURNITURE, FURNITURE_BY_ID, GARDEN_SIZES, SEASONS, sizeIndexOf, pugCapacity, seasonOf, isNight, type Season, type SeasonSetting,
} from '../data/garden';
import {
  canPlace, placeItem, moveItem, storeItem, stockOf, buyFurniture, expandGarden, toggleGardenPug, nextPlan, occupancy,
  type PugPose, type GardenData,
} from '../core/garden';
import { petPug } from '../core/progress';
import { FURNITURE_ART, PugBody } from '../components/GardenSprites';
import { PugArt } from '../components/PugFace';
import { Coins, PP } from '../components/Status';
import { PUGS, PUG_BY_ID } from '../data/pugs';
import { PROFILES } from '../data/growth';
import { sfx } from '../services/sound';
import type { SaveData } from '../store/save';

interface PugActor {
  id: string;
  x: number;
  y: number;
  pose: PugPose;
  /** 1 = 左向き（絵の基本）、-1 = 右向き */
  face: 1 | -1;
  until: number;
  moveMs: number;
  next: { pose: PugPose; stay: number; target: number | null } | null;
  target: number | null;
}

type Tab = 'items' | 'shop' | 'pugs' | 'expand' | 'season';
type Selection = { kind: 'new'; id: string } | { kind: 'move'; uid: number } | { kind: 'picked'; uid: number } | null;

const PARTICLES = 14;

function spawn(g: GardenData, id: string): PugActor {
  const occ = occupancy(g);
  const free: [number, number][] = [];
  for (let y = 0; y < g.size; y++) for (let x = 0; x < g.size; x++) if (!occ.has(`${x},${y}`)) free.push([x, y]);
  const [x, y] = free[Math.floor(Math.random() * free.length)] ?? [g.size / 2, g.size / 2];
  return { id, x: x + 0.5, y: y + 0.7, pose: 'stand', face: Math.random() < 0.5 ? 1 : -1, until: Date.now() + 600 + Math.random() * 1500, moveMs: 0, next: null, target: null };
}

export function GardenScreen({ save, animation, onBack, onChange }: {
  save: SaveData;
  animation: boolean;
  onBack: () => void;
  onChange: (s: SaveData) => void;
}) {
  const g = save.garden;
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [tab, setTab] = useState<Tab>('items');
  const [sel, setSel] = useState<Selection>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bubble, setBubble] = useState<{ id: string; text: string; hearts: boolean; key: number } | null>(null);
  const [actors, setActors] = useState<PugActor[]>(() => g.pugs.map((id) => spawn(g, id)));
  const gardenRef = useRef(g);
  gardenRef.current = g;
  const now = new Date();
  const season: Season = g.season === 'auto' ? seasonOf(now) : g.season;
  const night = isNight(now);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1700);
  };

  // お庭に出すパグが変わったら、増えた子を登場させる・減った子を帰す
  useEffect(() => {
    setActors((list) => {
      const keep = list.filter((a) => g.pugs.includes(a.id));
      const add = g.pugs.filter((id) => !keep.some((a) => a.id === id)).map((id) => spawn(g, id));
      return [...keep, ...add];
    });
  }, [g.pugs]); // eslint-disable-line react-hooks/exhaustive-deps

  // パグの行動ループ（低スペック端末向けに 0.4 秒ごとの軽い更新。移動は CSS の transition で補間）
  useEffect(() => {
    const t = window.setInterval(() => {
      const nowMs = Date.now();
      setActors((list) => {
        let changed = false;
        const next = list.map((a) => {
          if (nowMs < a.until) return a;
          changed = true;
          if (a.pose === 'walk' && a.next) {
            return { ...a, pose: a.next.pose, until: nowMs + a.next.stay, target: a.next.target, next: null, moveMs: 0 };
          }
          const plan = nextPlan(gardenRef.current);
          const dist = Math.hypot(plan.x - a.x, plan.y - a.y);
          const moveMs = Math.max(300, dist * 650);
          const face: 1 | -1 = Math.abs(plan.x - a.x) < 0.05 ? a.face : plan.x < a.x ? 1 : -1;
          return { ...a, x: plan.x, y: plan.y, face, pose: 'walk' as PugPose, moveMs, until: nowMs + moveMs, next: { pose: plan.pose, stay: plan.stay, target: plan.target }, target: null };
        });
        return changed ? next : list;
      });
    }, 400);
    return () => window.clearInterval(t);
  }, []);

  const itemZ = (it: { id: string; y: number }) => (it.y + FURNITURE_BY_ID[it.id].h) * 10;

  const tapCell = (x: number, y: number) => {
    if (mode !== 'edit' || !sel) return;
    if (sel.kind === 'new') {
      const r = placeItem(g, sel.id, x, y);
      if (!r.ok) { flash(r.reason); sfx.tap(); return; }
      sfx.place();
      onChange({ ...save, garden: r.garden });
      if (stockOf(r.garden, sel.id) <= 0) setSel(null);
    } else if (sel.kind === 'move') {
      const r = moveItem(g, sel.uid, x, y);
      if (!r.ok) { flash(r.reason); sfx.tap(); return; }
      sfx.place();
      onChange({ ...save, garden: r.garden });
      setSel(null);
    }
  };

  const tapItem = (uid: number) => {
    if (mode !== 'edit') return;
    if (sel && sel.kind !== 'picked') return; // 設置中はマスのタップを優先
    sfx.tap();
    setSel({ kind: 'picked', uid });
  };

  const tapPug = (id: string) => {
    if (mode === 'edit') return;
    const lv = save.growth[id]?.lv ?? 1;
    const words = lv >= 5 && PROFILES[id] ? PROFILES[id][2] : 'わん！';
    const r = petPug(save, id, new Date());
    if (r.ok) {
      sfx.bark();
      onChange(r.save);
      setBubble({ id, text: 'なでなで… しあわせ♪（親密度+5）', hearts: true, key: Date.now() });
    } else {
      sfx.tap();
      setBubble({ id, text: words, hearts: false, key: Date.now() });
    }
    window.setTimeout(() => setBubble((b) => (b && b.id === id ? null : b)), 2200);
  };

  const cells = useMemo(() => Array.from({ length: g.size * g.size }, (_, i) => [i % g.size, Math.floor(i / g.size)] as const), [g.size]);
  const picked = sel?.kind === 'picked' || sel?.kind === 'move' ? g.items.find((i) => i.uid === sel.uid) : null;
  const placingId = sel?.kind === 'new' ? sel.id : sel?.kind === 'move' ? picked?.id : null;
  const pct = (v: number) => `${(v / g.size) * 100}%`;
  const ownedPugs = PUGS.filter((p) => save.pugs[p.id]);
  const sizeIdx = sizeIndexOf(g.size);
  const nextSize = GARDEN_SIZES[sizeIdx + 1];

  return (
    <div className="screen garden-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">{GARDEN_SIZES[sizeIdx].name}</div>
        <span className="icon-spacer" />
      </header>

      <div className="wallet-row">
        <span className="garden-info">🐾 {g.pugs.length}/{pugCapacity(g.size)}匹・{SEASONS.find((s) => s.id === season)!.name}{night ? '・夜' : ''}</span>
        <Coins n={save.wallet.coins} /><PP n={save.wallet.pp} />
      </div>

      <section className={`garden season-${season} ${mode === 'edit' ? 'editing' : ''} ${placingId ? 'placing' : ''} ${animation ? '' : 'no-anim'}`}
        style={{ ['--gs' as string]: g.size } as CSSProperties}>
        {/* 地面のマス（もようがえ中はタップできる） */}
        <div className="garden-grid">
          {cells.map(([x, y]) => {
            let cls = '';
            if (placingId && mode === 'edit') {
              const ignore = sel?.kind === 'move' ? sel.uid : undefined;
              const f = FURNITURE_BY_ID[placingId];
              // その家具の左上をこのマスに置けるか
              if (x + f.w <= g.size && y + f.h <= g.size) cls = canPlace(g, placingId, x, y, ignore) ? 'ok' : 'ng';
              else cls = 'ng';
            }
            return <button key={`${x},${y}`} className={`gcell ${cls}`} onClick={() => tapCell(x, y)} disabled={mode !== 'edit'} aria-label={`${x + 1}-${y + 1}`} />;
          })}
        </div>

        {/* 家具 */}
        {g.items.map((it) => {
          const f = FURNITURE_BY_ID[it.id];
          const style: CSSProperties = {
            left: pct(it.x), top: pct(it.y + f.h - f.spriteH), width: pct(f.w), height: pct(f.spriteH), zIndex: itemZ(it),
          };
          return (
            <button key={it.uid} className={`gitem ${picked?.uid === it.uid ? 'picked' : ''}`} style={style}
              onClick={() => tapItem(it.uid)} disabled={mode !== 'edit'} aria-label={f.name}>
              <svg viewBox={`0 0 ${f.w * 100} ${f.spriteH * 100}`} width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
                {FURNITURE_ART[it.id]({ season, night })}
              </svg>
            </button>
          );
        })}

        {/* パグ */}
        {actors.map((a) => {
          const p = PUG_BY_ID[a.id];
          if (!p) return null;
          const target = a.target !== null ? g.items.find((i) => i.uid === a.target) : null;
          const z = Math.max(Math.round(a.y * 10) + 1, target ? itemZ(target) + 1 : 0);
          const style: CSSProperties = {
            left: pct(a.x - 0.6), top: pct(a.y - 1.05), width: pct(1.2), height: pct(1.2), zIndex: z,
            transition: animation ? `left ${a.moveMs}ms linear, top ${a.moveMs}ms linear` : 'none',
          };
          return (
            <button key={a.id} className={`gpug pose-${a.pose}`} style={style} onClick={() => tapPug(a.id)} aria-label={p.name}>
              <div className="gpug-inner" style={{ transform: `scaleX(${a.face === 1 ? 1 : -1})` }}>
                <PugBody coat={p.coat} hat={p.hat} acc={p.acc} pose={a.pose} />
              </div>
              {bubble?.id === a.id && (
                <span className="speech" key={bubble.key}>
                  {bubble.text}
                  {bubble.hearts && <i className="float-hearts">♥ ♥ ♥</i>}
                </span>
              )}
            </button>
          );
        })}

        {/* 季節の演出 */}
        {animation && mode === 'view' && (
          <div className={`particles p-${season}`} aria-hidden="true">
            {Array.from({ length: PARTICLES }, (_, i) => (
              <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.73) % 6}s`, animationDuration: `${6 + (i % 5)}s` }} />
            ))}
          </div>
        )}
        {night && mode === 'view' && (
          <>
            <div className="night-overlay" />
            {g.items.filter((i) => i.id === 'lamp').map((i) => (
              <div key={i.uid} className="lamp-glow" style={{ left: pct(i.x + 0.5), top: pct(i.y + 1 - 2.0) }} />
            ))}
          </>
        )}
      </section>

      {mode === 'view' ? (
        <div className="garden-actions">
          <button className="btn primary" onClick={() => { sfx.tap(); setBubble(null); setMode('edit'); setTab('items'); }}>🛠 もようがえ</button>
          <p className="muted center">パグをタップすると、なでたり（1日1回）お話したりできるよ</p>
        </div>
      ) : (
        <section className="garden-panel">
          {sel && (
            <div className="sel-bar">
              {sel.kind === 'new' && <span>「{FURNITURE_BY_ID[sel.id].name}」を置く場所をタップ（残り{stockOf(g, sel.id)}）</span>}
              {sel.kind === 'move' && <span>「{picked && FURNITURE_BY_ID[picked.id].name}」の新しい場所をタップ</span>}
              {sel.kind === 'picked' && picked && (
                <>
                  <span>{FURNITURE_BY_ID[picked.id].name}</span>
                  <button className="btn small" onClick={() => setSel({ kind: 'move', uid: picked.uid })}>移動</button>
                  <button className="btn small" onClick={() => { onChange({ ...save, garden: storeItem(g, picked.uid) }); setSel(null); sfx.tap(); }}>しまう</button>
                </>
              )}
              <button className="btn small ghost" onClick={() => setSel(null)}>やめる</button>
            </div>
          )}

          <div className="tabs">
            {([['items', '持ち物'], ['shop', 'お店'], ['pugs', 'パグ'], ['expand', 'ひろげる'], ['season', '季節']] as [Tab, string][]).map(([id, label]) => (
              <button key={id} className={tab === id ? 'on' : ''} onClick={() => { sfx.tap(); setTab(id); }}>{label}</button>
            ))}
          </div>

          {tab === 'items' && (
            <div className="fur-grid">
              {FURNITURE.filter((f) => (g.owned[f.id] ?? 0) > 0).map((f) => {
                const stock = stockOf(g, f.id);
                return (
                  <button key={f.id} className={`fur ${sel?.kind === 'new' && sel.id === f.id ? 'on' : ''}`} disabled={stock <= 0}
                    onClick={() => { sfx.tap(); setSel({ kind: 'new', id: f.id }); }}>
                    <span className="fur-art"><svg viewBox={`0 0 ${f.w * 100} ${f.spriteH * 100}`}>{FURNITURE_ART[f.id]({ season, night: false })}</svg></span>
                    <span className="fur-name">{f.name}</span>
                    <span className="fur-sub">のこり {stock} / {g.owned[f.id]}</span>
                  </button>
                );
              })}
              <p className="muted span-all">置いてある家具をタップすると、移動やしまうことができます。</p>
            </div>
          )}

          {tab === 'shop' && (
            <div className="fur-grid">
              {FURNITURE.map((f) => {
                const lvLock = save.player.lv < f.reqLv;
                const soldOut = f.unique && (g.owned[f.id] ?? 0) > 0;
                return (
                  <div key={f.id} className={`fur shop ${lvLock ? 'locked' : ''}`}>
                    <span className="fur-art"><svg viewBox={`0 0 ${f.w * 100} ${f.spriteH * 100}`}>{FURNITURE_ART[f.id]({ season, night: false })}</svg></span>
                    <span className="fur-name">{f.name}</span>
                    <span className="fur-sub">{f.w}×{f.h}マス{(g.owned[f.id] ?? 0) > 0 ? `・${g.owned[f.id]}こ持ってる` : ''}</span>
                    <button className="btn small primary" disabled={lvLock || soldOut} onClick={() => {
                      const r = buyFurniture(save, f.id);
                      if (!r.ok) { flash(r.reason); sfx.tap(); return; }
                      sfx.win();
                      onChange(r.save);
                      flash(`${f.name}を買いました！「持ち物」から置けます`);
                    }}>
                      {lvLock ? `Lv.${f.reqLv}で解放` : soldOut ? '購入ずみ' : <Coins n={f.coins} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'pugs' && (
            <>
              <p className="muted">お庭に出すパグを選んでね（{g.pugs.length}/{pugCapacity(g.size)}匹）</p>
              <div className="pug-pick">
                {ownedPugs.map((p) => (
                  <button key={p.id} className={`pick ${g.pugs.includes(p.id) ? 'on' : ''}`} onClick={() => {
                    const r = toggleGardenPug(save, p.id);
                    if (!r.ok) { flash(r.reason); sfx.tap(); return; }
                    sfx.tap();
                    onChange(r.save);
                  }}>
                    {g.pugs.includes(p.id) && <span className="pick-star">✔</span>}
                    <span className="pick-art"><PugArt coat={p.coat} hat={p.hat} acc={p.acc} mood={p.mood} framed /></span>
                    <span className="pick-lv">Lv.{save.growth[p.id]?.lv ?? 1}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'expand' && (
            <div className="expand-box">
              <div className="expand-steps">
                {GARDEN_SIZES.map((s, i) => (
                  <div key={s.size} className={`step ${i <= sizeIdx ? 'done' : ''}`}>
                    <b>{s.size}×{s.size}</b><small>{s.name}</small><small>パグ{s.pugs}匹</small>
                  </div>
                ))}
              </div>
              {nextSize ? (
                <>
                  <p>つぎは <b>{nextSize.size}×{nextSize.size}マス</b>（パグ{nextSize.pugs}匹まで）にひろげられます。</p>
                  <p className="muted">必要：プレイヤー Lv.{nextSize.reqLv} ・ <Coins n={nextSize.coins} /></p>
                  <button className="btn primary wide" disabled={save.player.lv < nextSize.reqLv} onClick={() => {
                    const r = expandGarden(save);
                    if (!r.ok) { flash(r.reason); sfx.tap(); return; }
                    sfx.win();
                    onChange(r.save);
                    flash('お庭がひろくなった！');
                  }}>{save.player.lv < nextSize.reqLv ? `Lv.${nextSize.reqLv}で解放` : 'お庭をひろげる'}</button>
                </>
              ) : <p>これ以上ひろげられません。最高のお庭です！</p>}
            </div>
          )}

          {tab === 'season' && (
            <div className="seg season-seg">
              {([['auto', `自動（今は${SEASONS.find((s) => s.id === seasonOf(now))!.name}）`], ...SEASONS.map((s) => [s.id, s.name])] as [SeasonSetting, string][]).map(([id, label]) => (
                <button key={id} className={g.season === id ? 'on' : ''} onClick={() => { sfx.tap(); onChange({ ...save, garden: { ...g, season: id } }); }}>{label}</button>
              ))}
            </div>
          )}

          <button className="btn wide" onClick={() => { setMode('view'); setSel(null); sfx.tap(); }}>もようがえをおわる</button>
        </section>
      )}

      {toast && <div className="toast home-toast" role="status">{toast}</div>}
    </div>
  );
}
