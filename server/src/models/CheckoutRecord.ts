import mongoose, { Document, Schema } from 'mongoose';

// Checkout record status
export type CheckoutStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'overdue';

export interface ICheckoutRecord extends Document {
    asset: mongoose.Types.ObjectId;
    // Encrypted data (contains checkout details in encrypted form)
    encryptedData: string; // Base64 encoded encrypted data
    encryptedAESKey: string; // AES key encrypted with RSA public key
    iv: string; // Initialization vector for AES
    // Digital signature for integrity and authenticity
    digitalSignature: string;
    signedBy: mongoose.Types.ObjectId; // Issuer who signed
    // Reference fields (unencrypted for querying)
    issuedTo: mongoose.Types.ObjectId;
    issuedBy?: mongoose.Types.ObjectId;
    status: CheckoutStatus;
    requestDate: Date;
    issueDate?: Date;
    dueDate?: Date;
    returnDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const checkoutRecordSchema = new Schema<ICheckoutRecord>(
    {
        asset: {
            type: Schema.Types.ObjectId,
            ref: 'Asset',
            required: true,
        },
        encryptedData: {
            type: String,
            required: true,
        },
        encryptedAESKey: {
            type: String,
            required: true,
        },
        iv: {
            type: String,
            required: true,
        },
        digitalSignature: {
            type: String,
            default: '',
        },
        signedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        issuedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        issuedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'returned', 'overdue'],
            default: 'pending',
        },
        requestDate: {
            type: Date,
            default: Date.now,
        },
        issueDate: {
            type: Date,
        },
        dueDate: {
            type: Date,
        },
        returnDate: {
            type: Date,
        },
        notes: {
            type: String,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
checkoutRecordSchema.index({ asset: 1 });
checkoutRecordSchema.index({ issuedTo: 1 });
checkoutRecordSchema.index({ status: 1 });
checkoutRecordSchema.index({ requestDate: -1 });

export const CheckoutRecord = mongoose.model<ICheckoutRecord>('CheckoutRecord', checkoutRecordSchema);
