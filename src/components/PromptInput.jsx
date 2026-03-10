import React, { useState } from 'react';
import axios from 'axios';
import '../styles/PromptInput.css';

const PromptInput = ({ onImageGenerated, isLoading: externalLoading, shirtColor = 'white' }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use backend API URL from environment or default to localhost:5000
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    try {
      // Call backend endpoint to generate image with shirt color
      const response = await axios.post(`${API_URL}/api/generate-ai`, {
        prompt: prompt.trim(),
        shirtColor: shirtColor,
      });

      if (response.data && response.data.imageUrl) {
        // Log what we actually sent to DALL-E
        console.log('📝 User prompt:', response.data.prompt);
        console.log('🎨 Enhanced prompt sent to DALL-E:', response.data.enhancedPrompt);
        
        // Image URL is already complete (either base64 or HTTP), no need to modify
        const imageUrl = response.data.imageUrl;
        console.log('🖼️ Image URL (first 100 chars):', imageUrl.substring(0, 100));
        
        onImageGenerated({
          type: 'generated',
          imageUrl: imageUrl,
          prompt: prompt.trim(),
        });
        setPrompt(''); // Clear input after successful generation
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && !externalLoading) {
      handleGenerateImage();
    }
  };

  const isDisabled = isLoading || externalLoading;

  return (
    <div className="prompt-input">
      <div className="prompt-header">
        <h3>🤖 AI Image Generator</h3>
        <p>Describe the design you want to create</p>
      </div>

      <div className="prompt-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., 'A cool retro 80s synthwave design with neon colors and geometric shapes'"
          disabled={isDisabled}
          className="prompt-textarea"
          rows={3}
        />

        <button
          onClick={handleGenerateImage}
          disabled={isDisabled || !prompt.trim()}
          className="generate-btn"
        >
          {isDisabled ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            'Generate Image'
          )}
        </button>
      </div>

      <div className="prompt-tips">
        <p className="tips-title">💡 Tips for best results:</p>
        <ul>
          <li>Be specific about style (e.g., "retro", "minimalist", "3D")</li>
          <li>Describe colors and mood you want</li>
          <li>Keep prompts under 100 words</li>
          <li>Use examples: "like The Office opening theme"</li>
        </ul>
      </div>
    </div>
  );
};

export default PromptInput;
