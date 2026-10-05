import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { validateNextRedirect } from '../../lib/safeRedirect';

export default function LoginForm({ onSwitchToRegister }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUser } = useAuth();
  const [email, setEmail] = useState('demo@company.com');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await loginUser(email, password);
      const nextParam = searchParams.get('next');
      const target = validateNextRedirect(nextParam, '/');
      navigate(target, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-surface border border-border rounded-xl shadow-md text-left">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-primary-tint text-primary-text border border-primary/20">
          <LogIn className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Welcome back</h2>
        <p className="mt-1 text-sm text-text-secondary">Sign in to your team management workspace</p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 mb-5 text-sm text-danger-text bg-danger-tint border border-danger/30 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        Don't have an account?{' '}
        <Link
          to="/register"
          onClick={onSwitchToRegister}
          className="text-primary hover:text-primary-hover font-semibold cursor-pointer underline hover:no-underline"
        >
          Register team account
        </Link>
      </div>

      <div className="mt-6 pt-4 border-t border-border text-center">
        <p className="text-xs text-text-secondary">
          Demo account prefilled: <span className="text-text-primary font-medium">demo@company.com</span> / <span className="text-text-primary font-medium">password123</span>
        </p>
      </div>
    </div>
  );
}
