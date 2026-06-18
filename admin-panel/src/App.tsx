import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Webtoons } from './pages/Webtoons';
import { WebtoonForm } from './pages/WebtoonForm';
import { Episodes } from './pages/Episodes';
import { EpisodeForm } from './pages/EpisodeForm';
import { Users } from './pages/Users';
import { Articles } from './pages/Articles';
import { ArticleForm } from './pages/ArticleForm';
import { Genres } from './pages/Genres';
import { Subscriptions } from './pages/Subscriptions';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="webtoons" element={<Webtoons />} />
        <Route path="webtoons/new" element={<WebtoonForm />} />
        <Route path="webtoons/:id" element={<WebtoonForm />} />
        <Route path="webtoons/:webtoonId/episodes" element={<Episodes />} />
        <Route path="webtoons/:webtoonId/episodes/new" element={<EpisodeForm />} />
        <Route path="webtoons/:webtoonId/episodes/:episodeId" element={<EpisodeForm />} />
        <Route path="users" element={<Users />} />
        <Route path="genres" element={<Genres />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="articles" element={<Articles />} />
        <Route path="articles/new" element={<ArticleForm />} />
        <Route path="articles/:id" element={<ArticleForm />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename="/api/admin">
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              },
              success: {
                iconTheme: {
                  primary: '#48BB78',
                  secondary: '#F7FAFC',
                },
              },
              error: {
                iconTheme: {
                  primary: '#F56565',
                  secondary: '#F7FAFC',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
