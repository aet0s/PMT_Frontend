import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import RegisterForm from '../components/Auth/RegisterForm';
import AuthProductShowcase from '../components/Auth/AuthProductShowcase';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export default function RegisterPage({ onSwitchToLogin }) {
  return (
    <div className="w-full h-screen min-h-screen overflow-hidden flex flex-col lg:flex-row bg-surface text-text-primary selection:bg-primary-tint selection:text-primary">
      {/* Div 1 (Left): Brand showcase & interactive kanban preview */}
      <div className="hidden lg:flex lg:w-1/2 h-full bg-surface-muted border-r border-border min-w-0 overflow-hidden relative">
        <AuthProductShowcase
          badge="Enterprise Organization Setup"
          title="Deploy high-velocity workspaces for your teams."
          description="Instant multi-tenant workspaces, customizable Kanban boards, team roles, and real-time collaboration ready in seconds."
        />
      </div>

      {/* Div 2 (Right): Registration form panel */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between items-center px-6 py-5 sm:px-10 sm:py-6 lg:px-12 lg:py-6 bg-surface min-w-0 overflow-y-auto lg:overflow-hidden relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <ThemeToggle />
        </div>

        {/* Form Center Body */}
        <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto my-auto py-2 min-w-0">
          <RegisterForm onSwitchToLogin={onSwitchToLogin} showFooter={false} />
        </div>

        {/* Anchored Bottom Footer */}
        <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto shrink-0 pt-4 pb-1 border-t border-border/70 flex flex-col items-center gap-2">
          <div className="text-center text-xs text-text-secondary">
            Already registered?{' '}
            <Link
              to="/login"
              onClick={onSwitchToLogin}
              className="text-primary hover:text-primary-hover font-bold cursor-pointer underline hover:no-underline ml-1"
            >
              Sign in here
            </Link>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
            <span>Protected with end-to-end 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
