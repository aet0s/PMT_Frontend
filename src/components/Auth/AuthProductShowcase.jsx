import React from 'react';
import {
  Trello,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
  Lock,
  Clock,
  TrendingUp,
  Users
} from 'lucide-react';

export default function AuthProductShowcase({
  badge = 'Enterprise Project Management',
  title = 'Organize projects, plan sprints, and ship work together.',
  description = 'The high-velocity agile workspace built for cross-functional teams to streamline backlogs, track sprints, and maintain full delivery visibility.'
}) {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-5 lg:p-6 bg-surface-muted/90 border-b lg:border-b-0 lg:border-r border-border/70 select-none overflow-hidden relative min-w-0">
      {/* Decorative ambient gradients (strictly token-compliant, no backdrop blur or black) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary-tint/60 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-tint/50 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Top Header: Brand Identity & Headline */}
      <div className="relative z-10 shrink-0 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs shrink-0">
              <Trello className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-text-primary">
                  TaskFlow
                </span>
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-primary-tint text-primary-text border border-primary/20">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] text-text-muted truncate">
                Collaborative Project & Sprint Management
              </p>
            </div>
          </div>
        </div>

        {/* Headline and Supporting Copy */}
        <div className="space-y-1.5 max-w-lg mb-2 sm:mb-3 min-w-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-tint border border-primary/20 text-primary-text text-[10px] font-semibold">
            <Sparkles className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{badge}</span>
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-text-primary tracking-tight leading-snug">
            {title}
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Middle: Miniature Kanban Board Preview */}
      <div className="relative z-10 my-2 sm:my-3 min-w-0">
        <div className="bg-surface border border-border/90 rounded-2xl p-3 shadow-sm space-y-2.5 min-w-0 overflow-hidden">
          {/* Mini Board Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-border/70 min-w-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5.5 h-5.5 rounded-lg bg-primary text-white flex items-center justify-center text-xs shadow-2xs shrink-0">
                <Layers className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-text-primary flex items-center gap-1.5 truncate">
                  <span className="truncate">Sprint 44 — Core Deliverables</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                </div>
                <div className="text-[9px] text-text-muted truncate">
                  Active sprint • 14 tasks remaining
                </div>
              </div>
            </div>

            {/* Mini Avatar Group */}
            <div className="flex items-center -space-x-1 shrink-0">
              <div className="w-5 h-5 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center border-2 border-surface">
                JD
              </div>
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-surface">
                AK
              </div>
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-surface">
                SR
              </div>
              <div className="w-5 h-5 rounded-full bg-surface-muted text-text-secondary text-[8px] font-semibold flex items-center justify-center border-2 border-surface">
                +4
              </div>
            </div>
          </div>

          {/* 3 Miniature Kanban Columns */}
          <div className="grid grid-cols-3 gap-2 min-w-0">
            {/* Column 1: Backlog */}
            <div className="bg-surface-muted/80 border border-border/60 rounded-xl p-2 flex flex-col gap-1.5 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary px-0.5">
                <span className="flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
                  <span className="truncate">Backlog</span>
                </span>
                <span className="px-1 py-0.2 rounded-full bg-surface text-text-muted text-[9px] border border-border/50 shrink-0">
                  2
                </span>
              </div>

              {/* Card 1 */}
              <div className="bg-surface border border-border/80 rounded-lg p-1.5 shadow-2xs space-y-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-primary-tint text-primary-text border border-primary/20 truncate">
                    Design
                  </span>
                  <span className="text-[8px] font-medium text-danger-text bg-danger-tint px-1 py-0.2 rounded shrink-0">
                    High
                  </span>
                </div>
                <div className="text-[10px] font-semibold text-text-primary leading-tight truncate" title="WCAG Contrast Audit & Tokens">
                  WCAG Contrast Audit
                </div>
                <div className="flex items-center justify-between text-[9px] text-text-muted pt-0.5">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-text-muted shrink-0" /> 2d
                  </span>
                  <span className="w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] flex items-center justify-center font-bold shrink-0">
                    JD
                  </span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-surface border border-border/80 rounded-lg p-1.5 shadow-2xs space-y-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-warning-tint text-warning-text border border-warning/20 truncate">
                    Security
                  </span>
                  <span className="text-[8px] font-medium text-text-muted shrink-0">
                    3 pts
                  </span>
                </div>
                <div className="text-[10px] font-semibold text-text-primary leading-tight truncate" title="Rate Limiting & Lockout Guard">
                  Rate Limiting Guard
                </div>
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="bg-surface-muted/80 border border-border/60 rounded-xl p-2 flex flex-col gap-1.5 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary px-0.5">
                <span className="flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="truncate">In Progress</span>
                </span>
                <span className="px-1 py-0.2 rounded-full bg-primary-tint text-primary-text text-[9px] border border-primary/20 font-bold shrink-0">
                  1
                </span>
              </div>

              {/* Card 3 (Active) */}
              <div className="bg-surface border-2 border-primary/40 rounded-lg p-1.5 shadow-2xs space-y-1.5 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-primary text-white truncate">
                    Platform
                  </span>
                  <span className="text-[8px] font-bold text-danger-text bg-danger-tint px-1 py-0.2 rounded shrink-0">
                    Urgent
                  </span>
                </div>
                <div className="text-[10px] font-bold text-text-primary leading-tight truncate" title="Tenant Database Partitioning">
                  Tenant DB Partition
                </div>

                {/* Progress bar */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] text-text-muted">
                    <span>Subtasks</span>
                    <span className="font-semibold text-primary">4 / 5</span>
                  </div>
                  <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-primary rounded-full" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-text-muted pt-0.5">
                  <span className="text-primary font-medium flex items-center gap-0.5 truncate">
                    <TrendingUp className="w-2.5 h-2.5 text-primary shrink-0" /> On track
                  </span>
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[8px] flex items-center justify-center font-bold shrink-0">
                    AK
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Done */}
            <div className="bg-surface-muted/80 border border-border/60 rounded-xl p-2 flex flex-col gap-1.5 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary px-0.5">
                <span className="flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                  <span className="truncate">Done</span>
                </span>
                <span className="px-1 py-0.2 rounded-full bg-success-tint text-success-text text-[9px] border border-success/30 font-bold shrink-0">
                  3
                </span>
              </div>

              {/* Card 4 */}
              <div className="bg-surface border border-border/80 rounded-lg p-1.5 shadow-2xs space-y-1 opacity-90 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-success-tint text-success-text border border-success/30 truncate">
                    Auth
                  </span>
                  <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                </div>
                <div className="text-[10px] font-medium text-text-muted leading-tight truncate line-through" title="TOTP 2FA Challenge Flow">
                  TOTP 2FA Challenge
                </div>
                <div className="flex items-center justify-between text-[9px] text-text-muted pt-0.5">
                  <span>Verified</span>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white text-[8px] flex items-center justify-center font-bold shrink-0">
                    SR
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Trust & Security Indicators */}
      <div className="relative z-10 pt-2.5 border-t border-border/70 space-y-2 shrink-0 min-w-0">
        <div className="grid grid-cols-3 gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface border border-border/70 min-w-0 overflow-hidden">
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-text-primary truncate">SOC 2 Type II</div>
              <div className="text-[9px] text-text-muted truncate">Compliant</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface border border-border/70 min-w-0 overflow-hidden">
            <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-text-primary truncate">256-bit AES</div>
              <div className="text-[9px] text-text-muted truncate">Encrypted</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface border border-border/70 min-w-0 overflow-hidden">
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-text-primary truncate">99.99% SLA</div>
              <div className="text-[9px] text-text-muted truncate">Guaranteed</div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-text-muted flex items-center gap-1.5 truncate">
          <Users className="w-3 h-3 text-text-muted shrink-0" />
          <span className="truncate">Supporting over 1,400+ engineering & product organizations</span>
        </p>
      </div>
    </div>
  );
}
