import { injectable } from "inversify";
import * as Auth from "aws-amplify/auth";
import { IAuthService } from "../interfaces/services";

@injectable()
export class AuthService implements IAuthService {
  async signInWithRedirect(): Promise<void> {
    try {
      return Auth.signInWithRedirect();
    } catch (error: any) {
      // Handle the case where user is already authenticated but tokens are invalid
      if (error?.name === "UserAlreadyAuthenticatedException") {
        try {
          // Clear the invalid authentication state first
          await Auth.signOut({ global: true });
          // Then try to sign in again
          return Auth.signInWithRedirect();
        } catch (signOutError) {
          console.warn(
            "Failed to clear authentication state before redirect:",
            signOutError,
          );
          throw error;
        }
      }
      throw error;
    }
  }

  async signOut(): Promise<void> {
    return Auth.signOut({ global: true });
  }

  async getCurrentUser(): Promise<{
    user: any;
    attributes: any;
    session: any;
  } | null> {
    try {
      const user = await Auth.getCurrentUser();
      const attributes = await Auth.fetchUserAttributes();
      const session = await Auth.fetchAuthSession();
      return { user, attributes, session };
    } catch (error: any) {
      console.log("Not signed in", error);

      // Handle revoked tokens and authentication state inconsistency
      if (
        error?.name === "NotAuthorizedException" ||
        error?.message?.includes("Access Token has been revoked") ||
        error?.message?.includes("revoked")
      ) {
        try {
          // Clear local authentication state
          await Auth.signOut({ global: true });
          console.log("Cleared authentication state due to revoked token");
        } catch (signOutError) {
          console.warn("Failed to clear authentication state:", signOutError);
        }
      }

      return null;
    }
  }

  async fetchAuthSession(): Promise<any | null> {
    try {
      const result = await Auth.fetchAuthSession();
      return result ?? null;
    } catch (error) {
      console.log("Not signed in", error);
      return null;
    }
  }

  async handleAuthCallback(): Promise<void> {
    // Amplify handles the redirect and token processing automatically.
    // This function can be used to capture user attributes after login.
    try {
      await this.getCurrentUser();
    } catch (error) {
      console.error("Error handling auth callback:", error);
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const session = await Auth.fetchAuthSession();
      const idToken = session?.tokens?.idToken?.toString();
      if (idToken) {
        localStorage.setItem("authToken", idToken);
        return idToken;
      }
      return null;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return null;
    }
  }
}
