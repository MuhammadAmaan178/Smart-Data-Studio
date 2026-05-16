import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = () => {
    if (!email || !password) return;
    setLoading(true);
    // Simulate auth — navigate to workspace
    setTimeout(() => {
      setLoading(false);
      navigate('/app');
    }, 800);
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/app');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#fef9ef] flex flex-col">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="p-5 border-b-[3px] border-black bg-[#fef9ef] flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-black uppercase text-black
                     border-[2px] border-black px-3 py-1.5 bg-white
                     shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000]
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
                     transition-all duration-75 cursor-pointer"
        >
          <ArrowLeft size={14} strokeWidth={3} />
          Back to Home
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ffe45e] border-[3px] border-black flex items-center justify-center text-black font-black text-base shadow-[2px_2px_0px_#000]">
            S
          </div>
          <span className="font-black uppercase tracking-widest text-black text-xs hidden sm:block">
            Smart DataStudio
          </span>
        </div>
      </div>

      {/* ── Centered Card ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0px_#000]">

          {/* Card Header */}
          <div className="bg-[#ffe45e] border-b-[3px] border-black px-8 py-6">
            <p className="text-xs font-black uppercase tracking-widest text-black opacity-60 mb-1">
              Smart DataStudio
            </p>
            <h1 className="text-3xl font-black uppercase text-black tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm font-medium text-gray-700 mt-1">
              Sign in to continue to your workspace.
            </p>
          </div>

          {/* Form Body */}
          <div className="px-8 py-8 space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-3 border-[3px] border-black bg-[#fef9ef]
                             font-bold text-black placeholder:text-gray-400 text-sm
                             focus:outline-none focus:bg-[#fffde0] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-11 py-3 border-[3px] border-black bg-[#fef9ef]
                             font-bold text-black placeholder:text-gray-400 text-sm
                             focus:outline-none focus:bg-[#fffde0] transition-colors"
                />
                <button
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full py-3.5 font-black uppercase text-black text-sm tracking-wider
                         bg-[#ffe45e] border-[3px] border-black
                         shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                         active:translate-x-1 active:translate-y-1 active:shadow-none
                         transition-all duration-75 cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_#000]"
            >
              {loading ? 'Signing In...' : 'Log In'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[2px] bg-black" />
              <span className="text-xs font-black uppercase text-gray-500 px-1">or</span>
              <div className="flex-1 h-[2px] bg-black" />
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 font-black uppercase text-black text-sm tracking-wider
                         bg-white border-[3px] border-black
                         shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:bg-gray-50
                         active:translate-x-1 active:translate-y-1 active:shadow-none
                         transition-all duration-75 cursor-pointer
                         flex items-center justify-center gap-3
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Google "G" wordmark as styled text */}
              <span className="w-5 h-5 border-[2px] border-black flex items-center justify-center text-xs font-black bg-white">
                G
              </span>
              Continue with Google
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-sm font-medium text-gray-600 pt-2">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="font-black uppercase text-black underline hover:text-[#3b5bdb] cursor-pointer transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="h-6 bg-[#3b5bdb] border-t-[3px] border-black flex items-center justify-center">
        <span className="text-[10px] font-bold text-white uppercase opacity-80">
          Smart DataStudio · Secure Login
        </span>
      </div>
    </div>
  );
};

export default LoginPage;
