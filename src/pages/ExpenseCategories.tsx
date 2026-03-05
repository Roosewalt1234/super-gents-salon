import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tag,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Layers,
} from "lucide-react";

interface Category {
  category_id: string;
  category_name: string;
  description: string | null;
}

interface SubCategory {
  sub_category_id: string;
  sub_category_name: string;
  category_id: string;
}

const ExpenseCategories = () => {
  const { user, role, loading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  /* ── Add category ── */
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  /* ── Add sub-category ── */
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  /* ── Delete ── */
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "sub";
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (role === "superadmin") return <Navigate to="/admin" replace />;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setFetching(true);
    const [catRes, subRes] = await Promise.all([
      supabase
        .from("expenses_category")
        .select("category_id, category_name, description")
        .order("category_name", { ascending: true }),
      supabase
        .from("expenses_sub_category")
        .select("sub_category_id, sub_category_name, category_id")
        .order("sub_category_name", { ascending: true }),
    ]);
    if (catRes.data) {
      setCategories(catRes.data);
      // start collapsed
    }
    if (subRes.data) setSubCategories(subRes.data);
    setFetching(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.has(id) ? new Set() : new Set([id])
    );
  };

  const allExpanded = categories.length > 0 && expandedIds.size === categories.length;

  const toggleExpandAll = () => {
    if (allExpanded) setExpandedIds(new Set());
    else setExpandedIds(new Set(categories.map((c) => c.category_id)));
  };

  /* ── Handlers ── */

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setSavingCat(true);
    const { error } = await supabase
      .from("expenses_category")
      .insert({ category_name: name });
    setSavingCat(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Category added");
    setNewCatName("");
    setAddingCategory(false);
    loadData();
  };

  const handleAddSub = async (categoryId: string) => {
    const name = newSubName.trim();
    if (!name) return;
    setSavingSub(true);
    const { error } = await supabase
      .from("expenses_sub_category")
      .insert({ sub_category_name: name, category_id: categoryId });
    setSavingSub(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sub-category added");
    setNewSubName("");
    setAddingSubFor(null);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    let error: any = null;

    if (deleteTarget.type === "category") {
      // Delete all sub-categories first, then the category
      const subRes = await supabase
        .from("expenses_sub_category")
        .delete()
        .eq("category_id", deleteTarget.id);
      if (subRes.error) { toast.error(subRes.error.message); setDeleting(false); return; }

      const catRes = await supabase
        .from("expenses_category")
        .delete()
        .eq("category_id", deleteTarget.id);
      error = catRes.error;
    } else {
      const res = await supabase
        .from("expenses_sub_category")
        .delete()
        .eq("sub_category_id", deleteTarget.id);
      error = res.error;
    }

    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(
      deleteTarget.type === "category" ? "Category and its sub-categories deleted" : "Sub-category deleted"
    );
    setDeleteTarget(null);
    loadData();
  };

  const subsFor = (catId: string) =>
    subCategories.filter((s) => s.category_id === catId);

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader
        title="Expense Categories"
        subtitle="Manage expense categories and sub-categories"
      />

      <main className="container py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* ── Top bar ── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Tag className="w-4 h-4" />
                <span>
                  {categories.length} categor{categories.length !== 1 ? "ies" : "y"},{" "}
                  {subCategories.length} sub-categor{subCategories.length !== 1 ? "ies" : "y"}
                </span>
              </div>
              {categories.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleExpandAll}
                  className="gap-1.5 text-[12px] h-7 px-2.5"
                >
                  {allExpanded ? (
                    <><ChevronDown className="w-3.5 h-3.5" /> Collapse All</>
                  ) : (
                    <><ChevronRight className="w-3.5 h-3.5" /> Expand All</>
                  )}
                </Button>
              )}
            </div>
            <Button
              onClick={() => { setAddingCategory(true); setNewCatName(""); }}
              className="gap-2 teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          </div>

          {/* ── Inline add category ── */}
          <AnimatePresence>
            {addingCategory && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-primary/30 rounded-2xl p-4 mb-4 shadow-sm"
              >
                <p className="text-sm font-semibold mb-3 text-foreground">New Category</p>
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="Category name…"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategory();
                      if (e.key === "Escape") { setAddingCategory(false); setNewCatName(""); }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddCategory}
                    disabled={!newCatName.trim() || savingCat}
                    className="teal-gradient text-primary-foreground"
                  >
                    {savingCat ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setAddingCategory(false); setNewCatName(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Category list ── */}
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center shadow-teal-sm">
              <FolderOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No categories yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat, i) => {
                const subs = subsFor(cat.category_id);
                const isExpanded = expandedIds.has(cat.category_id);
                const isAddingSub = addingSubFor === cat.category_id;

                return (
                  <motion.div
                    key={cat.category_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Category header row */}
                    <div className="flex items-center gap-3 px-5 py-4">
                      <button
                        onClick={() => toggleExpand(cat.category_id)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div
                        className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
                      >
                        <Tag className="w-4 h-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => toggleExpand(cat.category_id)}
                          className="text-left w-full"
                        >
                          <p className="font-semibold text-foreground text-sm leading-tight">
                            {cat.category_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {subs.length} sub-categor{subs.length !== 1 ? "ies" : "y"}
                          </p>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-[12px] h-7 px-2.5"
                          onClick={() => {
                            setAddingSubFor(isAddingSub ? null : cat.category_id);
                            setNewSubName("");
                            if (!isExpanded) toggleExpand(cat.category_id);
                          }}
                        >
                          <Layers className="w-3 h-3" />
                          Add Sub
                        </Button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: "category",
                              id: cat.category_id,
                              name: cat.category_name,
                            })
                          }
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-categories panel */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/60 bg-muted/20 px-5 py-3 space-y-2">
                            {/* Inline add sub-category */}
                            <AnimatePresence>
                              {isAddingSub && (
                                <motion.div
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  transition={{ duration: 0.15 }}
                                  className="flex gap-2 mb-3"
                                >
                                  <Input
                                    autoFocus
                                    placeholder="Sub-category name…"
                                    value={newSubName}
                                    onChange={(e) => setNewSubName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleAddSub(cat.category_id);
                                      if (e.key === "Escape") setAddingSubFor(null);
                                    }}
                                    className="flex-1 h-8 text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddSub(cat.category_id)}
                                    disabled={!newSubName.trim() || savingSub}
                                    className="teal-gradient text-primary-foreground h-8 px-3"
                                  >
                                    {savingSub ? "…" : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddingSubFor(null)}
                                    className="h-8 px-3"
                                  >
                                    Cancel
                                  </Button>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Sub-category rows */}
                            {subs.length === 0 && !isAddingSub ? (
                              <p className="text-[12px] text-muted-foreground/60 py-1 pl-1">
                                No sub-categories — click "Add Sub" to create one.
                              </p>
                            ) : (
                              subs.map((sub) => (
                                <div
                                  key={sub.sub_category_id}
                                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border/40 group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                                    <span className="text-sm text-foreground truncate">
                                      {sub.sub_category_name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setDeleteTarget({
                                        type: "sub",
                                        id: sub.sub_category_id,
                                        name: sub.sub_category_name,
                                      })
                                    }
                                    className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "category" ? "Category" : "Sub-category"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category" ? (
                <>
                  Deleting <strong>{deleteTarget?.name}</strong> will also delete all its
                  sub-categories. This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget?.name}</strong>? This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseCategories;
