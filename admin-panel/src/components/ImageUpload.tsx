import React, { useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (base64: string) => void;
  label?: string;
  aspectRatio?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  label = 'Image',
  aspectRatio = '3/4'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        {label}
      </label>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="w-40 h-auto rounded-xl object-cover border-2 border-[var(--border)]"
            style={{ aspectRatio }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--error)] rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 px-3 py-1 bg-black/60 rounded-lg text-xs font-medium hover:bg-black/80 transition-colors"
          >
            Changer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-40 border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)] hover:bg-[var(--surface-light)] transition-all cursor-pointer"
          style={{ aspectRatio }}
        >
          <ImageIcon size={32} className="text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-muted)]">Ajouter</span>
        </button>
      )}
    </div>
  );
};
