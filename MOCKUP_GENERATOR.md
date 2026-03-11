# 🎨 Mockup Generator - AI-Powered T-Shirt Mockups

## Overview

The **Mockup Generator** is a powerful new tool that creates realistic product photos of your t-shirt designs. It uses:
- **DALL-E 3** for AI-powered image generation
- **Sharp** for precise image compositing
- **Professional mockup templates** from your `public/` folder

This feature allows you to showcase designs on realistic t-shirt mockups, perfect for marketing, product previews, or customer demonstrations.

## What It Does

1. **Accepts a design** - Upload a PNG, JPG, or WebP image (your t-shirt design)
2. **Chooses a mockup** - Select from white or black t-shirt templates
3. **Blends intelligently** - Uses AI to create a realistic product photo
4. **Generates mockup** - Returns a professional mockup image you can download

## How It Works

### Step 1: Design Upload
- Drag & drop or click to upload your design image
- Supports PNG, JPG, WebP formats
- Max file size: 20MB
- Preview appears after selection

### Step 2: Mockup Selection
- Choose between "White T-Shirt" or "Black T-Shirt"
- These templates come from `public/tshirt-white.png` and `public/tshirt-black.png`

### Step 3: AI Generation
The process has two phases:

**Phase 1: Compositing with Sharp**
- Design is resized to 50% mockup height
- Centered horizontally on the shirt
- Positioned in the middle of the shirt (vertical center)
- Creates a base composite image

**Phase 2: DALL-E Enhancement**
- The composite is sent to DALL-E 3 with a professional prompt
- AI generates a realistic product photo with:
  - Professional lighting
  - Natural shadows and depth
  - Proper perspective
  - High-quality finish

### Step 4: Download
- Download the generated mockup as a PNG file
- Use immediately in marketing, social media, or product listings
- Create unlimited mockups

## Architecture

### Frontend (React Component)
**File:** `src/components/MockupGenerator.jsx`

```jsx
<MockupGenerator>
  ├── Mockup Selection Grid
  ├── Design Upload Dropzone
  ├── Generated Mockup Preview 
  ├── Action Buttons
  └── Info Section
```

**Features:**
- React Dropzone for drag & drop
- File validation (type + size)
- Real-time preview
- Error handling with user feedback
- Clean, responsive UI

### Backend (Express API)
**File:** `server/index.js`

**Endpoint:** `POST /api/create-mockup`

```javascript
Accepts: multipart/form-data
Fields:
  - design: File (image)
  - mockup: string ("white" or "black")
  - prompt: string (optional, AI enhancement prompt)

Returns: JSON
{
  success: boolean,
  mockupUrl: string,
  downloadUrl: string,
  mockupType: string,
  timestamp: ISO string
}
```

**Process:**
1. Validates input (file + mockup type)
2. Loads design file from upload
3. Loads mockup template from `public/`
4. Composites using Sharp helper function
5. Sends to DALL-E 3 for enhancement
6. Downloads result and saves locally
7. Returns URLs for display + download

### Helper Functions

**`compositeImageWithSharp(mockupBuffer, designBuffer)`**
- Calculates optimal sizing and positioning
- Creates composite image with design on mockup
- Returns PNG buffer for AI enhancement

**`downloadAndSaveImage(imageUrl)`**
- Downloads DALL-E generated image
- Saves to `tmp-images/` folder
- Returns local serving URL
- Prevents CORS issues

## File Structure

```
project/
├── src/
│   ├── components/
│   │   └── MockupGenerator.jsx      ← New component
│   └── styles/
│       └── MockupGenerator.css      ← Component styles
├── server/
│   └── index.js                     ← Backend endpoint
├── public/
│   ├── tshirt-white.png            ← Mockup template
│   └── tshirt-black.png            ← Mockup template
├── tmp-images/                      ← Generated mockup storage
└── tmp-uploads/                     ← Temporary design uploads
```

## Environment Variables

Add to `.env`:

```env
# Required for mockup generation (same as Step 2)
OPENAI_API_KEY=sk-...
```

## Dependencies

Added `multer` for file upload handling:

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1"
  }
}
```

Install with: `npm install`

## Usage Guide

### For Users

1. **Navigate to Mockup Generator**
   - Click "🎨 Mockup Generator" button in nav bar

2. **Select Mockup Style**
   - Choose White or Black t-shirt template

3. **Upload Design**
   - Drag image to dropzone or click to select
   - Wait for preview to appear

4. **Generate Mockup**
   - Click "✨ Generate Realistic Mockup"
   - AI processing takes 10-30 seconds
   - Result appears in preview

5. **Download**
   - Click "⬇️ Download Mockup"
   - Use in marketing, social media, etc.

### For Developers

**Creating Custom Mockup Templates:**

1. Create a mockup image with a t-shirt (person wearing shirt optional)
2. Save as PNG to `public/` folder
3. Update `mockups` array in `MockupGenerator.jsx` to include new option
4. Update server-side mockup validation

**Adjusting AI Prompts:**

Edit the prompt in step 3 of `/api/create-mockup`:

```javascript
const enhancedPrompt = `Professional product photo of a ${mockup} t-shirt...`;
```

**Customizing Composite Positioning:**

In `compositeImageWithSharp()`:

```javascript
const designHeight = Math.floor(mockupHeight * 0.5); // 50% height
const top = Math.floor((mockupHeight - designHeight) / 2.5); // Vertical position
```

## Performance Notes

- Image generation takes 15-30 seconds (DALL-E API)
- Uploads limited to 20MB per file
- Old images cleaned up (keeps last 5 generated)
- Composite sizing optimized for visibility

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Valid image but fails | API key issue | Check `.env` OPENAI_API_KEY |
| Rate limited (429) | Too many requests | Wait 1 minute, try again |
| File too large | >20MB | Compress image before upload |
| Mockup not found | public/ files missing | Verify tshirt-*.png files exist |
| Invalid file type | Non-image file | Upload PNG, JPG, or WebP |

## Integration with Existing Features

The Mockup Generator is **independent** but can work with:

- **Design Editor**: Export design → Generate mockup
- **AI Generator**: Generate design → Create mockup  
- **Checkout**: Show mockup in product preview

## Future Enhancements

Potential improvements:

1. **Multiple Mockup Templates**
   - Hoodies, sweatshirts, tank tops
   - Different person poses
   - Flat lay backgrounds

2. **Batch Processing**
   - Generate mockups for multiple designs at once
   - Download as ZIP

3. **Custom Prompts**
   - User input for AI enhancement
   - Style presets (vintage, modern, sporty)

4. **Gallery/History**
   - Save generated mockups
   - Browse history
   - Organizer view

5. **Advanced Positioning**
   - Drag to reposition design
   - Resize control
   - Preview before generation

## Testing

### Manual Testing

```bash
# 1. Install dependencies
npm install

# 2. Start backend server
npm run server

# 3. In new terminal, start frontend
npm run dev

# 4. Navigate to http://localhost:5173
# 5. Click "🎨 Mockup Generator"
# 6. Upload a design image
# 7. Select mockup style
# 8. Click "Generate Realistic Mockup"
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Create mockup (requires file upload)
curl -X POST \
  -F "design=@design.png" \
  -F "mockup=white" \
  -F "prompt=Professional mockup" \
  http://localhost:5000/api/create-mockup
```

## API Response Examples

### Success Response
```json
{
  "success": true,
  "mockupUrl": "/api/tmp-image/design-1710086400000.png",
  "downloadUrl": "/api/tmp-image/design-1710086400000.png",
  "mockupType": "white",
  "timestamp": "2026-03-11T10:00:00.000Z"
}
```

### Error Response
```json
{
  "error": "Failed to create mockup",
  "details": "OPENAI_API_KEY not configured"
}
```

## Troubleshooting

**Mockup generation hangs:**
- Check server logs for errors
- Verify OPENAI_API_KEY is valid
- Ensure design file is real image

**Images not saving:**
- Check `tmp-images/` and `tmp-uploads/` folders exist
- Verify write permissions on server

**Bad quality results:**
- Ensure design image is high quality
- Try different mockup styles
- Adjust composite positioning in code

**Memory issues:**
- Clean up `tmp-images/` and `tmp-uploads/` folders
- Reduce image sizes before upload

## Summary

The Mockup Generator leverages DALL-E's powerful image generation combined with precise technical compositing to produce realistic, production-quality mockups. It integrates seamlessly with your existing T-Shirt Store workflow and provides an essential tool for product visualization and marketing.

---

**Questions?** Check the TODO or server logs for debugging information.
