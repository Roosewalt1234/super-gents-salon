import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, GitBranch } from 'lucide-react';
import { CreateUsersTab } from '@/components/settings/CreateUsersTab';
import { UserPermissionsTab } from '@/components/settings/UserPermissionsTab';
import { BranchPermissionsTab } from '@/components/settings/BranchPermissionsTab';

const UsersAndPermissions = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Users & Permissions" subtitle="Manage user accounts and access control" />

      <main className="container py-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="nav-permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Nav Permissions
            </TabsTrigger>
            <TabsTrigger value="branch-permissions" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Branch Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <CreateUsersTab />
          </TabsContent>

          <TabsContent value="nav-permissions">
            <UserPermissionsTab />
          </TabsContent>

          <TabsContent value="branch-permissions">
            <BranchPermissionsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UsersAndPermissions;
