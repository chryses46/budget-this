// Client-side authentication utilities
export class AuthClient {
  private static readonly TOKEN_KEY = 'auth-token'

  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token)
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY)
    }
    return null
  }

  static removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY)
    }
  }

  static getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
    return {
      'Content-Type': 'application/json'
    }
  }

  static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = this.getAuthHeaders()
    
    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    })
  }
}
