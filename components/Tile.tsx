import React from 'react';
import { TileData } from '../types';
import { TILE_UNICODE, SUIT_COLORS } from '../constants';

interface TileProps {
  tile: TileData;
  onClick?: () => void;
  selected?: boolean;
  isHidden?: boolean; // For face-down tiles (opponents)
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isDiscarded?: boolean;
  isHorizontal?: boolean; // For side players
}

const Tile: React.FC<TileProps> = ({ 
  tile, 
  onClick, 
  selected, 
  isHidden, 
  size = 'md',
  isDiscarded = false,
  isHorizontal = false
}) => {
  
  const getUnicode = (t: TileData) => {
    return TILE_UNICODE[t.suit][t.value - 1];
  };

  // Improved Size Classes
  const sizeClasses = {
    sm: isHorizontal ? 'w-8 h-6 text-lg' : 'w-7 h-9 text-lg',
    md: isHorizontal ? 'w-10 h-8 text-2xl' : 'w-10 h-14 text-3xl',
    lg: 'w-14 h-20 text-5xl',
    xl: 'w-20 h-28 text-7xl', // Feature tile
  };

  // 3D Ivory Effect CSS
  const ivoryBase = "bg-[#fdfbf2] shadow-[1px_3px_5px_rgba(0,0,0,0.3),inset_0_-4px_0_rgba(200,190,170,0.3)] border-b-4 border-r-2 border-[#e6e2d8]";
  const backBase = "bg-[#064e3b] border-2 border-[#032f23] shadow-md"; // Emerald green back
  
  const baseClasses = "relative flex items-center justify-center rounded-md select-none transition-all duration-200 z-10";
  const hoverClass = (onClick && !isHidden) ? "hover:-translate-y-2 cursor-pointer hover:shadow-xl" : "";
  const selectClass = selected ? "-translate-y-4 shadow-2xl ring-2 ring-yellow-400 z-20" : "";
  const orientationClass = isHorizontal ? "" : "";

  if (isHidden) {
    return (
      <div 
        className={`${baseClasses} ${backBase} ${sizeClasses[size]} ${orientationClass}`}
      >
        {/* Simple pattern for back of tile */}
        <div className="w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent" style={{backgroundSize: '4px 4px'}}></div>
      </div>
    );
  }

  return (
    <div 
      className={`
        ${baseClasses} 
        ${ivoryBase}
        ${sizeClasses[size]} 
        ${hoverClass} 
        ${selectClass}
        ${SUIT_COLORS[tile.suit]}
        ${orientationClass}
      `}
      onClick={onClick}
    >
      <div className={`relative ${isHorizontal ? "rotate-90" : ""} flex items-center justify-center w-full h-full`}>
          <span className="drop-shadow-sm filter">{getUnicode(tile)}</span>
      </div>
      
      {/* Tiny number helper for beginners */}
      {!isHorizontal && !isDiscarded && size !== 'sm' && (
        <span className="absolute top-0.5 left-1 text-[8px] leading-none text-slate-300 font-sans opacity-0 hover:opacity-100 transition-opacity">
          {tile.value}
        </span>
      )}
    </div>
  );
};

export default Tile;
