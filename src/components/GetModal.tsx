import { useState } from 'react';
import { PUG_BY_ID, RARITY_INFO } from '../data/pugs';
import { BOARD_BY_ID, BG_BY_ID } from '../data/items';
import type { Unlocked } from '../core/progress';
import { PugArt } from './PugFace';
import { sfx } from '../services/sound';

/** 新しく手に入ったパグを1匹ずつ見せる演出。最後に盤面・背景をまとめて表示 */
export function GetModal({ unlocked, onClose }: { unlocked: Unlocked; onClose: () => void }) {
  const [i, setI] = useState(0);
  const pugIds = unlocked.pugs;
  const items = [
    ...unlocked.boards.map((id) => `オセロ盤「${BOARD_BY_ID[id].name}」`),
    ...unlocked.bgs.map((id) => `背景「${BG_BY_ID[id].name}」`),
  ];
  const showItems = i >= pugIds.length;
  if (showItems && items.length === 0) return null;

  const next = () => {
    sfx.tap();
    if (i + 1 < pugIds.length || (i + 1 === pugIds.length && items.length > 0)) {
      setI(i + 1);
      if (i + 1 < pugIds.length) sfx.win();
    } else onClose();
  };

  if (showItems) {
    return (
      <div className="modal-backdrop get-backdrop" onClick={next}>
        <div className="modal get-modal">
          <div className="get-new">NEW!</div>
          <h2>着せ替えアイテムをゲット！</h2>
          <ul className="get-items">{items.map((t) => <li key={t}>🎁 {t}</li>)}</ul>
          <p className="get-tap">タップしてとじる</p>
        </div>
      </div>
    );
  }

  const p = PUG_BY_ID[pugIds[i]];
  const r = RARITY_INFO[p.rarity];
  return (
    <div className="modal-backdrop get-backdrop" onClick={next}>
      <div className={`modal get-modal rarity-${p.rarity}`} key={p.id} style={{ ['--rc' as string]: r.color }}>
        <div className="get-rays" />
        <div className="get-new">NEW! パグをゲット</div>
        <div className="get-art"><PugArt coat={p.coat} hat={p.hat} acc={p.acc} mood={p.mood ?? 'happy'} framed /></div>
        <div className="rarity-badge" style={{ background: r.color }}>{p.rarity}</div>
        <h2>{p.name}</h2>
        <p className="get-desc">{p.desc}</p>
        {(p.hat || p.acc) && <p className="get-bonus">👒 この子の着せ替えアイテムが使えるようになったよ</p>}
        <p className="get-tap">{pugIds.length > 1 ? `${i + 1} / ${pugIds.length}・` : ''}タップしてつぎへ</p>
      </div>
    </div>
  );
}
