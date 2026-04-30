import { injectable, inject } from "inversify";
import { v4 as uuidv4 } from "uuid";
import type { IAuthService, IStorageService } from "@/interfaces/services";
import type { User, AuthResponse } from "@/schemas/auth";
import { TYPES } from "@/types/symbols";

@injectable()
export class MockAuthService implements IAuthService {
  private readonly TOKEN_KEY = "auth-token";
  private readonly USER_KEY = "auth-user";

  private readonly MOCK_USERS = [
    {
      id: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin" as const,
    },
    {
      id: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      role: "user" as const,
    },
  ];

  constructor(
    @inject(TYPES.StorageService) private storageService: IStorageService,
  ) {}

  async signInWithRedirect(): Promise<void> {
    // In mock mode, we simulate a successful login immediately.
    console.log("MockAuth: Simulating GAC redirect and callback.");
    const mockUser = this.MOCK_USERS[0]; // Default to admin user for mock
    const user: User = {
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role,
    };
    const token = this.generateMockToken(user);
    this.storageService.set(this.TOKEN_KEY, token);
    this.storageService.set(this.USER_KEY, user);

    // Simulate the redirect back to the app's callback URL
    window.location.href = "/login/redirect";
  }

  async handleAuthCallback(): Promise<void> {
    // In mock mode, the user is already set by signInWithRedirect, so this is a no-op.
    console.log("MockAuth: Handling auth callback.");
    return Promise.resolve();
  }

  async signOut(): Promise<void> {
    console.log("MockAuth: Signing out.");
    this.storageService.remove(this.TOKEN_KEY);
    this.storageService.remove(this.USER_KEY);
  }

  async getCurrentUser(): Promise<{
    user: any;
    attributes: any;
    session: any;
  } | null> {
    const user = this.storageService.get<User>(this.USER_KEY);
    if (!user) return null;

    // Construct a mock object that resembles the Amplify one
    return {
      user: {
        username: user.id,
        attributes: user,
      },
      attributes: user,
      session: {
        tokens: {
          idToken: {
            toString: () => this.storageService.get<string>(this.TOKEN_KEY),
          },
        },
      },
    };
  }

  async fetchAuthSession(): Promise<any | null> {
    const token = this.storageService.get<string>(this.TOKEN_KEY);
    if (!token) return null;
    return { tokens: { idToken: { toString: () => token } } };
  }

  async refreshToken(): Promise<string | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;
    const newToken = this.generateMockToken(user.attributes as User);
    this.storageService.set(this.TOKEN_KEY, newToken);
    return newToken;
  }

  private generateMockToken(user: User): string {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        code: user.id,
        Job_Grade: 5,
        BPM_Role: "admin",
        "custom:role": user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      }),
    );
    return `${header}.${payload}.mock_signature`;
  }
}
