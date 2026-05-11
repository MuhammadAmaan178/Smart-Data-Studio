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
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                     transition-colors duration-300
                     ${theme === 'dark' ? 'dark' : ''}`}>

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
          className={`flex-1 min-w-0 transition-colors duration-300
                      bg-gray-100 dark:bg-[#121212]
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
