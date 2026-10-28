import React, { useState } from 'react';
import { CreditCard, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Payment } from '../types';
import { getErrorMessage } from '../utils/errors';
import { usePayments, useRefundPayment } from '../hooks/queries';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'succeeded', label: 'Réussis' },
  { value: 'failed', label: 'Échoués' },
  { value: 'refunded', label: 'Remboursés' },
  { value: 'partially_refunded', label: 'Partiellement remboursés' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  succeeded: 'bg-green-500/20 text-green-500',
  failed: 'bg-red-500/20 text-red-500',
  refunded: 'bg-gray-500/20 text-gray-400',
  partially_refunded: 'bg-orange-500/20 text-orange-500',
};

const formatAmount = (amount: number, currency: string) => {
  if (currency === 'XAF') {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' XAF';
  }
  return (amount / 100).toFixed(2) + ' ' + currency;
};

export const Payments: React.FC = () => {
  const [skip, setSkip] = useState(0);
  const [status, setStatus] = useState('');
  const [refundModal, setRefundModal] = useState<{ open: boolean; payment: Payment | null }>({
    open: false,
    payment: null,
  });
  const [partialAmount, setPartialAmount] = useState('');

  const paymentsQuery = usePayments({ skip, limit: PAGE_SIZE, status: status || undefined });
  const payments = paymentsQuery.data?.payments ?? [];
  const total = paymentsQuery.data?.total ?? 0;
  const loading = paymentsQuery.isLoading;
  const refundPayment = useRefundPayment();

  const openRefundModal = (payment: Payment) => {
    setPartialAmount('');
    setRefundModal({ open: true, payment });
  };

  const handleRefund = async () => {
    if (!refundModal.payment) return;
    const { currency } = refundModal.payment;
    const amountInStripeUnit = partialAmount
      ? Math.round(parseFloat(partialAmount) * (currency === 'XAF' ? 1 : 100))
      : undefined;

    try {
      await refundPayment.mutateAsync({
        paymentIntentId: refundModal.payment.stripe_payment_intent_id,
        amount: amountInStripeUnit,
      });
      toast.success('Remboursement effectué');
      setRefundModal({ open: false, payment: null });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors du remboursement'));
    }
  };

  const statusLabel = (s: string) => STATUS_FILTERS.find((f) => f.value === s)?.label || s;

  if (loading && payments.length === 0) {
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
          <h1 className="text-2xl font-bold text-[var(--text)]">Paiements</h1>
          <p className="text-[var(--text-muted)] mt-1">{total} paiement(s)</p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setSkip(0);
            setStatus(e.target.value);
          }}
          className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Utilisateur</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Plan</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Montant</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Statut</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Date</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-medium text-[var(--text)]">{p.user_name}</p>
                    <p className="text-sm text-[var(--text-muted)]">{p.user_email}</p>
                  </td>
                  <td className="px-6 py-4 text-[var(--text)]">{p.plan_name}</td>
                  <td className="px-6 py-4 text-[var(--text)]">{formatAmount(p.amount, p.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[p.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {p.status === 'succeeded' && (
                      <button
                        onClick={() => openRefundModal(p)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--error)] hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Rembourser"
                      >
                        <RotateCcw size={16} />
                        Rembourser
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payments.length === 0 && (
          <div className="text-center py-12">
            <CreditCard size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucun paiement</p>
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

      {refundModal.open && refundModal.payment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">Rembourser le paiement</h2>
            <p className="text-[var(--text-muted)] mb-4">
              {refundModal.payment.user_email} — {formatAmount(refundModal.payment.amount, refundModal.payment.currency)}
            </p>

            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Montant partiel (optionnel, laisser vide pour un remboursement complet)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder={refundModal.payment.currency === 'XAF' ? 'Montant en XAF' : 'Montant dans la devise (ex: 4.99)'}
              className="w-full px-4 py-3 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--primary)] mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRefundModal({ open: false, payment: null })}
                className="flex-1 py-3 bg-[var(--surface-light)] text-[var(--text-secondary)] font-medium rounded-xl hover:bg-[var(--border)] transition-colors"
                disabled={refundPayment.isPending}
              >
                Annuler
              </button>
              <button
                onClick={handleRefund}
                disabled={refundPayment.isPending}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {refundPayment.isPending ? 'Remboursement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
