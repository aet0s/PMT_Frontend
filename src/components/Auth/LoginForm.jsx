// client/src/components/Auth/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, AlertCircle, Trello, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { validateNextRedirect } from '../../lib/safeRedirect';

export default function LoginForm({ onSwitchToRegister }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="w-full max-w-md p-8 sm:p-10 bg-surface border border-border rounded-3xl shadow-md text-left transition-all">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-primary text-white shadow-md">
          <Trello className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Welcome back
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-text-secondary">
          Sign in to your TaskFlow workspace
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 mb-6 text-xs sm:text-sm text-danger-text bg-danger-tint border border-danger/30 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          leftIcon={<Mail className="w-4 h-4 text-text-muted" />}
          className="rounded-xl"
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
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
          Sign In
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-border/70 text-center text-xs sm:text-sm text-text-secondary">
        Don't have an account?{' '}
        <Link
          to="/register"
          onClick={onSwitchToRegister}
          className="text-primary hover:text-primary-hover font-bold cursor-pointer underline hover:no-underline"
        >
          Register team account
        </Link>
      </div>
    </div>
  );
}
