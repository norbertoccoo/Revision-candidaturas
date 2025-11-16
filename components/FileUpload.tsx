
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './Icon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };
  
  return (
    <div
      className="w-full max-w-2xl mx-auto"
    >
      <label
        htmlFor="file-upload"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isDragging ? 'border-primary bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}`}
      >
        <div className="text-center">
            <UploadIcon className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
            <p className="text-xl font-semibold text-gray-700 mb-2">
              Arrastra y suelta un archivo aquí
            </p>
            <p className="text-secondary-light mb-4">o haz clic para seleccionar</p>
            <p className="text-sm text-gray-400">Soporta Excel, CSV y JSON</p>
        </div>
      </label>
      <input
        id="file-upload"
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept=".csv, .json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
      />
    </div>
  );
};