import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const I18N_SERVICE_API_KEY = process.env.I18N_SERVICE_API_KEY;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// JWT payload structure from admin.psilyou.com
// See: JWT structure documentation version 1.0 (2025-11-07)
export interface JWTPayload {
  id: number;           // User ID - MUST be number
  user_email: string;   // User's email address
  first_name: string;   // User's first name
  last_name: string;    // User's last name
  sub_type: number;     // Subscription type - MUST be 2 for admin access
  iat: number;          // Issued at timestamp
  exp: number;          // Expiration timestamp
}

function isValidAdminToken(payload: any): payload is JWTPayload {
  return (
    typeof payload === "object" &&
    typeof payload.id === "number" &&
    typeof payload.user_email === "string" &&
    typeof payload.first_name === "string" &&
    typeof payload.last_name === "string" &&
    typeof payload.sub_type === "number" &&
    payload.sub_type === 2 && // MUST be admin type
    typeof payload.iat === "number" &&
    typeof payload.exp === "number"
  );
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.substring(7);

  // Development mock token bypass (only in development mode)
  if (process.env.NODE_ENV === "development" && token === "dev-mock-token") {
    (req as any).user = {
      id: 1,
      user_email: "dev@psilyou.com",
      first_name: "Dev",
      last_name: "User",
      sub_type: 2,
    };
    return next();
  }

  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET!) as any;

    // Validate payload structure and admin access
    if (!isValidAdminToken(decoded)) {
      return res.status(403).json({
        error: "Invalid token: missing required claims or insufficient permissions",
      });
    }

    // Attach validated user to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Invalid token signature" });
    }
    return res.status(403).json({ error: "Token validation failed" });
  }
}

// Service-to-service API key authentication for other psilyou Repls
export function authenticateServiceApiKey(req: Request, res: Response, next: NextFunction) {
  if (!I18N_SERVICE_API_KEY) {
    return res.status(500).json({ error: "Service API key not configured" });
  }

  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "Missing x-api-key header" });
  }

  if (apiKey !== I18N_SERVICE_API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
}
