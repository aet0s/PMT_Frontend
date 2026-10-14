import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthProductShowcase from '../components/Auth/AuthProductShowcase';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import PasswordStrengthIndicator, { isPasswordValid } from '../components/Auth/PasswordStrengthIndicator';
import Button from '../components/ui/Button';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trello
} from 'lucide-react';
import { resetForgotPassword, verifyResetToken } from '../api/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Statuses
  const [isValidatingToken, setIsValidatingToken] = useState(!!tokenParam);
  const [tokenValid, setTokenValid] = useState(!tokenParam ? false : null);
  const [errorMsg, setErrorMsg] = useState(!tokenParam ? 'Missing password reset token. Please request a new reset link.' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate reset token on server when present
  useEffect(() => {
    async function checkToken() {
      if (!tokenParam) {
        setTokenValid(false);
        setErrorMsg('No reset token provided. Please request a password reset link first.');
        setIsValidatingToken(false);
        return;
      }

      setIsValidatingToken(true);
      try {
        const res = await verifyResetToken(tokenParam, emailParam);
        if (res.valid) {
          setTokenValid(true);
          if (res.email) setEmail(res.email);
        } else {
          setTokenValid(false);
          setErrorMsg('The password reset link is invalid or has expired. Please request a new one.');
        }
      } catch (err) {
        setTokenValid(false);
        setErrorMsg(err.message || 'The password reset link is invalid or has expired. Please request a new one.');
      } finally {
        setIsValidatingToken(false);
      }
    }

    checkToken();
  }, [tokenParam, emailParam]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!isPasswordValid(newPassword)) {
      setErrorMsg('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both inputs.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetForgotPassword(email.trim(), token, newPassword);
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-screen min-h-screen overflow-hidden flex flex-col lg:flex-row bg-surface text-text-primary selection:bg-primary-tint selection:text-primary">
      {/* Div 1 (Left): Product Showcase */}
      <div className="hidden lg:flex lg:w-1/2 h-full bg-surface-muted border-r border-border min-w-0 overflow-hidden relative">
        <AuthProductShowcase
          badge="Security & Access Control"
          title="Configure your new enterprise password."
          description="All passwords are protected with 12 rounds of salted bcrypt hashing and enforced with zero-plaintext credential retention."
        />
      </div>

      {/* Div 2 (Right): Password Reset Form Panel */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between items-center px-6 py-5 sm:px-10 sm:py-6 lg:px-12 lg:py-6 bg-surface min-w-0 overflow-y-auto lg:overflow-hidden relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto my-auto py-2 min-w-0">
          {/* Header */}
          <div className="text-center sm:text-left mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-11 h-11 mb-3 rounded-xl bg-primary text-white shadow-xs">
                {isSuccess ? <CheckCircle2 className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                {isSuccess ? 'Password updated' : 'Set new password'}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-text-secondary">
                {isSuccess
                  ? 'Your credentials have been securely updated. You can now log in.'
                  : `Configure an enterprise-compliant password for ${email || 'your account'}`}
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 mb-5 text-xs text-danger-text bg-danger-tint border border-danger/30 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Token Validating State */}
            {isValidatingToken && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-text-secondary">Verifying reset authorization token...</p>
              </div>
            )}

            {/* Invalid Token State */}
            {!isValidatingToken && tokenValid === false && !isSuccess && (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate('/forgot-password')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
                >
                  Request New Password Reset Link
                </Button>
                <Link
                  to="/login"
                  className="block text-center text-xs text-text-muted hover:text-text-primary transition-colors font-medium"
                >
                  Return to sign in
                </Link>
              </div>
            )}

            {/* Success State */}
            {isSuccess && (
              <div className="space-y-4">
                <div className="p-4 bg-success-tint border border-success/30 rounded-xl text-xs text-success-text space-y-1">
                  <p className="font-bold">Password Reset Successful</p>
                  <p>All active sessions have been invalidated for security. Please sign in with your new credentials.</p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate('/login')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
                >
                  Sign In with New Password
                </Button>
              </div>
            )}

            {/* Active Password Form */}
            {!isValidatingToken && tokenValid && !isSuccess && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-semibold text-text-primary"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      autoFocus
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary transition-all placeholder:text-text-muted shadow-2xs"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={newPassword} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-text-primary"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm-password"
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary transition-all placeholder:text-text-muted shadow-2xs"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer p-0.5"
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-danger-text mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 text-danger" /> Passwords do not match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!isPasswordValid(newPassword) || newPassword !== confirmPassword}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full mt-2 rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
                >
                  Save New Password
                </Button>
              </form>
            )}

        </div>

        {/* Anchored Bottom Footer */}
        <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto shrink-0 pt-4 pb-1 border-t border-border/70 flex flex-col items-center gap-2">
          <Link
            to="/login"
            className="text-primary hover:text-primary-hover font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to sign in</span>
          </Link>

          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
            <span>Enterprise-grade 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
