import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard', roles: ['borrower', 'issuer', 'admin'] },
        { to: '/assets', label: 'Assets', roles: ['borrower', 'issuer', 'admin'] },
        { to: '/checkout', label: 'Checkout', roles: ['borrower', 'issuer', 'admin'] },
        { to: '/users', label: 'Users', roles: ['admin'] },
    ];

    const filteredLinks = navLinks.filter(
        (link) => !user || link.roles.includes(user.role)
    );

    return (
        <nav className="navbar">
            <div className="container">
                <div className="navbar-content">
                    <Link to="/" className="navbar-brand">
                        <Shield className="navbar-icon" />
                        <span>SecureAsset</span>
                    </Link>

                    {isAuthenticated && (
                        <>
                            <div className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
                                {filteredLinks.map((link) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="navbar-link"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>

                            <div className="navbar-user">
                                <div className="user-info">
                                    <span className="user-name">{user?.username}</span>
                                    <span className={`user-role badge badge-${user?.role === 'admin' ? 'danger' : user?.role === 'issuer' ? 'warning' : 'info'}`}>
                                        {user?.role}
                                    </span>
                                </div>
                                <button className="btn-logout" onClick={handleLogout} title="Logout">
                                    <LogOut size={18} />
                                </button>
                                <button
                                    className="mobile-menu-btn"
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                >
                                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                                </button>
                            </div>
                        </>
                    )}

                    {!isAuthenticated && (
                        <div className="navbar-auth">
                            <Link to="/login" className="btn btn-secondary">
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary">
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
