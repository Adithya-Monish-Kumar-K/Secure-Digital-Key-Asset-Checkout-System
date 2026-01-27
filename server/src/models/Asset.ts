import mongoose, { Document, Schema } from 'mongoose';

// Asset status types
export type AssetStatus = 'available' | 'checked-out' | 'maintenance' | 'retired';
export type AssetCategory = 'equipment' | 'key' | 'device' | 'software' | 'other';

export interface IAsset extends Document {
    assetId: string;
    assetName: string;
    description: string;
    category: AssetCategory;
    status: AssetStatus;
    serialNumber?: string;
    location?: string;
    currentHolder?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
    {
        assetId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        assetName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        category: {
            type: String,
            enum: ['equipment', 'key', 'device', 'software', 'other'],
            default: 'other',
        },
        status: {
            type: String,
            enum: ['available', 'checked-out', 'maintenance', 'retired'],
            default: 'available',
        },
        serialNumber: {
            type: String,
            trim: true,
        },
        location: {
            type: String,
            trim: true,
        },
        currentHolder: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
assetSchema.index({ assetId: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ category: 1 });

export const Asset = mongoose.model<IAsset>('Asset', assetSchema);
