import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DemoDatasetModal from './components/layout/DemoDatasetModal';
import DataPrep from './components/data-prep/DataPrep';
import DashboardCanvas from './components/dashboard/DashboardCanvas';
import MLStudio from './components/ml-studio/MLStudio';
import DLStudio from './components/dl-studio/DLStudio';
import DataSummary from './components/summary/DataSummary';
import FeatureEngineering from './components/feature-engineering/FeatureEngineering';
import 'react-grid-layout/css/styles.css';
import { getSession, logOut } from './utils/auth';
import { saveProject } from './utils/projects';

import axios from 'axios';

function WorkspaceApp({ session: propSession, onSessionChange }) {
  const session = getSession() || propSession;
  const [currentView, setCurrentView] = useState('data-prep');


  // Reset scroll position to top when navigating to a new tab/view
  React.useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
    }
  }, [currentView]);

  // UI / Theme State
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

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!session) {
      navigate('/login');
    }
  }, [session, navigate]);

  // Cloud Save / Load States
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [projectName, setProjectName] = useState('Untitled_Project');

  // Track if initial mount has finished loading state
  const isLoadedRef = useRef(false);

  // Restore project on mount or clean slate
  useEffect(() => {
    const initWorkspace = async () => {
      if (location.state?.projectConfig) {
        const config = location.state.projectConfig;
        setCurrentProjectId(location.state.projectId);
        setProjectName(location.state.projectName || 'Untitled_Project');

        // Restore Backend Data if present
        if (config.rawDataset) {
          try {
            const restoreRes = await axios.post('http://localhost:5000/api/restore', { data: config.rawDataset });
            setDataPreview(restoreRes.data.data_preview);
            setAnomalyReport(restoreRes.data.anomaly_report);
            setIsDataLoaded(true);
          } catch (restoreErr) {
            console.error("Backend restoration failed", restoreErr);
            alert("Warning: Dataset could not be restored to backend. Some features may be disabled.");
          }
        }

        // Restore UI States
        if (config.cleaningActions) setCleaningActions(config.cleaningActions);
        
        if (config.dashboard) {
          setLayout(config.dashboard.layout || []);
          setCards(config.dashboard.cards || []);
        }

        if (config.mlConfig) setMlConfig(config.mlConfig);
        if (config.dlConfig) setDlConfig(config.dlConfig);

        setTimeout(() => {
          isLoadedRef.current = true;
          setHasUnsavedChanges(false);
          setSaveStatus('');
        }, 300);

      } else {
        // Reset backend for a clean slate
        try {
          await axios.post('http://localhost:5000/api/clear');
        } catch (e) {
          console.error("Reset failed", e);
        }
        isLoadedRef.current = true;
      }
    };

    initWorkspace();
  }, [location.state]);

  // Detect changes to set unsaved changes indicator
  useEffect(() => {
    if (!isLoadedRef.current) return;
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  }, [dataPreview, layout, cards, mlConfig, dlConfig, projectName]);

  const saveToCloud = async (nameOverride) => {
    const session = getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    let rawDataset = null;
    try {
      const res = await axios.get('http://localhost:5000/api/export');
      rawDataset = res.data.data;
    } catch (e) {
      console.error("Export dataset failed", e);
    }

    const workspaceState = {
      rawDataset,
      isDataLoaded,
      dataPreview,
      anomalyReport,
      cleaningActions,
      dashboard: { layout, cards },
      mlConfig,
      dlConfig
    };
    
    const finalName = nameOverride || projectName;
    
    try {
      const result = await saveProject(
        finalName,
        workspaceState,
        currentProjectId
      );
      
      setCurrentProjectId(result.id);
      setProjectName(result.project_name);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (err) {
      console.error("Save to cloud failed:", err);
      setSaveStatus('unsaved');
      alert(`Save to Cloud Failed: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [modalProjectName, setModalProjectName] = useState('');

  const handleSaveToCloudTrigger = () => {
    if (currentProjectId) {
      saveToCloud(projectName);
    } else {
      setModalProjectName(projectName === 'Untitled_Project' ? '' : projectName);
      setShowNameModal(true);
    }
  };

  const handleLogout = () => {
    logOut();
    if (onSessionChange) onSessionChange(null);
    navigate('/login');
  };


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

        setShowRestoreModal(true);
      } catch (err) {
        console.error(err);
        alert("Failed to parse workspace file. The file may be corrupted or in an old format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <AppLayout
        currentView={currentView}
        setCurrentView={setCurrentView}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onOpenDemoModal={() => setShowDemoModal(true)}
        onFileUpload={handleFileUpload}
        isDataLoaded={isDataLoaded}
        projectName={projectName}
        setProjectName={setProjectName}
        onSaveWorkspace={handleSaveWorkspace}
        onLoadWorkspace={handleLoadWorkspace}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        saveStatus={saveStatus}
        session={session}
        onSaveToCloud={handleSaveToCloudTrigger}
        onLogout={handleLogout}
      >

        {/* ── View: Data Prep ────────────────────────────────────────── */}
        <div
          style={{
            display: currentView === 'data-prep' ? 'block' : 'none',
            width: '100%'
          }}
          className="animate-in fade-in duration-300"
        >
          <DataPrep 
            dataPreview={dataPreview} 
            isDataLoaded={isDataLoaded} 
            anomalyReport={anomalyReport} 
            onOpenDemoModal={() => setShowDemoModal(true)} 
            setDataPreview={setDataPreview} 
            setAnomalyReport={setAnomalyReport}
          />
        </div>

        {/* ── View: Data Summary ─────────────────────────────────────── */}
        <div
          style={{
            display: currentView === 'data-summary' ? 'block' : 'none',
            width: '100%'
          }}
          className="animate-in fade-in duration-300"
        >
          <DataSummary isDataLoaded={isDataLoaded} />
        </div>

        {/* ── View: Feature Engineering ──────────────────────────────── */}
        <div
          style={{
            display: currentView === 'feature-engineering' ? 'block' : 'none',
            width: '100%'
          }}
          className="animate-in fade-in duration-300"
        >
          <FeatureEngineering isDataLoaded={isDataLoaded} />
        </div>

        {/* ── View: Dashboard ────────────────────────────────────────── */}
        <div
          style={{
            display: currentView === 'dashboard' ? 'flex' : 'none',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
          className="animate-in fade-in duration-300"
        >
          {dataPreview ? (
            <DashboardCanvas
              cards={cards}
              setCards={setCards}
              layout={layout}
              setLayout={setLayout}
              anomalyReport={anomalyReport}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-black w-full">
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
        <div
          style={{
            display: currentView === 'ml-studio' ? 'flex' : 'none',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
          className="animate-in fade-in duration-300"
        >
          <MLStudio 
            anomalyReport={anomalyReport} 
            config={mlConfig} 
            setConfig={setMlConfig} 
          />
        </div>

        {/* ── View: DL Studio ────────────────────────────────────────── */}
        <div
          style={{
            display: currentView === 'dl-studio' ? 'flex' : 'none',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
          className="animate-in fade-in duration-300"
        >
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

      {/* Name Modal */}
      {showNameModal && (
        <div style={{ zIndex: 99999 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-black w-full max-w-[400px] shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Header */}
            <div className="bg-black text-white px-4 py-3 font-black text-sm uppercase">
              NAME YOUR PROJECT
            </div>
            {/* Content */}
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={modalProjectName}
                onChange={(e) => setModalProjectName(e.target.value)}
                placeholder="My Analysis Project"
                className="w-full p-3 border-[3px] border-black bg-[#fef9ef] font-bold text-black placeholder:text-gray-400 focus:outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNameModal(false)}
                  className="px-4 py-2 border-[3px] border-black bg-white text-black font-bold text-xs uppercase hover:bg-gray-100 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    if (modalProjectName.trim()) {
                      saveToCloud(modalProjectName);
                      setShowNameModal(false);
                    } else {
                      alert('Please enter a project name');
                    }
                  }}
                  className="px-4 py-2 border-[3px] border-black bg-[#ffe45e] text-black font-black text-xs uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  SAVE TO CLOUD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Neo-Brutalist Workspace Restored Modal */}
      {showRestoreModal && (
        <div style={{ zIndex: 99999 }} className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#ffe45e] border-[3px] border-black w-full max-w-[420px] shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-black text-white px-5 py-4 font-black text-sm uppercase tracking-wider border-b-[3px] border-black">
              SYSTEM NOTIFICATION
            </div>
            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="font-black text-black text-xl uppercase tracking-wide">WORKSPACE RESTORED</h3>
                <p className="font-bold text-black text-xs">Your analysis environment is fully loaded.</p>
              </div>

              {/* Monospace Code Widget */}
              <div className="bg-[#fef9ef] border-[2px] border-black p-4 font-mono text-xs text-black space-y-1.5 shadow-inner">
                <div>&gt;_ STATUS: 200_OK</div>
                <div>&gt;_ PIPELINE: RESTORED</div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowRestoreModal(false)}
                className="w-full py-3 border-[3px] border-black bg-white text-black font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
              >
                ENTER WORKSPACE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default WorkspaceApp;
