export const ADMIN_TOKEN_KEY = "admin_access_token";
export const ADMIN_REFRESH_KEY = "admin_refresh_token";

export class AuthManager {
  static setToken(token: string, refreshToken?: string | null) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(ADMIN_REFRESH_KEY, refreshToken);
    }
  }

  static getToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(ADMIN_REFRESH_KEY);
  }

  static clearToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_KEY);
    try {
      document.cookie = `${ADMIN_TOKEN_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch {}
  }

  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload?.role === "customer" || (payload?.token_type && payload.token_type !== "access")) {
            return false;
          }
        }
      } catch {}
      return true;
    }
    return !!this.getRefreshToken();
  }
}
