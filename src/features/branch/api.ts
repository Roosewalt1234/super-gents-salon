import { supabase } from "@/integrations/supabase/client";

export interface CreateBranchPayload {
  shop_number: string;
  branch_name: string;
  phone: string;
  location: string;
  description: string;
  tenant_id: string;
  created_by: string;
}

export async function createBranch(payload: CreateBranchPayload): Promise<void> {
  const { error } = await supabase.from("branch_details").insert({
    shop_number: payload.shop_number || null,
    branch_name: payload.branch_name,
    phone: payload.phone || null,
    location: payload.location,
    description: payload.description || null,
    tenant_id: payload.tenant_id,
    created_by: payload.created_by,
    status: "active",
  });

  if (error) throw new Error(error.message);
}
