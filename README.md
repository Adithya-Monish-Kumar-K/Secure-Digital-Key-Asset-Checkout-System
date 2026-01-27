# 🔐 Secure Digital Key & Asset Checkout System

A full-stack TypeScript web application for securely managing physical and digital asset checkout with enterprise-grade security features.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

## 📋 Features

- **Multi-Factor Authentication (MFA)** - Password + Email OTP
- **Role-Based Access Control (RBAC)** - Borrower, Issuer, Admin roles
- **Hybrid Encryption** - AES-256-CBC + RSA-2048
- **Digital Signatures** - RSA-SHA256 for checkout records
- **Secure Password Storage** - bcrypt with unique salts

## 🏗️ System Architecture

### Roles & Permissions

| Role | Assets | Checkout Records | Users |
|------|--------|-----------------|-------|
| **Borrower** | Read | Create/Read | Read (self) |
| **Issuer** | Read/Update | Read/Update | ❌ |
| **Admin** | Full CRUD | Full CRUD | Full CRUD |

### Security Features

| Feature | Implementation |
|---------|---------------|
| Authentication | NIST SP 800-63-2 model |
| Single-Factor | Password + bcrypt hashing |
| Multi-Factor | Email-based OTP (6-digit) |
| Session Management | JWT tokens |
| Encryption | AES-256-CBC (data) + RSA-2048 (key exchange) |
| Digital Signatures | RSA-SHA256 |
| Encoding | Base64 for encrypted data storage |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Adithya-Monish-Kumar-K/Secure-Digital-Key-Asset-Checkout-System.git
   cd Secure-Digital-Key-Asset-Checkout-System
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy example env file
   cp server/.env.example server/.env
   
   # Edit with your settings (especially email for OTP)
   ```

4. **Start MongoDB**
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   # Terminal 1 - Start backend
   cd server
   npm run dev

   # Terminal 2 - Start frontend
   cd client
   npm run dev
   ```

6. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 📧 Email Configuration (Optional)

For real OTP emails, configure Gmail SMTP in `server/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

> **Note:** Use a [Gmail App Password](https://myaccount.google.com/apppasswords), not your regular password.

If email is not configured, OTP will be printed to the server console.

## 🔒 Security Implementation Details

### Authentication Flow
1. User submits email + password
2. Server verifies password using bcrypt
3. 6-digit OTP generated and sent to email
4. User enters OTP for verification
5. JWT token issued upon successful verification

### Encryption Flow
1. Generate random AES-256 session key
2. Encrypt checkout data with AES-CBC
3. Encrypt AES key with recipient's RSA public key
4. Store encrypted data + encrypted key + IV in MongoDB

### Digital Signature Flow
1. Hash checkout record data with SHA-256
2. Sign hash with Issuer's RSA private key
3. Store signature with record
4. Verify using Issuer's public key

## 📁 Project Structure

```
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── middleware/    # Auth & RBAC middleware
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Security services
│   │   └── app.ts         # Entry point
│   └── .env.example
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API service
│   │   └── App.tsx
│   └── package.json
│
└── README.md
```

## 🛡️ Attack Countermeasures

| Attack | Countermeasure |
|--------|---------------|
| Brute Force | bcrypt + MFA + Rate limiting |
| Replay Attack | OTP expiry (5 min) + JWT expiry |
| Privilege Escalation | RBAC middleware |
| Man-in-the-Middle | Encryption + Digital signatures |

## 📝 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login (step 1) | ❌ |
| POST | `/api/auth/verify-otp` | Verify OTP (step 2) | ❌ |
| GET | `/api/assets` | List assets | ✅ |
| POST | `/api/assets` | Create asset | ✅ Admin |
| POST | `/api/checkout/request` | Request checkout | ✅ Borrower |
| PUT | `/api/checkout/:id/approve` | Approve request | ✅ Issuer/Admin |
| GET | `/api/users` | List users | ✅ Admin |

## 📄 License

This project is created for educational purposes as part of the Cybersecurity coursework (23CSE313).

---

**Built with ❤️ for secure asset management**
