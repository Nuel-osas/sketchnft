import { NextRequest, NextResponse } from 'next/server';
import { uploadBlobWithServerKey, base64ToUint8Array, getBlobUrl } from '@/lib/services/walrusSDK';

// Increase body size limit for large images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(request: NextRequest) {
  console.log('[Walrus API] Received upload request');

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Walrus API] Failed to parse request body:', parseError);
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const { data, type } = body;

    if (!data) {
      console.error('[Walrus API] No data provided');
      return NextResponse.json({ success: false, error: 'No data provided' }, { status: 400 });
    }

    console.log(`[Walrus API] Processing ${type} upload, data length: ${data.length}`);

    let blobData: Uint8Array;

    if (type === 'image') {
      // Convert base64 to Uint8Array
      blobData = base64ToUint8Array(data);
      console.log(`[Walrus API] Image decoded, size: ${(blobData.length / 1024).toFixed(2)} KB`);
    } else {
      // JSON metadata - encode as UTF-8
      const encoder = new TextEncoder();
      blobData = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data));
      console.log(`[Walrus API] Metadata encoded, size: ${blobData.length} bytes`);
    }

    // Upload using SDK with server's private key (server pays WAL tokens)
    console.log('[Walrus API] Uploading via Walrus SDK (server pays WAL)...');

    const result = await uploadBlobWithServerKey(blobData, {
      epochs: 5, // ~10 weeks on mainnet
      deletable: false,
    });

    console.log(`[Walrus API] Upload successful! Blob ID: ${result.blobId}`);

    return NextResponse.json({
      success: true,
      hash: result.blobId,
      gatewayUrl: result.url,
    });
  } catch (error) {
    console.error('[Walrus API] Unexpected error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Upload failed';

    // Provide helpful error messages
    if (errorMessage.includes('No wallet configured')) {
      return NextResponse.json(
        { success: false, error: 'Server wallet not configured. Please set WALRUS_PRIVATE_KEY in .env.local' },
        { status: 500 }
      );
    }

    if (errorMessage.includes('Insufficient') || errorMessage.includes('balance')) {
      return NextResponse.json(
        { success: false, error: 'Server wallet has insufficient WAL or SUI balance for upload' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
