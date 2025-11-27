import { GoogleGenAI } from "@google/genai";
import { TileData, Suit } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getMahjongAdvice = async (
  hand: TileData[],
  voidSuit: Suit | null,
  discards: TileData[]
): Promise<{ recommendation: string; reasoning: string }> => {
  if (!apiKey) {
    return {
        recommendation: "System",
        reasoning: "API Key not configured."
    };
  }

  const handStr = hand.map(t => `${t.value}${t.suit.charAt(0).toUpperCase()}`).join(', ');
  const voidStr = voidSuit ? voidSuit : "None selected yet";
  
  const prompt = `
    You are a Sichuan Mahjong expert. 
    Rules: 
    1. Must be missing one suit to win (Ding Que). My Void Suit is: ${voidStr}.
    2. Suits are Wan (Characters), Tong (Dots), Tiao (Bamboo).
    3. Current Phase: I need to discard a tile.
    
    My Hand: [${handStr}]
    
    Task: Suggest ONE tile to discard to maximize winning chances. Provide a very brief strategic reason (max 2 sentences).
    
    Format output exactly as JSON:
    {
      "recommendation": "1T",
      "reasoning": "Discard 1T because it is isolated and you are flush in Wan."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      recommendation: "Error",
      reasoning: "The spirits are silent (Network error)."
    };
  }
};
