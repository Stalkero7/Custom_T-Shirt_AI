# AI T-Shirt Store

A full-stack application for designing custom AI-generated t-shirts with integrated Stripe payments and Printful manufacturing.

**Status**: ✅ All 4 major steps completed

## Quick Start

### Prerequisites
- Node.js 16+
- npm

### Installation

1. Clone/setup the repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
```
OPENAI_API_KEY=your_key_here
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...
PRINTFUL_API_KEY=your_key_here
```

### Running the Application

**Terminal 1 - Frontend:**
```bash
npm run dev
```
Frontend runs on `http://localhost:3000`

**Terminal 2 - Backend:**
```bash
npm run server
```
Backend runs on `http://localhost:5000`

## Project Structure

```
AITShirtStore/
├── src/
│   ├── components/
│   │   ├── TShirtEditor.jsx      # Step 1: Canvas
│   │   ├── ImageUploader.jsx     # Step 2: File upload
│   │   ├── PromptInput.jsx       # Step 2: AI generation
│   │   └── Checkout.jsx          # Step 4: Payment flow
│   ├── utils/
│   │   └── canvasUtils.js        # Canvas helpers
│   ├── styles/
│   │   ├── App.css
│   │   ├── TShirtEditor.css
│   │   ├── ImageUploader.css
│   │   ├── PromptInput.css
│   │   └── Checkout.css
│   ├── App.jsx
│   └── index.jsx
├── server/
│   ├── index.js                  # Express server & routes
│   ├── imageProcessor.js         # Step 3: Sharp compositing
│   └── checkout.js               # Step 4: Payment/Printful
├── public/
│   └── assets/                   # T-shirt background images
├── vite.config.js
├── package.json
└── index.html
```

## Implementation Overview

### Step 1: Interactive Canvas Module ✅

**File**: [STEP1.md](STEP1.md) | Component: [TShirtEditor.jsx](src/components/TShirtEditor.jsx)

- 500x600 fabric.js canvas
- White/Black t-shirt backgrounds
- Printable area visualization (300x350px)
- Drag & scale object constraints

### Step 2: Image Injection & Upload Module ✅

**File**: [STEP2.md](STEP2.md) | Components: [ImageUploader.jsx](src/components/ImageUploader.jsx), [PromptInput.jsx](src/components/PromptInput.jsx)

- React-dropzone file upload
- OpenAI DALL-E 3 image generation
- Auto-scaling to fit printable area
- Image constraint handlers
- Backend endpoint: `POST /api/generate-ai`

### Step 3: Backend Image Processing ✅

**File**: [STEP3.md](STEP3.md) | Service: [imageProcessor.js](server/imageProcessor.js)

- Sharp library image compositing
- T-shirt template generation
- Design placement & centering
- High-resolution print version (300 DPI)
- Endpoints:
  - `POST /api/finalize-design`
  - `POST /api/finalize-design-download`

### Step 4: Checkout & Order Generation ✅

**File**: [STEP4.md](STEP4.md) | Component: [Checkout.jsx](src/components/Checkout.jsx), Service: [checkout.js](server/checkout.js)

- Stripe Payment Intent creation
- Order cost calculation
- Printful API order submission
- Order confirmation flow
- Endpoints:
  - `POST /api/checkout`
  - `POST /api/confirm-payment`
  - `GET /api/printful-products`
  - `GET /api/printful-variants/:productId`
  - `POST /api/calculate-cost`

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Fabric.js 7** - Canvas manipulation
- **React-dropzone 15** - File uploads
- **Axios 1.13** - HTTP requests
- **Vite 5** - Build tool

### Backend
- **Node.js/Express 5** - Server framework
- **Sharp 0.34** - Image processing
- **OpenAI 6.27** - AI image generation
- **Stripe 20.4** - Payment processing
- **CORS 2.8** - Cross-origin requests

## API Reference

### Image Generation
- `POST /api/generate-ai` - Generate image from text prompt

### Design Processing
- `POST /api/finalize-design` - Composite design onto t-shirt
- `POST /api/finalize-design-download` - Download finalized image

### Checkout Flow
- `POST /api/checkout` - Create Stripe payment intent
- `POST /api/confirm-payment` - Confirm payment and submit order
- `GET /api/printful-products` - Get available products
- `GET /api/printful-variants/:productId` - Get product variants
- `POST /api/calculate-cost` - Calculate order total

### Utilities
- `GET /api/health` - Health check endpoint

## Features

✅ Interactive t-shirt designer with fabric.js
✅ Drag-and-drop image upload
✅ AI image generation with DALL-E 3
✅ Auto-scaling and constraint logic
✅ Design compositing with Sharp
✅ High-DPI print generation (300 DPI)
✅ Stripe payment integration
✅ Printful order submission
✅ Complete checkout workflow
✅ Order confirmation screen
✅ Responsive design (mobile/tablet)
✅ Professional error handling

## Environment Variables

```env
# Frontend API
VITE_API_URL=http://localhost:5000

# Backend
PORT=5000
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk_...

# Stripe (test mode keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# Printful
PRINTFUL_API_KEY=...
```

**Get Your Keys:**
- **OpenAI**: https://platform.openai.com/api-keys
- **Stripe**: https://dashboard.stripe.com/apikeys
- **Printful**: https://www.printful.com/dashboard/integration

## Development

### Scripts
- `npm run dev` - Start frontend dev server
- `npm run build` - Build production frontend
- `npm run preview` - Preview production build
- `npm run server` - Start backend server

### Available API Test Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Generate image (requires OPENAI_API_KEY)
curl -X POST http://localhost:5000/api/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A cool design"}'

# Calculate cost
curl -X POST http://localhost:5000/api/calculate-cost \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":3001,"quantity":1}]}'
```

## Production Deployment

When ready for production:

1. **Stripe**: Switch to live API keys
2. **Printful**: Verify API access with live credentials
3. **Environment**: Set `NODE_ENV=production`
4. **Database**: Add order history persistence
5. **Webhooks**: Implement Stripe & Printful webhooks
6. **Email**: Set up order confirmation emails
7. **Monitoring**: Add error tracking
8. **Scaling**: Consider load balancing for backend

## Troubleshooting

### OpenAI API Errors
- Check `OPENAI_API_KEY` in `.env`
- Verify key has sufficient credits
- Check rate limits

### Image Processing Issues
- Ensure design image URL is publicly accessible
- Check Printful product/variant IDs
- Verify image format (PNG, JPG supported)

### Payment Issues
- Use Stripe test keys for development
- Check client secret generation
- Verify shipping address fields

### Printful Integration
- Confirm API key is valid
- Check product/variant availability
- Verify design URL accessibility

## Documentation

- [Step 1: Interactive Canvas](STEP1.md)
- [Step 2: Image Upload & AI](STEP2.md)
- [Step 3: Image Processing](STEP3.md)
- [Step 4: Checkout & Orders](STEP4.md)

## Key Files Reference

| File | Purpose |
|------|---------|
| [src/components/TShirtEditor.jsx](src/components/TShirtEditor.jsx) | Main canvas editor |
| [src/utils/canvasUtils.js](src/utils/canvasUtils.js) | Canvas helpers |
| [server/imageProcessor.js](server/imageProcessor.js) | Sharp compositing |
| [server/checkout.js](server/checkout.js) | Stripe & Printful |
| [vite.config.js](vite.config.js) | Frontend build config |

## Support & Resources

- **Stripe**: https://stripe.com/docs
- **Printful**: https://developers.printful.com/
- **Fabric.js**: http://fabricjs.com/
- **Sharp**: https://sharp.pixelplumbing.com/
- **OpenAI**: https://platform.openai.com/docs

## License

MIT

---

**Built with ❤️ for custom t-shirt design automation**
