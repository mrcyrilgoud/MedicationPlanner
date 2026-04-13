import React, { useCallback, useEffect, useState } from 'react';
import {
    History,
    Plus,
    Edit,
    Activity,
    Package,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    X,
    Archive,
    Undo2,
    Eye
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';

const ITEMS_PER_PAGE = 20;
const getEntryNote = (item) => item?.note ?? item?.data?.note ?? '';

const HistoryView = () => {
    const {
        getHistoryLog,
        getHistoryTotalCount,
        revertHistoryAction,
        updateHistoryEntry
    } = useInventory();
    const toast = useToast();

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [editingItem, setEditingItem] = useState(null);
    const [note, setNote] = useState('');
    const [detailItem, setDetailItem] = useState(null);

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const count = await getHistoryTotalCount();
            setTotalCount(count);
            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            const data = await getHistoryLog({ limit: ITEMS_PER_PAGE, offset });
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history', error);
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    }, [currentPage, getHistoryLog, getHistoryTotalCount, toast]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const handleRevert = async (item) => {
        try {
            await revertHistoryAction(item);
            toast.success('Change reverted.');
            loadHistory();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleEditStart = (item) => {
        setEditingItem(item);
        setNote(getEntryNote(item));
    };

    const handleEditSave = async () => {
        if (!editingItem) return;
        try {
            await updateHistoryEntry(editingItem.id, { note });
            toast.success('History note updated.');
            setEditingItem(null);
            loadHistory();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const isRevertible = (item) => Boolean(item.revertible && !item.revertedAt && item.actionType !== 'revert');

    const getIcon = (type) => {
        switch (type) {
            case 'create_medication': return <Plus size={16} color="var(--success)" />;
            case 'add_stock': return <Package size={16} color="var(--primary)" />;
            case 'consume': return <Activity size={16} color="#a855f7" />;
            case 'edit_medication':
            case 'edit_batch': return <Edit size={16} color="var(--warning)" />;
            case 'archive':
            case 'restore':
            case 'delete_permanently': return <Archive size={16} color="var(--danger)" />;
            case 'discard_batch': return <Archive size={16} color="var(--warning)" />;
            case 'revert': return <Undo2 size={16} color="var(--success)" />;
            default: return <History size={16} />;
        }
    };

    const describeEntry = (item) => {
        const batchCount = item.batchDeltas?.length || 0;
        switch (item.actionType) {
            case 'create_medication':
                return `Created ${item.medicationName} with ${batchCount} starting batch`;
            case 'add_stock':
                return `Added stock to ${item.medicationName}`;
            case 'consume':
                return `Consumed stock from ${item.medicationName}`;
            case 'edit_medication':
                return `Updated ${item.medicationName}`;
            case 'edit_batch':
                return `Updated a batch for ${item.medicationName}`;
            case 'discard_batch':
                return `Discarded a batch for ${item.medicationName}`;
            case 'archive':
                return `Archived ${item.medicationName}`;
            case 'restore':
                return `Restored ${item.medicationName}`;
            case 'delete_permanently':
                return `Permanently deleted ${item.medicationName}`;
            case 'revert':
                return `Reverted ${item.metadata?.revertedActionType || 'a change'} for ${item.medicationName}`;
            default:
                return item.actionType;
        }
    };

    const formatDate = (isoString) => new Date(isoString).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const groupHistoryByDate = (items) => items.reduce((groups, item) => {
        const date = new Date(item.timestamp).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
        return groups;
    }, {});

    const groupedHistory = groupHistoryByDate(history);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (loading) {
        return <div className="p-4 text-center text-secondary">Loading history...</div>;
    }

    return (
        <div className="history-view" style={{ padding: '0 20px 40px', maxWidth: '900px', margin: '0 auto' }}>
            <header className="mb-6 flex items-center gap-3 pt-6">
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--glass-border)'
                }}>
                    <History size={20} color="var(--primary)" />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Activity History</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Journaled inventory changes with reversible snapshots.
                    </p>
                </div>
            </header>

            {editingItem && (
                <div className="modal-overlay" onClick={() => setEditingItem(null)}>
                    <div className="modal-container" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Note</h3>
                            <button className="modal-close-btn" onClick={() => setEditingItem(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <label className="form-label">Note</label>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                placeholder="Add context for this event..."
                            />
                            <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                Notes are editable. Inventory snapshots and timestamps are not.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn secondary" style={{ width: 'auto' }} onClick={() => setEditingItem(null)}>Cancel</button>
                            <button className="btn primary" style={{ width: 'auto' }} onClick={handleEditSave}>Save Note</button>
                        </div>
                    </div>
                </div>
            )}

            {detailItem && (
                <div className="modal-overlay" onClick={() => setDetailItem(null)}>
                    <div className="modal-container" style={{ maxWidth: '720px' }} onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Snapshot Details</h3>
                            <button className="modal-close-btn" onClick={() => setDetailItem(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body history-detail-body">
                            <p><strong>{describeEntry(detailItem)}</strong></p>
                            {detailItem.batchDeltas?.length > 0 && (
                                <div>
                                    <h4 className="section-caption">Batch Deltas</h4>
                                    <ul className="history-delta-list">
                                        {detailItem.batchDeltas.map((delta) => (
                                            <li key={delta.batchId}>
                                                Batch {delta.batchId.slice(0, 8)}: {delta.beforeQuantity} → {delta.afterQuantity}
                                                {delta.location ? ` • ${delta.location}` : ''}
                                                {delta.expiryDate ? ` • exp ${delta.expiryDate}` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="history-snapshot-grid">
                                <div>
                                    <h4 className="section-caption">Before</h4>
                                    <pre>{JSON.stringify(detailItem.beforeSnapshot, null, 2)}</pre>
                                </div>
                                <div>
                                    <h4 className="section-caption">After</h4>
                                    <pre>{JSON.stringify(detailItem.afterSnapshot, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <History size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p>No activity recorded yet.</p>
                </div>
            ) : (
                <div className="history-list">
                    {Object.keys(groupedHistory).map((date) => (
                        <div key={date} className="history-group mb-8">
                            <h3 className="history-group-label">{date}</h3>
                            <div className="group-items flex flex-col gap-2">
                                {groupedHistory[date].map((item) => (
                                    <div key={item.id} className="history-item">
                                        <div className="item-icon">{getIcon(item.actionType)}</div>
                                        <div className="item-content flex-1">
                                            <div className="history-primary-line">
                                                <span>{describeEntry(item)}</span>
                                                {item.revertedAt && <span className="history-status-pill">Reverted</span>}
                                            </div>
                                            <div className="history-secondary-line">
                                                <span>{formatDate(item.timestamp)}</span>
                                                {getEntryNote(item) && <span>• {getEntryNote(item)}</span>}
                                            </div>
                                        </div>
                                        <div className="actions history-action-row">
                                            <button
                                                type="button"
                                                onClick={() => setDetailItem(item)}
                                                className="history-icon-button"
                                                title="View details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEditStart(item)}
                                                className="history-icon-button"
                                                title="Edit note"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            {isRevertible(item) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRevert(item)}
                                                    className="history-icon-button warning"
                                                    title="Revert change"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>

                    <span>
                        Page <strong>{currentPage}</strong> of {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default HistoryView;
