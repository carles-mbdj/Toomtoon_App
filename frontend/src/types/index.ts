// Domain types shared across mobile screens/components. These mirror the
// shapes returned by backend/models.py and the webtoons.py/payments.py/
// content.py routers - keep them in sync if those change.

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

export interface Episode {
  id: string;
  webtoon_id: string;
  number: number;
  title: string;
  thumbnail?: string | null;
  // Always [] on list/recent endpoints (premium content is stripped there);
  // only populated by GET /episodes/{id}, which enforces the paywall.
  pages: string[];
  is_free: boolean;
  release_date: string;
  views: number;
}

export interface RecentEpisode extends Episode {
  webtoon_title: string;
  webtoon_cover?: string | null;
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

export interface Comment {
  id: string;
  user_id: string;
  username: string;
  content: string;
  likes: number;
  dislikes: number;
  liked_by_user: boolean;
  disliked_by_user: boolean;
  created_at: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration_days: number;
  prices: Record<string, number>;
  features: string[];
  popular: boolean;
}

export interface HistoryEntry {
  id: string;
  user_id: string;
  webtoon_id: string;
  episode_id: string;
  last_page: number;
  read_at: string;
  webtoon_title: string;
  webtoon_cover?: string | null;
  episode_title: string;
  episode_number: number;
}
