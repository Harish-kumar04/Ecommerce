export class AuthManager {
  static setToken(token: string, refreshToken?: string | null) {
    localStorage.setItem("access_token", token);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
  }

  static getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }

  static clearToken() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    try {
      document.cookie = "access_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch {}
  }

  static isAuthenticated(): boolean {
    return !!(this.getToken() || this.getRefreshToken());
  }
}
