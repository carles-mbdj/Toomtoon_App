import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getErrorMessage } from '../utils/errors';
import { useAdminComments, useDeleteComment } from '../hooks/queries';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

const CONTEXT_LABELS: Record<string, string> = {
  webtoon: 'Webtoon',
  episode: 'Épisode',
  article: 'Toom-Mag',
};

export const Comments: React.FC = () => {
  const [skip, setSkip] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const commentsQuery = useAdminComments({ skip, limit: PAGE_SIZE });
  const comments = commentsQuery.data?.comments ?? [];
  const total = commentsQuery.data?.total ?? 0;
  const loading = commentsQuery.isLoading;
  const deleteComment = useDeleteComment();

  const handleDelete = async (id: string) => {
    try {
      await deleteComment.mutateAsync(id);
      toast.success('Commentaire supprimé');
      setDeleteId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la suppression'));
    }
  };

  if (loading && comments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Commentaires</h1>
        <p className="text-[var(--text-muted)] mt-1">{total} commentaire(s)</p>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Auteur</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Commentaire</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Sur</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Réactions</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Date</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-medium text-[var(--text)]">{c.username}</p>
                    {c.user_email && <p className="text-sm text-[var(--text-muted)]">{c.user_email}</p>}
                  </td>
                  <td className="px-6 py-4 text-[var(--text)] max-w-md">
                    <p className="line-clamp-2">{c.content}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {c.context_title ? (
                      <>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--surface-light)] text-[var(--text-secondary)] mr-2">
                          {c.context_type ? CONTEXT_LABELS[c.context_type] : ''}
                        </span>
                        {c.context_title}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={14} /> {c.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown size={14} /> {c.dislikes}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--error)] hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {comments.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucun commentaire</p>
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)]">
              {skip + 1}-{Math.min(skip + PAGE_SIZE, total)} sur {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                disabled={skip === 0}
                className="p-2 bg-[var(--surface-light)] rounded-lg disabled:opacity-40 hover:bg-[var(--border)] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setSkip(skip + PAGE_SIZE)}
                disabled={skip + PAGE_SIZE >= total}
                className="p-2 bg-[var(--surface-light)] rounded-lg disabled:opacity-40 hover:bg-[var(--border)] transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">Supprimer ce commentaire ?</h2>
            <p className="text-[var(--text-muted)] mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-[var(--surface-light)] text-[var(--text-secondary)] font-medium rounded-xl hover:bg-[var(--border)] transition-colors"
                disabled={deleteComment.isPending}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteComment.isPending}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {deleteComment.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
