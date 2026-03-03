import { supabase } from "@/integrations/supabase/client";
import { nowUAE } from "@/lib/uae-time";

export interface ChequeEntry {
  id?: string;
  cheque_number: string;
  cheque_amount: number;
  cheque_date: string;
}

export interface BranchSettingsData {
  branch_id: string;
  branch_name: string;
  has_partnership: boolean;
  partner_company_name: string | null;
  partner_name: string | null;
  investment_percentage: number | null;
  profit_sharing_percentage: number | null;
  has_vat: boolean;
  number_of_chairs: number;
  license_number: string | null;
  license_expiry_date: string | null;
  establishment_card_number: string | null;
  establishment_card_expiry_date: string | null;
  rental_agreement_number: string | null;
  rental_agreement_start_date: string | null;
  rental_agreement_expiry_date: string | null;
  rent_amount: number | null;
  number_of_cheques: number | null;
  cheques: ChequeEntry[];
}

export async function fetchBranchSettingsData(
  branchId: string
): Promise<BranchSettingsData> {
  const [branchRes, chequesRes] = await Promise.all([
    supabase
      .from("branch_details")
      .select(
        "branch_id, branch_name, has_partnership, partner_company_name, partner_name, investment_percentage, profit_sharing_percentage, has_vat, number_of_chairs, license_number, license_expiry_date, establishment_card_number, establishment_card_expiry_date, rental_agreement_number, rental_agreement_start_date, rental_agreement_expiry_date, rent_amount, number_of_cheques"
      )
      .eq("branch_id", branchId)
      .single(),
    supabase
      .from("branch_cheques")
      .select("id, cheque_number, cheque_amount, cheque_date")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: true }),
  ]);

  if (branchRes.error) throw new Error(branchRes.error.message);
  if (!branchRes.data) throw new Error("Branch not found");

  const b = branchRes.data;
  return {
    branch_id: b.branch_id,
    branch_name: b.branch_name,
    has_partnership: b.has_partnership ?? false,
    partner_company_name: b.partner_company_name,
    partner_name: b.partner_name,
    investment_percentage: b.investment_percentage,
    profit_sharing_percentage: b.profit_sharing_percentage,
    has_vat: b.has_vat ?? false,
    number_of_chairs: b.number_of_chairs ?? 0,
    license_number: b.license_number,
    license_expiry_date: b.license_expiry_date,
    establishment_card_number: b.establishment_card_number,
    establishment_card_expiry_date: b.establishment_card_expiry_date,
    rental_agreement_number: b.rental_agreement_number,
    rental_agreement_start_date: b.rental_agreement_start_date,
    rental_agreement_expiry_date: b.rental_agreement_expiry_date,
    rent_amount: b.rent_amount,
    number_of_cheques: b.number_of_cheques,
    cheques: (chequesRes.data ?? []).map((c) => ({
      id: c.id,
      cheque_number: c.cheque_number ?? "",
      cheque_amount: c.cheque_amount,
      cheque_date: c.cheque_date ?? "",
    })),
  };
}

const normalizeDate = (d: string | null | undefined): string | null =>
  d && d.trim() !== "" ? d : null;

export async function saveBranchSettings(
  data: BranchSettingsData,
  tenantId: string,
  userId: string
): Promise<void> {
  const { error: branchError } = await supabase
    .from("branch_details")
    .update({
      has_partnership: data.has_partnership,
      partner_company_name: data.has_partnership ? data.partner_company_name : null,
      partner_name: data.has_partnership ? data.partner_name : null,
      investment_percentage: data.has_partnership ? data.investment_percentage : null,
      profit_sharing_percentage: data.has_partnership ? data.profit_sharing_percentage : null,
      has_vat: data.has_vat,
      number_of_chairs: data.number_of_chairs,
      license_number: data.license_number || null,
      license_expiry_date: normalizeDate(data.license_expiry_date),
      establishment_card_number: data.establishment_card_number || null,
      establishment_card_expiry_date: normalizeDate(data.establishment_card_expiry_date),
      rental_agreement_number: data.rental_agreement_number || null,
      rental_agreement_start_date: normalizeDate(data.rental_agreement_start_date),
      rental_agreement_expiry_date: normalizeDate(data.rental_agreement_expiry_date),
      rent_amount: data.rent_amount,
      number_of_cheques: data.number_of_cheques,
      last_updated_by: userId,
      updated_at: nowUAE(),
    })
    .eq("branch_id", data.branch_id);

  if (branchError) throw new Error(branchError.message);

  // Replace cheques: delete all then re-insert
  await supabase.from("branch_cheques").delete().eq("branch_id", data.branch_id);

  if (data.cheques.length > 0) {
    const { error: insertError } = await supabase.from("branch_cheques").insert(
      data.cheques.map((c) => ({
        branch_id: data.branch_id,
        tenant_id: tenantId,
        cheque_number: c.cheque_number || null,
        cheque_amount: c.cheque_amount,
        cheque_date: normalizeDate(c.cheque_date),
      }))
    );
    if (insertError) throw new Error(insertError.message);
  }
}
