'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the content component with SSR disabled to avoid wallet hook issues
const CollectionContent = dynamic(() => import('./CollectionContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading collection...</p>
      </div>
    </div>
  ),
});

export default function CollectionPage() {
  return <CollectionContent />;
}
