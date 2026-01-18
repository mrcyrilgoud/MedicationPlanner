import React, { useState } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import { ToastProvider } from './context/ToastContext';
import Dashboard from './components/Dashboard';
import MedicationList from './components/MedicationList';
import AddRestockForm from './components/AddRestockForm';
import { LayoutGrid, List, PlusCircle } from 'lucide-react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'inventory': return (
        <div style={{ paddingTop: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>My Inventory</h2>
          <MedicationList />
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
        <div className="app-container">
          <main className="main-content">
            {renderView()}
          </main>

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
        </div>
      </InventoryProvider>
    </ToastProvider>
  );
}

export default App;
