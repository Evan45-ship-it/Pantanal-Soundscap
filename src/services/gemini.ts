import { GoogleGenAI, Type, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface WildlifeInfo {
  name: string;
  scientificName: string;
  taxonomy: {
    class: string;
    order: string;
    family: string;
  };
  description: string;
  diet: string;
  populationTrend: string;
  vocalizationDescription: string;
  funFact: string;
  habitat: string;
  conservationStatus: string;
  threats: string[];
}

export async function getWildlifeInfo(species: string): Promise<WildlifeInfo> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide a comprehensive, scientifically accurate profile of the ${species} found in the Pantanal wetland. Include detailed taxonomic information, physical description, diet, population trends, and a specific description of its vocalizations for bioacoustic monitoring. Ensure high accuracy and include current conservation threats.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          taxonomy: {
            type: Type.OBJECT,
            properties: {
              class: { type: Type.STRING },
              order: { type: Type.STRING },
              family: { type: Type.STRING },
            },
            required: ["class", "order", "family"],
          },
          description: { type: Type.STRING },
          diet: { type: Type.STRING },
          populationTrend: { type: Type.STRING },
          vocalizationDescription: { type: Type.STRING },
          funFact: { type: Type.STRING },
          habitat: { type: Type.STRING },
          conservationStatus: { type: Type.STRING },
          threats: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["name", "scientificName", "taxonomy", "description", "diet", "populationTrend", "vocalizationDescription", "funFact", "habitat", "conservationStatus", "threats"],
      },
    },
  });

  if (!response.text) throw new Error("No response text from Gemini");
  return JSON.parse(response.text);
}

export async function getPantanalOverview() {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Provide a highly detailed, scientifically accurate overview of the Pantanal wetland. Include its geographical boundaries, hydrological cycles (flood/ebb), biodiversity statistics (approximate number of species for major taxa), and a detailed summary of current ecological threats like wildfires and land-use change.",
  });
  return response.text;
}

export interface AcousticAnalysis {
  speciesIdentified: {
    name: string;
    confidence: number;
    vocalizationType: string;
  }[];
  overallConfidence: number;
  environmentalContext: string;
  detailedAnalysis: string;
  conservationImpact: string;
}

export async function analyzeAcousticClip(clipName: string): Promise<AcousticAnalysis> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Perform a high-precision bioacoustic analysis of a simulated recording from the Pantanal named "${clipName}". Identify specific species based on vocalization patterns, provide confidence scores for each, describe the environmental context (e.g., time of day, habitat type inferred from background noise), and provide a detailed technical summary of the recording's significance for long-term biodiversity monitoring.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          speciesIdentified: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                vocalizationType: { type: Type.STRING },
              },
              required: ["name", "confidence", "vocalizationType"],
            },
          },
          overallConfidence: { type: Type.NUMBER },
          environmentalContext: { type: Type.STRING },
          detailedAnalysis: { type: Type.STRING },
          conservationImpact: { type: Type.STRING },
        },
        required: ["speciesIdentified", "overallConfidence", "environmentalContext", "detailedAnalysis", "conservationImpact"],
      },
    },
  });

  if (!response.text) throw new Error("No response text from Gemini");
  return JSON.parse(response.text);
}

export async function generateSoundscapeDescription(params: { place: string, time: string, elements: string[], atmosphere: string }): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create a highly immersive, cinematic, and realistic auditory description of a natural soundscape in ${params.place} during the ${params.time}. 
    The soundscape should prominently feature: ${params.elements.join(', ')}. 
    The atmosphere must feel ${params.atmosphere}. 
    Write this as a vivid, sensory-rich narrative in the style of a high-quality nature recording or a professional field recordist's notes. 
    Focus on the spatial characteristics of the sound (stereo width, depth, distance), the textures (wet, dry, sharp, soft), and the specific behaviors of the sound sources. 
    Focus purely on the sounds and the feeling of being there.`,
  });
  return response.text || "";
}

export async function generateSpeech(text: string, retries: number = 3): Promise<string> {
  const ai = getAI();
  
  // Truncate text to a reasonable length for TTS to avoid model errors
  const maxLength = 1000;
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: truncatedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        console.error("Gemini TTS Response:", response);
        throw new Error("No audio data returned from model.");
      }
      return base64Audio;
    } catch (error: any) {
      const isQuotaError = error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED";
      
      if (i === retries) {
        if (isQuotaError) {
          throw new Error("Narration quota exceeded. Please wait a moment before trying again.");
        }
        console.error("Final narration attempt failed:", error);
        throw error;
      }

      // Longer delay for quota errors
      const baseDelay = isQuotaError ? 3000 : 1000;
      const delay = Math.pow(2, i) * baseDelay;
      
      console.warn(`Narration attempt ${i + 1} failed (${isQuotaError ? 'Quota' : 'Error'}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed to generate speech after retries");
}
