import React from 'react';
import { GameState, TileData, GamePhase } from '../types';
import PlayerHand from './PlayerHand';
import Tile from './Tile';

interface TableProps {
  gameState: GameState;
  onTileClick: (tile: TileData) => void;
  selectedTileId: string | null;
}

const Table: React.FC<TableProps> = ({ gameState, onTileClick, selectedTileId }) => {
  const { players } = gameState;
  
  if (!players || players.length < 4) {
      return (
          <div className="relative w-full h-full bg-mahjong-table overflow-hidden flex items-center justify-center shadow-inner">
             <div className="text-white text-xl animate-pulse">正在初始化游戏...</div>
          </div>
      );
  }

  const user = players[0];
  const rightBot = players[1];
  const topBot = players[2];
  const leftBot = players[3];

  const DiscardZone = ({ discards }: { discards: TileData[] }) => (
    <div className="flex flex-wrap gap-1 content-start w-40 h-28 p-2 bg-black/10 rounded-lg">
      {discards && discards.map((tile) => (
        <Tile key={tile.id} tile={tile} size="sm" isDiscarded />
      ))}
    </div>
  );

  return (
    <div className="relative w-full h-full bg-[#1a472a] overflow-hidden flex items-center justify-center shadow-inner">
      {/* Realistic Felt Texture */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
             mixBlendMode: 'overlay'
           }}>
      </div>
      
      {/* Decorative Border */}
      <div className="absolute inset-4 border-2 border-yellow-600/30 rounded-3xl pointer-events-none"></div>

      {/* Center Info - Tiles Remaining & Phase */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0f2918] p-6 rounded-xl text-white text-center z-10 border-4 border-[#2d5c3e] shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[200px]">
        
        {/* Direction/Turn Indicator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#2d5c3e] rounded-full flex items-center justify-center border-4 border-[#1a472a] shadow-lg">
            <span className="text-2xl font-bold text-yellow-400">
                {gameState.currentPlayerId === 0 ? "我" : 
                 gameState.currentPlayerId === 1 ? "下" :
                 gameState.currentPlayerId === 2 ? "对" : "上"}
            </span>
        </div>

        <div className="mt-6 text-xs uppercase tracking-widest text-emerald-400 mb-1">剩余牌数</div>
        <div className="text-4xl font-bold font-mono text-yellow-100">{gameState.deck.length}</div>
        
        <div className="mt-2 text-sm text-gray-300 font-medium">
            {gameState.phase === GamePhase.DING_QUE ? "请定缺 (选择花色)" : 
             gameState.phase === GamePhase.GAME_OVER ? "游戏结束" : 
             "血战到底中..."}
        </div>

        {gameState.lastDiscard && (
            <div className="mt-4 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <span className="text-xs text-gray-400 mb-1">打出</span>
                <div className="scale-110 shadow-xl">
                    <Tile tile={gameState.lastDiscard} size="md" />
                </div>
            </div>
        )}
      </div>

      {/* TOP BOT */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
        <PlayerHand player={topBot} isCurrentUser={false} position="top" />
        <DiscardZone discards={topBot.discards} />
      </div>

      {/* LEFT BOT */}
      <div className="absolute left-16 top-1/2 transform -translate-y-1/2 flex flex-row-reverse items-center gap-6">
        <PlayerHand player={leftBot} isCurrentUser={false} position="left" />
        <DiscardZone discards={leftBot.discards} />
      </div>

      {/* RIGHT BOT */}
      <div className="absolute right-16 top-1/2 transform -translate-y-1/2 flex flex-row items-center gap-6">
        <PlayerHand player={rightBot} isCurrentUser={false} position="right" />
        <DiscardZone discards={rightBot.discards} />
      </div>

      {/* USER (BOTTOM) */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 w-full max-w-5xl px-4">
         {/* User Discards */}
        <div className="flex flex-wrap justify-center gap-1 w-full max-w-lg h-24 mb-2">
            {user.discards && user.discards.map((tile) => (
                <Tile key={tile.id} tile={tile} size="sm" isDiscarded />
            ))}
        </div>
        
        <div className="relative">
            <PlayerHand 
                player={user} 
                isCurrentUser={true} 
                position="bottom" 
                onTileClick={onTileClick}
                selectedTileId={selectedTileId}
            />
            
            {/* Ding Que Indicator */}
            {user.voidSuit && (
                <div className="absolute -right-24 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur text-white px-3 py-2 rounded-lg border-l-4 border-red-500 shadow-lg flex flex-col items-center">
                    <span className="text-xs text-gray-400">定缺</span>
                    <span className="text-xl font-bold text-red-400 uppercase">
                        {user.voidSuit === 'wan' ? '万' : user.voidSuit === 'tong' ? '筒' : '条'}
                    </span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Table;
