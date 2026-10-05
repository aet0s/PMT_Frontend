// client/src/pages/account/tabs/SecurityTab.jsx
import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, Check, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';
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

  useEffect(() => {
    setTotpEnabled(Boolean(user?.two_factor_enabled));
  }, [user]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.show('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast.show('Password must be at least 6 characters', 'error');
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
    if (!confirmCodeInput || confirmCodeInput.length < 6) {
      toast.show('Please enter a valid 6-digit code', 'error');
      return;
    }
    setIsVerifyingCode(true);
    try {
      const res = await confirm2Fa(confirmCodeInput);
      setTotpEnabled(true);
      setIsSettingUp2Fa(false);
      setRecoveryCodes(res.recovery_codes || []);
      await refreshUser();
      toast.show('Two-factor authentication enabled successfully', 'success');
    } catch (err) {
      toast.show(err.message || 'Invalid 2FA code. Please try again.', 'error');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleDisable2Fa = async () => {
    const password = prompt('Enter your current password to disable 2FA:');
    if (!password) return;
    try {
      await disable2Fa(password);
      setTotpEnabled(false);
      setSetupData(null);
      await refreshUser();
      toast.show('Two-factor authentication disabled', 'info');
    } catch (err) {
      toast.show(err.message || 'Failed to disable 2FA', 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Security & Authentication</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Manage your account password, two-factor authentication, and security credentials.
        </p>
      </div>

      {/* Change Password Card */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-text-primary font-bold text-xs uppercase tracking-wider">
          <KeyRound className="w-4 h-4 text-primary" />
          <span>Change Password</span>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <Input
            label="Current Password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setFormDirty?.(true);
            }}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4 text-text-secondary" />}
          />

          <Input
            label="New Password"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setFormDirty?.(true);
            }}
            placeholder="Min 6 characters"
            leftIcon={<Lock className="w-4 h-4 text-text-secondary" />}
          />

          <Input
            label="Confirm New Password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setFormDirty?.(true);
            }}
            placeholder="Repeat new password"
            leftIcon={<Lock className="w-4 h-4 text-text-secondary" />}
          />

          <div className="flex justify-end pt-2">
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

      {/* 2FA Card */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Two-Factor Authentication (2FA)</span>
          </div>
          {totpEnabled && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-tint px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Enabled
            </span>
          )}
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Add an extra layer of security using Google Authenticator, Authy, or any TOTP app.
        </p>

        {totpEnabled ? (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable2Fa}
              className="text-danger border-danger/30 hover:bg-danger-tint"
            >
              Disable Two-Factor Authentication
            </Button>
          </div>
        ) : isSettingUp2Fa && setupData ? (
          <form onSubmit={handleConfirm2Fa} className="p-4 bg-surface-muted/50 rounded-xl space-y-4 border border-border">
            <p className="text-xs font-semibold text-text-primary">
              1. Scan this QR code in your authenticator app:
            </p>
            {setupData.qr_code && (
              <div className="flex justify-center p-3 bg-white rounded-lg border border-border w-fit mx-auto">
                <img src={setupData.qr_code} alt="2FA QR Code" className="w-40 h-40" />
              </div>
            )}
            <p className="text-xs font-semibold text-text-primary">
              2. Enter the 6-digit verification code from the app:
            </p>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                value={confirmCodeInput}
                onChange={(e) => setConfirmCodeInput(e.target.value)}
                maxLength={6}
                placeholder="123456"
                className="font-mono text-center tracking-widest text-base"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isVerifyingCode}
              >
                Verify
              </Button>
            </div>
          </form>
        ) : (
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleStart2FaSetup}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Set Up Two-Factor Authentication
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
