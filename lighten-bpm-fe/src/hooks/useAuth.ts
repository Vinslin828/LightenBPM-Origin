import { useCallback, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useService } from "./useService";
import { TYPES } from "../types/symbols";
import type { IAuthService, IDomainService } from "../interfaces/services";
import type { User as CognitoUser } from "@/schemas/auth";
import { authEvents } from "@/utils/auth-events";
import { useSetAtom } from "jotai";
import { userAtom } from "@/store/atoms";

const authQueryKey = ["auth", "user"];
const meQueryKey = ["auth", "me"];

export function useAuth() {
  const authService = useService<IAuthService>(TYPES.AuthService);
  const domainService = useService<IDomainService>(TYPES.DomainService);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setUserAtom = useSetAtom(userAtom);

  // Fetch the user data and keep it in react-query's cache
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: authQueryKey,
    queryFn: () => authService.getCurrentUser(),
    staleTime: Infinity, // User data is stable until logout
  });

  const { data: meData, isLoading: isMeLoading } = useQuery({
    queryKey: meQueryKey,
    queryFn: () => domainService.getMe(),
    enabled: !!userData,
    staleTime: Infinity,
  });

  const user = userData?.attributes as CognitoUser | undefined;

  useEffect(() => {
    if (userData?.session?.tokens?.idToken) {
      const token = userData.session.tokens.idToken.toString();
      localStorage.setItem("authToken", token);
    }
  }, [userData]);

  useEffect(() => {
    if (meData?.data && userData) {
      setUserAtom(meData.data);
    } else if (!userData) {
      setUserAtom(null);
    }
  }, [meData?.data, userData, setUserAtom]);

  const logoutMutation = useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      localStorage.removeItem("authToken");
      queryClient.invalidateQueries({ queryKey: authQueryKey });
      queryClient.invalidateQueries({ queryKey: meQueryKey });
      setUserAtom(null);
    },
  });

  const login = useCallback(() => {
    // This is now a simple redirect, not a mutation
    authService.signInWithRedirect();
  }, [authService]);

  const logout = useCallback(() => {
    return logoutMutation.mutateAsync().finally(() => {
      authEvents.resetUnauthorizedState();
    });
  }, [logoutMutation]);

  const handleAuthCallback = useCallback(async () => {
    try {
      await authService.handleAuthCallback();
      // After handling callback, refetch user data
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      navigate("/dashboard"); // Redirect to dashboard after successful login
    } catch (error) {
      console.error("Authentication callback failed:", error);
      navigate("/login"); // Redirect to login on failure
    }
  }, [authService, queryClient, navigate]);

  useEffect(() => {
    const unsubscribe = authEvents.onUnauthorized(async () => {
      try {
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          localStorage.setItem("authToken", refreshed);
          await queryClient.invalidateQueries({ queryKey: authQueryKey });
          await queryClient.invalidateQueries({ queryKey: meQueryKey });
          return true;
        }
        if (!logoutMutation.isPending) {
          await logoutMutation.mutateAsync();
        }
        navigate("/login");
      } catch (error) {
        console.error("Automatic logout failed:", error);
        navigate("/login");
      } finally {
        authEvents.resetUnauthorizedState();
      }
      return false;
    });

    return () => {
      unsubscribe();
    };
  }, [authService, logoutMutation, navigate, queryClient]);

  const isAuthenticated = !!userData;

  return {
    user,
    isAuthenticated,
    isLoading: isUserLoading || isMeLoading || logoutMutation.isPending,
    login,
    logout,
    handleAuthCallback,
  };
}
