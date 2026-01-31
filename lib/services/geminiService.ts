import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ImageResolution } from '../types';

// We create a new instance per call to ensure we catch the latest API key if it changes via the selector
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper for delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retries an async operation if it encounters a rate limit (429) or temporary server error.
 */
async function retryOperation<T>(
  operation: () => Promise<T>, 
  retries = 3, 
  baseDelay = 2000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRateLimit = 
      error.message?.includes('429') || 
      error.message?.includes('Quota') ||
      error.status === 429;
      
    if (retries > 0 && isRateLimit) {
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      console.warn(`Rate limit hit. Retrying in ${Math.round(delay)}ms... (${retries} retries left)`);
      await wait(delay);
      return retryOperation(operation, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

/**
 * Generates a single image using Gemini 3 Pro Image Preview.
 */
export const generateSingleNFT = async (
  prompt: string, 
  style: string,
  resolution: ImageResolution
): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAIClient();
    
    const fullPrompt = `Generate a high-quality NFT artwork. 
    Style: ${style}. 
    Subject: ${prompt}. 
    Ensure the background is solid or artistic, suitable for a digital collectible.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: resolution,
          },
        },
      });

      // Extract image
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("No image data found in response");
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  });
};

/**
 * Generates creative metadata (Title, Description) for an NFT using Gemini 2.5 Flash.
 */
export const generateTokenMetadata = async (
  prompt: string,
  style: string
): Promise<{ title: string; description: string }> => {
  // We also wrap metadata generation in retry, though it's faster and less likely to fail
  return retryOperation(async () => {
    const ai = getAIClient();

    const metadataSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "A creative, short name for the NFT artifact.",
        },
        description: {
          type: Type.STRING,
          description: "A 1-2 sentence compelling backstory or lore description for the item.",
        },
      },
      required: ["title", "description"],
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create metadata for an NFT.
        Visual Prompt: ${prompt}
        Art Style: ${style}
        
        Generate a cool, unique title and a short lore description.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: metadataSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No text returned for metadata");
      
      return JSON.parse(text);
    } catch (error) {
      // If retries fail or other error, we still want to return default metadata rather than crashing the whole batch
      console.warn("Metadata generation failed after retries, using defaults", error);
      return {
        title: `${style} Artifact`,
        description: `A unique digital collectible generated based on ${prompt}.`
      };
    }
  }, 2, 1000); // Fewer retries for metadata as it's secondary
};