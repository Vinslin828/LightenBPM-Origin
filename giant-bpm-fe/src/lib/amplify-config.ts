import { Amplify } from "aws-amplify";

const baseUrl = import.meta.env.VITE_BASE_URL || "";

// --- Configuration ---
// Values are loaded from the .env file based on the environment
const AUTH_CONFIG = {
  USER_POOL_ID: import.meta.env.VITE_AWS_USER_POOL_ID || "",
  USER_POOL_CLIENT_ID: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID || "",
  OAUTH_DOMAIN: import.meta.env.VITE_AWS_OAUTH_DOMAIN || "",
  REDIRECT_CALLBACK_URL: `${baseUrl}/login/redirect`,
  REDIRECT_LOGOUT_URL: `${baseUrl}/logout/redirect`,
};

/**
 * Configures the Amplify library with the GAC Cognito settings.
 */
export function configureAmplify() {
  // A simple check to ensure that the environment variables are loaded.
  if (!AUTH_CONFIG.USER_POOL_ID || !AUTH_CONFIG.USER_POOL_CLIENT_ID) {
    console.error(
      "Auth environment variables are not set. Please check your .env file.",
    );
  }

  // Log the URLs for debugging
  console.log("Redirect Sign In URL:", AUTH_CONFIG.REDIRECT_CALLBACK_URL);
  console.log("Redirect Sign Out URL:", AUTH_CONFIG.REDIRECT_LOGOUT_URL);

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: AUTH_CONFIG.USER_POOL_ID,
        userPoolClientId: AUTH_CONFIG.USER_POOL_CLIENT_ID,
        loginWith: {
          oauth: {
            domain: AUTH_CONFIG.OAUTH_DOMAIN,
            scopes: [],
            redirectSignIn: [AUTH_CONFIG.REDIRECT_CALLBACK_URL],
            redirectSignOut: [AUTH_CONFIG.REDIRECT_LOGOUT_URL],
            responseType: "code",
          },
        },
      },
    },
  });
}
