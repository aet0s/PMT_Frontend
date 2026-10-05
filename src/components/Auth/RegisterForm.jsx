import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserPlus, User, Mail, Lock, AlertCircle, Sparkles, LayoutGrid } from 'lucide-react';
import { verifyInvitationToken } from '../../api/invitations';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function RegisterForm({ onSwitchToLogin }) {
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setIsSubmitting(true);

    try {
      await registerUser(name, email, password, inviteInfo?.token);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-surface border border-border rounded-xl shadow-md text-left">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-primary-tint text-primary-text border border-primary/20">
          <UserPlus className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Create your account</h2>
        <p className="mt-1 text-sm text-text-secondary">Get started with your internal workspace</p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 mb-5 text-sm text-danger-text bg-danger-tint border border-danger/30 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {inviteDetails ? (
        <div className="p-4 mb-5 bg-primary-tint border border-primary/30 rounded-lg space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-xs text-primary-text">
            <Sparkles className="w-4 h-4 text-warning shrink-0" />
            <span>Invitation Accepted</span>
          </div>
          <p className="text-xs text-text-primary">
            You're joining <strong>{inviteDetails.workspace_name}</strong> as a <strong>Member</strong>.
          </p>
          {inviteDetails.board_names?.length > 0 && (
            <div className="text-[11px] text-text-secondary flex items-center gap-1.5 pt-1">
              <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Assigned Boards: <strong>{inviteDetails.board_names.join(', ')}</strong></span>
            </div>
          )}
        </div>
      ) : inviteInfo && (
        <div className="flex items-start gap-2 p-3 mb-5 text-sm text-primary-text bg-primary-tint border border-primary/30 rounded-md">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <span>You're signing up to accept an invitation for <strong>{inviteInfo.email}</strong>.</span>
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
          leftIcon={<User className="w-4 h-4" />}
        />

        <Input
          label="Work Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sarah@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          leftIcon={<Lock className="w-4 h-4" />}
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        Already registered?{' '}
        <Link
          to="/login"
          onClick={onSwitchToLogin}
          className="text-primary hover:text-primary-hover font-semibold cursor-pointer underline hover:no-underline"
        >
          Sign in here
        </Link>
      </div>
    </div>
  );
}
