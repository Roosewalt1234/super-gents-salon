import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Search,
  Clock,
  DollarSign,
  Settings,
  Trash2,
  ImageOff,
  X,
  ChevronDown,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Service {
  service_id: string;
  service_name: string;
  description: string | null;
  default_price: number | null;
  service_duration: number | null;
  image_url: string | null;
}

/* ─── Delete Confirm Dialog ─────────────────────────────────────────────── */
const DeleteConfirmDialog = ({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">Delete Service</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Are you sure you want to delete <span className="font-semibold text-foreground">"{name}"</span>? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">Cancel</Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Deleting...
            </span>
          ) : "Delete"}
        </Button>
      </div>
    </div>
  </div>
);

/* ─── Add / Edit Service Modal ───────────────────────────────────────────── */
interface ServiceForm {
  service_name: string;
  description: string;
  default_price: string;
  service_duration: string;
  image_url: string;
}

const EMPTY_FORM: ServiceForm = {
  service_name: "",
  description: "",
  default_price: "",
  service_duration: "",
  image_url: "",
};

const ServiceModal = ({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  initial?: Service;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<ServiceForm>(
    initial
      ? {
          service_name: initial.service_name,
          description: initial.description ?? "",
          default_price: initial.default_price?.toString() ?? "",
          service_duration: initial.service_duration?.toString() ?? "",
          image_url: initial.image_url ?? "",
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<ServiceForm>>({});
  const [saving, setSaving] = useState(false);

  const set = (field: keyof ServiceForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const validate = () => {
    const next: Partial<ServiceForm> = {};
    if (!form.service_name.trim()) next.service_name = "Service name is required.";
    if (form.default_price && isNaN(Number(form.default_price)))
      next.default_price = "Must be a valid number.";
    if (form.service_duration && isNaN(Number(form.service_duration)))
      next.service_duration = "Must be a valid number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      service_name: form.service_name.trim(),
      description: form.description.trim() || null,
      default_price: form.default_price ? Number(form.default_price) : null,
      service_duration: form.service_duration ? Number(form.service_duration) : null,
      image_url: form.image_url.trim() || null,
    };
    try {
      if (mode === "add") {
        const { error } = await supabase.from("default_services").insert(payload);
        if (error) throw new Error(error.message);
        toast.success("Service added successfully!");
      } else {
        const { error } = await supabase
          .from("default_services")
          .update(payload)
          .eq("service_id", initial!.service_id);
        if (error) throw new Error(error.message);
        toast.success("Service updated successfully!");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            {mode === "add" ? "Add New Service" : "Edit Service"}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Service Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Service Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g., Beard Trim"
              value={form.service_name}
              onChange={set("service_name")}
              disabled={saving}
              className={errors.service_name ? "border-destructive" : ""}
            />
            {errors.service_name && <p className="text-[11px] text-destructive">{errors.service_name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              placeholder="Brief description of the service..."
              value={form.description}
              onChange={set("description")}
              disabled={saving}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {/* Price + Duration row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Default Price (AED)</label>
              <Input
                placeholder="e.g., 25.00"
                value={form.default_price}
                onChange={set("default_price")}
                disabled={saving}
                className={errors.default_price ? "border-destructive" : ""}
              />
              {errors.default_price && <p className="text-[11px] text-destructive">{errors.default_price}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Duration (minutes)</label>
              <Input
                placeholder="e.g., 30"
                value={form.service_duration}
                onChange={set("service_duration")}
                disabled={saving}
                className={errors.service_duration ? "border-destructive" : ""}
              />
              {errors.service_duration && <p className="text-[11px] text-destructive">{errors.service_duration}</p>}
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Image URL <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <Input
              placeholder="https://..."
              value={form.image_url}
              onChange={set("image_url")}
              disabled={saving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving} className="min-w-[90px]">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[130px] teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                {mode === "add" ? "Adding..." : "Saving..."}
              </span>
            ) : mode === "add" ? "Add Service" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const Services = () => {
  const { user, role, loading } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("default_services")
      .select("service_id, service_name, description, default_price, service_duration, image_url")
      .order("service_name", { ascending: true });

    if (error) {
      toast.error("Failed to load services");
    } else {
      setServices(data || []);
    }
    setFetching(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("default_services")
      .delete()
      .eq("service_id", deleteTarget.service_id);

    if (error) {
      toast.error("Failed to delete service.");
    } else {
      toast.success(`"${deleteTarget.service_name}" deleted.`);
      setDeleteTarget(null);
      fetchServices();
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === "superadmin") return <Navigate to="/admin" replace />;

  const filtered = services.filter((s) =>
    s.service_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader
        title="Services"
        subtitle="Manage and view all salon services across your branches"
      />

      {/* ── Main Content ── */}
      <main className="container py-8">
        {/* Action row */}
        <div className="flex items-center justify-end mb-6">
          <Button
            onClick={() => setModalMode("add")}
            className="teal-gradient text-primary-foreground gap-2 shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Add Service
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-7">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Branch filter placeholder */}
          <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm text-foreground hover:bg-accent transition-colors w-[160px] justify-between">
            All Branches
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Cards */}
        {fetching ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-14 text-center shadow-teal-sm">
            <p className="text-muted-foreground">No services found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filtered.map((service, i) => (
              <motion.div
                key={service.service_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.25 }}
                className="bg-card rounded-xl shadow-sm border border-border flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Image + Name + Duration */}
                <div className="p-4 pb-2 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.service_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <ImageOff className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-sm leading-tight line-clamp-2">
                      {service.service_name}
                    </p>
                    {service.service_duration != null && (
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground text-[11px]">
                        <Clock className="w-3 h-3" />
                        {service.service_duration}m
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[2rem]">
                    {service.description || "—"}
                  </p>
                </div>

                {/* Price */}
                <div className="px-4 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Price Range:</span>
                    <span className="font-bold text-primary">
                      {service.default_price != null
                        ? `AED ${service.default_price.toFixed(2)}`
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border mx-4" />

                {/* Actions */}
                <div className="p-3 space-y-2 mt-auto">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card py-2 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 active:scale-[0.97]">
                      <DollarSign className="w-3 h-3" /> Pricing
                    </button>
                    <button
                      onClick={() => { setEditingService(service); setModalMode("edit"); }}
                      className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card py-2 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 active:scale-[0.97]"
                    >
                      <Settings className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(service)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-destructive/90 hover:bg-destructive py-2 text-[11px] font-medium text-white transition-all duration-200 active:scale-[0.98]"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <footer className="container pb-6">
        <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
          Super Salon v1.0 • Multi-Tenant Salon Management
        </p>
      </footer>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modalMode === "add" && (
          <ServiceModal
            mode="add"
            onClose={() => setModalMode(null)}
            onSaved={fetchServices}
          />
        )}
        {modalMode === "edit" && editingService && (
          <ServiceModal
            mode="edit"
            initial={editingService}
            onClose={() => { setModalMode(null); setEditingService(null); }}
            onSaved={fetchServices}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmDialog
            name={deleteTarget.service_name}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Services;
