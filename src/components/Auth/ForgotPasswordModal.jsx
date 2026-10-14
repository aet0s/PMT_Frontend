import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, X } from 'lucide-react';
import { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword } from '../../api/auth';
import PasswordStrengthIndicator, { isPasswordValid } from './PasswordStrengthIndicator';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = '', onSuccess }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'password' | 'success'
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await sendForgotPasswordOtp(email.trim());
      setStep('otp');
      setResendCountdown(60);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (otp.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await verifyForgotPasswordOtp(email.trim(), otp.trim());
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      setStep('password');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!isPasswordValid(newPassword)) {
      setErrorMsg('Password does not meet the security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetForgotPassword(email.trim(), resetToken, newPassword);
      setStep('success');
      if (onSuccess) {
        onSuccess(email.trim());
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep('email');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setResendCountdown(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop: clicking outside does not close the modal; close only via cross button */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-text-primary/40 transition-opacity"
      />
      <div className="w-full max-w-[420px] bg-surface border border-border/80 rounded-2xl shadow-xl p-6 sm:p-7 relative z-10 text-left transition-all box-border overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={resetState}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-11 h-11 mb-2.5 rounded-xl bg-primary text-white shadow-xs">
            {step === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : step === 'otp' ? (
              <KeyRound className="w-5 h-5" />
            ) : step === 'password' ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
          </div>
          <div className="text-[11px] font-bold tracking-widest uppercase text-primary mb-0.5">
            Security Verification
          </div>
          <h3 className="text-xl font-bold text-text-primary tracking-tight">
            {step === 'email' && 'Reset Organization Password'}
            {step === 'otp' && 'Verify 6-Digit Code'}
            {step === 'password' && 'Set New Strong Password'}
            {step === 'success' && 'Password Reset Complete'}
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            {step === 'email' && 'Enter your registered work email to receive a verification code.'}
            {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
            {step === 'password' && 'Configure an enterprise-compliant password for your account.'}
            {step === 'success' && 'Your password was successfully updated. You can now sign in.'}
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 mb-5 text-xs text-danger-text bg-danger-tint border border-danger/30 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              label="Registered Email Address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              leftIcon={<Mail className="w-4 h-4 text-text-muted" />}
              className="rounded-xl"
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
            >
              Send 6-Digit Code
            </Button>
          </form>
        )}

        {/* Step 2: OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.25em] font-mono text-xl font-bold py-2.5 px-3 bg-surface-muted/60 border border-border/80 rounded-lg focus:outline-none focus:border-primary text-text-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={otp.length !== 6}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
            >
              Verify Code
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setErrorMsg('');
                }}
                className="text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change email</span>
              </button>

              <button
                type="button"
                disabled={resendCountdown > 0 || isSubmitting}
                onClick={handleSendOtp}
                className={`font-semibold flex items-center gap-1 ${
                  resendCountdown > 0
                    ? 'text-text-muted cursor-not-allowed'
                    : 'text-primary hover:text-primary-hover cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>{resendCountdown > 0 ? `Resend code (${resendCountdown}s)` : 'Resend code'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Password Form */}
        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!isPasswordValid(newPassword) || newPassword !== confirmPassword}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
            >
              Reset Password
            </Button>
          </form>
        )}

        {/* Step 4: Success Screen */}
        {step === 'success' && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-text-secondary text-center">
              Your password has been changed successfully. You can now use your new password to sign into your workspace.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={resetState}
              className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
            >
              Back to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
