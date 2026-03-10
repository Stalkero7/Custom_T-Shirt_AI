import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a blank t-shirt template image
 * @param {string} color - 'white' or 'black'
 * @returns {Promise<Buffer>} T-shirt template as PNG buffer
 */
export const createTShirtTemplate = async (color) => {
  const shirtColor = color === 'black' ? '#1a1a1a' : '#FFFFFF';
  const strokeColor = color === 'black' ? '#333333' : '#e0e0e0';

  // Create a SVG for the t-shirt shape (simplified)
  const svg = `
    <svg width="500" height="600" xmlns="http://www.w3.org/2000/svg">
      <!-- T-shirt background -->
      <rect width="500" height="600" fill="${shirtColor}"/>
      
      <!-- T-shirt silhouette outline (subtle) -->
      <rect x="0" y="0" width="500" height="600" fill="none" stroke="${strokeColor}" stroke-width="1"/>
      
      <!-- Neckline -->
      <ellipse cx="250" cy="80" rx="40" ry="30" fill="${shirtColor}" stroke="${strokeColor}" stroke-width="1"/>
      
      <!-- Sleeve guides (optional) -->
      <rect x="20" y="100" width="80" height="150" fill="none" stroke="${strokeColor}" stroke-width="0.5" opacity="0.3"/>
      <rect x="400" y="100" width="80" height="150" fill="none" stroke="${strokeColor}" stroke-width="0.5" opacity="0.3"/>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
};

/**
 * Composites a design image onto a t-shirt template
 * @param {string} backgroundColor - 'white' or 'black'
 * @param {Buffer|string} designImage - Design image as buffer or URL
 * @param {number} dpi - DPI for printing (default: 300)
 * @returns {Promise<Buffer>} Final composite image as PNG
 */
export const compositeDesignOntoTShirt = async (
  backgroundColor,
  designImage,
  dpi = 300
) => {
  try {
    // Create t-shirt template
    const tshirtTemplate = await createTShirtTemplate(backgroundColor);

    // Get buffer from design image (if it's a URL, fetch it)
    let designBuffer;
    if (typeof designImage === 'string') {
      // If it's a URL or data URL, need to convert
      if (designImage.startsWith('http')) {
        const response = await fetch(designImage);
        designBuffer = await response.buffer();
      } else if (designImage.startsWith('data:')) {
        // Handle data URL
        const base64Data = designImage.split(',')[1];
        designBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // Assume it's a file path
        designBuffer = await fs.readFile(designImage);
      }
    } else {
      designBuffer = designImage;
    }

    // Get design image metadata to calculate scaling
    const designMetadata = await sharp(designBuffer).metadata();

    // Calculate scale to fit printable area (300x350px at 96 DPI for web)
    const printableWidth = 300;
    const printableHeight = 350;

    let designWidth = designMetadata.width;
    let designHeight = designMetadata.height;

    // Calculate scale factor
    if (designWidth > printableWidth || designHeight > printableHeight) {
      const scaleX = printableWidth / designWidth;
      const scaleY = printableHeight / designHeight;
      const scale = Math.min(scaleX, scaleY);

      designWidth = Math.round(designWidth * scale);
      designHeight = Math.round(designHeight * scale);
    }

    // Resize design image
    const resizedDesign = await sharp(designBuffer)
      .resize(designWidth, designHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    // Calculate center position on t-shirt
    const printableAreaX = (500 - printableWidth) / 2;
    const printableAreaY = (600 - printableHeight) / 2;
    const designX = Math.round(
      printableAreaX + (printableWidth - designWidth) / 2
    );
    const designY = Math.round(
      printableAreaY + (printableHeight - designHeight) / 2
    );

    // Composite design onto t-shirt
    const finalImage = await sharp(tshirtTemplate)
      .composite([
        {
          input: resizedDesign,
          left: designX,
          top: designY,
        },
      ])
      .png({
        quality: 100,
        compressionLevel: 9,
      })
      .toBuffer();

    return finalImage;
  } catch (error) {
    console.error('Error compositing design:', error);
    throw new Error(`Failed to composite design: ${error.message}`);
  }
};

/**
 * Generates a high-resolution version suitable for printing
 * @param {Buffer} image - Image buffer
 * @param {number} targetDpi - Target DPI (default: 300)
 * @returns {Promise<Buffer>} High-resolution image
 */
export const generatePrintVersion = async (image, targetDpi = 300) => {
  try {
    // Scale up for print quality (assuming 96 DPI to 300 DPI)
    const scale = targetDpi / 96;
    const metadata = await sharp(image).metadata();

    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);

    const printImage = await sharp(image)
      .resize(newWidth, newHeight, {
        kernel: 'lanczos3', // High-quality resampling
      })
      .png({
        quality: 100,
        compressionLevel: 9,
      })
      .toBuffer();

    return printImage;
  } catch (error) {
    console.error('Error generating print version:', error);
    throw new Error(`Failed to generate print version: ${error.message}`);
  }
};

/**
 * Processes a complete t-shirt design
 * @param {object} designData - Contains backgroundColor and design image
 * @param {number} dpi - DPI for printing (default: 300)
 * @returns {Promise<object>} Processed image data
 */
export const processTShirtDesign = async (designData, dpi = 300) => {
  try {
    const { backgroundColor, designImageUrl } = designData;

    // Create base composite
    const composited = await compositeDesignOntoTShirt(
      backgroundColor,
      designImageUrl,
      dpi
    );

    // Generate print version
    const printVersion = await generatePrintVersion(composited, dpi);

    return {
      success: true,
      baseImage: composited,
      printImage: printVersion,
      dpi,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error processing design:', error);
    throw error;
  }
};
