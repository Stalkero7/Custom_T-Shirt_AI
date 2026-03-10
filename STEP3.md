# Step 3: Backend Image Processing

## Overview

This step implements server-side image compositing using the Sharp library to combine user designs onto t-shirt templates. The process creates print-ready images at high resolution (300 DPI).

## Architecture

```
Frontend (TShirtEditor)
        ↓
  Export Canvas Design
        ↓
POST /api/finalize-design
        ↓
┌─────────────────────────────────┐
│   imageProcessor.js (Sharp)     │
│  ┌──────────────────────────┐   │
│  │ 1. Create T-Shirt Template│  │
│  │    (SVG → PNG)           │   │
│  └──────────────────────────┘   │
│           ↓                      │
│  ┌──────────────────────────┐   │
│  │ 2. Load Design Image     │   │
│  │    (URL → Buffer)        │   │
│  └──────────────────────────┘   │
│           ↓                      │
│  ┌──────────────────────────┐   │
│  │ 3. Resize Design         │   │
│  │    (Fit to printable)    │   │
│  └──────────────────────────┘   │
│           ↓                      │
│  ┌──────────────────────────┐   │
│  │ 4. Composite Images      │   │
│  │    (Design on T-Shirt)   │   │
│  └──────────────────────────┘   │
│           ↓                      │
│  ┌──────────────────────────┐   │
│  │ 5. Generate Print Ver.   │   │
│  │    (Scale to 300 DPI)    │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
        ↓
   Return PNG Data
        ↓
Frontend Display or Download
```

## Key Components

### imageProcessor.js

Core image processing service using Sharp.

#### `createTShirtTemplate(color)`

Creates an SVG-based t-shirt template with optional guides.

**Parameters**:
- `color`: 'white' or 'black'

**Returns**: PNG buffer of t-shirt template

**Features**:
- Optimized t-shirt silhouette
- Neckline definition
- Sleeve guides (optional)
- Color-appropriate stroke lines

**Example**:
```javascript
const template = await createTShirtTemplate('white');
// Returns: Buffer with 500x600 PNG
```

#### `compositeDesignOntoTShirt(backgroundColor, designImage, dpi)`

Composites a design image onto a t-shirt template.

**Parameters**:
- `backgroundColor`: 'white' or 'black'
- `designImage`: Buffer, file path, or image URL
- `dpi`: Print resolution (default: 300)

**Returns**: Composited image as PNG buffer

**Process**:
1. Creates t-shirt template
2. Loads design image from various sources
3. Calculates scale to fit printable area
4. Resizes design while maintaining aspect ratio
5. Centers design on t-shirt
6. Composites images together
7. Returns final PNG

**Example**:
```javascript
const composite = await compositeDesignOntoTShirt(
  'white',
  'https://example.com/design.png',
  300
);
```

#### `generatePrintVersion(image, targetDpi)`

Upscales image for high-quality printing.

**Parameters**:
- `image`: Buffer of image to upscale
- `targetDpi`: Target DPI (default: 300)

**Returns**: Upscaled PNG buffer

**Process**:
1. Calculates scale factor (96 DPI → 300 DPI = 3.125x)
2. Uses Lanczos3 resampling for quality
3. High compression for file size
4. Returns print-ready image

**Example**:
```javascript
const printVersion = await generatePrintVersion(composited, 300);
// 3.125x larger for high-quality printing
```

#### `processTShirtDesign(designData, dpi)`

Main function that orchestrates the entire process.

**Parameters**:
- `designData`:
  - `backgroundColor`: 'white' or 'black'
  - `designImageUrl`: URL or path to design image
- `dpi`: Print resolution (default: 300)

**Returns**:
```json
{
  "success": true,
  "baseImage": Buffer,
  "printImage": Buffer,
  "dpi": 300,
  "timestamp": "2026-03-10T..."
}
```

## API Endpoints

### POST /api/finalize-design

Finalizes a design and returns both base and print versions.

**Request**:
```json
{
  "backgroundColor": "white",
  "designImageUrl": "https://example.com/design.png",
  "dpi": 300
}
```

**Response** (JSON with base64 images):
```json
{
  "success": true,
  "baseImage": "data:image/png;base64,iVBORw0KGgo...",
  "printImage": "data:image/png;base64,iVBORw0KGgo...",
  "dpi": 300,
  "timestamp": "2026-03-10T12:34:56Z"
}
```

**Use Case**: For preview/display purposes

### POST /api/finalize-design-download

Finalizes a design and returns raw PNG file.

**Request**:
```json
{
  "backgroundColor": "white",
  "designImageUrl": "https://example.com/design.png",
  "dpi": 300
}
```

**Response**: Raw PNG file

**Use Case**: For direct download or sending to Printful (Step 4)

## Technical Details

### Printable Area Calculations

```javascript
// Canvas dimensions
canvasWidth = 500px
canvasHeight = 600px

// Printable area (center of t-shirt)
printableWidth = 300px
printableHeight = 350px
printableX = (500 - 300) / 2 = 100px
printableY = (600 - 350) / 2 = 125px

// Design scaling (maintains aspect ratio)
if (designWidth > printableWidth || designHeight > printableHeight) {
  scaleX = printableWidth / designWidth
  scaleY = printableHeight / designHeight
  scale = min(scaleX, scaleY)
}

// Centering calculation
designX = printableX + (printableWidth - scaledWidth) / 2
designY = printableY + (printableHeight - scaledHeight) / 2
```

### DPI Scaling

Standard web DPI is 96. Print DPI is typically 300 for quality.

```javascript
// Scale calculation
scale = targetDpi / 96
// 300 DPI: 300/96 = 3.125x

// New dimensions
newWidth = originalWidth * 3.125
newHeight = originalHeight * 3.125

// Example: 500x600 at 96 DPI
// 500 * 3.125 = 1562.5px
// 600 * 3.125 = 1875px
// Resulting: 1562x1875 at 300 DPI
```

### Image Format Support

The processor handles:
- URLs (http/https)
- Data URLs (base64)
- File paths
- Buffers directly

```javascript
// URL
await compositeDesignOntoTShirt('white', 'https://...')

// Data URL (from frontend canvas)
await compositeDesignOntoTShirt('white', 'data:image/png;base64,...')

// File path
await compositeDesignOntoTShirt('white', './uploads/design.png')

// Buffer
await compositeDesignOntoTShirt('white', imageBuffer)
```

## Usage from Frontend

### Export and Send Design

```javascript
// In TShirtEditor component

const handleExportDesign = async () => {
  const canvasState = getCanvasState();
  
  try {
    const response = await axios.post('/api/finalize-design', {
      backgroundColor: selectedColor,
      designImageUrl: canvasState.dataUrl, // Canvas as data URL
      dpi: 300
    });

    // Use response.data.baseImage for preview
    // Use response.data.printImage for download/order
    displayPreview(response.data.baseImage);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Download Finalized Design

```javascript
const handleDownload = async () => {
  try {
    const response = await axios.post(
      '/api/finalize-design-download',
      {
        backgroundColor: selectedColor,
        designImageUrl: canvasState.dataUrl,
        dpi: 300
      },
      { responseType: 'blob' }
    );

    // Create download link
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tshirt-design-${Date.now()}.png`;
    link.click();
  } catch (error) {
    console.error('Download failed:', error);
  }
};
```

## Error Handling

Common errors and solutions:

### "Failed to load image"
- **Cause**: Invalid image URL or CORS issue
- **Solution**: Use accessible images, check CORS headers

### "Compositing failed"
- **Cause**: Incompatible image format
- **Solution**: Ensure PNG/JPG/WebP formats

### "Invalid backgroundColor"
- **Cause**: Color not 'white' or 'black'
- **Solution**: Validate color on frontend before sending

## Performance Considerations

### Image Size
- Base composite: ~150-200 KB
- Print version (300 DPI): ~500-800 KB
- Time to process: ~1-3 seconds

### Optimization Tips
1. Compress design images before sending
2. Use appropriate data URLs (not too large)
3. Cache t-shirt templates if processing many designs
4. Use nginx compression for responses

### Sharp Performance
- Single-threaded by default
- Good for concurrent requests with Node.js
- Consider worker threads for high load

## File Structure

```
server/
├── index.js                 # Express app and endpoints
├── imageProcessor.js        # Sharp-based image processing
└── (Step 4: checkout.js)    # To be added
```

## Dependencies

Required packages (already installed):
- `sharp` - Image processing
- `express` - Server framework
- `cors` - Cross-origin requests

## Configuration

No special configuration needed. Sharp automatically:
- Detects image formats
- Handles color spaces
- Optimizes output

## Testing the Endpoint

### Using cURL

```bash
curl -X POST http://localhost:5000/api/finalize-design \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundColor": "white",
    "designImageUrl": "https://example.com/test.png",
    "dpi": 300
  }'
```

### Using Postman

1. Set method to POST
2. URL: `http://localhost:5000/api/finalize-design`
3. Body (raw JSON):
   ```json
   {
     "backgroundColor": "white",
     "designImageUrl": "https://example.com/test.png",
     "dpi": 300
   }
   ```

## What's Next (Step 4)

Step 4 will implement:
- Stripe payment processing
- Printful API integration
- Webhook handling
- Order submission

The print-ready image from Step 3 will be sent to Printful's API for manufacturing.
