// client/src/components/Auth/LoginForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Trello,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Building2,
  ArrowLeft,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import { validateNextRedirect } from '../../lib/safeRedirect';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function LoginForm({ onSwitchToRegister, showFooter = true }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUser, verify2FaLogin } = useAuth();

  // Mode: 'credentials' | '2fa' | 'company_select'
  const [mode, setMode] = useState('credentials');

  // Credentials fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA Challenge state
  const [temp2FaToken, setTemp2FaToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');

  // Multi-tenant selection state
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [selectedCompanySlug, setSelectedCompanySlug] = useState('');

  // Feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Restore remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('taskflow_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (e) {}
  }, []);

  // Handle standard credential submission
  const handleCredentialSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

    if (!email.trim()) {
      setErrorMsg('Please enter your work email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Remember me handling
      try {
        if (rememberMe) {
          localStorage.setItem('taskflow_remember_email', trimmedEmail);
        } else {
          localStorage.removeItem('taskflow_remember_email');
        }
      } catch (e) {}

      const res = await loginUser(trimmedEmail, password, selectedCompanySlug || undefined);

      if (res?.requires_2fa) {
        setTemp2FaToken(res.temp_token);
        setMode('2fa');
        setErrorMsg('');
        return;
      }

      if (res?.requires_company_selection && Array.isArray(res.companies)) {
        setAvailableCompanies(res.companies);
        setSelectedCompanySlug(res.companies[0]?.slug || '');
        setMode('company_select');
        setErrorMsg('');
        return;
      }

      // Successful login
      const nextParam = searchParams.get('next');
      const target = validateNextRedirect(nextParam, '/');
      navigate(target, { replace: true });
    } catch (err) {
      if (err.remaining_minutes) {
        setErrorMsg(`Account is temporarily locked due to consecutive failed attempts. Please try again in ${err.remaining_minutes} minute(s).`);
      } else if (err.remaining_attempts) {
        setErrorMsg(`Invalid email or password. ${err.remaining_attempts} attempt(s) remaining before temporary lockout.`);
      } else {
        setErrorMsg(err.message || 'Invalid email or password. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle 2FA verification submission
  const handle2FaSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!twoFaCode.trim()) {
      setErrorMsg('Please enter your 6-digit authenticator or recovery code.');
      return;
    }

    setIsSubmitting(true);

    try {
      await verify2FaLogin(temp2FaToken, twoFaCode.trim());
      const nextParam = searchParams.get('next');
      const target = validateNextRedirect(nextParam, '/');
      navigate(target, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Invalid authentication code. Please check your authenticator app.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle multi-tenant company selection
  const handleCompanySelectSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCompanySlug) return;
    await handleCredentialSubmit();
  };

  return (
    <>
      <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto text-left box-border">
        {/* Header */}
        <div className="text-center sm:text-left mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-9 h-9 mb-2 rounded-xl bg-primary text-white shadow-xs">
            <Trello className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
            {mode === 'credentials' && 'Sign in to workspace'}
            {mode === '2fa' && 'Two-factor verification'}
            {mode === 'company_select' && 'Select organization'}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            {mode === 'credentials' && 'Enter your corporate credentials to access your boards'}
            {mode === '2fa' && 'Enter the 6-digit code from your authenticator app'}
            {mode === 'company_select' && 'Select the company workspace you wish to launch'}
          </p>
        </div>

        {/* Actionable Error Banner */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 mb-4 text-xs text-danger-text bg-danger-tint border border-danger/30 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Success Notice Banner */}
        {successNotice && (
          <div
            role="status"
            className="flex items-start gap-2 p-3 mb-4 text-xs text-success-text bg-success-tint border border-success/30 rounded-xl"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successNotice}</span>
          </div>
        )}

        {/* Mode 1: Credentials Form */}
        {mode === 'credentials' && (
          <form onSubmit={handleCredentialSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Work Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-text-primary"
              >
                Work Email
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary transition-all placeholder:text-text-muted shadow-2xs"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-text-primary"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs text-primary hover:text-primary-hover font-medium transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary transition-all placeholder:text-text-muted shadow-2xs"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5"
                  aria-label={showPassword ? 'Hide visibility' : 'Show visibility'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-0.5">
              <label
                htmlFor="login-remember"
                className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none"
              >
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <span>Remember my email</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full mt-2 rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
            >
              Sign In to Workspace
            </Button>
          </form>
        )}

        {/* Mode 2: 2FA Challenge */}
        {mode === '2fa' && (
          <form onSubmit={handle2FaSubmit} className="space-y-4">
            <div className="p-3.5 bg-surface-muted border border-border/70 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Two-Factor Authentication Active</span>
              </div>
              <p className="text-text-secondary leading-relaxed">
                Your account is protected by TOTP 2FA. Open your authenticator app (Google Authenticator, 1Password, Authy) and enter the current code.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="two-fa-code"
                className="block text-xs font-semibold text-text-primary"
              >
                6-Digit Security Code
              </label>
              <div className="relative">
                <input
                  id="two-fa-code"
                  type="text"
                  maxLength={10}
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.2em] font-mono text-xl font-bold py-2.5 px-3 bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary shadow-2xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
            >
              Verify & Launch Workspace
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode('credentials');
                setTwoFaCode('');
                setErrorMsg('');
              }}
              className="w-full text-center text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5 pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to password sign in</span>
            </button>
          </form>
        )}

        {/* Mode 3: Multi-tenant Company Selection */}
        {mode === 'company_select' && (
          <form onSubmit={handleCompanySelectSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-primary">
                Choose Organization
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableCompanies.map((c) => (
                  <button
                    key={c.id || c.slug}
                    type="button"
                    onClick={() => setSelectedCompanySlug(c.slug)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedCompanySlug === c.slug
                        ? 'border-primary bg-primary-tint text-primary'
                        : 'border-border bg-surface hover:bg-surface-muted text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary-tint text-primary-text border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{c.name}</div>
                        <div className="text-[10px] text-text-muted truncate">/{c.slug}</div>
                      </div>
                    </div>
                    {selectedCompanySlug === c.slug && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
            >
              Continue to {availableCompanies.find((c) => c.slug === selectedCompanySlug)?.name || 'Workspace'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode('credentials');
                setErrorMsg('');
              }}
              className="w-full text-center text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5 pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to credentials</span>
            </button>
          </form>
        )}

        {/* Footer: Create Account Link & Security Notice (only if showFooter is true) */}
        {showFooter && (
          <div className="mt-4 sm:mt-5 pt-3.5 border-t border-border/70 flex flex-col items-center gap-2">
            <div className="text-center text-xs text-text-secondary">
              Don't have an account?{' '}
              <Link
                to="/register"
                onClick={onSwitchToRegister}
                className="text-primary hover:text-primary-hover font-bold cursor-pointer underline hover:no-underline ml-1"
              >
                Create organization account
              </Link>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
              <span>Protected with end-to-end 256-bit encryption</span>
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Flow */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
        onSuccess={(resetEmail) => {
          setEmail(resetEmail);
          setPassword('');
          setSuccessNotice('Password reset successfully! Please sign in with your new password.');
        }}
      />
    </>
  );
}
