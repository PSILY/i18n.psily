// JWT token management for admin authentication
// In production, this would come from admin.psilyou.com
// For development/testing, we'll use a mock token or allow bypassing auth

const TOKEN_KEY = "admin_jwt_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// For development: generate a mock JWT if needed
// In production, this would be provided by admin.psilyou.com
export function getMockToken(): string {
  // This is a development-only mock token
  // In production, the user would login through admin.psilyou.com
  return "dev-mock-token";
}
