import React, { useState } from 'react';
import { TileData, Suit } from '../types';
import { getMahjongAdvice } from '../services/geminiService';
import { Sparkles, Loader2, BrainCircuit } from 'lucide-react';

interface GeminiAdvisorProps {
  hand: TileData[];
  voidSuit: Suit | null;
}

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ hand, voidSuit }) => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<{ recommendation: string; reasoning: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAsk = async () => {
    setLoading(true);
    setIsOpen(true);
    const result = await getMahjongAdvice(hand, voidSuit, []);
    setAdvice(result);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-32 right-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-slate-900/95 text-white p-5 rounded-xl shadow-2xl border border-blue-500/50 w-72 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                <h3 className="font-bold flex items-center gap-2 text-blue-300">
                    <BrainCircuit size={18} /> 军师建议
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="animate-spin text-blue-400" size={28} />
                    <span className="ml-3 text-sm text-gray-300">正在思考牌局...</span>
                </div>
            ) : advice ? (
                <div className="text-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-gray-400">建议打出: </span>
                        <span className="font-black text-yellow-400 text-2xl bg-black/30 px-2 rounded border border-yellow-600/50">{advice.recommendation}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed italic bg-blue-900/20 p-3 rounded-lg border-l-2 border-blue-500">"{advice.reasoning}"</p>
                </div>
            ) : null}
        </div>
      )}

      <button 
        onClick={handleAsk}
        className="group flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white px-5 py-3 rounded-full shadow-lg shadow-blue-900/50 transition-all active:scale-95 border border-blue-400/30"
      >
        <Sparkles size={20} className="group-hover:animate-spin-slow text-yellow-300" />
        <span className="font-bold tracking-wide">AI 提示</span>
      </button>
    </div>
  );
};

export default GeminiAdvisor;
