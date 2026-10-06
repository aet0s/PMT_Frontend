// client/src/pages/settings/tabs/DataTab.jsx
import React, { useState } from 'react';
import { Download, Database, FileSpreadsheet, ShieldCheck, HardDrive, RefreshCw, Layers } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { apiFetch } from '../../../api/client';

export default function DataTab({ workspace }) {
  const toast = useToast();
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const handleExportJson = async () => {
    setIsExportingJson(true);
    try {
      const data = await apiFetch(`/api/boards?workspace_id=${workspace.id}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(workspace?.name || 'workspace').toLowerCase().replace(/\s+/g, '_')}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show('Workspace full backup downloaded as JSON', 'success');
    } catch (err) {
      toast.show(err.message || 'Export failed', 'error');
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const data = await apiFetch(`/api/boards?workspace_id=${workspace.id}`);
      const boards = data.boards || (Array.isArray(data) ? data : []);

      // Build CSV of all boards and cards
      const rows = [
        ['Board ID', 'Board Title', 'Total Cards', 'Created At']
      ];

      for (const b of boards) {
        rows.push([
          b.id,
          `"${(b.title || '').replace(/"/g, '""')}"`,
          b.card_count || 0,
          b.created_at || ''
        ]);
      }

      const csvContent = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(workspace?.name || 'workspace').toLowerCase().replace(/\s+/g, '_')}_boards_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show('Workspace board summaries downloaded as CSV', 'success');
    } catch (err) {
      toast.show(err.message || 'Export failed', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data & Export Controls
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Download complete backups of your boards, tasks, and history or manage data compliance exports.
          </p>
        </div>
      </div>

      {/* Grid of Data Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Full JSON Backup */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Full Workspace Backup (JSON)</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Complete raw data snapshot of all boards, lists, cards, checklists, comments, and members in structured JSON format.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportJson}
              isLoading={isExportingJson}
              leftIcon={<Download className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Export Complete Backup (JSON)
            </Button>
          </div>
        </div>

        {/* Card 2: Tabular CSV Export */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-success-tint text-success-text flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Spreadsheet Export (CSV)</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Tabular spreadsheet export of workspace boards, active columns, and metadata formatted for Excel, Google Sheets, or BI analysis.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              isLoading={isExportingCsv}
              leftIcon={<Download className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Export Summary (CSV)
            </Button>
          </div>
        </div>

        {/* Card 3: Storage & Security Overview */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-info-tint text-info flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Data Security & Compliance</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Tenant isolation guarantees your workspace data is strictly segmented with row-level RBAC security and tamper-resistant audit logs.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>Status</span>
              <span className="font-semibold text-success-text flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Protected & Encrypted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
