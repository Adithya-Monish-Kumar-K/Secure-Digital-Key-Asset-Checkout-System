import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models';

/**
 * Authentication Middleware
 * Implements JWT-based session binding (NIST SP 800-63-2)
 */

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                email: string;
                role: UserRole;
            };
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (user: IUser): string => {
    return jwt.sign(
        {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
};

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Access denied. No token provided.' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            username: string;
            email: string;
            role: UserRole;
        };

        // Verify user still exists and is active
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            res.status(401).json({ error: 'Invalid token. User not found or inactive.' });
            return;
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired. Please login again.' });
        } else {
            res.status(401).json({ error: 'Invalid token.' });
        }
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET) as {
                id: string;
                username: string;
                email: string;
                role: UserRole;
            };
            req.user = decoded;
        }
        next();
    } catch {
        next();
    }
};
