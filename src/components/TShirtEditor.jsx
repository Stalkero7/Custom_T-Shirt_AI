import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import ImageUploader from './ImageUploader';
import PromptInput from './PromptInput';
import TextControls from './TextControls';
import { addImageToCanvas, getDesignObjects } from '../utils/canvasUtils';
import '../styles/TShirtEditor.css';

/**
 * TShirtEditor Component
 * Interactive canvas for designing T-shirt prints using Fabric.js
 */
const TShirtEditor = () => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState('white');
  const [printableArea, setPrintableArea] = useState(null);
  const [isAddingImage, setIsAddingImage] = useState(false);

  // Initialize fabric canvas
  useEffect(() => {
    try {
      if (!canvasRef.current) return;

      // Clean up if it already exists
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      // 1. Initialize with NULL background to allow CSS mockup to show through
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 500,
        height: 600,
        backgroundColor: null, 
      });

      fabricCanvasRef.current = fabricCanvas;

      // 2. Define the printable area coordinates
      const pWidth = 300;
      const pHeight = 350;
      const pX = (500 - pWidth) / 2;
      const pY = (600 - pHeight) / 2;
      
      const currentBounds = { x: pX, y: pY, width: pWidth, height: pHeight };
      setPrintableArea(currentBounds);

      // 3. MOVING CONSTRAINT (Fixes "Invisible Wall" and Centering)
      fabricCanvas.on('object:moving', (options) => {
        const obj = options.target;
        if (!obj) return;

        // Account for the fact that we center the origin in canvasUtils
        const halfWidth = obj.getScaledWidth() / 2;
        const halfHeight = obj.getScaledHeight() / 2;

        let left = obj.left;
        let top = obj.top;

        // Clamp logic: Center must stay within (Edge + Half Size)
        const minX = currentBounds.x + halfWidth;
        const maxX = currentBounds.x + currentBounds.width - halfWidth;
        const minY = currentBounds.y + halfHeight;
        const maxY = currentBounds.y + currentBounds.height - halfHeight;

        if (left < minX) left = minX;
        if (left > maxX) left = maxX;
        if (top < minY) top = minY;
        if (top > maxY) top = maxY;

        obj.set({ left, top });
      });

      // 4. SCALING CONSTRAINT (Prevents image from growing too large)
      fabricCanvas.on('object:scaling', (e) => {
        const obj = e.target;
        if (!obj) return;

        if (obj.getScaledWidth() > currentBounds.width) {
          obj.scaleToWidth(currentBounds.width);
        }
        if (obj.getScaledHeight() > currentBounds.height) {
          obj.scaleToHeight(currentBounds.height);
        }
        
        // Re-run moving logic to snap back if scaling pushed it out
        fabricCanvas.fire('object:moving', { target: obj });
      });

      return () => {
        fabricCanvas.dispose();
        fabricCanvasRef.current = null;
      };
    } catch (error) {
      console.error('❌ Error initializing canvas:', error);
    }
  }, []);

  // Updated Toggle: Removes the "White Square" by keeping canvas transparent
  const handleColorToggle = (color) => {
    setSelectedColor(color);
    if (fabricCanvasRef.current) {
      // Force transparency so CSS background-image shows
      fabricCanvasRef.current.set({ backgroundColor: null });
      fabricCanvasRef.current.requestRenderAll();
    }
  };

  // Toggle printable area box guide
  const togglePrintableAreaBox = () => {
    if (!fabricCanvasRef.current || !printableArea) return;

    const existingBox = fabricCanvasRef.current
      .getObjects()
      .find((obj) => obj.name === 'printableAreaBox');

    if (existingBox) {
      fabricCanvasRef.current.remove(existingBox);
    } else {
      const box = new fabric.Rect({
        left: printableArea.x,
        top: printableArea.y,
        width: printableArea.width,
        height: printableArea.height,
        fill: 'transparent',
        stroke: '#FF6B6B',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        name: 'printableAreaBox',
        selectable: false,
        evented: false,
      });
      fabricCanvasRef.current.add(box);
    }
    fabricCanvasRef.current.renderAll();
  };

  const handleImageUpload = async (imageData) => {
    if (!fabricCanvasRef.current || !printableArea) return;
    setIsAddingImage(true);
    try {
      await addImageToCanvas(
        fabricCanvasRef.current,
        imageData.imageUrl,
        printableArea
      );
    } catch (error) {
      console.error('Error adding image:', error);
      alert('Failed to add image.');
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleImageGenerated = async (imageData) => {
    const fullImageUrl = imageData.imageUrl.startsWith('http') 
      ? imageData.imageUrl 
      : `http://localhost:5000${imageData.imageUrl}`;
    await handleImageUpload({ imageUrl: fullImageUrl });
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    // Remove only user design objects, keep the guide box if it exists
    fabricCanvasRef.current.getObjects().forEach((obj) => {
      if (obj.name !== 'printableAreaBox') {
        fabricCanvasRef.current.remove(obj);
      }
    });
    fabricCanvasRef.current.renderAll();
  };

  const handleExportDesign = () => {
    if (!fabricCanvasRef.current) return;

    // Find the guide box
    const guideBox = fabricCanvasRef.current
      .getObjects()
      .find((obj) => obj.name === 'printableAreaBox');

    // Temporarily hide the guide box for export
    if (guideBox) {
      guideBox.set({ visible: false });
    }

    fabricCanvasRef.current.renderAll();

    const data = {
      shirtColor: selectedColor,
      objects: getDesignObjects(fabricCanvasRef.current),
      image: fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      }),
    };

    // Restore the guide box
    if (guideBox) {
      guideBox.set({ visible: true });
    }

    fabricCanvasRef.current.renderAll();

    console.log('Design Exported:', data);
    alert('Design ready for printing! Check console for data.');
  };

  const handleAddText = (textOptions) => {
    if (!fabricCanvasRef.current || !printableArea) return;

    const text = new fabric.Textbox(textOptions.text, {
      ...textOptions,
      left: printableArea.x + (printableArea.width / 2),
      top: printableArea.y + (printableArea.height / 2),
      originX: 'center',
      originY: 'center',
      width: printableArea.width - 20, // Padding
      textAlign: 'center',
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  return (
    <div className="tshirt-editor">
      <div className="editor-header">
        <h1>Interactive T-Shirt Designer</h1>
        <div className="button-group">
          <button
            className={`color-btn white ${selectedColor === 'white' ? 'active' : ''}`}
            onClick={() => handleColorToggle('white')}
          >
            White T-Shirt
          </button>
          <button
            className={`color-btn black ${selectedColor === 'black' ? 'active' : ''}`}
            onClick={() => handleColorToggle('black')}
          >
            Black T-Shirt
          </button>
          <button className="toggle-box-btn" onClick={togglePrintableAreaBox}>
            Toggle Guide
          </button>
          <button className="clear-btn" onClick={clearCanvas}>
            Clear Design
          </button>
          <button className="export-btn" onClick={handleExportDesign}>
            Export for Print
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="canvas-section">
          {/* Mockup background is applied via CSS class */}
          <div className={`canvas-container ${selectedColor}`}>
            <canvas ref={canvasRef} id="fabricCanvas"></canvas>
          </div>
          <div className="editor-info">
            <p>Printable Area: 300×350px</p>
            <p>Design stays inside the red guide for perfect printing.</p>
          </div>
        </div>

        <div className="input-section">
          <ImageUploader onImageUpload={handleImageUpload} />
          <TextControls onAddText={handleAddText} />
          <PromptInput
            onImageGenerated={handleImageGenerated}
            isLoading={isAddingImage}
            shirtColor={selectedColor}
          />
        </div>
      </div>
    </div>
  );
};

export default TShirtEditor;