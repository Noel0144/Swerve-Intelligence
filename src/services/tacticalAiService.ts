import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

const PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallSummary: { type: Type.STRING, description: "2-3 sentence tactical assessment" },
    disruptionClassification: { type: Type.STRING, description: "e.g. Geopolitical / Weather / Congestion" },
    severityLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    affectedShipments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          shipmentId: { type: Type.STRING },
          origin: { type: Type.STRING },
          destination: { type: Type.STRING },
          currentProgress: { type: Type.NUMBER },
          riskExposure: { type: Type.STRING },
          recommendedAction: { type: Type.STRING },
          alternativeRoute: { type: Type.STRING },
          estimatedExtraCostPercent: { type: Type.NUMBER },
          estimatedExtraDelayDays: { type: Type.NUMBER },
          urgency: { type: Type.STRING, enum: ["IMMEDIATE", "MONITOR", "LOW"] }
        },
        required: ["shipmentId", "recommendedAction", "urgency"]
      }
    },
    unaffectedShipments: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedSystemDisruption: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        lat: { type: Type.NUMBER },
        lng: { type: Type.NUMBER },
        radius: { type: Type.NUMBER },
        riskType: { type: Type.STRING, enum: ["geopolitical", "weather", "conflict", "piracy", "operational"] },
        riskScore: { type: Type.NUMBER }
      },
      required: ["name", "lat", "lng", "riskType", "riskScore"]
    }
  },
  required: ["overallSummary", "severityLevel", "affectedShipments"]
};

export async function analyzeTacticalIncident(message: string) {
  try {
    // 1. Fetch live context from backend
    const [shipmentsRes, radarRes] = await Promise.all([
      fetch('/api/simulate/shipments'),
      fetch('/api/simulate/radar')
    ]);

    const shipmentsData = await shipmentsRes.json();
    const radarData = await radarRes.json();

    const shipmentContext = (shipmentsData.shipments || []).map((s: any) => ({
      id: s.id.slice(0, 8),
      origin: s.input?.origin || 'Unknown',
      destination: s.input?.destination || 'Unknown',
      itemType: s.input?.itemType || 'general',
      weight: s.input?.weight || 1000,
      mode: s.selectedRouteId,
      progress: Math.round((s.progress || 0) * 100),
      status: s.status,
      currentLat: s.currentLat,
      currentLng: s.currentLng,
      eta: s.eta ? new Date(s.eta).toISOString() : 'Unknown',
      cost: s.cost?.total || 0,
      modes: s.route?.modes || [],
      itinerary: (s.route?.itinerary || []).slice(0, 6).map((step: any) => step.location),
    }));

    const activeDisruptions = radarData.activeDisruptions || [];

    const systemPrompt = `You are SWERVE Tactical Intelligence — an enterprise-grade Supply Chain AI.
Analyze real-time shipment data and disruptive events to suggest precise, actionable rerouting decisions.

ACTIVE SHIPMENTS (${shipmentContext.length} total):
${JSON.stringify(shipmentContext)}

REGISTERED DISRUPTIONS:
${activeDisruptions.length ? JSON.stringify(activeDisruptions.map((d: any) => ({ name: d.name, type: d.riskType, severity: d.riskScore }))) : 'None'}

USER INCIDENT REPORT: "${message}"

Your task:
1. Identify which shipments (by id) are at risk from this new incident based on their routes.
2. For each affected shipment, suggest a specific alternative routing strategy.
3. Estimate extra cost (%) and delay (days).
4. Auto-calculate a geographical "disruption zone" (lat/lng/radius) if the incident has a physical location.`;

    // 2. Query Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Analyze this incident: ${message}` }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: PROMPT_SCHEMA as any,
        temperature: 0.2
      }
    });

    const analysis = JSON.parse(response.text || '{}');

    // 3. Register disruption if suggested
    if (analysis.suggestedSystemDisruption) {
      const d = analysis.suggestedSystemDisruption;
      await fetch('/api/simulate/disruption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...d,
          source: 'gemini_tactical',
          timestamp: Date.now()
        })
      });
    }

    return {
      analysis,
      shipmentCount: shipmentContext.length
    };
  } catch (err) {
    console.error("Tactical AI Error:", err);
    throw err;
  }
}
