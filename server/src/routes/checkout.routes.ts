import { Router, Request, Response } from 'express';
import { CheckoutRecord, Asset, User } from '../models';
import { authenticate, authorize, requireRole } from '../middleware';
import {
    encryptData,
    decryptData,
    createDigitalSignature,
    verifyDigitalSignature,
} from '../services';

const router = Router();

/**
 * GET /api/checkout
 * List checkout records
 * Borrower sees own records, Issuer/Admin see all
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const filter: any = {};

        // Borrowers can only see their own records
        if (req.user!.role === 'borrower') {
            filter.issuedTo = req.user!.id;
        }

        const { status, assetId } = req.query;
        if (status) filter.status = status;

        const records = await CheckoutRecord.find(filter)
            .populate('asset', 'assetId assetName')
            .populate('issuedTo', 'username email')
            .populate('issuedBy', 'username email')
            .populate('signedBy', 'username')
            .sort({ requestDate: -1 });

        res.json({ records });
    } catch (error) {
        console.error('Get checkout records error:', error);
        res.status(500).json({ error: 'Failed to fetch checkout records.' });
    }
});

/**
 * GET /api/checkout/:id
 * Get single checkout record with decrypted data
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const record = await CheckoutRecord.findById(req.params.id)
            .populate('asset', 'assetId assetName category')
            .populate('issuedTo', 'username email')
            .populate('issuedBy', 'username email publicKey')
            .populate('signedBy', 'username publicKey');

        if (!record) {
            res.status(404).json({ error: 'Checkout record not found.' });
            return;
        }

        // Check access: borrower can only view own records
        if (req.user!.role === 'borrower' && record.issuedTo.toString() !== req.user!.id) {
            res.status(403).json({ error: 'Access denied.' });
            return;
        }

        // Get user's private key for decryption
        const user = await User.findById(req.user!.id);
        if (!user) {
            res.status(401).json({ error: 'User not found.' });
            return;
        }

        // Attempt to decrypt the data
        let decryptedData = null;
        try {
            decryptedData = decryptData(
                record.encryptedData,
                record.encryptedAESKey,
                record.iv,
                user.privateKey
            );
        } catch (e) {
            // User might not be the intended recipient
            decryptedData = { message: 'Encrypted data - you are not the intended recipient' };
        }

        // Verify digital signature if exists
        let signatureValid = null;
        if (record.digitalSignature && record.signedBy) {
            const signer = await User.findById(record.signedBy);
            if (signer && decryptedData && typeof decryptedData === 'object') {
                signatureValid = verifyDigitalSignature(
                    decryptedData,
                    record.digitalSignature,
                    signer.publicKey
                );
            }
        }

        res.json({
            record,
            decryptedData,
            signatureVerification: {
                hasSignature: !!record.digitalSignature,
                isValid: signatureValid,
            },
        });
    } catch (error) {
        console.error('Get checkout record error:', error);
        res.status(500).json({ error: 'Failed to fetch checkout record.' });
    }
});

/**
 * POST /api/checkout/request
 * Borrower requests to checkout an asset
 * Creates encrypted checkout record
 */
router.post(
    '/request',
    authenticate,
    authorize('checkout', 'create'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetId, dueDate, notes } = req.body;

            if (!assetId) {
                res.status(400).json({ error: 'Asset ID is required.' });
                return;
            }

            // Find asset
            const asset = await Asset.findById(assetId);
            if (!asset) {
                res.status(404).json({ error: 'Asset not found.' });
                return;
            }

            if (asset.status !== 'available') {
                res.status(400).json({ error: 'Asset is not available for checkout.' });
                return;
            }

            // Get borrower for encryption
            const borrower = await User.findById(req.user!.id);
            if (!borrower) {
                res.status(401).json({ error: 'User not found.' });
                return;
            }

            // Prepare checkout data
            const checkoutData = {
                assetId: asset.assetId,
                assetName: asset.assetName,
                borrowerUsername: borrower.username,
                borrowerEmail: borrower.email,
                requestDate: new Date().toISOString(),
                dueDate: dueDate || null,
                notes: notes || '',
            };

            // Encrypt checkout data (using borrower's public key)
            const encrypted = encryptData(checkoutData, borrower.publicKey);

            // Create checkout record
            const record = new CheckoutRecord({
                asset: asset._id,
                encryptedData: encrypted.encryptedData,
                encryptedAESKey: encrypted.encryptedAESKey,
                iv: encrypted.iv,
                issuedTo: borrower._id,
                status: 'pending',
                requestDate: new Date(),
                dueDate: dueDate ? new Date(dueDate) : undefined,
                notes,
            });

            await record.save();

            res.status(201).json({
                message: 'Checkout request submitted.',
                record: {
                    id: record._id,
                    status: record.status,
                    requestDate: record.requestDate,
                },
            });
        } catch (error) {
            console.error('Create checkout request error:', error);
            res.status(500).json({ error: 'Failed to create checkout request.' });
        }
    }
);

/**
 * PUT /api/checkout/:id/approve
 * Issuer approves checkout request
 * Creates digital signature for the record
 */
router.put(
    '/:id/approve',
    authenticate,
    requireRole('issuer', 'admin'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const record = await CheckoutRecord.findById(req.params.id);
            if (!record) {
                res.status(404).json({ error: 'Checkout record not found.' });
                return;
            }

            if (record.status !== 'pending') {
                res.status(400).json({ error: 'Record is not pending approval.' });
                return;
            }

            // Get issuer for signing
            const issuer = await User.findById(req.user!.id);
            if (!issuer) {
                res.status(401).json({ error: 'User not found.' });
                return;
            }

            // Get borrower for re-encryption
            const borrower = await User.findById(record.issuedTo);
            if (!borrower) {
                res.status(404).json({ error: 'Borrower not found.' });
                return;
            }

            // Update asset status
            const asset = await Asset.findById(record.asset);
            if (asset) {
                asset.status = 'checked-out';
                asset.currentHolder = borrower._id;
                await asset.save();
            }

            // Prepare signed checkout data
            const signedData = {
                assetId: asset?.assetId,
                issuedTo: borrower.username,
                issueDate: new Date(),
                dueDate: record.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
                approvedBy: issuer.username,
                notes: record.notes,
            };

            // Create digital signature
            const digitalSignature = createDigitalSignature(signedData, issuer.privateKey);

            // Re-encrypt with updated data
            const encrypted = encryptData(signedData, borrower.publicKey);

            // Update record
            record.status = 'approved';
            record.issuedBy = issuer._id;
            record.signedBy = issuer._id;
            record.issueDate = new Date();
            record.encryptedData = encrypted.encryptedData;
            record.encryptedAESKey = encrypted.encryptedAESKey;
            record.iv = encrypted.iv;
            record.digitalSignature = digitalSignature;

            await record.save();

            res.json({
                message: 'Checkout approved and digitally signed.',
                record: {
                    id: record._id,
                    status: record.status,
                    issueDate: record.issueDate,
                    signedBy: issuer.username,
                },
            });
        } catch (error) {
            console.error('Approve checkout error:', error);
            res.status(500).json({ error: 'Failed to approve checkout.' });
        }
    }
);

/**
 * PUT /api/checkout/:id/reject
 * Issuer rejects checkout request
 */
router.put(
    '/:id/reject',
    authenticate,
    requireRole('issuer', 'admin'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { reason } = req.body;

            const record = await CheckoutRecord.findById(req.params.id);
            if (!record) {
                res.status(404).json({ error: 'Checkout record not found.' });
                return;
            }

            if (record.status !== 'pending') {
                res.status(400).json({ error: 'Record is not pending.' });
                return;
            }

            record.status = 'rejected';
            record.notes = reason || record.notes;
            await record.save();

            res.json({
                message: 'Checkout request rejected.',
                record: {
                    id: record._id,
                    status: record.status,
                },
            });
        } catch (error) {
            console.error('Reject checkout error:', error);
            res.status(500).json({ error: 'Failed to reject checkout.' });
        }
    }
);

/**
 * PUT /api/checkout/:id/return
 * Borrower returns the asset
 */
router.put(
    '/:id/return',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const record = await CheckoutRecord.findById(req.params.id);
            if (!record) {
                res.status(404).json({ error: 'Checkout record not found.' });
                return;
            }

            // Only borrower or admin can return
            if (req.user!.role === 'borrower' && record.issuedTo.toString() !== req.user!.id) {
                res.status(403).json({ error: 'You can only return your own checkouts.' });
                return;
            }

            if (record.status !== 'approved') {
                res.status(400).json({ error: 'Record is not in approved/checked-out status.' });
                return;
            }

            // Update asset status
            const asset = await Asset.findById(record.asset);
            if (asset) {
                asset.status = 'available';
                asset.currentHolder = undefined;
                await asset.save();
            }

            record.status = 'returned';
            record.returnDate = new Date();
            await record.save();

            res.json({
                message: 'Asset returned successfully.',
                record: {
                    id: record._id,
                    status: record.status,
                    returnDate: record.returnDate,
                },
            });
        } catch (error) {
            console.error('Return asset error:', error);
            res.status(500).json({ error: 'Failed to return asset.' });
        }
    }
);

export default router;
