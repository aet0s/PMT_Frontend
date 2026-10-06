import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { getWorkspaces } from '../api/workspaces';
import { useAuth } from '../hooks/useAuth';
import { getTenantItem, setTenantItem, removeTenantItem } from '../lib/storage';

export default function NotFoundPage({
  title = 'Page Not Found or No Access',
  description = "The requested page, project, or card could not be found, or you don't have permission to access it."
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    document.title = 'Page Not Found | TaskFlow';
  }, []);

  const handleGoHome = async () => {
    setIsNavigating(true);
    try {
      const data = await getWorkspaces();
      const activeWorkspaces = (data.workspaces || []).filter((w) => !w.is_archived);
      if (activeWorkspaces.length > 0) {
        const lastWsId = getTenantItem(user?.tenant_id, 'last_workspace_id', null);
        const matched = activeWorkspaces.find((w) => String(w.id) === String(lastWsId));
        const targetWs = matched || activeWorkspaces[0];
        setTenantItem(user?.tenant_id, 'last_workspace_id', targetWs.id);
        navigate(`/w/${targetWs.id}/home`, { replace: true });
        return;
      }
      removeTenantItem(user?.tenant_id, 'last_workspace_id');
      navigate('/w/none', { replace: true });
    } catch {
      navigate('/', { replace: true });
    } finally {
      setIsNavigating(false);
    }
  };

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
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                handleGoHome();
              }
            }}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={isNavigating}
            onClick={handleGoHome}
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
