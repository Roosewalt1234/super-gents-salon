import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, GitBranch } from 'lucide-react';

interface UserRecord {
  id: string;
  label: string;
}

interface Branch {
  branch_id: string;
  branch_name: string;
  location: string | null;
  shop_number: string | null;
  status: string;
}

interface UserBranchPermission {
  id: string;
  user_id: string;
  branch_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function BranchPermissionsTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [permissions, setPermissions] = useState<Record<string, UserBranchPermission>>({});
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); fetchBranches(); }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserBranchPermissions(selectedUser.id);
      setHasUnsavedChanges(false);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setUsers((data || []).map(p => ({ id: p.user_id, label: p.full_name?.trim() || p.user_id })));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_details')
        .select('branch_id, branch_name, location, shop_number, status');
      if (error) throw error;
      setBranches((data || []).filter(b => b.status === 'active'));
    } catch {
      toast.error('Failed to load branches');
    }
  };

  const fetchUserBranchPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_branch_permissions')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      const map: Record<string, UserBranchPermission> = {};
      (data || []).forEach(p => { map[p.branch_id] = p; });
      setPermissions(map);
    } catch {
      toast.error('Failed to load branch permissions');
    }
  };

  const getPermissionStatus = (branchId: string) => {
    const p = permissions[branchId];
    return p ?? { can_view: false, can_create: false, can_edit: false, can_delete: false };
  };

  const handlePermissionChange = (
    userId: string,
    branchId: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setPermissions(prev => {
      const next = { ...prev };
      if (action === 'can_view' && value) {
        next[branchId] = { id: next[branchId]?.id || '', user_id: userId, branch_id: branchId, can_view: true, can_create: true, can_edit: true, can_delete: true };
      } else if (action === 'can_view' && !value) {
        delete next[branchId];
      } else if (next[branchId]) {
        next[branchId] = { ...next[branchId], [action]: value };
      }
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('user_branch_permissions').select('*').eq('user_id', selectedUser.id);
      if (fetchErr) {
        toast.warning('Branch permissions system not yet configured. Please run the database migrations first.');
        return;
      }

      const existingMap = new Map((existing || []).map(p => [p.branch_id, p]));
      const toInsert: object[] = [];
      const toUpdate: { id: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[] = [];
      const toDelete: string[] = [];

      Object.values(permissions).forEach(perm => {
        const ex = existingMap.get(perm.branch_id);
        if (!ex) {
          toInsert.push({ user_id: perm.user_id, branch_id: perm.branch_id, can_view: perm.can_view, can_create: perm.can_create, can_edit: perm.can_edit, can_delete: perm.can_delete });
        } else if (ex.can_view !== perm.can_view || ex.can_create !== perm.can_create || ex.can_edit !== perm.can_edit || ex.can_delete !== perm.can_delete) {
          toUpdate.push({ id: ex.id, can_view: perm.can_view, can_create: perm.can_create, can_edit: perm.can_edit, can_delete: perm.can_delete });
        }
        existingMap.delete(perm.branch_id);
      });
      toDelete.push(...Array.from(existingMap.keys()));

      const ops = [];
      if (toInsert.length) ops.push(supabase.from('user_branch_permissions').insert(toInsert));
      for (const u of toUpdate) {
        ops.push(supabase.from('user_branch_permissions').update({ can_view: u.can_view, can_create: u.can_create, can_edit: u.can_edit, can_delete: u.can_delete }).eq('id', u.id));
      }
      if (toDelete.length) ops.push(supabase.from('user_branch_permissions').delete().eq('user_id', selectedUser.id).in('branch_id', toDelete));
      if (ops.length) await Promise.all(ops);

      await fetchUserBranchPermissions(selectedUser.id);
      setHasUnsavedChanges(false);
      toast.success('Branch permissions saved successfully');
    } catch {
      toast.error('Failed to save branch permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select User
          </CardTitle>
          <CardDescription>Choose a user to manage branch permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              value={selectedUser?.id || ''}
              onValueChange={(userId) => {
                const u = users.find(u => u.id === userId);
                if (u) setSelectedUser(u);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {u.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {users.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            )}

            {selectedUser && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/20 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-300">Selected:</span>
                  <span className="text-blue-700 dark:text-blue-400 truncate">{selectedUser.label}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Branch permissions panel */}
      {selectedUser ? (
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Branch Permissions for {selectedUser.label}</CardTitle>
                <CardDescription>Configure which branches this user can access</CardDescription>
              </div>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">Unsaved Changes</Badge>
              )}
            </div>
            <div className="mt-2">
              <Button
                onClick={handleSavePermissions}
                disabled={saving || !hasUnsavedChanges}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Select all row */}
              {branches.length > 0 && (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/40">
                  <div>
                    <h4 className="font-medium text-sm">Select All Branches</h4>
                    <p className="text-xs text-muted-foreground">Quickly grant permissions to all branches</p>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(action => (
                      <div key={action} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`all-${action}`}
                          checked={branches.every(b => getPermissionStatus(b.branch_id)[action])}
                          onCheckedChange={(v) => branches.forEach(b => handlePermissionChange(selectedUser.id, b.branch_id, action, v as boolean))}
                        />
                        <label htmlFor={`all-${action}`} className="text-xs cursor-pointer capitalize">
                          {action.replace('can_', '')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-branch rows */}
              {branches.map(branch => (
                <div key={branch.branch_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">
                      {branch.shop_number ? `${branch.shop_number} – ${branch.branch_name}` : branch.branch_name}
                    </h4>
                    <p className="text-xs text-muted-foreground">{branch.location}</p>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(action => (
                      <div key={action} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`${branch.branch_id}-${action}`}
                          checked={getPermissionStatus(branch.branch_id)[action]}
                          onCheckedChange={(v) => handlePermissionChange(selectedUser.id, branch.branch_id, action, v as boolean)}
                        />
                        <label htmlFor={`${branch.branch_id}-${action}`} className="text-xs cursor-pointer capitalize">
                          {action.replace('can_', '')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {branches.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No active branches found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="lg:col-span-3 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No user selected</p>
            <p className="text-sm">Select a user from the left panel to manage their branch permissions</p>
          </div>
        </Card>
      )}
    </div>
  );
}
