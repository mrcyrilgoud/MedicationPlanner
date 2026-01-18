import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { AlertTriangle, PackageX, Activity } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
    const { getStats } = useInventory();
    const { expiringSoonCount, lowStockCount } = getStats();

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Inventory Overview</h1>
                <p className="subtitle">Track your medical stockpile health.</p>
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
                        <span className="stat-label">Expiring Soon (30 days)</span>
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
                        <span className="stat-label">Low Stock Items</span>
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
                        <span className="stat-value">{getStats().projectedEmptyCount}</span>
                        <span className="stat-label">Empty in &lt; 7 Days</span>
                    </div>
                </div>
            </div>

            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                    <button className="btn primary" onClick={() => onNavigate('inventory')}>
                        View Full Inventory
                    </button>
                    <button className="btn secondary" onClick={() => onNavigate('add')}>
                        + Add New Medication
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
