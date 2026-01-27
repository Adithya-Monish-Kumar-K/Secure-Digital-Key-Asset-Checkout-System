import mongoose, { Document, Schema } from 'mongoose';

// User roles as defined in requirements
export type UserRole = 'borrower' | 'issuer' | 'admin';

export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    salt: string;
    role: UserRole;
    publicKey: string;
    privateKey: string; // Encrypted with user's password
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 50,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        salt: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['borrower', 'issuer', 'admin'],
            default: 'borrower',
        },
        publicKey: {
            type: String,
            required: true,
        },
        privateKey: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
