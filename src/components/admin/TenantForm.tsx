import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  owner_id: string | null;
}

interface TenantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  userId: string;
  onSuccess: () => void;
}

const TenantForm = ({ open, onOpenChange, tenant, userId, onSuccess }: TenantFormProps) => {
  const isEdit = !!tenant;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    is_active: true,
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email || "",
        phone: tenant.phone || "",
        address: tenant.address || "",
        is_active: tenant.is_active,
      });
    } else {
      setForm({ name: "", slug: "", email: "", phone: "", address: "", is_active: true });
    }
  }, [tenant, open]);

  const handleSlugChange = (value: string) => {
    setForm({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, "-") });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setSaving(true);

    if (isEdit && tenant) {
      const { error } = await supabase
        .from("tenants")
        .update({
          name: form.name.trim(),
          slug: form.slug.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          is_active: form.is_active,
        })
        .eq("id", tenant.id);

      setSaving(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Tenant updated!");
        onOpenChange(false);
        onSuccess();
      }
    } else {
      const { error } = await supabase.from("tenants").insert({
        name: form.name.trim(),
        slug: form.slug.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        is_active: form.is_active,
        owner_id: userId,
      });

      setSaving(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Tenant created!");
        onOpenChange(false);
        onSuccess();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass rounded-[2.5rem] border-border shadow-teal-lg sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEdit ? "Edit Tenant" : "Create New Tenant"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Salon Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Elite Barbers"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="elite-barbers"
                required
                maxLength={50}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@salon.com"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555 0100"
                maxLength={20}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground text-sm">Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St, City"
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="text-foreground text-sm">Active Status</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full teal-gradient text-primary-foreground transition-all duration-200 active:scale-95"
          >
            {saving ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Tenant" : "Create Tenant")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantForm;
