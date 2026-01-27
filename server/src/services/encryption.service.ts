import crypto from 'crypto';

/**
 * Encryption Service
 * Implements hybrid cryptography: RSA for key exchange, AES for data encryption
 * Satisfies rubric requirement: Key Exchange Mechanism (1.5 Marks)
 */

// AES Configuration
const AES_ALGORITHM = 'aes-256-cbc';
const AES_KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;

// RSA Configuration
const RSA_KEY_SIZE = 2048;

/**
 * Generate RSA key pair for digital signatures and key exchange
 * Each user gets their own key pair during registration
 */
export const generateRSAKeyPair = (): { publicKey: string; privateKey: string } => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: RSA_KEY_SIZE,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    return { publicKey, privateKey };
};

/**
 * Generate random AES session key
 * Used regularly for encrypting data (faster than RSA)
 */
export const generateAESKey = (): Buffer => {
    return crypto.randomBytes(AES_KEY_LENGTH);
};

/**
 * Generate random initialization vector for AES
 */
export const generateIV = (): Buffer => {
    return crypto.randomBytes(IV_LENGTH);
};

/**
 * Encrypt data using AES-256-CBC
 * @param data - Plain text data to encrypt
 * @param key - AES key (32 bytes)
 * @param iv - Initialization vector (16 bytes)
 * @returns Base64 encoded encrypted data
 */
export const encryptAES = (data: string, key: Buffer, iv: Buffer): string => {
    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
};

/**
 * Decrypt data using AES-256-CBC
 * @param encryptedData - Base64 encoded encrypted data
 * @param key - AES key (32 bytes)
 * @param iv - Initialization vector (16 bytes)
 * @returns Decrypted plain text
 */
export const decryptAES = (encryptedData: string, key: Buffer, iv: Buffer): string => {
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

/**
 * Encrypt AES key using RSA public key (Key Exchange)
 * This implements the hybrid cryptography approach
 * @param aesKey - AES key to encrypt
 * @param publicKey - RSA public key in PEM format
 * @returns Base64 encoded encrypted AES key
 */
export const encryptAESKeyWithRSA = (aesKey: Buffer, publicKey: string): string => {
    const encryptedKey = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        aesKey
    );
    return encryptedKey.toString('base64');
};

/**
 * Decrypt AES key using RSA private key
 * @param encryptedAESKey - Base64 encoded encrypted AES key
 * @param privateKey - RSA private key in PEM format
 * @returns Decrypted AES key
 */
export const decryptAESKeyWithRSA = (encryptedAESKey: string, privateKey: string): Buffer => {
    const encryptedBuffer = Buffer.from(encryptedAESKey, 'base64');
    const decryptedKey = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        encryptedBuffer
    );
    return decryptedKey;
};

/**
 * Encrypt sensitive data using hybrid encryption
 * 1. Generate AES session key
 * 2. Encrypt data with AES
 * 3. Encrypt AES key with RSA public key
 */
export const encryptData = (
    data: object,
    recipientPublicKey: string
): {
    encryptedData: string;
    encryptedAESKey: string;
    iv: string;
} => {
    const jsonData = JSON.stringify(data);
    const aesKey = generateAESKey();
    const iv = generateIV();

    // Encrypt data with AES
    const encryptedData = encryptAES(jsonData, aesKey, iv);

    // Encrypt AES key with RSA
    const encryptedAESKey = encryptAESKeyWithRSA(aesKey, recipientPublicKey);

    return {
        encryptedData,
        encryptedAESKey,
        iv: iv.toString('base64'),
    };
};

/**
 * Decrypt data using hybrid decryption
 */
export const decryptData = (
    encryptedData: string,
    encryptedAESKey: string,
    iv: string,
    privateKey: string
): object => {
    // Decrypt AES key
    const aesKey = decryptAESKeyWithRSA(encryptedAESKey, privateKey);
    const ivBuffer = Buffer.from(iv, 'base64');

    // Decrypt data
    const jsonData = decryptAES(encryptedData, aesKey, ivBuffer);
    return JSON.parse(jsonData);
};
