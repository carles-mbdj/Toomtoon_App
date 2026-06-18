import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('admin-theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('admin-theme', theme);
    
    // Update CSS variables
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.style.setProperty('--primary', '#9B2C2C');
      root.style.setProperty('--primary-dark', '#742A2A');
      root.style.setProperty('--secondary', '#E2E8F0');
      root.style.setProperty('--background', '#F7FAFC');
      root.style.setProperty('--surface', '#FFFFFF');
      root.style.setProperty('--surface-light', '#EDF2F7');
      root.style.setProperty('--text', '#1A202C');
      root.style.setProperty('--text-secondary', '#4A5568');
      root.style.setProperty('--text-muted', '#718096');
      root.style.setProperty('--success', '#38A169');
      root.style.setProperty('--warning', '#D69E2E');
      root.style.setProperty('--error', '#E53E3E');
      root.style.setProperty('--border', '#E2E8F0');
    } else {
      root.style.setProperty('--primary', '#9B2C2C');
      root.style.setProperty('--primary-dark', '#742A2A');
      root.style.setProperty('--secondary', '#2D3748');
      root.style.setProperty('--background', '#1A1A2E');
      root.style.setProperty('--surface', '#16213E');
      root.style.setProperty('--surface-light', '#1F2A48');
      root.style.setProperty('--text', '#F7FAFC');
      root.style.setProperty('--text-secondary', '#A0AEC0');
      root.style.setProperty('--text-muted', '#718096');
      root.style.setProperty('--success', '#48BB78');
      root.style.setProperty('--warning', '#ECC94B');
      root.style.setProperty('--error', '#F56565');
      root.style.setProperty('--border', '#2D3748');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
