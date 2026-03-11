import * as fabric from 'fabric';

/**
 * Adds an image to the fabric canvas and auto-scales it to fit the printable area
 * @param {fabric.Canvas} fabricCanvas - The fabric canvas instance
 * @param {string} imageUrl - URL or data URL of the image
 * @param {object} printableArea - Object with x, y, width, height of printable area
 * @returns {Promise<fabric.Image>} The added fabric image object
 */
// src/utils/canvasUtils.js

// src/utils/canvasUtils.js

export const addImageToCanvas = (fabricCanvas, imageUrl, printableArea) => {
  return new Promise((resolve, reject) => {
    // We use the modern Promise-based API for Fabric v6+
    fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        // 1. Calculate scale to fit within printable area (with 20px padding)
        const maxWidth = printableArea.width - 20;
        const maxHeight = printableArea.height - 20;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);

        img.set({
          scaleX: scale,
          scaleY: scale,
        });

        // 2. Center the image specifically inside the printable area coordinates
        // Formula: Start of area + (Total Area Width / 2) - (Half of scaled image width)
        const centerX = printableArea.x + (printableArea.width / 2) - (img.getScaledWidth() / 2);
        const centerY = printableArea.y + (printableArea.height / 2) - (img.getScaledHeight() / 2);

        img.set({
          left: centerX,
          top: centerY,
          selectable: true,
          hasControls: true,
        });

        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        resolve(img);
      })
      .catch((err) => {
        console.error('❌ Error loading image:', err);
        reject(err);
      });
  });
};

export const constrainObjectToArea = (obj, printableArea) => {
  const { x, y, width, height } = printableArea;
  
  // Calculate boundaries of the object
  const boundingRect = obj.getBoundingRect();

  // Left boundary
  if (obj.left < x) {
    obj.left = x;
  }
  // Top boundary
  if (obj.top < y) {
    obj.top = y;
  }
  // Right boundary
  if (obj.left + boundingRect.width > x + width) {
    obj.left = x + width - boundingRect.width;
  }
  // Bottom boundary
  if (obj.top + boundingRect.height > y + height) {
    obj.top = y + height - boundingRect.height;
  }
};

export const getDesignObjects = (fabricCanvas) => {
  return fabricCanvas
    .getObjects()
    .filter(
      (obj) =>
        obj.name !== 'tshirtBackground' && obj.name !== 'printableAreaBox'
    );
};

/**
 * Exports canvas design data for backend processing
 * @param {fabric.Canvas} fabricCanvas - The fabric canvas instance
 * @param {string} backgroundColor - Current t-shirt color ('white' or 'black')
 * @returns {object} Canvas state with all design information
 */
export const exportCanvasDesign = (fabricCanvas, backgroundColor) => {
  return {
    backgroundColor,
    canvasWidth: fabricCanvas.width,
    canvasHeight: fabricCanvas.height,
    designObjects: fabricCanvas.toJSON(['name']),
    dataUrl: fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2, // 2x for better quality
    }),
  };
};
