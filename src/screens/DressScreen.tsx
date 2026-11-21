import { useMemo, useState, type CSSProperties } from 'react';
import { HATS, ACCS, type HatId, type AccId } from '../components/parts';
import { PugArt } from '../components/PugFace';
import { Disc } from '../components/BoardView';
import { BOARDS, BACKGROUNDS, BG_BY_ID, HAT_SOURCES, ACC_SOURCES, ownedHats, ownedAccs, boardVars, MARKERS, EFFECTS } from '../data/items';
import { describe as describeCond, isMet } from '../data/conditions';
import { Marker } from '../components/PugFace';
import { VictoryEffectLayer } from './GameScreen';
import { PUG_BY_ID } from '../data/pugs';
import { describe } from '../data/conditions';
import { BLACK, WHITE, EMPTY, type Cell } from '../core/othello';
import { sfx } from '../services/sound';
import { FAVORITE_SLOTS, type Outfit, type SaveData } from '../store/save';
import { ITEM_PRICE_COINS } from '../data/growth';
import { Coins } from '../components/Status';

type Tab = 'black' | 'white' | 'board' | 'bg' | 'marker' | 'effect' | 'fav';
const TABS: { id: Tab; label: string }[] = [
  { id: 'black', label: '黒パグ' },
  { id: 'white', label: '白パグ' },
  { id: 'board', label: '盤' },
  { id: 'bg', label: '背景' },
  { id: 'marker', label: 'カーソル' },
  { id: 'effect', label: '勝利演出' },
  { id: 'fav', label: '★保存' },
];

// prettier-ignore
const MINI: Cell[] = [
  EMPTY, WHITE, BLACK, EMPTY,
  BLACK, BLACK, WHITE, WHITE,
  WHITE, BLACK, WHITE, BLACK,
  EMPTY, WHITE, BLACK, EMPTY,
];

const same = (a: Outfit, b: Outfit) => JSON.stringify(a) === JSON.stringify(b);

function MiniBoard({ outfit }: { outfit: Outfit }) {
  return (
    <div className="board-frame mini" style={boardVars(outfit.board) as CSSProperties}>
      <div className="board mini-board">
        {MINI.map((c, i) => (
          <div key={i} className={`cell ${(Math.floor(i / 4) + (i % 4)) % 2 ? 'alt' : ''}`}>
            <Disc cell={c} delay={0} isNew={false} outfits={outfit} />
            {c === EMPTY && <span className="legal-mark"><Marker kind={outfit.marker} /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DressScreen({ save, onBack, onApply, onSaveFavorites, onSeenItems, onBuy }: {
  save: SaveData;
  /** コインで盤面・背景を解放。失敗理由を返す */
  onBuy: (kind: 'board' | 'bg', id: string) => string | null;
  onBack: () => void;
  onApply: (o: Outfit) => void;
  onSaveFavorites: (f: SaveData['favorites']) => void;
  onSeenItems: () => void;
}) {
  const [tab, setTab] = useState<Tab>('black');
  const [draft, setDraft] = useState<Outfit>(save.outfit);
  const [toast, setToast] = useState<string | null>(null);
  const [previewFx, setPreviewFx] = useState(0);
  const [buying, setBuying] = useState<{ kind: 'board' | 'bg'; id: string; name: string; how: string } | null>(null);
  const ownedPugIds = useMemo(() => new Set(Object.keys(save.pugs)), [save.pugs]);
  const hats = useMemo(() => ownedHats(ownedPugIds), [ownedPugIds]);
  const accs = useMemo(() => ownedAccs(ownedPugIds), [ownedPugIds]);
  const dirty = !same(draft, save.outfit);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1700);
  };

  const hintFor = (sources: string[]) => {
    const p = PUG_BY_ID[sources[0]];
    return `「${describe(p.unlock)}」で手に入るパグが持っています`;
  };

  const piece = tab === 'black' || tab === 'white' ? tab : null;

  const setHat = (h: HatId | null) => piece && setDraft((d) => ({ ...d, [piece]: { ...d[piece], hat: h } }));
  const setAcc = (a: AccId | null) => piece && setDraft((d) => ({ ...d, [piece]: { ...d[piece], acc: a } }));

  const apply = () => { sfx.bark(); onApply(draft); onSeenItems(); flash('着せ替えを変更しました！'); };

  const saveFav = (slot: number) => {
    const name = `セット${slot + 1}`;
    const next = save.favorites.slice();
    next[slot] = { ...draft, name };
    onSaveFavorites(next);
    sfx.tap();
    flash(`${name} に保存しました`);
  };
  const loadFav = (slot: number) => {
    const f = save.favorites[slot];
    if (!f) return;
    const { name: _name, ...o } = f;
    void _name;
    // 持っていないアイテムが入っていたら外す（データ移行時の保険）
    const fix = (p: Outfit['black']) => ({ hat: p.hat && hats.has(p.hat) ? p.hat : null, acc: p.acc && accs.has(p.acc) ? p.acc : null });
    const n = Object.keys(save.pugs).length;
    setDraft({
      black: fix(o.black), white: fix(o.white), board: save.boards[o.board] ? o.board : 'grass', bg: save.bgs[o.bg] ? o.bg : 'cream',
      marker: MARKERS.some((m) => m.id === o.marker && isMet(m.unlock, save.stats, n)) ? o.marker : 'paw',
      effect: EFFECTS.some((e) => e.id === o.effect && isMet(e.unlock, save.stats, n)) ? o.effect : 'confetti',
    });
    sfx.tap();
    flash('プレビューによびだしました');
  };
  const clearFav = (slot: number) => {
    const next = save.favorites.slice();
    next[slot] = null;
    onSaveFavorites(next);
  };

  return (
    <div className="screen dress-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">着せ替え</div>
        <span className="icon-spacer" />
      </header>

      <section className="dress-preview" style={{ background: BG_BY_ID[draft.bg].css }}>
        <div className="dp-pug"><PugArt coat="black" hat={draft.black.hat} acc={draft.black.acc} mood="happy" framed /><span>黒パグ</span></div>
        <MiniBoard outfit={draft} />
        <div className="dp-pug"><PugArt coat="fawn" hat={draft.white.hat} acc={draft.white.acc} mood="happy" framed /><span>白パグ</span></div>
      </section>

      <div className="dress-apply">
        <button className="btn" disabled={!dirty} onClick={() => setDraft(save.outfit)}>もとに戻す</button>
        <button className="btn primary" disabled={!dirty} onClick={apply}>この組み合わせにする</button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => { sfx.tap(); setTab(t.id); }}>{t.label}</button>
        ))}
      </div>

      <section className="dress-list">
        {piece && (
          <>
            <h4>帽子 <small>{hats.size} / {Object.keys(HATS).length}</small></h4>
            <div className="item-grid">
              <button className={`item ${draft[piece].hat === null ? 'on' : ''}`} onClick={() => setHat(null)}>
                <span className="item-art none">なし</span>
              </button>
              {(Object.keys(HATS) as HatId[]).map((h) => {
                const have = hats.has(h);
                return (
                  <button key={h} className={`item ${draft[piece].hat === h ? 'on' : ''} ${have ? '' : 'locked'}`}
                    onClick={() => (have ? setHat(h) : flash(hintFor(HAT_SOURCES[h])))}>
                    <span className="item-art"><PugArt coat={piece === 'black' ? 'black' : 'fawn'} hat={h} framed /></span>
                    <span className="item-name">{have ? HATS[h].name : '？？？'}</span>
                  </button>
                );
              })}
            </div>
            <h4>アクセサリー <small>{accs.size} / {Object.keys(ACCS).length}</small></h4>
            <div className="item-grid">
              <button className={`item ${draft[piece].acc === null ? 'on' : ''}`} onClick={() => setAcc(null)}>
                <span className="item-art none">なし</span>
              </button>
              {(Object.keys(ACCS) as AccId[]).map((a) => {
                const have = accs.has(a);
                return (
                  <button key={a} className={`item ${draft[piece].acc === a ? 'on' : ''} ${have ? '' : 'locked'}`}
                    onClick={() => (have ? setAcc(a) : flash(hintFor(ACC_SOURCES[a])))}>
                    <span className="item-art"><PugArt coat={piece === 'black' ? 'black' : 'fawn'} acc={a} framed /></span>
                    <span className="item-name">{have ? ACCS[a].name : '？？？'}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === 'board' && (
          <div className="item-grid wide">
            {BOARDS.map((b) => {
              const have = Boolean(save.boards[b.id]);
              return (
                <button key={b.id} className={`item ${draft.board === b.id ? 'on' : ''} ${have ? '' : 'locked'}`}
                  onClick={() => (have ? setDraft((d) => ({ ...d, board: b.id })) : setBuying({ kind: 'board', id: b.id, name: b.name, how: describe(b.unlock) }))}>
                  <span className="item-art swatch" style={{ background: `linear-gradient(135deg, ${b.frame[0]} 0 22%, ${b.cell} 22% 61%, ${b.cellAlt} 61% 78%, ${b.frame[1]} 78%)` }} />
                  <span className="item-name">{have ? b.name : '？？？'}</span>
                  {have && !save.boards[b.id].seen && <span className="new-badge">NEW</span>}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'bg' && (
          <div className="item-grid wide">
            {BACKGROUNDS.map((b) => {
              const have = Boolean(save.bgs[b.id]);
              return (
                <button key={b.id} className={`item ${draft.bg === b.id ? 'on' : ''} ${have ? '' : 'locked'}`}
                  onClick={() => (have ? setDraft((d) => ({ ...d, bg: b.id })) : setBuying({ kind: 'bg', id: b.id, name: b.name, how: describe(b.unlock) }))}>
                  <span className="item-art swatch" style={{ background: b.css }} />
                  <span className="item-name">{have ? b.name : '？？？'}</span>
                  {have && !save.bgs[b.id].seen && <span className="new-badge">NEW</span>}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'marker' && (
          <div className="item-grid wide">
            {MARKERS.map((m) => {
              const have = isMet(m.unlock, save.stats, Object.keys(save.pugs).length);
              return (
                <button key={m.id} className={`item ${draft.marker === m.id ? 'on' : ''} ${have ? '' : 'locked'}`}
                  onClick={() => (have ? setDraft((d) => ({ ...d, marker: m.id })) : flash(`入手方法：${describeCond(m.unlock)}`))}>
                  <span className="item-art swatch marker-swatch"><span className="mk"><Marker kind={m.id} /></span></span>
                  <span className="item-name">{have ? m.name : '？？？'}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'effect' && (
          <>
            <div className="item-grid wide">
              {EFFECTS.map((e) => {
                const have = isMet(e.unlock, save.stats, Object.keys(save.pugs).length);
                return (
                  <button key={e.id} className={`item ${draft.effect === e.id ? 'on' : ''} ${have ? '' : 'locked'}`}
                    onClick={() => { if (!have) { flash(`入手方法：${describeCond(e.unlock)}`); return; } setDraft((d) => ({ ...d, effect: e.id })); setPreviewFx((k) => k + 1); }}>
                    <span className="item-art swatch fx-swatch">{e.chars.join(' ')}</span>
                    <span className="item-name">{have ? e.name : '？？？'}</span>
                  </button>
                );
              })}
            </div>
            <p className="muted center">タップすると演出をためせます</p>
          </>
        )}

        {tab === 'fav' && (
          <div className="fav-list">
            <p className="muted">いまプレビューしている組み合わせを保存できます（{FAVORITE_SLOTS}つまで）。</p>
            {save.favorites.map((f, i) => (
              <div key={i} className="fav-slot">
                {f ? (
                  <>
                    <div className="fav-thumb" style={{ background: BG_BY_ID[f.bg].css }}>
                      <PugArt coat="black" hat={f.black.hat} acc={f.black.acc} framed />
                      <PugArt coat="fawn" hat={f.white.hat} acc={f.white.acc} framed />
                    </div>
                    <div className="fav-name">{f.name}</div>
                    <div className="fav-btns">
                      <button className="btn small" onClick={() => loadFav(i)}>よびだす</button>
                      <button className="btn small" onClick={() => saveFav(i)}>上書き</button>
                      <button className="btn small ghost" onClick={() => clearFav(i)}>消す</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="fav-thumb empty">からっぽ</div>
                    <div className="fav-name">セット{i + 1}</div>
                    <div className="fav-btns"><button className="btn small primary" onClick={() => saveFav(i)}>ここに保存</button></div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {toast && <div className="toast home-toast" role="status">{toast}</div>}
      {previewFx > 0 && <VictoryEffectLayer key={previewFx} id={draft.effect} />}

      {buying && (
        <div className="modal-backdrop" onClick={() => setBuying(null)}>
          <div className="modal buy-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{buying.kind === 'board' ? 'オセロ盤' : '背景'}「{buying.name}」</h3>
            <p className="muted">入手方法：{buying.how}</p>
            <p>コインを使って今すぐ手に入れることもできます。</p>
            <p className="buy-price"><Coins n={ITEM_PRICE_COINS[`${buying.kind}:${buying.id}`]} /> <small>（所持 {save.wallet.coins.toLocaleString()}）</small></p>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => {
                const err = onBuy(buying.kind, buying.id);
                if (err) { flash(err); sfx.tap(); return; }
                sfx.win();
                setDraft((d) => ({ ...d, [buying.kind]: buying.id }));
                flash(`「${buying.name}」を手に入れた！`);
                setBuying(null);
              }}>コインで手に入れる</button>
              <button className="btn" onClick={() => setBuying(null)}>やめておく</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
