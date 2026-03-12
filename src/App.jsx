import React, { useState } from 'react';
import TShirtEditor from './components/TShirtEditor';
import MockupGenerator from './components/MockupGenerator';
import './styles/App.css';

function App() {
  const [currentView, setCurrentView] = useState('editor'); // 'editor' or 'mockup'

  return (
    <div className="app">
      {/* Navigation Header */}
      <nav className="app-header">
        <div className="nav-container">
          <h1 className="app-title">AI T-Shirt Store</h1>
          <div className="nav-buttons">
            <button
              className={`nav-btn ${currentView === 'editor' ? 'active' : ''}`}
              onClick={() => setCurrentView('editor')}
            >
              Design Editor
            </button>
            <button
              className={`nav-btn ${currentView === 'mockup' ? 'active' : ''}`}
              onClick={() => setCurrentView('mockup')}
            >
              Mockup Generator
            </button>
          </div>
        </div>
      </nav>

      {/* View Container */}
      <div className="app-content">
        {currentView === 'editor' && <TShirtEditor />}
        {currentView === 'mockup' && <MockupGenerator />}
      </div>
    </div>
  );
}

export default App;
