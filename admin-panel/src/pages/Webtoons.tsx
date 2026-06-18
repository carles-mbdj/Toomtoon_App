import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Layers, BookOpen } from 'lucide-react';
import { webtoonsApi } from '../api/services';
import toast from 'react-hot-toast';

export const Webtoons: React.FC = () => {
  const [webtoons, setWebtoons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchWebtoons();
  }, []);

  const fetchWebtoons = async () => {
    try {
      const response = await webtoonsApi.getAll();
      setWebtoons(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    try {
      await webtoonsApi.delete(id);
      toast.success('Webtoon supprimé');
      fetchWebtoons();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredWebtoons = webtoons.filter((w) =>
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    w.author.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Catalogue Webtoons</h1>
          <p className="text-[var(--text-muted)] mt-1">{webtoons.length} webtoons</p>
        </div>
        <button
          onClick={() => navigate('/webtoons/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors"
        >
          <Plus size={20} />
          Nouveau webtoon
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un webtoon..."
          className="w-full pl-12 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredWebtoons.map((webtoon) => (
          <div key={webtoon.id} className="bg-[var(--surface)] rounded-2xl overflow-hidden group">
            <div className="relative aspect-[3/4]">
              {webtoon.cover_image ? (
                <img
                  src={webtoon.cover_image}
                  alt={webtoon.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[var(--surface-light)] flex items-center justify-center">
                  <BookOpen size={48} className="text-[var(--text-muted)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-[var(--primary)] text-white text-xs font-medium rounded-lg">
                  {webtoon.genre}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white font-semibold text-lg truncate">{webtoon.title}</h3>
                <p className="text-white/70 text-sm">{webtoon.author}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-sm text-[var(--text-muted)] mb-4">
                <span className="flex items-center gap-1">
                  <Eye size={14} /> {(webtoon.views || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Layers size={14} /> {webtoon.total_episodes || 0} ép.
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/webtoons/${webtoon.id}/episodes`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--surface-light)] hover:bg-[var(--primary)]/20 text-[var(--text-secondary)] hover:text-[var(--primary)] rounded-xl transition-colors"
                >
                  <Layers size={16} />
                  Épisodes
                </button>
                <button
                  onClick={() => navigate(`/webtoons/${webtoon.id}`)}
                  className="p-2 bg-[var(--surface-light)] hover:bg-yellow-500/20 text-[var(--text-secondary)] hover:text-yellow-500 rounded-xl transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(webtoon.id, webtoon.title)}
                  className="p-2 bg-[var(--surface-light)] hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-500 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredWebtoons.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)]">Aucun webtoon trouvé</p>
        </div>
      )}
    </div>
  );
};
