import React from 'react';
import { useTheme } from './ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return 'bi-sun-fill';
      case 'light-purple':
        return 'bi-palette-fill';
      case 'purple-dark':
        return 'bi-stars';
      case 'dark':
        return 'bi-moon-stars-fill';
      default:
        return 'bi-sun-fill';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${sizeClasses[size]} ${className}`}
      title={`Current theme: ${theme}. Click to switch`}
      aria-label={`Current theme: ${theme}. Click to switch`}
    >
      <i className={getIcon()}></i>
    </button>
  );
}

interface ThemeSelectProps {
  className?: string;
  showAsCards?: boolean;
}

export function ThemeSelect({ className = '', showAsCards = false }: ThemeSelectProps) {
  const { theme, setTheme, availableThemes } = useTheme();

  if (showAsCards) {
    return (
      <div className={`theme-selection-cards ${className}`}>
        <div className="row g-3">
          {availableThemes.map((themeOption) => (
            <div key={themeOption.value} className="col-md-4">
              <div 
                className={`card theme-card h-100 ${theme === themeOption.value ? 'selected' : ''}`}
                onClick={() => setTheme(themeOption.value)}
              >
                <div className="card-body text-center">
                  <div className="theme-preview mb-3">
                    <i className={`${themeOption.icon} fs-1`}></i>
                  </div>
                  <h6 className="card-title">{themeOption.label}</h6>
                  <p className="card-text small text-muted">{themeOption.description}</p>
                  {theme === themeOption.value && (
                    <div className="mt-2">
                      <span className="badge bg-primary">
                        <i className="bi bi-check-circle me-1"></i>
                        Active
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`dropdown ${className}`}>
      <button
        className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <i className={`${availableThemes.find(t => t.value === theme)?.icon} me-2`}></i>
        {availableThemes.find(t => t.value === theme)?.label} Theme
      </button>
      <ul className="dropdown-menu">
        {availableThemes.map((themeOption) => (
          <li key={themeOption.value}>
            <button
              className={`dropdown-item d-flex align-items-center ${theme === themeOption.value ? 'active' : ''}`}
              onClick={() => setTheme(themeOption.value)}
            >
              <i className={`${themeOption.icon} me-2`}></i>
              {themeOption.label} Theme
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}