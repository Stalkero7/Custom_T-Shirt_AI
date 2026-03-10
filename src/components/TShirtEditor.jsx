import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import ImageUploader from './ImageUploader';
import PromptInput from './PromptInput';
import { addImageToCanvas, constrainObjectToArea, getDesignObjects, exportCanvasDesign } from '../utils/canvasUtils';
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
      if (!canvasRef.current) {
        console.error('Canvas ref not found');
        return;
      }

      // Check if canvas already exists to avoid double initialization
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      // Create fabric canvas with white background
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 500,
        height: 600,
        backgroundColor: '#FFFFFF',
      });

      fabricCanvasRef.current = fabricCanvas;
      console.log('✅ Fabric canvas created successfully');

      // Define printable area
      const printableWidth = 300;
      const printableHeight = 350;
      const printableX = (500 - printableWidth) / 2;
      const printableY = (600 - printableHeight) / 2;

      setPrintableArea({
        x: printableX,
        y: printableY,
        width: printableWidth,
        height: printableHeight,
      });

      // Constrain objects during movement
      fabricCanvas.on('object:moving', (e) => {
        if (e.target) {
          constrainObjectToArea(e.target, {
            x: printableX,
            y: printableY,
            width: printableWidth,
            height: printableHeight,
          });
        }
      });

      // Constrain objects during scaling
      fabricCanvas.on('object:scaling', (e) => {
        if (e.target) {
          constrainObjectToArea(e.target, {
            x: printableX,
            y: printableY,
            width: printableWidth,
            height: printableHeight,
          });
        }
      });

      return () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
      };
    } catch (error) {
      console.error('❌ Error initializing canvas:', error);
    }
  }, []);

  // Load t-shirt background
  const loadTShirtBackground = (canvas, color) => {
    const bgColor = color === 'white' ? '#FFFFFF' : '#1a1a1a';
    canvas.backgroundColor = bgColor;
    canvas.renderAll();
  };

  // Toggle t-shirt color
  const handleColorToggle = (color) => {
    setSelectedColor(color);
    if (fabricCanvasRef.current) {
      loadTShirtBackground(fabricCanvasRef.current, color);
    }
  };

  // Toggle printable area box
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

  // Handle image upload
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

  // Handle AI generated image
  const handleImageGenerated = async (imageData) => {
    await handleImageUpload(imageData);
  };

  // Clear canvas
  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.getObjects().forEach((obj) => {
      fabricCanvasRef.current.remove(obj);
    });
    fabricCanvasRef.current.renderAll();
  };

  // Export design
  const handleExportDesign = () => {
    const canvasState = getCanvasState();
    console.log('Canvas State:', canvasState);
    alert('Design exported! Check console for details.');
  };

  // Get canvas state
  const getCanvasState = () => {
    if (!fabricCanvasRef.current) return null;
    return {
      backgroundColor: selectedColor,
      objects: getDesignObjects(fabricCanvasRef.current),
      canvasData: fabricCanvasRef.current.toDataURL('image/png'),
    };
  };

  return (
    <div className="tshirt-editor">
      <div className="editor-header">
        <h1>✨ Interactive T-Shirt Designer</h1>
        <div className="button-group">
          <button
            className={`color-btn ${selectedColor === 'white' ? 'active' : ''}`}
            onClick={() => handleColorToggle('white')}
          >
            White T-Shirt
          </button>
          <button
            className={`color-btn ${selectedColor === 'black' ? 'active' : ''}`}
            onClick={() => handleColorToggle('black')}
          >
            Black T-Shirt
          </button>
          <button className="toggle-box-btn" onClick={togglePrintableAreaBox}>
            Toggle Printable Area
          </button>
          <button className="clear-btn" onClick={clearCanvas}>
            Clear Design
          </button>
          <button className="export-btn" onClick={handleExportDesign}>
            Export Design
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="canvas-section">
          <div className="canvas-container">
            <canvas ref={canvasRef} id="fabricCanvas"></canvas>
          </div>
          <div className="editor-info">
            <p>📐 Canvas: 500×600px | Printable Area: 300×350px</p>
            <p>Drag and scale objects within the dashed red printable area</p>
          </div>
        </div>

        <div className="input-section">
          <ImageUploader onImageUpload={handleImageUpload} />
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
