/**
 * API Route: Generate Image with AI
 * Supports multiple providers: Together.ai (free tier) or Gemini (requires billing)
 */

import { NextRequest, NextResponse } from 'next/server';

// Together.ai has $5 free credits - get key from https://api.together.xyz/
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
// Gemini requires billing for image generation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = 3,
  baseDelay = 3000
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
      console.warn(`[API] Rate limit hit. Retrying in ${Math.round(delay)}ms... (${retries} retries left)`);
      await wait(delay);
      return retryOperation(operation, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

// Generate image using Together.ai Flux model (has free tier)
async function generateWithTogether(prompt: string, style: string): Promise<string> {
  const fullPrompt = `${style} style NFT artwork: ${prompt}. High quality, centered composition, vibrant colors, no text or watermarks.`;

  console.log('[API] Using Together.ai Flux model...');
  console.log('[API] Full prompt:', fullPrompt);

  const response = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt: fullPrompt,
      width: 1024,
      height: 1024,
      steps: 4,
      n: 1,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Together API error: ${response.status}`);
  }

  const data = await response.json();
  const base64 = data.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error('No image data in response');
  }

  return `data:image/png;base64,${base64}`;
}

// Generate image using Gemini 3 Pro Image Preview (same as anita project)
async function generateWithGemini(prompt: string, style: string, referenceImage?: any): Promise<string> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

  const variationMatch = prompt.match(/variation (\d+)/i);
  const variationNumber = variationMatch ? parseInt(variationMatch[1]) : 1;
  const basePrompt = prompt.replace(/\s*-\s*variation\s*\d+/i, '').trim();

  let fullPrompt: string;
  let contentParts: any[];

  if (referenceImage) {
    fullPrompt = `Generate NFT variation #${variationNumber} that EXACTLY MATCHES the character shown in the reference image.

CRITICAL: The character must be IDENTICAL to the reference image in these aspects:
- Same species/type
- Same pose and body structure
- Same art style and proportions
- Same perspective and angle
- Same level of detail

ONLY CHANGE THESE TRAIT LAYERS (randomize):
1. Background color/pattern
2. Fur/skin color or pattern
3. Eyes (color, expression)
4. Clothing/outfit
5. Accessories (hat, glasses, jewelry)
6. Facial expression
7. Special effects (glow, aura, etc.)

ARTISTIC STYLE: ${style}

Generate a new variation with 2-4 randomized traits while keeping the BASE CHARACTER exactly the same as shown in the reference image.`;

    contentParts = [
      { text: fullPrompt },
      {
        inlineData: {
          mimeType: referenceImage.mimeType || 'image/png',
          data: referenceImage.data
        }
      }
    ];
  } else {
    fullPrompt = `Generate the FIRST NFT in a collection - this will be the BASE CHARACTER template for the entire collection.

SUBJECT: ${basePrompt}
ARTISTIC STYLE: ${style}

REQUIREMENTS FOR BASE CHARACTER:
1. Create a distinctive, memorable character that can have variations
2. Simple, clean design that works well with different accessories/colors
3. Centered composition (character takes 60-80% of frame)
4. Clear, bold colors and high contrast
5. Professional ${style} art style
6. Same perspective/angle that can be replicated
7. Expression should be neutral or slightly positive (easy to vary later)
8. No text, watermarks, or numbers

This is variation #1 - the foundation for the entire collection. Keep it clean and versatile for future variations.`;

    contentParts = [{ text: fullPrompt }];
  }

  console.log('[API] Using Gemini 3 Pro Image Preview...');
  console.log('[API] Full prompt:', fullPrompt);
  console.log('[API] Has reference image:', !!referenceImage);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: contentParts,
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('No image in Gemini response');
}

export async function POST(request: NextRequest) {
  try {
    // Check which provider is available
    const hasTogetherKey = !!TOGETHER_API_KEY;
    const hasGeminiKey = !!GEMINI_API_KEY;

    if (!hasTogetherKey && !hasGeminiKey) {
      return NextResponse.json(
        {
          error: 'No AI API key configured',
          details: 'Add TOGETHER_API_KEY (free: https://api.together.xyz) or GEMINI_API_KEY (requires billing) to .env.local'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prompt, style, referenceImage } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt provided' },
        { status: 400 }
      );
    }

    console.log('[API] Generating image...');
    console.log('[API] Prompt:', prompt);
    console.log('[API] Style:', style);
    console.log('[API] Provider:', hasTogetherKey ? 'Together.ai' : 'Gemini');

    let imageUrl: string;

    // Try Together.ai first (has free tier), fallback to Gemini
    if (hasTogetherKey) {
      imageUrl = await retryOperation(() => generateWithTogether(prompt, style));
    } else {
      imageUrl = await retryOperation(() => generateWithGemini(prompt, style, referenceImage));
    }

    console.log('[API] Success!');

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
    });

  } catch (error: any) {
    console.error('[API] Error:', error.message || error);

    // Check if it's a quota error and provide helpful message
    if (error.message?.includes('429') || error.message?.includes('Quota')) {
      return NextResponse.json({
        error: 'API quota exceeded',
        details: TOGETHER_API_KEY
          ? 'Together.ai rate limit hit. Wait a moment and try again.'
          : 'Gemini image generation requires billing. Get a free Together.ai key at https://api.together.xyz',
        retryAfter: 30
      }, { status: 429 });
    }

    return NextResponse.json(
      { error: 'Failed to generate image', details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
