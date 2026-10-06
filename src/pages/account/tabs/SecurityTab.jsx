// client/src/pages/account/tabs/SecurityTab.jsx
import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  Check,
  AlertCircle,
  Copy,
  CheckCircle2,
  QrCode,
  ShieldAlert,
  Info
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { generate2FaSetup, confirm2Fa, disable2Fa } from '../../../api/auth';

export default function SecurityTab({ setFormDirty }) {
  const toast = useToast();
  const { user, updateUserPassword, refreshUser } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(Boolean(user?.two_factor_enabled));
  const [isSettingUp2Fa, setIsSettingUp2Fa] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Disable 2FA state
  const [isDisabling2Fa, setIsDisabling2Fa] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  useEffect(() => {
    setTotpEnabled(Boolean(user?.two_factor_enabled));
  }, [user]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.show('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      toast.show('Password must be at least 8 characters long', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      toast.show('Password updated successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to update password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleStart2FaSetup = async () => {
    try {
      const data = await generate2FaSetup();
      setSetupData(data);
      setIsSettingUp2Fa(true);
    } catch (err) {
      toast.show(err.message || 'Failed to initialize 2FA setup', 'error');
    }
  };

  const handleConfirm2Fa = async (e) => {
    e.preventDefault();
    if (!confirmCodeInput || confirmCodeInput.trim().length !== 6) {
      toast.show('Please enter a valid 6-digit verification code', 'error');
      return;
    }
    if (!setupData?.secret) {
      toast.show('2FA setup session expired, please restart setup', 'error');
      return;
    }

    setIsVerifyingCode(true);
    try {
      // Pass both secret and token code
      const res = await confirm2Fa(setupData.secret, confirmCodeInput.trim());
      setTotpEnabled(true);
      setIsSettingUp2Fa(false);
      setRecoveryCodes(res.recovery_codes || []);
      await refreshUser();
      toast.show('Two-factor authentication enabled successfully', 'success');
    } catch (err) {
      toast.show(err.message || 'Invalid 2FA code. Please verify the code in your authenticator app and try again.', 'error');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleDisable2Fa = async (e) => {
    e.preventDefault();
    if (!disablePassword) {
      toast.show('Please enter your account password to confirm', 'error');
      return;
    }
    setIsDisabling2Fa(true);
    try {
      await disable2Fa(disablePassword);
      setTotpEnabled(false);
      setSetupData(null);
      setShowDisableForm(false);
      setDisablePassword('');
      await refreshUser();
      toast.show('Two-factor authentication disabled', 'info');
    } catch (err) {
      toast.show(err.message || 'Failed to disable 2FA', 'error');
    } finally {
      setIsDisabling2Fa(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    if (recoveryCodes.length === 0) return;
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    toast.show('Recovery codes copied to clipboard', 'success');
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Security & Authentication
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your account password, multi-factor authentication (2FA), and credential safeguards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Change Password */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Change Password
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Update your login password. Passwords must be at least 8 characters.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4">
              <Input
                label="Current Password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setFormDirty?.(true);
                }}
                required
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4 text-text-secondary" />}
              />

              <Input
                label="New Password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setFormDirty?.(true);
                }}
                required
                placeholder="At least 8 characters"
                leftIcon={<KeyRound className="w-4 h-4 text-text-secondary" />}
              />

              <Input
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFormDirty?.(true);
                }}
                required
                placeholder="Repeat new password"
                leftIcon={<KeyRound className="w-4 h-4 text-text-secondary" />}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isUpdatingPassword}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Card 2: Two-Factor Authentication (2FA) */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Two-Factor Authentication (2FA)
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Protect your account with standard TOTP authenticator apps (Google Authenticator, Authy).
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  totpEnabled ? 'bg-success-tint text-success-text' : 'bg-surface-muted text-text-muted'
                }`}
              >
                {totpEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {!totpEnabled && !isSettingUp2Fa && (
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    When enabled, signing into your TaskFlow account requires entering a 6-digit security code generated by your mobile authenticator app.
                  </p>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleStart2FaSetup}
                    leftIcon={<QrCode className="w-4 h-4" />}
                  >
                    Set Up Two-Factor Authentication
                  </Button>
                </div>
              )}

              {/* 2FA Setup Flow */}
              {isSettingUp2Fa && setupData && (
                <div className="p-4 bg-surface-muted/50 border border-border rounded-xl space-y-4">
                  <p className="text-xs font-bold text-text-primary">
                    1. Scan QR Code in your Authenticator app:
                  </p>
                  {setupData.qr_code && (
                    <div className="bg-white p-3 rounded-lg border border-border inline-block shadow-2xs">
                      <img
                        src={setupData.qr_code}
                        alt="2FA QR Code"
                        className="w-36 h-36"
                      />
                    </div>
                  )}

                  {setupData.secret && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-text-secondary">Manual entry secret key:</p>
                      <code className="text-xs font-mono font-bold text-primary bg-primary-tint px-2 py-1 rounded block select-all">
                        {setupData.secret}
                      </code>
                    </div>
                  )}

                  <form onSubmit={handleConfirm2Fa} className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-text-primary">
                      2. Enter the 6-digit verification code:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={confirmCodeInput}
                        onChange={(e) => setConfirmCodeInput(e.target.value.replace(/\D/g, ''))}
                        className="w-32 px-3 py-1.5 text-center font-mono text-base tracking-widest bg-surface border border-border rounded-lg focus:outline-none focus:border-primary"
                        required
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isVerifyingCode}
                      >
                        Verify & Enable
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSettingUp2Fa(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Recovery Codes Display */}
              {recoveryCodes.length > 0 && (
                <div className="p-4 bg-success-tint/20 border border-success/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-success-text flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Save Your Backup Recovery Codes
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyRecoveryCodes}
                      className="px-2 py-1 text-xs font-semibold text-success hover:bg-success-tint rounded transition cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCodes ? 'Copied!' : 'Copy All'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-3 bg-surface border border-border rounded-lg font-mono text-xs">
                    {recoveryCodes.map((code, idx) => (
                      <span key={idx} className="text-text-primary">{code}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Store these in a secure password manager. Each code can only be used once if you lose your device.
                  </p>
                </div>
              )}

              {/* Disable 2FA Section */}
              {totpEnabled && !showDisableForm && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-success-text font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Two-factor authentication is active on your account.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableForm(true)}
                  >
                    Disable Two-Factor Authentication
                  </Button>
                </div>
              )}

              {totpEnabled && showDisableForm && (
                <form onSubmit={handleDisable2Fa} className="p-4 bg-danger-tint/10 border border-danger/30 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-danger-text">
                    Confirm Password to Disable 2FA
                  </p>
                  <input
                    type="password"
                    placeholder="Account password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-danger"
                    required
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="danger"
                      size="sm"
                      isLoading={isDisabling2Fa}
                    >
                      Confirm Disable
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDisableForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
