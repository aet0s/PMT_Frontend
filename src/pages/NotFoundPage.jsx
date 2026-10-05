// client/src/pages/NotFoundPage.jsx
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Home, LayoutGrid, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage({
  title = 'Page Not Found or No Access',
  description = "The requested page, project, or card could not be found, or you don't have permission to access it."
}) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Page Not Found | TaskFlow';
  }, []);

  return (
    <div className="min-h-screen w-full bg-app flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-md p-8 bg-surface border border-border rounded-2xl shadow-lg space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-danger-tint border border-danger/20 flex items-center justify-center text-danger-text">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-text-primary tracking-tight" tabIndex={-1}>
            {title}
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
