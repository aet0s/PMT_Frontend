// client/src/pages/account/tabs/SecurityTab.jsx
import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  Check
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';

export default function SecurityTab({ setFormDirty }) {
  const toast = useToast();
  const { updateUserPassword } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Security & Authentication
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your account password and credential safeguards.
          </p>
        </div>
      </div>

      <div className="max-w-xl">
        {/* Card: Change Password */}
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
      </div>
    </div>
  );
}
