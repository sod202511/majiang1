import { Suit } from './types';

// Unicode characters for Mahjong tiles
export const TILE_UNICODE: Record<Suit, string[]> = {
  wan: ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏'],
  tong: ['🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡'],
  tiao: ['🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘'],
};

export const SUIT_LABELS: Record<Suit, string> = {
  wan: '万',
  tong: '筒',
  tiao: '条',
};

export const SUIT_COLORS: Record<Suit, string> = {
  wan: 'text-red-700',
  tong: 'text-blue-700',
  tiao: 'text-emerald-700',
};

export const TOTAL_TILES = 108; // Sichuan mahjong has no winds/dragons/flowers
