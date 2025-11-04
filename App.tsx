import React, { useState, useReducer, useEffect } from 'react';
import type { AppState, AppAction, DailyData, StandardMedPattern } from './types';
import { INITIAL_APP_STATE } from './constants';
import DailyLog from './components/DailyLog';
import Settings from './components/Settings';
import { hashPassword } from './services/cryptoService';
import { getEncryptedAppState, lookupOrCreateVault } from './services/jsonbinService';

// --- SVGs ---
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.73l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const SpinnerIcon = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- App Reducer ---
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'SAVE_DAY':
      return {
        ...state,
        allData: {
          ...state.allData,
          [action.payload.date]: action.payload,
        },
      };
    case 'UPDATE_MEDICATION_LIST':
      return { ...state, medicationList: action.payload };
    case 'UPDATE_STANDARD_MED_PATTERN':
      return { ...state, standardMedPattern: action.payload };
    default:
      return state;
  }
};

// --- Custom Hook for Local Storage ---
const useLocalStorageReducer = (key: string, reducer: React.Reducer<AppState, AppAction>, initialState: AppState) => {
  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    try {
      const storedItem = window.localStorage.getItem(key);
      return storedItem ? JSON.parse(storedItem) : initial;
    } catch (error) {
      console.error('Error al leer de localStorage', error);
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error al guardar en localStorage', error);
    }
  }, [key, state]);

  return [state, dispatch] as const;
};

// --- Login Screen Component ---
interface LoginProps {
  onLoginSuccess: (loadedState: AppState, password: string, binId: string) => void;
  onWorkOffline: () => void;
}
const MasterPasswordScreen: React.FC<LoginProps> = ({ onLoginSuccess, onWorkOffline }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Se requiere una contraseña maestra.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Hash password to get a user identifier
      const userHash = await hashPassword(password);
      
      // 2. Find or create the user's encrypted data vault
      const binId = await lookupOrCreateVault(userHash);
      
      // 3. Attempt to load and decrypt data from the vault
      const loadedState = await getEncryptedAppState(binId, password);
      
      // If loadedState is null, it's a new user. We'll use the initial state.
      onLoginSuccess(loadedState || INITIAL_APP_STATE, password, binId);

    } catch (err: any) {
      if (err.message && err.message.startsWith('Configuration error on server.')) {
        // Extract the specific missing variables message part.
        const detail = err.message.replace('Configuration error on server.', '').trim().replace('Missing environment variable:', 'Falta la variable de entorno:').replace('Missing:', 'Faltan:');
        setError(`El servicio de sincronización en la nube no está configurado. ${detail} Puede continuar para trabajar sin conexión.`);
      } else {
        setError(err.message || 'Ha ocurrido un error inesperado.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Protege y Sincroniza tus Datos</h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">Crea una contraseña maestra para guardar tus datos de forma segura, o ingresa la existente para sincronizar.</p>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Contraseña Maestra</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 text-gray-800 bg-gray-200 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              placeholder="Crea o ingresa tu frase secreta"
            />
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Si es tu primera vez, la contraseña que ingreses aquí se convertirá en tu clave de acceso. <strong>¡No la olvides!</strong> No se puede recuperar.
            </p>
          </div>
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center disabled:bg-blue-400 dark:disabled:bg-blue-800">
            {loading ? <SpinnerIcon /> : 'Continuar'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={onWorkOffline} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
            Trabajar sin conexión
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [authState, setAuthState] = useState({ loggedIn: false, password: '', binId: '' });
  const [activeTab, setActiveTab] = useState<'log' | 'settings'>('log');
  const [state, dispatch] = useLocalStorageReducer('healthTrackerState', appReducer, INITIAL_APP_STATE);

  const handleSaveDay = (data: DailyData) => dispatch({ type: 'SAVE_DAY', payload: data });
  const handleUpdateMedicationList = (list: string[]) => dispatch({ type: 'UPDATE_MEDICATION_LIST', payload: list });
  const handleUpdateStandardMedPattern = (pattern: StandardMedPattern) => dispatch({ type: 'UPDATE_STANDARD_MED_PATTERN', payload: pattern });
  const handleSetState = (newState: AppState) => dispatch({ type: 'SET_STATE', payload: newState });

  const handleLoginSuccess = (loadedState: AppState, password: string, binId: string) => {
    handleSetState(loadedState);
    setAuthState({ loggedIn: true, password, binId });
  };
  
  const handleWorkOffline = () => {
    // Just log in without sync credentials
    setAuthState({ loggedIn: true, password: '', binId: '' });
  };


  if (!authState.loggedIn) {
    return <MasterPasswordScreen onLoginSuccess={handleLoginSuccess} onWorkOffline={handleWorkOffline} />;
  }

  const TabButton: React.FC<{ tab: 'log' | 'settings', children: React.ReactNode }> = ({ tab, children }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
          isActive
            ? 'bg-white dark:bg-gray-800 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
        }`}
      >
        {children}
      </button>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100">Rastreador de Salud Diario</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Registra y visualiza tu información de salud día a día.</p>
        </header>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <TabButton tab="log">
              <CalendarIcon />
              Registro Diario
            </TabButton>
            <TabButton tab="settings">
              <SettingsIcon />
              Configuración
            </TabButton>
          </nav>
        </div>

        <main className="mt-6 bg-white dark:bg-gray-800 rounded-b-lg rounded-r-lg shadow-lg p-6">
          {activeTab === 'log' && (
            <DailyLog
              allData={state.allData}
              medicationList={state.medicationList}
              standardMedPattern={state.standardMedPattern}
              onSave={handleSaveDay}
            />
          )}
          {activeTab === 'settings' && (
            <Settings
              appState={state}
              authState={authState}
              onUpdateMedicationList={handleUpdateMedicationList}
              onUpdateStandardMedPattern={handleUpdateStandardMedPattern}
              onSetState={handleSetState}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;