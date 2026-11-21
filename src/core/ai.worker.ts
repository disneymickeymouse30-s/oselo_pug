/// <reference lib="webworker" />
import { chooseMove, hintMove, type Difficulty } from './ai';
import type { Board, Player } from './othello';

export interface AIRequest {
  id: number;
  kind: 'move' | 'hint';
  board: Board;
  player: Player;
  level: Difficulty;
}

self.onmessage = (e: MessageEvent<AIRequest>) => {
  const { id, kind, board, player, level } = e.data;
  const move = kind === 'hint' ? hintMove(board, player) : chooseMove(board, player, level);
  (self as unknown as Worker).postMessage({ id, move });
};
