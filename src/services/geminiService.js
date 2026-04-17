import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export async function getTacticalIntelligence(userInput, history) {
  try {
    const systemPrompt = `You are the SWERVE Tactical Supply Chain AI. 
    Analyze supply chain data and provide concise, actionable intelligence.
    Focus on risk, efficiency, and real-time tactical advice.
    
    Keep answers brief (max 3 sentences).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return response.text || "I'm sorry, I couldn't generate a tactical assessment at this time.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Error communicating with the Tactical Command center.";
  }
}
