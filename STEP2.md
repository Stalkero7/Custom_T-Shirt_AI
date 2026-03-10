# Step 2: Image Injection & Upload Module

## Overview

This step adds user-facing image input capabilities to the application:

1. **ImageUploader Component** - Accepts local file uploads via drag-and-drop
2. **PromptInput Component** - Sends text descriptions to OpenAI's DALL-E 3 for AI image generation
3. **Canvas Utilities** - Helper functions for adding and constraining images on the fabric canvas

## Architecture

```
┌─────────────────────────────────────────────┐
│         TShirtEditor Component              │
│  ┌──────────────┐     ┌─────────────────┐  │
│  │   Canvas     │     │  Input Section  │  │
│  │  (fabric.js) │     │  ┌────────────┐ │  │
│  │              │     │  │ ImageUp    │ │  │
│  │  - Designs   │     │  │ loader     │ │  │
│  │  - Constrain │     │  └────────────┘ │  │
│  │    objects   │     │  ┌────────────┐ │  │
│  └──────────────┘     │  │ PromptInput│ │  │
│                       │  │ → OpenAI   │ │  │
│                       │  └────────────┘ │  │
│                       └─────────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
            Frontend (Port 3000)
                    ↓
         Backend Express (Port 5000)
                    ↓
         /api/generate-ai endpoint
                    ↓
              OpenAI API (DALL-E 3)
```

## Components

### 1. ImageUploader.jsx

**Purpose**: Accepts image files via drag-and-drop

**Props**:
- `onImageUpload(imageData)` - Callback when image is selected

**Usage**:
```jsx
<ImageUploader onImageUpload={handleImageUpload} />
```

**Features**:
- Drag-and-drop file input
- Visual feedback on drag-over
- Supports PNG, JPG, GIF, WebP
- Multiple file selection
- Converts to data URL for immediate use

**Flow**:
1. User drags or selects image
2. File is read as Data URL
3. `onImageUpload` is called with image data
4. Image is added to canvas

### 2. PromptInput.jsx

**Purpose**: Generates images from text descriptions using OpenAI

**Props**:
- `onImageGenerated(imageData)` - Callback when image is generated
- `isLoading` - External loading state

**Usage**:
```jsx
<PromptInput onImageGenerated={handleImage} isLoading={loading} />
```

**Features**:
- Text area for prompt input
- Real-time generation feedback
- Helpful tips for better results
- Enter key submission support
- Error handling and user feedback

**Flow**:
1. User enters prompt and clicks "Generate"
2. Request sent to `POST /api/generate-ai`
3. Backend calls DALL-E 3 API
4. Image URL returned to frontend
5. `onImageGenerated` callback triggered
6. Image added to canvas

### 3. canvasUtils.js

**Utility Functions**:

#### `addImageToCanvas(fabricCanvas, imageUrl, printableArea)`
- Loads image from URL
- Auto-calculates scale to fit printable area
- Centers image in printable area
- Returns Promise with fabric.Image object

#### `constrainObjectToArea(object, printableArea)`
- Keeps objects within printable boundaries
- Prevents overflow during drag/scale
- Updates object position/size

#### `getDesignObjects(fabricCanvas)`
- Returns all user-added designs
- Excludes background and area markers

#### `exportCanvasDesign(fabricCanvas, backgroundColor)`
- Exports complete design state
- Returns JSON + PNG data URL
- Ready for backend processing (Step 3)

## Backend: Express Server

### Setup (server/index.js)

```javascript
- Express app on port 5000
- CORS enabled for frontend communication
- Body size limit: 50MB (for image handling)
- Environment variable configuration
```

### API Endpoints

#### `POST /api/generate-ai`

Generates images using OpenAI DALL-E 3.

**Request**:
```json
{
  "prompt": "A cool retro 80s synthwave design..."
}
```

**Response**:
```json
{
  "success": true,
  "imageUrl": "https://...",
  "prompt": "A cool retro 80s synthwave design..."
}
```

**Error Handling**:
- Validates OPENAI_API_KEY in environment
- Returns appropriate HTTP status codes
- Provides helpful error messages

**Usage in Frontend**:
```javascript
const response = await axios.post('/api/generate-ai', {
  prompt: userPrompt
});
const imageUrl = response.data.imageUrl;
```

## Implementation Details

### Image Auto-Scaling Logic

```javascript
function addImageToCanvas(canvas, imageUrl, printableArea) {
  // Calculate max dimensions
  maxWidth = printableArea.width - 20px
  maxHeight = printableArea.height - 20px

  // Calculate scale factor
  scaleX = maxWidth / image.width
  scaleY = maxHeight / image.height
  scale = min(scaleX, scaleY)

  // Center in printable area
  left = printableArea.x + (width - image.width * scale) / 2
  top = printableArea.y + (height - image.height * scale) / 2
}
```

### Constraint Logic

Used on `object:moving` and `object:scaling` events:

```javascript
fabricCanvas.on('object:moving', (e) => {
  constrainObjectToArea(e.target, printableArea)
})

function constrainObjectToArea(obj, area) {
  // Prevent left/top overflow
  if (obj.left < area.x) obj.left = area.x
  if (obj.top < area.y) obj.top = area.y

  // Prevent right/bottom overflow
  if (obj.right > area.x + area.width) {
    obj.left = area.x + area.width - obj.width
  }
  if (obj.bottom > area.y + area.height) {
    obj.top = area.y + area.height - obj.height
  }
}
```

## Environment Variables Required

Add to `.env` file:

```
OPENAI_API_KEY=your_key_here
```

Get your API key from: https://platform.openai.com/api-keys

## Development Workflow

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
# Copy example
cp .env.example .env

# Edit and add OPENAI_API_KEY
```

### 3. Start Backend Server
```bash
npm run server
```
Server starts on http://localhost:5000

### 4. Start Frontend (in new terminal)
```bash
npm run dev
```
Frontend starts on http://localhost:3000

### 5. Test the Flow

**Upload Test**:
1. Click Canvas section
2. Drag an image to "Upload Your Design"
3. Image appears on canvas, centered and scaled

**AI Generation Test**:
1. Enter prompt: "A cool tech logo design"
2. Click "Generate Image"
3. Wait for API response
4. Generated image appears on canvas

## Styling

### ImageUploader.css
- Styled drag-and-drop zone
- Hover and active states
- Responsive mobile layout

### PromptInput.css
- Text area with focus states
- Generate button with loading spinner
- Tips section with styling
- Mobile responsive

### TShirtEditor.css (Updated)
- Two-column grid layout
- Canvas on left (fixed aspect ratio)
- Input components on right
- Responsive: stacks on mobile
- Clear & Export buttons

## Common Issues & Solutions

### OpenAI API Errors

**Issue**: "Invalid API Key"
- **Solution**: Check `OPENAI_API_KEY` in `.env` file

**Issue**: "Rate limited"
- **Solution**: Wait a moment between requests, check OpenAI quota

**Issue**: Image generation takes too long
- **Solution**: DALL-E typically takes 10-30 seconds, normal behavior

### Image Upload Issues

**Issue**: "Failed to add image"
- **Solution**: Check browser console for CORS errors, verify image format

**Issue**: Image not centered/scaled
- **Solution**: Verify printableArea object has correct dimensions

## What's Next (Step 3)

In Step 3, we'll implement the `/api/finalize-design` endpoint that:
- Takes the exported canvas design
- Uses Sharp library to composite the design onto a t-shirt template
- Generates a high-resolution 300DPI PNG
- Prepares image for printing on Printful

The `exportCanvasDesign` utility function returns all data needed for Step 3.
