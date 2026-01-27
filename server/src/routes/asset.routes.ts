import { Router, Request, Response } from 'express';
import { Asset } from '../models';
import { authenticate, authorize, requireRole } from '../middleware';

const router = Router();

/**
 * GET /api/assets
 * List all assets
 * Access: All authenticated users (read)
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, category, search } = req.query;

        const filter: any = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (search) {
            filter.$or = [
                { assetName: { $regex: search, $options: 'i' } },
                { assetId: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const assets = await Asset.find(filter)
            .populate('currentHolder', 'username email')
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });

        res.json({ assets });
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: 'Failed to fetch assets.' });
    }
});

/**
 * GET /api/assets/:id
 * Get single asset
 * Access: All authenticated users (read)
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const asset = await Asset.findById(req.params.id)
            .populate('currentHolder', 'username email')
            .populate('createdBy', 'username');

        if (!asset) {
            res.status(404).json({ error: 'Asset not found.' });
            return;
        }

        res.json({ asset });
    } catch (error) {
        console.error('Get asset error:', error);
        res.status(500).json({ error: 'Failed to fetch asset.' });
    }
});

/**
 * POST /api/assets
 * Create new asset
 * Access: Admin only (create)
 */
router.post(
    '/',
    authenticate,
    authorize('asset', 'create'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetId, assetName, description, category, serialNumber, location } = req.body;

            if (!assetId || !assetName) {
                res.status(400).json({ error: 'Asset ID and name are required.' });
                return;
            }

            // Check for duplicate asset ID
            const existingAsset = await Asset.findOne({ assetId });
            if (existingAsset) {
                res.status(409).json({ error: 'Asset ID already exists.' });
                return;
            }

            const asset = new Asset({
                assetId,
                assetName,
                description,
                category: category || 'other',
                serialNumber,
                location,
                createdBy: req.user!.id,
            });

            await asset.save();

            res.status(201).json({
                message: 'Asset created successfully.',
                asset,
            });
        } catch (error) {
            console.error('Create asset error:', error);
            res.status(500).json({ error: 'Failed to create asset.' });
        }
    }
);

/**
 * PUT /api/assets/:id
 * Update asset
 * Access: Issuer (update), Admin (update)
 */
router.put(
    '/:id',
    authenticate,
    authorize('asset', 'update'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetName, description, category, status, serialNumber, location } = req.body;

            const asset = await Asset.findById(req.params.id);
            if (!asset) {
                res.status(404).json({ error: 'Asset not found.' });
                return;
            }

            // Update fields
            if (assetName) asset.assetName = assetName;
            if (description !== undefined) asset.description = description;
            if (category) asset.category = category;
            if (status) asset.status = status;
            if (serialNumber !== undefined) asset.serialNumber = serialNumber;
            if (location !== undefined) asset.location = location;

            await asset.save();

            res.json({
                message: 'Asset updated successfully.',
                asset,
            });
        } catch (error) {
            console.error('Update asset error:', error);
            res.status(500).json({ error: 'Failed to update asset.' });
        }
    }
);

/**
 * DELETE /api/assets/:id
 * Delete asset
 * Access: Admin only (delete)
 */
router.delete(
    '/:id',
    authenticate,
    authorize('asset', 'delete'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const asset = await Asset.findById(req.params.id);
            if (!asset) {
                res.status(404).json({ error: 'Asset not found.' });
                return;
            }

            if (asset.status === 'checked-out') {
                res.status(400).json({ error: 'Cannot delete asset that is currently checked out.' });
                return;
            }

            await Asset.findByIdAndDelete(req.params.id);

            res.json({ message: 'Asset deleted successfully.' });
        } catch (error) {
            console.error('Delete asset error:', error);
            res.status(500).json({ error: 'Failed to delete asset.' });
        }
    }
);

export default router;
