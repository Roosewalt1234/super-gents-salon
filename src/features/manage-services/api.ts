import { supabase } from "@/integrations/supabase/client";
import { nowUAE } from "@/lib/uae-time";

export interface BranchServiceItem {
  service_id: string;
  service_name: string;
  description: string | null;
  default_price: number | null;
  service_duration: number | null;
  image_url: string | null;
  is_active: boolean;
  price: number | null;
}

export interface UpsertBranchServicePayload {
  branch_id: string;
  service_id: string;
  tenant_id: string;
  is_active: boolean;
  price: number | null;
  updated_by: string;
}

export async function fetchBranchServicesData(
  branchId: string
): Promise<BranchServiceItem[]> {
  const [defaultRes, activeRes] = await Promise.all([
    supabase
      .from("default_services")
      .select("service_id, service_name, description, default_price, service_duration, image_url")
      .order("service_name", { ascending: true }),
    supabase
      .from("branches_active_services")
      .select("service_id, is_active, price")
      .eq("branch_id", branchId),
  ]);

  if (defaultRes.error) throw new Error(defaultRes.error.message);

  const activeMap = new Map<string, { is_active: boolean; price: number | null }>();
  for (const row of activeRes.data ?? []) {
    activeMap.set(row.service_id, { is_active: row.is_active, price: row.price });
  }

  return (defaultRes.data ?? []).map((s) => {
    const active = activeMap.get(s.service_id);
    return {
      service_id: s.service_id,
      service_name: s.service_name,
      description: s.description,
      default_price: s.default_price,
      service_duration: s.service_duration,
      image_url: s.image_url,
      is_active: active?.is_active ?? false,
      price: active?.price ?? null,
    };
  });
}

export async function upsertBranchService(
  payload: UpsertBranchServicePayload
): Promise<void> {
  const { error } = await supabase.from("branches_active_services").upsert(
    {
      branch_id: payload.branch_id,
      service_id: payload.service_id,
      tenant_id: payload.tenant_id,
      is_active: payload.is_active,
      price: payload.price,
      updated_by: payload.updated_by,
      updated_at: nowUAE(),
    },
    { onConflict: "branch_id,service_id" }
  );

  if (error) throw new Error(error.message);
}
