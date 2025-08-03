// Security provider component for enhanced security context
import React, { createContext, useContext, useEffect } from 'react';
import { useSecureSession } from '@/hooks/useSecureSession';

interface SecurityContextType {
  validateSession: () => boolean;
  secureSignOut: () => Promise<void>;
  getCsrfToken: () => string | null;
  refreshSession: () => void;
  isSessionValid: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const secureSession = useSecureSession();

  // Security hardening on mount
  useEffect(() => {
    // Disable right-click context menu in production for security
    if (process.env.NODE_ENV === 'production') {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      
      const handleSelectStart = (e: Event) => {
        e.preventDefault();
      };

      const handleDragStart = (e: DragEvent) => {
        e.preventDefault();
      };

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('selectstart', handleSelectStart);
      document.addEventListener('dragstart', handleDragStart);

      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('selectstart', handleSelectStart);
        document.removeEventListener('dragstart', handleDragStart);
      };
    }
  }, []);

  // Console warning for security
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.clear();
      console.log(
        '%cStop!',
        'color: red; font-size: 50px; font-weight: bold;'
      );
      console.log(
        '%cThis is a browser feature intended for developers. Do not paste or enter any code here as it could compromise your account security.',
        'color: red; font-size: 16px;'
      );
    }
  }, []);

  return (
    <SecurityContext.Provider value={secureSession}>
      {children}
    </SecurityContext.Provider>
  );
};