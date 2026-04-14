import React, { Suspense, lazy, useEffect, useState } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import { ToastProvider } from './context/ToastContext';
import Dashboard from './components/Dashboard';
import ModeSwitcher from './components/ModeSwitcher';
import {
  LayoutGrid,
  List,
  PlusCircle,
  Settings,
  History,
  ScrollText,
  Menu,
  X
} from 'lucide-react';
import { buildRoute, getCurrentRoute } from './utils/routeState';
import {
  PREFERENCES_UPDATED_EVENT,
  getDeviceModeOverride,
  getStoredPreferences,
  getStoredTheme,
  setDeviceModeOverride,
  setStoredTheme
} from './utils/preferences';
import './App.css';

const MedicationList = lazy(() => import('./components/MedicationList'));
const AddRestockForm = lazy(() => import('./components/AddRestockForm'));
const PrescriptionGenerator = lazy(() => import('./components/PrescriptionGenerator'));
const DataManagement = lazy(() => import('./components/DataManagement'));
const HistoryView = lazy(() => import('./components/HistoryView'));

const ViewLoadingState = () => (
  <div style={{ padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
    Loading...
  </div>
);

const getResponsiveMode = (width) => {
  if (width >= 1000) return 'computer';
  if (width >= 600) return 'tablet';
  return 'phone';
};

function App() {
  const [autoDeviceMode, setAutoDeviceMode] = useState(() => {
    if (typeof window === 'undefined') return 'phone';
    return getResponsiveMode(window.innerWidth);
  });
  const [deviceModeOverride, setDeviceModeOverrideState] = useState(() => getDeviceModeOverride());
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [route, setRoute] = useState(() => getCurrentRoute());
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const deviceMode = deviceModeOverride === 'auto' ? autoDeviceMode : deviceModeOverride;
  const currentView = route.view;
  const viewParams = route.params;

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    setStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setAutoDeviceMode(getResponsiveMode(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncRoute = () => {
      if (!window.location.hash) {
        window.location.replace(buildRoute('dashboard'));
        return;
      }
      setRoute(getCurrentRoute());
      setIsMoreMenuOpen(false);
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncPreferences = (event) => {
      const prefs = event?.detail || getStoredPreferences();
      if (prefs.theme) setTheme(prefs.theme);
      if (prefs.deviceModeOverride) setDeviceModeOverrideState(prefs.deviceModeOverride);
    };

    window.addEventListener(PREFERENCES_UPDATED_EVENT, syncPreferences);
    return () => window.removeEventListener(PREFERENCES_UPDATED_EVENT, syncPreferences);
  }, []);

  const handleNavigate = (view, params = {}) => {
    if (typeof window === 'undefined') return;
    window.location.hash = buildRoute(view, params);
  };

  const handleDeviceModePreferenceChange = (value) => {
    setDeviceModeOverrideState(value);
    setDeviceModeOverride(value);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'inventory':
        return (
          <Suspense fallback={<ViewLoadingState />}>
            <MedicationList
              key={`inventory:${viewParams.filter || 'all'}:${viewParams.condition || ''}:${viewParams.tag || ''}:${viewParams.location || ''}`}
              initialFilter={viewParams.filter || 'all'}
              initialCondition={viewParams.condition || ''}
              initialTag={viewParams.tag || ''}
              initialLocation={viewParams.location || ''}
              onNavigate={handleNavigate}
            />
          </Suspense>
        );
      case 'add':
        return (
          <Suspense fallback={<ViewLoadingState />}>
            <AddRestockForm
              key={`add:${viewParams.mode || 'default'}:${viewParams.medicationId || ''}`}
              initialMode={viewParams.mode || null}
              initialMedicationId={viewParams.medicationId || null}
              onComplete={({ nextView = 'inventory', params = {} } = {}) => handleNavigate(nextView, params)}
              onNavigate={handleNavigate}
            />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<ViewLoadingState />}>
            <HistoryView />
          </Suspense>
        );
      case 'shopping-list':
        return (
          <Suspense fallback={<ViewLoadingState />}>
            <PrescriptionGenerator
              key={`shopping:${viewParams.medicationId || ''}`}
              initialMedicationId={viewParams.medicationId || null}
              onNavigate={handleNavigate}
            />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<ViewLoadingState />}>
            <DataManagement
              currentMode={deviceMode}
              deviceModeOverride={deviceModeOverride}
              onDeviceModePreferenceChange={handleDeviceModePreferenceChange}
              currentTheme={theme}
              onThemeChange={setTheme}
            />
          </Suspense>
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  const isOverflowView = ['history', 'shopping-list', 'settings'].includes(currentView);

  return (
    <ToastProvider>
      <InventoryProvider>
        {deviceMode === 'computer' && (
          <div className="no-print" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
            <ModeSwitcher
              currentMode={deviceMode}
              onModeChange={handleDeviceModePreferenceChange}
              currentTheme={theme}
              onThemeChange={setTheme}
              onOpenSettings={() => handleNavigate('settings')}
            />
          </div>
        )}

        <div className={`app-container mode-${deviceMode}`}>
          {deviceMode === 'computer' && (
            <aside className="sidebar no-print">
              <div className="sidebar-header">
                <h3>MedPlan</h3>
              </div>
              <nav className="sidebar-nav">
                <button
                  className={`nav-item-side ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleNavigate('dashboard')}
                >
                  <LayoutGrid size={20} />
                  <span>Dashboard</span>
                </button>
                <button
                  className={`nav-item-side ${currentView === 'inventory' ? 'active' : ''}`}
                  onClick={() => handleNavigate('inventory')}
                >
                  <List size={20} />
                  <span>Inventory</span>
                </button>
                <button
                  className={`nav-item-side ${currentView === 'add' ? 'active' : ''}`}
                  onClick={() => handleNavigate('add')}
                >
                  <PlusCircle size={20} />
                  <span>Add</span>
                </button>
                <button
                  className={`nav-item-side ${currentView === 'shopping-list' ? 'active' : ''}`}
                  onClick={() => handleNavigate('shopping-list')}
                >
                  <ScrollText size={20} />
                  <span>Shop List</span>
                </button>
                <button
                  className={`nav-item-side ${currentView === 'history' ? 'active' : ''}`}
                  onClick={() => handleNavigate('history')}
                >
                  <History size={20} />
                  <span>History</span>
                </button>
                <div style={{ flex: 1 }}></div>
                <button
                  className={`nav-item-side ${currentView === 'settings' ? 'active' : ''}`}
                  onClick={() => handleNavigate('settings')}
                >
                  <Settings size={20} />
                  <span>Settings</span>
                </button>
              </nav>
            </aside>
          )}

          <main className="main-content">
            {renderView()}
          </main>

          {deviceMode !== 'computer' && (
            <>
              <nav className="bottom-nav no-print">
                <button
                  className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleNavigate('dashboard')}
                >
                  <LayoutGrid size={24} />
                  <span>Home</span>
                </button>
                <button
                  className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`}
                  onClick={() => handleNavigate('inventory')}
                >
                  <List size={24} />
                  <span>Inventory</span>
                </button>
                <button
                  className={`nav-item ${currentView === 'add' ? 'active' : ''}`}
                  onClick={() => handleNavigate('add')}
                >
                  <PlusCircle size={24} />
                  <span>Add</span>
                </button>
                <button
                  className={`nav-item ${isOverflowView || isMoreMenuOpen ? 'active' : ''}`}
                  onClick={() => setIsMoreMenuOpen((open) => !open)}
                >
                  {isMoreMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  <span>More</span>
                </button>
              </nav>

              {isMoreMenuOpen && (
                <div className="mobile-more-overlay no-print" onClick={() => setIsMoreMenuOpen(false)}>
                  <div className="mobile-more-sheet" onClick={(event) => event.stopPropagation()}>
                    <button className="mobile-more-item" onClick={() => handleNavigate('shopping-list')}>
                      <ScrollText size={20} />
                      <span>Shopping List</span>
                    </button>
                    <button className="mobile-more-item" onClick={() => handleNavigate('history')}>
                      <History size={20} />
                      <span>History</span>
                    </button>
                    <button className="mobile-more-item" onClick={() => handleNavigate('settings')}>
                      <Settings size={20} />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </InventoryProvider>
    </ToastProvider>
  );
}

export default App;
