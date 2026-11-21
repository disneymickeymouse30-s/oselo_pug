import { PugArt, PugFace } from './PugFace';
import { PUG_BY_ID } from '../data/pugs';
import { MILESTONES, stageOf, LEVELUP_PP } from '../data/growth';
import { sfx } from '../services/sound';
import { useEffect } from 'react';

export type LevelUpInfo =
  | { kind: 'player'; from: number; to: number }
  | { kind: 'pug'; id: string; from: number; to: number };

/** レベルアップの特別演出 */
export function LevelUpModal({ info, onClose }: { info: LevelUpInfo; onClose: () => void }) {
  useEffect(() => { sfx.win(); }, []);
  const ups = info.to - info.from;
  const newMilestones = info.kind === 'pug' ? MILESTONES.filter((m) => m.lv > info.from && m.lv <= info.to) : [];
  const stageChanged = info.kind === 'pug' && stageOf(info.from).id !== stageOf(info.to).id;
  const p = info.kind === 'pug' ? PUG_BY_ID[info.id] : null;
  return (
    <div className="modal-backdrop get-backdrop" onClick={onClose}>
      <div className="modal levelup-modal" onClick={onClose}>
        <div className="get-rays" />
        <div className="lu-title">LEVEL UP!</div>
        <div className="lu-art">
          {p ? <PugArt coat={p.coat} hat={p.hat} acc={p.acc} mood={info.to >= 10 ? 'wink' : 'happy'} framed /> : <PugFace variant="black" mood="happy" />}
        </div>
        <div className="lu-who">{p ? p.name : 'あなた'}</div>
        <div className="lu-levels"><span>Lv.{info.from}</span><b>→</b><strong>Lv.{info.to}</strong></div>
        {info.kind === 'player' && <p className="lu-bonus">🐾 パグポイント +{ups * LEVELUP_PP}</p>}
        {stageChanged && <p className="lu-bonus">✨ {stageOf(info.to).name}に成長した！</p>}
        {newMilestones.map((m) => <p key={m.key} className="lu-bonus">🎁 {m.label}が解放された！</p>)}
        <p className="get-tap">タップしてとじる</p>
      </div>
    </div>
  );
}
