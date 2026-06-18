import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Palette } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();

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
          <button className="w-full text-left px-4 py-3 bg-[var(--surface-light)] rounded-xl hover:bg-[var(--border)] transition-colors">
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
    </div>
  );
};
