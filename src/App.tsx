import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { BLACK } from './core/othello';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen, type GameConfig, type ResultPanel } from './screens/GameScreen';
import { LoginBonusModal } from './components/LoginBonusModal';
import { autoBackup } from './store/backup';
import { usePWA, applyUpdate } from './services/pwa';
import { checkAchievements } from './core/achievements';
import { ACH_BY_ID } from './data/achievements';
import { STAGES, STAGE_BY_ID, describeObjective, type Stage } from './data/challenges';
import { CUP_BY_ID, ROUND_NAMES, humanColorFor } from './data/cups';
import { PUG_BY_ID } from './data/pugs';
import {
  recordStage, combineSeries, startCup, recordCupMatch, loginStatus, claimLogin, type PlayDetail,
} from './core/modes';
import { useSettings } from './store/settings';
import { useSave, type SaveData } from './store/save';
import { setSoundEnabled } from './services/sound';
import { playMusic, setMusicEnabled, type TrackId } from './services/music';
import { recordGame, unlockAll, buyPug, buyItem, type GameResult } from './core/progress';
import { BG_BY_ID, boardVars } from './data/items';
import { PugFace } from './components/PugFace';

/** 対局の目的（チャレンジ・大会） */
// よく使うホーム・対局以外の画面は、開いたときに読み込む（起動を軽くする）
const ZukanScreen = lazy(() => import('./screens/ZukanScreen').then((m) => ({ default: m.ZukanScreen })));
const DressScreen = lazy(() => import('./screens/DressScreen').then((m) => ({ default: m.DressScreen })));
const IkuseiScreen = lazy(() => import('./screens/IkuseiScreen').then((m) => ({ default: m.IkuseiScreen })));
const GardenScreen = lazy(() => import('./screens/GardenScreen').then((m) => ({ default: m.GardenScreen })));
const ChallengeScreen = lazy(() => import('./screens/ChallengeScreen').then((m) => ({ default: m.ChallengeScreen })));
const CupScreen = lazy(() => import('./screens/CupScreen').then((m) => ({ default: m.CupScreen })));
const MissionScreen = lazy(() => import('./screens/MissionScreen').then((m) => ({ default: m.MissionScreen })));
const AchievementScreen = lazy(() => import('./screens/AchievementScreen').then((m) => ({ default: m.AchievementScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));

type PlayCtx =
  | { kind: 'free' }
  | { kind: 'challenge'; stageId: string; round: number; details: PlayDetail[] }
  | { kind: 'cup'; cupId: string; round: number };

type Route =
  | { name: 'home' }
  | { name: 'game'; config: GameConfig; key: number; ctx: PlayCtx }
  | { name: 'challenge' }
  | { name: 'cup' }
  | { name: 'missions' }
  | { name: 'achievements' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'profile'; back: 'home' | 'achievements' }
  | { name: 'zukan' }
  | { name: 'dress' }
  | { name: 'ikusei'; id?: string; back: 'home' | 'zukan' }
  | { name: 'garden' };

// 起動時：最初から使えるパグ・アイテムを付与（新しいデータ定義が増えた場合もここで解放される）
const initSave = (s: SaveData) => unlockAll(s, new Date()).save;

const markSeen = (rec: SaveData['pugs'], id?: string) =>
  Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, id === undefined || k === id ? { ...v, seen: true } : v]));

export default function App() {
  const [settings, updateSettings] = useSettings();
  const [save, updateSave] = useSave(initSave);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [lastConfig, setLastConfig] = useState<GameConfig>({ mode: '1p', level: 'normal', human: BLACK });

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound]);
  useEffect(() => setMusicEnabled(settings.music), [settings.music]);
  // 画面ごとの BGM
  useEffect(() => {
    const track: TrackId =
      route.name === 'game' ? (route.ctx.kind === 'cup' ? 'cup' : 'game')
        : route.name === 'cup' ? 'cup'
          : route.name === 'garden' ? 'garden'
            : 'home';
    playMusic(track);
  }, [route]);

  const pwa = usePWA();
  const [hideUpdate, setHideUpdate] = useState(false);

  // 自動バックアップ（変更が落ち着いてから、1日1回分を端末内に保存）
  useEffect(() => {
    if (!save) return;
    const t = window.setTimeout(() => void autoBackup(save), 4000);
    return () => window.clearTimeout(t);
  }, [save]);

  // 実績：セーブデータが変わるたびに判定し、解除したらお知らせ
  const [achToast, setAchToast] = useState<string[]>([]);
  useEffect(() => {
    if (!save) return;
    const r = checkAchievements(save, new Date());
    if (r.newly.length) {
      saveRef.current = r.save;
      updateSave(() => r.save);
      setAchToast((q) => [...q, ...r.newly].slice(-6));
    }
  }, [save]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!achToast.length) return;
    const t = window.setTimeout(() => setAchToast((q) => q.slice(1)), 2600);
    return () => window.clearTimeout(t);
  }, [achToast]);

  // 背景の着せ替え
  useEffect(() => {
    if (save) document.body.style.background = BG_BY_ID[save.outfit.bg]?.css ?? '';
  }, [save?.outfit.bg]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveRef = useRef(save);
  saveRef.current = save;
  const commit = useCallback((s: SaveData) => { saveRef.current = s; updateSave(() => s); }, [updateSave]);

  // ---- チャレンジ ----
  const playStage = useCallback((stage: Stage, round = 0, details: PlayDetail[] = []) => {
    const n = stage.series?.length ?? 1;
    const config: GameConfig = {
      mode: '1p',
      level: stage.series ? stage.series[round] : stage.level,
      human: stage.human,
      start: stage.series ? undefined : stage.start,
      title: `STAGE ${stage.no}${n > 1 ? `（${round + 1}/${n}戦目）` : ''}`,
      goals: [stage.clear.map(describeObjective).join('・')],
    };
    setRoute({ name: 'game', config, key: Date.now(), ctx: { kind: 'challenge', stageId: stage.id, round, details } });
  }, []);

  // ---- パグカップ ----
  const playCupRound = useCallback(() => {
    const run = saveRef.current?.cupRun;
    if (!run) { setRoute({ name: 'cup' }); return; }
    const cup = CUP_BY_ID[run.cupId];
    const m = cup.matches[run.round];
    const config: GameConfig = {
      mode: '1p', level: m.level, human: humanColorFor(cup, run.round),
      opponent: { pug: m.pug, name: PUG_BY_ID[m.pug].name },
      title: `${cup.name}・${ROUND_NAMES(cup.matches.length, run.round)}`,
      strict: true,
      exitWarning: '大会の途中でやめると、この試合は負けになり敗退します。',
    };
    setRoute({ name: 'game', config, key: Date.now(), ctx: { kind: 'cup', cupId: run.cupId, round: run.round } });
  }, []);

  const makeOnGameEnd = (ctx: PlayCtx) => (r: GameResult, d: PlayDetail) => {
    const res = recordGame(saveRef.current!, r);
    let s = res.save;
    let panel: ResultPanel | undefined;
    if (ctx.kind === 'challenge') {
      const stage = STAGE_BY_ID[ctx.stageId];
      const details = [...ctx.details, d];
      const n = stage.series?.length ?? 1;
      const toList = { label: 'ステージ一覧へ', run: () => setRoute({ name: 'challenge' }) };
      if (stage.series && d.won && ctx.round + 1 < n) {
        panel = {
          title: `${ctx.round + 1}勝目！`, lines: [`のこり ${n - ctx.round - 1} 試合。このまま勝ち続けよう！`],
          primary: { label: '次の試合へ', run: () => playStage(stage, ctx.round + 1, details) }, secondary: toList, noRetry: true,
        };
      } else {
        const rec = recordStage(s, stage.id, stage.series ? combineSeries(details) : d, r.endedAt);
        s = rec.save;
        const o = rec.outcome;
        const next = STAGES[stage.no];
        const lines: string[] = [];
        if (o.firstClear) lines.push(`初クリア報酬：${o.coins}コイン・${o.exp}EXP`);
        if (o.pp > 0) lines.push(`新しい★ ＋${o.pp}PP`);
        if (!o.cleared) lines.push(stage.series ? '1回でも負けると最初からやり直しです' : `目標：${stage.clear.map(describeObjective).join('・')}`);
        panel = {
          title: o.cleared ? (o.firstClear ? 'ステージクリア！' : 'クリア！') : stage.series ? '連戦失敗…' : 'クリアならず…',
          lines,
          stars: { got: o.stars, checks: o.checks, labels: ['クリア', describeObjective(stage.star2), describeObjective(stage.star3)] },
          primary: o.cleared && next ? { label: '次のステージへ', run: () => playStage(next) } : { label: 'もう一度挑戦', run: () => playStage(stage) },
          secondary: toList,
          noRetry: true,
        };
      }
    } else if (ctx.kind === 'cup') {
      const cup = CUP_BY_ID[ctx.cupId];
      const result = d.won ? 'win' : d.margin === 0 ? 'draw' : 'lose';
      const rec = recordCupMatch(s, result, r.endedAt);
      s = rec.save;
      const o = rec.outcome;
      const toCup = { label: 'トーナメント表へ', run: () => setRoute({ name: 'cup' }) };
      if (o.kind === 'next') {
        panel = { title: '勝ち進んだ！', lines: [`次は ${ROUND_NAMES(cup.matches.length, o.round)}`], primary: { label: '次の試合へ', run: playCupRound }, secondary: toCup, noRetry: true };
      } else if (o.kind === 'replay') {
        panel = { title: '引き分け！', lines: ['この試合をやり直します'], primary: { label: '再試合', run: playCupRound }, secondary: toCup, noRetry: true };
      } else if (o.kind === 'champion') {
        panel = { title: `🏆 ${cup.name} 優勝！`, lines: [`賞金：${o.coins}コイン・${o.pp}PP`], primary: { label: '大会一覧へ', run: () => setRoute({ name: 'cup' }) }, noRetry: true };
      } else {
        panel = { title: '敗退…', lines: ['また挑戦しよう！ 何度でも出場できます'], primary: { label: '大会一覧へ', run: () => setRoute({ name: 'cup' }) }, noRetry: true };
      }
    }
    commit(s);
    return { unlocked: res.unlocked, rewards: res.rewards, panel };
  };

  /** 失敗理由を返す操作（購入など）の共通処理 */
  const act = (fn: (s: SaveData) => { ok: true; save: SaveData } | { ok: false; reason: string }): string | null => {
    const cur = saveRef.current;
    if (!cur) return '読み込み中です';
    const r = fn(cur);
    if (!r.ok) return r.reason;
    saveRef.current = r.save;
    updateSave(() => r.save);
    return null;
  };

  const outfits = useMemo(() => save && { black: save.outfit.black, white: save.outfit.white }, [save]);
  const themeStyle = useMemo(() => (save ? boardVars(save.outfit.board) : {}) as CSSProperties, [save]);

  if (!save || !outfits) {
    return (
      <div className="app loading">
        <div className="loading-pug"><PugFace variant="white" mood="sleep" /></div>
      </div>
    );
  }

  const home = () => setRoute({ name: 'home' });
  const login = route.name === 'home' ? loginStatus(save, new Date()) : null;

  return (
    <div className={`app ${settings.animation ? '' : 'reduce-motion'}`} style={themeStyle}>
      <Suspense fallback={<div className="app loading"><div className="loading-pug"><PugFace variant="white" mood="happy" /></div></div>}>
      {route.name === 'home' && (
        <HomeScreen
          lastConfig={lastConfig}
          save={save}
          onNav={(to) => setRoute(to === 'ikusei' ? { name: 'ikusei', back: 'home' } : to === 'profile' ? { name: 'profile', back: 'home' } : { name: to } as Route)}
          onStart={(config) => { setLastConfig(config); setRoute({ name: 'game', config, key: Date.now(), ctx: { kind: 'free' } }); }}
        />
      )}
      {login?.available && (
        <LoginBonusModal dayIndex={login.dayIndex} streak={login.streak} onClaim={() => { act((s) => claimLogin(s, new Date())); }} />
      )}
      {route.name === 'challenge' && <ChallengeScreen save={save} onBack={home} onPlay={(st) => playStage(st)} />}
      {route.name === 'cup' && (
        <CupScreen save={save} onBack={home}
          onEnter={(id) => act((s) => startCup(s, id, new Date()))}
          onPlayRound={playCupRound} />
      )}
      {route.name === 'missions' && <MissionScreen save={save} onBack={home} onChange={commit} />}
      {route.name === 'achievements' && (
        <AchievementScreen save={save} onBack={home} onChange={commit} onProfile={() => setRoute({ name: 'profile', back: 'achievements' })} />
      )}
      {route.name === 'profile' && (
        <ProfileScreen save={save} onChange={commit} onBack={() => setRoute(route.back === 'achievements' ? { name: 'achievements' } : { name: 'home' })} />
      )}
      {route.name === 'stats' && <StatsScreen save={save} onBack={home} />}
      {route.name === 'settings' && (
        <SettingsScreen save={save} settings={settings} onSettings={updateSettings} onBack={home}
          onRestore={(restored, st) => {
            void autoBackup(save).then(() => {
              commit(restored);
              if (st) updateSettings(st);
              setRoute({ name: 'home' });
            });
          }} />
      )}
      {pwa.updateReady && !hideUpdate && route.name !== 'game' && route.name !== 'settings' && (
        <div className="update-bar">
          <span>✨ 新しいバージョンがあります</span>
          <button className="btn small primary" onClick={applyUpdate}>更新</button>
          <button className="ic-close" aria-label="あとで" onClick={() => setHideUpdate(true)}>×</button>
        </div>
      )}
      </Suspense>
      {achToast.length > 0 && (
        <button className="ach-toast" key={achToast[0]} onClick={() => setRoute({ name: 'achievements' })}>
          <span>🏅</span><span><small>実績解除！</small><b>{ACH_BY_ID[achToast[0]]?.name}</b></span>
        </button>
      )}
      {route.name === 'game' && (
        <GameScreen
          key={route.key}
          config={route.config}
          settings={settings}
          onSettings={updateSettings}
          onExit={(finished) => {
            const ctx = route.ctx;
            if (ctx.kind === 'cup') {
              if (!finished) act((s) => ({ ok: true, save: recordCupMatch(s, 'forfeit', new Date()).save }));
              setRoute({ name: 'cup' });
            } else if (ctx.kind === 'challenge') setRoute({ name: 'challenge' });
            else home();
          }}
          outfits={outfits}
          marker={save.outfit.marker}
          effect={save.outfit.effect}
          onGameEnd={makeOnGameEnd(route.ctx)}
        />
      )}
      {route.name === 'zukan' && (
        <ZukanScreen
          save={save}
          onBack={home}
          onSeen={(id) => updateSave((s) => ({ ...s, pugs: markSeen(s.pugs, id) }))}
          onFavorite={(id) => updateSave((s) => ({ ...s, favoritePug: id }))}
          onRaise={(id) => setRoute({ name: 'ikusei', id, back: 'zukan' })}
          onBuy={(id) => act((s) => buyPug(s, id, new Date()))}
        />
      )}
      {route.name === 'dress' && (
        <DressScreen
          save={save}
          onBack={() => { updateSave((s) => ({ ...s, boards: markSeen(s.boards), bgs: markSeen(s.bgs) })); home(); }}
          onApply={(o) => updateSave((s) => ({ ...s, outfit: o }))}
          onSaveFavorites={(f) => updateSave((s) => ({ ...s, favorites: f }))}
          onSeenItems={() => updateSave((s) => ({ ...s, boards: markSeen(s.boards), bgs: markSeen(s.bgs) }))}
          onBuy={(kind, id) => act((s) => buyItem(s, kind, id, new Date()))}
        />
      )}
      {route.name === 'garden' && (
        <GardenScreen
          save={save}
          animation={settings.animation}
          onBack={home}
          onChange={(s) => { saveRef.current = s; updateSave(() => s); }}
        />
      )}
      {route.name === 'ikusei' && (
        <IkuseiScreen
          save={save}
          initialId={route.id}
          onBack={() => setRoute(route.back === 'zukan' ? { name: 'zukan' } : { name: 'home' })}
          onChange={(s) => { saveRef.current = s; updateSave(() => s); }}
        />
      )}
    </div>
  );
}
