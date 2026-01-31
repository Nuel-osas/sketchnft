/**
 * Walrus SDK - Server-side uploads with private key payments
 * The server pays for WAL tokens, not the user
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Signer } from '@mysten/sui/cryptography';

// Configuration
const network = (process.env.NEXT_PUBLIC_WALRUS_NETWORK || 'mainnet') as 'testnet' | 'mainnet';
const DEFAULT_EPOCHS = 5; // ~10 weeks on mainnet (1 epoch = 2 weeks)

// Aggregator URLs for fetching blobs
const AGGREGATOR_URLS = {
  mainnet: 'https://aggregator.walrus-mainnet.walrus.space',
  testnet: 'https://aggregator.walrus-testnet.walrus.space',
};

// Lazy initialization for Walrus client
let _walrusClient: any = null;

async function getWalrusClient() {
  if (!_walrusClient) {
    const { WalrusClient } = await import('@mysten/walrus');
    const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

    _walrusClient = new WalrusClient({
      network,
      suiClient: suiClient as any, // Type mismatch between SDK versions
    });

    console.log(`[WalrusSDK] Initialized with ${network}`);
  }
  return _walrusClient;
}

/**
 * Get signer from environment (private key or mnemonic)
 */
export function getSigner(): Signer {
  const privateKey = process.env.WALRUS_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  const mnemonic = process.env.WALRUS_MNEMONIC || process.env.WALLET_MNEMONIC;

  if (privateKey) {
    // Support both hex and Sui bech32 format (suiprivkey1...)
    if (privateKey.startsWith('suiprivkey')) {
      return Ed25519Keypair.fromSecretKey(privateKey);
    }
    // Hex format
    const keyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
    return Ed25519Keypair.fromSecretKey(keyBytes);
  } else if (mnemonic) {
    return Ed25519Keypair.deriveKeypair(mnemonic);
  } else {
    throw new Error(
      'No wallet configured for Walrus uploads. Set WALRUS_PRIVATE_KEY or WALRUS_MNEMONIC in .env.local'
    );
  }
}

/**
 * Get the server wallet address
 */
export function getServerWalletAddress(): string {
  const signer = getSigner();
  return signer.toSuiAddress();
}

/**
 * Upload blob using server's private key (server pays WAL tokens)
 */
export async function uploadBlobWithServerKey(
  data: Uint8Array,
  options?: {
    epochs?: number;
    deletable?: boolean;
  }
): Promise<{
  blobId: string;
  blobObjectId?: string;
  url: string;
  size: number;
}> {
  const signer = getSigner();
  const epochs = options?.epochs || DEFAULT_EPOCHS;
  const deletable = options?.deletable ?? false;

  console.log(`[WalrusSDK] Uploading blob (${data.length} bytes) with server wallet...`);
  console.log(`[WalrusSDK] Server wallet: ${signer.toSuiAddress()}`);
  console.log(`[WalrusSDK] Epochs: ${epochs}, Deletable: ${deletable}`);

  const client = await getWalrusClient();

  // Calculate cost
  const cost = await client.storageCost(data.length, epochs);
  const costWal = (Number(cost.totalCost) / 1_000_000_000).toFixed(6);
  console.log(`[WalrusSDK] Cost: ${costWal} WAL`);

  try {
    const result = await client.writeBlob({
      blob: data,
      deletable,
      epochs,
      signer,
    });

    const aggregatorUrl = AGGREGATOR_URLS[network];
    const url = `${aggregatorUrl}/v1/blobs/${result.blobId}`;

    console.log(`[WalrusSDK] ✓ Blob uploaded: ${result.blobId}`);
    console.log(`[WalrusSDK] ✓ URL: ${url}`);

    return {
      blobId: result.blobId,
      blobObjectId: result.blobObject?.id?.id,
      url,
      size: data.length,
    };
  } catch (error) {
    console.error('[WalrusSDK] Upload failed:', error);
    throw new Error(
      `Walrus upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate storage cost
 */
export async function calculateStorageCost(
  sizeBytes: number,
  epochs: number = DEFAULT_EPOCHS
): Promise<{
  storageCost: bigint;
  writeCost: bigint;
  totalCost: bigint;
  totalCostWal: string;
}> {
  const client = await getWalrusClient();
  const cost = await client.storageCost(sizeBytes, epochs);

  return {
    ...cost,
    totalCostWal: (Number(cost.totalCost) / 1_000_000_000).toFixed(6),
  };
}

/**
 * Get blob URL from blob ID
 */
export function getBlobUrl(blobId: string): string {
  return `${AGGREGATOR_URLS[network]}/v1/blobs/${blobId}`;
}

/**
 * Convert base64 data URL to Uint8Array
 */
export function base64ToUint8Array(base64DataUrl: string): Uint8Array {
  const base64Data = base64DataUrl.includes(',')
    ? base64DataUrl.split(',')[1]
    : base64DataUrl;

  // Use Buffer for Node.js environment
  const buffer = Buffer.from(base64Data, 'base64');
  return new Uint8Array(buffer);
}
