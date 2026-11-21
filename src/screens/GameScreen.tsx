import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BLACK, WHITE, newGame, playMove, legalMoves, countPieces, winnerOf, passedAfterLastMove,
  rowOf, colOf, type GameState, type Player,
} from '../core/othello';
import type { Difficulty } from '../core/ai';
import { requestAI } from '../services/aiClient';
import { sfx } from '../services/sound';
import { BoardView } from '../components/BoardView';
import { PugFace } from '../components/PugFace';
import type { Settings } from '../store/settings';
import type { PieceOutfit } from '../store/save';
import type { GameResult, Unlocked, Rewards } from '../core/progress';
import { LevelUpModal, type LevelUpInfo } from '../components/LevelUpModal';
import { Coins, PP } from '../components/Status';
import { PUG_BY_ID } from '../data/pugs';
import { GetModal } from '../components/GetModal';
import { PugArt } from '../components/PugFace';
import type { StartPosition } from '../data/challenges';
import type { PlayDetail } from '../core/modes';
import { EFFECTS } from '../data/items';

export interface GameConfig {
  mode: '1p' | '2p';
  level: Difficulty;
  /** 1人モードでのプレイヤーの色 */
  human: Player;
  /** 特定の盤面から始める（チャレンジ） */
  start?: StartPosition;
  /** 対戦相手のパグ（大会） */
  opponent?: { pug: string; name: string };
  /** 画面上部のタイトル */
  title?: string;
  /** 目標（チャレンジ）の表示 */
  goals?: string[];
  /** 大会など：ヒント・1手戻す・さいしょから を使えない */
  strict?: boolean;
  /** 途中で戻るときの確認メッセージ（大会は負け扱い） */
  exitWarning?: string;
}

/** 結果画面に出す追加情報（チャレンジ・大会） */
export interface ResultPanel {
  title: string;
  lines: string[];
  stars?: { got: number; labels: string[]; checks: boolean[] };
  primary?: { label: string; run: () => void };
  secondary?: { label: string; run: () => void };
  /** 「もう一回あそぶ」を出さない */
  noRetry?: boolean;
}

const startState = (c: GameConfig): GameState =>
  c.start ? { board: c.start.board.slice(), turn: c.start.turn, lastMove: null, moves: [], over: false } : newGame();

const LEVEL_LABEL: Record<Difficulty, string> = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
const NAME: Record<Player, string> = { [BLACK]: '黒パグ', [WHITE]: '白パグ' };

export function GameScreen({ config, settings, onSettings, onExit, outfits, onGameEnd, marker = 'paw', effect = 'confetti' }: {
  config: GameConfig;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  /** finished = 終局済みかどうか */
  onExit: (finished: boolean) => void;
  outfits: { black: PieceOutfit; white: PieceOutfit };
  /** 置ける場所の目印・勝利演出 */
  marker?: string;
  effect?: string;
  /** 終局時に1度だけ呼ばれる。新しく手に入ったものを返す */
  onGameEnd: (r: GameResult, d: PlayDetail) => { unlocked: Unlocked; rewards: Rewards; panel?: ResultPanel };
}) {
  const [history, setHistory] = useState<GameState[]>(() => [startState(config)]);
  const [panel, setPanel] = useState<ResultPanel | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const usedUndoRef = useRef(false);
  const usedHintRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [flipDelay, setFlipDelay] = useState<Map<number, number>>(new Map());
  const versionRef = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);
  const moveSeqRef = useRef(0);
  const recordedRef = useRef(false);
  const resultForRef = useRef<GameState | null>(null);
  const [unlocked, setUnlocked] = useState<Unlocked | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [levelUps, setLevelUps] = useState<LevelUpInfo[]>([]);

  const cur = history[history.length - 1];
  const isCpu = (p: Player) => config.mode === '1p' && p !== config.human;
  const cpuTurn = !cur.over && isCpu(cur.turn);
  const legal = useMemo(() => new Set(cur.over ? [] : legalMoves(cur.board, cur.turn)), [cur]);
  const counts = countPieces(cur.board);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  const curRef = useRef(cur);
  curRef.current = cur;

  const doMove = useCallback((pos: number) => {
    const state = curRef.current;
    const next = playMove(state, pos);
    if (!next) return;
    moveSeqRef.current++;
    curRef.current = next; // 連打で同じ局面に二重に打たないように
    setHistory((h) => (h[h.length - 1] === state ? [...h, next] : h));
    // 置いた場所から近い順に反転させる
    const delays = new Map<number, number>();
    const flipped = next.lastMove!.flipped;
    for (const f of flipped) {
      const d = Math.max(Math.abs(rowOf(f) - rowOf(pos)), Math.abs(colOf(f) - colOf(pos)));
      delays.set(f, settings.animation ? 60 + (d - 1) * 80 : 0);
    }
    setFlipDelay(delays);
    setHint(null);
    sfx.place();
    sfx.flip(flipped.length);
    const passed = passedAfterLastMove(next);
    if (passed) {
      const who = config.mode === '1p' ? (passed === config.human ? 'あなた' : 'CPU') : NAME[passed];
      window.setTimeout(() => { flash(`${who}は置ける場所がないのでパス！`); sfx.bark(); }, 350);
    }
  }, [config, flash, settings.animation]);

  // CPU の手番
  useEffect(() => {
    if (!cpuTurn) return;
    const v = ++versionRef.current;
    setThinking(true);
    const started = Date.now();
    requestAI('move', cur.board, cur.turn, config.level).then((m) => {
      const wait = Math.max(0, (settings.animation ? 650 : 250) - (Date.now() - started));
      window.setTimeout(() => {
        if (versionRef.current !== v) return; // 1手戻す・やり直しで中断された
        setThinking(false);
        if (m >= 0) doMove(m);
      }, wait);
    });
  }, [cur, cpuTurn, config.level, doMove, settings.animation]);

  // 終局：結果を記録して、リザルト → 入手演出の順に表示
  useEffect(() => {
    if (!cur.over || resultForRef.current === cur) return;
    resultForRef.current = cur;
    if (!recordedRef.current) {
      recordedRef.current = true;
      const { black, white } = countPieces(cur.board);
      const humanCell = config.human;
      const corners = [0, 7, 56, 63].filter((c) => cur.board[c] === humanCell).length;
      let worst = 0;
      for (const st of history) {
        const c = countPieces(st.board);
        const lead = humanCell === BLACK ? c.black - c.white : c.white - c.black;
        worst = Math.min(worst, lead);
      }
      const mine = humanCell === BLACK ? black : white;
      const theirs = humanCell === BLACK ? white : black;
      const myMoves = cur.moves.filter((m) => m.player === humanCell && m.pos !== null);
      const detail: PlayDetail = {
        won: mine > theirs, margin: mine - theirs, humanCorners: corners, humanWorstLead: worst,
        humanMaxFlip: Math.max(0, ...myMoves.map((m) => m.flipped.length)),
        humanTotalFlips: myMoves.reduce((a, m) => a + m.flipped.length, 0),
        humanMoves: myMoves.length, opponentDiscs: theirs,
        usedUndo: usedUndoRef.current, usedHint: usedHintRef.current,
      };
      const got = onGameEnd({
        mode: config.mode, level: config.level, human: config.human, black, white,
        humanCorners: corners, humanWorstLead: worst, endedAt: new Date(), durationMs: Date.now() - startedAtRef.current,
      }, detail);
      setRewards(got.rewards);
      setPanel(got.panel ?? null);
      const lu: LevelUpInfo[] = [];
      const { player, partner } = got.rewards;
      if (player.to > player.from) lu.push({ kind: 'player', from: player.from, to: player.to });
      if (partner.to > partner.from) lu.push({ kind: 'pug', id: partner.id, from: partner.from, to: partner.to });
      const u = got.unlocked;
      window.setTimeout(() => {
        setLevelUps(lu);
        if (u.pugs.length || u.boards.length || u.bgs.length) setUnlocked(u);
      }, settings.animation ? 2200 : 900);
    }
    window.setTimeout(() => {
      if (resultForRef.current !== cur) return; // 1手戻す・やり直し済み
      setShowResult(true);
      const w = winnerOf(cur.board);
      if (config.mode === '1p' && w !== 'draw' && w !== config.human) sfx.lose();
      else sfx.win();
    }, settings.animation ? 900 : 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);

  const onCell = (i: number) => {
    if (cpuTurn || cur.over || !legal.has(i)) return;
    doMove(i);
  };

  // 1手戻す（1人モードではCPUの手もまとめて戻し、自分の番まで戻る）
  const canUndo = config.mode === '2p'
    ? history.length > 1
    : history.slice(0, -1).some((s) => s.turn === config.human && !s.over);
  const undo = () => {
    if (!canUndo) return;
    versionRef.current++;
    moveSeqRef.current++;
    usedUndoRef.current = true;
    setThinking(false);
    setHint(null);
    setShowResult(false);
    setFlipDelay(new Map());
    setHistory((h) => {
      if (config.mode === '2p') return h.slice(0, -1);
      let i = h.length - 2;
      while (i > 0 && h[i].turn !== config.human) i--;
      return h.slice(0, i + 1);
    });
    sfx.tap();
  };

  const restart = () => {
    versionRef.current++;
    moveSeqRef.current++;
    recordedRef.current = false;
    resultForRef.current = null;
    setUnlocked(null);
    setRewards(null);
    setPanel(null);
    setLevelUps([]);
    setThinking(false);
    setHint(null);
    setShowResult(false);
    setFlipDelay(new Map());
    usedUndoRef.current = false;
    usedHintRef.current = false;
    startedAtRef.current = Date.now();
    setHistory([startState(config)]);
  };

  const askHint = () => {
    if (cpuTurn || cur.over) return;
    const v = versionRef.current;
    const seq = moveSeqRef.current;
    usedHintRef.current = true;
    sfx.hint();
    requestAI('hint', cur.board, cur.turn, 'hard').then((m) => {
      if (versionRef.current === v && moveSeqRef.current === seq && m >= 0) setHint(m);
    });
  };

  const playerLabel = (p: Player) =>
    config.mode === '2p' ? NAME[p] : p === config.human ? 'あなた' : config.opponent ? `${config.opponent.name}（${LEVEL_LABEL[config.level]}）` : `CPU ${LEVEL_LABEL[config.level]}`;
  const oppPug = config.opponent ? PUG_BY_ID[config.opponent.pug] : null;
  const exit = () => {
    if (!cur.over && config.exitWarning && history.length > 0) { setConfirmExit(true); return; }
    onExit(cur.over);
  };

  const turnText = cur.over
    ? 'しゅうりょう！'
    : config.mode === '2p'
      ? `${NAME[cur.turn]}の番`
      : cpuTurn ? 'CPU かんがえ中…' : 'あなたの番だよ';

  const winner = winnerOf(cur.board);
  const humanWon = config.mode === '1p' && winner === config.human;
  const resultTitle = winner === 'draw'
    ? 'ひきわけ！'
    : config.mode === '1p' ? (humanWon ? 'あなたの勝ち！' : 'CPUの勝ち…') : `${NAME[winner]}の勝ち！`;
  const moveCount = cur.moves.filter((m) => m.pos !== null).length;

  return (
    <div className="screen game-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={exit} aria-label="もどる">‹</button>
        <div className="topbar-title">
          {config.title ?? (config.mode === '1p' ? `ひとりであそぶ・${LEVEL_LABEL[config.level]}` : 'ふたりであそぶ')}
        </div>
        <button
          className="icon-btn"
          onClick={() => { const on = !(settings.sound || settings.music); onSettings({ sound: on, music: on }); }}
          aria-label={settings.sound || settings.music ? '音をオフ' : '音をオン'}
        >{settings.sound || settings.music ? '🔊' : '🔇'}</button>
      </header>

      <section className="players">
        {[BLACK, WHITE].map((p) => (
          <div key={p} className={`player-card ${!cur.over && cur.turn === p ? 'active' : ''} ${p === BLACK ? 'is-black' : 'is-white'}`}>
            <div className="player-avatar">
              {oppPug && p !== config.human ? (
                <PugArt coat={oppPug.coat} hat={oppPug.hat} acc={oppPug.acc}
                  mood={cur.over ? (winner === p ? 'happy' : winner === 'draw' ? 'normal' : 'sad') : thinking ? 'surprised' : 'normal'} framed />
              ) : (
                <PugFace
                  variant={p === BLACK ? 'black' : 'white'}
                  mood={cur.over ? (winner === p ? 'happy' : winner === 'draw' ? 'normal' : 'sad') : thinking && cur.turn === p ? 'surprised' : 'normal'}
                />
              )}
              {oppPug && <span className={`piece-dot ${p === BLACK ? 'b' : 'w'}`} />}
            </div>
            <div className="player-info">
              <div className="player-name">{playerLabel(p)}</div>
              <div className="player-count">{p === BLACK ? counts.black : counts.white}<small>こ</small></div>
            </div>
          </div>
        ))}
      </section>

      <div className={`turn-banner ${cur.turn === BLACK ? 'b' : 'w'} ${thinking ? 'thinking' : ''}`}>
        {turnText}
        {thinking && <span className="dots"><i /><i /><i /></span>}
      </div>

      {config.goals && config.goals.length > 0 && (
        <div className="goal-strip">🎯 {config.goals.join(' ／ ')}</div>
      )}

      <div className={`board-wrap ${settings.animation ? '' : 'no-anim'}`}>
        <BoardView
          board={cur.board}
          legal={legal}
          showLegal={settings.showLegal}
          hint={hint}
          lastPos={cur.lastMove?.pos ?? null}
          flipDelay={flipDelay}
          disabled={cpuTurn || cur.over}
          onCell={onCell}
          outfits={outfits}
          marker={marker}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>

      <div className="stats-row">
        <span>のこり <b>{counts.empty}</b> マス</span>
        <span>{moveCount} 手目</span>
        <label className="switch">
          <input type="checkbox" checked={settings.showLegal} onChange={(e) => onSettings({ showLegal: e.target.checked })} />
          <span>置ける場所</span>
        </label>
      </div>

      <nav className="action-bar">
        <button className="action" onClick={askHint} disabled={cpuTurn || cur.over || config.strict}>
          <span className="action-ico">💡</span>ヒント
        </button>
        <button className="action" onClick={undo} disabled={!canUndo || config.strict}>
          <span className="action-ico">↶</span>1手戻す
        </button>
        <button className="action" onClick={restart} disabled={config.strict}>
          <span className="action-ico">⟳</span>さいしょから
        </button>
      </nav>

      {showResult && (humanWon || (config.mode === '2p' && winner !== 'draw')) && settings.animation && <VictoryEffectLayer id={effect} />}
      {showResult && (
        <div className="modal-backdrop" onClick={() => setShowResult(false)}>
          <div className={`modal result ${humanWon || config.mode === '2p' ? 'win' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="result-pug">
              <PugFace
                variant={(config.mode === '1p' ? config.human : winner) === WHITE ? 'white' : 'black'}
                mood={winner === 'draw' ? 'surprised' : config.mode === '1p' && !humanWon ? 'sad' : 'happy'}
              />
            </div>
            <h2>{resultTitle}</h2>
            <div className="result-score">
              <span className="sb">黒 {counts.black}</span>
              <span className="vs">-</span>
              <span className="sw">白 {counts.white}</span>
            </div>
            {rewards && (
              <div className="reward-box">
                <div className="reward-main">
                  <span className="reward-exp">+{rewards.exp} EXP</span>
                  <Coins n={rewards.coins} />
                  {rewards.pp > 0 && <PP n={rewards.pp} />}
                </div>
                <div className="reward-notes">{rewards.notes.join('・')}</div>
                <div className="reward-partner">
                  🐶 {PUG_BY_ID[rewards.partner.id].name} +{rewards.partner.exp} EXP・親密度 +{rewards.partner.love}
                  {rewards.partner.to > rewards.partner.from && <b> Lv.{rewards.partner.to}！</b>}
                </div>
              </div>
            )}
            {panel && (
              <div className="panel-box">
                <div className="panel-title">{panel.title}</div>
                {panel.stars && (
                  <div className="stars-row">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={`star-item ${panel.stars!.checks[i] ? 'on' : ''}`}>
                        <span className="big-star">★</span><small>{panel.stars!.labels[i]}</small>
                      </div>
                    ))}
                  </div>
                )}
                {panel.lines.map((l) => <div key={l} className="panel-line">{l}</div>)}
              </div>
            )}
            <div className="modal-actions">
              {panel?.primary
                ? <button className="btn primary" onClick={panel.primary.run}>{panel.primary.label}</button>
                : !panel?.noRetry && <button className="btn primary" onClick={restart}>もう一回あそぶ</button>}
              {panel?.primary && !panel.noRetry && <button className="btn" onClick={restart}>もう一回あそぶ</button>}
              <button className="btn" onClick={() => setShowResult(false)}>盤面を見る</button>
              {panel?.secondary
                ? <button className="btn ghost" onClick={panel.secondary.run}>{panel.secondary.label}</button>
                : <button className="btn ghost" onClick={() => onExit(true)}>ホームへ</button>}
            </div>
          </div>
        </div>
      )}

      {confirmExit && (
        <div className="modal-backdrop" onClick={() => setConfirmExit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>対局をやめますか？</h3>
            <p>{config.exitWarning}</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmExit(false)}>つづける</button>
              <button className="btn ghost" onClick={() => onExit(false)}>やめる</button>
            </div>
          </div>
        </div>
      )}

      {levelUps.length > 0 ? (
        <LevelUpModal key={levelUps.length} info={levelUps[0]} onClose={() => setLevelUps((l) => l.slice(1))} />
      ) : (
        unlocked && <GetModal unlocked={unlocked} onClose={() => setUnlocked(null)} />
      )}
    </div>
  );
}


/** 勝ったときの演出（紙ふぶき・肉球・ハート・星・花火） */
export function VictoryEffectLayer({ id }: { id: string }) {
  const e = EFFECTS.find((x) => x.id === id) ?? EFFECTS[0];
  const colors = ['#f2557a', '#ffd968', '#4fb3e8', '#7cbf5e', '#a04fd6'];
  return (
    <div className={`victory-layer v-${e.id}`} aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} style={{
          left: `${(i * 37) % 100}%`,
          animationDelay: `${(i % 7) * 0.18}s`,
          animationDuration: `${2.2 + (i % 5) * 0.35}s`,
          color: colors[i % colors.length],
          fontSize: e.id === 'confetti' ? `${10 + (i % 3) * 4}px` : `${18 + (i % 3) * 6}px`,
        }}>{e.chars[i % e.chars.length]}</i>
      ))}
    </div>
  );
}
