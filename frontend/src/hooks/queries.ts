import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  articlesApi,
  commentsApi,
  episodesApi,
  genresApi,
  scheduleApi,
  subscriptionApi,
  webtoonsApi,
} from '../services/api';
import type { SubscriptionPlan } from '../types';

// ==================== WEBTOONS ====================

export function useWebtoons(
  params?: { genre?: string; status?: string; search?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['webtoons', params ?? {}],
    queryFn: () => webtoonsApi.getAll(params).then((res) => res.data),
    enabled: options?.enabled ?? true,
  });
}

export function useFeaturedWebtoons() {
  return useQuery({
    queryKey: ['webtoons', 'featured'],
    queryFn: () => webtoonsApi.getFeatured().then((res) => res.data),
  });
}

export function useWebtoon(id: string | undefined) {
  return useQuery({
    queryKey: ['webtoon', id],
    queryFn: () => webtoonsApi.getById(id as string).then((res) => res.data),
    enabled: !!id,
  });
}

// ==================== EPISODES ====================

export function useEpisodesByWebtoon(webtoonId: string | undefined) {
  return useQuery({
    queryKey: ['episodes', 'byWebtoon', webtoonId],
    queryFn: () => episodesApi.getByWebtoon(webtoonId as string).then((res) => res.data),
    enabled: !!webtoonId,
  });
}

export function useRecentEpisodes() {
  return useQuery({
    queryKey: ['episodes', 'recent'],
    queryFn: () => episodesApi.getRecent().then((res) => res.data),
  });
}

export function useEpisode(id: string | undefined) {
  return useQuery({
    queryKey: ['episode', id],
    queryFn: () => episodesApi.getById(id as string).then((res) => res.data),
    enabled: !!id,
  });
}

// ==================== GENRES / SCHEDULE ====================

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: () => genresApi.getAll().then((res) => res.data),
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: () => scheduleApi.get().then((res) => res.data),
  });
}

// ==================== ARTICLES (TOOM-MAG) ====================

export function useArticles(params?: { category?: string; featured?: boolean }) {
  return useQuery({
    queryKey: ['articles', params ?? {}],
    queryFn: () => articlesApi.getAll(params).then((res) => res.data),
  });
}

export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => articlesApi.getById(id as string).then((res) => res.data),
    enabled: !!id,
  });
}

// ==================== COMMENTS ====================

export function useComments(params: { webtoon_id?: string; episode_id?: string; article_id?: string }) {
  return useQuery({
    queryKey: ['comments', params],
    queryFn: () => commentsApi.get(params).then((res) => res.data),
    enabled: !!(params.webtoon_id || params.episode_id || params.article_id),
  });
}

export function useCreateComment(params: { webtoon_id?: string; episode_id?: string; article_id?: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => commentsApi.create({ ...params, content }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', params] });
    },
  });
}

export function useLikeComment(params: { webtoon_id?: string; episode_id?: string; article_id?: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.like(commentId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', params] });
    },
  });
}

// ==================== SUBSCRIPTION PLANS ====================

interface LegacyPlanEntry {
  label?: string;
  days?: number;
  price?: number;
}

function normalizePlans(data: unknown): SubscriptionPlan[] {
  // Handle both array format (new) and object format (old, kept for
  // backward compatibility with any cached/legacy backend response).
  if (Array.isArray(data)) return data as SubscriptionPlan[];
  return Object.entries(data as Record<string, LegacyPlanEntry>).map(([key, value]) => ({
    id: key,
    name: value.label || key,
    duration_days: value.days || 30,
    prices: { EUR: (value.price || 0) * 100 },
    features: ['Accès illimité', 'Sans publicité'],
    popular: key === '3_months',
  }));
}

export function useSubscriptionPlans(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: () => subscriptionApi.getPlans().then((res) => normalizePlans(res.data)),
    enabled: options?.enabled ?? true,
  });
}
