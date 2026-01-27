import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { assetAPI, checkoutAPI, getSecurityInfo } from '../services/api';
import {
    Shield, Lock, Key, FileCheck, Users, Box,
    CheckCircle, Clock, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalAssets: 0,
        availableAssets: 0,
        checkedOutAssets: 0,
        pendingRequests: 0,
        myCheckouts: 0,
    });
    const [securityInfo, setSecurityInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assetsRes, checkoutsRes, securityRes] = await Promise.all([
                    assetAPI.getAll(),
                    checkoutAPI.getAll(),
                    getSecurityInfo(),
                ]);

                const assets = assetsRes.data.assets || [];
                const checkouts = checkoutsRes.data.records || [];

                setStats({
                    totalAssets: assets.length,
                    availableAssets: assets.filter((a: any) => a.status === 'available').length,
                    checkedOutAssets: assets.filter((a: any) => a.status === 'checked-out').length,
                    pendingRequests: checkouts.filter((c: any) => c.status === 'pending').length,
                    myCheckouts: checkouts.filter((c: any) => c.status === 'approved').length,
                });

                setSecurityInfo(securityRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getRoleGreeting = () => {
        switch (user?.role) {
            case 'admin':
                return 'Full system access granted';
            case 'issuer':
                return 'You can approve asset requests';
            default:
                return 'Browse and request assets';
        }
    };

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="dashboard-header fade-in">
                    <div>
                        <h1>Welcome, {user?.username}!</h1>
                        <p className="text-muted">{getRoleGreeting()}</p>
                    </div>
                    <div className={`role-badge role-${user?.role}`}>
                        <Shield size={20} />
                        <span>{user?.role}</span>
                    </div>
                </div>

                <div className="stats-grid fade-in">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--gradient-primary)' }}>
                            <Box size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.totalAssets}</span>
                            <span className="stat-label">Total Assets</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--gradient-success)' }}>
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.availableAssets}</span>
                            <span className="stat-label">Available</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <Key size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.checkedOutAssets}</span>
                            <span className="stat-label">Checked Out</span>
                        </div>
                    </div>

                    {(user?.role === 'issuer' || user?.role === 'admin') && (
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                <Clock size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.pendingRequests}</span>
                                <span className="stat-label">Pending Requests</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-grid">
                    <div className="quick-actions card fade-in">
                        <h3>Quick Actions</h3>
                        <div className="action-list">
                            <Link to="/assets" className="action-item">
                                <Box size={20} />
                                <span>Browse Assets</span>
                                <ArrowRight size={16} />
                            </Link>
                            {user?.role === 'borrower' && (
                                <Link to="/checkout" className="action-item">
                                    <FileCheck size={20} />
                                    <span>My Checkouts</span>
                                    <ArrowRight size={16} />
                                </Link>
                            )}
                            {(user?.role === 'issuer' || user?.role === 'admin') && (
                                <Link to="/checkout" className="action-item">
                                    <AlertTriangle size={20} />
                                    <span>Pending Approvals</span>
                                    <ArrowRight size={16} />
                                </Link>
                            )}
                            {user?.role === 'admin' && (
                                <Link to="/users" className="action-item">
                                    <Users size={20} />
                                    <span>Manage Users</span>
                                    <ArrowRight size={16} />
                                </Link>
                            )}
                        </div>
                    </div>

                    {securityInfo && (
                        <div className="security-panel card fade-in">
                            <h3>
                                <Lock size={20} />
                                Security Features
                            </h3>
                            <div className="security-list">
                                <div className="security-item">
                                    <span className="security-label">Authentication</span>
                                    <span className="security-value">{securityInfo.securityFeatures?.authentication?.model}</span>
                                </div>
                                <div className="security-item">
                                    <span className="security-label">MFA</span>
                                    <span className="security-value">{securityInfo.securityFeatures?.authentication?.multiFactor}</span>
                                </div>
                                <div className="security-item">
                                    <span className="security-label">Encryption</span>
                                    <span className="security-value">{securityInfo.securityFeatures?.encryption?.dataEncryption}</span>
                                </div>
                                <div className="security-item">
                                    <span className="security-label">Key Exchange</span>
                                    <span className="security-value">{securityInfo.securityFeatures?.encryption?.keyExchange}</span>
                                </div>
                                <div className="security-item">
                                    <span className="security-label">Hashing</span>
                                    <span className="security-value">{securityInfo.securityFeatures?.hashing?.algorithm}</span>
                                </div>
                                <div className="security-item">
                                    <span className="security-label">Signatures</span>
                                    <span className="security-value">{securityInfo.securityFeatures?.digitalSignatures?.algorithm}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="access-control card fade-in mt-8">
                    <h3>Access Control Matrix</h3>
                    <p className="text-muted mb-4">Your permissions based on role-based access control (RBAC)</p>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>Borrower</th>
                                    <th>Issuer</th>
                                    <th>Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Assets</strong></td>
                                    <td><span className="badge badge-info">Read</span></td>
                                    <td><span className="badge badge-warning">Read/Update</span></td>
                                    <td><span className="badge badge-success">Full</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Checkout Records</strong></td>
                                    <td><span className="badge badge-info">Create/Read</span></td>
                                    <td><span className="badge badge-warning">Read/Update</span></td>
                                    <td><span className="badge badge-success">Full</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Users</strong></td>
                                    <td><span className="badge badge-info">Read (self)</span></td>
                                    <td><span className="badge badge-danger">None</span></td>
                                    <td><span className="badge badge-success">Full</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
