import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { episodesApi, webtoonsApi } from '../api/services';
import { MultiImageUpload } from '../components/MultiImageUpload';
import toast from 'react-hot-toast';

export const EpisodeForm: React.FC = () => {
  const { webtoonId, episodeId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!episodeId && episodeId !== 'new';

  const [webtoon, setWebtoon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    number: 1,
    is_free: false,
    pages: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, [webtoonId, episodeId]);

  const fetchData = async () => {
    try {
      const webtoonRes = await webtoonsApi.getById(webtoonId!);
      setWebtoon(webtoonRes.data);

      if (isEditing) {
        const episodeRes = await episodesApi.getById(episodeId!);
        setForm({
          title: episodeRes.data.title,
          number: episodeRes.data.number,
          is_free: episodeRes.data.is_free,
          pages: episodeRes.data.pages || [],
        });
      } else {
        // Get next episode number
        const episodesRes = await episodesApi.getByWebtoon(webtoonId!);
        const nextNumber = episodesRes.data.length + 1;
        setForm((prev) => ({ ...prev, number: nextNumber, title: `Épisode ${nextNumber}` }));
      }
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pages.length === 0) {
      toast.error('Ajoutez au moins une page');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        webtoon_id: webtoonId,
      };

      if (isEditing) {
        await episodesApi.update(episodeId!, data);
        toast.success('Épisode mis à jour');
      } else {
        await episodesApi.create(data);
        toast.success('Épisode créé');
      }
      navigate(`/webtoons/${webtoonId}/episodes`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
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
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate(`/webtoons/${webtoonId}/episodes`)}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Retour aux épisodes de {webtoon?.title}
      </button>

      <div className="bg-[var(--surface)] rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-6">
          {isEditing ? 'Modifier l\'épisode' : 'Nouvel épisode'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Numéro
              </label>
              <input
                type="number"
                min="1"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Titre
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Épisode 1"
                className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_free}
                onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
                className="w-5 h-5 rounded border-[var(--border)] bg-[var(--surface-light)] checked:bg-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-[var(--text)]">
                Épisode gratuit
                <span className="text-[var(--text-muted)] text-sm ml-2">
                  (accessible sans abonnement)
                </span>
              </span>
            </label>
          </div>

          <MultiImageUpload
            label="Pages de l'épisode"
            value={form.pages}
            onChange={(pages) => setForm({ ...form, pages })}
          />

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/webtoons/${webtoonId}/episodes`)}
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
              {isEditing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
