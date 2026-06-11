import React, { useState, useRef, useEffect, createContext } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import PipelineHeader from './PipelineHeader';

const AppLayout = ({
  currentView, setCurrentView, children,
  sidebarOpen, setSidebarOpen,
  onOpenDemoModal,
  onFileUpload,
  isDataLoaded,
  projectName, setProjectName,
  onSaveWorkspace, onLoadWorkspace,
  hasUnsavedChanges, isSaving, saveStatus, session, onSaveToCloud, onLogout
}) => {
  const isDashboard = currentView === 'dashboard';
  const isMlStudio = currentView === 'ml-studio';
  const isDlStudio = currentView === 'dl-studio';
  const isDataPrep = currentView === 'data-prep';

  const toggleSidebar = () => setSidebarOpen(o => !o);

  return (
    /* ── Root: dark class lives here — ALL dark: utilities key off this ── */
    <div className={`h-screen w-screen overflow-hidden flex flex-col
                     bg-[#fff8e7] text-black font-medium
                     transition-none`}>

      {/* IDE Header */}
      <div>
        <Header
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          onOpenDemoModal={onOpenDemoModal}
          onFileUpload={onFileUpload}
          projectName={projectName}
          setProjectName={setProjectName}
          onSaveWorkspace={onSaveWorkspace}
          onLoadWorkspace={onLoadWorkspace}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          saveStatus={saveStatus}
          session={session}
          onSaveToCloud={onSaveToCloud}
          onLogout={onLogout}
        />
      </div>


      {/* Body row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Animated Sidebar */}
        <div>
          <Sidebar
            currentView={currentView}
            setCurrentView={setCurrentView}
            isOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
          />
        </div>

        {/* Main canvas */}
        <main 
          className={`flex-1 min-w-0 transition-none flex flex-col
                      bg-[#ffffff] border-l-[3px] border-black`}
        >
          <PipelineHeader currentView={currentView} />
          
          <div
            id="main-scroll-container"
            className={`flex-1 min-h-0 relative ${
              isDashboard || isMlStudio || isDlStudio
                ? 'overflow-hidden' 
                : 'overflow-y-auto'
            } ${
              !isDashboard && !isMlStudio && !isDlStudio && !isDataPrep
                ? 'p-8'
                : ''
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Status bar */}
      <div>
        <Footer />
      </div>
    </div>
  );
};

export default AppLayout;
