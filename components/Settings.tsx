import React, { useState, useEffect } from 'react';
import type { AppState, StandardMedPattern } from '../types';
import { getEncryptedAppState, updateEncryptedAppState } from '../services/jsonbinService';
import { TIME_SLOTS } from '../constants';

// --- SVGs ---
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const PillIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line></svg>;
const DatabaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>;
const SyncIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M3 16v-4h4"/><path d="M21 8v4h-4"/></svg>;

interface SettingsProps {
  appState: AppState;
  authState: { loggedIn: boolean; password: string; binId: string; };
  onUpdateMedicationList: (list: string[]) => void;
  onUpdateStandardMedPattern: (pattern: StandardMedPattern) => void;
  onSetState: (newState: AppState) => void;
}

type SettingsTab = 'meds' | 'pattern' | 'data';

const Settings: React.FC<SettingsProps> = ({
  appState,
  authState,
  onUpdateMedicationList,
  onUpdateStandardMedPattern,
  onSetState,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('meds');
  const [newMed, setNewMed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPattern, setTempPattern] = useState<StandardMedPattern>(appState.standardMedPattern);
  
  useEffect(() => {
    setTempPattern(appState.standardMedPattern);
  }, [appState.standardMedPattern, activeTab]);
  
  // Medication List Handlers
  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMed && !appState.medicationList.includes(newMed)) {
      onUpdateMedicationList([...appState.medicationList, newMed]);
      setNewMed('');
    }
  };

  const handleDeleteMed = (medToDelete: string) => {
    const newMedList = appState.medicationList.filter(med => med !== medToDelete);
    onUpdateMedicationList(newMedList);

    const cleanPattern = (pattern: StandardMedPattern): StandardMedPattern => {
        const newPattern: StandardMedPattern = {};
        for (const time in pattern) {
            const meds = pattern[time].filter(m => m !== medToDelete);
            if (meds.length > 0) {
                newPattern[time] = meds;
            }
        }
        return newPattern;
    };
    
    onUpdateStandardMedPattern(cleanPattern(appState.standardMedPattern));
    setTempPattern(cleanPattern(tempPattern));
  };
  
  // Standard Pattern Handlers
  const handlePatternChange = (time: string, selectedOptions: HTMLCollection) => {
    const values = Array.from(selectedOptions).map((option: any) => option.value);
    setTempPattern(prev => ({ ...prev, [time]: values }));
  };

  const handleSavePattern = () => {
    onUpdateStandardMedPattern(tempPattern);
    alert('Patrón estándar guardado.');
  };

  // Data Management Handlers
  const handleDownload = () => {
    const dataStr = JSON.stringify(appState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result === 'string') {
            const newState = JSON.parse(result);
            if (window.confirm('¿Estás seguro de que quieres sobreescribir todos tus datos locales con este archivo?')) {
              onSetState(newState);
              alert('Datos cargados correctamente.');
            }
          }
        } catch (err) {
          alert('Error al leer el archivo. Asegúrate de que es un JSON válido.');
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input
    }
  };

  const handleSync = async () => {
    if (!authState.binId || !authState.password) {
        setError("No se ha iniciado sesión con una contraseña maestra. No se puede sincronizar.");
        return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
        await updateEncryptedAppState(authState.binId, authState.password, appState);
        setSuccess('¡Datos sincronizados con la nube correctamente!');
    } catch (e: any) {
        if (e.message && e.message.startsWith('Configuration error on server.')) {
          const detail = e.message.replace('Configuration error on server.', '').trim().replace('Missing environment variable:', 'Falta la variable de entorno:').replace('Missing:', 'Faltan:');
          setError(`El servicio de sincronización no está configurado. ${detail} No se pueden guardar los datos en la nube.`);
        } else {
          setError(e.message || 'Error al sincronizar los datos.');
        }
    } finally {
        setLoading(false);
        setTimeout(() => setSuccess(''), 5000);
    }
  };
  

  const TabButton: React.FC<{ tab: SettingsTab, children: React.ReactNode }> = ({ tab, children }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
          isActive
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 px-6" aria-label="Settings Tabs">
          <TabButton tab="meds"><PillIcon /> Medicamentos</TabButton>
          <TabButton tab="pattern"><ListIcon /> Patrón Estándar</TabButton>
          <TabButton tab="data"><DatabaseIcon /> Gestión de Datos</TabButton>
        </nav>
      </div>
      <div className="p-6 min-h-[400px]">
        {activeTab === 'meds' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Lista de Medicamentos</h3>
            <form onSubmit={handleAddMed} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                placeholder="Añadir nuevo medicamento"
                className="flex-grow bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1">
                <PlusIcon /> Añadir
              </button>
            </form>
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {appState.medicationList.map(med => (
                <li key={med} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm">
                  <span>{med}</span>
                  <button onClick={() => handleDeleteMed(med)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === 'pattern' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Patrón de Medicación Estándar</h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
              {TIME_SLOTS.map(time => (
                <div key={time} className="grid grid-cols-3 gap-4 items-center">
                  <label className="font-medium text-right">{time}</label>
                  <div className="col-span-2">
                    <select
                      multiple
                      value={tempPattern[time] || []}
                      onChange={e => handlePatternChange(time, e.target.selectedOptions)}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1 focus:ring-blue-500 focus:border-blue-500 h-20"
                    >
                      {appState.medicationList.map(med => <option key={med} value={med}>{med}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <button onClick={handleSavePattern} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 ml-auto">
                <SaveIcon /> Guardar Patrón
              </button>
            </div>
          </div>
        )}
        {activeTab === 'data' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Gestión de Datos</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 space-y-4">
                <h4 className="font-semibold text-lg">Sincronización en la Nube</h4>
                 <p className="text-sm text-gray-600 dark:text-gray-400">Guarda tus datos de forma segura en la nube para acceder a ellos desde cualquier dispositivo con tu contraseña maestra.</p>
                {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
                {success && <p className="text-green-600 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm">{success}</p>}
                <button 
                  onClick={handleSync} 
                  disabled={loading || !authState.binId} 
                  className="w-full flex items-center justify-center gap-2 text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed"
                >
                  <SyncIcon /> {loading ? 'Sincronizando...' : 'Sincronizar Datos'}
                </button>
                 {!authState.binId && <p className="text-xs text-center text-gray-500 dark:text-gray-400">Inicia sesión con tu contraseña maestra para activar la sincronización.</p>}
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 space-y-4">
                <h4 className="font-semibold text-lg">Fichero Local</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Guarda o carga todos tus datos desde un archivo en tu dispositivo. Esto no afecta a tus datos en la nube.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleDownload} className="w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Descargar Copia Local (JSON)</button>
                  <label className="w-full text-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer">
                    Cargar desde Copia Local (JSON)
                    <input type="file" accept=".json" onChange={handleUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;