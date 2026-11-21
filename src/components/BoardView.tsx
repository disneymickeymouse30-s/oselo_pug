import { memo } from 'react';
import { BLACK, EMPTY, WHITE, CELLS, colOf, rowOf, posLabel, type Board, type Cell } from '../core/othello';
import { PugFace, PawPrint, Marker } from './PugFace';
import type { PieceOutfit } from '../store/save';

interface Props {
  board: Board;
  legal: Set<number>;
  showLegal: boolean;
  hint: number | null;
  lastPos: number | null;
  /** 裏返った石 → 反転開始の遅延（ms） */
  flipDelay: Map<number, number>;
  disabled: boolean;
  onCell: (i: number) => void;
  outfits?: { black: PieceOutfit; white: PieceOutfit };
  /** 置ける場所の目印の形 */
  marker?: string;
}

const NO_OUTFIT: PieceOutfit = { hat: null, acc: null };
const DEFAULT_OUTFITS = { black: NO_OUTFIT, white: NO_OUTFIT };

export const Disc = memo(function Disc({ cell, delay, isNew, outfits }: {
  cell: Cell; delay: number; isNew: boolean; outfits: { black: PieceOutfit; white: PieceOutfit };
}) {
  if (cell === EMPTY) return null;
  return (
    <div className={`disc ${isNew ? 'disc-new' : ''}`}>
      <div className="disc-inner" style={{ transform: `rotateY(${cell === WHITE ? 180 : 0}deg)`, transitionDelay: `${delay}ms` }}>
        <div className="disc-face disc-front"><PugFace variant="black" disc hat={outfits.black.hat} acc={outfits.black.acc} /></div>
        <div className="disc-face disc-back"><PugFace variant="white" disc hat={outfits.white.hat} acc={outfits.white.acc} /></div>
      </div>
    </div>
  );
});

const STAR_POINTS = new Set([18, 21, 42, 45]); // c3 f3 c6 f6 の左上角

export function BoardView({ board, legal, showLegal, hint, lastPos, flipDelay, disabled, onCell, outfits = DEFAULT_OUTFITS, marker = 'paw' }: Props) {
  return (
    <div className="board-frame">
      <div className="board" role="grid" aria-label="オセロ盤">
        {Array.from({ length: CELLS }, (_, i) => {
          const cell = board[i];
          const canPlay = legal.has(i);
          return (
            <button
              key={i}
              className={`cell ${(rowOf(i) + colOf(i)) % 2 ? 'alt' : ''} ${canPlay ? 'playable' : ''}`}
              onClick={() => onCell(i)}
              disabled={disabled || !canPlay}
              aria-label={`${posLabel(i)} ${cell === BLACK ? '黒パグ' : cell === WHITE ? '白パグ' : canPlay ? '置けます' : '空き'}`}
            >
              {STAR_POINTS.has(i) && <span className="star" />}
              <Disc cell={cell} delay={flipDelay.get(i) ?? 0} isNew={i === lastPos} outfits={outfits} />
              {cell === EMPTY && canPlay && showLegal && !disabled && (
                <span className="legal-mark"><Marker kind={marker} /></span>
              )}
              {hint === i && <span className="hint-mark"><PawPrint color="#ffd54a" /></span>}
              {i === lastPos && <span className="last-mark" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
