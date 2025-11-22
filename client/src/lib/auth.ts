// JWT token management for admin authentication via handoff codes
// This app receives handoff codes from psilyou.com and redeems them for JWT tokens
// Architecture: Client-only SSO integration with psilyou.com
// See: Handoff SSO Integration documentation

const TOKEN_KEY = "admin_jwt_token";
const PSILYOU_BASE_URL = import.meta.env.PROD ? "https://psilyou.com" : "http://localhost:5000";
const HANDOFF_REDEEM_URL = `${PSILYOU_BASE_URL}/api/auth/redeem-handoff`;

export interface DecodedToken {
  id: number;
  user_email: string;
  first_name: string;
  last_name: string;
  sub_type: number;
  iat: number;
  exp: number;
}

// Extract handoff code from URL query parameter (?handoff=)
export function extractHandoffFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const handoffCode = urlParams.get("handoff");
  
  if (handoffCode) {
    // Clean up URL (remove handoff parameter immediately)
    const url = new URL(window.location.href);
    url.searchParams.delete("handoff");
    window.history.replaceState({}, "", url.toString());
    
    return handoffCode;
  }
  
  return null;
}

// Redeem handoff code for JWT token
export async function redeemHandoffCode(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${HANDOFF_REDEEM_URL}/${code}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to redeem handoff code" };
    }

    const data = await response.json();
    
    if (data.token) {
      // Store JWT token in localStorage
      setAuthToken(data.token);
      return { success: true };
    }

    return { success: false, error: "No token received from server" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error during handoff redemption" };
  }
}

// Decode JWT payload (client-side only - doesn't verify signature)
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    // Convert base64url to standard base64
    // JWT uses base64url encoding: replace '-' with '+' and '_' with '/'
    // Then add padding if needed
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) {
        throw new Error('Invalid base64url string');
      }
      base64 += new Array(5 - pad).join('=');
    }
    
    const payload = JSON.parse(atob(base64));
    return payload as DecodedToken;
  } catch {
    return null;
  }
}

// Check if token is expired
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

// Get current user info from token
export function getCurrentUser(): DecodedToken | null {
  const token = getAuthToken();
  if (!token) return null;
  
  return decodeToken(token);
}

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
  const token = getAuthToken();
  if (!token) return false;
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    clearAuthToken();
    return false;
  }
  
  return true;
}

// Redirect to psilyou.com for authentication (which will redirect back with handoff code)
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  
  // Build return URL (where psilyou.com should redirect after login)
  const returnUrl = encodeURIComponent(window.location.origin);
  
  // Redirect to psilyou.com with return URL
  // psilyou.com will handle login and redirect back with ?handoff=CODE
  window.location.href = `${PSILYOU_BASE_URL}/auth/login?returnUrl=${returnUrl}`;
}

// For development only: generate a mock JWT
export function getMockToken(): string {
  // Only use in development mode
  if (import.meta.env.DEV) {
    return "dev-mock-token";
  }
  return "";
}
