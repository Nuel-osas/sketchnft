export interface NFTImage {
  id: string;
  url: string; // Base64 or Blob URL initially, then Walrus aggregator URL
  prompt: string;
  style: string;
  title?: string;
  description?: string;
  // Walrus storage IDs
  walrusImageBlobId?: string;
  walrusMetadataBlobId?: string;
  // Legacy field (kept for backward compatibility)
  metadataUri?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'uploading_walrus' | 'minting' | 'minted';
  txHash?: string;
  // Sui NFT object ID
  nftObjectId?: string;
}

export enum CollectionStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  READY_TO_MINT = 'READY_TO_MINT',
  MINTING = 'MINTING',
  COMPLETED = 'COMPLETED'
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}

export interface GenerationConfig {
  prompt: string;
  style: string;
  count: number;
  resolution: ImageResolution;
}