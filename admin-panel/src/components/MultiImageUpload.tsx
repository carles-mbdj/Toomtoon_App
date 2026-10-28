import React, { useRef, useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { imagesApi } from '../api/services';

interface MultiImageUploadProps {
  value: string[];
  onChange: (images: string[]) => void;
  label?: string;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value = [],
  onChange,
  label = 'Pages'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;

    setError(null);
    setUploading(true);
    try {
      const dataUrls = await Promise.all(files.map(readAsDataUrl));
      const urls = await Promise.all(dataUrls.map((dataUrl) => imagesApi.upload(dataUrl, 'pages').then((res) => res.data.url)));
      onChange([...value, ...urls]);
    } catch {
      setError("Échec de l'envoi d'une ou plusieurs pages");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const newImages = [...value];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    onChange(newImages);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        {label} ({value.length} pages)
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesChange}
        className="hidden"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {value.map((img, index) => (
          <div key={index} className="relative group">
            <div className="absolute top-2 left-2 bg-[var(--primary)] text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
              {index + 1}
            </div>
            <img
              src={img}
              alt={`Page ${index + 1}`}
              className="w-full aspect-[3/4] object-cover rounded-xl border-2 border-[var(--border)]"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => moveImage(index, index - 1)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50"
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-2 bg-[var(--error)] rounded-lg hover:bg-red-600"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                onClick={() => moveImage(index, index + 1)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50"
                disabled={index === value.length - 1}
              >
                ↓
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-[3/4] border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)] hover:bg-[var(--surface-light)] transition-all cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={32} className="text-[var(--text-muted)] animate-spin" />
          ) : (
            <Plus size={32} className="text-[var(--text-muted)]" />
          )}
          <span className="text-sm text-[var(--text-muted)]">
            {uploading ? 'Envoi...' : 'Ajouter'}
          </span>
        </button>
      </div>

      {error && <p className="text-sm text-[var(--error)] mt-2">{error}</p>}
    </div>
  );
};
