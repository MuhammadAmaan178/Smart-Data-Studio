import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { signUp } from '../utils/auth';

const SignupPage = ({ onSessionChange }) => {
  const navigate = useNavigate();
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [pwError,    setPwError]    = useState('');
  const [error,      setError]      = useState('');

  const isValid = fullName && email && password && confirmPw && !pwError;

  const handleConfirmChange = (val) => {
    setConfirmPw(val);
    if (val && password && val !== password) {
      setPwError('Passwords do not match.');
    } else {
      setPwError('');
    }
  };

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPw) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = await signUp(fullName, email, password);
      onSessionChange(session);
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
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
          <div className="bg-[#ff499e] border-b-[3px] border-black px-8 py-6">
            <p className="text-xs font-black uppercase tracking-widest text-black opacity-60 mb-1">
              Smart DataStudio
            </p>
            <h1 className="text-3xl font-black uppercase text-black tracking-tight">
              Create Account
            </h1>
            <p className="text-sm font-medium text-black mt-1 opacity-70">
              Join thousands of data practitioners today.
            </p>
          </div>

          {/* Form Body */}
          <div className="px-8 py-8 space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Muhammad Amaan"
                  className="w-full pl-9 pr-4 py-3 border-[3px] border-black bg-[#fef9ef]
                             font-bold text-black placeholder:text-gray-400 text-sm
                             focus:outline-none focus:bg-[#fffde0] transition-colors"
                />
              </div>
            </div>

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
                  onChange={e => { setPassword(e.target.value); handleConfirmChange(confirmPw); }}
                  placeholder="Minimum 8 characters"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConf ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => handleConfirmChange(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full pl-9 pr-11 py-3 border-[3px] bg-[#fef9ef]
                             font-bold text-black placeholder:text-gray-400 text-sm
                             focus:outline-none transition-colors
                             ${pwError ? 'border-[#ff499e] bg-red-50' : 'border-black focus:bg-[#fffde0]'}`}
                />
                <button
                  onClick={() => setShowConf(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
                >
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwError && (
                <p className="text-xs font-black text-[#ff499e] mt-1 uppercase">{pwError}</p>
              )}
            </div>

            {/* Strength Hint */}
            {password.length > 0 && (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 border-[1.5px] border-black transition-colors ${
                      password.length >= i * 3
                        ? i <= 1 ? 'bg-[#ff499e]' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-[#ffe45e]' : 'bg-lime-400'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
                <span className="text-[10px] font-black text-gray-500 uppercase ml-1">
                  {password.length < 4 ? 'Weak' : password.length < 8 ? 'Fair' : password.length < 12 ? 'Good' : 'Strong'}
                </span>
              </div>
            )}

            {/* Signup Button */}
            <button
              onClick={handleSignup}
              disabled={loading || !isValid}
              className="w-full py-3.5 font-black uppercase text-black text-sm tracking-wider mt-2
                         bg-[#ffe45e] border-[3px] border-black
                         shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                         active:translate-x-1 active:translate-y-1 active:shadow-none
                         transition-all duration-75 cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_#000]"
            >
              {loading ? 'CREATING ACCOUNT...' : 'Create Account'}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm font-medium text-gray-600 pt-1">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-black uppercase text-black underline hover:text-[#3b5bdb] cursor-pointer transition-colors"
              >
                Log In
              </button>
            </p>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-[#ff499e] border-[3px] border-black text-white font-bold text-sm text-center uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-in fade-in duration-200">
                {error}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="h-6 bg-[#3b5bdb] border-t-[3px] border-black flex items-center justify-center">
        <span className="text-[10px] font-bold text-white uppercase opacity-80">
          Smart DataStudio · Your data stays local
        </span>
      </div>
    </div>
  );
};

export default SignupPage;
