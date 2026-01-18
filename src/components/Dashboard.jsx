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
                <div className="stat-card critical">
                    <div className="icon-wrapper">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{expiringSoonCount}</span>
                        <span className="stat-label">Expiring Soon (30 days)</span>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="icon-wrapper">
                        <PackageX size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{lowStockCount}</span>
                        <span className="stat-label">Low Stock Items</span>
                    </div>
                </div>

                <div className="stat-card good">
                    <div className="icon-wrapper">
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">Active</span>
                        <span className="stat-label">System Status</span>
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
