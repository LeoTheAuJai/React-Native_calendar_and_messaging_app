import { createContext, PropsWithChildren, useContext } from 'react';
import { useStorageState } from './useStorage';

const AuthContext = createContext<{
  signIn: (token: string) => void;
  signOut: () => void;
  session?: string | null;
  isLoading: boolean;
}>({
  signIn: () => null,
  signOut: () => null,
  session: null,
  isLoading: false,
});

// This hook can be used to access the user info.
export function useSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('session');

  return (
    <AuthContext.Provider
      value={{
        signIn: (token: string) => {
          setSession(token); // Store the token
        },
        signOut: () => {
          setSession(null); // Clear the token
        },
        session,
        isLoading,
      }}>
      {children}
    </AuthContext.Provider>
  );
}