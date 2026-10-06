// client/src/pages/account/tabs/ProfileTab.jsx
import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Camera, Trash2, Check, Shield, Calendar, Sparkles, Info } from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { uploadAvatar } from '../../../api/auth';
import { formatDate } from '../../../lib/dateFormat';

export default function ProfileTab({ setFormDirty }) {
  const toast = useToast();
  const { user, updateUserProfile, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setFormDirty?.(false);
  }, [user, setFormDirty]);

  const handleNameChange = (e) => {
    setName(e.target.value);
    setFormDirty?.(e.target.value !== (user?.name || ''));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.show('Full Name cannot be empty', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateUserProfile({ name: name.trim(), email: user?.email });
      toast.show('Profile updated successfully', 'success');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.show('Please select a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.show('Image size exceeds 5MB limit', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      await refreshUser();
      toast.show('Profile picture updated successfully', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await updateUserProfile({ avatar_url: null });
      await refreshUser();
      toast.show('Profile picture removed', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to remove picture', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Information
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your personal profile details, display name, and avatar visible across teams.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Form & Avatar (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Avatar Card */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Profile Photo</h3>
            <p className="text-xs text-text-secondary">
              Upload a profile picture to help teammates recognize you on task assignments and discussions.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-2">
              <Avatar name={user?.name || 'User'} src={user?.avatar_url} size="xl" />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploadingAvatar}
                    leftIcon={<Camera className="w-3.5 h-3.5" />}
                  >
                    Upload New Photo
                  </Button>
                  {user?.avatar_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-danger" />}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-text-muted">
                  Supports JPG, PNG or WebP. Max file size: 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Personal Details Form */}
          <form onSubmit={handleSave} className="bg-surface border border-border rounded-xl p-6 shadow-xs space-y-5">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary">Account Details</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Your primary identity used for notifications, mentions, and activity history.
              </p>
            </div>

            <Input
              label="Full Name"
              value={name}
              onChange={handleNameChange}
              required
              placeholder="e.g. Hardick Bhadauria"
              leftIcon={<User className="w-4 h-4 text-text-secondary" />}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-secondary">
                  Email Address
                </label>
                <span className="px-2 py-0.5 bg-success-tint text-success-text text-[10px] font-bold rounded-full">
                  Verified
                </span>
              </div>
              <Input
                value={email}
                disabled
                leftIcon={<Mail className="w-4 h-4 text-text-secondary" />}
              />
              <p className="text-[11px] text-text-muted">
                Your registered email address is used to securely sign in and receive task notifications.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Right Info Column (1 col) */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Account Status
            </h3>

            <div className="divide-y divide-border text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-text-secondary">User ID</span>
                <span className="font-mono text-text-primary font-bold">#{user?.id}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-text-secondary">Account Status</span>
                <span className="px-2 py-0.5 rounded-full bg-success-tint text-success-text text-[10px] font-bold">
                  Active
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-text-secondary">2FA Protection</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user?.two_factor_enabled ? 'bg-success-tint text-success-text' : 'bg-surface-muted text-text-muted'}`}>
                  {user?.two_factor_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {user?.created_at && (
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-text-secondary">Member Since</span>
                  <span className="font-medium text-text-primary">
                    {formatDate(user.created_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Workspace Privacy
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Your avatar and display name are visible to team members within workspaces you belong to. Security logs track all logins and password changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
