import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken, getMockToken } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(): Record<string, string> {
  // Try to get real token from localStorage first
  let token = getAuthToken();
  
  // In development mode only, fall back to mock token if no real token exists
  if (!token && import.meta.env.DEV) {
    token = getMockToken();
  }
  
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL with query parameters if the last item in queryKey is an object
    let url: string;
    const lastItem = queryKey[queryKey.length - 1];
    
    if (typeof lastItem === "object" && lastItem !== null && !Array.isArray(lastItem)) {
      // Last item is query params object
      const baseUrl = queryKey.slice(0, -1).join("/");
      const params = new URLSearchParams();
      
      // Add non-empty query parameters
      Object.entries(lastItem as Record<string, any>).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
      
      const queryString = params.toString();
      url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } else {
      // No query params, just join the path
      url = queryKey.join("/") as string;
    }

    const res = await fetch(url, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
