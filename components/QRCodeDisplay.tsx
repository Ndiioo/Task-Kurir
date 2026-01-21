
import React from 'react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 128 }) => {
  // Using a robust public API for QR Code generation for simplicity and reliability in this environment
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <img 
        src={qrUrl} 
        alt={`QR Code for ${value}`} 
        className="rounded"
        style={{ width: size, height: size }}
      />
      <p className="mt-2 text-xs font-mono text-gray-500">{value}</p>
    </div>
  );
};

export default QRCodeDisplay;
