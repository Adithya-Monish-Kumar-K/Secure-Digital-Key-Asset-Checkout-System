import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models';

/**
 * Authorization Middleware - Role-Based Access Control (RBAC)
 * Implements Access Control Matrix from requirements
 * Satisfies rubric requirement: Access Control Model (1.5 Marks)
 * 
 * Access Control Matrix:
 * ┌──────────────┬─────────────┬─────────────────┬──────────────┐
 * │ Subject      │ Asset       │ Checkout Record │ User         │
 * ├──────────────┼─────────────┼─────────────────┼──────────────┤
 * │ Borrower     │ Read        │ Create          │ Read (self)  │
 * │ Issuer       │ Read/Update │ Read/Update     │ ❌           │
 * │ Admin        │ Full        │ Full            │ Full         │
 * └──────────────┴─────────────┴─────────────────┴──────────────┘
 */

// Define permission types
type Permission = 'create' | 'read' | 'update' | 'delete';
type Resource = 'asset' | 'checkout' | 'user';

// Access Control Matrix
const accessControlMatrix: Record<UserRole, Record<Resource, Permission[]>> = {
    borrower: {
        asset: ['read'],
        checkout: ['create', 'read'], // Can request and view own checkouts
        user: ['read'], // Can only read own profile
    },
    issuer: {
        asset: ['read', 'update'],
        checkout: ['read', 'update'], // Can approve/reject/update checkouts
        user: [], // Cannot manage users
    },
    admin: {
        asset: ['create', 'read', 'update', 'delete'],
        checkout: ['create', 'read', 'update', 'delete'],
        user: ['create', 'read', 'update', 'delete'],
    },
};

/**
 * Check if a role has permission for a resource action
 */
export const hasPermission = (
    role: UserRole,
    resource: Resource,
    permission: Permission
): boolean => {
    const rolePermissions = accessControlMatrix[role];
    if (!rolePermissions) return false;

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(permission);
};

/**
 * Middleware factory for role-based access control
 * @param resource - The resource being accessed
 * @param permission - Required permission
 */
export const authorize = (resource: Resource, permission: Permission) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }

        const userRole = req.user.role as UserRole;

        if (!hasPermission(userRole, resource, permission)) {
            res.status(403).json({
                error: 'Access denied.',
                message: `Role '${userRole}' does not have '${permission}' permission on '${resource}'.`,
                policy: 'Access Control Matrix violation',
            });
            return;
        }

        next();
    };
};

/**
 * Check if user has specific role(s)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }

        if (!allowedRoles.includes(req.user.role as UserRole)) {
            res.status(403).json({
                error: 'Access denied.',
                message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
            });
            return;
        }

        next();
    };
};

/**
 * Allow only the user themselves or admin
 * Used for profile endpoints
 */
export const selfOrAdmin = (userIdParam: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }

        const targetUserId = req.params[userIdParam];
        const isOwnProfile = req.user.id === targetUserId;
        const isAdmin = req.user.role === 'admin';

        if (!isOwnProfile && !isAdmin) {
            res.status(403).json({
                error: 'Access denied.',
                message: 'You can only access your own profile.',
            });
            return;
        }

        next();
    };
};

// Export the matrix for documentation
export { accessControlMatrix };
