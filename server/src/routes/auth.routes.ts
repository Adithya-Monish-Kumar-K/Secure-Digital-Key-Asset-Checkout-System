import { Router, Request, Response } from 'express';
import { User } from '../models';
import { generateToken, authenticate } from '../middleware';
import {
    generateSalt,
    hashPassword,
    verifyPassword,
    generateRSAKeyPair,
    initiateOTP,
    verifyOTP,
} from '../services';

const router = Router();

// Pending login sessions (waiting for OTP)
interface PendingSession {
    userId: string;
    username: string;
    email: string;
    role: string;
    expiresAt: Date;
}
const pendingSessions = new Map<string, PendingSession>();

/**
 * POST /api/auth/register
 * Register a new user
 * Implements: Identity Proofing, Secure Credential Storage
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, role = 'borrower' } = req.body;

        // Validation
        if (!username || !email || !password) {
            res.status(400).json({ error: 'Username, email, and password are required.' });
            return;
        }

        if (password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters.' });
            return;
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(409).json({ error: 'Username or email already exists.' });
            return;
        }

        // Generate salt and hash password
        const salt = await generateSalt();
        const passwordHash = await hashPassword(password, salt);

        // Generate RSA key pair for digital signatures
        const { publicKey, privateKey } = generateRSAKeyPair();

        // Create user
        const user = new User({
            username,
            email,
            passwordHash,
            salt,
            role: ['borrower', 'issuer', 'admin'].includes(role) ? role : 'borrower',
            publicKey,
            privateKey,
        });

        await user.save();

        res.status(201).json({
            message: 'Registration successful.',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

/**
 * POST /api/auth/login
 * Single-factor authentication (Step 1)
 * Returns pending session, requires OTP verification
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }

        if (!user.isActive) {
            res.status(401).json({ error: 'Account is deactivated.' });
            return;
        }

        // Verify password (Single-Factor Authentication)
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }

        // Generate session ID for pending MFA
        const sessionId = require('crypto').randomBytes(32).toString('hex');

        // Store pending session
        pendingSessions.set(sessionId, {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        // Initiate OTP (Multi-Factor Authentication)
        const otpResult = await initiateOTP(user._id.toString(), user.email, user.username);

        res.json({
            message: 'Password verified. OTP sent to your email.',
            sessionId,
            requiresOTP: true,
            ...otpResult,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed.' });
    }
});

/**
 * POST /api/auth/verify-otp
 * Multi-factor authentication (Step 2)
 * Verifies OTP and issues JWT token
 */
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, otp } = req.body;

        if (!sessionId || !otp) {
            res.status(400).json({ error: 'Session ID and OTP are required.' });
            return;
        }

        // Get pending session
        const session = pendingSessions.get(sessionId);
        if (!session) {
            res.status(401).json({ error: 'Invalid or expired session.' });
            return;
        }

        // Check session expiry
        if (new Date() > session.expiresAt) {
            pendingSessions.delete(sessionId);
            res.status(401).json({ error: 'Session expired. Please login again.' });
            return;
        }

        // Verify OTP
        const otpResult = verifyOTP(session.userId, otp);
        if (!otpResult.success) {
            res.status(401).json({ error: otpResult.message });
            return;
        }

        // Clear pending session
        pendingSessions.delete(sessionId);

        // Get user for token generation
        const user = await User.findById(session.userId);
        if (!user) {
            res.status(401).json({ error: 'User not found.' });
            return;
        }

        // Generate JWT (Session Binding)
        const token = generateToken(user);

        res.json({
            message: 'Login successful.',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'OTP verification failed.' });
    }
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP for pending session
 */
router.post('/resend-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.body;

        const session = pendingSessions.get(sessionId);
        if (!session) {
            res.status(401).json({ error: 'Invalid or expired session.' });
            return;
        }

        const user = await User.findById(session.userId);
        if (!user) {
            res.status(401).json({ error: 'User not found.' });
            return;
        }

        const otpResult = await initiateOTP(session.userId, session.email, session.username);

        res.json({
            message: 'OTP resent.',
            ...otpResult,
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Failed to resend OTP.' });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user!.id).select('-passwordHash -salt -privateKey');
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }

        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile.' });
    }
});

// Cleanup expired sessions periodically
setInterval(() => {
    const now = new Date();
    for (const [sessionId, session] of pendingSessions.entries()) {
        if (now > session.expiresAt) {
            pendingSessions.delete(sessionId);
        }
    }
}, 5 * 60 * 1000);

export default router;
