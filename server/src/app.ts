import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { authRoutes, assetRoutes, checkoutRoutes, userRoutes } from './routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - prevents brute force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 10, // 10 attempts per 1 minute
    message: { error: 'Too many authentication attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        security: {
            encryption: 'AES-256-CBC + RSA-2048',
            hashing: 'bcrypt with salt',
            authentication: 'JWT + OTP MFA',
            authorization: 'RBAC with Access Control Matrix',
        },
    });
});

// Security info endpoint (for demonstration)
app.get('/api/security-info', (req, res) => {
    res.json({
        title: 'Secure Digital Key & Asset Checkout System',
        securityFeatures: {
            authentication: {
                model: 'NIST SP 800-63-2',
                singleFactor: 'Password with bcrypt hashing',
                multiFactor: 'Email-based OTP',
                session: 'JWT tokens',
            },
            authorization: {
                model: 'Access Control Matrix (RBAC)',
                roles: ['Borrower', 'Issuer', 'Admin'],
                enforcement: 'Middleware-based policy enforcement',
            },
            encryption: {
                dataEncryption: 'AES-256-CBC',
                keyExchange: 'RSA-2048 OAEP',
                approach: 'Hybrid cryptography',
            },
            hashing: {
                algorithm: 'bcrypt',
                saltRounds: 12,
                purpose: 'Password storage',
            },
            digitalSignatures: {
                algorithm: 'RSA-SHA256',
                purpose: 'Checkout record integrity & non-repudiation',
            },
            encoding: {
                type: 'Base64',
                purpose: 'Safe storage of encrypted data',
            },
        },
        attackCountermeasures: {
            bruteForce: 'Rate limiting + bcrypt + MFA',
            replay: 'OTP expiry + JWT expiry',
            privilegeEscalation: 'RBAC middleware',
            manInTheMiddle: 'Encryption + Digital signatures',
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// Start server
const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║     Secure Digital Key & Asset Checkout System             ║
║     Server running on http://localhost:${PORT}                ║
╠════════════════════════════════════════════════════════════╣
║  Security Features:                                        ║
║  ✓ Authentication: Password + OTP (NIST SP 800-63-2)       ║
║  ✓ Authorization: RBAC with Access Control Matrix          ║
║  ✓ Encryption: AES-256-CBC + RSA-2048 (Hybrid)             ║
║  ✓ Hashing: bcrypt with unique salt per user               ║
║  ✓ Digital Signatures: RSA-SHA256                          ║
║  ✓ Encoding: Base64 for encrypted data storage             ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
