import { NextRequest } from 'next/server';
import { db, type User } from './database';
import { decodeSession as decodeLegacySession } from './session';
import { readUsers } from './auth';

// JWT token utilities
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Security middleware
export class SecurityManager {
  private static instance: SecurityManager;
  
  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // Generate JWT token
  async generateToken(user: User): Promise<string> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    // In production, use a proper JWT library like 'jsonwebtoken'
    // For now, we'll use a simple base64 encoding
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    return token;
  }

  // Verify JWT token
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if token is expired
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return payload;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  // Extract token from request
  extractToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check cookies
    const token = request.cookies.get('auth-token')?.value;
    return token || null;
  }

  // Get current user from request
  async getCurrentUser(request: NextRequest): Promise<User | null> {
    // 1) Bearer/Auth-Token/JWT flow
    const token = this.extractToken(request);
    if (token) {
      const payload = await this.verifyToken(token);
      if (payload?.userId) {
        const user = await db.getUserById(payload.userId);
        if (user) return user;
      }
    }

    // 2) Legacy cookie session flow (app currently sets 'session' cookie)
    const legacy = decodeLegacySession(request.cookies.get('session')?.value);
    if (legacy?.email && legacy?.role) {
      // Try to find a matching user record by email; if not found, synthesize minimal user
      try {
        const users = await readUsers();
        const found = users.find(u => u.email === legacy.email);
        const synthesized: User = {
          id: legacy.email, // use email as stable id in legacy mode
          email: legacy.email,
          name: found ? legacy.email.split('@')[0] : legacy.email.split('@')[0],
          role: legacy.role as User['role'],
          createdAt: new Date().toISOString(),
          isPremium: found?.isPremium || false,
          premiumExpiresAt: found?.premiumExpiresAt,
        };
        return synthesized;
      } catch {
        const synthesized: User = {
          id: legacy.email,
          email: legacy.email,
          name: legacy.email.split('@')[0],
          role: legacy.role as User['role'],
          createdAt: new Date().toISOString(),
          isPremium: false,
          premiumExpiresAt: undefined,
        };
        return synthesized;
      }
    }

    return null;
  }

  // Check if user has required role
  hasRole(user: User | null, requiredRole: string | string[]): boolean {
    if (!user) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
  }

  // Check if user can access resource
  canAccessResource(user: User | null, resourceOwnerId: string): boolean {
    if (!user) return false;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // Users can access their own resources
    return user.id === resourceOwnerId;
  }

  // Rate limiting
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  async checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): Promise<boolean> {
    const now = Date.now();
    const key = identifier;
    const current = this.rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= limit) {
      return false;
    }

    current.count++;
    return true;
  }

  // Input validation
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // Sanitize input
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim();
  }

  // CSRF protection
  generateCSRFToken(): string {
    return crypto.randomUUID();
  }

  verifyCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken;
  }

  // Audit logging
  async logSecurityEvent(event: string, userId: string, details: Record<string, unknown>): Promise<void> {
    const logEntry = {
      event,
      userId,
      details,
      timestamp: new Date().toISOString(),
      ip: 'unknown', // Would be extracted from request in production
    };

    console.log('Security Event:', logEntry);
    
    // In production, this would be sent to a logging service
    // For now, we'll just log to console
  }
}

// Export singleton instance
export const security = SecurityManager.getInstance();

// Middleware helper
export async function withAuth(
  request: NextRequest,
  requiredRole?: string | string[]
): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
  const user = await security.getCurrentUser(request);
  
  if (!user) {
    return { error: new Response('Unauthorized', { status: 401 }) };
  }

  if (requiredRole && !security.hasRole(user, requiredRole)) {
    return { error: new Response('Forbidden', { status: 403 }) };
  }

  return { user };
}

// Rate limiting middleware
export async function withRateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: boolean; error?: never } | { allowed?: never; error: Response }> {
  // Get IP from headers or use unknown as fallback
  const forwarded = request.headers.get('x-forwarded-for');
  const identifier = forwarded ? forwarded.split(',')[0].trim() : 
    request.headers.get('x-real-ip') || 'unknown';
  const allowed = await security.checkRateLimit(identifier, limit, windowMs);
  
  if (!allowed) {
    return { error: new Response('Too Many Requests', { status: 429 }) };
  }

  return { allowed: true };
}
