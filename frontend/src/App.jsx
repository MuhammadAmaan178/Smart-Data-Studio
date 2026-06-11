import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { verifySession, getSession } from './utils/auth';

// ── Public Pages ─────────────────────────────────────────────
import LandingPage from './pages/LandingPage';
import LoginPage   from './pages/LoginPage';
import SignupPage  from './pages/SignupPage';

// ── Projects Page ────────────────────────────────────────────
import ProjectsPage from './pages/ProjectsPage';

// ── Workspace App ─────────────────────────────────────────────
import WorkspaceApp from './WorkspaceApp';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First check local token quickly
    const localSession = getSession();
    if (localSession) {
      setSession(localSession);
      setLoading(false);
      // Then verify with server in background
      verifySession().then(verified => {
        if (!verified) setSession(null);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleSessionChange = (newSession) => {
    setSession(newSession);
  };

  if (loading) return (
    <div style={{ 
      display: 'flex', alignItems: 'center', 
      justifyContent: 'center', height: '100vh',
      background: '#fef9ef', fontWeight: 'bold',
      fontSize: '18px', fontFamily: 'Arial Black',
      letterSpacing: '2px'
    }}>
      LOADING...
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/"       element={<LandingPage session={session} />} />
        
        {/* Auth routes - redirect if already logged in */}
        <Route path="/login"  element={
          session ? <Navigate to="/projects" replace /> 
                  : <LoginPage onSessionChange={handleSessionChange} />
        } />
        <Route path="/signup" element={
          session ? <Navigate to="/projects" replace /> 
                  : <SignupPage onSessionChange={handleSessionChange} />
        } />

        {/* Protected routes */}
        <Route path="/app" element={
          session ? <WorkspaceApp session={session} onSessionChange={handleSessionChange} /> 
                  : <Navigate to="/login" replace />
        } />
        
        <Route path="/projects" element={
          session ? <ProjectsPage session={session} onSessionChange={handleSessionChange} />
                  : <Navigate to="/login" replace />
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
