// Authentication service for wine-admin-dashboard
export interface AdminUser {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  status: number;
}

export interface LoginResponse {
  code: number;
  message: string;
  data: {
    token: string;
    user: AdminUser;
  };
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

class AuthService {
  private baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  private tokenKey = 'auth_token';
  private userKey = 'admin_user';
  // 使用 localStorage：同一域名下多标签页共享登录状态
  private storage = typeof window !== 'undefined' ? window.localStorage : null;

  // Login method
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseURL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.code === 200) {
        this.setToken(data.data.token);
        this.setUser(data.data.user);
      }

      return data;
    } catch (error) {
      throw new Error('Login failed. Please check your network connection.');
    }
  }

  // Logout method
  logout(): void {
    this.storage?.removeItem(this.tokenKey);
    this.storage?.removeItem(this.userKey);
  }

  // Get current token
  getToken(): string | null {
    return this.storage?.getItem(this.tokenKey) ?? null;
  }

  // Set token
  setToken(token: string): void {
    this.storage?.setItem(this.tokenKey, token);
  }

  // Get current user
  getUser(): AdminUser | null {
    const userStr = this.storage?.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Set user
  setUser(user: AdminUser): void {
    this.storage?.setItem(this.userKey, JSON.stringify(user));
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Get user info (for profile)
  async getUserInfo(): Promise<ApiResponse<AdminUser>> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${this.baseURL}/admin/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch user information');
    }
  }

  // Update user profile
  async updateProfile(userData: Partial<AdminUser>): Promise<ApiResponse> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${this.baseURL}/admin/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      return await response.json();
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  }
}

export const authService = new AuthService();