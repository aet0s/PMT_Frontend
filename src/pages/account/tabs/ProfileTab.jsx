// client/src/pages/account/tabs/ProfileTab.jsx
import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Camera, Trash2, Check, Sparkles } from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { uploadAvatar } from '../../../api/auth';

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
      toast.show('Name cannot be empty', 'error');
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
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      await refreshUser();
      toast.show('Avatar uploaded successfully', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to upload avatar', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await updateUserProfile({ avatar_url: null });
      await refreshUser();
      toast.show('Avatar removed', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to remove avatar', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Profile Information</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Update your account details and profile picture shown across workspaces.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4 pb-5 border-b border-border">
          <Avatar name={user?.name} src={user?.avatar_url} size="xl" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-primary">Profile Photo</p>
            <div className="flex items-center gap-2">
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
                Change Photo
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
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={handleNameChange}
            required
            leftIcon={<User className="w-4 h-4 text-text-secondary" />}
          />

          <Input
            label="Email Address"
            value={email}
            disabled
            hint="Email cannot be changed directly in internal demo mode."
            leftIcon={<Mail className="w-4 h-4 text-text-secondary" />}
          />

          <div className="flex justify-end pt-2">
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
    </div>
  );
}
