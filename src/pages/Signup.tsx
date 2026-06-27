// ============================================================
// Signup Page
// ============================================================
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (!email.trim()) return 'Email is required.';
    if (!email.includes('@')) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const result = await signUp(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setConfirmationSent(result.confirmationSent);
    }
  }

  // Success state — email confirmation sent
  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e17] p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src="/nativelyai.svg" alt="NativelyAI" className="w-10 h-10" />
              <span className="font-heading text-xl font-bold text-[#e2e8f0] tracking-wider">
                PROFIT SCOUT
              </span>
            </div>
          </div>

          <div className="card p-8 text-center">
            <CheckCircle className="w-12 h-12 text-[#10b981] mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-2">Check your email</h2>
            <p className="text-sm text-[#94a3b8] mb-2">
              We sent a confirmation link to
            </p>
            <p className="text-sm font-medium text-[#3b82f6] mb-6">{email}</p>
            <p className="text-xs text-[#64748b]">
              Click the link in the email to activate your account, then sign in.
            </p>

            <Link
              to="/login"
              className="btn btn-primary w-full justify-center mt-6"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e17] p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/nativelyai.svg" alt="NativelyAI" className="w-10 h-10" />
            <span className="font-heading text-xl font-bold text-[#e2e8f0] tracking-wider">
              PROFIT SCOUT
            </span>
          </div>
          <p className="text-sm text-[#64748b]">Create your account to get started</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {error && (
            <div className="flex items-start gap-3 p-3 mb-6 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]">
              <AlertCircle className="w-4 h-4 text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-sm text-[#ef4444]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="input-group">
              <label htmlFor="email" className="input-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <input
                  id="email"
                  type="email"
                  className="input pl-10"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <input
                  id="password"
                  type="password"
                  className="input pl-10"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <input
                  id="confirmPassword"
                  type="password"
                  className="input pl-10"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#64748b]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}