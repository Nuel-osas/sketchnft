'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Rocket, ArrowRight, Database, Sparkles, Palette, Users, Camera, Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { NFTCard } from '@/components/NFTCard';
import { uploadImage, uploadMetadata, createMetadata, getStorageUrl } from '@/lib/services/storageService';
import { buildMintTransaction, extractCreatedObjects } from '@/lib/services/contractService';

// Types
interface NFTImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  title?: string;
  description?: string;
  imageHash?: string;
  metadataHash?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'uploading' | 'minting' | 'minted';
  txHash?: string;
  objectId?: string;
}

enum CollectionStatus {
  IDLE = 'idle',
  GENERATING = 'generating',
  READY_TO_MINT = 'ready',
  MINTING = 'minting',
  COMPLETED = 'completed',
}

enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K',
}

const STYLES = [
  "Cyberpunk Neon",
  "Pixel Art 8-bit",
  "3D Glossy Render",
  "Abstract Oil Painting",
  "Vaporwave",
  "Low Poly",
  "Anime Cell Shaded",
  "Realistic Portrait"
];

export default function GenerateContent() {
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [style, setStyle] = useState(STYLES[6]); // Anime Cell Shaded
  const [count, setCount] = useState(6);
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_1K);
  const [generatedImages, setGeneratedImages] = useState<NFTImage[]>([]);
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>(CollectionStatus.IDLE);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Individual minting state
  const [mintingNftId, setMintingNftId] = useState<string | null>(null);
  const [mintStep, setMintStep] = useState<'idle' | 'storage' | 'minting'>('idle');
  const [mintProgress, setMintProgress] = useState<string>('');

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Could not access camera. Please check permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setUploadedImage(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadedImageFile(null);
  };

  // Generate single NFT with parallel image + metadata generation
  const generateItem = async (
    id: string,
    itemPrompt: string,
    itemStyle: string,
    referenceImage?: { mimeType: string; data: string }
  ): Promise<string | null> => {
    try {
      // Update status to generating
      setGeneratedImages(prev => prev.map(img =>
        img.id === id ? { ...img, status: 'generating' } : img
      ));

      // Parallelize Image and Metadata generation
      const [imageResponse, metadataResponse] = await Promise.all([
        fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: itemPrompt,
            style: itemStyle,
            resolution,
            referenceImage // Pass reference image if provided
          }),
        }).then(res => res.json()),
        fetch('/api/generate-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: itemPrompt, style: itemStyle }),
        }).then(res => res.json())
      ]);

      const imageUrl = imageResponse.imageUrl || '';

      setGeneratedImages(prev => prev.map(img =>
        img.id === id ? {
          ...img,
          status: imageResponse.success ? 'completed' as const : 'failed' as const,
          url: imageUrl,
          title: metadataResponse.title || `${itemStyle} Artifact`,
          description: metadataResponse.description || 'AI-generated NFT'
        } : img
      ));

      // Return the generated image URL for reference extraction
      return imageUrl;
    } catch (error) {
      setGeneratedImages(prev => prev.map(img =>
        img.id === id ? { ...img, status: 'failed' } : img
      ));
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) {
      alert('Please upload an image!');
      return;
    }

    try {
      setCollectionStatus(CollectionStatus.GENERATING);
      setGenerationProgress(0);

      console.log(`[App] Generating ${count} NFTs from uploaded image...`);

      // Extract base64 data from uploaded image for initial reference
      const uploadedBase64Match = uploadedImage.match(/^data:([^;]+);base64,(.+)$/);
      let initialReferenceImageData: { mimeType: string; data: string } | undefined;

      if (uploadedBase64Match) {
        initialReferenceImageData = {
          mimeType: uploadedBase64Match[1],
          data: uploadedBase64Match[2]
        };
        console.log('[App] Using uploaded image as reference for FIRST generation.');
      }

      // Initialize placeholders
      const newItems: NFTImage[] = Array.from({ length: count }, (_, i) => ({
        id: `nft-${Date.now()}-${i}`,
        url: '',
        prompt: `${prompt} - variation ${i + 1}`,
        style,
        status: 'pending' as const,
      }));
      setGeneratedImages(newItems);

      // SEQUENTIAL GENERATION: First uses uploaded image, rest use first generated image
      let referenceImageData: { mimeType: string; data: string } | undefined = initialReferenceImageData;

      for (let i = 0; i < newItems.length; i++) {
        const nft = newItems[i];

        console.log(`[App] Generating NFT ${i + 1}/${count}${i === 0 ? ' (BASE from uploaded image)' : ' (using first generated)'}...`);

        // Generate the item
        const imageUrl = await generateItem(nft.id, nft.prompt, style, referenceImageData);

        // After generating the FIRST image, extract it and use as reference for the rest
        if (i === 0 && imageUrl) {
          console.log('[App] Extracting first generated image as reference for remaining variations...');

          const base64Match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            referenceImageData = {
              mimeType: base64Match[1],
              data: base64Match[2]
            };
            console.log('[App] First generated image will be used as reference for consistency!');
          } else {
            console.warn('[App] Could not extract base64 data from first generated image');
          }
        }

        // Update progress
        setGenerationProgress(Math.round(((i + 1) / count) * 100));
      }

      setCollectionStatus(CollectionStatus.READY_TO_MINT);
      console.log(`[App] Generation complete!`);

    } catch (error) {
      console.error('[App] Generation failed:', error);
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCollectionStatus(CollectionStatus.IDLE);
    }
  };

  // Mint a single NFT with Sui transaction
  const handleMintSingle = async (nftId: string) => {
    if (!account?.address) {
      alert('Please connect your wallet first!');
      return;
    }

    const nft = generatedImages.find(img => img.id === nftId);
    if (!nft || nft.status !== 'completed') {
      alert('NFT is not ready to mint!');
      return;
    }

    try {
      setMintingNftId(nftId);
      setMintStep('storage');
      setMintProgress('Uploading image to Walrus...');

      console.log(`[App] Minting single NFT: ${nft.title || nftId}...`);

      // Update status to uploading
      setGeneratedImages(prev => prev.map(img =>
        img.id === nftId ? { ...img, status: 'uploading' as const } : img
      ));

      // Step 1: Upload image to Walrus Storage (server pays WAL tokens)
      console.log('[App] Uploading image to Walrus...');
      const imageResult = await uploadImage(nft.url);
      if (!imageResult.success || !imageResult.hash) {
        throw new Error(imageResult.error || 'Failed to upload image');
      }
      console.log(`[App] Image uploaded: ${imageResult.hash}`);
      setMintProgress('Uploading metadata to Walrus...');

      // Step 2: Upload metadata to Walrus Storage
      console.log('[App] Uploading metadata to Walrus...');
      const imageUrl = getStorageUrl(imageResult.hash);
      const metadata = createMetadata(
        nft.title || 'AI NFT',
        nft.description || 'AI-generated NFT on Sui',
        imageUrl,
        nft.style,
        nft.prompt,
        resolution
      );
      const metadataResult = await uploadMetadata(metadata);

      if (!metadataResult.success || !metadataResult.hash) {
        throw new Error(metadataResult.error || 'Failed to upload metadata');
      }
      console.log(`[App] Metadata uploaded: ${metadataResult.hash}`);

      // Update status to minting
      setGeneratedImages(prev => prev.map(img =>
        img.id === nftId ? {
          ...img,
          imageHash: imageResult.hash,
          metadataHash: metadataResult.hash,
          status: 'minting' as const
        } : img
      ));

      // Step 3: Build and sign Sui transaction
      console.log('[App] Building Sui transaction...');
      setMintStep('minting');
      setMintProgress('Sign transaction in wallet...');

      const tx = buildMintTransaction(
        nft.title || 'AI NFT',
        nft.description || 'AI-generated NFT on Sui',
        imageUrl,
        metadataResult.hash,
        nft.style,
        nft.prompt,
        account.address
      );

      // Execute transaction with wallet signature
      signAndExecuteTransaction(
        {
          transaction: tx as any,
        },
        {
          onSuccess: (result) => {
            console.log(`[App] NFT minted! TX: ${result.digest}`);

            // Extract created object ID
            const objectIds = extractCreatedObjects(result);
            const nftObjectId = objectIds[0];

            // Update status to minted
            setGeneratedImages(prev => prev.map(img =>
              img.id === nftId ? {
                ...img,
                status: 'minted' as const,
                txHash: result.digest,
                objectId: nftObjectId
              } : img
            ));

            setMintProgress('NFT minted successfully!');
            setMintingNftId(null);
            setMintStep('idle');
            setTimeout(() => setMintProgress(''), 3000);
          },
          onError: (error) => {
            console.error('[App] Mint transaction failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('rejected')) {
              setMintProgress('Transaction cancelled');
            } else {
              alert(`Minting failed: ${errorMessage}`);
              setMintProgress('');
            }

            // Revert status
            setGeneratedImages(prev => prev.map(img =>
              img.id === nftId ? { ...img, status: 'completed' as const } : img
            ));

            setMintingNftId(null);
            setMintStep('idle');
            setTimeout(() => setMintProgress(''), 3000);
          },
        }
      );

    } catch (error) {
      console.error('[App] Single mint failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Minting failed: ${errorMessage}`);
      setMintProgress('');

      // Revert status to completed so user can retry
      setGeneratedImages(prev => prev.map(img =>
        img.id === nftId ? { ...img, status: 'completed' as const } : img
      ));

      setMintingNftId(null);
      setMintStep('idle');
    }
  };

  // Batch mint all NFTs
  const handleMint = async () => {
    if (!account?.address) {
      alert('Please connect your wallet first!');
      return;
    }

    if (generatedImages.length === 0) {
      alert('No images to mint!');
      return;
    }

    const completedNFTs = generatedImages.filter(nft => nft.status === 'completed');
    if (completedNFTs.length === 0) {
      alert('No completed NFTs to mint!');
      return;
    }

    // For simplicity, mint one at a time
    for (const nft of completedNFTs) {
      await handleMintSingle(nft.id);
    }
  };

  return (
    <>
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #36454F;
          cursor: pointer;
          border: 2px solid rgba(54, 69, 79, 0.3);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #36454F;
          cursor: pointer;
          border: 2px solid rgba(54, 69, 79, 0.3);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]::-ms-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #36454F;
          cursor: pointer;
          border: 2px solid rgba(54, 69, 79, 0.3);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
      <div className="min-h-screen relative">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/background2.jpg?v=4)',
            }}
          />
        </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />

      <main className="pt-20 min-h-screen">
        <div className="w-full h-full">
          {/* Main Content */}
          <div className="flex lg:flex-row flex-col lg:gap-0 gap-0 min-h-[calc(100vh-4rem)]">
            {/* Control Panel - Fixed */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:w-[350px] w-full flex-shrink-0"
            >
              <div className="lg:fixed lg:top-20 lg:h-[calc(100vh-4rem)] lg:w-[350px] lg:overflow-y-auto lg:z-10">
                {/* Generation Controls */}
                <div className="bg-white backdrop-blur-2xl border-0 p-6 flex flex-col h-full">
                  <div className="space-y-5 flex-1 flex flex-col">
                    {/* Input Section */}
                    <div className="space-y-5">
                      {/* Image Upload / Camera */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-900">
                          <Sparkles className="w-4 h-4" style={{ color: '#36454F' }} />
                          Reference Image
                        </label>

                        {/* Camera View */}
                        {isCameraOpen && (
                          <div className="relative w-full bg-black rounded-xl overflow-hidden mb-3">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-auto"
                            />
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                              <button
                                onClick={capturePhoto}
                                className="px-6 py-2 bg-white text-gray-900 rounded-full font-medium text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors"
                              >
                                <Camera className="w-4 h-4" />
                                Capture
                              </button>
                              <button
                                onClick={stopCamera}
                                className="px-4 py-2 bg-red-500 text-white rounded-full font-medium text-sm flex items-center gap-2 hover:bg-red-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Hidden canvas for capture */}
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Camera Error */}
                        {cameraError && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {cameraError}
                          </div>
                        )}

                        {!uploadedImage && !isCameraOpen ? (
                          <div className="flex gap-2">
                            {/* Camera Button */}
                            <button
                              onClick={startCamera}
                              className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl px-4 py-5 text-sm text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                            >
                              <Camera className="w-8 h-8 text-gray-400" />
                              <span className="font-medium">Camera</span>
                              <span className="text-xs">Snap photo</span>
                            </button>

                            {/* Upload Button */}
                            <label className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl px-4 py-5 text-sm text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-2">
                              <Upload className="w-8 h-8 text-gray-400" />
                              <span className="font-medium">Upload</span>
                              <span className="text-xs">PNG, JPG</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : uploadedImage && !isCameraOpen ? (
                          <div className="relative w-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                            <Image
                              src={uploadedImage}
                              alt="Uploaded reference"
                              width={300}
                              height={300}
                              className="w-full h-auto object-contain"
                            />
                            <button
                              onClick={handleRemoveImage}
                              className="absolute top-2 right-2 text-white rounded-full p-2 transition-colors"
                              style={{ backgroundColor: '#36454F' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a3540'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#36454F'}
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {/* Text Prompt */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-900">
                          <Palette className="w-4 h-4" style={{ color: '#36454F' }} />
                          Describe Your Character
                        </label>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="e.g., a cute dragon character..."
                          rows={3}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none hover:bg-gray-100 focus:ring-[#36454F]"
                        />
                      </div>

                      {/* Style */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-900">
                          <Palette className="w-4 h-4" style={{ color: '#36454F' }} />
                          Art Style
                        </label>
                        <div className="relative">
                          <select
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-gray-100"
                            style={{ paddingRight: '2.5rem' }}
                          >
                            {STYLES.map((s) => (
                              <option key={s} value={s} className="bg-white">{s}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Count */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-medium text-gray-900">
                            Collection Size
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#36454F' }}>
                            <span className="text-xl font-bold text-white">{count}</span>
                            <span className="text-xs font-medium text-white">NFTs</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={count}
                          onChange={(e) => setCount(parseInt(e.target.value))}
                          className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #36454F ${((count - 1) / 9) * 100}%, rgba(229, 231, 235, 1) ${((count - 1) / 9) * 100}%)`
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Generates consistent characters sequentially
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Action Buttons Section */}
                    <div className="space-y-4">
                      {/* Single Action Button */}
                      <motion.button
                        onClick={generatedImages.length === 0 ? handleGenerate : handleMint}
                        disabled={
                          !uploadedImage ||
                          collectionStatus === CollectionStatus.GENERATING ||
                          (generatedImages.length > 0 && (!account?.address || collectionStatus === CollectionStatus.MINTING))
                        }
                        whileHover={
                          !uploadedImage || collectionStatus === CollectionStatus.GENERATING ||
                          (generatedImages.length > 0 && (!account?.address || collectionStatus === CollectionStatus.MINTING))
                            ? {}
                            : { scale: 1.02 }
                        }
                        whileTap={
                          !uploadedImage || collectionStatus === CollectionStatus.GENERATING ||
                          (generatedImages.length > 0 && (!account?.address || collectionStatus === CollectionStatus.MINTING))
                            ? {}
                            : { scale: 0.98 }
                        }
                        className={`
                          w-full py-4 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg
                          ${!uploadedImage || collectionStatus === CollectionStatus.GENERATING ||
                            (generatedImages.length > 0 && (!account?.address || collectionStatus === CollectionStatus.MINTING))
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'hover:shadow-xl'
                          }
                        `}
                        style={
                          !uploadedImage || collectionStatus === CollectionStatus.GENERATING ||
                          (generatedImages.length > 0 && (!account?.address || collectionStatus === CollectionStatus.MINTING))
                            ? {}
                            : {
                                background: '#36454F',
                                color: '#FFFFFF'
                              }
                        }
                      >
                        {collectionStatus === CollectionStatus.GENERATING ? (
                          <>
                            <Rocket className="w-5 h-5 animate-pulse" />
                            Generating {generationProgress}%
                          </>
                        ) : collectionStatus === CollectionStatus.MINTING ? (
                          <>
                            <Database className="w-5 h-5 animate-pulse" />
                            Minting Collection
                          </>
                        ) : generatedImages.length > 0 ? (
                          !account?.address ? (
                            <>Connect Wallet <ArrowRight className="w-5 h-5" /></>
                          ) : (
                            <>Launch</>
                          )
                        ) : (
                          <>Generate Collection</>
                        )}
                      </motion.button>

                      {/* Progress Bar */}
                      {collectionStatus === CollectionStatus.GENERATING && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="overflow-hidden"
                        >
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: '#36454F' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${generationProgress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-sm text-gray-600 text-center mt-3 font-medium">
                            {Math.round((generationProgress / 100) * count)}/{count} NFTs Generated
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex-1 w-full"
            >
              {/* Gallery Content */}
              {generatedImages.length === 0 ? (
                <div className="bg-white border-0 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-12 overflow-hidden relative">
                  {/* Animated Gradient Orbs Background */}
                  <motion.div
                    className="absolute top-10 left-10 w-64 h-64 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #36454F 0%, transparent 70%)' }}
                    animate={{
                      x: [0, 30, 0],
                      y: [0, -30, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className="absolute bottom-10 right-10 w-80 h-80 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #36454F 0%, transparent 70%)' }}
                    animate={{
                      x: [0, -30, 0],
                      y: [0, 30, 0],
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full opacity-15 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #36454F 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }}
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 15,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />

                  {/* Floating NFT Card Previews */}
                  <div className="relative mb-12 w-full max-w-3xl h-96">
                    {/* Card 3 - Back */}
                    <motion.div
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-2xl overflow-hidden z-10"
                      style={{
                        border: '4px solid #36454F',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                      }}
                      animate={{
                        y: [0, -10, 0],
                        rotate: [2, 5, 2],
                      }}
                      transition={{
                        duration: 4.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                      }}
                    >
                      <Image
                        src="/nft3.jpg"
                        alt="NFT Preview 3"
                        fill
                        className="object-cover"
                      />
                    </motion.div>

                    {/* Card 2 - Middle Right */}
                    <motion.div
                      className="absolute top-12 right-4 w-64 h-64 rounded-2xl overflow-hidden z-20"
                      style={{
                        border: '4px solid #36454F',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                      }}
                      animate={{
                        y: [0, -15, 0],
                        rotate: [8, 12, 8],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    >
                      <Image
                        src="/nft2.jpg"
                        alt="NFT Preview 2"
                        fill
                        className="object-cover"
                      />
                    </motion.div>

                    {/* Card 1 - Front Left */}
                    <motion.div
                      className="absolute top-0 left-4 w-72 h-72 rounded-2xl overflow-hidden z-30"
                      style={{
                        border: '4px solid #36454F',
                        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                      }}
                      animate={{
                        y: [0, -12, 0],
                        rotate: [-8, -12, -8],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Image
                        src="/nft1.jpg"
                        alt="NFT Preview 1"
                        fill
                        className="object-cover"
                      />
                    </motion.div>
                  </div>

                  {/* Main Content */}
                  <div className="relative z-10">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-4xl font-bold text-gray-500"
                      style={{ fontFamily: 'var(--font-lilita)' }}
                    >
                      Bring out your inner art
                    </motion.h2>
                  </div>
                </div>
              ) : (
                <div className="bg-white backdrop-blur-2xl border border-gray-200 rounded-2xl h-[calc(100vh-7rem)] shadow-2xl overflow-y-auto">
                  {/* Gallery Header - Sticky */}
                  <div className="sticky top-0 z-20 bg-white px-8 pt-8 pb-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-1 text-gray-900">Your Collection</h2>
                        <p className="text-sm text-gray-600">{generatedImages.length} NFT{generatedImages.length !== 1 ? 's' : ''} generated</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#36454F' }}>
                        <Users className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">{generatedImages.filter(nft => nft.status === 'minted').length} minted</span>
                      </div>
                    </div>
                  </div>

                  {/* Gallery Grid */}
                  <div className="p-8 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {generatedImages.map((nft, index) => (
                        <motion.div
                          key={nft.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <NFTCard
                            nft={nft}
                            onRegenerate={() => console.log('Regenerate', nft.id)}
                            onViewMetadata={() => console.log('View metadata', nft.id)}
                            onMint={() => handleMintSingle(nft.id)}
                            isMinting={mintingNftId === nft.id}
                            mintProgress={mintingNftId === nft.id ? mintProgress : undefined}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      </div>
    </div>
    </>
  );
}
