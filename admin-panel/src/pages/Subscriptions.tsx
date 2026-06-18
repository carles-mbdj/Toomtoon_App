import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, CreditCard, Save, X, Check, DollarSign } from 'lucide-react';
import { subscriptionsApi } from '../api/services';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

const CURRENCIES = ['EUR', 'USD', 'XAF'];

export const Subscriptions: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; plan: any | null }>({ open: false, plan: null });
  const [form, setForm] = useState({
    id: '',
    name: '',
    duration_days: 30,
    prices: { EUR: 300, USD: 350, XAF: 2000 },
    features: '',
    popular: false,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionsApi.getPlans();
      if (response.data && response.data.length > 0) {
        setPlans(response.data);
      }
    } catch (error) {
      console.log('Error fetching plans');
      toast.error('Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.id.trim()) {
      toast.error('ID et nom requis');
      return;
    }

    const planData = {
      id: form.id,
      name: form.name,
      duration_days: form.duration_days,
      prices: form.prices,
      features: form.features.split('\n').filter(f => f.trim()),
      popular: form.popular,
      active: true,
    };

    try {
      if (editingPlan) {
        await subscriptionsApi.updatePlan(editingPlan.id, planData);
        toast.success('Plan mis à jour');
      } else {
        await subscriptionsApi.createPlan(planData);
        toast.success('Plan créé');
      }
      setShowModal(false);
      resetForm();
      fetchPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      id: plan.id,
      name: plan.name,
      duration_days: plan.duration_days,
      prices: plan.prices || { EUR: 0, USD: 0, XAF: 0 },
      features: (plan.features || []).join('\n'),
      popular: plan.popular || false,
    });
    setShowModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.plan) return;
    
    try {
      await subscriptionsApi.deletePlan(deleteModal.plan.id);
      toast.success('Plan désactivé');
      setDeleteModal({ open: false, plan: null });
      fetchPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setForm({ 
      id: '', 
      name: '', 
      duration_days: 30, 
      prices: { EUR: 300, USD: 350, XAF: 2000 }, 
      features: '',
      popular: false,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'XAF') {
      return new Intl.NumberFormat('fr-FR').format(amount) + ' XAF';
    }
    return (amount / 100).toFixed(2) + ' ' + currency;
  };

  const updatePrice = (currency: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setForm({
      ...form,
      prices: { ...form.prices, [currency]: numValue }
    });
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
          <h1 className="text-2xl font-bold text-[var(--text)]">Plans d'abonnement</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {plans.length} plans disponibles - Paiements via Stripe
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-medium rounded-xl transition-colors"
        >
          <Plus size={20} />
          Nouveau plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-[var(--surface)] rounded-2xl p-6 border-2 ${
              plan.popular ? 'border-[var(--primary)]' : 'border-transparent'
            }`}
          >
            {plan.popular && (
              <div className="text-center mb-4">
                <span className="px-3 py-1 bg-[var(--primary)] text-white text-xs font-bold rounded-full">
                  POPULAIRE
                </span>
              </div>
            )}
            
            <div className="text-center mb-6">
              <CreditCard size={32} className="mx-auto text-[var(--primary)] mb-3" />
              <h3 className="text-xl font-bold text-[var(--text)]">{plan.name}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-2">ID: {plan.id}</p>
              
              <div className="space-y-1 mt-3">
                {CURRENCIES.map(cur => (
                  <p key={cur} className={`text-lg ${cur === 'EUR' ? 'font-bold text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {formatPrice(plan.prices?.[cur] || 0, cur)}
                  </p>
                ))}
              </div>
              
              <p className="text-sm text-[var(--text-muted)] mt-2">
                {plan.duration_days} jours
              </p>
            </div>

            <ul className="space-y-2 mb-6">
              {(plan.features || []).map((feature: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Check size={16} className="text-[var(--success)]" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(plan)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--surface-light)] hover:bg-yellow-500/20 text-[var(--text-secondary)] hover:text-yellow-500 rounded-xl transition-colors"
              >
                <Edit size={16} />
                Modifier
              </button>
              <button
                onClick={() => setDeleteModal({ open: true, plan })}
                className="p-2 bg-[var(--surface-light)] hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-500 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text)]">
                {editingPlan ? 'Modifier le plan' : 'Nouveau plan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[var(--surface-light)] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    ID unique *
                  </label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    placeholder="plan_1_month"
                    disabled={!!editingPlan}
                    className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Nom affiché *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="1 Mois"
                    className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Durée (jours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Multi-currency prices */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  <DollarSign size={16} className="inline mr-1" />
                  Prix par devise (en centimes pour EUR/USD)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {CURRENCIES.map(cur => (
                    <div key={cur}>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">{cur}</label>
                      <input
                        type="number"
                        min="0"
                        value={form.prices[cur as keyof typeof form.prices] || 0}
                        onChange={(e) => updatePrice(cur, e.target.value)}
                        placeholder={cur === 'XAF' ? '2000' : '300'}
                        className="w-full px-3 py-2 bg-[var(--surface-light)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  EUR/USD: 300 = 3.00€/$ | XAF: valeur directe
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Avantages (un par ligne)
                </label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder="Accès illimité&#10;Sans publicité&#10;Accès anticipé"
                  rows={4}
                  className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
                />
                <span className="text-[var(--text)]">Marquer comme "Populaire"</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
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
                {editingPlan ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Désactiver le plan"
        message={`Êtes-vous sûr de vouloir désactiver le plan "${deleteModal.plan?.name}" ? Les utilisateurs existants conserveront leur abonnement jusqu'à expiration.`}
        confirmText="Désactiver"
        cancelText="Annuler"
        variant="warning"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ open: false, plan: null })}
      />
    </div>
  );
};
