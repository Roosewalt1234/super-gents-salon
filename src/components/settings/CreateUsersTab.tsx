import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Eye, EyeOff, Trash2, Users, User, Building2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserRecord {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  created_at: string;
}

export function CreateUsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    display_name: '',
    password: '',
    confirm_password: '',
    createDummy: false,
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Step 1: fetch profiles (no embedded join to avoid RLS/PostgREST issues on tenants)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, tenant_id, created_at')
        .order('created_at', { ascending: false });
      if (profilesError) throw profilesError;

      const profiles = profilesData || [];

      // Step 2: fetch tenant names for any tenant_ids present
      const tenantIds = [...new Set(profiles.map(p => p.tenant_id).filter(Boolean))] as string[];
      let tenantMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', tenantIds);
        (tenantsData || []).forEach(t => { tenantMap[t.id] = t.name; });
      }

      setUsers(profiles.map(p => ({
        profile_id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        tenant_id: p.tenant_id,
        tenant_name: p.tenant_id ? (tenantMap[p.tenant_id] ?? null) : null,
        created_at: p.created_at,
      })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to fetch users: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', display_name: '', password: '', confirm_password: '', createDummy: false });
    setShowPassword(false);
    setShowConfirm(false);
  };

  const validateForm = () => {
    if (!formData.username || !formData.email) {
      toast.error('Username and email are required');
      return false;
    }
    const emailNorm = formData.email.trim().toLowerCase();
    const isDummy = emailNorm.endsWith('@company.com') || emailNorm.includes('.dummy@') || emailNorm.includes('.test@');
    if (!isDummy && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const emailNorm = formData.email.trim().toLowerCase();
      const isDummy = emailNorm.endsWith('@company.com') || formData.createDummy;
      const finalEmail = isDummy ? `${formData.username.toLowerCase()}@company.com` : emailNorm;

      const { error: authError } = await supabase.auth.signUp({
        email: finalEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username: formData.username, first_name: formData.display_name, last_name: '', phone: '' },
        },
      });

      if (authError) {
        if (authError.message.includes('invalid')) {
          throw new Error("Invalid email domain. Use a real email or enable 'Use @company.com'.");
        }
        throw authError;
      }

      toast.success(isDummy ? 'User created successfully with dummy email.' : 'User created. They will receive a confirmation email.');
      setIsCreateOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserRecord) => {
    setSelectedUser(user);
    setFormData({
      username: '',
      email: '',
      display_name: user.full_name || '',
      password: '',
      confirm_password: '',
      createDummy: false,
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const updates: Record<string, string | null> = {};
      if (formData.display_name !== selectedUser.full_name) updates.full_name = formData.display_name || null;
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('profiles').update(updates).eq('id', selectedUser.profile_id);
        if (error) throw error;
      }
      toast.success('User updated successfully');
      setIsEditOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (!confirm(`Delete user "${user.full_name || user.user_id}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user.profile_id);
      if (error) throw error;
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">User Accounts</h3>
          <p className="text-sm text-muted-foreground">Create and manage system user accounts</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </CardTitle>
          <CardDescription>{users.length} user{users.length !== 1 ? 's' : ''} registered</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No users found</p>
              <p className="text-sm">Create the first user account above</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.profile_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {user.full_name || <span className="text-muted-foreground italic">No name</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.tenant_name ? (
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {user.tenant_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">No tenant</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>Create a new user account for the system</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Tip:</strong> For internal users without real emails, use{' '}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">@company.com</code>{' '}
                (e.g. <em>john@company.com</em>) to skip email verification.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-username">Username *</Label>
                <Input
                  id="c-username"
                  value={formData.username}
                  onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                  placeholder="johndoe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email *</Label>
                <Input
                  id="c-email"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value, username: e.target.value }))}
                  placeholder="user@company.com or user@gmail.com"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const base = formData.username || 'user';
                    setFormData(p => ({ ...p, email: `${base}@company.com`, createDummy: true }));
                  }}
                >
                  Use @company.com
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-display">Display Name</Label>
              <Input
                id="c-display"
                value={formData.display_name}
                onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="c-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Min 6 characters</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-confirm">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="c-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={e => setFormData(p => ({ ...p, confirm_password: e.target.value }))}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={loading}>
              {loading ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit User
            </DialogTitle>
            <DialogDescription>Update user profile information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-username">Username</Label>
              <Input id="e-username" value={formData.username} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-email">Email</Label>
              <Input id="e-email" value={formData.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed for security reasons</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-display">Display Name</Label>
              <Input
                id="e-display"
                value={formData.display_name}
                onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={loading}>
              {loading ? 'Updating…' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
