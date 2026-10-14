import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Shield,
  Layers,
  Briefcase,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Filter,
  CheckSquare,
  Square,
  Activity
} from 'lucide-react';
import MemberAuditModal from '../components/Members/MemberAuditModal';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  getCompanyMembers,
  updateCompanyMemberRole,
  assignCompanyMemberWorkspaces,
  assignCompanyMemberBoards,
  removeCompanyMember
} from '../api/workspaces';
import {
  createInvitation,
  regenerateInvitation,
  revokeInvitation,
  resendInvitationEmail
} from '../api/invitations';
import { usePermissions } from '../context/PermissionContext';
import { useSocket } from '../context/SocketProvider';

export default function CompanyMembersPage({ workspace, workspaces = [], boards = [] }) {
  const toast = useToast();
  const { hasPermission, userRole } = usePermissions();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const originId = socketContext?.originId;

  const canManage = hasPermission('member.assign_role') || hasPermission('member.remove') || userRole?.name === 'Owner' || userRole?.name === 'Admin';
  const canInvite = hasPermission('member.invite') || hasPermission('workspace.invite_members') || userRole?.name === 'Owner' || userRole?.name === 'Admin';

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'pending'
  const [members, setMembers] = useState([]);
  const [allWorkspaces, setAllWorkspaces] = useState(workspaces || []);
  const [allBoards, setAllBoards] = useState(boards || []);
  const [roles, setRoles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterWorkspaceId, setFilterWorkspaceId] = useState('all');

  // Single Edit Employee Modal state
  const [editEmployeeUser, setEditEmployeeUser] = useState(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [editWsIds, setEditWsIds] = useState([]);
  const [editBoardIds, setEditBoardIds] = useState([]);
  const [editModalSearch, setEditModalSearch] = useState('');
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // Single Invite Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteBoardIds, setInviteBoardIds] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);

  // Pending invite actions
  const [copiedId, setCopiedId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [resendingEmailId, setResendingEmailId] = useState(null);

  // Member audit log modal
  const [auditMember, setAuditMember] = useState(null);

  // Remove confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {}
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load paginated data
  const loadData = async (targetPage = currentPage, searchVal = debouncedSearch, wsFilter = filterWorkspaceId) => {
    if (!workspace?.id) return;
    setIsLoading(true);
    try {
      const data = await getCompanyMembers(workspace.id, {
        page: targetPage,
        limit: 20,
        search: searchVal,
        filterWorkspaceId: wsFilter
      });
      setMembers(data.members || []);
      if (data.pagination) {
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
      } else {
        // Fallback for mocked tests
        setPagination({
          page: 1,
          limit: 20,
          total: (data.members || []).length,
          totalPages: 1
        });
      }
      if (data.workspaces) setAllWorkspaces(data.workspaces);
      if (data.boards) setAllBoards(data.boards);
      if (data.roles) setRoles(data.roles);
      if (data.invitations) setInvitations(data.invitations);
    } catch (err) {
      toast.show(err.message || 'Failed to load company members directory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Members Directory | TaskFlow';
  }, []);

  // Fetch data on workspace change or filter change
  useEffect(() => {
    setCurrentPage(1);
    loadData(1, debouncedSearch, filterWorkspaceId);
  }, [workspace?.id, debouncedSearch, filterWorkspaceId]);

  useEffect(() => {
    if (workspace?.id && !inviteWorkspaceId) {
      setInviteWorkspaceId(String(workspace.id));
    }
  }, [workspace?.id, inviteWorkspaceId]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket || !workspace?.id) return;
    socket.emit('join_workspace', { workspaceId: workspace.id });

    const onMemberAdded = ({ originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      loadData(currentPage, debouncedSearch, filterWorkspaceId);
    };

    const onMemberRemoved = ({ originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      loadData(currentPage, debouncedSearch, filterWorkspaceId);
    };

    const onInviteCreated = ({ originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      loadData(currentPage, debouncedSearch, filterWorkspaceId);
    };

    const onInviteRevoked = ({ originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      loadData(currentPage, debouncedSearch, filterWorkspaceId);
    };

    socket.on('workspace:member_added', onMemberAdded);
    socket.on('workspace:member_removed', onMemberRemoved);
    socket.on('workspace:invitation_created', onInviteCreated);
    socket.on('workspace:invitation_revoked', onInviteRevoked);

    return () => {
      socket.off('workspace:member_added', onMemberAdded);
      socket.off('workspace:member_removed', onMemberRemoved);
      socket.off('workspace:invitation_created', onInviteCreated);
      socket.off('workspace:invitation_revoked', onInviteRevoked);
    };
  }, [socket, workspace?.id, originId, currentPage, debouncedSearch, filterWorkspaceId]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    loadData(newPage, debouncedSearch, filterWorkspaceId);
  };

  // Open Edit Employee Modal
  const openEditEmployeeModal = (member) => {
    setEditEmployeeUser(member);
    const existingRoleId = member.workspaces?.[0]?.role_id || (roles.find((r) => r.name === member.role)?.id || '');
    setEditRoleId(existingRoleId ? String(existingRoleId) : '');
    setEditWsIds((member.workspaces || []).map((w) => w.id));
    setEditBoardIds((member.boards || []).map((b) => b.id));
    setEditModalSearch('');
  };

  const handleToggleWorkspaceInEdit = (wsId) => {
    setEditWsIds((prev) => {
      const isSelected = prev.includes(wsId);
      if (isSelected) {
        // Also remove boards in this removed workspace
        const wsBoardIds = allBoards.filter((b) => b.workspace_id === wsId).map((b) => b.id);
        setEditBoardIds((prevB) => prevB.filter((bId) => !wsBoardIds.includes(bId)));
        return prev.filter((id) => id !== wsId);
      } else {
        return [...prev, wsId];
      }
    });
  };

  const handleToggleBoardInEdit = (boardId, wsId) => {
    setEditBoardIds((prev) => {
      const isSelected = prev.includes(boardId);
      if (isSelected) {
        return prev.filter((id) => id !== boardId);
      } else {
        // Auto-select parent workspace if not checked
        if (!editWsIds.includes(wsId)) {
          setEditWsIds((prevW) => [...prevW, wsId]);
        }
        return [...prev, boardId];
      }
    });
  };

  const handleSaveEmployee = async () => {
    if (!editEmployeeUser) return;
    setIsSavingEmployee(true);
    try {
      if (editRoleId) {
        await updateCompanyMemberRole(workspace.id, editEmployeeUser.id, Number(editRoleId));
      }
      await assignCompanyMemberWorkspaces(workspace.id, editEmployeeUser.id, editWsIds);
      await assignCompanyMemberBoards(workspace.id, editEmployeeUser.id, editBoardIds);

      toast.show(`Updated access & roles for ${editEmployeeUser.name}`, 'success');
      setEditEmployeeUser(null);
      loadData(currentPage, debouncedSearch, filterWorkspaceId);
    } catch (err) {
      toast.show(err.message || 'Failed to update employee', 'error');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Remove Employee
  const handleRemoveMember = (member) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member from Company',
      message: `Are you sure you want to remove ${member.name} (${member.email}) from the entire company? They will lose access to all workspaces and boards.`,
      confirmText: 'Remove Member',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await removeCompanyMember(workspace.id, member.id);
          toast.show(`${member.name} was removed from the organization`, 'success');
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
          setPagination((prev) => ({ ...prev, total: Math.max(0, (prev.total || 1) - 1) }));
          loadData(currentPage, debouncedSearch, filterWorkspaceId);
        } catch (err) {
          toast.show(err.message || 'Failed to remove member', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Send Invitation
  const handleSendInvite = async (e) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.show('Please enter a valid email address', 'error');
      return;
    }
    const targetWsId = Number(inviteWorkspaceId) || workspace.id;

    setIsInviting(true);
    setGeneratedInviteUrl('');
    setInviteEmailSent(false);
    try {
      const res = await createInvitation({
        email: inviteEmail.trim().toLowerCase(),
        workspace_id: targetWsId,
        role_id: inviteRoleId ? Number(inviteRoleId) : undefined,
        board_ids: inviteBoardIds
      });

      const inviteUrl = res.invite_url || (res.invite_token ? `${window.location.origin}/register?invite_token=${res.invite_token}&email=${encodeURIComponent(inviteEmail.trim())}` : '');
      setGeneratedInviteUrl(inviteUrl);
      setInviteEmailSent(Boolean(res.email_sent));
      toast.show(
        res.email_sent
          ? `Invitation sent to ${inviteEmail.trim()} by email!`
          : (res.message || 'Invitation created successfully'),
        'success'
      );
      loadData(currentPage, debouncedSearch, filterWorkspaceId);
    } catch (err) {
      toast.show(err.message || 'Failed to send invitation', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyGeneratedInvite = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setInviteCopied(true);
    toast.show('Invitation link copied to clipboard', 'info');
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const resetInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteRoleId('');
    setInviteBoardIds([]);
    setGeneratedInviteUrl('');
    setInviteEmailSent(false);
    setInviteCopied(false);
  };

  const handleResendEmail = async (inv) => {
    setResendingEmailId(inv.id);
    try {
      const res = await resendInvitationEmail(inv.id);
      toast.show(res.message || `Invitation email sent to ${inv.email}!`, 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to send invitation email', 'error');
    } finally {
      setResendingEmailId(null);
    }
  };

  // Pending Invite Actions
  const handleCopyInviteLink = (invite) => {
    const link = invite.invite_url || `${window.location.origin}/register?invite_token=${invite.token}&email=${encodeURIComponent(invite.email)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    toast.show('Invitation link copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRegenerateInvite = async (inviteId) => {
    setRegeneratingId(inviteId);
    try {
      const res = await regenerateInvitation(inviteId);
      toast.show('New invitation link generated', 'success');
      loadData(currentPage, debouncedSearch, filterWorkspaceId);
      if (res.invite_url) {
        navigator.clipboard.writeText(res.invite_url);
        toast.show('New invite link copied to clipboard', 'info');
      }
    } catch (err) {
      toast.show(err.message || 'Failed to regenerate invite', 'error');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRevokeInvite = (invite) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke Invitation',
      message: `Are you sure you want to revoke the pending invitation for ${invite.email}?`,
      confirmText: 'Revoke Invite',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await revokeInvitation(invite.id);
          toast.show('Invitation revoked successfully', 'success');
          loadData(currentPage, debouncedSearch, filterWorkspaceId);
        } catch (err) {
          toast.show(err.message || 'Failed to revoke invite', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const getRoleBadgeVariant = (roleName) => {
    const r = (roleName || '').toLowerCase();
    if (r.includes('owner')) return 'primary';
    if (r.includes('admin')) return 'info';
    if (r.includes('viewer') || r.includes('guest')) return 'secondary';
    return 'neutral';
  };

  const tabsConfig = [
    { id: 'members', label: 'All Members', count: pagination.total || members.length },
    { id: 'pending', label: 'Pending Invitations', count: invitations.length }
  ];

  // Filtered boards for edit employee modal
  const filteredBoardsInEdit = useMemo(() => {
    if (!editModalSearch.trim()) return allBoards;
    const q = editModalSearch.toLowerCase();
    return allBoards.filter((b) => b.name.toLowerCase().includes(q) || (b.workspace_name && b.workspace_name.toLowerCase().includes(q)));
  }, [allBoards, editModalSearch]);

  const filteredWorkspacesInEdit = useMemo(() => {
    if (!editModalSearch.trim()) return allWorkspaces;
    const q = editModalSearch.toLowerCase();
    return allWorkspaces.filter((w) => w.name.toLowerCase().includes(q));
  }, [allWorkspaces, editModalSearch]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center font-bold shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">
                Members
              </h1>
            </div>
            <p className="text-sm text-text-muted">
              Manage all organization users, workspace & board access, roles, and invitations.
            </p>
          </div>

          {canInvite && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsInviteModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
              className="cursor-pointer shadow-xs"
            >
              Invite Member
            </Button>
          )}
        </div>

        {/* Tab Selection */}
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />

        {/* ======================================================== */}
        {/* TAB 1: ALL MEMBERS DIRECTORY                             */}
        {/* ======================================================== */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members by name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-surface hover:bg-surface-hover focus:bg-surface border border-border focus:border-primary rounded-xl text-xs sm:text-sm font-medium text-text-primary placeholder:text-text-muted transition-colors outline-hidden shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted whitespace-nowrap">
                  Workspace:
                </span>
                <Select
                  value={filterWorkspaceId}
                  onChange={setFilterWorkspaceId}
                  size="sm"
                  className="w-48 text-xs font-semibold"
                  options={[
                    { value: 'all', label: 'All Workspaces' },
                    ...allWorkspaces.map((w) => ({ value: String(w.id), label: w.name }))
                  ]}
                />
              </div>
            </div>

            {/* Members Directory Table */}
            <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <Spinner size="lg" />
                  <p className="text-xs font-semibold text-text-secondary">Loading company members directory...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="py-16 text-center text-text-muted">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-semibold">No members found</p>
                  {debouncedSearch && (
                    <p className="text-xs text-text-muted mt-1">
                      No user matches "{debouncedSearch}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-surface-muted/40 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Workspaces Assigned</th>
                        <th className="py-3 px-4">Boards Assigned</th>
                        {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-sm">
                      {members.map((member) => (
                        <tr
                          key={member.id}
                          className="hover:bg-surface-muted/30 transition-colors"
                        >
                          {/* Name & Email */}
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <Avatar name={member.name} src={member.avatar_url || member.avatar} user={member} size="sm" />
                              <div className="min-w-0">
                                <span className="font-bold text-text-primary block truncate">
                                  {member.name}
                                </span>
                                <span className="text-xs text-text-muted block truncate">
                                  {member.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Primary Role */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge
                              variant={getRoleBadgeVariant(member.role)}
                              className="font-bold text-xs"
                            >
                              {member.role || 'Team Member'}
                            </Badge>
                          </td>

                          {/* Workspaces Assigned - COUNT ONLY */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-tint text-primary border border-primary/20">
                              <Briefcase className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {member.workspaces?.length || 0}{' '}
                                {member.workspaces?.length === 1 ? 'Workspace' : 'Workspaces'}
                              </span>
                            </span>
                          </td>

                          {/* Boards Assigned - COUNT ONLY */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-muted border border-border/70 text-text-secondary">
                              <Layers className="w-3.5 h-3.5 text-info shrink-0" />
                              <span>
                                {member.boards?.length || 0}{' '}
                                {member.boards?.length === 1 ? 'Board' : 'Boards'}
                              </span>
                            </span>
                          </td>

                          {/* Single Action Column: Exactly 2 buttons: Edit & Remove */}
                          {canManage && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setAuditMember(member)}
                                  leftIcon={<Activity className="w-3.5 h-3.5" />}
                                  className="text-xs font-semibold text-text-secondary hover:text-primary hover:bg-primary-tint cursor-pointer"
                                  title={`View audit log for ${member.name}`}
                                >
                                  Audit
                                </Button>

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openEditEmployeeModal(member)}
                                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                  className="text-xs font-semibold cursor-pointer shadow-2xs"
                                  title={`Edit ${member.name}`}
                                >
                                  Edit
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member)}
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  className="text-xs font-semibold text-danger hover:text-danger hover:bg-danger-tint cursor-pointer"
                                  title={`Remove ${member.name} from company`}
                                >
                                  Remove
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Server-Side Pagination Footer */}
              {!isLoading && pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-surface-muted/20">
                  <div className="text-xs font-semibold text-text-muted">
                    Showing {(currentPage - 1) * pagination.limit + 1} to{' '}
                    {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} employees
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentPage <= 1 || isLoading}
                      onClick={() => handlePageChange(currentPage - 1)}
                      leftIcon={<ChevronLeft className="w-4 h-4" />}
                      className="text-xs font-semibold cursor-pointer"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                        if (
                          p === 1 ||
                          p === pagination.totalPages ||
                          (p >= currentPage - 2 && p <= currentPage + 2)
                        ) {
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handlePageChange(p)}
                              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                p === currentPage
                                  ? 'bg-primary text-white shadow-2xs'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        }
                        if (p === currentPage - 3 || p === currentPage + 3) {
                          return (
                            <span key={p} className="px-1 text-xs text-text-muted select-none">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentPage >= pagination.totalPages || isLoading}
                      onClick={() => handlePageChange(currentPage + 1)}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                      className="text-xs font-semibold cursor-pointer"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PENDING INVITATIONS TAB                            */}
        {/* ======================================================== */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <Spinner size="lg" />
                  <p className="text-xs font-semibold text-text-secondary">Loading pending invitations...</p>
                </div>
              ) : invitations.length === 0 ? (
                <div className="py-16 text-center text-text-muted">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-semibold">No pending invitations</p>
                  <p className="text-xs text-text-muted mt-1">
                    All invited members have already registered and accepted.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-surface-muted/40 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                        <th className="py-3 px-4">Invited Email</th>
                        <th className="py-3 px-4">Workspace</th>
                        <th className="py-3 px-4">Assigned Role</th>
                        <th className="py-3 px-4">Assigned Boards</th>
                        <th className="py-3 px-4">Sent At</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-sm">
                      {invitations.map((inv) => (
                        <tr
                          key={inv.id}
                          className="hover:bg-surface-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-text-primary">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-text-muted shrink-0" />
                              <span className="truncate">{inv.email}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-semibold text-xs text-text-primary">
                              <Briefcase className="w-3.5 h-3.5 text-primary" />
                              {inv.workspace_name}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge variant="secondary" className="font-semibold text-xs">
                              {inv.role_name || 'Team Member'}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-muted border border-border/70 text-text-secondary">
                              <Layers className="w-3.5 h-3.5 text-info shrink-0" />
                              <span>
                                {inv.board_names?.length || 0}{' '}
                                {inv.board_names?.length === 1 ? 'Board' : 'Boards'}
                              </span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-text-muted whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(inv.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={resendingEmailId === inv.id}
                                onClick={() => handleResendEmail(inv)}
                                leftIcon={
                                  <Mail
                                    className={`w-3.5 h-3.5 text-primary ${
                                      resendingEmailId === inv.id ? 'animate-pulse' : ''
                                    }`}
                                  />
                                }
                                className="text-xs font-semibold cursor-pointer"
                                title="Resend invitation email"
                              >
                                {resendingEmailId === inv.id ? 'Sending...' : 'Resend Email'}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyInviteLink(inv)}
                                leftIcon={
                                  copiedId === inv.id ? (
                                    <Check className="w-3.5 h-3.5 text-success" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )
                                }
                                className="text-xs font-semibold cursor-pointer"
                                title="Copy invitation link"
                              >
                                {copiedId === inv.id ? 'Copied' : 'Copy Link'}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={regeneratingId === inv.id}
                                onClick={() => handleRegenerateInvite(inv.id)}
                                leftIcon={
                                  <RefreshCw
                                    className={`w-3.5 h-3.5 ${
                                      regeneratingId === inv.id ? 'animate-spin' : ''
                                    }`}
                                  />
                                }
                                className="text-xs font-semibold cursor-pointer"
                                title="Regenerate link"
                              >
                                Regenerate
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeInvite(inv)}
                                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                className="text-xs font-semibold text-danger hover:text-danger hover:bg-danger-tint cursor-pointer"
                                title="Revoke invitation"
                              >
                                Revoke
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* COMPREHENSIVE EDIT EMPLOYEE MODAL                        */}
        {/* Adds and removes Workspaces & Boards, changes Role       */}
        {/* ======================================================== */}
        <Modal
          isOpen={Boolean(editEmployeeUser)}
          onClose={() => setEditEmployeeUser(null)}
          title="Edit Employee Access & Role"
          size="lg"
        >
          {editEmployeeUser && (
            <div className="space-y-6">
              {/* Employee Summary Card */}
              <div className="flex items-center gap-3.5 p-3.5 bg-surface-muted/40 rounded-xl border border-border/70">
                <Avatar name={editEmployeeUser.name} src={editEmployeeUser.avatar_url || editEmployeeUser.avatar} user={editEmployeeUser} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary text-base truncate">
                      {editEmployeeUser.name}
                    </span>
                    <Badge variant={getRoleBadgeVariant(editEmployeeUser.role)} className="text-xs">
                      {editEmployeeUser.role || 'Member'}
                    </Badge>
                  </div>
                  <span className="text-xs text-text-muted block truncate">
                    {editEmployeeUser.email}
                  </span>
                </div>
              </div>

              {/* 1. Role Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Organization Role
                </label>
                <Select
                  value={editRoleId}
                  onChange={setEditRoleId}
                  className="w-full text-sm font-semibold"
                  options={roles.map((r) => ({
                    value: String(r.id),
                    label: `${r.name}${r.is_system ? ' (System)' : ''}`
                  }))}
                />
                <p className="text-[11px] text-text-muted">
                  Changing the role applies it across all assigned workspaces for this employee.
                </p>
              </div>

              {/* Quick filter in modal */}
              {(allWorkspaces.length > 4 || allBoards.length > 6) && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={editModalSearch}
                    onChange={(e) => setEditModalSearch(e.target.value)}
                    placeholder="Filter workspaces & boards..."
                    className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border/80 rounded-lg text-xs font-medium text-text-primary placeholder:text-text-muted outline-hidden"
                  />
                </div>
              )}

              {/* 2. Workspaces Assignment Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Workspaces Assigned
                  </label>
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary-tint">
                    {editWsIds.length} of {allWorkspaces.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-border/70 rounded-xl bg-surface">
                  {filteredWorkspacesInEdit.map((ws) => {
                    const isChecked = editWsIds.includes(ws.id);
                    return (
                      <div
                        key={ws.id}
                        onClick={() => handleToggleWorkspaceInEdit(ws.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-primary-tint/30 border-primary text-text-primary'
                            : 'bg-surface hover:bg-surface-muted/60 border-border/60 text-text-secondary'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted shrink-0" />
                        )}
                        <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-semibold truncate flex-1">{ws.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Boards Assignment Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Boards Assigned
                  </label>
                  <span className="text-xs font-bold text-info px-2 py-0.5 rounded-full bg-info/10">
                    {editBoardIds.length} of {allBoards.length} selected
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto p-2 border border-border/70 rounded-xl bg-surface space-y-3">
                  {allWorkspaces.map((ws) => {
                    const wsBoards = filteredBoardsInEdit.filter((b) => b.workspace_id === ws.id);
                    if (wsBoards.length === 0) return null;

                    return (
                      <div key={ws.id} className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border/40 pb-1">
                          <Briefcase className="w-3 h-3 text-primary shrink-0" />
                          <span>{ws.name}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                          {wsBoards.map((board) => {
                            const isChecked = editBoardIds.includes(board.id);
                            return (
                              <div
                                key={board.id}
                                onClick={() => handleToggleBoardInEdit(board.id, ws.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-info/10 border-info text-text-primary'
                                    : 'bg-surface hover:bg-surface-muted/60 border-border/60 text-text-secondary'
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-info shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-text-muted shrink-0" />
                                )}
                                <Layers className="w-3.5 h-3.5 text-info shrink-0" />
                                <span className="text-xs font-semibold truncate flex-1">
                                  {board.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {allBoards.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-4">No active boards found.</p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  variant="ghost"
                  onClick={() => setEditEmployeeUser(null)}
                  disabled={isSavingEmployee}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEmployee}
                  loading={isSavingEmployee}
                  leftIcon={<Check className="w-4 h-4" />}
                  className="cursor-pointer shadow-xs"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ======================================================== */}
        {/* SINGLE INVITE MEMBER MODAL IN ENTIRE APP                */}
        {/* ======================================================== */}
        <Modal
          isOpen={isInviteModalOpen}
          onClose={resetInviteModal}
          title="Invite Member to Organization"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-text-muted">
              Send an invitation directly to a member's email address. Once invited, they will receive an activation email with registration instructions and immediate workspace access.
            </p>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                disabled={Boolean(generatedInviteUrl)}
                className="w-full px-3 py-2 bg-surface hover:bg-surface-hover focus:bg-surface border border-border focus:border-primary rounded-xl text-sm font-medium text-text-primary placeholder:text-text-muted outline-hidden transition-colors"
              />
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-text-muted">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>An invitation email with activation link will be sent to this address.</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Primary Workspace
              </label>
              <Select
                value={inviteWorkspaceId}
                onChange={setInviteWorkspaceId}
                disabled={Boolean(generatedInviteUrl)}
                options={allWorkspaces.map((w) => ({ value: String(w.id), label: w.name }))}
                className="w-full text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Role to Grant
              </label>
              <Select
                value={inviteRoleId}
                onChange={setInviteRoleId}
                disabled={Boolean(generatedInviteUrl)}
                options={[
                  { value: '', label: 'Default Role (Team Member)' },
                  ...roles.map((r) => ({ value: String(r.id), label: r.name }))
                ]}
                className="w-full text-sm font-medium"
              />
            </div>

            {/* Generated Invite Result */}
            {generatedInviteUrl && (
              <div className="p-4 bg-primary-tint/40 border border-primary/30 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">
                    {inviteEmailSent ? 'Invitation Sent by Email & Link Generated' : 'Invitation Link Generated'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteUrl}
                    className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono text-text-primary outline-hidden"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCopyGeneratedInvite}
                    leftIcon={inviteCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    className="cursor-pointer shrink-0"
                  >
                    {inviteCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-[11px] text-text-muted">
                  {inviteEmailSent
                    ? `An invitation email was sent to ${inviteEmail}. You can also copy and share this link directly.`
                    : 'Share this secure registration link with the invited person to let them register.'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
              <Button
                variant="ghost"
                onClick={resetInviteModal}
                disabled={isInviting}
                className="cursor-pointer"
              >
                {generatedInviteUrl ? 'Close' : 'Cancel'}
              </Button>

              {!generatedInviteUrl && (
                <Button
                  variant="primary"
                  onClick={handleSendInvite}
                  isLoading={isInviting}
                  leftIcon={<Mail className="w-4 h-4" />}
                  className="cursor-pointer shadow-xs"
                >
                  Send Invitation
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Member Audit Log Modal */}
        <MemberAuditModal
          isOpen={!!auditMember}
          onClose={() => setAuditMember(null)}
          member={auditMember}
          workspaceId={workspace?.id}
        />
      </div>
    </div>
  );
}
