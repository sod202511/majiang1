import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, TileData, GamePhase, Suit, PendingAction } from './types';
import { createDeck, shuffleDeck, sortHand, getBotDiscard, checkHu, hasVoidSuit, canPeng, canGang } from './utils/mahjongLogic';
import Table from './components/Table';
import GeminiAdvisor from './components/GeminiAdvisor';
import { RotateCcw, Trophy, Settings, Hand, Play } from 'lucide-react';

const INITIAL_PLAYER_STATE: Player = {
  id: 0,
  isBot: false,
  hand: [],
  discards: [],
  pengs: [],
  gangs: [],
  voidSuit: null,
  hasHu: false,
  score: 0
};

const createInitialPlayers = (): Player[] => 
  Array(4).fill(null).map((_, i) => ({
    ...INITIAL_PLAYER_STATE,
    id: i,
    isBot: i !== 0,
    hand: [],
    discards: [],
    pengs: [],
    gangs: []
  }));

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    players: createInitialPlayers(),
    currentPlayerId: 0,
    phase: GamePhase.SETUP,
    lastDiscard: null,
    lastDiscardBy: null,
    winningOrder: [],
    messages: [],
    pendingUserAction: null
  });

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(true);

  // --- Game Setup ---
  const startNewGame = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const players: Player[] = Array(4).fill(null).map((_, i) => ({
      ...INITIAL_PLAYER_STATE,
      id: i,
      isBot: i !== 0,
      hand: [],
      pengs: [],
      gangs: [],
      discards: [],
      hasHu: false,
      voidSuit: null
    }));

    // Deal 13 tiles
    for (let i = 0; i < 13; i++) {
      players.forEach(p => {
        if (deck.length > 0) p.hand.push(deck.pop()!);
      });
    }

    players.forEach(p => p.hand = sortHand(p.hand));

    setGameState({
      deck,
      players,
      currentPlayerId: 0,
      phase: GamePhase.DING_QUE,
      lastDiscard: null,
      lastDiscardBy: null,
      winningOrder: [],
      messages: ['游戏开始! 请选择定缺花色 (定缺)'],
      pendingUserAction: null
    });
    setShowSetup(false);
  }, []);

  // --- Ding Que Logic ---
  const handleDingQue = (suit: Suit) => {
    setGameState(prev => {
        const newPlayers = prev.players.map(p => ({ ...p, hand: [...p.hand] }));

        newPlayers[0].voidSuit = suit;
        
        // Bots pick void suit (simplest logic: fewest tiles)
        for (let i = 1; i < 4; i++) {
            const counts = { wan: 0, tong: 0, tiao: 0 };
            newPlayers[i].hand.forEach(t => counts[t.suit]++);
            const minSuit = (Object.keys(counts) as Suit[]).reduce((a, b) => counts[a] < counts[b] ? a : b);
            newPlayers[i].voidSuit = minSuit;
        }

        // Deal 14th tile to dealer
        const newDeck = [...prev.deck];
        const tile = newDeck.pop()!;
        newPlayers[0].hand.push(tile);
        newPlayers[0].hand = sortHand(newPlayers[0].hand);

        return {
            ...prev,
            deck: newDeck,
            players: newPlayers,
            phase: GamePhase.PLAYING,
            currentPlayerId: 0,
            messages: [...prev.messages, `定缺完成. 你定缺了 ${suit === 'wan' ? '万' : suit === 'tong' ? '筒' : '条'}.`]
        };
    });
  };

  // --- Actions (Peng/Gang/Hu) ---
  const checkUserActions = (tile: TileData, fromPlayerId: number): PendingAction[] => {
      const user = gameState.players[0];
      if (user.hasHu) return []; // User already won
      
      const actions: PendingAction[] = [];
      
      // Check Hu (Ron)
      if (checkHu(user.hand, user.voidSuit, tile)) {
          actions.push({ type: 'hu', tile, fromPlayerId });
      }
      
      // Check Gang
      if (canGang(user.hand, tile, user.voidSuit)) {
          actions.push({ type: 'gang', tile, fromPlayerId });
      }

      // Check Peng
      if (canPeng(user.hand, tile, user.voidSuit)) {
          actions.push({ type: 'peng', tile, fromPlayerId });
      }

      return actions;
  };

  const handleAction = (action: PendingAction) => {
      setGameState(prev => {
          const newPlayers = prev.players.map(p => ({
              ...p,
              hand: [...p.hand],
              pengs: [...p.pengs],
              gangs: [...p.gangs],
              discards: [...p.discards]
          }));
          const user = newPlayers[0];
          const fromPlayer = newPlayers[action.fromPlayerId];

          // Remove tile from discarder's discard pile (it's being claimed)
          fromPlayer.discards.pop(); 

          if (action.type === 'hu') {
              user.hand.push(action.tile); // Add winning tile
              user.hasHu = true;
              return {
                  ...prev,
                  players: newPlayers,
                  winningOrder: [...prev.winningOrder, 0],
                  messages: [...prev.messages, "胡牌! (直杠/点炮)"],
                  pendingUserAction: null,
                  phase: GamePhase.GAME_OVER // Simple end for now
              };
          }

          if (action.type === 'peng') {
              // Remove 2 matching tiles from hand
              const matchingIndices: number[] = [];
              user.hand.forEach((t, i) => {
                  if (t.suit === action.tile.suit && t.value === action.tile.value && matchingIndices.length < 2) {
                      matchingIndices.push(i);
                  }
              });
              // Filter out matching tiles. Note: filter creates new array
              user.hand = user.hand.filter((_, i) => !matchingIndices.includes(i));
              
              // Add to pengs
              user.pengs.push([action.tile, action.tile, action.tile]); // 2 from hand + 1 claimed
              
              return {
                  ...prev,
                  players: newPlayers,
                  currentPlayerId: 0, // User turn to discard now
                  pendingUserAction: null,
                  lastDiscard: null, // Claimed
                  messages: [...prev.messages, "碰!"]
              };
          }
          
          if (action.type === 'gang') {
             // Remove 3 matching tiles
             const matchingIndices: number[] = [];
             user.hand.forEach((t, i) => {
                 if (t.suit === action.tile.suit && t.value === action.tile.value && matchingIndices.length < 3) {
                     matchingIndices.push(i);
                 }
             });
             user.hand = user.hand.filter((_, i) => !matchingIndices.includes(i));
             user.gangs.push([action.tile, action.tile, action.tile, action.tile]);

             // Gang gets a replacement tile immediately
             const deck = [...prev.deck];
             const replacement = deck.pop();
             if (replacement) user.hand.push(replacement);

             return {
                 ...prev,
                 players: newPlayers,
                 deck,
                 currentPlayerId: 0,
                 pendingUserAction: null,
                 lastDiscard: null,
                 messages: [...prev.messages, "杠!"]
             };
          }

          return prev;
      });
  };

  const handlePass = () => {
      setGameState(prev => ({
          ...prev,
          pendingUserAction: null,
          currentPlayerId: (prev.lastDiscardBy! + 1) % 4 // Resume play from next person
      }));
  };

  // --- Main Gameplay Loop (User & Bot) ---
  
  // User Click
  const handleTileClick = (tile: TileData) => {
    if (gameState.phase !== GamePhase.PLAYING) return;
    if (gameState.currentPlayerId !== 0) return;
    if (gameState.players[0].hasHu) return;

    // Ding Que check
    const user = gameState.players[0];
    if (user.voidSuit) {
        const hasVoid = hasVoidSuit(user.hand, user.voidSuit);
        if (hasVoid && tile.suit !== user.voidSuit) {
            alert(`必须先打出定缺花色 (${user.voidSuit === 'wan' ? '万' : user.voidSuit === 'tong' ? '筒' : '条'})!`);
            return;
        }
    }

    setSelectedTileId(tile.id);
  };

  const executeDiscard = () => {
      if (!selectedTileId) return;

      setGameState(prev => {
          const newPlayers = prev.players.map(p => ({
              ...p,
              hand: [...p.hand],
              discards: [...p.discards]
          }));
          const player = newPlayers[0];
          
          const tileIndex = player.hand.findIndex(t => t.id === selectedTileId);
          if (tileIndex === -1) return prev;

          const discardedTile = player.hand[tileIndex];
          player.hand.splice(tileIndex, 1);
          player.hand = sortHand(player.hand);
          player.discards.push(discardedTile);

          return {
              ...prev,
              players: newPlayers,
              lastDiscard: discardedTile,
              lastDiscardBy: 0,
              currentPlayerId: 1, // Pass to next
              messages: [...prev.messages, `我打出了 ${discardedTile.value}${discardedTile.suit === 'wan' ? '万' : discardedTile.suit === 'tong' ? '筒' : '条'}`]
          };
      });
      setSelectedTileId(null);
  };

  // User Self-Draw Win Check (Zimo)
  const handleZimo = () => {
     if (checkHu(gameState.players[0].hand, gameState.players[0].voidSuit)) {
         setGameState(prev => {
            const newPlayers = prev.players.map(p => ({...p}));
            newPlayers[0].hasHu = true;
            return {
                ...prev,
                players: newPlayers,
                phase: GamePhase.GAME_OVER, 
                messages: [...prev.messages, "自摸! 恭喜发财!"]
            };
         });
     }
  };


  // BOT LOGIC
  useEffect(() => {
    if (gameState.phase !== GamePhase.PLAYING) return;
    if (gameState.pendingUserAction) return; // Wait for user to decide on Peng/Gang
    if (gameState.currentPlayerId === 0) return; // User turn

    const botId = gameState.currentPlayerId;
    if (!gameState.players[botId]) return;

    const bot = gameState.players[botId];

    if (bot.hasHu) {
         setGameState(prev => ({
            ...prev,
            currentPlayerId: (botId + 1) % 4
         }));
         return;
    }

    const timer = setTimeout(() => {
        setGameState(prev => {
            // Check if user is pending action from PREVIOUS discard
            // Actually, if we are here, it means user passed or previous turn finished.
            
            // 1. Draw Tile
            const newPlayers = prev.players.map(p => ({...p, hand: [...p.hand], discards: [...p.discards]}));
            const currentBot = newPlayers[botId];
            const deck = [...prev.deck];

            if (deck.length === 0) {
                 return { ...prev, phase: GamePhase.GAME_OVER, messages: [...prev.messages, "流局!"] };
            }

            const drawnTile = deck.pop()!;
            currentBot.hand.push(drawnTile);

            // 2. Check Zimo
            if (checkHu(currentBot.hand, currentBot.voidSuit)) {
                currentBot.hasHu = true;
                const newWinners = [...prev.winningOrder, botId];
                
                // If 3 people won, end game (Bloody Battle)
                if (newWinners.length >= 3) {
                     return {
                        ...prev,
                        deck,
                        players: newPlayers,
                        phase: GamePhase.GAME_OVER,
                        winningOrder: newWinners,
                        messages: [...prev.messages, `玩家 ${botId} 自摸! 游戏结束.`]
                     };
                }

                return {
                    ...prev,
                    deck,
                    players: newPlayers,
                    currentPlayerId: (botId + 1) % 4,
                    winningOrder: newWinners,
                    messages: [...prev.messages, `玩家 ${botId} 自摸! (血战到底: 继续)`]
                };
            }

            // 3. Discard
            const discardTile = getBotDiscard(currentBot.hand, currentBot.voidSuit!);
            currentBot.hand = currentBot.hand.filter(t => t.id !== discardTile.id);
            currentBot.discards.push(discardTile);
            currentBot.hand = sortHand(currentBot.hand);

            // 4. CHECK USER ACTIONS (Interrupt)
            const actions = checkUserActions(discardTile, botId);
            
            if (actions.length > 0) {
                return {
                    ...prev,
                    deck,
                    players: newPlayers,
                    lastDiscard: discardTile,
                    lastDiscardBy: botId,
                    pendingUserAction: actions, // PAUSE HERE
                    messages: [...prev.messages, `玩家 ${botId} 打出 ${discardTile.value}${discardTile.suit === 'wan'?'万':discardTile.suit==='tong'?'筒':'条'}`]
                };
            }

            // No interruption
            return {
                ...prev,
                deck,
                players: newPlayers,
                currentPlayerId: (botId + 1) % 4,
                lastDiscard: discardTile,
                lastDiscardBy: botId,
                messages: [...prev.messages.slice(-4), `玩家 ${botId} 打出 ${discardTile.value}${discardTile.suit === 'wan'?'万':discardTile.suit==='tong'?'筒':'条'}`]
            };
        });
    }, 1200); 

    return () => clearTimeout(timer);
  }, [gameState.currentPlayerId, gameState.phase, gameState.pendingUserAction, gameState.deck.length]); 


  // User Auto Draw
  useEffect(() => {
      // Only draw if it's user turn AND user has not acted (e.g. from Peng)
      // Standard draw condition: Hand length % 3 === 1 (e.g. 1, 4, 7, 10, 13). Need 14th.
      // But if we just Penged, we have 2, 5, 8, 11, 14 (modulo 3 = 2). We discard.
      // If we start turn naturally, we have 13. We draw.
      
      if (gameState.currentPlayerId === 0 && gameState.phase === GamePhase.PLAYING && !gameState.players[0].hasHu && !gameState.pendingUserAction) {
          
          setGameState(prev => {
              if (prev.players[0].hand.length % 3 === 2) return prev; // Already has full hand (e.g. after Peng)

              const newPlayers = prev.players.map(p => ({...p, hand: [...p.hand]}));
              const deck = [...prev.deck];
              
              if (deck.length === 0) return { ...prev, phase: GamePhase.GAME_OVER };

              const drawnTile = deck.pop()!;
              newPlayers[0].hand.push(drawnTile);
              
              return {
                  ...prev,
                  deck,
                  players: newPlayers
              };
          });
      }
  }, [gameState.currentPlayerId, gameState.phase, gameState.pendingUserAction]);


  return (
    <div className="w-full h-screen flex flex-col bg-neutral-900 text-white font-sans overflow-hidden">
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg pointer-events-auto flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-2xl">🀄️</div>
              <div>
                  <h1 className="text-xl font-bold text-emerald-400 tracking-wider">四川麻将</h1>
                  <p className="text-xs text-gray-400">血战到底 • Lite</p>
              </div>
          </div>
          <div className="flex gap-2 pointer-events-auto">
             <button onClick={() => setShowSetup(true)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur transition-all text-white">
                <Settings size={20} />
             </button>
             <button onClick={startNewGame} className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur transition-all text-white">
                <RotateCcw size={20} />
             </button>
          </div>
      </header>

      {/* SETUP SCREEN */}
      {showSetup && (
          <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center">
              <div className="bg-[#1a2e22] border-2 border-emerald-600 p-8 rounded-2xl max-w-md w-full shadow-2xl relative">
                  <h2 className="text-3xl font-bold text-emerald-400 mb-6 text-center flex items-center justify-center gap-2">
                      <Settings /> 游戏设置
                  </h2>
                  
                  <div className="space-y-6">
                      <div className="bg-black/20 p-4 rounded-lg">
                          <label className="flex items-center justify-between mb-2">
                              <span className="font-bold text-lg">模式</span>
                              <span className="text-yellow-400">血战到底</span>
                          </label>
                          <p className="text-sm text-gray-400">一家胡牌后游戏继续，直到剩下最后一人或流局。</p>
                      </div>

                      <div className="bg-black/20 p-4 rounded-lg">
                           <label className="flex items-center justify-between mb-2">
                              <span className="font-bold text-lg">定缺</span>
                              <span className="text-green-400">开启</span>
                          </label>
                          <p className="text-sm text-gray-400">开局必须选择一门花色放弃，手牌中有该花色不能胡牌。</p>
                      </div>

                      <div className="bg-black/20 p-4 rounded-lg">
                           <label className="flex items-center justify-between mb-2">
                              <span className="font-bold text-lg">换三张</span>
                              <span className="text-gray-500">关闭 (Lite版)</span>
                          </label>
                      </div>
                  </div>

                  <button 
                    onClick={startNewGame}
                    className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                      <Play fill="currentColor" /> 开始游戏
                  </button>
              </div>
          </div>
      )}

      {/* Main Game Area */}
      <main className="flex-1 relative">
        <Table 
            gameState={gameState} 
            onTileClick={handleTileClick} 
            selectedTileId={selectedTileId} 
        />
        
        {/* Ding Que Overlay */}
        {gameState.phase === GamePhase.DING_QUE && !showSetup && (
            <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-500">
                <h2 className="text-4xl font-bold mb-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">请选择一门花色定缺</h2>
                <div className="flex gap-8">
                    {(['wan', 'tong', 'tiao'] as Suit[]).map(s => (
                        <button 
                            key={s}
                            onClick={() => handleDingQue(s)}
                            className="w-40 h-48 rounded-2xl bg-[#f0ebd8] border-b-8 border-r-4 border-[#c7c2b0] shadow-2xl hover:-translate-y-2 transition-all flex flex-col items-center justify-center gap-4 group active:translate-y-0 active:shadow-none"
                        >
                            <span className={`text-7xl ${s === 'wan' ? 'text-red-700' : s === 'tong' ? 'text-blue-700' : 'text-emerald-700'}`}>
                                {s === 'wan' ? '🀇' : s === 'tong' ? '🀙' : '🀐'}
                            </span>
                            <span className="text-2xl font-black text-gray-800 uppercase tracking-widest">
                                {s === 'wan' ? '万' : s === 'tong' ? '筒' : '条'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* User Interaction Actions (Buttons) */}
        
        {/* Discard / Hu Buttons (Active Turn) */}
        {gameState.phase === GamePhase.PLAYING && gameState.currentPlayerId === 0 && !gameState.pendingUserAction && (
            <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 z-40 flex gap-4">
               {selectedTileId && (
                   <button 
                    onClick={executeDiscard}
                    className="px-10 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xl shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-1 active:shadow-none transition-all"
                   >
                    打出
                   </button>
               )}
               
               {/* Check self-hu manually for Zimo (optional visual aid, logic is automatic usually but fun to click) */}
               <button 
                onClick={handleZimo}
                className="px-10 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold text-xl shadow-[0_4px_0_rgb(161,98,7)] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
               >
                <Trophy size={22} /> 胡 (自摸)
               </button>
            </div>
        )}

        {/* INTERRUPT ACTIONS (Peng/Gang/Hu from Discard) */}
        {gameState.pendingUserAction && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex gap-6 bg-black/60 p-6 rounded-2xl backdrop-blur-md border border-white/20 animate-in zoom-in-90 duration-200">
                {gameState.pendingUserAction.map((action, idx) => (
                    <button
                        key={`${action.type}-${idx}`}
                        onClick={() => handleAction(action)}
                        className={`
                            relative w-24 h-24 rounded-full flex flex-col items-center justify-center font-black text-3xl shadow-lg border-4 transition-transform hover:scale-110
                            ${action.type === 'hu' ? 'bg-yellow-500 border-yellow-300 text-red-900 animate-pulse' : 
                              action.type === 'peng' ? 'bg-blue-600 border-blue-400 text-white' : 
                              'bg-emerald-600 border-emerald-400 text-white'}
                        `}
                    >
                        {action.type === 'hu' ? '胡' : action.type === 'peng' ? '碰' : '杠'}
                        <span className="text-xs font-normal mt-1 opacity-80">
                            {action.tile.value}{action.tile.suit === 'wan' ? '万' : action.tile.suit === 'tong' ? '筒' : '条'}
                        </span>
                    </button>
                ))}
                <button 
                    onClick={handlePass}
                    className="w-24 h-24 rounded-full bg-gray-600 border-4 border-gray-400 flex items-center justify-center text-white font-bold text-xl hover:bg-gray-500"
                >
                    过
                </button>
            </div>
        )}

        {/* Gemini Advisor */}
        {gameState.phase === GamePhase.PLAYING && gameState.players[0] && !gameState.players[0].hasHu && (
            <GeminiAdvisor 
                hand={gameState.players[0].hand} 
                voidSuit={gameState.players[0].voidSuit} 
            />
        )}
        
        {/* Game Over Modal */}
        {gameState.phase === GamePhase.GAME_OVER && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center animate-in fade-in">
                <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 mb-6 drop-shadow-lg">
                    游戏结束
                </h2>
                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md mb-8 max-w-lg w-full text-center border border-white/10">
                    <p className="text-xl text-white leading-loose font-medium">
                        {gameState.messages[gameState.messages.length-1]}
                    </p>
                </div>
                <button 
                    onClick={startNewGame}
                    className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 rounded-full font-bold text-2xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-3"
                >
                    <RotateCcw /> 再来一局
                </button>
            </div>
        )}
      </main>
    </div>
  );
}
