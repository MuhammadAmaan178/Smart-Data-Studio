import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../utils/timeAgo';
import { FolderOpen, Trash2, FileText, LogOut, Plus } from 'lucide-react';
import { getSession, logOut } from '../utils/auth';
import { fetchProjects as apiFetchProjects, deleteProject as apiDeleteProject } from '../utils/projects';

const ProjectsPage = ({ session: propSession, onSessionChange }) => {
  const navigate = useNavigate();
  const session = getSession() || propSession;

  useEffect(() => {
    if (!session) {
      navigate('/login');
    }
  }, [session, navigate]);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const session = getSession();
      console.log('SESSION:', session);
      
      const data = await apiFetchProjects();
      console.log('PROJECTS DATA:', data);
      
      setProjects(data || []);
    } catch (err) {
      console.error('FETCH ERROR:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    fetchProjects();
    return () => clearTimeout(timeout);
  }, []);

  const handleLogout = () => {
    logOut();
    if (onSessionChange) onSessionChange(null);
    navigate('/login');
  };

  const createNewProject = () => {
    // Navigate to /app with null state for a fresh project
    navigate('/app', { state: null });
  };

  const deleteProject = async (projectId) => {
    if (!session) return;
    try {
      await apiDeleteProject(projectId);

      // Remove from local state immediately (optimistic update)
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (confirmDeleteId === projectId) {
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project. Please try again.');
    }
  };

  const loadProject = (project) => {
    navigate('/app', { 
      state: { 
        projectConfig: project.configuration,
        projectId: project.id,
        projectName: project.project_name
      } 
    });
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#fef9ef] text-black font-medium flex flex-col">
      {/* HEADER BAR */}
      <header className="bg-black text-white h-16 px-6 flex items-center justify-between border-b-[4px] border-black">
        {/* Left: Logo box & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ffe45e] border-[3px] border-black flex items-center justify-center text-black font-black text-xl shadow-[2px_2px_0px_#fff] transform -rotate-3">
            S
          </div>
          <span className="font-black tracking-widest text-sm uppercase select-none">
            SMART DATASTUDIO
          </span>
        </div>

        {/* Right: User Email & Log Out */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-300 font-bold hidden sm:inline">
            {session?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-black uppercase text-white
                       border-[2px] border-white px-3 py-1.5 bg-transparent
                       hover:bg-white hover:text-black transition-colors cursor-pointer"
          >
            <LogOut size={12} strokeWidth={3} />
            LOG OUT
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 flex flex-col">
        {/* HERO SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-[4px] border-black pb-8 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-black">
              YOUR PROJECTS
            </h1>
            <p className="text-sm font-bold text-gray-700 uppercase mt-2">
              Pick up where you left off
            </p>
          </div>
          <div>
            <button
              onClick={createNewProject}
              className="flex items-center gap-2 px-6 py-3 bg-[#ffe45e] text-black font-black text-sm uppercase
                         border-[3px] border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]
                         hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]
                         active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                         transition-all duration-75 cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} />
              NEW PROJECT
            </button>
          </div>
        </div>

        {/* PROJECTS GRID / LOADING / EMPTY STATES */}
        {loading ? (
          /* 3 Skeleton Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] p-6 space-y-4 relative overflow-hidden"
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: '1.5s', animationIterationCount: 'infinite' }} />
                
                <div className="h-6 bg-gray-200 border-2 border-black/10 w-2/3 animate-pulse" />
                <div className="h-4 bg-gray-200 border-2 border-black/10 w-1/3 animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-5 bg-gray-200 border-2 border-black/10 w-16 animate-pulse" />
                  <div className="h-5 bg-gray-200 border-2 border-black/10 w-20 animate-pulse" />
                </div>
                <div className="border-t-2 border-black/10 pt-4 flex justify-between items-center">
                  <div className="h-4 bg-gray-200 border-2 border-black/10 w-12 animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 border-2 border-black/10 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="p-6 bg-gray-100 border-[3px] border-black rounded-full mb-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <FolderOpen size={48} className="text-gray-500" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-black uppercase">NO PROJECTS YET</h3>
            <p className="mt-2 text-sm font-bold text-gray-600 uppercase max-w-sm">
              Start a new project to see it here
            </p>
            <button
              onClick={createNewProject}
              className="mt-6 px-6 py-3 bg-[#ffe45e] text-black font-black text-sm uppercase
                         border-[3px] border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]
                         hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]
                         active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                         transition-all duration-75 cursor-pointer"
            >
              NEW PROJECT
            </button>
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const config = project.configuration || {};
              const hasDataset = !!config.rawDataset;
              const hasML = !!config.mlConfig?.results;
              const hasDL = !!config.dlConfig?.results;
              const hasDashboard = !!(config.dashboard?.cards && config.dashboard?.cards.length > 0);

              return (
                <div
                  key={project.id}
                  className="bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]
                             hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]
                             transition-all duration-100 flex flex-col justify-between"
                >
                  {/* Top section: Clickable to load project */}
                  <div
                    onClick={() => loadProject(project)}
                    className="p-6 cursor-pointer flex-1 flex flex-col"
                  >
                    <h2 className="text-xl font-black uppercase text-black mb-1 line-clamp-2">
                      {project.project_name}
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-4">
                      Last edited: {timeAgo(project.updated_at)}
                    </p>
                    
                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {hasDataset && (
                        <span className="px-2 py-0.5 border-[2px] border-black font-black text-[10px] uppercase bg-[#ffe45e] text-black shadow-[1px_1px_0px_#000]">
                          DATASET
                        </span>
                      )}
                      {hasML && (
                        <span className="px-2 py-0.5 border-[2px] border-black font-black text-[10px] uppercase bg-[#00f0ff] text-black shadow-[1px_1px_0px_#000]">
                          ML MODEL
                        </span>
                      )}
                      {hasDL && (
                        <span className="px-2 py-0.5 border-[2px] border-black font-black text-[10px] uppercase bg-[#ff499e] text-black shadow-[1px_1px_0px_#000]">
                          DL NETWORK
                        </span>
                      )}
                      {hasDashboard && (
                        <span className="px-2 py-0.5 border-[2px] border-black font-black text-[10px] uppercase bg-[#ff9f43] text-black shadow-[1px_1px_0px_#000]">
                          DASHBOARD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom section: Metadata & Delete */}
                  <div className="px-6 py-4 bg-gray-50 border-t-[3px] border-black flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase">
                      <FileText size={14} />
                      <span>.sds</span>
                    </div>

                    {confirmDeleteId === project.id ? (
                      <button
                        onClick={() => deleteProject(project.id)}
                        onMouseLeave={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 bg-[#ff1744] text-white border-[2px] border-black font-black text-[10px] uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#d81b60] transition-colors cursor-pointer"
                      >
                        CONFIRM DELETE?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(project.id)}
                        className="p-1.5 bg-[#ff499e] text-white border-[2px] border-black hover:bg-[#e03a89] transition-all cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      >
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectsPage;
