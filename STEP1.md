# Step 1: Interactive Canvas Module

## Overview

This foundational step creates the visual design interface using fabric.js. It establishes the canvas where users will place their custom designs on t-shirts.

## Architecture

```
┌─────────────────────────────────────────┐
│      TShirtEditor Component             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │    Fabric.js Canvas (500x600)    │  │
│  │                                  │  │
│  │  ┌──────────────────────────┐    │  │
│  │  │   T-Shirt Background     │    │  │
│  │  │   (White or Black)       │    │  │
│  │  │                          │    │  │
│  │  │  ┌────────────────────┐  │    │  │
│  │  │  │ Printable Area     │  │    │  │
│  │  │  │ (300x350px center) │  │    │  │
│  │  │  │ [Design Goes Here] │  │    │  │
│  │  │  └────────────────────┘  │    │  │
│  │  │                          │    │  │
│  │  └──────────────────────────┘    │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  UI Controls:                          │
│  - White T-Shirt Button                │
│  - Black T-Shirt Button                │
│  - Toggle Printable Area               │
│  - Clear Design Button                 │
│  - Export Design Button                │
│                                         │
└─────────────────────────────────────────┘
```

## Component Overview

### TShirtEditor.jsx

Main component that initializes and manages the fabric.js canvas.

#### Props
None - This is the root editor component.

#### State Management

```javascript
const [selectedColor, setSelectedColor] = useState('white');
const [printableArea, setPrintableArea] = useState(null);
const [isAddingImage, setIsAddingImage] = useState(false);
```

#### Canvas Dimensions
- **Total Canvas**: 500px × 600px
- **Printable Area**: 300px × 350px (centered)
- **Area Position**: X: 100px, Y: 125px

### Key Features

#### 1. Canvas Initialization

```javascript
const fabricCanvas = new fabric.Canvas(canvasRef.current, {
  width: 500,
  height: 600,
  backgroundColor: '#f5f5f5',
});
```

**What happens**:
- Creates a fabric canvas at specified DOM element
- Sets default background color
- Enables mouse events for object manipulation

#### 2. T-Shirt Background

Non-removable background layer representing the t-shirt.

**Current Implementation**: Colored rectangle
```javascript
const rect = new fabric.Rect({
  left: 0,
  top: 0,
  width: 500,
  height: 600,
  fill: bgColor,
  selectable: false,      // Cannot select
  evented: false,         // No mouse events
  name: 'tshirtBackground' // Identifier
});
```

**For Production**: Replace with actual t-shirt images:
- `white-tee.png` - White t-shirt template
- `black-tee.png` - Black t-shirt template

#### 3. Printable Area Box

Visual guide showing where designs should be placed.

```javascript
const box = new fabric.Rect({
  left: printableArea.x,
  top: printableArea.y,
  width: printableArea.width,
  height: printableArea.height,
  fill: 'transparent',
  stroke: '#FF6B6B',          // Red color
  strokeWidth: 2,
  strokeDashArray: [5, 5],   // Dashed line
  selectable: false,
  evented: false,
  name: 'printableAreaBox'
});
```

**Purpose**: Shows users where their designs will be printed.

#### 4. Event Handlers

Fabric.js provides built-in event system:

```javascript
// When user moves an object
fabricCanvas.on('object:moving', (e) => {
  constrainObjectToArea(e.target, printableArea);
});

// When user scales/resizes an object
fabricCanvas.on('object:scaling', (e) => {
  constrainObjectToArea(e.target, printableArea);
});
```

## Functions Reference

### `loadTShirtBackground(canvas, color)`

Loads or switches the t-shirt background image.

**Parameters**:
- `canvas`: fabric.Canvas instance
- `color`: 'white' or 'black'

**Process**:
1. Removes existing background
2. Creates new background shape/image
3. Inserts at canvas bottom (layer 0)
4. Renders canvas

**Example**:
```javascript
loadTShirtBackground(fabricCanvasRef.current, 'black');
```

### `handleColorToggle(color)`

Called when user clicks color button.

**Implementation**:
```javascript
const handleColorToggle = (color) => {
  setSelectedColor(color);
  loadTShirtBackground(fabricCanvasRef.current, color);
};
```

### `togglePrintableAreaBox()`

Shows/hides the dashed printable area box.

**Process**:
1. Check if box exists
2. If yes, remove it
3. If no, create and add it
4. Render canvas

### `getCanvasState()`

Exports canvas state for next steps (image processing).

**Returns**:
```javascript
{
  backgroundColor: 'white',
  canvasWidth: 500,
  canvasHeight: 600,
  designObjects: [...],  // All user-added designs
  dataUrl: 'data:image/png;base64,...'  // PNG export
}
```

## Styling (TShirtEditor.css)

### Two-Column Layout

```css
.editor-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  align-items: start;
}
```

**Left Side**: Canvas container (fixed aspect ratio)
**Right Side**: Input controls (ImageUploader, PromptInput)

### Canvas Container

```css
.canvas-container {
  display: flex;
  justify-content: center;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### Responsive Breakpoints

```css
@media (max-width: 1024px) {
  .editor-layout {
    grid-template-columns: 1fr;  /* Stack vertically */
  }
}

@media (max-width: 768px) {
  /* Further optimizations for mobile */
  .canvas-container {
    padding: 10px;
  }
}
```

## Technical Concepts

### Fabric.js Basics

**Objects on Canvas**:
```javascript
// A fabric image
const img = new fabric.Image(imageElement, {
  left: 100,        // X position
  top: 100,         // Y position
  scaleX: 1,        // Horizontal scale
  scaleY: 1,        // Vertical scale
  selectable: true, // Can be selected
});

canvas.add(img);    // Add to canvas
canvas.renderAll(); // Redraw canvas
```

**Events**:
```javascript
canvas.on('object:added', (e) => {
  console.log('Object added:', e.target);
});

canvas.on('object:removed', (e) => {
  console.log('Object removed:', e.target);
});
```

**Constraints** (Custom Logic):
```javascript
function constrainObject(obj, area) {
  if (obj.left < area.x) obj.left = area.x;
  if (obj.top < area.y) obj.top = area.y;
  
  if (obj.left + obj.width * obj.scaleX > area.x + area.width) {
    obj.left = area.x + area.width - obj.width * obj.scaleX;
  }
}
```

### React Hooks Integration

```javascript
// Reference to DOM element
const canvasRef = useRef(null);

// Reference to fabric instance
const fabricCanvasRef = useRef(null);

// Setup on mount
useEffect(() => {
  const fabricCanvas = new fabric.Canvas(canvasRef.current);
  fabricCanvasRef.current = fabricCanvas;
  
  return () => {
    fabricCanvas.dispose(); // Cleanup
  };
}, []);
```

## Workflow

### User Interaction Flow

```
1. Page Loads
   ↓
   Initialize fabric canvas
   ↓
   Load t-shirt background (default: white)
   ↓
   Display printable area box
   
2. User Clicks "Black T-Shirt"
   ↓
   handleColorToggle('black')
   ↓
   loadTShirtBackground(..., 'black')
   ↓
   Repaint canvas
   
3. User Toggles Printable Area
   ↓
   togglePrintableAreaBox()
   ↓
   Add/remove dashed box
   ↓
   Canvas renders
   
4. (Step 2) User Uploads Image
   ↓
   addImageToCanvas()  [from canvasUtils]
   ↓
   Image constrained to printable area
   ↓
   User can drag/scale
   
5. User Clicks "Export Design"
   ↓
   getCanvasState()
   ↓
   Send to next step
```

## Integration with Other Steps

### From Step 1 → Step 2
```javascript
// TShirtEditor exports canvas state
canvasState = getCanvasState()

// Step 2 uses it
<Checkout canvasState={canvasState} selectedColor={selectedColor} />
```

### Canvas State Structure
```javascript
{
  backgroundColor: 'white' | 'black',
  canvasWidth: 500,
  canvasHeight: 600,
  designObjects: [...],    // Fabric objects
  dataUrl: 'data:image/...' // PNG for display
}
```

## Performance Considerations

### Canvas Rendering
- Fabric.js handles optimization
- Use `renderAll()` for major changes
- Use `renderOnAddRemove: false` for batch updates

### Memory Management
```javascript
// Cleanup on component unmount
useEffect(() => {
  return () => {
    fabricCanvas.dispose();
  };
}, []);
```

### Image Handling
- Pre-load t-shirt images
- Use appropriate image sizes
- Implement image caching

## File Structure

```
src/
├── components/
│   └── TShirtEditor.jsx        # Component (280 lines)
└── styles/
    └── TShirtEditor.css        # Styling (180 lines)
```

## Dependencies

All from package.json:
- `fabric` (7.2.0) - Canvas manipulation
- `react` (18.2.0) - Component framework
- Only standard React features needed

## Customization Options

### Modify Canvas Size
```javascript
const fabricCanvas = new fabric.Canvas(canvasRef.current, {
  width: 600,   // Changed from 500
  height: 700,  // Changed from 600
});
```

### Change Printable Area
```javascript
const printableWidth = 400;    // Changed from 300
const printableHeight = 450;   // Changed from 350
```

### Adjust Colors
```javascript
// T-shirt background color
const bgColor = color === 'white' ? '#FFFFFF' : '#1a1a1a';

// Printable area box
stroke: '#0070f3'  // Change highlight color
```

### Add More T-Shirt Colors
```javascript
handleColorToggle = (color) => {
  // Add new colors
  if (color === 'red') {
    bgColor = '#FF0000';
  }
}
```

## Testing Checklist

- [ ] Canvas initializes on component mount
- [ ] T-shirt background loads
- [ ] Color toggle works (white ↔ black)
- [ ] Printable area box toggle works
- [ ] Box shows/hides correctly
- [ ] Canvas doesn't resize unexpectedly
- [ ] No console errors
- [ ] Responsive on mobile

## Common Issues & Solutions

### Canvas Not Appearing
- **Cause**: Invalid ref or DOM element
- **Solution**: Check `canvasRef.current` exists

### Background Not Loading
- **Cause**: Image not found or permissions
- **Solution**: Check file path and CORS headers

### Performance Issues
- **Cause**: Too many objects or large images
- **Solution**: Optimize image sizes, limit objects

### Touch Events Not Working
- **Cause**: Default touch handling disabled
- **Solution**: Ensure touch events enabled in fabric config

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE 11: ⚠️ Limited support (legacy)

## Accessibility

### Keyboard Support
- Tab to buttons
- Enter/Space to activate
- Arrow keys for adjustments (Step 2+)

### Screen Readers
- Use semantic HTML
- Add `aria-labels` to interactive elements
- Describe canvas purpose

## What's Next

Once Step 1 is complete:

1. **Step 2**: Add ImageUploader & PromptInput to place images
2. **Step 3**: Process designs with Sharp compositing
3. **Step 4**: Add Checkout component for payment

The canvas created here becomes the foundation for all subsequent steps.

---

**Step 1 Complete!** 🎉

The interactive canvas is ready. Users can now select t-shirt colors and see where their designs will go. 

Next: [Step 2 - Image Injection & Upload](STEP2.md)
