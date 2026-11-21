import { summarize, winRateTrend } from '../core/achievements';
import { LineChart, BarChart } from '../components/Charts';
import type { SaveData } from '../store/save';

const LV: Record<string, string> = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
const fmtSec = (s: number) => (s ? `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒` : '—');
const fmtDay = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export function StatsScreen({ save, onBack }: { save: SaveData; onBack: () => void }) {
  const s = summarize(save);
  const trend = winRateTrend(save.history).slice(-100);
  const recent = save.history.slice(-10).reverse();
  const tiles: [string, string][] = [
    ['総対局数', `${s.games}`], ['勝利', `${s.wins}`], ['敗北', `${s.losses}`], ['引き分け', `${s.draws}`],
    ['勝率', `${s.winRate}%`], ['最大連勝', `${s.bestStreak}`], ['平均対局時間', fmtSec(s.avgSec)], ['平均駒数', s.avgDiscs ? `${s.avgDiscs}` : '—'],
    ['チャレンジクリア', `${s.stagesCleared}面（のべ${s.challengeClears}回）`], ['大会優勝', `${s.cupWins}回`],
    ['累計コイン', s.earnedCoins.toLocaleString()], ['累計パグポイント', s.earnedPP.toLocaleString()],
  ];
  return (
    <div className="screen stats-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="もどる">‹</button>
        <div className="topbar-title">戦績・統計</div>
        <span className="icon-spacer" />
      </header>
      <section className="stat-tiles">
        {tiles.map(([k, v]) => <div key={k} className="stat-tile"><small>{k}</small><b>{v}</b></div>)}
      </section>
      <p className="muted small">勝率は CPU 戦（ひとりであそぶ・チャレンジ・大会）の成績です。ふたりであそぶは対局数だけに数えます。</p>

      <section className="chart-card">
        <h4>勝率の推移 <small>直近10局の平均・最新{trend.length}局</small></h4>
        <LineChart points={trend.map((p) => ({ x: p.i, y: p.rate, label: `${p.i}局目（${fmtDay(p.t)}）` }))} xLabel="局" />
      </section>

      <section className="chart-card">
        <h4>CPU の強さ別の勝率</h4>
        <BarChart bars={s.byLevel.map((l) => ({ label: LV[l.level], value: l.rate, sub: `${l.wins}勝 / ${l.games}局` }))} />
        <table className="mini-table">
          <thead><tr><th>強さ</th><th>対局</th><th>勝利</th><th>勝率</th></tr></thead>
          <tbody>{s.byLevel.map((l) => <tr key={l.level}><td>{LV[l.level]}</td><td>{l.games}</td><td>{l.wins}</td><td>{l.rate}%</td></tr>)}</tbody>
        </table>
      </section>

      <section className="chart-card">
        <h4>最近の対局</h4>
        {recent.length === 0 ? <p className="muted">まだ対局していません。</p> : (
          <ul className="recent-list">
            {recent.map((g, i) => (
              <li key={i} className={`res-${g.r}`}>
                <span className="res-badge">{g.m === '2p' ? (g.r === 'w' ? '黒勝' : g.r === 'l' ? '白勝' : '分') : g.r === 'w' ? '勝' : g.r === 'l' ? '負' : '分'}</span>
                <span>{g.m === '2p' ? 'ふたり' : LV[g.l]}</span>
                <b>{g.my} - {g.op}</b>
                <small>{fmtDay(g.t)}{g.sec ? `・${fmtSec(g.sec)}` : ''}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
