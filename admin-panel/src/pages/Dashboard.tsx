import React, { useEffect, useState } from 'react';
import { BookOpen, Users, Eye, Newspaper, Crown, TrendingUp, Calendar, Star } from 'lucide-react';
import { webtoonsApi, usersApi, articlesApi } from '../api/services';
import toast from 'react-hot-toast';

interface Stats {
  totalWebtoons: number;
  totalUsers: number;
  premiumUsers: number;
  totalArticles: number;
  totalViews: number;
  featuredWebtoons: number;
  completedWebtoons: number;
  ongoingWebtoons: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalWebtoons: 0,
    totalUsers: 0,
    premiumUsers: 0,
    totalArticles: 0,
    totalViews: 0,
    featuredWebtoons: 0,
    completedWebtoons: 0,
    ongoingWebtoons: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentWebtoons, setRecentWebtoons] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [webtoonsRes, usersRes, articlesRes] = await Promise.all([
        webtoonsApi.getAll(),
        usersApi.getAll(),
        articlesApi.getAll(),
      ]);

      const webtoons = webtoonsRes.data || [];
      const usersData = usersRes.data.users || usersRes.data || [];
      const articles = articlesRes.data || [];

      const premiumCount = usersData.filter((u: any) => 
        u.subscription_type && u.subscription_type !== 'free' && u.subscription_type !== null
      ).length;

      const featuredCount = webtoons.filter((w: any) => w.is_featured).length;
      const completedCount = webtoons.filter((w: any) => w.status === 'completed').length;
      const ongoingCount = webtoons.filter((w: any) => w.status === 'ongoing').length;
      const totalViews = webtoons.reduce((sum: number, w: any) => sum + (w.views || 0), 0);

      setStats({
        totalWebtoons: webtoons.length,
        totalUsers: usersData.length,
        premiumUsers: premiumCount,
        totalArticles: articles.length,
        totalViews: totalViews,
        featuredWebtoons: featuredCount,
        completedWebtoons: completedCount,
        ongoingWebtoons: ongoingCount,
      });

      setRecentWebtoons(webtoons.slice(0, 5));
      setRecentUsers(usersData.slice(0, 5));
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Webtoons', value: stats.totalWebtoons, icon: BookOpen, color: 'bg-blue-500', subtext: `${stats.ongoingWebtoons} en cours` },
    { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'bg-green-500', subtext: `${stats.premiumUsers} premium` },
    { label: 'Premium', value: stats.premiumUsers, icon: Crown, color: 'bg-yellow-500', subtext: `${Math.round((stats.premiumUsers / stats.totalUsers) * 100) || 0}% du total` },
    { label: 'Articles', value: stats.totalArticles, icon: Newspaper, color: 'bg-purple-500', subtext: 'Toom-Mag' },
    { label: 'Vues totales', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'bg-pink-500', subtext: 'Toutes plateformes' },
    { label: 'En exclusivité', value: stats.featuredWebtoons, icon: Star, color: 'bg-orange-500', subtext: 'Page d\'accueil' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
        <p className="text-[var(--text-muted)] mt-1">Vue d'ensemble de ToomToon</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--surface)] rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={20} className="text-white" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{stat.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{stat.subtext}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Webtoons */}
        <div className="bg-[var(--surface)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">Webtoons récents</h2>
            <BookOpen size={20} className="text-[var(--text-muted)]" />
          </div>
          <div className="space-y-3">
            {recentWebtoons.map((webtoon) => (
              <div key={webtoon.id} className="flex items-center gap-3 p-3 bg-[var(--surface-light)] rounded-xl">
                {webtoon.cover_image ? (
                  <img src={webtoon.cover_image} alt="" className="w-12 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-12 h-16 bg-[var(--border)] rounded-lg flex items-center justify-center">
                    <BookOpen size={16} className="text-[var(--text-muted)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text)] truncate">{webtoon.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">{webtoon.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text)]">{(webtoon.views || 0).toLocaleString()}</p>
                  <p className="text-xs text-[var(--text-muted)]">vues</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-[var(--surface)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">Utilisateurs récents</h2>
            <Users size={20} className="text-[var(--text-muted)]" />
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-[var(--surface-light)] rounded-xl">
                <div className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text)] truncate">{user.username}</p>
                  <p className="text-sm text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
                <div>
                  {user.subscription_type && user.subscription_type !== 'free' ? (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-medium rounded-full flex items-center gap-1">
                      <Crown size={12} />
                      Premium
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
                      Free
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-[var(--surface)] rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Répartition des webtoons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--surface-light)] rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp size={24} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{stats.ongoingWebtoons}</p>
            <p className="text-sm text-[var(--text-muted)]">En cours</p>
          </div>
          <div className="bg-[var(--surface-light)] rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar size={24} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{stats.completedWebtoons}</p>
            <p className="text-sm text-[var(--text-muted)]">Terminés</p>
          </div>
          <div className="bg-[var(--surface-light)] rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star size={24} className="text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{stats.featuredWebtoons}</p>
            <p className="text-sm text-[var(--text-muted)]">En exclusivité</p>
          </div>
        </div>
      </div>
    </div>
  );
};
