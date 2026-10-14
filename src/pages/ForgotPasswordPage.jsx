import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthProductShowcase from '../components/Auth/AuthProductShowcase';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import Button from '../components/ui/Button';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Shield,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Trello
} from 'lucide-react';
import { sendForgotPasswordOtp, verifyForgotPasswordOtp } from '../api/auth';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your work email address.');
      return;
    }

    setErrorMsg('');
    setSuccessNotice('');
    setIsSubmitting(true);

    try {
      await sendForgotPasswordOtp(email.trim());
      setStep('otp');
      setResendCountdown(60);
      setSuccessNotice('If an account exists with this email address, a 6-digit security code has been dispatched.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch security code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (otp.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit code.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await verifyForgotPasswordOtp(email.trim(), otp.trim());
      if (res.reset_token) {
        navigate(`/reset-password?email=${encodeURIComponent(email.trim())}&token=${encodeURIComponent(res.reset_token)}`);
      } else {
        setErrorMsg('Verification succeeded, but no reset token was returned.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code. Please request a new code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-screen min-h-screen overflow-hidden flex flex-col lg:flex-row bg-surface text-text-primary selection:bg-primary-tint selection:text-primary">
      {/* Div 1 (Left): Product Showcase */}
      <div className="hidden lg:flex lg:w-1/2 h-full bg-surface-muted border-r border-border min-w-0 overflow-hidden relative">
        <AuthProductShowcase
          badge="Account Recovery & Security"
          title="Fast, secure recovery for your organization account."
          description="Protecting access to your enterprise projects with single-use verification tokens, rate-limited challenges, and instant audit trails."
        />
      </div>

      {/* Div 2 (Right): Recovery Form Panel */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between items-center px-6 py-5 sm:px-10 sm:py-6 lg:px-12 lg:py-6 bg-surface min-w-0 overflow-y-auto lg:overflow-hidden relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <ThemeToggle />
        </div>

        {/* Center Form Body */}
        <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto my-auto py-2 min-w-0">
          {/* Header */}
          <div className="text-center sm:text-left mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-11 h-11 mb-3 rounded-xl bg-primary text-white shadow-xs">
              {step === 'otp' ? <KeyRound className="w-6 h-6" /> : <Trello className="w-6 h-6" />}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {step === 'email' ? 'Reset password' : 'Enter security code'}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-text-secondary">
              {step === 'email'
                ? 'Enter your registered work email to receive password reset instructions'
                : `Enter the 6-digit verification code sent to ${email}`}
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

          {/* Success Message */}
          {successNotice && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3.5 mb-5 text-xs text-success-text bg-success-tint border border-success/30 rounded-xl"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{successNotice}</span>
            </div>
          )}

          {/* Step 1: Email Request Form */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-text-primary"
                >
                  Registered Work Email
                </label>
                <div className="relative">
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary transition-all placeholder:text-text-muted shadow-2xs"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full mt-2 rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
              >
                Send Verification Code
              </Button>
            </form>
          )}

          {/* Step 2: OTP Verification Form */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-otp"
                  className="block text-xs font-semibold text-text-primary"
                >
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    id="forgot-otp"
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
                    className="w-full text-center tracking-[0.25em] font-mono text-xl font-bold py-2.5 px-3 bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary shadow-2xs"
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
                Verify Code & Set Password
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErrorMsg('');
                  }}
                  className="text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change email</span>
                </button>

                <button
                  type="button"
                  disabled={resendCountdown > 0 || isSubmitting}
                  onClick={handleSendOtp}
                  className={`font-semibold flex items-center gap-1 transition-colors ${
                    resendCountdown > 0
                      ? 'text-text-muted cursor-not-allowed'
                      : 'text-primary hover:text-primary-hover cursor-pointer'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{resendCountdown > 0 ? `Resend (${resendCountdown}s)` : 'Resend code'}</span>
                </button>
              </div>
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
