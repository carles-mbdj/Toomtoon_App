// Domain types shared across admin-panel pages/components. These mirror
// the shapes returned by backend/models.py and the admin.py/webtoons.py/
// payments.py/content.py routers - keep them in sync if those change.

export type WebtoonStatus = 'ongoing' | 'completed';

export interface Webtoon {
  id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  cover_image?: string | null;
  season: number;
  status: WebtoonStatus;
  diffusion_day?: string | null;
  is_featured: boolean;
  created_at: string;
  total_episodes: number;
  views: number;
}

export interface WebtoonInput {
  title: string;
  author: string;
  genre: string;
  description: string;
  cover_image?: string;
  season: number;
  status: WebtoonStatus;
  diffusion_day?: string;
  is_featured: boolean;
}

export interface Episode {
  id: string;
  webtoon_id: string;
  number: number;
  title: string;
  thumbnail?: string | null;
  // Stripped to [] on list endpoints (premium content isn't leaked there);
  // use page_count, which always reflects the real number of pages.
  pages: string[];
  page_count: number;
  is_free: boolean;
  release_date: string;
  views: number;
}

export interface EpisodeInput {
  webtoon_id: string;
  number: number;
  title: string;
  is_free: boolean;
  pages: string[];
}

export interface Genre {
  id: string;
  name: string;
  webtoon_count: number;
  created_at: string | null;
}

export interface Article {
  id: string;
  title: string;
  subtitle?: string | null;
  content: string;
  cover_image?: string | null;
  category: 'news' | 'interview' | 'review' | 'behind_scenes';
  author: string;
  featured: boolean;
  views: number;
  created_at: string | null;
}

export interface ArticleInput {
  title: string;
  subtitle?: string | null;
  content: string;
  cover_image?: string | null;
  category: Article['category'];
  author?: string;
  featured: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  subscription_type?: string | null;
  subscription_end?: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration_days: number;
  prices: Record<string, number>;
  features: string[];
  popular: boolean;
  active?: boolean;
}

export interface SubscriptionPlanInput {
  id: string;
  name: string;
  duration_days: number;
  prices: Record<string, number>;
  features: string[];
  popular: boolean;
  active?: boolean;
}

export interface Payment {
  id: string;
  user_email: string;
  user_name: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  stripe_payment_intent_id: string;
  created_at: string | null;
}

export interface DashboardStats {
  total_users: number;
  total_webtoons: number;
  total_episodes: number;
  total_articles: number;
  active_subscriptions: number;
  premium_users: number;
  featured_webtoons: number;
  completed_webtoons: number;
  ongoing_webtoons: number;
  total_revenue: number;
  total_views: number;
  recent_users: Array<{
    id: string;
    username: string;
    email: string;
    subscription_type?: string | null;
    created_at: string | null;
  }>;
  recent_subscriptions: Array<{
    id: string;
    user_id: string;
    plan: string;
    price: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
  }>;
  recent_webtoons: Array<{
    id: string;
    title: string;
    author: string;
    cover_image?: string | null;
    views: number;
  }>;
}
