import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Eye, Image as ImageIcon } from 'lucide-react';
import { episodesApi, webtoonsApi } from '../api/services';
import toast from 'react-hot-toast';

export const Episodes: React.FC = () => {
  const { webtoonId } = useParams();
  const navigate = useNavigate();
  const [webtoon, setWebtoon] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [webtoonId]);

  const fetchData = async () => {
    try {
      const [webtoonRes, episodesRes] = await Promise.all([
        webtoonsApi.getById(webtoonId!),
        episodesApi.getByWebtoon(webtoonId!),
      ]);
      setWebtoon(webtoonRes.data);
      setEpisodes(episodesRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    try {
      await episodesApi.delete(id);
      toast.success('Épisode supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
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
    <div className="space-y-6">
      <button
        onClick={() => navigate('/webtoons')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft size={20} />
        Retour au catalogue
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">{webtoon?.title}</h1>
          <p className="text-[var(--text-muted)] mt-1">{episodes.length} épisodes</p>
        </div>
        <button
          onClick={() => navigate(`/webtoons/${webtoonId}/episodes/new`)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors"
        >
          <Plus size={20} />
          Nouvel épisode
        </button>
      </div>

      {/* Episodes List */}
      <div className="bg-[var(--surface)] rounded-2xl overflow-hidden">
        {episodes.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className="flex items-center gap-4 p-4 hover:bg-[var(--surface-light)] transition-colors"
              >
                <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white font-bold">
                  {episode.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--text)] truncate">{episode.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <ImageIcon size={14} /> {episode.pages?.length || 0} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={14} /> {(episode.views || 0).toLocaleString()}
                    </span>
                    {episode.is_free && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
                        Gratuit
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/webtoons/${webtoonId}/episodes/${episode.id}`)}
                    className="p-2 hover:bg-yellow-500/20 text-[var(--text-muted)] hover:text-yellow-500 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(episode.id, episode.title)}
                    className="p-2 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucun épisode pour ce webtoon</p>
            <button
              onClick={() => navigate(`/webtoons/${webtoonId}/episodes/new`)}
              className="mt-4 text-[var(--primary)] hover:underline"
            >
              Ajouter le premier épisode
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
