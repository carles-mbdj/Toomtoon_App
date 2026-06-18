import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Tag, Save, X } from 'lucide-react';
import { genresApi } from '../api/services';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

export const Genres: React.FC = () => {
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGenre, setEditingGenre] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; genre: any | null }>({ open: false, genre: null });

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const response = await genresApi.getAll();
      setGenres(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      if (editingGenre) {
        await genresApi.update(editingGenre.id, { name: formName });
        toast.success('Genre mis à jour');
      } else {
        await genresApi.create({ name: formName });
        toast.success('Genre créé');
      }
      setShowModal(false);
      setFormName('');
      setEditingGenre(null);
      fetchGenres();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleEdit = (genre: any) => {
    setEditingGenre(genre);
    setFormName(genre.name);
    setShowModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.genre) return;
    
    try {
      await genresApi.delete(deleteModal.genre.id);
      toast.success('Genre supprimé');
      setDeleteModal({ open: false, genre: null });
      fetchGenres();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors de la suppression';
      toast.error(message);
    }
  };

  const openCreateModal = () => {
    setEditingGenre(null);
    setFormName('');
    setShowModal(true);
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
          <h1 className="text-2xl font-bold text-[var(--text)]">Genres</h1>
          <p className="text-[var(--text-muted)] mt-1">{genres.length} genres</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors"
        >
          <Plus size={20} />
          Nouveau genre
        </button>
      </div>

      {/* Genres Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {genres.map((genre) => (
          <div
            key={genre.id}
            className="bg-[var(--surface)] rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--primary)]/20 rounded-lg flex items-center justify-center">
                <Tag size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">{genre.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{genre.webtoon_count || 0} webtoons</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEdit(genre)}
                className="p-2 hover:bg-yellow-500/20 text-[var(--text-muted)] hover:text-yellow-500 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => setDeleteModal({ open: true, genre })}
                className="p-2 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {genres.length === 0 && (
        <div className="text-center py-12 bg-[var(--surface)] rounded-2xl">
          <Tag size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)]">Aucun genre</p>
          <button
            onClick={openCreateModal}
            className="mt-4 text-[var(--primary)] hover:underline"
          >
            Créer le premier genre
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text)]">
                {editingGenre ? 'Modifier le genre' : 'Nouveau genre'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[var(--surface-light)] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Nom du genre *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Action, Romance..."
                className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-[var(--surface-light)] text-[var(--text-secondary)] font-medium rounded-xl hover:bg-[var(--border)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors"
              >
                <Save size={18} />
                {editingGenre ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Supprimer le genre"
        message={
          deleteModal.genre?.webtoon_count > 0
            ? `Attention : "${deleteModal.genre?.name}" est utilisé par ${deleteModal.genre?.webtoon_count} webtoon(s). Vous ne pouvez pas supprimer un genre utilisé.`
            : `Êtes-vous sûr de vouloir supprimer le genre "${deleteModal.genre?.name}" ?`
        }
        confirmText={deleteModal.genre?.webtoon_count > 0 ? 'Compris' : 'Supprimer'}
        cancelText="Annuler"
        variant={deleteModal.genre?.webtoon_count > 0 ? 'warning' : 'danger'}
        onConfirm={deleteModal.genre?.webtoon_count > 0 
          ? () => setDeleteModal({ open: false, genre: null })
          : handleDeleteConfirm
        }
        onCancel={() => setDeleteModal({ open: false, genre: null })}
      />
    </div>
  );
};
