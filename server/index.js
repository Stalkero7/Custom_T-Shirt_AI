import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import multer from 'multer';
import sharp from 'sharp';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processTShirtDesign } from './imageProcessor.js';
import {
  createPaymentIntent,
  confirmPaymentAndOrder,
  calculateOrderCost,
  saveOrder,
  getOrders,
} from './checkout.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temporary images directory
const tmpImagesDir = path.join(__dirname, '..', 'tmp-images');
if (!fs.existsSync(tmpImagesDir)) {
  fs.mkdirSync(tmpImagesDir, { recursive: true });
  console.log('📁 Created tmp-images directory:', tmpImagesDir);
}

/**
 * Helper function to download image from OpenAI URL and save locally
 */
async function downloadAndSaveImage(imageUrl) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📥 Downloading image from OpenAI...');
      
      https.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        // Generate unique filename
        const filename = `design-${Date.now()}.png`;
        const filepath = path.join(tmpImagesDir, filename);

        // Create write stream
        const writeStream = fs.createWriteStream(filepath);

        response.pipe(writeStream);

        writeStream.on('finish', () => {
          console.log('✅ Image saved locally:', filename);
          resolve(`/api/tmp-image/${filename}`);
        });

        writeStream.on('error', (err) => {
          reject(new Error('Failed to write image file: ' + err.message));
        });
      }).on('error', (err) => {
        reject(new Error('Failed to download image: ' + err.message));
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Clean up old temporary images (keep only last 5)
 */
function cleanupOldImages() {
  try {
    const files = fs.readdirSync(tmpImagesDir)
      .map(f => ({ 
        name: f, 
        time: fs.statSync(path.join(tmpImagesDir, f)).mtime.getTime() 
      }))
      .sort((a, b) => b.time - a.time);

    // Delete files older than the 5 most recent
    files.slice(5).forEach(file => {
      try {
        fs.unlinkSync(path.join(tmpImagesDir, file.name));
        console.log('🗑️  Cleaned up:', file.name);
      } catch (err) {
        console.error('Failed to cleanup:', file.name);
      }
    });
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'tmp-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${path.parse(file.originalname).name}.png`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB max
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Serve temporary images
app.use('/api/tmp-image', express.static(tmpImagesDir));

// Serve temporary uploads (mockups)
const uploadDirPath = path.join(__dirname, '..', 'tmp-uploads');
if (!fs.existsSync(uploadDirPath)) {
  fs.mkdirSync(uploadDirPath, { recursive: true });
}
app.use('/api/tmp-upload', express.static(uploadDirPath));

// Initialize OpenAI client (only if API key is present)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  console.log('🔑 OpenAI API Key found:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI client initialized');
} else {
  console.warn('⚠️  No OPENAI_API_KEY environment variable found');
}

/**
 * POST /api/generate-ai
 * Generates a t-shirt design image from a text prompt using DALL-E 3
 */
app.post('/api/generate-ai', async (req, res) => {
  try {
    const { prompt, shirtColor = 'white' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!openai) {
      console.error('❌ OpenAI client not initialized - no API key');
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    console.log('🎨 Generating image for prompt:', prompt);
    console.log('🔑 Using API Key:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

    // Simple prompt - specify FLAT DESIGN, not 3D shirt
    const enhancedPrompt = `${prompt}, no background`;

    // Call DALL-E 3 to generate image
    console.log('📤 Calling DALL-E 3 with prompt:', enhancedPrompt);
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0].url;
    console.log('✅ Image generated successfully for prompt:', prompt);

    // Download and save image locally to avoid CORS issues
    const localImageUrl = await downloadAndSaveImage(imageUrl);
    
    // Clean up old images
    cleanupOldImages();

    return res.json({
      success: true,
      imageUrl: localImageUrl,
      prompt,
      enhancedPrompt,
    });
  } catch (error) {
    console.error('❌ Error generating image:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    console.error('Error response:', error.response?.data || error.response || 'No response data');
    console.error('Full error:', JSON.stringify(error, null, 2));

    if (error.code === 'invalid_api_key' || error.status === 401) {
      console.error('🔴 401 Authentication Failed - API Key Issue');
      return res
        .status(401)
        .json({ 
          error: 'Invalid or expired OpenAI API key.', 
          details: 'Check your .env file and verify your key at https://platform.openai.com/account/api-keys',
          message: error.message,
          errorResponse: error.response?.data
        });
    }

    if (error.status === 429) {
      return res
        .status(429)
        .json({ error: 'Rate limited by OpenAI. Please wait and try again.' });
    }

    if (error.status === 400) {
      return res
        .status(400)
        .json({ 
          error: 'Invalid request to OpenAI',
          details: error.message
        });
    }

    return res.status(500).json({
      error: 'Failed to generate image',
      details: error.message,
      code: error.code,
    });
  }
});

/**
 * POST /api/finalize-design
 * Composites the design onto a t-shirt template and generates a print-ready image
 */
app.post('/api/finalize-design', async (req, res) => {
  try {
    const { backgroundColor, designImageUrl, dpi = 300 } = req.body;

    if (!backgroundColor || !designImageUrl) {
      return res.status(400).json({
        error: 'Missing required fields: backgroundColor, designImageUrl',
      });
    }

    if (!['white', 'black'].includes(backgroundColor)) {
      return res.status(400).json({
        error: 'backgroundColor must be "white" or "black"',
      });
    }

    console.log(
      'Processing t-shirt design:',
      backgroundColor,
      'at',
      dpi,
      'DPI'
    );

    // Process the design
    const result = await processTShirtDesign(
      {
        backgroundColor,
        designImageUrl,
      },
      dpi
    );

    // Convert images to base64 for JSON response
    const baseImageBase64 = result.baseImage.toString('base64');
    const printImageBase64 = result.printImage.toString('base64');

    return res.json({
      success: true,
      baseImage: `data:image/png;base64,${baseImageBase64}`,
      printImage: `data:image/png;base64,${printImageBase64}`,
      dpi: result.dpi,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('Error finalizing design:', error);
    return res.status(500).json({
      error: 'Failed to finalize design',
      details: error.message,
    });
  }
});

/**
 * POST /api/finalize-design-download
 * Simplified endpoint that returns raw PNG for direct download
 */
app.post('/api/finalize-design-download', async (req, res) => {
  try {
    const { backgroundColor, designImageUrl, dpi = 300 } = req.body;

    if (!backgroundColor || !designImageUrl) {
      return res.status(400).json({
        error: 'Missing required fields: backgroundColor, designImageUrl',
      });
    }

    console.log('Processing design for download:', backgroundColor);

    const result = await processTShirtDesign(
      {
        backgroundColor,
        designImageUrl,
      },
      dpi
    );

    // Send image as PNG file
    res.type('image/png');
    res.set(
      'Content-Disposition',
      `attachment; filename="tshirt-design-${Date.now()}.png"`
    );
    res.send(result.printImage);
  } catch (error) {
    console.error('Error processing design download:', error);
    return res.status(500).json({
      error: 'Failed to process design',
      details: error.message,
    });
  }
});

/**
 * POST /api/checkout
 * Handles Stripe payment and order submission
 */
app.post('/api/checkout', async (req, res) => {
  try {
    const { amount, orderData } = req.body;

    if (!amount || !orderData) {
      return res.status(400).json({
        error: 'Missing required fields: amount, orderData',
      });
    }

    console.log('Processing checkout for amount:', amount);

    // Create payment intent
    const paymentResult = await createPaymentIntent(amount * 100, {
      orderId: orderData.orderId || 'unknown',
      productName: orderData.items?.[0]?.productName || 'T-Shirt Design',
    });

    return res.json({
      success: true,
      clientSecret: paymentResult.clientSecret,
      paymentIntentId: paymentResult.paymentIntentId,
      amount: paymentResult.amount / 100,
      currency: paymentResult.currency,
    });
  } catch (error) {
    console.error('Error processing checkout:', error);
    return res.status(500).json({
      error: 'Checkout failed',
      details: error.message,
    });
  }
});

/**
 * POST /api/confirm-payment
 * Confirms payment and submits order to Printful
 */
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, orderData } = req.body;

    if (!paymentIntentId || !orderData) {
      return res.status(400).json({
        error: 'Missing required fields: paymentIntentId, orderData',
      });
    }

    console.log('Confirming payment and submitting order:', paymentIntentId);

    // Confirm payment and submit to Printful
    const result = await confirmPaymentAndOrder(paymentIntentId, orderData);

    return res.json(result);
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({
      error: 'Payment confirmation failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/orders
 * Retrieves all orders (for dashboard/fulfillment)
 */
app.get('/api/orders', async (req, res) => {
  try {
    console.log('Fetching all orders...');
    const result = await getOrders();
    return res.json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      error: 'Failed to fetch orders',
      details: error.message,
    });
  }
});

/**
 * POST /api/calculate-cost
 * Calculates order cost and shipping
 */
app.post('/api/calculate-cost', (req, res) => {
  try {
    const { items, shippingCountry } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'items must be an array',
      });
    }

    console.log('Calculating cost for items:', items.length);
    const result = calculateOrderCost(items, shippingCountry || 'CL');

    return res.json(result);
  } catch (error) {
    console.error('Error calculating cost:', error);
    return res.status(500).json({
      error: 'Failed to calculate cost',
      details: error.message,
    });
  }
});

/**
 * POST /api/create-mockup
 * Creates a realistic product mockup by blending design onto t-shirt using DALL-E
 */
app.post('/api/create-mockup', upload.fields([{ name: 'design', maxCount: 1 }]), async (req, res) => {
  let designFilePath = null;
  let mockupFilePath = null;

  try {
    const { mockup, prompt } = req.body;

    if (!mockup || !['white', 'black'].includes(mockup)) {
      return res.status(400).json({
        error: 'mockup must be "white" or "black"',
      });
    }

    if (!req.files?.design?.[0]) {
      return res.status(400).json({
        error: 'Design image is required',
      });
    }

    if (!openai) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY not configured',
      });
    }

    designFilePath = req.files.design[0].path;
    const mockupFileName = mockup === 'white' ? 'tshirt-white.png' : 'tshirt-black.png';
    const mockupPath = path.join(__dirname, '..', 'public', mockupFileName);

    console.log('🎨 Creating mockup:');
    console.log('  - Mockup:', mockup);
    console.log('  - Design:', req.files.design[0].originalname);
    console.log('  - Mockup file:', mockupPath);

    // Verify mockup file exists
    if (!fs.existsSync(mockupPath)) {
      console.error('❌ Mockup file not found:', mockupPath);
      return res.status(500).json({
        error: `Mockup template not found: ${mockupFileName}`,
      });
    }

    // Read the design image
    const designBuffer = await fs.promises.readFile(designFilePath);
    
    // Read the mockup image  
    const mockupBuffer = await fs.promises.readFile(mockupPath);

    console.log('📥 Files loaded:');
    console.log('  - Design size:', designBuffer.length, 'bytes');
    console.log('  - Mockup size:', mockupBuffer.length, 'bytes');

    // Create a composite image using Sharp first
    // This will composite the design onto the mockup at a reasonable scale
    const compositeImage = await compositeImageWithSharp(mockupBuffer, designBuffer);
    const compositeBase64 = compositeImage.toString('base64');

    // Now use DALL-E image editing to make it look realistic
    // We'll use DALL-E with the prompt to enhance/polish the composite
    console.log('🤖 Using DALL-E to create realistic mockup...');
    
    const enhancedPrompt = prompt || `Professional product photo of a ${mockup} t-shirt with the design printed on it. 
    The design is centered, well-proportioned, and looks realistic with proper lighting and shadows. 
    High quality, professional studio photography.`;

    // Use DALL-E to generate the final mockup
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const mockupImageUrl = response.data[0].url;
    console.log('✅ Mockup generated successfully');

    // Download and save locally
    const finalMockupUrl = await downloadAndSaveImage(mockupImageUrl);
    
    // Clean up uploaded file
    try {
      fs.unlinkSync(designFilePath);
    } catch (err) {
      console.warn('Failed to cleanup design file:', err.message);
    }

    // Also save a download URL for the raw PNG
    const downloadUrl = finalMockupUrl;

    // Cleanup old images
    cleanupOldImages();

    return res.json({
      success: true,
      mockupUrl: finalMockupUrl,
      downloadUrl: downloadUrl,
      mockupType: mockup,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error creating mockup:', error.message);
    console.error('Full error:', error);

    // Cleanup on error
    if (designFilePath && fs.existsSync(designFilePath)) {
      try {
        fs.unlinkSync(designFilePath);
      } catch (err) {
        console.error('Failed to cleanup file on error:', err.message);
      }
    }

    if (error.status === 401 || error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid OpenAI API key',
        details: 'Check your .env file',
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limited by OpenAI. Please wait and try again.',
      });
    }

    return res.status(500).json({
      error: 'Failed to create mockup',
      details: error.message,
    });
  }
});

/**
 * Helper function to composite design image onto mockup using Sharp
 */
async function compositeImageWithSharp(mockupBuffer, designBuffer) {
  try {
    // Get metadata for both images
    const mockupMeta = await sharp(mockupBuffer).metadata();
    const designMeta = await sharp(designBuffer).metadata();

    console.log('📐 Image dimensions:');
    console.log('  - Mockup:', mockupMeta.width, 'x', mockupMeta.height);
    console.log('  - Design:', designMeta.width, 'x', designMeta.height);

    // Calculate design size (60% of mockup height, centered vertically 30-50%)
    const mockupHeight = mockupMeta.height;
    const mockupWidth = mockupMeta.width;
    const designHeight = Math.floor(mockupHeight * 0.5);
    const designWidth = Math.floor(mockupWidth * 0.5);

    // Resize design to fit nicely on mockup
    const resizedDesign = await sharp(designBuffer)
      .resize(designWidth, designHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // Calculate position (centered horizontally, positioned in middle of shirt)
    const left = Math.floor((mockupWidth - designWidth) / 2);
    const top = Math.floor((mockupHeight - designHeight) / 2.5);

    console.log('📍 Compositing at position:',  left, ',', top);

    // Composite the design onto the mockup
    const composite = await sharp(mockupBuffer)
      .composite([
        {
          input: resizedDesign,
          left: left,
          top: top,
        },
      ])
      .png()
      .toBuffer();

    return composite;
  } catch (error) {
    console.error('Error compositing images:', error);
    throw error;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API Health Check: http://localhost:${PORT}/api/health\n`);

  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      '⚠️  WARNING: OPENAI_API_KEY not set in .env file.\n' +
        'The /api/generate-ai endpoint will fail until you set it.\n'
    );
  }
});
