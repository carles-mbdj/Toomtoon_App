import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import type { ArticleInput } from '../types';
import { getErrorMessage } from '../utils/errors';
import { ImageUpload } from '../components/ImageUpload';
import { RichTextEditor } from '../components/RichTextEditor';
import { useArticle, useCreateArticle, useUpdateArticle } from '../hooks/queries';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'news', label: 'Actualités' },
  { value: 'interview', label: 'Interview' },
  { value: 'review', label: 'Critique' },
  { value: 'behind_scenes', label: 'Coulisses' },
];

export const ArticleForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id && id !== 'new';

  const [form, setForm] = useState<ArticleInput>({
    title: '',
    subtitle: '',
    content: '',
    category: 'news',
    cover_image: '',
    featured: false,
  });

  const articleQuery = useArticle(isEditing ? id : undefined);
  const loading = isEditing && articleQuery.isLoading;
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const saving = createArticle.isPending || updateArticle.isPending;

  useEffect(() => {
    if (articleQuery.data) setForm(articleQuery.data);
  }, [articleQuery.data]);

  useEffect(() => {
    if (articleQuery.isError) {
      toast.error('Article non trouvé');
      navigate('/articles');
    }
  }, [articleQuery.isError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast.error('Titre et contenu requis');
      return;
    }

    try {
      if (isEditing) {
        await updateArticle.mutateAsync({ id: id!, data: form });
        toast.success('Article mis à jour');
      } else {
        await createArticle.mutateAsync(form);
        toast.success('Article créé');
      }
      navigate('/articles');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la sauvegarde'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/articles')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Retour aux articles
      </button>

      <div className="bg-[var(--surface)] rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-6">
          {isEditing ? 'Modifier l\'article' : 'Nouvel article'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ImageUpload
                label="Image mise en avant"
                value={form.cover_image ?? ''}
                onChange={(cover_image) => setForm({ ...form, cover_image })}
                aspectRatio="16/9"
                folder="articles"
              />
            </div>

            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Titre de l'article"
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Catégorie
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ArticleInput['category'] })}
                    className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer py-3">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="w-5 h-5 rounded border-[var(--border)] bg-[var(--surface-light)] checked:bg-[var(--primary)]"
                    />
                    <span className="text-[var(--text)]">À la une</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Résumé (optionnel)
            </label>
            <textarea
              value={form.subtitle ?? ''}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              rows={2}
              placeholder="Court résumé de l'article"
              className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Contenu *
            </label>
            <RichTextEditor
              value={form.content}
              onChange={(content) => setForm({ ...form, content })}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/articles')}
              className="px-6 py-3 bg-[var(--surface-light)] text-[var(--text-secondary)] font-medium rounded-xl hover:bg-[var(--border)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Save size={20} />
              )}
              {isEditing ? 'Enregistrer' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
