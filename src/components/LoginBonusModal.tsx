import { LOGIN_REWARDS } from '../data/missions';
import { Coins, PP } from './Status';
import { PugFace } from './PugFace';

/** ログインボーナス（7日カレンダー） */
export function LoginBonusModal({ dayIndex, streak, onClaim }: { dayIndex: number; streak: number; onClaim: () => void }) {
  return (
    <div className="modal-backdrop get-backdrop">
      <div className="modal login-modal">
        <div className="get-rays" />
        <div className="lu-title small">ログインボーナス</div>
        <div className="login-pug"><PugFace variant="white" mood="happy" /></div>
        <p className="muted">{streak}日連続ログイン中！</p>
        <div className="login-cal">
          {LOGIN_REWARDS.map((r, i) => (
            <div key={i} className={`login-day ${i < dayIndex ? 'got' : i === dayIndex ? 'today' : ''} ${i === 6 ? 'big' : ''}`}>
              <small>{i + 1}日目</small>
              <Coins n={r.coins} />
              {r.pp > 0 && <PP n={r.pp} />}
              {i < dayIndex && <span className="stamp">🐾</span>}
            </div>
          ))}
        </div>
        <button className="btn primary wide" onClick={onClaim}>受け取る！</button>
      </div>
    </div>
  );
}
