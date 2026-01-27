import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { User, Mail, Lock, Eye, EyeOff, Shield, UserCircle, Key, ShieldCheck } from 'lucide-react';
import './Auth.css';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'borrower',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            await authAPI.register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            });
            navigate('/login', { state: { message: 'Registration successful! Please login.' } });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'borrower', label: 'Borrower', icon: UserCircle },
        { id: 'issuer', label: 'Issuer', icon: Key },
        { id: 'admin', label: 'Admin', icon: ShieldCheck },
    ];

    return (
        <div className="auth-page">
            <div className="auth-container fade-in">
                <div className="auth-header">
                    <div className="auth-logo">
                        <Shield size={48} />
                    </div>
                    <h1>Create Account</h1>
                    <p>Join the secure asset management system</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <div className="input-icon">
                            <User size={18} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                                minLength={3}
                            />
                        </div>
                    </div>

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
                                placeholder="Create a password (min 8 chars)"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={8}
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

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div className="input-icon">
                            <Lock size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group role-selector">
                        <label className="form-label">Select Role</label>
                        <div className="role-options">
                            {roles.map((role) => (
                                <div
                                    key={role.id}
                                    className={`role-option ${formData.role === role.id ? 'selected' : ''}`}
                                    onClick={() => setFormData({ ...formData, role: role.id })}
                                >
                                    <role.icon size={24} />
                                    <span>{role.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>

                <div className="security-badge">
                    <Shield size={14} />
                    <span>Passwords hashed with bcrypt</span>
                </div>
            </div>
        </div>
    );
}
