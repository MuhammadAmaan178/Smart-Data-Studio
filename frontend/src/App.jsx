import React, { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import DemoDatasetModal from './components/layout/DemoDatasetModal';
import UploadPreview from './components/data-prep/UploadPreview';
import DataCleaningUI from './components/data-prep/DataCleaningUI';
import DashboardCanvas from './components/dashboard/DashboardCanvas';
import MLStudio from './components/ml-studio/MLStudio';
import DLStudio from './components/dl-studio/DLStudio';
import DataSummary from './components/summary/DataSummary';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import axios from 'axios';

function App() {
  const [currentView, setCurrentView] = useState('data-prep');

  // UI / Theme State
  const [theme,       setTheme]       = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Demo modal
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Data State
  const [dataPreview,     setDataPreview]     = useState(null);
  const [anomalyReport,   setAnomalyReport]   = useState(null);
  const [cleaningActions, setCleaningActions] = useState([]);
  const [isDataLoaded,    setIsDataLoaded]    = useState(false);

  // Dashboard State
  const [layout, setLayout] = useState([]);
  const [cards,  setCards]  = useState([]);

  // ML Studio State (Lifted for Serialization)
  const [mlConfig, setMlConfig] = useState({
    task: 'classification',
    algorithm: 'knn',
    targetCol: '',
    featureCols: [],
    results: null
  });

  // DL Studio State (Lifted for Serialization)
  const [dlConfig, setDlConfig] = useState({
    targetCol: '',
    featureCols: [],
    hiddenLayers: [{ neurons: 16, activation: 'relu' }],
    results: null
  });

  // Project Info
  const [projectName, setProjectName] = useState('Untitled_Project.sds');

  // Reset backend on mount for a clean slate
  React.useEffect(() => {
    axios.post('http://localhost:5000/api/clear').catch(e => console.error("Reset failed", e));
  }, []);

  // Called by DemoDatasetModal after a successful load
  const handleDemoLoaded = (data) => {
    setDataPreview(data.data_preview);
    setAnomalyReport(data.anomaly_report);
    setCleaningActions([]);
    setIsDataLoaded(true);
    setCurrentView('data-prep');   // bring user to Data Prep so they see the preview
  };

  // Global File Upload Handler
  const handleFileUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDataPreview(res.data.data_preview);
      setAnomalyReport(res.data.anomaly_report);
      setCleaningActions([]);
      setIsDataLoaded(true);
      setCurrentView('data-prep');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error uploading file');
    }
  };

  // Workspace Serialization (Save)
  const handleSaveWorkspace = async () => {
    try {
      // Fetch the full dataset from backend to make the file self-contained
      const res = await axios.get('http://localhost:5000/api/export');
      const rawDataset = res.data.data; // New structure: { success: true, data: [...] }

      const workspaceState = {
        version: "1.1",
        projectName,
        isDataLoaded,
        rawDataset,
        dataPreview,
        anomalyReport,
        cleaningActions,
        dashboard: { layout, cards },
        mlConfig,
        dlConfig
      };
      const blob = new Blob([JSON.stringify(workspaceState, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = projectName.endsWith('.sds') ? projectName : `${projectName}.sds`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Connection to backend failed. Please ensure the server is running.";
      alert(`Save Workspace Failed: ${msg}`);
    }
  };

  // Workspace Restoration (Load)
  const handleLoadWorkspace = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const state = JSON.parse(e.target.result);
        
        // 1. Restore Backend Data if present
        if (state.rawDataset) {
          try {
            // Push full data back to server
            const restoreRes = await axios.post('http://localhost:5000/api/restore', { data: state.rawDataset });
            // Refresh data preview and anomaly report from the live backend response
            setDataPreview(restoreRes.data.data_preview);
            setAnomalyReport(restoreRes.data.anomaly_report);
          } catch (restoreErr) {
            console.error("Backend restoration failed", restoreErr);
            alert("Warning: Dataset could not be restored to backend. Some features may be disabled.");
          }
        }

        // 2. Restore UI States
        if (state.projectName)     setProjectName(state.projectName);
        if (state.isDataLoaded)    setIsDataLoaded(state.isDataLoaded);
        if (state.cleaningActions) setCleaningActions(state.cleaningActions);
        
        if (state.dashboard) {
          setLayout(state.dashboard.layout || []);
          setCards(state.dashboard.cards || []);
        }

        if (state.mlConfig) setMlConfig(state.mlConfig);
        if (state.dlConfig) setDlConfig(state.dlConfig);

        alert("Workspace fully restored!");
      } catch (err) {
        console.error(err);
        alert("Failed to parse workspace file. The file may be corrupted or in an old format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <AppLayout
        currentView={currentView}
        setCurrentView={setCurrentView}
        theme={theme}
        setTheme={setTheme}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onOpenDemoModal={() => setShowDemoModal(true)}
        onFileUpload={handleFileUpload}
        isDataLoaded={isDataLoaded}
        projectName={projectName}
        setProjectName={setProjectName}
        onSaveWorkspace={handleSaveWorkspace}
        onLoadWorkspace={handleLoadWorkspace}
      >

        {/* ── View: Data Prep ────────────────────────────────────────── */}
        <div className={`${currentView === 'data-prep' ? 'block' : 'hidden'} max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300`}>
          <UploadPreview
            dataPreview={dataPreview}
            isDataLoaded={isDataLoaded}
            onOpenDemoModal={() => setShowDemoModal(true)}
          />

          {anomalyReport && (
            <DataCleaningUI
              anomalyReport={anomalyReport}
              cleaningActions={cleaningActions}
              setCleaningActions={setCleaningActions}
              setDataPreview={setDataPreview}
              setAnomalyReport={setAnomalyReport}
            />
          )}
        </div>

        {/* ── View: Data Summary ─────────────────────────────────────── */}
        <div className={`${currentView === 'data-summary' ? 'block' : 'hidden'} animate-in fade-in duration-300`}>
          <DataSummary isDataLoaded={isDataLoaded} />
        </div>

        {/* ── View: Dashboard ────────────────────────────────────────── */}
        <div className={`${currentView === 'dashboard' ? 'block h-full' : 'hidden'} animate-in fade-in duration-300`}>
          {dataPreview ? (
            <DashboardCanvas
              cards={cards}
              setCards={setCards}
              layout={layout}
              setLayout={setLayout}
              anomalyReport={anomalyReport}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-black">
              <div className="p-4 bg-[#ff499e] border-[3px] border-black rounded-full mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3 className="text-2xl font-black text-black uppercase">No Data Available</h3>
              <p className="mt-2 text-sm font-bold uppercase">Upload a CSV or load a demo dataset to start building your dashboard.</p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setCurrentView('data-prep')}
                  className="neo-btn neo-btn-primary px-5 py-2"
                >
                  GO TO DATA PREP
                </button>
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="neo-btn px-5 py-2 bg-white"
                >
                  TRY DEMO DATASET
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── View: ML Studio ────────────────────────────────────────── */}
        <div className={`${currentView === 'ml-studio' ? 'block h-full' : 'hidden'} animate-in fade-in duration-300`}>
          <MLStudio 
            anomalyReport={anomalyReport} 
            config={mlConfig} 
            setConfig={setMlConfig} 
          />
        </div>

        {/* ── View: DL Studio ────────────────────────────────────────── */}
        <div className={`${currentView === 'dl-studio' ? 'block h-full' : 'hidden'} animate-in fade-in duration-300`}>
          <DLStudio 
            anomalyReport={anomalyReport} 
            config={dlConfig} 
            setConfig={setDlConfig} 
          />
        </div>

      </AppLayout>

      {/* Demo modal — rendered outside AppLayout so it overlays everything */}
      {showDemoModal && (
        <DemoDatasetModal
          onClose={() => setShowDemoModal(false)}
          onDemoLoaded={handleDemoLoaded}
        />
      )}
    </>
  );
}

export default App;
