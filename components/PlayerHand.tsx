import React from 'react';
import { Player, TileData } from '../types';
import Tile from './Tile';
import { sortHand } from '../utils/mahjongLogic';

interface PlayerHandProps {
  player: Player;
  isCurrentUser: boolean;
  onTileClick?: (tile: TileData) => void;
  selectedTileId?: string | null;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const PlayerHand: React.FC<PlayerHandProps> = ({ 
  player, 
  isCurrentUser, 
  onTileClick, 
  selectedTileId,
  position
}) => {
  const displayHand = isCurrentUser ? sortHand(player.hand) : player.hand;

  const isHorizontal = position === 'left' || position === 'right';
  const containerClass = isHorizontal 
    ? "flex flex-col gap-2 items-center" 
    : "flex flex-row gap-2 items-end justify-center";

  // Combine Pengs and Gangs for display
  const exposedSets = [...player.pengs, ...(player.gangs || [])];

  return (
    <div className={`pointer-events-auto ${containerClass}`}>
      {/* Exposed Sets (Peng/Gang) */}
      <div className={`${isHorizontal ? 'flex flex-col gap-3 mb-2' : 'flex gap-4 mr-6'}`}>
        {exposedSets.map((set, idx) => (
           <div key={`exposed-${idx}`} className={`${isHorizontal ? 'flex flex-col gap-0' : 'flex gap-0'} bg-black/20 p-1 rounded-lg`}>
             {set.map((t, tIdx) => (
               <Tile 
                  key={`${t.id}-${tIdx}`} 
                  tile={t} 
                  size={'sm'} // Exposed tiles are smaller
                  isHorizontal={isHorizontal}
                  isDiscarded // Visual style flat
                />
             ))}
           </div>
        ))}
      </div>

      {/* Hand */}
      <div className={`${isHorizontal ? 'flex flex-col -space-y-6' : 'flex space-x-0'}`}>
        {displayHand.map((tile, idx) => (
            <div key={tile.id} className={`${isHorizontal ? '' : idx === displayHand.length -1 && isCurrentUser ? 'ml-3' : ''}`}>
                <Tile 
                tile={tile}
                isHidden={!isCurrentUser && !player.hasHu} // Hide opponents unless they won
                size={isCurrentUser ? 'lg' : 'sm'}
                isHorizontal={isHorizontal}
                onClick={() => isCurrentUser && onTileClick && onTileClick(tile)}
                selected={selectedTileId === tile.id}
                />
            </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerHand;
