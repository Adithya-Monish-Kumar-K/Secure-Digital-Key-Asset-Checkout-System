import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { Users as UsersIcon, Search, Edit2, Trash2, X, ShieldCheck, Key, UserCircle } from 'lucide-react';
import './Assets.css'; // Reuse Assets styling

interface User {
    _id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: 'borrower',
        isActive: true,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            const res = await userAPI.getAll(params);
            setUsers(res.data.users || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timeout);
    }, [search, roleFilter]);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            await userAPI.update(editingUser._id, formData);
            setSuccess('User updated successfully');
            setShowModal(false);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Update failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this user?')) return;

        try {
            await userAPI.delete(id);
            setSuccess('User deactivated successfully');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Delete failed');
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin':
                return <ShieldCheck size={16} />;
            case 'issuer':
                return <Key size={16} />;
            default:
                return <UserCircle size={16} />;
        }
    };

    const getRoleBadge = (role: string) => {
        const badges: Record<string, string> = {
            admin: 'badge-danger',
            issuer: 'badge-warning',
            borrower: 'badge-info',
        };
        return badges[role] || 'badge-info';
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
                <div className="page-header fade-in">
                    <div>
                        <h1>User Management</h1>
                        <p className="text-muted">Manage system users and permissions</p>
                    </div>
                </div>

                {(error || success) && (
                    <div className={`alert ${error ? 'alert-error' : 'alert-success'} fade-in`}>
                        {error || success}
                        <button onClick={() => { setError(''); setSuccess(''); }}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="filters card fade-in">
                    <div className="filter-group">
                        <div className="search-input">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="filter-group">
                        <UsersIcon size={18} />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="form-select"
                        >
                            <option value="">All Roles</option>
                            <option value="borrower">Borrower</option>
                            <option value="issuer">Issuer</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>

                <div className="table-container fade-in">
                    {users.length === 0 ? (
                        <div className="empty-state">
                            <UsersIcon size={48} />
                            <h3>No users found</h3>
                            <p>Users will appear here once registered.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(user.role)}
                                                <strong>{user.username}</strong>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`badge ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleEdit(user)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(user._id)}
                                                    title="Deactivate"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {showModal && editingUser && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Edit User</h3>
                                <button onClick={() => setShowModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="borrower">Borrower</option>
                                        <option value="issuer">Issuer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            style={{ marginRight: '0.5rem' }}
                                        />
                                        Active
                                    </label>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Update
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
