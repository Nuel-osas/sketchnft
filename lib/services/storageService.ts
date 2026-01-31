/**
 * Walrus Storage Service - Decentralized Storage for NFTs
 * Uploads images and metadata to Walrus (Sui's decentralized storage)
 */

const WALRUS_AGGREGATOR_URL = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-mainnet.walrus.space';

export interface StorageResult {
  hash: string;
  success: boolean;
  error?: string;
  gatewayUrl?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

/**
 * Get Walrus URL for a blob ID
 */
export function getStorageUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
}

/**
 * Upload image to Walrus Storage via API route
 * @param base64Image - Base64 encoded image data URL
 * @returns Blob ID and gateway URL
 */
export async function uploadImage(base64Image: string): Promise<StorageResult> {
  try {
    console.log('[Walrus] Starting image upload...');

    const response = await fetch('/api/upload-to-walrus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: base64Image,
        type: 'image',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log(`[Walrus] Image uploaded! Blob ID: ${result.hash}`);

    return {
      hash: result.hash,
      success: true,
      gatewayUrl: result.gatewayUrl,
    };
  } catch (error) {
    console.error('[Walrus] Image upload error:', error);
    return {
      hash: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}

/**
 * Upload NFT metadata to Walrus Storage via API route
 * @param metadata - NFT metadata object
 * @returns Blob ID for the metadata
 */
export async function uploadMetadata(metadata: NFTMetadata): Promise<StorageResult> {
  try {
    console.log('[Walrus] Starting metadata upload...');

    const metadataJson = JSON.stringify(metadata, null, 2);

    const response = await fetch('/api/upload-to-walrus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: metadataJson,
        type: 'metadata',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log(`[Walrus] Metadata uploaded! Blob ID: ${result.hash}`);

    return {
      hash: result.hash,
      success: true,
      gatewayUrl: result.gatewayUrl,
    };
  } catch (error) {
    console.error('[Walrus] Metadata upload error:', error);
    return {
      hash: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload metadata',
    };
  }
}

/**
 * Create NFT metadata object
 */
export function createMetadata(
  name: string,
  description: string,
  imageUrl: string,
  style: string,
  prompt: string,
  resolution: string = '1K'
): NFTMetadata {
  return {
    name,
    description,
    image: imageUrl,
    attributes: [
      { trait_type: 'Style', value: style },
      { trait_type: 'Resolution', value: resolution },
      { trait_type: 'Generator', value: 'Gemini AI' },
      { trait_type: 'Prompt', value: prompt },
    ],
  };
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!WALRUS_AGGREGATOR_URL;
}

/**
 * Get storage configuration
 */
export function getStorageConfig() {
  return {
    aggregatorUrl: WALRUS_AGGREGATOR_URL,
    configured: isStorageConfigured(),
  };
}
