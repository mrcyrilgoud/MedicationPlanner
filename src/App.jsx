import React, { useState } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import { ToastProvider } from './context/ToastContext';
import Dashboard from './components/Dashboard';
import MedicationList from './components/MedicationList';
import AddRestockForm from './components/AddRestockForm';
import ModeSwitcher from './components/ModeSwitcher';
import { LayoutGrid, List, PlusCircle } from 'lucide-react';
import './App.css';

function App() {
  // Default to phone, but try to detect on mount
  const [deviceMode, setDeviceMode] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1000) return 'computer';
      if (window.innerWidth >= 600) return 'tablet';
    }
    return 'phone';
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});

  const handleNavigate = (view, params = {}) => {
    setCurrentView(view);
    setViewParams(params);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'inventory': return (
        <div style={{ paddingTop: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>
            {viewParams.filter ? (
              viewParams.filter === 'low' ? 'Low Stock Items' :
                viewParams.filter === 'expiring' ? 'Expiring Items' :
                  viewParams.filter === 'projected' ? 'Empty Soon Items' :
                    'Filtered Items'
            ) : 'My Inventory'}
            {viewParams.filter && (
              <button
                onClick={() => setViewParams({})}
                style={{
                  marginLeft: '1rem',
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Clear Filter
              </button>
            )}
          </h2>
          <MedicationList filter={viewParams.filter} />
        </div>
      );
      case 'add': return (
        <div style={{ paddingTop: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Manage Stock</h2>
          <AddRestockForm onComplete={() => handleNavigate('inventory')} />
        </div>
      );
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <ToastProvider>
      <InventoryProvider>
        {/* Mode Switcher Floating */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <ModeSwitcher currentMode={deviceMode} onModeChange={setDeviceMode} />
        </div>

        <div className={`app-container mode-${deviceMode}`}>

          {/* Sidebar for Computer Mode */}
          {deviceMode === 'computer' && (
            <aside className="sidebar">
              <div className="sidebar-header">
                <h3>MedPlan</h3>
              </div>
              <nav className="sidebar-nav">
                <button
                  className={`nav-item-side ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setCurrentView('dashboard')}
                >
                  <LayoutGrid size={20} />
                  <span>Dashboard</span>
                </button>
                <button
                  className={`nav-item-side ${currentView === 'inventory' ? 'active' : ''}`}
                  onClick={() => setCurrentView('inventory')}
                >
                  <List size={20} />
                  <span>Inventory</span>
                </button>
                <button
                  className={`nav-item-side ${currentView === 'add' ? 'active' : ''}`}
                  onClick={() => setCurrentView('add')}
                >
                  <PlusCircle size={20} />
                  <span>Add</span>
                </button>
              </nav>
            </aside>
          )}

          <main className="main-content">
            {renderView()}
          </main>

          {/* Bottom Nav for Phone/Tablet */}
          {deviceMode !== 'computer' && (
            <nav className="bottom-nav">
              <button
                className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('dashboard')}
              >
                <LayoutGrid size={24} />
                <span>Dashboard</span>
              </button>
              <button
                className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`}
                onClick={() => setCurrentView('inventory')}
              >
                <List size={24} />
                <span>Inventory</span>
              </button>
              <button
                className={`nav-item ${currentView === 'add' ? 'active' : ''}`}
                onClick={() => setCurrentView('add')}
              >
                <PlusCircle size={24} />
                <span>Add</span>
              </button>
            </nav>
          )}
        </div>
      </InventoryProvider>
    </ToastProvider>
  );
}

export default App;
