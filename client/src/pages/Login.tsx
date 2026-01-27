import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import './Auth.css';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
    const [sessionId, setSessionId] = useState('');
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await authAPI.login(formData);
            setSessionId(res.data.sessionId);
            setMessage(res.data.message);
            setStep('otp');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await authAPI.verifyOTP({ sessionId, otp });
            login(res.data.token, res.data.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await authAPI.resendOTP(sessionId);
            setMessage(res.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container fade-in">
                <div className="auth-header">
                    <div className="auth-logo">
                        <Shield size={48} />
                    </div>
                    <h1>Welcome Back</h1>
                    <p>Sign in to your secure account</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {message && step === 'otp' && <div className="alert alert-success">{message}</div>}

                {step === 'credentials' ? (
                    <form onSubmit={handleCredentialsSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div className="input-icon">
                                <Mail size={18} />
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-icon">
                                <Lock size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Signing in...' : 'Continue'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleOTPSubmit} className="auth-form">
                        <div className="otp-info">
                            <Shield size={32} className="otp-icon" />
                            <p>Enter the 6-digit code sent to your email</p>
                        </div>

                        <div className="form-group">
                            <input
                                type="text"
                                className="form-input otp-input"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading || otp.length !== 6}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary btn-full mt-4"
                            onClick={handleResendOTP}
                            disabled={loading}
                        >
                            Resend OTP
                        </button>

                        <button
                            type="button"
                            className="btn-link mt-4"
                            onClick={() => {
                                setStep('credentials');
                                setOtp('');
                                setError('');
                            }}
                        >
                            ← Back to login
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p>
                        Don't have an account? <Link to="/register">Register</Link>
                    </p>
                </div>

                <div className="security-badge">
                    <Shield size={14} />
                    <span>Protected by MFA</span>
                </div>
            </div>
        </div>
    );
}
