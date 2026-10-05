// client/src/pages/settings/tabs/DataTab.jsx
import React, { useState } from 'react';
import { Download, Upload, Archive, FileText, Database } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { apiFetch } from '../../../api/client';

export default function DataTab({ workspace }) {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      // Fetch full workspace data dump
      const data = await apiFetch(`/api/workspaces/${workspace.id}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workspace.name.toLowerCase().replace(/\s+/g, '_')}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show('Workspace data exported as JSON', 'success');
    } catch (err) {
      toast.show(err.message || 'Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Data & Export Controls</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Download complete backups of your boards, tasks, and history or manage data exports.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-text-primary">Full Workspace Backup (JSON)</h3>
            </div>
            <p className="text-[11px] text-text-secondary">
              Export all boards, lists, cards, comments, checklist items, and member assignments in structured JSON format.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            isLoading={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
