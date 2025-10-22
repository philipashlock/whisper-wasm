import React, { useState } from 'react';

interface AudioLoaderProps {
  onFileSelect: (file: File | null) => void;
}

export const AudioLoader: React.FC<AudioLoaderProps> = ({ onFileSelect }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setAudioFile(file);
    onFileSelect(file);
  };

  return (
    <div className="section">
      <h2>3. Load Audio</h2>
      <input
        className="input"
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ marginBottom: '10px' }}
      />
      {audioFile && (
        <div className="file-info">
          File: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}
    </div>
  );
};
