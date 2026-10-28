import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  articlesApi,
  episodesApi,
  genresApi,
  statsApi,
  subscriptionsApi,
  usersApi,
  webtoonsApi,
} from '../api/services';
import type { ArticleInput, EpisodeInput, SubscriptionPlanInput, WebtoonInput } from '../types';

// ==================== DASHBOARD ====================

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => statsApi.getDashboard().then((res) => res.data),
  });
}

// ==================== WEBTOONS ====================

export function useWebtoons() {
  return useQuery({
    queryKey: ['admin', 'webtoons'],
    queryFn: () => webtoonsApi.getAll().then((res) => res.data),
  });
}

export function useWebtoon(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'webtoon', id],
    queryFn: () => webtoonsApi.getById(id as string).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateWebtoon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WebtoonInput) => webtoonsApi.create(data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'webtoons'] }),
  });
}

export function useUpdateWebtoon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WebtoonInput> }) =>
      webtoonsApi.update(id, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'webtoons'] }),
  });
}

export function useDeleteWebtoon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => webtoonsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'webtoons'] }),
  });
}

// ==================== EPISODES ====================

export function useEpisodesByWebtoon(webtoonId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'episodes', webtoonId],
    queryFn: () => episodesApi.getByWebtoon(webtoonId as string).then((res) => res.data),
    enabled: !!webtoonId,
  });
}

export function useEpisode(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'episode', id],
    queryFn: () => episodesApi.getById(id as string).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EpisodeInput) => episodesApi.create(data).then((res) => res.data),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'episodes', variables.webtoon_id] }),
  });
}

export function useUpdateEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EpisodeInput> }) =>
      episodesApi.update(id, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'episodes'] }),
  });
}

export function useDeleteEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => episodesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'episodes'] }),
  });
}

// ==================== GENRES ====================

export function useGenres() {
  return useQuery({
    queryKey: ['admin', 'genres'],
    queryFn: () => genresApi.getAll().then((res) => res.data),
  });
}

export function useCreateGenre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => genresApi.create(data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] }),
  });
}

export function useUpdateGenre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      genresApi.update(id, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] }),
  });
}

export function useDeleteGenre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => genresApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] }),
  });
}

// ==================== USERS ====================

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => usersApi.getAll().then((res) => res.data),
  });
}

export function useUpdateUserSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, subscription_type }: { id: string; subscription_type: string | null }) =>
      usersApi.update(id, { subscription_type }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ==================== ARTICLES (TOOM-MAG) ====================

export function useArticles() {
  return useQuery({
    queryKey: ['admin', 'articles'],
    queryFn: () => articlesApi.getAll().then((res) => res.data),
  });
}

export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'article', id],
    queryFn: () => articlesApi.getById(id as string).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ArticleInput) => articlesApi.create(data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] }),
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ArticleInput }) =>
      articlesApi.update(id, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] }),
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => articlesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] }),
  });
}

// ==================== SUBSCRIPTION PLANS ====================

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['admin', 'subscriptionPlans'],
    queryFn: () => subscriptionsApi.getPlans().then((res) => res.data),
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubscriptionPlanInput) => subscriptionsApi.createPlan(data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptionPlans'] }),
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubscriptionPlanInput> }) =>
      subscriptionsApi.updatePlan(id, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptionPlans'] }),
  });
}

export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.deletePlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptionPlans'] }),
  });
}

// ==================== PAYMENTS ====================

export function usePayments(params: { skip: number; limit: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: () => subscriptionsApi.getPayments(params).then((res) => res.data),
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentIntentId, amount }: { paymentIntentId: string; amount?: number }) =>
      subscriptionsApi.refundPayment(paymentIntentId, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] }),
  });
}
