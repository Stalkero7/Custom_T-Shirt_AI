import React, { useState } from 'react';
import '../styles/TextControls.css';

const TextControls = ({ onAddText }) => {
  const [text, setText] = useState('Hello, World!');
  const [font, setFont] = useState('Arial');
  const [size, setSize] = useState(40);
  const [color, setColor] = useState('#000000');

  const handleAddText = () => {
    onAddText({
      text,
      fontFamily: font,
      fontSize: size,
      fill: color,
    });
  };

  return (
    <div className="text-controls">
      <h3>Add & Style Text</h3>
      <div className="control-group">
        <label>Text:</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
        />
      </div>
      <div className="control-group">
        <label>Font:</label>
        <select value={font} onChange={(e) => setFont(e.target.value)}>
          <option value="Arial">Arial</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
          {/* Add more stylish fonts below */}
          <option value="Lobster">Lobster</option>
          <option value="Pacifico">Pacifico</option>
          <option value="Anton">Anton</option>
          <option value="Bangers">Bangers</option>
          <option value="Righteous">Righteous</option>
        </select>
      </div>
      <div className="control-group">
        <label>Size:</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(parseInt(e.target.value, 10))}
        />
      </div>
      <div className="control-group">
        <label>Color:</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
      <button onClick={handleAddText} className="add-text-btn">
        Add Text to Canvas
      </button>
    </div>
  );
};

export default TextControls;