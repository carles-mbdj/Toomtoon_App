import React, { useRef, useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { imagesApi } from '../api/services';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspectRatio?: string;
  folder: 'covers' | 'thumbnails' | 'articles';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = 'Image',
  aspectRatio = '3/4',
  folder,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const response = await imagesApi.upload(reader.result as string, folder);
        onChange(response.data.url);
      } catch {
        setError("Échec de l'envoi de l'image");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
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
          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-white" />
            </div>
          )}
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
          disabled={uploading}
          className="w-40 border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)] hover:bg-[var(--surface-light)] transition-all cursor-pointer disabled:opacity-50"
          style={{ aspectRatio }}
        >
          {uploading ? (
            <Loader2 size={32} className="text-[var(--text-muted)] animate-spin" />
          ) : (
            <ImageIcon size={32} className="text-[var(--text-muted)]" />
          )}
          <span className="text-sm text-[var(--text-muted)]">
            {uploading ? 'Envoi...' : 'Ajouter'}
          </span>
        </button>
      )}

      {error && <p className="text-sm text-[var(--error)] mt-2">{error}</p>}
    </div>
  );
};
