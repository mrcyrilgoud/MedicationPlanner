
import React, { useEffect, useState, useCallback } from 'react';
import { useInventory } from '../context/InventoryContext';
import { History, Plus, Trash2, Edit, Activity, Package, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const HistoryView = () => {
    const { getHistoryLog, getHistoryTotalCount, revertHistoryAction, updateHistoryEntry } = useInventory();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Edit Modal State
    const [editingItem, setEditingItem] = useState(null);
    const [editData, setEditData] = useState({});

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const count = await getHistoryTotalCount();
            setTotalCount(count);

            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            // Fetch only the needed slice
            const data = await getHistoryLog({ limit: ITEMS_PER_PAGE, offset });

            // Data is already sorted by backend (newest first)
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    }, [getHistoryLog, getHistoryTotalCount, currentPage]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const handleRevert = async (item) => {
        if (window.confirm("Are you sure you want to revert this action? This will undo the changes.")) {
            await revertHistoryAction(item);
            loadHistory();
        }
    };

    const handleEditStart = (item) => {
        setEditingItem(item);
        // Flattens structure for simple editing
        setEditData({
            timestamp: item.timestamp,
            note: item.data?.note || '',
            // We can add more fields if needed
        });
    };

    const handleEditSave = async () => {
        if (!editingItem) return;

        // Construct updates. We keep it simple: Timestamp change or Note/Data change.
        await updateHistoryEntry(editingItem.id, {
            timestamp: editData.timestamp,
            data: { ...editingItem.data, note: editData.note }
        });

        setEditingItem(null);
        loadHistory();
    };

    const isRevertible = (item) => {
        if (item.actionType === 'consume') return true;
        if (item.actionType === 'add_medication') {
            // Only recent (< 24h)
            const diff = new Date() - new Date(item.timestamp);
            return diff < 24 * 60 * 60 * 1000;
        }
        return false;
    };

    const getIcon = (type) => {
        switch (type) {
            case 'add_medication': return <Plus size={16} color="var(--success)" />;
            case 'add_stock': return <Package size={16} color="var(--primary)" />;
            case 'consume': return <Activity size={16} color="#a855f7" />;
            case 'delete': return <Trash2 size={16} color="var(--danger)" />;
            case 'edit': return <Edit size={16} color="var(--warning)" />;
            default: return <History size={16} />;
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderDetails = (item) => {
        if (typeof item.data === 'undefined' && item.details) {
            return item.details;
        }

        const data = item.data || {};
        const { actionType } = item;
        const boldStyle = { color: 'var(--text-primary)', fontWeight: 600 };

        let content;
        switch (actionType) {
            case 'add_medication':
                content = <span>Created medication <span style={boldStyle}>{data.name}</span></span>;
                break;
            case 'add_stock':
                content = <span>Added <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{data.quantity}</span> units to <span style={boldStyle}>{data.name}</span></span>;
                break;
            case 'consume':
                content = <span>Took <span style={{ color: '#a855f7', fontWeight: 600 }}>{data.amount}</span> of <span style={boldStyle}>{data.name}</span></span>;
                break;
            case 'edit':
                content = <span>Updated details for <span style={boldStyle}>{data.name}</span></span>;
                break;
            case 'delete':
                content = <span>Deleted medication record</span>;
                break;
            default:
                content = <span>{JSON.stringify(data)}</span>;
        }

        return (
            <div>
                {content}
                {data.note && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Note: {data.note}</div>}
            </div>
        );
    };

    // Pagination Logic
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    // history is now already the current page items

    const groupHistoryByDate = (items) => {
        const groups = {};
        items.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });
        return groups;
    };

    const groupedHistory = groupHistoryByDate(history);

    if (loading) return <div className="p-4 text-center text-secondary">Loading history...</div>;

    return (
        <div className="history-view" style={{ padding: '0 20px 40px', maxWidth: '800px', margin: '0 auto' }}>
            <header className="mb-6 flex items-center gap-3 pt-6">
                <div style={{
                    width: '40px', height: '40px',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--glass-border)'
                }}>
                    <History size={20} color="var(--primary)" />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Activity History</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Recent inventory changes</p>
                </div>
            </header>

            {/* Edit Modal (Simple Inline) */}
            {editingItem && (
                <div className="modal-overlay" onClick={() => setEditingItem(null)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Entry</h3>
                            <button className="modal-close-btn" onClick={() => setEditingItem(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={new Date(editData.timestamp).toISOString().slice(0, 16)}
                                    onChange={e => setEditData({ ...editData, timestamp: new Date(e.target.value).toISOString() })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editData.note}
                                    onChange={e => setEditData({ ...editData, note: e.target.value })}
                                    placeholder="Add a note..."
                                />
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                Editing other details may cause inconsistencies in inventory.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn secondary" style={{ margin: 0, width: 'auto' }} onClick={() => setEditingItem(null)}>Cancel</button>
                            <button className="btn primary" style={{ width: 'auto' }} onClick={handleEditSave}>Save Changes</button>
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
                    {Object.keys(groupedHistory).map(date => (
                        <div key={date} className="history-group mb-8">
                            <h3 style={{
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                marginBottom: '16px',
                                letterSpacing: '1px',
                                paddingLeft: '8px',
                                fontWeight: 600
                            }}>
                                {date}
                            </h3>
                            <div className="group-items flex flex-col gap-2">
                                {groupedHistory[date].map((item, index) => (
                                    <div key={item.id || index} className="history-item" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                        background: 'transparent',
                                        borderBottom: '1px solid var(--glass-border)',
                                        gap: '16px',
                                        transition: 'background 0.2s'
                                    }}>
                                        <div className="item-icon" style={{
                                            flexShrink: 0,
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-card)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid var(--glass-border)'
                                        }}>
                                            {getIcon(item.actionType)}
                                        </div>
                                        <div className="item-content flex-1">
                                            <div style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                                {renderDetails(item)}
                                            </div>
                                        </div>
                                        <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {/* Edit Button */}
                                            <button
                                                onClick={() => handleEditStart(item)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
                                                title="Edit Entry"
                                            >
                                                <Edit size={14} />
                                            </button>

                                            {/* Revert Button - Only conditionally */}
                                            {isRevertible(item) && (
                                                <button
                                                    onClick={() => handleRevert(item)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warning)', padding: 4 }}
                                                    title="Revert Action"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="item-time" style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'nowrap',
                                            opacity: 0.7,
                                            width: '60px',
                                            textAlign: 'right'
                                        }}>
                                            {formatDate(item.timestamp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}



            {/* Pagination Controls */}
            {
                totalPages > 1 && (
                    <div className="pagination-controls" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '20px',
                        marginTop: '40px',
                        paddingTop: '20px',
                        borderTop: '1px solid var(--glass-border)'
                    }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--glass-border)',
                                color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                opacity: currentPage === 1 ? 0.5 : 1,
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>

                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Page <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--glass-border)',
                                color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                opacity: currentPage === totalPages ? 0.5 : 1,
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )
            }
        </div >
    );
};

export default HistoryView;
