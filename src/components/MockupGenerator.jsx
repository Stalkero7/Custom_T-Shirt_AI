import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import '../styles/MockupGenerator.css';

const MockupGenerator = () => {
  // Use backend API URL from environment or default to localhost:5000
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [selectedMockup, setSelectedMockup] = useState('white');
  const [designImage, setDesignImage] = useState(null);
  const [designPreview, setDesignPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mockupImage, setMockupImage] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const mockups = [
    {
      id: 'white',
      name: 'White T-Shirt',
      preview: '/tshirt-white.png',
      description: 'Classic white shirt mockup'
    },
    {
      id: 'black',
      name: 'Black T-Shirt',
      preview: '/tshirt-black.png',
      description: 'Classic black shirt mockup'
    }
  ];

  const onDropDesign = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setError(null);

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please upload a valid image (JPG, PNG, or WebP)');
        return;
      }

      // Validate file size (max 20MB for OpenAI)
      if (file.size > 20 * 1024 * 1024) {
        setError('Image size must be less than 20MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setDesignPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setDesignImage(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropDesign,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1
  });

  const generateMockup = async () => {
    if (!designImage || !selectedMockup) {
      setError('Please select a mockup and upload a design image');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('design', designImage);
      formData.append('mockup', selectedMockup);
      
      // Add a descriptive prompt for better results
      const prompt = `Realistically place this design on the ${selectedMockup} t-shirt. 
      Make it look like a professional product photo with proper perspective, lighting, and shadows. 
      The design should be centered and properly scaled to look natural on the shirt.`;
      formData.append('prompt', prompt);

      console.log('🎨 Generating mockup with DALL-E...');
      const response = await axios.post(`${API_URL}/api/create-mockup`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 seconds for AI processing
      });

      if (response.data.success) {
        setMockupImage(response.data.mockupUrl);
        setDownloadUrl(response.data.downloadUrl);
        setSuccess('Mockup generated successfully! 🎉');
      } else {
        setError(response.data.error || 'Failed to generate mockup');
      }
    } catch (err) {
      console.error('Error generating mockup:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate mockup');
    } finally {
      setLoading(false);
    }
  };

  const downloadMockup = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `mockup-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetForm = () => {
    setDesignImage(null);
    setDesignPreview(null);
    setMockupImage(null);
    setDownloadUrl(null);
    setSelectedMockup('white');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="mockup-generator-container">
      <div className="mockup-header">
        <h1>🎨 T-Shirt Mockup Generator</h1>
        <p>Create realistic product photos of your designs on t-shirts</p>
      </div>

      <div className="mockup-layout">
        {/* Left side: Mockup Selection */}
        <div className="mockup-section">
          <h2>1. Select Mockup Style</h2>
          <div className="mockup-grid">
            {mockups.map(mockup => (
              <div
                key={mockup.id}
                className={`mockup-card ${selectedMockup === mockup.id ? 'selected' : ''}`}
                onClick={() => setSelectedMockup(mockup.id)}
              >
                <img src={mockup.preview} alt={mockup.name} className="mockup-preview" />
                <h3>{mockup.name}</h3>
                <p>{mockup.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Design Upload */}
        <div className="mockup-section">
          <h2>2. Upload Design</h2>
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${designPreview ? 'has-file' : ''}`}
          >
            <input {...getInputProps()} />
            {designPreview ? (
              <div className="design-preview-container">
                <img src={designPreview} alt="Design preview" className="design-preview" />
                <p className="file-name">{designImage?.name}</p>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDesignImage(null);
                    setDesignPreview(null);
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="dropzone-content">
                <div className="dropzone-icon">📤</div>
                <p>Drag & drop your design here</p>
                <p className="dropzone-hint">or click to select</p>
                <p className="dropzone-formats">PNG, JPG, or WebP (max 20MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Generated Mockup */}
        <div className="mockup-section">
          <h2>3. Generated Mockup</h2>
          {mockupImage ? (
            <div className="generated-container">
              <img src={mockupImage} alt="Generated mockup" className="generated-mockup" />
              <div className="mockup-actions">
                <button className="btn-download" onClick={downloadMockup}>
                  ⬇️ Download Mockup
                </button>
                <button className="btn-reset" onClick={resetForm}>
                  🔄 Create New
                </button>
              </div>
            </div>
          ) : (
            <div className="placeholder">
              <p>Your generated mockup will appear here</p>
              <p className="placeholder-hint">Click "Generate Mockup" below</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && <div className="message error">❌ {error}</div>}
      {success && <div className="message success">✅ {success}</div>}

      {/* Generate Button */}
      <div className="mockup-actions-main">
        <button
          className="btn-generate"
          onClick={generateMockup}
          disabled={!designImage || !selectedMockup || loading}
        >
          {loading ? (
            <>
              <span className="spinner">●</span> Generating with AI...
            </>
          ) : (
            '✨ Generate Realistic Mockup'
          )}
        </button>
        {designImage && (
          <button className="btn-clear-design" onClick={() => {
            setDesignImage(null);
            setDesignPreview(null);
          }}>
            Clear Design
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mockup-info">
        <h3>💡 How it works</h3>
        <ul>
          <li>1. Choose a t-shirt color mockup</li>
          <li>2. Upload your design (generated or user-submitted)</li>
          <li>3. AI uses DALL-E to realistically blend the design onto the shirt</li>
          <li>4. Download the professional mockup for marketing or previews</li>
        </ul>
      </div>
    </div>
  );
};

export default MockupGenerator;
