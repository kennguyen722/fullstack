import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppConfig {
  appTitle: string;
  businessName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  updateAppTitle: (title: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfig] = useState<AppConfig>(() => {
    // Load from localStorage or use defaults
    const savedConfig = localStorage.getItem('salon-app-config');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (error) {
        console.error('Error parsing saved config:', error);
      }
    }
    
    // Default configuration
    return {
      appTitle: 'Bizzoll Salon Booking',
      businessName: 'Beauty Salon',
      address: '123 Main Street, City, State 12345',
      phone: '(555) 123-4567',
      email: 'contact@beautysalon.com',
      website: 'https://beautysalon.com'
    };
  });

  useEffect(() => {
    // Save to localStorage whenever config changes
    localStorage.setItem('salon-app-config', JSON.stringify(config));
    
    // Update document title
    document.title = config.appTitle;
  }, [config]);

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateAppTitle = (title: string) => {
    setConfig(prev => ({ ...prev, appTitle: title }));
  };

  const value = {
    config,
    updateConfig,
    updateAppTitle
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
