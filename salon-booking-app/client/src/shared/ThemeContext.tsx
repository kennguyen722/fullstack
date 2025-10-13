import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'light-purple' | 'purple-dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  availableThemes: Array<{
    value: Theme;
    label: string;
    icon: string;
    description: string;
  }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('salon-app-theme');
    const fallback: Theme = 'dark';
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'light-purple' || savedTheme === 'purple-dark') {
      return savedTheme as Theme;
    }
    return fallback;
  });

  const availableThemes = [
    {
      value: 'light' as Theme,
      label: 'Light',
      icon: 'bi-sun-fill',
      description: 'Clean and bright interface'
    },
    {
      value: 'light-purple' as Theme,
      label: 'Light • Purple',
      icon: 'bi-palette-fill',
      description: 'Professional light theme with purple accents'
    },
    {
      value: 'purple-dark' as Theme,
      label: 'Purple • Glow',
      icon: 'bi-stars',
      description: 'Modern dark purple theme with glowing navbar and sidebar'
    },
    {
      value: 'dark' as Theme,
      label: 'Dark',
      icon: 'bi-moon-stars-fill',
      description: 'Professional dark theme with beautiful gradients'
    }
  ];

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('salon-app-theme', theme);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update body class for additional styling
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  const toggleTheme = () => {
    // Cycle through themes
    const currentIndex = availableThemes.findIndex(t => t.value === theme);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    setTheme(availableThemes[nextIndex].value);
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    availableThemes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}