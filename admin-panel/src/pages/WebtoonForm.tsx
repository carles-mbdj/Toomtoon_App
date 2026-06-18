import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Star } from 'lucide-react';
import { webtoonsApi, genresApi } from '../api/services';
import { ImageUpload } from '../components/ImageUpload';
import toast from 'react-hot-toast';

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export const WebtoonForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id && id !== 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    genre: 'Action',
    cover_image: '',
    season: 1,
    status: 'ongoing',
    diffusion_day: 'lundi',
    is_featured: false,
  });

  useEffect(() => {
    fetchGenres();
    if (isEditing) fetchWebtoon();
  }, [id]);

  const fetchGenres = async () => {
    try {
      const response = await genresApi.getAll();
      const genreNames = response.data.map((g: any) => g.name);
      setGenres(genreNames.length > 0 ? genreNames : getDefaultGenres());
    } catch (error) {
      setGenres(getDefaultGenres());
    }
  };

  const getDefaultGenres = () => [
    'Action', 'Romance', 'Fantastique', 'Comédie', 'Drame', 
    'Mystère', 'Science-Fiction', 'Horreur', 'Thriller', 'Aventure'
  ];

  const fetchWebtoon = async () => {
    setLoading(true);
    try {
      const response = await webtoonsApi.getById(id!);
      setForm({
        ...response.data,
        is_featured: response.data.is_featured || false,
      });
    } catch (error) {
      toast.error('Webtoon non trouvé');
      navigate('/webtoons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await webtoonsApi.update(id!, form);
        toast.success('Webtoon mis à jour');
      } else {
        await webtoonsApi.create(form);
        toast.success('Webtoon créé');
      }
      navigate('/webtoons');
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
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/webtoons')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Retour au catalogue
      </button>

      <div className="bg-[var(--surface)] rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-6">
          {isEditing ? 'Modifier le webtoon' : 'Nouveau webtoon'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ImageUpload
                label="Couverture"
                value={form.cover_image}
                onChange={(cover_image) => setForm({ ...form, cover_image })}
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
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Auteur *
                </label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Genre
                  </label>
                  <select
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-white focus:outline-none focus:border-[var(--primary)] appearance-none cursor-pointer"
                  >
                    {genres.map((g) => (
                      <option key={g} value={g} className="bg-[#1F2A48] text-white py-2">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Saison
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.season}
                    onChange={(e) => setForm({ ...form, season: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Jour de diffusion
              </label>
              <select
                value={form.diffusion_day}
                onChange={(e) => setForm({ ...form, diffusion_day: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-white focus:outline-none focus:border-[var(--primary)] appearance-none cursor-pointer capitalize"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d} className="bg-[#1F2A48] text-white capitalize">
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Statut
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'ongoing' })}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    form.status === 'ongoing'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--surface-light)] text-[var(--text-secondary)]'
                  }`}
                >
                  En cours
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'completed' })}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    form.status === 'completed'
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-[var(--surface-light)] text-[var(--text-secondary)]'
                  }`}
                >
                  Terminé
                </button>
              </div>
            </div>
          </div>

          {/* Featured toggle */}
          <div className="bg-[var(--surface-light)] rounded-xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Star size={20} className={form.is_featured ? 'text-yellow-500' : 'text-[var(--text-muted)]'} />
                <div>
                  <span className="text-[var(--text)] font-medium">Webtoon en exclusivité</span>
                  <p className="text-sm text-[var(--text-muted)]">Afficher sur la page d'accueil</p>
                </div>
              </div>
              <div
                onClick={() => setForm({ ...form, is_featured: !form.is_featured })}
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  form.is_featured ? 'bg-yellow-500' : 'bg-[var(--border)]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                    form.is_featured ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/webtoons')}
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
