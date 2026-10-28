import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/services';
import { getErrorMessage } from '../utils/errors';
import { User, Shield, Palette, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { user } = useAuth();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Tous les champs sont requis');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Mot de passe modifié avec succès');
      closePasswordModal();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors du changement de mot de passe'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Paramètres</h1>
        <p className="text-[var(--text-muted)] mt-1">Gérez les paramètres de l'application</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[var(--surface)] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[var(--primary)]/20 rounded-xl flex items-center justify-center">
            <User size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Profil administrateur</h2>
            <p className="text-sm text-[var(--text-muted)]">Informations de votre compte</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-[var(--surface)] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Sécurité</h2>
            <p className="text-sm text-[var(--text-muted)]">Paramètres de sécurité de votre compte</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full text-left px-4 py-3 bg-[var(--surface-light)] rounded-xl hover:bg-[var(--border)] transition-colors"
          >
            <span className="text-[var(--text)] font-medium">Changer le mot de passe</span>
            <p className="text-sm text-[var(--text-muted)] mt-1">Mettre à jour votre mot de passe de connexion</p>
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-[var(--surface)] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Palette size={20} className="text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Application</h2>
            <p className="text-sm text-[var(--text-muted)]">Informations sur ToomToon Admin</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">Version</span>
            <p className="text-[var(--text)] font-medium">1.0.0</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Environnement</span>
            <p className="text-[var(--text)] font-medium">Production</p>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text)]">Changer le mot de passe</h2>
              <button
                onClick={closePasswordModal}
                className="p-2 hover:bg-[var(--surface-light)] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closePasswordModal}
                disabled={saving}
                className="flex-1 py-3 bg-[var(--surface-light)] text-[var(--text-secondary)] font-medium rounded-xl hover:bg-[var(--border)] transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Save size={18} />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
