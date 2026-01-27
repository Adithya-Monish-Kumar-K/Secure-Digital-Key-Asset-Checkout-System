import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { assetAPI, checkoutAPI } from '../services/api';
import { Box, Plus, Search, Filter, Edit2, Trash2, Key, X } from 'lucide-react';
import './Assets.css';

interface Asset {
    _id: string;
    assetId: string;
    assetName: string;
    description: string;
    category: string;
    status: string;
    serialNumber?: string;
    location?: string;
}

export default function Assets() {
    const { user } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [formData, setFormData] = useState({
        assetId: '',
        assetName: '',
        description: '',
        category: 'equipment',
        serialNumber: '',
        location: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;
            if (statusFilter) params.status = statusFilter;

            const res = await assetAPI.getAll(params);
            setAssets(res.data.assets || []);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchAssets, 300);
        return () => clearTimeout(timeout);
    }, [search, categoryFilter, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            if (editingAsset) {
                await assetAPI.update(editingAsset._id, formData);
                setSuccess('Asset updated successfully');
            } else {
                await assetAPI.create(formData);
                setSuccess('Asset created successfully');
            }
            setShowModal(false);
            setEditingAsset(null);
            resetForm();
            fetchAssets();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Operation failed');
        }
    };

    const handleEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setFormData({
            assetId: asset.assetId,
            assetName: asset.assetName,
            description: asset.description || '',
            category: asset.category,
            serialNumber: asset.serialNumber || '',
            location: asset.location || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;

        try {
            await assetAPI.delete(id);
            setSuccess('Asset deleted successfully');
            fetchAssets();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Delete failed');
        }
    };

    const handleCheckout = async (assetId: string) => {
        try {
            await checkoutAPI.request({ assetId });
            setSuccess('Checkout request submitted!');
            fetchAssets();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Checkout request failed');
        }
    };

    const resetForm = () => {
        setFormData({
            assetId: '',
            assetName: '',
            description: '',
            category: 'equipment',
            serialNumber: '',
            location: '',
        });
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            available: 'badge-success',
            'checked-out': 'badge-warning',
            maintenance: 'badge-info',
            retired: 'badge-danger',
        };
        return badges[status] || 'badge-info';
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
                        <h1>Assets</h1>
                        <p className="text-muted">Manage and browse available assets</p>
                    </div>
                    {user?.role === 'admin' && (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                resetForm();
                                setEditingAsset(null);
                                setShowModal(true);
                            }}
                        >
                            <Plus size={18} />
                            Add Asset
                        </button>
                    )}
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
                                placeholder="Search assets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="filter-group">
                        <Filter size={18} />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="form-select"
                        >
                            <option value="">All Categories</option>
                            <option value="equipment">Equipment</option>
                            <option value="key">Keys</option>
                            <option value="device">Devices</option>
                            <option value="software">Software</option>
                            <option value="other">Other</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-select"
                        >
                            <option value="">All Status</option>
                            <option value="available">Available</option>
                            <option value="checked-out">Checked Out</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                </div>

                <div className="assets-grid fade-in">
                    {assets.length === 0 ? (
                        <div className="empty-state card">
                            <Box size={48} />
                            <h3>No assets found</h3>
                            <p>Try adjusting your filters or add new assets.</p>
                        </div>
                    ) : (
                        assets.map((asset) => (
                            <div key={asset._id} className="asset-card card">
                                <div className="asset-header">
                                    <span className="asset-id">{asset.assetId}</span>
                                    <span className={`badge ${getStatusBadge(asset.status)}`}>
                                        {asset.status}
                                    </span>
                                </div>
                                <h4>{asset.assetName}</h4>
                                <p className="text-muted">{asset.description || 'No description'}</p>
                                <div className="asset-meta">
                                    <span className="badge badge-info">{asset.category}</span>
                                    {asset.location && <span className="text-muted">{asset.location}</span>}
                                </div>
                                <div className="asset-actions">
                                    {asset.status === 'available' && user?.role === 'borrower' && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleCheckout(asset._id)}
                                        >
                                            <Key size={16} />
                                            Request
                                        </button>
                                    )}
                                    {(user?.role === 'issuer' || user?.role === 'admin') && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleEdit(asset)}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {user?.role === 'admin' && (
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => handleDelete(asset._id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h3>
                                <button onClick={() => setShowModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Asset ID</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.assetId}
                                        onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                                        required
                                        disabled={!!editingAsset}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.assetName}
                                        onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="equipment">Equipment</option>
                                            <option value="key">Key</option>
                                            <option value="device">Device</option>
                                            <option value="software">Software</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Location</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingAsset ? 'Update' : 'Create'}
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
