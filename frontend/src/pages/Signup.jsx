import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Shield } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signup(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)]/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md p-8 sm:p-10 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[var(--accent)]/20 rounded-2xl flex items-center justify-center mb-6 border border-[var(--accent)]/30 rotate-3 transition-transform hover:rotate-0 duration-300">
            <Shield className="text-[var(--accent)]" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create an Account</h1>
          <p className="text-gray-400 mt-2">Join Sentinel for threat analysis</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] text-white placeholder-gray-600 transition-all"
              placeholder="admin@sentinel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] text-white placeholder-gray-600 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <Button 
            type="submit" 
            variant="primary" 
            className="w-full py-4 mt-4 text-base font-semibold rounded-xl shadow-[0_0_20px_var(--accent-soft)] hover:shadow-[0_0_30px_var(--accent-soft)] transition-shadow"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Already have an account? <Link to="/login" className="text-[var(--accent)] hover:text-emerald-400 font-medium transition-colors">Log in</Link>
        </div>
      </div>
    </div>
  );
}
