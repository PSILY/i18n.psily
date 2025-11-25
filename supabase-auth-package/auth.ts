import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be set. This secret must match across all psilyou.com Repls for SSO to work."
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthenticatedUser {
  id: number;
  user_email: string;
  first_name: string;
  last_name: string;
  sub_type: number;
}

// Generate JWT token
export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      user_email: user.user_email,
      first_name: user.first_name,
      last_name: user.last_name,
      sub_type: user.sub_type,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (error) {
    return null;
  }
}
