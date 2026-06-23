import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { AlertTriangle, PackageX, Activity, ArrowRight, ShoppingCart, PlusCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getDailyUsageQuantityForMedication } from '../utils/calculations';

const QueueCard = ({ title, subtitle, items, emptyLabel, onNavigate, onTake }) => (
    <section className="dashboard-queue-card">
        <div className="dashboard-queue-header">
            <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </div>
            <span className="dashboard-queue-count">{items.length}</span>
        </div>

        {items.length === 0 ? (
            <div className="dashboard-empty-list">{emptyLabel}</div>
        ) : (
            <div className="dashboard-queue-list">
                {items.map(({ medication, medStats, runout, nextExpiryDays, lowStock, expiringSoon, refillSoon }) => {
                    const quickTakeAmount = getDailyUsageQuantityForMedication(medication);
                    const canQuickTake = Boolean(quickTakeAmount) && Number(medStats.totalQty) > 0;
                    return (
                        <div key={medication.id} className="dashboard-queue-item">
                        <div className="dashboard-queue-main">
                            <div className="dashboard-queue-name">{medication.name}</div>
                            <div className="dashboard-queue-meta">
                                <span>{medStats.totalQty} {medication.defaultUnit}</span>
                                {expiringSoon && typeof nextExpiryDays === 'number' && (
                                    <span>Expires in {Math.max(0, Math.ceil(nextExpiryDays))}d</span>
                                )}
                                {refillSoon && runout?.daysUntilEmpty && (
                                    <span>Runs out in {Math.max(0, Math.ceil(runout.daysUntilEmpty))}d</span>
                                )}
                                {lowStock && <span>Below threshold</span>}
                            </div>
                        </div>

                        <div className="dashboard-queue-actions">
                            <button className="btn ghost-btn" onClick={() => onNavigate('inventory', { filter: 'all', medicationId: medication.id })}>
                                Open
                            </button>
                            <button className="btn ghost-btn" onClick={() => onNavigate('shopping-list', { medicationId: medication.id })}>
                                <ShoppingCart size={14} />
                                Shop
                            </button>
                            {canQuickTake ? (
                                <button className="btn ghost-btn primary-outline" onClick={() => onTake(medication, quickTakeAmount)}>
                                    Take
                                </button>
                            ) : (
                                <button className="btn ghost-btn primary-outline" onClick={() => onNavigate('add', { mode: 'restock', medicationId: medication.id })}>
                                    Restock
                                </button>
                            )}
                        </div>
                        </div>
                    );
                })}
            </div>
        )}
    </section>
);

const Dashboard = ({ onNavigate }) => {
    const { activeMedications, getStats, getDashboardQueues, consumeMedication, loading } = useInventory();
    const toast = useToast();
    const { expiringSoonCount, lowStockCount, projectedEmptyCount } = getStats();
    const queues = getDashboardQueues();

    const handleQuickTake = async (medication, quickTakeAmount) => {
        if (!quickTakeAmount) {
            toast.warning('Add a usage estimate before using quick take.');
            return;
        }

        try {
            await consumeMedication(medication.id, quickTakeAmount, 'Quick take from dashboard');
            toast.success(`Logged ${quickTakeAmount.toFixed(2).replace(/\.00$/, '')} for ${medication.name}`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-empty-state">
                <p style={{ color: 'var(--text-secondary)' }}>Loading inventory...</p>
            </div>
        );
    }

    if (activeMedications.length === 0) {
        return (
            <div className="dashboard-empty-state">
                <div className="dashboard-empty-icon">
                    <PlusCircle size={32} />
                </div>
                <h1>Start your inventory</h1>
                <p>Add your first medication to unlock alerts, restock planning, and activity history.</p>
                <button className="btn primary dashboard-empty-cta" onClick={() => onNavigate('add', { mode: 'create' })}>
                    Create First Medication
                    <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Inventory Overview</h1>
                <p className="subtitle">Focus on the medications that need attention next.</p>
            </header>

            <div className="stats-grid">
                <div
                    className="stat-card critical"
                    onClick={() => onNavigate('inventory', { filter: 'expiring' })}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="icon-wrapper">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{expiringSoonCount}</span>
                        <span className="stat-label">Expiring Soon</span>
                    </div>
                </div>

                <div
                    className="stat-card warning"
                    onClick={() => onNavigate('inventory', { filter: 'low' })}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="icon-wrapper">
                        <PackageX size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{lowStockCount}</span>
                        <span className="stat-label">Low Stock</span>
                    </div>
                </div>

                <div
                    className="stat-card"
                    style={{ boxShadow: '0 4px 20px -5px rgba(168, 85, 247, 0.4)', cursor: 'pointer' }}
                    onClick={() => onNavigate('inventory', { filter: 'projected' })}
                >
                    <div className="icon-wrapper" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)' }}>
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{projectedEmptyCount}</span>
                        <span className="stat-label">Refill Soon</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-action-grid">
                <QueueCard
                    title="Needs Attention Today"
                    subtitle="Top issues across low stock, runout, and expiry."
                    items={queues.attention}
                    emptyLabel="Everything looks stable today."
                    onNavigate={onNavigate}
                    onTake={handleQuickTake}
                />
                <QueueCard
                    title="Expiring Soon"
                    subtitle="Use or rotate these first."
                    items={queues.expiring}
                    emptyLabel="No upcoming expirations in the next 30 days."
                    onNavigate={onNavigate}
                    onTake={handleQuickTake}
                />
                <QueueCard
                    title="Refill Soon"
                    subtitle="Medications that need a shopping decision soon."
                    items={queues.refill}
                    emptyLabel="No refills needed yet."
                    onNavigate={onNavigate}
                    onTake={handleQuickTake}
                />
            </div>
        </div>
    );
};

export default Dashboard;
