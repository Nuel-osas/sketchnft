# SuiGen NFT Launchpad - Next.js Edition 🚀

**Modern, production-ready NFT launchpad with AI generation, Walrus storage, and Sui blockchain**

## ✨ What's New in Next.js Version

- **Modern UI/UX**: Completely redesigned with glassmorphism, animations, and modern gradients
- **Next.js 16**: Latest version with Turbopack and App Router
- **Framer Motion**: Smooth animations and transitions
- **Optimized Performance**: Built-in image optimization and code splitting
- **TypeScript**: Full type safety across the application
- **Tailwind CSS v4**: Modern design system with custom Sui branding

---

## 🎨 Features

### Core Functionality
- ✅ **AI Image Generation** - Gemini 3 Pro (1K/2K/4K resolutions)
- ✅ **AI Metadata Generation** - Gemini 2.5 Flash
- ✅ **Walrus Storage** - Decentralized image and metadata storage
- ✅ **Sui Blockchain** - Real NFT minting on Sui testnet
- ✅ **Wallet Integration** - @mysten/dapp-kit with auto-detection
- ✅ **Batch Generation** - Up to 20 NFTs with parallel processing

### UI/UX Enhancements
- 🎨 **Glassmorphism Design** - Modern glass-effect cards and panels
- ⚡ **Smooth Animations** - Framer Motion transitions throughout
- 🌈 **Gradient Mesh Background** - Animated background effects
- 📱 **Responsive Design** - Works on all screen sizes
- 🎯 **Status Indicators** - Real-time progress for all operations
- 🔗 **Explorer Integration** - Direct links to Sui Explorer

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
# Gemini API Key - IMPORTANT: Server-side only (no NEXT_PUBLIC_ prefix)
# This key is NEVER exposed to the frontend for security
GEMINI_API_KEY=your_gemini_api_key_here

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Walrus Storage
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_STORAGE_EPOCHS=10

# Smart Contract (deploy first, then add these)
NEXT_PUBLIC_NFT_PACKAGE_ID=
NEXT_PUBLIC_NFT_ADMIN_CAP_ID=
```

**Security Note**: The Gemini API key is stored server-side and NEVER exposed to the browser. All AI generation requests go through a secure API route at `/api/generate-image`.

### 3. Deploy Smart Contract

```bash
cd ../contract
sui move build
sui client publish --gas-budget 100000000
```

Copy the Package ID to `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Project Structure

```
nextjs-app/
├── app/
│   ├── api/
│   │   └── generate-image/
│   │       └── route.ts      # Server-side API for Gemini (secure)
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Main page with NFT generation
│   └── globals.css           # Global styles and utilities
├── components/
│   ├── Header.tsx            # Header with wallet connection
│   ├── NFTCard.tsx           # NFT display card
│   └── providers.tsx         # Sui providers wrapper
├── lib/
│   ├── services/
│   │   ├── imageGenerationService.ts  # Client-side wrapper
│   │   ├── geminiService.ts           # Legacy AI service
│   │   ├── walrusService.ts           # Walrus storage
│   │   ├── suiService.ts              # Sui blockchain
│   │   └── audioUtils.ts              # Audio processing
│   └── types.ts              # TypeScript types
└── public/                   # Static assets
```

---

## 🎨 Design System

### Colors

**Sui Brand Colors:**
- `sui-400`: #36bffa (light blue)
- `sui-500`: #0c9eeb (primary blue)
- `sui-600`: #0084d4 (darker blue)

**Background:**
- Dark theme with `slate-950` base
- Gradient mesh overlays
- Glass-morphism effects

### Custom Utilities

**Glass Effect:**
```jsx
<div className="glass">...</div>          // Light glass
<div className="glass-dark">...</div>     // Dark glass
```

**Gradient Text:**
```jsx
<h1 className="gradient-text">SuiGen</h1>
```

**Card Hover:**
```jsx
<div className="card-hover">...</div>
```

---

## 🔧 Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **UI Icons**: Lucide React
- **Type Safety**: TypeScript

### Blockchain
- **Network**: Sui
- **SDK**: @mysten/sui, @mysten/dapp-kit
- **Storage**: Walrus (HTTP API)
- **Smart Contract**: Move language

### AI
- **Image Generation**: Google Gemini 3 Pro
- **Metadata Generation**: Gemini 2.5 Flash

---

## 📱 Usage

### Generate NFTs

1. **Connect Wallet** - Click connect button in header
2. **Create Prompt** - Describe your NFT collection
3. **Select Style** - Choose from 8 art styles
4. **Pick Resolution** - 1K (fast), 2K, or 4K
5. **Set Quantity** - 1-20 NFTs
6. **Generate** - Click "Generate Collection" (uses server-side Gemini API)
7. **Mint** - Click "Mint All NFTs" after generation completes

---

## 🐛 Troubleshooting

### Build Errors

**Issue**: `Cannot find module '@mysten/dapp-kit/dist/index.css'`
**Solution**: We use Tailwind's built-in wallet styles instead.

**Issue**: `import.meta.env.VITE_* not found`
**Solution**: Use `process.env.NEXT_PUBLIC_*` in Next.js.

### Walrus Uploads

**Issue**: Upload fails with CORS error
**Solution**: Walrus testnet allows CORS. Check network tab for actual error.

### Wallet Connection

**Issue**: Wallet doesn't connect
**Solution**: Ensure you have a Sui wallet extension installed and are on testnet.

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Next.js SuiGen"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Connect GitHub repository
   - Add environment variables
   - Deploy!

### Build for Production

```bash
npm run build
npm start
```

---

## 📝 License

MIT

---

**Built with ❤️ using Next.js, Sui, Walrus, and Gemini AI**

**Status**: 🟢 **Ready for Development!**
