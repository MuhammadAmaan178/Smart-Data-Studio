import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, LayoutDashboard, BrainCircuit, Network,
  ArrowRight, Zap
} from 'lucide-react';

/* ─── Reusable NeoButton ─────────────────────────────────── */
const NeoBtn = ({ children, onClick, variant = 'yellow', className = '' }) => {
  const variants = {
    yellow: 'bg-[#ffe45e] text-black border-[3px] border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    cyan:   'bg-[#00f0ff] text-black border-[3px] border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    pink:   'bg-[#ff499e] text-black border-[3px] border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    outline:'bg-transparent text-black border-[3px] border-black shadow-[4px_4px_0px_#000] hover:bg-[#ffe45e] hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    white:  'bg-white text-black border-[3px] border-black shadow-[4px_4px_0px_#000] hover:bg-gray-100 hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none',
  };
  return (
    <button
      onClick={onClick}
      className={`font-black uppercase tracking-wider px-5 py-2.5 transition-all duration-75 cursor-pointer ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

/* ─── Fake Mini Dashboard (pure divs) ───────────────────── */
const MockDashboard = () => (
  <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_#000] p-4 w-full max-w-md">
    {/* Mock Header Bar */}
    <div className="flex items-center justify-between mb-4 pb-2 border-b-[2px] border-black">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-black flex items-center justify-center text-[#00f0ff] text-xs font-black">S</div>
        <span className="text-xs font-black uppercase">Smart DataStudio</span>
      </div>
      <div className="flex gap-1">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff499e] border border-black" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#ffe45e] border border-black" />
        <div className="w-2.5 h-2.5 rounded-full bg-lime-400 border border-black" />
      </div>
    </div>

    {/* Mock Metric Cards */}
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: 'ROWS', value: '12,540', color: 'bg-[#ffe45e]' },
        { label: 'COLS', value: '18', color: 'bg-[#00f0ff]' },
        { label: 'MISSING', value: '0.3%', color: 'bg-[#ff499e]' },
      ].map(({ label, value, color }) => (
        <div key={label} className={`${color} border-[2px] border-black p-2 shadow-[2px_2px_0px_#000]`}>
          <p className="text-[9px] font-black uppercase text-black">{label}</p>
          <p className="text-sm font-black text-black mt-0.5">{value}</p>
        </div>
      ))}
    </div>

    {/* Mock Bar Chart */}
    <div className="border-[2px] border-black p-3 bg-[#fef9ef] mb-3">
      <p className="text-[9px] font-black uppercase mb-2 text-black">SALES BY REGION</p>
      <div className="flex items-end gap-2 h-20">
        {[65, 88, 42, 97, 73, 55, 82].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full border-[1.5px] border-black bg-[#ffe45e]"
              style={{ height: `${h}%`, boxShadow: '2px 2px 0px #000' }}
            />
            <span className="text-[7px] font-black text-black">{String.fromCharCode(65 + i)}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Mock Table Preview */}
    <div className="border-[2px] border-black overflow-hidden">
      <div className="grid grid-cols-3 bg-black text-[#ffe45e] text-[8px] font-black uppercase">
        <div className="px-2 py-1 border-r border-gray-700">Name</div>
        <div className="px-2 py-1 border-r border-gray-700">Value</div>
        <div className="px-2 py-1">Type</div>
      </div>
      {[
        ['Age', '34.2', 'float'],
        ['Income', '$72k', 'int'],
        ['Region', 'West', 'str'],
      ].map(([name, val, type]) => (
        <div key={name} className="grid grid-cols-3 border-t-[1px] border-black text-[8px] font-bold bg-white">
          <div className="px-2 py-1 border-r border-black">{name}</div>
          <div className="px-2 py-1 border-r border-black font-mono">{val}</div>
          <div className="px-2 py-1 text-[#3b5bdb]">{type}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Feature Card ───────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-[#fef9ef] border-[3px] border-black shadow-[6px_6px_0px_#000] p-6 flex flex-col gap-3 hover:shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-75">
    <div className="w-10 h-10 bg-[#ffe45e] border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
      <Icon size={20} strokeWidth={2.5} className="text-black" />
    </div>
    <h3 className="font-black uppercase text-black text-lg tracking-tight">{title}</h3>
    <p className="text-sm font-medium text-gray-700 leading-relaxed">{desc}</p>
  </div>
);

/* ─── Step ───────────────────────────────────────────────── */
const Step = ({ num, title, desc }) => (
  <div className="flex flex-col items-center text-center gap-3 flex-1">
    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-xl font-black border-[3px] border-black shadow-[4px_4px_0px_#000]">
      {num}
    </div>
    <h4 className="font-black uppercase text-black text-base tracking-tight">{title}</h4>
    <p className="text-sm text-gray-600 font-medium max-w-[160px]">{desc}</p>
  </div>
);

/* ─── Main LandingPage ───────────────────────────────────── */
const LandingPage = ({ session }) => {
  const navigate = useNavigate();

  const handleGetStartedAction = () => {
    if (session) {
      navigate('/projects');
    } else {
      navigate('/signup');
    }
  };


  return (
    <div className="min-h-screen bg-[#fef9ef] font-sans">

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#fef9ef] border-b-[3px] border-black flex items-center justify-between px-6 md:px-12 h-16">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 bg-[#ffe45e] border-[3px] border-black flex items-center justify-center text-black text-xl font-black shadow-[3px_3px_0px_#000]">
            S
          </div>
          <span className="font-black uppercase tracking-widest text-black text-sm hidden sm:block">
            Smart DataStudio
          </span>
        </div>

        {/* Nav Actions */}
        <div className="flex items-center gap-3">
          {session ? (
            <NeoBtn variant="yellow" onClick={() => navigate('/projects')} className="px-4 py-2 text-sm">
              My Projects
            </NeoBtn>
          ) : (
            <>
              <NeoBtn variant="outline" onClick={() => navigate('/login')} className="px-4 py-2 text-sm">
                Log In
              </NeoBtn>
              <NeoBtn variant="yellow" onClick={handleGetStartedAction} className="px-4 py-2 text-sm">
                Get Started
              </NeoBtn>
            </>
          )}
        </div>

      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-16 md:py-24 flex flex-col lg:flex-row items-center justify-between gap-12 max-w-7xl mx-auto">
        {/* Left: Text */}
        <div className="flex-1 max-w-xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#00f0ff] border-[2px] border-black px-3 py-1 shadow-[3px_3px_0px_#000] mb-6">
            <Zap size={13} className="text-black" />
            <span className="text-xs font-black uppercase text-black">Powered by Flask + React + Scikit-Learn</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black uppercase leading-[1.05] text-black tracking-tight mb-6">
            Your Data Science<br />
            <span className="bg-[#ffe45e] px-2 border-[2px] border-black inline-block mt-1">Workspace</span>
          </h1>
          <p className="text-base md:text-lg text-gray-700 font-medium mb-8 leading-relaxed max-w-lg">
            Import, clean, visualize, and train ML models — all in one place.
            No boilerplate. No setup. No friction.
          </p>

          <div className="flex flex-wrap gap-4">
            <NeoBtn
              variant="yellow"
              onClick={handleGetStartedAction}
              className="text-base px-7 py-3 flex items-center gap-2"
            >
              Get Started Free <ArrowRight size={16} />
            </NeoBtn>
            <NeoBtn
              variant="cyan"
              onClick={() => navigate('/app')}
              className="text-base px-7 py-3"
            >
              Try Demo
            </NeoBtn>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-10 flex-wrap">
            {[['5+', 'Chart Types'], ['6+', 'ML Algorithms'], ['1', 'Click Cleaning']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-black">{val}</p>
                <p className="text-xs font-black uppercase text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Mock Dashboard */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <MockDashboard />
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section className="bg-black py-16 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="text-[#ffe45e] text-xs font-black uppercase tracking-widest mb-2">Features</p>
            <h2 className="text-4xl font-black uppercase text-white tracking-tight">Everything You Need</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureCard
              icon={Database}
              title="Smart Data Prep"
              desc="Auto-detect missing values, duplicates, and type anomalies. Fix everything with a single click."
            />
            <FeatureCard
              icon={LayoutDashboard}
              title="Interactive Dashboard"
              desc="Drag-and-drop metric cards, chart blocks, and headings onto a live canvas. Customize every pixel."
            />
            <FeatureCard
              icon={BrainCircuit}
              title="ML Studio"
              desc="Train KNN, SVM, Random Forest, and more. Get instant confusion matrices and accuracy scores."
            />
            <FeatureCard
              icon={Network}
              title="Deep Learning Studio"
              desc="Build custom neural network architectures with our pure-NumPy engine. No TensorFlow required."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 bg-[#fef9ef]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Process</p>
            <h2 className="text-4xl font-black uppercase text-black tracking-tight">Three Steps to Insights</h2>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-0">
            {/* Connecting dashed line (desktop only) */}
            <div className="hidden md:block absolute top-6 left-[calc(16.6%)] right-[calc(16.6%)] h-[2px] border-t-[2px] border-dashed border-black z-0" />

            <Step num={1} title="Upload Your CSV" desc="Drag-and-drop or select any CSV file — the backend does the rest." />
            {/* Mobile connector */}
            <div className="md:hidden w-px h-8 bg-black mx-auto border-l-2 border-dashed border-black" />
            <Step num={2} title="Explore & Clean" desc="Auto-generated anomaly report. Fix issues with one click." />
            <div className="md:hidden w-px h-8 bg-black mx-auto border-l-2 border-dashed border-black" />
            <Step num={3} title="Train & Predict" desc="Run ML/DL models on your clean data. Export predictions." />
          </div>

          <div className="text-center mt-14">
            <NeoBtn
              variant="yellow"
              onClick={handleGetStartedAction}
              className="text-base px-8 py-3"
            >
              Start Building Now
            </NeoBtn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-[#3b5bdb] border-t-[3px] border-black px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#ffe45e] border-[2px] border-black flex items-center justify-center text-black text-sm font-black">
            S
          </div>
          <span className="text-white text-xs font-bold uppercase">
            Smart DataStudio MVP · Flask 3 · React 19
          </span>
        </div>
        <p className="text-white text-xs font-bold uppercase opacity-80">
          Built for AI students and data practitioners
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
