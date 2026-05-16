import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Public Pages ─────────────────────────────────────────────
import LandingPage from './pages/LandingPage';
import LoginPage   from './pages/LoginPage';
import SignupPage  from './pages/SignupPage';

// ── Workspace App (unchanged) ─────────────────────────────────
import WorkspaceApp from './WorkspaceApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"  element={<LoginPage />}   />
        <Route path="/signup" element={<SignupPage />}  />

        {/* Full workspace */}
        <Route path="/app"    element={<WorkspaceApp />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
