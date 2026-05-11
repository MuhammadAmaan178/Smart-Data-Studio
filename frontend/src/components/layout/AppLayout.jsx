import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const AppLayout = ({
  currentView, setCurrentView, children,
  theme, setTheme,
  sidebarOpen, setSidebarOpen,
  onOpenDemoModal,
  onFileUpload,
  isDataLoaded,
  projectName, setProjectName,
  onSaveWorkspace, onLoadWorkspace
}) => {
  const isDashboard = currentView === 'dashboard';

  const toggleTheme   = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const toggleSidebar = () => setSidebarOpen(o => !o);

  return (
    /* ── Root: dark class lives here — ALL dark: utilities key off this ── */
    <div className={`h-screen w-screen overflow-hidden flex flex-col
                     bg-[#fff8e7] text-black font-medium
                     transition-none`}>

      {/* IDE Header */}
      <div>
        <Header
          theme={theme}
          toggleTheme={toggleTheme}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          onOpenDemoModal={onOpenDemoModal}
          onFileUpload={onFileUpload}
          projectName={projectName}
          setProjectName={setProjectName}
          onSaveWorkspace={onSaveWorkspace}
          onLoadWorkspace={onLoadWorkspace}
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
          className={`flex-1 min-w-0 transition-none
                      bg-[#ffffff] border-l-[3px] border-black
                      ${isDashboard ? 'overflow-hidden relative' : 'overflow-y-auto p-8'}`}
        >
          {children}
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
