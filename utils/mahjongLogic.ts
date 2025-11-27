import { TileData, Suit, Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to create a fresh deck
export const createDeck = (): TileData[] => {
  const deck: TileData[] = [];
  const suits: Suit[] = ['wan', 'tong', 'tiao'];
  
  suits.forEach(suit => {
    for (let val = 1; val <= 9; val++) {
      for (let k = 0; k < 4; k++) {
        deck.push({
          id: uuidv4(),
          suit,
          value: val
        });
      }
    }
  });
  return deck;
};

// Shuffle deck (Fisher-Yates)
export const shuffleDeck = (deck: TileData[]): TileData[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Sort hand: Suit order (Wan, Tong, Tiao) then Value
export const sortHand = (hand: TileData[]): TileData[] => {
  const suitOrder: Record<Suit, number> = { wan: 1, tong: 2, tiao: 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
};

// Check if a player holds their void suit (Piggy)
export const hasVoidSuit = (hand: TileData[], voidSuit: Suit): boolean => {
  return hand.some(t => t.suit === voidSuit);
};

// Check if player can Peng
export const canPeng = (hand: TileData[], tile: TileData, voidSuit: Suit | null): boolean => {
    if (voidSuit && tile.suit === voidSuit) return false; // Cannot peng void suit
    const count = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
    return count >= 2;
};

// Check if player can Gang (from discard)
export const canGang = (hand: TileData[], tile: TileData, voidSuit: Suit | null): boolean => {
    if (voidSuit && tile.suit === voidSuit) return false;
    const count = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
    return count === 3;
};

// Simplified Win Check (Hu)
// Note: This checks if the hand *plus* an optional extra tile forms a winning hand.
export const checkHu = (hand: TileData[], voidSuit: Suit | null, extraTile?: TileData): boolean => {
  const checkHand = extraTile ? [...hand, extraTile] : hand;
  
  // Rule: Cannot Hu if you still have the void suit
  if (voidSuit && hasVoidSuit(checkHand, voidSuit)) return false;

  const tiles = sortHand(checkHand);
  
  // Basic pre-check
  if (tiles.length % 3 !== 2) return false;

  // Group by suit
  const suits: Record<string, TileData[]> = { wan: [], tong: [], tiao: [] };
  tiles.forEach(t => suits[t.suit].push(t));

  const getFreq = (ts: TileData[]) => {
    const freq = Array(10).fill(0);
    ts.forEach(t => freq[t.value]++);
    return freq;
  };

  // Recursive checker for sequences/triplets
  const checkSets = (freq: number[]): boolean => {
    for (let i = 1; i <= 9; i++) {
      if (freq[i] > 0) {
        // Try Triplet (Kezi)
        if (freq[i] >= 3) {
          freq[i] -= 3;
          if (checkSets(freq)) return true;
          freq[i] += 3;
        }
        // Try Sequence (Shunzi)
        if (i <= 7 && freq[i] > 0 && freq[i + 1] > 0 && freq[i + 2] > 0) {
          freq[i]--; freq[i+1]--; freq[i+2]--;
          if (checkSets(freq)) return true;
          freq[i]++; freq[i+1]++; freq[i+2]++;
        }
        return false;
      }
    }
    return true;
  };

  const checkSuitHasPair = (freq: number[]): boolean => {
     for (let i = 1; i <= 9; i++) {
       if (freq[i] >= 2) {
         freq[i] -= 2;
         if (checkSets(freq)) return true;
         freq[i] += 2;
       }
     }
     return false;
  };

  const wanFreq = getFreq(suits.wan);
  const tongFreq = getFreq(suits.tong);
  const tiaoFreq = getFreq(suits.tiao);

  const wanSets = checkSets([...wanFreq]);
  const tongSets = checkSets([...tongFreq]);
  const tiaoSets = checkSets([...tiaoFreq]);

  const wanPair = checkSuitHasPair([...wanFreq]);
  const tongPair = checkSuitHasPair([...tongFreq]);
  const tiaoPair = checkSuitHasPair([...tiaoFreq]);

  // One suit provides the pair, others provide only sets
  if (wanPair && tongSets && tiaoSets) return true;
  if (wanSets && tongPair && tiaoSets) return true;
  if (wanSets && tongSets && tiaoPair) return true;

  return false;
};

// Basic Bot Logic
export const getBotDiscard = (hand: TileData[], voidSuit: Suit): TileData => {
  // 1. Must discard void suit first
  const voids = hand.filter(t => t.suit === voidSuit);
  if (voids.length > 0) {
    return voids[Math.floor(Math.random() * voids.length)];
  }

  const sorted = sortHand(hand);
  
  // 2. Simple heuristic: discard isolated tiles
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const hasPair = sorted.some((x, idx) => idx !== i && x.value === t.value && x.suit === t.suit);
    const hasNeighbor = sorted.some(x => x.suit === t.suit && Math.abs(x.value - t.value) === 1);
    
    if (!hasPair && !hasNeighbor) return t;
  }

  return sorted[Math.floor(Math.random() * sorted.length)];
};
