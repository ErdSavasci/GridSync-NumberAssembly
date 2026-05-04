
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_WON = 'LEVEL_WON',
  GAME_OVER = 'GAME_OVER',
  GAME_COMPLETE = 'GAME_COMPLETE'
}

export interface Piece {
  id: string;
  type: string; // 'path' or 'bomb'
  pathData: string;
  index: number; // which segment of the number it is
  targetX: number;
  targetY: number;
  currentY: number;
  speed: number;
}

export interface GameState {
  status: GameStatus;
  level: number;
  lives: number;
  score: number;
  levelScore: number;
  collectedIndices: number[];
  currentPiece: Piece | null;
  feedback: 'none' | 'success' | 'fail';
}
