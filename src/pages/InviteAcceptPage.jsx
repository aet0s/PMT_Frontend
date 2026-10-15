import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  User,
  LayoutGrid,
  AlertCircle,
  ArrowRight,
  Building,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { verifyInvitationToken, acceptInvitation } from '../api/invitations';
import PasswordStrengthIndicator, { isPasswordValid } from '../components/Auth/PasswordStrengthIndicator';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export default function InviteAcceptPage() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, registerUser, logoutUser } = useAuth();
  const toast = useToast();

  const token = routeToken || searchParams.get('token') || searchParams.get('invite_token');
  const queryEmail = searchParams.get('email') || searchParams.get('invite_email') || '';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [inviteDetails, setInviteDetails] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token found in this link. Please check the URL or request a new invitation.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg('');

    verifyInvitationToken(token)
      .then((res) => {
        if (!isMounted) return;
        if (res?.invitation) {
          setInviteDetails(res.invitation);
        } else {
          setErrorMsg('Invalid invitation response received from server.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to verify invitation token:', err);
        setErrorMsg(err.message || 'This invitation link is invalid, expired, or has already been used.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle existing logged-in user accepting invite
  const handleExistingUserAccept = async () => {
    setIsSubmitting(true);
    setFormError('');
    try {
      const res = await acceptInvitation(token);
      toast.show(res.message || `Joined ${inviteDetails.workspace_name}!`, 'success');
      const wsId = res.workspace_id || inviteDetails.workspace_id;
      navigate(`/w/${wsId}/home`);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setFormError(err.message || 'Failed to accept invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle setting password and creating account for invited member
  const handleSetPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!password) {
      setFormError('Password is required.');
      return;
    }

    if (!isPasswordValid(password)) {
      setFormError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    if (!acceptTerms) {
      setFormError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const targetEmail = (inviteDetails?.email || queryEmail).trim().toLowerCase();
      const res = await registerUser(
        name.trim(),
        targetEmail,
        password,
        token,
        undefined,
        undefined
      );

      toast.show(`Welcome to ${inviteDetails?.workspace_name || 'TaskFlow'}, ${name.trim()}!`, 'success');

      const targetWs = res.initial_workspace_id || inviteDetails?.workspace_id;
      const targetBoard = res.initial_board_id;

      if (targetWs && targetBoard) {
        navigate(`/w/${targetWs}/p/${targetBoard}/board`);
      } else if (targetWs) {
        navigate(`/w/${targetWs}/home`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setFormError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUserMatch = user && inviteDetails && user.email?.toLowerCase() === inviteDetails.email?.toLowerCase();
  const isDifferentUser = user && inviteDetails && user.email?.toLowerCase() !== inviteDetails.email?.toLowerCase();

  return (
    <div className="w-full min-h-screen bg-app text-text-primary selection:bg-primary-tint selection:text-primary flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-base shadow-sm">
            TF
          </div>
          <div>
            <span className="text-base font-extrabold text-text-primary tracking-tight">TaskFlow</span>
            <span className="text-[11px] text-text-muted block -mt-0.5 font-medium">Workspace Invitation</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          {loading ? (
            <div className="p-10 bg-surface border border-border/80 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center space-y-4">
              <Spinner size="lg" />
              <div>
                <h3 className="text-base font-bold text-text-primary">Verifying Invitation...</h3>
                <p className="text-xs text-text-muted mt-1">Checking workspace access and member permissions</p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-8 bg-surface border border-border/80 rounded-2xl shadow-xl text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-danger-tint border border-danger/30 flex items-center justify-center text-danger">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-text-primary">Invitation Unavailable</h2>
                <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                  {errorMsg}
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-sm inline-flex items-center justify-center gap-2"
                >
                  Go to Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border/80 rounded-2xl shadow-xl overflow-hidden">
              {/* Workspace Access Banner */}
              <div className="p-6 bg-surface-muted/60 border-b border-border space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-tint border border-primary/30 rounded-full text-xs font-bold text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Workspace Invitation</span>
                  </div>
                  <span className="text-[11px] font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Email Pre-Verified
                  </span>
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
                    Join {inviteDetails?.workspace_name}
                  </h1>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1">
                    You have been invited by the workspace owner to join the team.
                  </p>
                </div>

                {/* Details Breakdown Card */}
                <div className="p-4 bg-surface border border-border/70 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-text-muted" /> Workspace
                    </span>
                    <strong className="font-semibold text-text-primary">{inviteDetails?.workspace_name}</strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-text-muted" /> Assigned Role
                    </span>
                    <Badge variant="primary">{inviteDetails?.role_name || 'Team Member'}</Badge>
                  </div>

                  <div className="flex items-start justify-between text-xs pt-1 border-t border-border/60">
                    <span className="text-text-muted flex items-center gap-1.5 pt-0.5">
                      <LayoutGrid className="w-4 h-4 text-text-muted" /> Assigned Boards
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-[65%]">
                      {inviteDetails?.board_names && inviteDetails.board_names.length > 0 ? (
                        inviteDetails.board_names.map((bName) => (
                          <span
                            key={bName}
                            className="px-2 py-0.5 bg-surface-muted border border-border rounded-md text-[11px] font-medium text-text-primary"
                          >
                            {bName}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-text-muted italic">All workspace boards</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                    <span className="text-text-muted">Account Email</span>
                    <span className="font-mono text-xs text-text-primary font-medium">{inviteDetails?.email}</span>
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-7">
                {formError && (
                  <div role="alert" className="flex items-start gap-2 p-3 mb-4 text-xs text-danger-text bg-danger-tint border border-danger/30 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{formError}</span>
                  </div>
                )}

                {/* If user is ALREADY logged in as this email */}
                {isUserMatch ? (
                  <div className="space-y-4 text-center py-2">
                    <div className="p-3 bg-surface-muted border border-border rounded-xl text-xs text-text-secondary leading-relaxed">
                      You are signed in as <strong className="text-text-primary">{user.email}</strong>. Click below to accept the invitation and enter the workspace directly.
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full justify-center py-2.5 font-bold"
                      loading={isSubmitting}
                      onClick={handleExistingUserAccept}
                    >
                      Accept Invitation & Open Workspace
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                ) : isDifferentUser ? (
                  /* If logged in as someone else */
                  <div className="space-y-4 text-center py-2">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      You are currently signed in as <strong className="font-bold">{user.email}</strong>, but this invitation was sent to <strong className="font-bold">{inviteDetails?.email}</strong>.
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full justify-center py-2.5 font-bold"
                      onClick={async () => {
                        await logoutUser();
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-1.5" />
                      Sign Out & Continue as {inviteDetails?.email}
                    </Button>
                  </div>
                ) : (
                  /* Setting Password Flow for Member */
                  <form onSubmit={handleSetPasswordSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-text-primary">Set Your Password</h2>
                      <p className="text-xs text-text-muted">
                        No email verification needed because this invitation was sent directly to your inbox.
                      </p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5 text-left">
                      <label htmlFor="invite-name" className="block text-xs font-semibold text-text-primary">
                        Your Full Name <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="invite-name"
                          name="name"
                          type="text"
                          required
                          autoFocus
                          minLength={2}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5 text-left">
                      <label htmlFor="invite-password" className="block text-xs font-semibold text-text-primary">
                        Password <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="invite-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create strong password"
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer focus:outline-none"
                          title={showPassword ? 'Hide password' : 'Show password'}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={password} />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5 text-left">
                      <label htmlFor="invite-confirm-password" className="block text-xs font-semibold text-text-primary">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="invite-confirm-password"
                          name="confirmPassword"
                          type={showConfirm ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer focus:outline-none"
                          title={showConfirm ? 'Hide password' : 'Show password'}
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Terms Agreement Checkbox */}
                    <label className="flex items-start gap-2.5 pt-1 text-xs text-text-secondary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-0.5 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <span>
                        I agree to the <strong className="text-text-primary">Terms of Service</strong> and <strong className="text-text-primary">Privacy Policy</strong>.
                      </span>
                    </label>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full justify-center py-2.5 font-bold shadow-md cursor-pointer mt-2"
                      loading={isSubmitting}
                    >
                      Set Password & Join Workspace
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-text-muted border-t border-border/60 shrink-0">
        Already have an active login?{' '}
        <Link to="/login" className="text-primary hover:underline font-semibold ml-1">
          Sign In
        </Link>
      </footer>
    </div>
  );
}
