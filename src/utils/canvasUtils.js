import * as fabric from 'fabric';

/**
 * Adds an image to the fabric canvas and auto-scales it to fit the printable area
 * @param {fabric.Canvas} fabricCanvas - The fabric canvas instance
 * @param {string} imageUrl - URL or data URL of the image
 * @param {object} printableArea - Object with x, y, width, height of printable area
 * @returns {Promise<fabric.Image>} The added fabric image object
 */
export const addImageToCanvas = (fabricCanvas, imageUrl, printableArea) => {
  return new Promise((resolve, reject) => {
    console.log('🖼️ Starting to load image:', imageUrl?.substring(0, 100) + '...');
    console.log('📐 Printable area:', printableArea);
    
    try {
      fabric.Image.fromURL(
        imageUrl,
        (img) => {
          console.log('📍 Success callback fired, img object:', img);
          
          if (!img) {
            console.error('❌ Failed to load image - returned null');
            reject(new Error('Image failed to load'));
            return;
          }

          console.log('✅ Image loaded successfully:', img.width, 'x', img.height);

          // Calculate scale to fit within printable area
          const maxWidth = printableArea.width - 20;
          const maxHeight = printableArea.height - 20;

          let scale = 1;
          if (img.width > maxWidth || img.height > maxHeight) {
            const scaleX = maxWidth / img.width;
            const scaleY = maxHeight / img.height;
            scale = Math.min(scaleX, scaleY);
            console.log('📏 Scaling image:', { scaleX, scaleY, finalScale: scale });
          }

          img.scale(scale);

          const leftPos = printableArea.x + (printableArea.width - img.width * scale) / 2;
          const topPos = printableArea.y + (printableArea.height - img.height * scale) / 2;
          
          console.log('📍 Positioning image at:', { left: leftPos, top: topPos });

          // Position in center of printable area
          img.set({
            left: leftPos,
            top: topPos,
            selectable: true,
            hasControls: true,
            hasBorders: true,
          });

          console.log('🎨 Adding image to canvas...');
          fabricCanvas.add(img);
          fabricCanvas.setActiveObject(img);
          fabricCanvas.renderAll();

          console.log('✅ Image added to canvas and rendered');
          resolve(img);
        },
        { },
        (error) => {
          console.error('❌ Error callback fired in fromURL:', error);
          reject(new Error('Failed to load image: ' + error));
        }
      );
    } catch (err) {
      console.error('❌ Exception in addImageToCanvas:', err);
      reject(err);
    }
  });
};

/**
 * Constrains an object to stay within the printable area
 * @param {fabric.Object} obj - The fabric object to constrain
 * @param {object} printableArea - Object with x, y, width, height
 */
export const constrainObjectToArea = (obj, printableArea) => {
  const { x, y, width, height } = printableArea;

  if (obj.left < x) obj.left = x;
  if (obj.top < y) obj.top = y;

  const objRight = obj.left + obj.width * obj.scaleX;
  const objBottom = obj.top + obj.height * obj.scaleY;

  if (objRight > x + width) {
    obj.left = x + width - obj.width * obj.scaleX;
  }
  if (objBottom > y + height) {
    obj.top = y + height - obj.height * obj.scaleY;
  }
};

/**
 * Gets all user-added design objects (excluding background and area box)
 * @param {fabric.Canvas} fabricCanvas - The fabric canvas instance
 * @returns {array} Array of design objects
 */
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
