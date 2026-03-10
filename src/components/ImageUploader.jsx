import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import '../styles/ImageUploader.css';

const ImageUploader = ({ onImageUpload }) => {
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      // Read file and convert to URL
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageUpload({
          type: 'upload',
          imageUrl: event.target.result,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    });
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: true,
  });

  return (
    <div className="image-uploader">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop images here...</p>
        ) : (
          <div>
            <p className="dropzone-title">📁 Upload Your Design</p>
            <p className="dropzone-subtitle">
              Drag & drop images here, or click to select files
            </p>
            <p className="dropzone-hint">
              Supported: PNG, JPG, GIF, WebP
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
