import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Newspaper } from 'lucide-react';
import { articlesApi } from '../api/services';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

const CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'news', label: 'Actualités' },
  { value: 'interview', label: 'Interviews' },
  { value: 'review', label: 'Critiques' },
  { value: 'behind_scenes', label: 'Coulisses' },
];

// Helper to strip HTML tags for excerpt display
const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const Articles: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; article: any | null }>({ open: false, article: null });
  const navigate = useNavigate();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await articlesApi.getAll();
      setArticles(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.article) return;
    try {
      await articlesApi.delete(deleteModal.article.id);
      toast.success('Article supprimé');
      setDeleteModal({ open: false, article: null });
      fetchArticles();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredArticles = articles.filter((a) => {
    const matchSearch = a.title?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || a.category === category;
    return matchSearch && matchCategory;
  });

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  // Get excerpt - use provided excerpt or generate from content
  const getExcerpt = (article: any) => {
    if (article.excerpt) return article.excerpt;
    if (article.content) {
      const plainText = stripHtml(article.content);
      return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
    }
    return '';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Toom-Mag</h1>
          <p className="text-[var(--text-muted)] mt-1">{articles.length} articles</p>
        </div>
        <button
          onClick={() => navigate('/articles/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors"
        >
          <Plus size={20} />
          Nouvel article
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            className="w-full pl-12 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-white focus:outline-none focus:border-[var(--primary)]"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value} className="bg-[#1F2A48] text-white">{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            className="bg-[var(--surface)] rounded-2xl p-6 flex flex-col sm:flex-row gap-4"
          >
            {article.cover_image ? (
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full sm:w-48 h-32 object-cover rounded-xl"
              />
            ) : (
              <div className="w-full sm:w-48 h-32 bg-[var(--surface-light)] rounded-xl flex items-center justify-center">
                <Newspaper size={32} className="text-[var(--text-muted)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-medium rounded-full">
                      {getCategoryLabel(article.category)}
                    </span>
                    {article.is_featured && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-medium rounded-full">
                        À la une
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text)] mt-2 line-clamp-2">
                    {article.title}
                  </h3>
                  {/* Excerpt / Summary */}
                  <p className="text-[var(--text-secondary)] text-sm mt-2 line-clamp-2">
                    {getExcerpt(article)}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-2">
                    Par {article.author || 'Admin'} • {new Date(article.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/articles/${article.id}`)}
                    className="p-2 hover:bg-yellow-500/20 text-[var(--text-muted)] hover:text-yellow-500 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteModal({ open: true, article })}
                    className="p-2 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Eye size={14} /> {(article.views || 0).toLocaleString()} vues
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredArticles.length === 0 && (
          <div className="text-center py-12 bg-[var(--surface)] rounded-2xl">
            <Newspaper size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucun article trouvé</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Supprimer l'article"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteModal.article?.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ open: false, article: null })}
      />
    </div>
  );
};
