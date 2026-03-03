import { supabase } from "@/integrations/supabase/client";

export interface BranchEmployee {
  employee_id: string;
  employee_name: string;
  employee_number: string | null;
  position: string | null;
  phone: string | null;
  status: string | null;
  assigned_branch_id: string | null;
}

export async function fetchTenantEmployees(tenantId: string): Promise<BranchEmployee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select(
      "employee_id, employee_name, employee_number, position, phone, status, assigned_branch_id"
    )
    .eq("tenant_id", tenantId)
    .neq("is_archived", true)
    .order("employee_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveBranchAssignments(
  branchId: string,
  tenantId: string,
  toAssign: string[],          // employee_ids to assign to this branch
  toRemove: string[],          // employee_ids to unassign (set null)
  affectedBranchIds: string[], // all branch IDs whose barbers_count must be refreshed
): Promise<void> {
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("employees")
      .update({ assigned_branch_id: null })
      .in("employee_id", toRemove)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
  }

  if (toAssign.length > 0) {
    const { error } = await supabase
      .from("employees")
      .update({ assigned_branch_id: branchId })
      .in("employee_id", toAssign)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
  }

  // Refresh barbers_count for all affected branches
  const uniqueIds = [...new Set(affectedBranchIds)];
  await Promise.all(
    uniqueIds.map(async (bid) => {
      const { data, error: cntErr } = await supabase
        .from("employees")
        .select("employee_id")
        .eq("tenant_id", tenantId)
        .eq("assigned_branch_id", bid)
        .neq("is_archived", true);
      if (cntErr) throw new Error(cntErr.message);

      const { error: updErr } = await supabase
        .from("branch_details")
        .update({ barbers_count: data?.length ?? 0 })
        .eq("branch_id", bid)
        .eq("tenant_id", tenantId);
      if (updErr) throw new Error(updErr.message);
    })
  );
}
