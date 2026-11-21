import { playerExpToNext, PLAYER_MAX_LV, loveHearts, pugExpToNext, PUG_MAX_LV } from '../data/growth';
import type { SaveData, PugGrowth } from '../store/save';
import { TITLE_BY_ID } from '../data/achievements';

export function Coins({ n }: { n: number }) {
  return <span className="coin-chip"><i className="coin" />{n.toLocaleString()}</span>;
}
export function PP({ n }: { n: number }) {
  return <span className="pp-chip"><i className="paw-ico">🐾</i>{n.toLocaleString()}<small>PP</small></span>;
}

export function ExpBar({ cur, max, label }: { cur: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, (cur / max) * 100) : 100;
  return (
    <div className="exp-bar" aria-label={label ?? `経験値 ${cur}/${max}`}>
      <i style={{ width: `${pct}%` }} />
      <span>{max > 0 ? `${cur} / ${max}` : 'MAX'}</span>
    </div>
  );
}

export function Hearts({ love }: { love: number }) {
  const n = loveHearts(love);
  return (
    <span className="hearts" aria-label={`親密度 ${love}`}>
      {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < n ? 'on' : ''}>♥</i>)}
    </span>
  );
}

export function PugLevel({ g }: { g: PugGrowth }) {
  const max = g.lv >= PUG_MAX_LV ? 0 : pugExpToNext(g.lv);
  return <ExpBar cur={g.exp} max={max} />;
}

/** ホーム上部：プレイヤー名・レベル・経験値・通貨 */
export function StatusBar({ save, onName }: { save: SaveData; onName?: () => void }) {
  const { lv, exp } = save.player;
  const max = lv >= PLAYER_MAX_LV ? 0 : playerExpToNext(lv);
  return (
    <section className="status-bar">
      <div className="sb-left">
        <span className="lv-badge">Lv.{lv}</span>
        <div className="sb-name-wrap">
          <button className="sb-name" onClick={onName}>
            {save.title && <span className="sb-title">{TITLE_BY_ID[save.title]?.name}</span>}
            {save.playerName} <small>›</small>
          </button>
          <ExpBar cur={exp} max={max} />
        </div>
      </div>
      <div className="sb-money">
        <Coins n={save.wallet.coins} />
        <PP n={save.wallet.pp} />
      </div>
    </section>
  );
}
