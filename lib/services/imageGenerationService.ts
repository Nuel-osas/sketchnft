/**
 * Image Generation Service - Client-side wrapper
 * Calls the server-side API route that securely uses the Gemini API key
 */

export interface ImageGenerationRequest {
  prompt: string;
  style?: string;
  resolution?: '1K' | '2K' | '4K';
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  prompt?: string;
  metadata?: {
    style?: string;
    resolution?: string;
    model?: string;
  };
  error?: string;
  details?: string;
}

/**
 * Generate an image using the server-side API route
 * This function calls /api/generate-image which securely uses the Gemini API key
 *
 * @param request - Generation parameters (prompt, style, resolution)
 * @returns Generated image URL or error
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  try {
    console.log('[ImageGen] Calling server API with:', request);

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[ImageGen] API error:', data);
      return {
        success: false,
        error: data.error || 'Failed to generate image',
        details: data.details,
      };
    }

    console.log('[ImageGen] Image generated successfully');
    return data;

  } catch (error) {
    console.error('[ImageGen] Network error:', error);
    return {
      success: false,
      error: 'Network error while generating image',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate multiple images in parallel
 *
 * @param requests - Array of generation requests
 * @returns Array of generated images
 */
export async function generateMultipleImages(
  requests: ImageGenerationRequest[]
): Promise<ImageGenerationResponse[]> {
  console.log(`[ImageGen] Generating ${requests.length} images in parallel...`);

  const promises = requests.map(request => generateImage(request));
  const results = await Promise.all(promises);

  const successCount = results.filter(r => r.success).length;
  console.log(`[ImageGen] Completed: ${successCount}/${requests.length} successful`);

  return results;
}

/**
 * Generate a collection of NFTs with variations
 *
 * @param basePrompt - Base prompt for the collection
 * @param count - Number of NFTs to generate
 * @param style - Art style
 * @param resolution - Image resolution
 * @returns Array of generated images
 */
export async function generateNFTCollection(
  basePrompt: string,
  count: number,
  style?: string,
  resolution?: '1K' | '2K' | '4K'
): Promise<ImageGenerationResponse[]> {
  console.log(`[ImageGen] Generating collection of ${count} NFTs...`);

  // Create variations of the prompt for diversity
  const requests: ImageGenerationRequest[] = Array.from({ length: count }, (_, i) => ({
    prompt: `${basePrompt} - variation ${i + 1}`,
    style,
    resolution,
  }));

  return generateMultipleImages(requests);
}
