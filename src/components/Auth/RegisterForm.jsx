import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, AlertCircle, Sparkles, LayoutGrid, Building, User, Trello, ArrowRight } from 'lucide-react';
import { verifyInvitationToken } from '../../api/invitations';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function RegisterForm({ onSwitchToLogin }) {
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email address is required');
      return;
    }
    if (!password) {
      setErrorMsg('Password is required');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser(name, email, password, inviteInfo?.token, companyName);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 sm:p-10 bg-surface border border-border rounded-3xl shadow-md text-left transition-all">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-primary text-white shadow-md">
          <Trello className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Create your account
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-text-secondary">
          Join your team's TaskFlow workspace
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 mb-6 text-xs sm:text-sm text-danger-text bg-danger-tint border border-danger/30 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {inviteDetails ? (
        <div className="p-4 mb-6 bg-primary-tint border border-primary/20 rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs text-primary">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Invitation Accepted</span>
          </div>
          <p className="text-xs text-text-primary">
            You're joining <strong className="font-bold">{inviteDetails.workspace_name}</strong> as a <strong className="font-bold">Member</strong>.
          </p>
          {inviteDetails.board_names?.length > 0 && (
            <div className="text-[11px] text-text-secondary flex items-center gap-1.5 pt-1">
              <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Assigned Boards: <strong className="text-text-primary">{inviteDetails.board_names.join(', ')}</strong></span>
            </div>
          )}
        </div>
      ) : inviteInfo && (
        <div className="flex items-start gap-2.5 p-4 mb-6 text-xs sm:text-sm text-primary bg-primary-tint border border-primary/20 rounded-2xl">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <span>You're signing up to accept an invitation for <strong className="font-bold">{inviteInfo.email}</strong>.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sarah Connor"
          leftIcon={<User className="w-4 h-4 text-text-muted" />}
          className="rounded-xl"
        />

        <Input
          label="Work Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sarah@company.com"
          leftIcon={<Mail className="w-4 h-4 text-text-muted" />}
          className="rounded-xl"
        />

        {!inviteDetails && !inviteInfo && (
          <Input
            label="Company or Team Name (Optional)"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp or Solarman"
            leftIcon={<Building className="w-4 h-4 text-text-muted" />}
            className="rounded-xl"
          />
        )}

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          leftIcon={<Lock className="w-4 h-4 text-text-muted" />}
          className="rounded-xl"
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="w-full mt-3 rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-xs min-h-[44px]"
        >
          Create Account
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-border/70 text-center text-xs sm:text-sm text-text-secondary">
        Already registered?{' '}
        <Link
          to="/login"
          onClick={onSwitchToLogin}
          className="text-primary hover:text-primary-hover font-bold cursor-pointer underline hover:no-underline"
        >
          Sign in here
        </Link>
      </div>
    </div>
  );
}
