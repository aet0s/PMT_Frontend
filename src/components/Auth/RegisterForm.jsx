// client/src/components/Auth/RegisterForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  LayoutGrid,
  Building,
  User,
  Trello,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Check,
  KeyRound
} from 'lucide-react';
import { verifyInvitationToken } from '../../api/invitations';
import { sendRegistrationOtp, verifyRegistrationOtp } from '../../api/auth';
import PasswordStrengthIndicator, { isPasswordValid } from './PasswordStrengthIndicator';
import Button from '../ui/Button';

export default function RegisterForm({ onSwitchToLogin, showFooter = true }) {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  // Step: 'details' (Step 1) | 'otp' (Step 2) | 'password' (Step 3)
  const [step, setStep] = useState('details');

  // Form Fields - Step 1: Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Form Fields - Step 2: OTP
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');

  // Form Fields - Step 3: Password
  const [password, setPassword] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Invite state
  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteDetails, setInviteDetails] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteEmail = params.get('invite_email') || params.get('email');
    const inviteToken = params.get('invite_token');

    if (inviteEmail || inviteToken) {
      if (inviteEmail) setEmail(inviteEmail);
      setInviteInfo({ token: inviteToken, email: inviteEmail });

      if (inviteToken) {
        verifyInvitationToken(inviteToken)
          .then((res) => {
            if (res.invitation) {
              setInviteDetails(res.invitation);
              if (res.invitation.email) setEmail(res.invitation.email);
            }
          })
          .catch((err) => console.error('Failed to verify token:', err));
      }
    }
  }, []);

  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Step 1 Submit: Validate details & send OTP
  const handleStep1Submit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Work email address is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      await sendRegistrationOtp(email.trim().toLowerCase());
      setStep('otp');
      setResendCountdown(60);
      setSuccessNotice(`Verification code sent to ${email.trim().toLowerCase()}`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Submit: Verify OTP and advance to Step 3
  const handleStep2Submit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

    if (otp.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const verifyRes = await verifyRegistrationOtp(email.trim().toLowerCase(), otp.trim());
      setVerificationToken(verifyRes.verification_token || '');
      setStep('password');
      setSuccessNotice('Email verified! Set your password to complete registration.');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Resend code
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isSubmitting) return;
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await sendRegistrationOtp(email.trim().toLowerCase());
      setResendCountdown(60);
      setSuccessNotice(`A fresh verification code has been dispatched to ${email.trim().toLowerCase()}`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 Submit: Validate password & complete registration
  const handleStep3Submit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }
    if (!isPasswordValid(password)) {
      setErrorMsg('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.');
      return;
    }
    if (password !== confirmPassphrase) {
      setErrorMsg('Passwords do not match. Please verify your confirmation input.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        inviteInfo?.token,
        companyName.trim() || undefined,
        verificationToken
      );

      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form submit dispatcher
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    if (step === 'details') {
      await handleStep1Submit(e);
    } else if (step === 'otp') {
      await handleStep2Submit(e);
    } else if (step === 'password') {
      await handleStep3Submit(e);
    }
  };

  return (
    <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto text-left box-border">
      {/* Brand Icon & Step Header */}
      <div className="text-center sm:text-left mb-4 sm:mb-5">
        <div className="inline-flex items-center justify-center w-9 h-9 mb-2.5 rounded-xl bg-primary text-white shadow-xs">
          {step === 'otp' ? (
            <KeyRound className="w-5 h-5" />
          ) : step === 'password' ? (
            <Lock className="w-5 h-5" />
          ) : (
            <Trello className="w-5 h-5" />
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
          {step === 'details' && 'Create organization account'}
          {step === 'otp' && 'Verify your work email'}
          {step === 'password' && 'Set account password'}
        </h2>

        <p className="mt-1 text-xs text-text-secondary">
          {step === 'details' && 'Step 1 of 3 — Enter your personal and work details'}
          {step === 'otp' && `Step 2 of 3 — Enter the 6-digit security code sent to ${email}`}
          {step === 'password' && 'Step 3 of 3 — Choose a strong password to protect your workspace'}
        </p>

        {/* 3-Step Visual Progress Bar */}
        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-3 select-none">
          {/* Step 1 Chip */}
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
              step === 'details'
                ? 'bg-primary-tint text-primary border border-primary/20'
                : 'bg-surface-muted text-text-muted'
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                step !== 'details' ? 'bg-success text-white' : 'bg-primary text-white'
              }`}
            >
              {step !== 'details' ? '✓' : '1'}
            </span>
            <span className="text-[11px]">Details</span>
          </div>

          <div className="w-3 h-px bg-border" />

          {/* Step 2 Chip */}
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
              step === 'otp'
                ? 'bg-primary-tint text-primary border border-primary/20'
                : 'bg-surface-muted text-text-muted'
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                step === 'password'
                  ? 'bg-success text-white'
                  : step === 'otp'
                  ? 'bg-primary text-white'
                  : 'bg-border text-text-muted'
              }`}
            >
              {step === 'password' ? '✓' : '2'}
            </span>
            <span className="text-[11px]">OTP</span>
          </div>

          <div className="w-3 h-px bg-border" />

          {/* Step 3 Chip */}
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
              step === 'password'
                ? 'bg-primary-tint text-primary border border-primary/20'
                : 'bg-surface-muted text-text-muted'
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                step === 'password' ? 'bg-primary text-white' : 'bg-border text-text-muted'
              }`}
            >
              3
            </span>
            <span className="text-[11px]">Password</span>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 mb-4 text-xs text-danger-text bg-danger-tint border border-danger/30 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Success Notice Banner (Hidden on Step 3 to prevent unnecessary height explosion) */}
      {successNotice && step !== 'password' && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 mb-4 text-xs text-success-text bg-success-tint border border-success/30 rounded-xl"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{successNotice}</span>
        </div>
      )}

      {/* Invitation Details Banner */}
      {inviteDetails ? (
        <div className="p-3 mb-4 bg-primary-tint border border-primary/20 rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Workspace Invitation Accepted</span>
          </div>
          <p className="text-xs text-text-primary">
            You're joining <strong className="font-semibold">{inviteDetails.workspace_name}</strong> as a <strong className="font-semibold">Member</strong>.
          </p>
          {inviteDetails.board_names?.length > 0 && (
            <div className="text-[11px] text-text-secondary flex items-center gap-1.5 pt-0.5">
              <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Assigned Boards: <strong className="text-text-primary">{inviteDetails.board_names.join(', ')}</strong></span>
            </div>
          )}
        </div>
      ) : inviteInfo && (
        <div className="flex items-start gap-2 p-3 mb-4 text-xs text-primary bg-primary-tint border border-primary/20 rounded-xl">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <span>You're signing up to accept an invitation for <strong className="font-semibold">{inviteInfo.email}</strong>.</span>
        </div>
      )}

      {/* Unified Form Supporting All 3 Steps */}
      <form onSubmit={handleFormSubmit} className="space-y-3">
        {/* ======================================================== */}
        {/* STEP 1: Details (Name, Email, Company)                  */}
        {/* ======================================================== */}
        <div className={step === 'details' ? 'space-y-3' : 'hidden'}>
          {/* Full Name Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-name"
              className="block text-xs font-semibold text-text-primary"
            >
              Full Name
            </label>
            <div className="relative">
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required={step === 'details'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted transition-all shadow-2xs"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Work Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-email"
              className="block text-xs font-semibold text-text-primary"
            >
              Work Email
            </label>
            <div className="relative">
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required={step === 'details'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted transition-all shadow-2xs"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Company / Team Workspace (Optional) */}
          {!inviteDetails && !inviteInfo && (
            <div className="space-y-1.5">
              <label
                htmlFor="register-company"
                className="block text-xs font-semibold text-text-primary"
              >
                Company / Team Workspace (Optional)
              </label>
              <div className="relative">
                <input
                  id="register-company"
                  name="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Engineering"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted transition-all shadow-2xs"
                />
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}

          {/* Step 1 Action Button */}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting && step === 'details'}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-2 rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
          >
            Continue to Verification
          </Button>
        </div>

        {/* ======================================================== */}
        {/* STEP 2: OTP Verification                                */}
        {/* ======================================================== */}
        <div className={step === 'otp' ? 'space-y-3' : 'hidden'}>
          <div className="p-3 bg-surface-muted border border-border/70 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Security Code Sent</span>
            </div>
            <p className="text-text-secondary leading-relaxed">
              We dispatched a 6-digit verification code to <strong className="text-text-primary font-semibold">{email}</strong>. Please enter it below.
            </p>
          </div>

          {/* 6-Digit OTP Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-otp"
              className="block text-xs font-semibold text-text-primary"
            >
              6-Digit Security Code
            </label>
            <div className="relative">
              <input
                id="register-otp"
                name="otp"
                type="text"
                maxLength={6}
                autoComplete="one-time-code"
                required={step === 'otp'}
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="123456"
                className="w-full text-center tracking-[0.25em] font-mono text-xl font-bold py-2.5 px-3 bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary shadow-2xs"
              />
            </div>
          </div>

          {/* Step 2 Action Button */}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting && step === 'otp'}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
          >
            Verify Code
          </Button>

          {/* Step 2 Secondary Navigation Controls */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('details');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className="text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email</span>
            </button>

            <button
              type="button"
              disabled={resendCountdown > 0 || isSubmitting}
              onClick={handleResendOtp}
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
        </div>

        {/* ======================================================== */}
        {/* STEP 3: Password Setup & Completion                     */}
        {/* ======================================================== */}
        <div className={step === 'password' ? 'space-y-2' : 'hidden'}>
          {/* Password Field */}
          <div className="space-y-1">
            <label
              htmlFor="register-password"
              className="block text-xs font-semibold text-text-primary"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required={step === 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary transition-all placeholder:text-text-muted shadow-2xs"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer transition-colors p-0.5"
                aria-label={showPassword ? 'Hide visibility' : 'Show visibility'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>

          {/* Confirm Passphrase Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="register-confirm-passphrase"
                className="block text-xs font-semibold text-text-primary"
              >
                Confirm Passphrase
              </label>
              {confirmPassphrase && (
                <span
                  className={`text-[11px] font-medium flex items-center gap-1 ${
                    password === confirmPassphrase ? 'text-success-text' : 'text-danger-text'
                  }`}
                >
                  {password === confirmPassphrase ? (
                    <>
                      <Check className="w-3 h-3 text-success" /> Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-danger" /> Passwords do not match
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="register-confirm-passphrase"
                name="confirmPassphrase"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required={step === 'password'}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary transition-all placeholder:text-text-muted shadow-2xs"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer transition-colors p-0.5"
                aria-label={showConfirm ? 'Hide visibility' : 'Show visibility'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms & Privacy acceptance */}
          <div className="pt-0.5">
            <label
              htmlFor="register-terms"
              className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer select-none"
            >
              <input
                id="register-terms"
                type="checkbox"
                required={step === 'password'}
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer mt-0.5"
              />
              <span>
                I agree to the{' '}
                <a
                  href="#terms"
                  onClick={(e) => e.preventDefault()}
                  className="text-primary hover:underline font-semibold"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="#privacy"
                  onClick={(e) => e.preventDefault()}
                  className="text-primary hover:underline font-semibold"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>

          {/* Step 3 Action Button */}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting && step === 'password'}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-2 rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
          >
            Create Account & Launch Workspace
          </Button>
        </div>
      </form>

      {/* Footer: Already Registered Link & Encryption Notice (only if showFooter is true) */}
      {showFooter && (
        <div className="mt-4 sm:mt-5 pt-3.5 border-t border-border/70 flex flex-col items-center gap-2">
          <div className="text-center text-xs text-text-secondary">
            Already registered?{' '}
            <Link
              to="/login"
              onClick={onSwitchToLogin}
              className="text-primary hover:text-primary-hover font-bold cursor-pointer underline hover:no-underline ml-1"
            >
              Sign in here
            </Link>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
            <span>Enterprise-grade 256-bit encryption</span>
          </div>
        </div>
      )}
    </div>
  );
}
