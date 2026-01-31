'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CustomConnectButton } from '@/components/CustomConnectButton';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 py-3 bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center group">
            <span className="font-bold text-2xl md:text-4xl tracking-wider transition-colors group-hover:opacity-90" style={{ color: '#36454F', fontFamily: 'var(--font-lilita)' }}>
              SketchNFT
            </span>
          </Link>
        </div>

        {/* Right side - Navigation + Connect Button */}
        <div className="flex items-center gap-4 md:gap-8">
          {/* Navigation - Always visible */}
          <nav className="flex items-center gap-4 md:gap-8 text-gray-700 font-medium text-xs md:text-sm tracking-wider uppercase">
            <Link
              href="/collection"
              className={`hover:text-gray-900 transition-colors ${pathname === '/collection' ? 'text-gray-900 font-semibold' : ''}`}
            >
              Collection
            </Link>
          </nav>

          <div className="flex items-center">
            <CustomConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
