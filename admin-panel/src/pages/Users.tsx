import React, { useEffect, useState } from 'react';
import { Search, Crown, User, Trash2, Calendar } from 'lucide-react';
import { usersApi } from '../api/services';
import { subscriptionsApi } from '../api/services';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [subscriptionModal, setSubscriptionModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [selectedPlan, setSelectedPlan] = useState<string>('none');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, plansRes] = await Promise.all([
        usersApi.getAll(),
        subscriptionsApi.getPlans()
      ]);
      const usersData = usersRes.data.users || usersRes.data;
      setUsers(Array.isArray(usersData) ? usersData : []);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const openSubscriptionModal = (user: any) => {
    setSelectedPlan(user.subscription_type || 'none');
    setSubscriptionModal({ open: true, user });
  };

  const handleUpdateSubscription = async () => {
    if (!subscriptionModal.user) return;
    
    try {
      await usersApi.update(subscriptionModal.user.id, { 
        subscription_type: selectedPlan === 'none' ? null : selectedPlan 
      });
      toast.success('Abonnement mis à jour');
      setSubscriptionModal({ open: false, user: null });
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    
    try {
      await usersApi.delete(deleteModal.user.id);
      toast.success('Utilisateur supprimé');
      setDeleteModal({ open: false, user: null });
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getSubscriptionStatus = (user: any) => {
    if (!user.subscription_type) {
      return { label: 'Free', color: 'bg-gray-500/20 text-gray-400', active: false };
    }
    
    const endDate = user.subscription_end ? new Date(user.subscription_end) : null;
    const isExpired = endDate && endDate < new Date();
    
    if (isExpired) {
      return { label: 'Expiré', color: 'bg-red-500/20 text-red-400', active: false, endDate };
    }
    
    return { 
      label: 'Premium', 
      color: 'bg-yellow-500/20 text-yellow-500', 
      active: true,
      endDate,
      planId: user.subscription_type
    };
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).format(date);
  };

  const getPlanName = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.name || planId;
  };

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const premiumCount = users.filter(u => getSubscriptionStatus(u).active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Utilisateurs</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {users.length} utilisateurs inscrits • {premiumCount} premium actifs
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="w-full pl-12 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--text-muted)]">Utilisateur</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--text-muted)]">Email</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--text-muted)]">Statut</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--text-muted)]">Plan</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--text-muted)]">Expiration</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const status = getSubscriptionStatus(user);
                return (
                  <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-light)]">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.is_admin ? 'bg-[var(--primary)]' : 'bg-[var(--surface-light)]'
                        }`}>
                          <span className={`font-semibold ${user.is_admin ? 'text-white' : 'text-[var(--text)]'}`}>
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-[var(--text)]">{user.username}</span>
                          {user.is_admin && (
                            <span className="ml-2 px-2 py-0.5 bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-medium rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[var(--text-secondary)]">{user.email}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        {status.active && <Crown size={14} />}
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[var(--text-secondary)]">
                      {status.planId ? getPlanName(status.planId) : '-'}
                    </td>
                    <td className="py-4 px-6">
                      {status.endDate ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={14} className="text-[var(--text-muted)]" />
                          <span className={status.active ? 'text-[var(--text-secondary)]' : 'text-red-400'}>
                            {formatDate(status.endDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openSubscriptionModal(user)}
                          className="px-3 py-1.5 text-sm bg-[var(--surface-light)] hover:bg-[var(--primary)]/20 text-[var(--text-secondary)] hover:text-[var(--primary)] rounded-lg transition-colors"
                        >
                          Gérer
                        </button>
                        {!user.is_admin && (
                          <button
                            onClick={() => setDeleteModal({ open: true, user })}
                            className="p-2 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteModal.user?.username}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, user: null })}
      />

      {/* Subscription Management Modal */}
      {subscriptionModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text)]">
                Gérer l'abonnement
              </h2>
              <button
                onClick={() => setSubscriptionModal({ open: false, user: null })}
                className="p-2 hover:bg-[var(--surface-light)] rounded-lg text-[var(--text-muted)]"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-4 bg-[var(--surface-light)] rounded-xl">
              <p className="text-sm text-[var(--text-muted)]">Utilisateur</p>
              <p className="font-medium text-[var(--text)]">{subscriptionModal.user?.username}</p>
              <p className="text-sm text-[var(--text-secondary)]">{subscriptionModal.user?.email}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                Plan d'abonnement
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-[var(--surface-light)] rounded-xl cursor-pointer hover:bg-[var(--border)] transition-colors">
                  <input
                    type="radio"
                    name="plan"
                    value="none"
                    checked={selectedPlan === 'none'}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-4 h-4 text-[var(--primary)]"
                  />
                  <span className="text-[var(--text)]">Aucun (Free)</span>
                </label>
                {plans.map((plan) => (
                  <label 
                    key={plan.id}
                    className="flex items-center justify-between p-3 bg-[var(--surface-light)] rounded-xl cursor-pointer hover:bg-[var(--border)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={selectedPlan === plan.id}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="w-4 h-4 text-[var(--primary)]"
                      />
                      <div>
                        <span className="text-[var(--text)] font-medium">{plan.name}</span>
                        <p className="text-xs text-[var(--text-muted)]">{plan.duration_days} jours</p>
                      </div>
                    </div>
                    <span className="text-[var(--primary)] font-semibold">
                      {plan.prices?.EUR ? `${(plan.prices.EUR / 100).toFixed(0)}€` : '-'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSubscriptionModal({ open: false, user: null })}
                className="flex-1 py-3 bg-[var(--surface-light)] text-[var(--text-secondary)] font-medium rounded-xl hover:bg-[var(--border)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateSubscription}
                className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
