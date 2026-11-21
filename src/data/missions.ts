/**
 * デイリー・ウィークリー・イベントのミッションとログインボーナス（すべて通信なしで動く）
 * 期間限定イベントは EVENTS に1件足すだけで追加できる（日付は端末のローカル日付で判定）。
 */

/** ミッションを進めるできごと */
export type MissionEvent = 'game' | 'win' | 'corner' | 'cpu' | 'challengeClear' | 'cupEntry' | 'cupWin' | 'pet' | 'hardWin';

export interface Mission {
  id: string;
  label: string;
  event: MissionEvent;
  goal: number;
  coins: number;
  pp: number;
  exp: number;
}

// prettier-ignore
export const DAILY: Mission[] = [
  { id: 'd-game',   label: '1回対局する',           event: 'game',   goal: 1, coins: 30, pp: 0, exp: 20 },
  { id: 'd-win',    label: '1回勝利する',           event: 'win',    goal: 1, coins: 50, pp: 0, exp: 30 },
  { id: 'd-corner', label: '角を獲得する',          event: 'corner', goal: 1, coins: 30, pp: 0, exp: 20 },
  { id: 'd-cpu',    label: 'CPU に挑戦する',        event: 'cpu',    goal: 1, coins: 30, pp: 0, exp: 20 },
  { id: 'd-pet',    label: 'パグをなでる',          event: 'pet',    goal: 1, coins: 20, pp: 0, exp: 10 },
];
/** デイリーを全部達成したときのボーナス */
export const DAILY_COMPLETE = { coins: 50, pp: 2 };

// prettier-ignore
export const WEEKLY: Mission[] = [
  { id: 'w-game',      label: '10回対局する',            event: 'game',           goal: 10, coins: 200, pp: 3, exp: 100 },
  { id: 'w-win',       label: '5回勝利する',             event: 'win',            goal: 5,  coins: 250, pp: 3, exp: 120 },
  { id: 'w-challenge', label: 'チャレンジを5つクリア',    event: 'challengeClear', goal: 5,  coins: 300, pp: 5, exp: 150 },
  { id: 'w-cup',       label: 'パグカップに出場する',     event: 'cupEntry',       goal: 1,  coins: 150, pp: 2, exp: 80 },
];

export interface GameEvent {
  id: string;
  name: string;
  desc: string;
  /** 開始・終了日（YYYY-MM-DD、両端を含む） */
  from: string;
  to: string;
  /** 期間中の対局コイン倍率 */
  coinRate: number;
  missions: Mission[];
  color: string;
  icon: string;
}

// prettier-ignore
export const EVENTS: GameEvent[] = [
  {
    id: 'release-2026', name: 'PUG REVERSI リリース記念まつり', icon: '🎉', color: '#f2557a',
    desc: '期間中は対局でもらえるコインが1.5倍！ 記念ミッションも開催中。',
    from: '2026-11-21', to: '2026-12-13', coinRate: 1.5,
    missions: [
      { id: 'e-rel-game', label: '期間中に20回対局する', event: 'game', goal: 20, coins: 500, pp: 10, exp: 200 },
      { id: 'e-rel-hard', label: '期間中に HARD に3勝する', event: 'hardWin', goal: 3, coins: 800, pp: 15, exp: 300 },
    ],
  },
  {
    id: 'winter-2026', name: '冬のパグまつり', icon: '⛄', color: '#4f7fd6',
    desc: '雪のお庭でパグたちと遊ぼう。対局コイン1.2倍。',
    from: '2026-12-20', to: '2027-01-10', coinRate: 1.2,
    missions: [
      { id: 'e-win-win', label: '期間中に10回勝利する', event: 'win', goal: 10, coins: 600, pp: 10, exp: 250 },
      { id: 'e-win-cup', label: '期間中にパグカップで優勝する', event: 'cupWin', goal: 1, coins: 600, pp: 10, exp: 250 },
    ],
  },
];

/** ログインボーナス（7日で1周。途中で1日あくと1日目から） */
export const LOGIN_REWARDS: { coins: number; pp: number }[] = [
  { coins: 50, pp: 0 }, { coins: 80, pp: 0 }, { coins: 100, pp: 1 }, { coins: 120, pp: 0 },
  { coins: 150, pp: 1 }, { coins: 200, pp: 0 }, { coins: 300, pp: 5 },
];

export const activeEvents = (day: string) => EVENTS.filter((e) => e.from <= day && day <= e.to);
