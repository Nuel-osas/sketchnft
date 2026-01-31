/**
 * Sui NFT Contract Service
 * Handles minting NFTs on Sui blockchain using the deployed contract
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

// Contract configuration
const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const NFT_PACKAGE_ID = process.env.NEXT_PUBLIC_NFT_PACKAGE_ID || '0x4eefa7f7207aecab7c2437a5dc48fafccb4adff150b0977653f6c71e0ea3f44f';

let suiClient: SuiClient | null = null;

function getSuiClient(): SuiClient {
  if (!suiClient) {
    suiClient = new SuiClient({ url: SUI_RPC_URL });
  }
  return suiClient;
}

/**
 * Check if contract is configured
 */
export function isContractConfigured(): boolean {
  return !!NFT_PACKAGE_ID;
}

/**
 * Get contract configuration
 */
export function getContractConfig() {
  return {
    packageId: NFT_PACKAGE_ID,
    network: SUI_NETWORK,
    configured: isContractConfigured(),
  };
}

/**
 * Build mint NFT transaction
 * Returns a Transaction object that can be signed with dapp-kit
 */
export function buildMintTransaction(
  name: string,
  description: string,
  imageUrl: string,
  metadataHash: string,
  style: string,
  prompt: string,
  recipientAddress: string
): Transaction {
  if (!NFT_PACKAGE_ID) {
    throw new Error('NFT Package ID not configured');
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${NFT_PACKAGE_ID}::nft_launchpad::mint`,
    arguments: [
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(imageUrl),
      tx.pure.string(metadataHash),
      tx.pure.address(recipientAddress),
    ],
  });

  return tx;
}

/**
 * Build batch mint transaction for multiple NFTs
 */
export function buildBatchMintTransaction(
  nfts: Array<{
    name: string;
    description: string;
    imageUrl: string;
    metadataHash: string;
    style: string;
    prompt: string;
  }>,
  recipientAddress: string
): Transaction {
  if (!NFT_PACKAGE_ID) {
    throw new Error('NFT Package ID not configured');
  }

  const tx = new Transaction();

  // Add each mint call to the transaction
  for (const nft of nfts) {
    tx.moveCall({
      target: `${NFT_PACKAGE_ID}::nft_launchpad::mint`,
      arguments: [
        tx.pure.string(nft.name),
        tx.pure.string(nft.description),
        tx.pure.string(nft.imageUrl),
        tx.pure.string(nft.metadataHash),
        tx.pure.address(recipientAddress),
      ],
    });
  }

  return tx;
}

/**
 * Get transaction status and details
 */
export async function getTransactionStatus(digest: string) {
  const client = getSuiClient();

  try {
    const tx = await client.getTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    return {
      success: true,
      status: tx.effects?.status?.status,
      data: tx,
    };
  } catch (error) {
    console.error('[Sui] Failed to get transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get NFT object details
 */
export async function getNFTData(objectId: string) {
  const client = getSuiClient();

  try {
    const object = await client.getObject({
      id: objectId,
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true,
      },
    });

    return {
      success: true,
      data: object,
    };
  } catch (error) {
    console.error('[Sui] Failed to get NFT:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's NFTs from this collection
 */
export async function getTokensOfOwner(ownerAddress: string) {
  if (!NFT_PACKAGE_ID) {
    return { success: false, error: 'Contract not configured', nfts: [] };
  }

  const client = getSuiClient();

  try {
    const objects = await client.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${NFT_PACKAGE_ID}::nft_launchpad::PictureNft`,
      },
      options: {
        showContent: true,
        showDisplay: true,
      },
    });

    return {
      success: true,
      nfts: objects.data,
    };
  } catch (error) {
    console.error('[Sui] Failed to get user NFTs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      nfts: [],
    };
  }
}

/**
 * Get Sui Explorer URL for transaction
 */
export function getExplorerUrl(digest: string): string {
  if (SUI_NETWORK === 'mainnet') {
    return `https://suiscan.xyz/mainnet/tx/${digest}`;
  }
  return `https://suiscan.xyz/testnet/tx/${digest}`;
}

/**
 * Get Sui Explorer URL for NFT object
 */
export function getTokenExplorerUrl(objectId: string): string {
  if (SUI_NETWORK === 'mainnet') {
    return `https://suiscan.xyz/mainnet/object/${objectId}`;
  }
  return `https://suiscan.xyz/testnet/object/${objectId}`;
}

/**
 * Extract created object IDs from transaction result
 */
export function extractCreatedObjects(result: any): string[] {
  const objectIds: string[] = [];

  if (result.effects?.created) {
    for (const obj of result.effects.created) {
      if (obj.reference?.objectId) {
        objectIds.push(obj.reference.objectId);
      }
    }
  }

  return objectIds;
}
