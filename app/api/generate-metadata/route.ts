/**
 * API Route: Generate NFT Metadata with Gemini AI
 * Generates creative titles and descriptions for NFTs using Gemini 2.5 Flash
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Server-side environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper for delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retries an async operation if it encounters a rate limit (429) or temporary server error.
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = 2,
  baseDelay = 1000
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
      console.warn(`[Metadata API] Rate limit hit. Retrying in ${Math.round(delay)}ms... (${retries} retries left)`);
      await wait(delay);
      return retryOperation(operation, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  let prompt = '';
  let style = '';

  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    prompt = body.prompt || '';
    style = body.style || '';

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt provided' },
        { status: 400 }
      );
    }

    console.log('[Metadata API] Generating metadata...');
    console.log('[Metadata API] Prompt:', prompt);
    console.log('[Metadata API] Style:', style);

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Define schema for structured output
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

    // Generate metadata with retry logic
    const metadata = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert NFT metadata creator for a premium digital collectibles marketplace.

Create compelling metadata for an NFT with these specifications:

VISUAL CONCEPT: ${prompt}
ARTISTIC STYLE: ${style}

INSTRUCTIONS:
TITLE:
- Create a unique, memorable, and catchy name (2-5 words max)
- Should sound premium and collectible
- Can reference cyberpunk, sci-fi, or futuristic themes if appropriate
- Include creative wordplay or clever references
- Make it feel rare and exclusive
- Examples of good titles: "Neo-Whiskers: Circuit Purr", "Glitch-Whiskers 2077", "Quantum Feline Alpha"

DESCRIPTION:
- Write 1-2 compelling sentences that tell a mini-story or create intrigue
- Include world-building elements and lore
- Make collectors curious about the character/subject
- Use vivid, evocative language
- Hint at rarity, uniqueness, or special qualities
- Don't just describe what's visible - add narrative depth
- Keep it under 200 characters

Focus on making this NFT feel valuable, unique, and desirable to collectors.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: metadataSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No text returned for metadata");

      return JSON.parse(text);
    });

    console.log('[Metadata API] Metadata generated successfully!');

    return NextResponse.json({
      success: true,
      title: metadata.title,
      description: metadata.description,
    });

  } catch (error) {
    console.error('[Metadata API] Metadata generation error:', error);

    // Return default metadata on failure rather than failing completely
    return NextResponse.json({
      success: true,
      title: `${style || 'AI'} Artifact`,
      description: `A unique digital collectible generated based on ${prompt || 'creative vision'}.`,
      isDefault: true,
    });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
