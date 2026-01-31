'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Loader2, ExternalLink, Grid, List, RefreshCw, Wallet } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { getTokensOfOwner, getContractConfig, getTokenExplorerUrl } from '@/lib/services/contractService';
import { getStorageUrl } from '@/lib/services/storageService';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface CollectionNFT {
  objectId: string;
  name: string;
  description: string;
  imageUrl: string;
  metadataBlobId: string;
  creator: string;
  metadata?: NFTMetadata;
}

export default function CollectionPage() {
  const account = useCurrentAccount();
  const [nfts, setNfts] = useState<CollectionNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const contractConfig = getContractConfig();

  const loadCollection = async () => {
    if (!account?.address) {
      setNfts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTokensOfOwner(account.address);

      if (!result.success) {
        throw new Error(result.error || 'Failed to load NFTs');
      }

      // Process NFT data
      const processedNfts: CollectionNFT[] = [];

      for (const obj of result.nfts) {
        try {
          const content = obj.data?.content;
          if (content?.dataType === 'moveObject') {
            const fields = content.fields as any;

            processedNfts.push({
              objectId: obj.data?.objectId || '',
              name: fields?.name || 'Unnamed NFT',
              description: fields?.description || '',
              imageUrl: fields?.image_url || '',
              metadataBlobId: fields?.metadata_blob_id || '',
              creator: fields?.creator || '',
            });
          }
        } catch (err) {
          console.error('Error processing NFT:', err);
        }
      }

      setNfts(processedNfts);
    } catch (err) {
      console.error('Failed to load collection:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account?.address) {
      loadCollection();
    } else {
      setNfts([]);
    }
  }, [account?.address]);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/background2.jpg?v=4)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />

        <main className="pt-24 pb-12 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 mb-8 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-lilita)' }}>
                    My NFT Collection
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {account?.address ? (
                      <>
                        {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} in your wallet on Sui
                      </>
                    ) : (
                      'Connect your wallet to view your NFTs'
                    )}
                  </p>
                  {contractConfig.configured && (
                    <a
                      href={`https://suiscan.xyz/testnet/object/${contractConfig.packageId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
                    >
                      View Contract <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Refresh Button */}
                  <button
                    onClick={loadCollection}
                    disabled={loading || !account?.address}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                  </button>

                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                      }`}
                    >
                      <Grid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                      }`}
                    >
                      <List size={18} />
                    </button>
                  </div>

                  {/* Create Button */}
                  <Link href="/generate">
                    <button
                      className="px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors"
                      style={{ backgroundColor: '#36454F' }}
                    >
                      Create NFT
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Not Connected State */}
            {!account?.address && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-12 text-center shadow-lg">
                <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600 mb-6">Connect your Sui wallet to view your NFT collection</p>
              </div>
            )}

            {/* Loading State */}
            {account?.address && loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
                <p className="text-gray-600">Loading your NFTs...</p>
              </div>
            )}

            {/* Error State */}
            {account?.address && error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadCollection}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {account?.address && !loading && !error && nfts.length === 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-12 text-center shadow-lg">
                <div className="text-6xl mb-4">🎨</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No NFTs Yet</h2>
                <p className="text-gray-600 mb-6">Create your first NFT from a picture!</p>
                <Link href="/generate">
                  <button
                    className="px-6 py-3 rounded-xl font-medium text-white transition-colors"
                    style={{ backgroundColor: '#36454F' }}
                  >
                    Create Your First NFT
                  </button>
                </Link>
              </div>
            )}

            {/* Grid View */}
            {account?.address && !loading && !error && nfts.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {nfts.map((nft, index) => (
                  <motion.div
                    key={nft.objectId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all group"
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-gray-100">
                      {nft.imageUrl ? (
                        <Image
                          src={nft.imageUrl}
                          alt={nft.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {nft.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {nft.description || 'AI-generated NFT'}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {formatAddress(nft.objectId)}
                        </span>
                        <a
                          href={getTokenExplorerUrl(nft.objectId)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          View <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* List View */}
            {account?.address && !loading && !error && nfts.length > 0 && viewMode === 'list' && (
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        NFT
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                        Creator
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                        Object ID
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {nfts.map((nft, index) => (
                      <motion.tr
                        key={nft.objectId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              {nft.imageUrl ? (
                                <Image
                                  src={nft.imageUrl}
                                  alt={nft.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {nft.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                {nft.description || 'AI-generated NFT'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className="text-sm text-gray-600 font-mono">
                            {formatAddress(nft.creator)}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className="text-sm text-gray-600 font-mono">
                            {formatAddress(nft.objectId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a
                            href={getTokenExplorerUrl(nft.objectId)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#4DA2FF] text-white text-xs font-medium rounded-lg hover:bg-[#3d8fee] transition-colors"
                          >
                            View <ExternalLink size={12} />
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
