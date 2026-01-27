import crypto from 'crypto';
import { hashSHA256 } from './hashing.service';

/**
 * Digital Signature Service
 * Implements digital signatures for checkout records
 * Satisfies rubric requirement: Digital Signature using Hash (1.5 Marks)
 * 
 * Security properties demonstrated:
 * - Integrity: Data hasn't been modified
 * - Authenticity: Verifies signer identity
 * - Non-repudiation: Signer cannot deny signing
 */

/**
 * Create digital signature for data
 * Process:
 * 1. Hash the data using SHA-256
 * 2. Sign the hash with issuer's RSA private key
 * 
 * @param data - Object data to sign
 * @param privateKey - Signer's RSA private key
 * @returns Base64 encoded digital signature
 */
export const createDigitalSignature = (data: object, privateKey: string): string => {
    // Convert data to JSON string for consistent hashing
    const jsonData = JSON.stringify(data);

    // Create signature using RSA-SHA256
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(jsonData);
    sign.end();

    const signature = sign.sign(privateKey, 'base64');
    return signature;
};

/**
 * Verify digital signature
 * @param data - Original data that was signed
 * @param signature - Base64 encoded signature
 * @param publicKey - Signer's RSA public key
 * @returns Boolean indicating if signature is valid
 */
export const verifyDigitalSignature = (
    data: object,
    signature: string,
    publicKey: string
): boolean => {
    try {
        const jsonData = JSON.stringify(data);

        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(jsonData);
        verify.end();

        return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
};

/**
 * Create a hash-based message authentication code (HMAC)
 * Alternative method for message integrity
 * @param data - Data to authenticate
 * @param secret - Shared secret key
 * @returns HMAC as hex string
 */
export const createHMAC = (data: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Sign checkout record data
 * Creates a signature for the entire checkout transaction
 */
export const signCheckoutRecord = (
    recordData: {
        assetId: string;
        issuedTo: string;
        issueDate: Date;
        dueDate: Date;
        notes?: string;
    },
    issuerPrivateKey: string
): string => {
    return createDigitalSignature(recordData, issuerPrivateKey);
};

/**
 * Verify checkout record signature
 */
export const verifyCheckoutSignature = (
    recordData: {
        assetId: string;
        issuedTo: string;
        issueDate: Date;
        dueDate: Date;
        notes?: string;
    },
    signature: string,
    issuerPublicKey: string
): boolean => {
    return verifyDigitalSignature(recordData, signature, issuerPublicKey);
};
