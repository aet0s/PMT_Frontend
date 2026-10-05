// client/src/pages/WorkspaceHomePage.jsx
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LayoutGrid, CheckCircle2, Clock, Calendar, Sparkles, FolderPlus } from 'lucide-react';
import Button from '../components/ui/Button';

export default function WorkspaceHomePage({ workspace, boards = [], onCreateBoard }) {
  const { workspaceId } = useParams();

  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Home | TaskFlow`;
  }, [workspace]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h1 tabIndex={-1} className="text-2xl font-extrabold text-text-primary tracking-tight">
            Welcome to {workspace?.name || 'your workspace'}
          </h1>
          <p className="text-xs text-text-secondary">
            Manage your active boards, recent tasks, and team projects.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-surface border border-border rounded-xl shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{boards.length}</p>
              <p className="text-xs text-text-secondary">Active Projects</p>
            </div>
          </div>

          <div className="p-4 bg-surface border border-border rounded-xl shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-success-tint text-success flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">Ready</p>
              <p className="text-xs text-text-secondary">System Operational</p>
            </div>
          </div>

          <div className="p-4 bg-surface border border-border rounded-xl shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-warning-tint text-warning flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">Pro</p>
              <p className="text-xs text-text-secondary">Enterprise Plan</p>
            </div>
          </div>
        </div>

        {/* Boards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Projects & Boards
            </h2>
            {onCreateBoard && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateBoard}
                leftIcon={<FolderPlus className="w-3.5 h-3.5" />}
              >
                Create Project
              </Button>
            )}
          </div>

          {boards.length === 0 ? (
            <div className="p-12 bg-surface border border-border rounded-xl text-center space-y-3">
              <p className="text-sm text-text-secondary">No projects yet in this workspace.</p>
              {onCreateBoard && (
                <Button variant="primary" size="md" onClick={onCreateBoard}>
                  Create your first project
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {boards.map((b) => (
                <Link
                  key={b.id}
                  to={`/w/${workspaceId}/p/${b.id}/board`}
                  className="p-4 bg-surface hover:bg-surface-hover border border-border hover:border-primary/40 rounded-xl shadow-xs transition-all flex flex-col justify-between h-28 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                      {b.name}
                    </span>
                    <div className="w-3 h-3 rounded-full bg-primary/40 border border-primary" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <LayoutGrid className="w-3.5 h-3.5 text-text-muted" />
                    <span>Open board</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
