import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { navigationItems, NavigationItem } from './navigationItems';
import { User } from 'lucide-react';

interface UserRecord {
  id: string;  // auth user_id
  label: string;
}

interface UserNavPermission {
  id: string;
  user_id: string;
  nav_item_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function UserPermissionsTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [permissions, setPermissions] = useState<Record<string, UserNavPermission>>({});
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id);
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

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_nav_permissions')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      const map: Record<string, UserNavPermission> = {};
      (data || []).forEach(p => { map[p.nav_item_id] = p; });
      setPermissions(map);
    } catch {
      toast.error('Failed to load permissions');
    }
  };

  const getPermissionStatus = (navItemId: string) => {
    const p = permissions[navItemId];
    return p ?? { can_view: false, can_create: false, can_edit: false, can_delete: false };
  };

  const hasAnyChildPermission = (item: NavigationItem) =>
    [item, ...(item.children || [])].some(i => getPermissionStatus(i.nav_item_id).can_view);

  const handlePermissionChange = (
    userId: string,
    navItemId: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setPermissions(prev => {
      const next = { ...prev };
      if (action === 'can_view' && value) {
        next[navItemId] = { id: next[navItemId]?.id || '', user_id: userId, nav_item_id: navItemId, can_view: true, can_create: true, can_edit: true, can_delete: true };
      } else if (action === 'can_view' && !value) {
        delete next[navItemId];
      } else if (next[navItemId]) {
        next[navItemId] = { ...next[navItemId], [action]: value };
      }
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleParentToggle = (userId: string, parentItem: NavigationItem, value: boolean) => {
    setPermissions(prev => {
      const next = { ...prev };
      [parentItem, ...(parentItem.children || [])].forEach(item => {
        if (value) {
          next[item.nav_item_id] = { id: next[item.nav_item_id]?.id || '', user_id: userId, nav_item_id: item.nav_item_id, can_view: true, can_create: true, can_edit: true, can_delete: true };
        } else {
          delete next[item.nav_item_id];
        }
      });
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('user_nav_permissions').select('*').eq('user_id', selectedUser.id);
      if (fetchErr) throw fetchErr;

      const existingMap = new Map((existing || []).map(p => [p.nav_item_id, p]));
      const toInsert: object[] = [];
      const toUpdate: object[] = [];
      const toDelete: string[] = [];

      Object.values(permissions).forEach(perm => {
        const ex = existingMap.get(perm.nav_item_id);
        if (!ex) {
          toInsert.push({ user_id: perm.user_id, nav_item_id: perm.nav_item_id, can_view: perm.can_view, can_create: perm.can_create, can_edit: perm.can_edit, can_delete: perm.can_delete });
        } else if (ex.can_view !== perm.can_view || ex.can_create !== perm.can_create || ex.can_edit !== perm.can_edit || ex.can_delete !== perm.can_delete) {
          toUpdate.push({ id: ex.id, can_view: perm.can_view, can_create: perm.can_create, can_edit: perm.can_edit, can_delete: perm.can_delete });
        }
        existingMap.delete(perm.nav_item_id);
      });
      toDelete.push(...Array.from(existingMap.keys()));

      const ops = [];
      if (toInsert.length) ops.push(supabase.from('user_nav_permissions').insert(toInsert));
      for (const u of toUpdate as { id: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]) {
        ops.push(supabase.from('user_nav_permissions').update({ can_view: u.can_view, can_create: u.can_create, can_edit: u.can_edit, can_delete: u.can_delete }).eq('id', u.id));
      }
      if (toDelete.length) ops.push(supabase.from('user_nav_permissions').delete().eq('user_id', selectedUser.id).in('nav_item_id', toDelete));
      if (ops.length) await Promise.all(ops);

      await fetchUserPermissions(selectedUser.id);
      setHasUnsavedChanges(false);
      toast.success('Permissions saved successfully');
    } catch {
      toast.error('Failed to save permissions');
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
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select User
          </CardTitle>
          <CardDescription>Choose a user to manage permissions</CardDescription>
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

      {/* Permissions Panel */}
      {selectedUser ? (
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Permissions for {selectedUser.label}</CardTitle>
                <CardDescription>Configure navigation access and actions for this user</CardDescription>
              </div>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Unsaved Changes
                </Badge>
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
            <div className="space-y-6">
              {navigationItems.map((module) => (
                <div key={module.nav_item_id} className="space-y-3">
                  {/* Module header */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <h3 className="font-semibold">{module.title}</h3>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`parent-${module.nav_item_id}`}
                        checked={hasAnyChildPermission(module)}
                        onCheckedChange={(v) => handleParentToggle(selectedUser.id, module, v as boolean)}
                      />
                      <label htmlFor={`parent-${module.nav_item_id}`} className="text-sm font-medium cursor-pointer">
                        Enable All
                      </label>
                    </div>
                  </div>

                  <div className="ml-6 space-y-2">
                    {/* Parent row */}
                    <PermissionRow
                      label={`${module.title} (Main)`}
                      navItemId={module.nav_item_id}
                      userId={selectedUser.id}
                      status={getPermissionStatus(module.nav_item_id)}
                      onChange={handlePermissionChange}
                      muted
                    />
                    {/* Children */}
                    {module.children?.map(child => (
                      <PermissionRow
                        key={child.nav_item_id}
                        label={child.title}
                        navItemId={child.nav_item_id}
                        userId={selectedUser.id}
                        status={getPermissionStatus(child.nav_item_id)}
                        onChange={handlePermissionChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="lg:col-span-3 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No user selected</p>
            <p className="text-sm">Select a user from the left panel to manage their permissions</p>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Permission row helper ── */
interface PermissionRowProps {
  label: string;
  navItemId: string;
  userId: string;
  status: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
  onChange: (userId: string, navItemId: string, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete', value: boolean) => void;
  muted?: boolean;
}

function PermissionRow({ label, navItemId, userId, status, onChange, muted }: PermissionRowProps) {
  return (
    <div className={`flex items-center justify-between p-3 border rounded ${muted ? 'bg-muted/50' : ''}`}>
      <span className={muted ? 'font-medium text-sm' : 'text-sm'}>{label}</span>
      <div className="flex gap-4 flex-wrap">
        {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(action => (
          <div key={action} className="flex items-center gap-1.5">
            <Checkbox
              id={`${navItemId}-${action}`}
              checked={status[action]}
              onCheckedChange={(v) => onChange(userId, navItemId, action, v as boolean)}
            />
            <label htmlFor={`${navItemId}-${action}`} className="text-xs cursor-pointer capitalize">
              {action.replace('can_', '')}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
