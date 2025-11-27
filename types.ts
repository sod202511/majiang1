export type Suit = 'wan' | 'tong' | 'tiao';

export interface TileData {
  id: string;
  suit: Suit;
  value: number; // 1-9
}

export enum GamePhase {
  SETUP = 'SETUP',
  DEALING = 'DEALING',
  DING_QUE = 'DING_QUE', // Choosing void suit
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export type ActionType = 'peng' | 'gang' | 'hu';

export interface PendingAction {
  type: ActionType;
  tile: TileData; // The tile being acted upon
  fromPlayerId: number;
}

export interface Player {
  id: number;
  isBot: boolean;
  hand: TileData[];
  discards: TileData[];
  pengs: TileData[][]; // Array of sets (3 tiles)
  gangs: TileData[][]; // Array of sets (4 tiles)
  voidSuit: Suit | null; // The suit they decided to void
  hasHu: boolean; // Has the player won? (Bloody battle allows multiple winners)
  score: number;
}

export interface GameState {
  deck: TileData[];
  players: Player[];
  currentPlayerId: number;
  phase: GamePhase;
  lastDiscard: TileData | null;
  lastDiscardBy: number | null;
  winningOrder: number[];
  messages: string[]; // Game log
  pendingUserAction: PendingAction[] | null; // Actions user can take (e.g. Peng/Gang on discard)
}

export interface AiAdvice {
  recommendation: string;
  reasoning: string;
}
