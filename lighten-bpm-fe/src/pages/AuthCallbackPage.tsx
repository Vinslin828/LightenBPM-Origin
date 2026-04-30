import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export const AuthCallbackPage = () => {
  const { handleAuthCallback } = useAuth();

  useEffect(() => {
    // This function will handle the token exchange and redirect the user
    handleAuthCallback();
  }, [handleAuthCallback]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div>Loading...</div>
    </div>
  );
};
