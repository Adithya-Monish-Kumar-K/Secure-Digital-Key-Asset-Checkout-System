import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkoutAPI } from '../services/api';
import { FileCheck, Check, X, RotateCcw, Shield, Clock, Eye } from 'lucide-react';
import './Checkout.css';

interface CheckoutRecord {
    _id: string;
    asset: { _id: string; assetId: string; assetName: string };
    issuedTo: { _id: string; username: string; email: string };
    issuedBy?: { _id: string; username: string };
    status: string;
    requestDate: string;
    issueDate?: string;
    dueDate?: string;
    returnDate?: string;
    notes?: string;
    digitalSignature?: string;
}

export default function Checkout() {
    const { user } = useAuth();
    const [records, setRecords] = useState<CheckoutRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        fetchRecords();
    }, [statusFilter]);

    const fetchRecords = async () => {
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;
            const res = await checkoutAPI.getAll(params);
            setRecords(res.data.records || []);
        } catch (error) {
            console.error('Failed to fetch records:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await checkoutAPI.approve(id);
            setSuccess('Checkout approved and digitally signed!');
            fetchRecords();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Approval failed');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Reason for rejection (optional):');
        try {
            await checkoutAPI.reject(id, reason || undefined);
            setSuccess('Checkout request rejected');
            fetchRecords();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Rejection failed');
        }
    };

    const handleReturn = async (id: string) => {
        try {
            await checkoutAPI.return(id);
            setSuccess('Asset returned successfully!');
            fetchRecords();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Return failed');
        }
    };

    const viewDetails = async (id: string) => {
        try {
            const res = await checkoutAPI.getById(id);
            setSelectedRecord(res.data);
            setShowDetails(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load details');
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            pending: 'badge-warning',
            approved: 'badge-success',
            rejected: 'badge-danger',
            returned: 'badge-info',
        };
        return badges[status] || 'badge-info';
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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
                        <h1>Checkout Records</h1>
                        <p className="text-muted">
                            {user?.role === 'borrower'
                                ? 'Your asset checkouts'
                                : 'Manage asset checkout requests'}
                        </p>
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
                        <Clock size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-select"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="returned">Returned</option>
                        </select>
                    </div>
                </div>

                <div className="table-container fade-in">
                    {records.length === 0 ? (
                        <div className="empty-state">
                            <FileCheck size={48} />
                            <h3>No checkout records</h3>
                            <p>Records will appear here when assets are requested.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Borrower</th>
                                    <th>Status</th>
                                    <th>Request Date</th>
                                    <th>Signed</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record._id}>
                                        <td>
                                            <strong>{record.asset?.assetName}</strong>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {record.asset?.assetId}
                                            </div>
                                        </td>
                                        <td>
                                            {record.issuedTo?.username}
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {record.issuedTo?.email}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td>{formatDate(record.requestDate)}</td>
                                        <td>
                                            {record.digitalSignature ? (
                                                <span className="badge badge-success">
                                                    <Shield size={12} /> Yes
                                                </span>
                                            ) : (
                                                <span className="badge badge-info">No</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => viewDetails(record._id)}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {record.status === 'pending' && (user?.role === 'issuer' || user?.role === 'admin') && (
                                                    <>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleApprove(record._id)}
                                                            title="Approve"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleReject(record._id)}
                                                            title="Reject"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {record.status === 'approved' &&
                                                    (user?.role === 'admin' || record.issuedTo?._id === user?.id) && (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleReturn(record._id)}
                                                            title="Return"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {showDetails && selectedRecord && (
                    <div className="modal-overlay" onClick={() => setShowDetails(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Checkout Details</h3>
                                <button onClick={() => setShowDetails(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="detail-section">
                                    <h4>Record Information</h4>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Status</span>
                                            <span className={`badge ${getStatusBadge(selectedRecord.record.status)}`}>
                                                {selectedRecord.record.status}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Request Date</span>
                                            <span>{formatDate(selectedRecord.record.requestDate)}</span>
                                        </div>
                                        {selectedRecord.record.issueDate && (
                                            <div className="detail-item">
                                                <span className="detail-label">Issue Date</span>
                                                <span>{formatDate(selectedRecord.record.issueDate)}</span>
                                            </div>
                                        )}
                                        {selectedRecord.record.returnDate && (
                                            <div className="detail-item">
                                                <span className="detail-label">Return Date</span>
                                                <span>{formatDate(selectedRecord.record.returnDate)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h4>
                                        <Shield size={18} />
                                        Security Verification
                                    </h4>
                                    <div className="security-details">
                                        <div className="detail-item">
                                            <span className="detail-label">Digital Signature</span>
                                            <span className={selectedRecord.signatureVerification?.hasSignature ? 'text-success' : 'text-muted'}>
                                                {selectedRecord.signatureVerification?.hasSignature ? 'Present' : 'Not signed'}
                                            </span>
                                        </div>
                                        {selectedRecord.signatureVerification?.hasSignature && (
                                            <div className="detail-item">
                                                <span className="detail-label">Signature Valid</span>
                                                <span className={selectedRecord.signatureVerification?.isValid ? 'text-success' : 'text-danger'}>
                                                    {selectedRecord.signatureVerification?.isValid ? '✓ Verified' : '✗ Invalid'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="detail-item">
                                            <span className="detail-label">Encryption</span>
                                            <span className="text-success">AES-256-CBC + RSA-2048</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedRecord.decryptedData && typeof selectedRecord.decryptedData === 'object' && (
                                    <div className="detail-section">
                                        <h4>Decrypted Record Data</h4>
                                        <pre className="code-block">
                                            {JSON.stringify(selectedRecord.decryptedData, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
