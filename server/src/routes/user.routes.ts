import { Router, Request, Response } from 'express';
import { User } from '../models';
import { authenticate, authorize, selfOrAdmin, requireRole } from '../middleware';
import { generateSalt, hashPassword } from '../services';

const router = Router();

/**
 * GET /api/users
 * List all users
 * Access: Admin only
 */
router.get(
    '/',
    authenticate,
    authorize('user', 'read'),
    requireRole('admin'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { role, search } = req.query;

            const filter: any = {};
            if (role) filter.role = role;
            if (search) {
                filter.$or = [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ];
            }

            const users = await User.find(filter)
                .select('-passwordHash -salt -privateKey')
                .sort({ createdAt: -1 });

            res.json({ users });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Failed to fetch users.' });
        }
    }
);

/**
 * GET /api/users/:id
 * Get single user profile
 * Access: Self or Admin
 */
router.get(
    '/:id',
    authenticate,
    selfOrAdmin('id'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await User.findById(req.params.id)
                .select('-passwordHash -salt -privateKey');

            if (!user) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }

            res.json({ user });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ error: 'Failed to fetch user.' });
        }
    }
);

/**
 * PUT /api/users/:id
 * Update user profile
 * Access: Self (limited) or Admin (full)
 */
router.put(
    '/:id',
    authenticate,
    selfOrAdmin('id'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }

            const { username, email, role, isActive, password } = req.body;

            // Users can update their own username/email
            if (username) user.username = username;
            if (email) user.email = email;

            // Only admin can update role and active status
            if (req.user!.role === 'admin') {
                if (role) user.role = role;
                if (isActive !== undefined) user.isActive = isActive;
            }

            // Password update
            if (password) {
                const salt = await generateSalt();
                user.salt = salt;
                user.passwordHash = await hashPassword(password, salt);
            }

            await user.save();

            res.json({
                message: 'User updated successfully.',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                },
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Failed to update user.' });
        }
    }
);

/**
 * DELETE /api/users/:id
 * Delete/deactivate user
 * Access: Admin only
 */
router.delete(
    '/:id',
    authenticate,
    authorize('user', 'delete'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }

            // Prevent deleting self
            if (user._id.toString() === req.user!.id) {
                res.status(400).json({ error: 'Cannot delete your own account.' });
                return;
            }

            // Soft delete - deactivate instead of removing
            user.isActive = false;
            await user.save();

            res.json({ message: 'User deactivated successfully.' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user.' });
        }
    }
);

/**
 * GET /api/users/public-key/:id
 * Get user's public key for encryption
 * Access: Any authenticated user
 */
router.get(
    '/public-key/:id',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await User.findById(req.params.id).select('username publicKey');
            if (!user) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }

            res.json({
                username: user.username,
                publicKey: user.publicKey,
            });
        } catch (error) {
            console.error('Get public key error:', error);
            res.status(500).json({ error: 'Failed to fetch public key.' });
        }
    }
);

export default router;
