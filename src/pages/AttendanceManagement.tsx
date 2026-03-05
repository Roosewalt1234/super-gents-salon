import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarCheck, Download, Search, Clock, Users, CheckCircle } from "lucide-react";

interface AttendanceRow {
  id:                         string;
  employee_id:                string;
  branch_id:                  string;
  date:                       string;
  check_in_time:              string | null;
  check_out_time:             string | null;
  status:                     string | null;
  face_recognition_confidence: number | null;
  recognition_method:         string | null;
  employee_name:              string;
  branch_name:                string;
  shop_number:                string | null;
}

interface Branch { branch_id: string; branch_name: string; shop_number: string | null; }

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" });
};

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });

const calcHours = (inTime: string | null, outTime: string | null): string => {
  if (!inTime || !outTime) return "—";
  const diff = (new Date(outTime).getTime() - new Date(inTime).getTime()) / 3600000;
  if (diff < 0) return "—";
  const h = Math.floor(diff);
  const m = Math.round((diff - h) * 60);
  return `${h}h ${m}m`;
};

const todayStr = () => new Date().toLocaleDateString("en-CA");
const daysAgoStr = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA");
};

const AttendanceManagement = () => {
  const { user, role, profile, loading } = useAuth();

  const [records, setRecords]     = useState<AttendanceRow[]>([]);
  const [branches, setBranches]   = useState<Branch[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [fromDate, setFromDate]   = useState(daysAgoStr(6));
  const [toDate, setToDate]       = useState(todayStr());
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch]       = useState("");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    if (!profile?.tenant_id) return;
    fetchBranches();
    fetchRecords();
  }, [profile?.tenant_id]);

  useEffect(() => { if (profile?.tenant_id) fetchRecords(); }, [fromDate, toDate, branchFilter]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branch_details")
      .select("branch_id, branch_name, shop_number")
      .eq("tenant_id", profile!.tenant_id!);
    if (data) setBranches(data);
  };

  const fetchRecords = async () => {
    setFetching(true);
    let q = supabase
      .from("daily_attendance_records")
      .select(`
        id, employee_id, branch_id, date,
        check_in_time, check_out_time, status,
        face_recognition_confidence, recognition_method,
        employees!inner(employee_name),
        branch_details!inner(branch_name, shop_number)
      `)
      .eq("tenant_id", profile!.tenant_id!)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: false })
      .order("check_in_time", { ascending: false });

    if (branchFilter !== "all") q = q.eq("branch_id", branchFilter);

    const { data, error } = await q;
    if (!error && data) {
      setRecords(
        (data as any[]).map((r) => ({
          ...r,
          employee_name: r.employees?.employee_name ?? "—",
          branch_name:   r.branch_details?.branch_name ?? "—",
          shop_number:   r.branch_details?.shop_number ?? null,
        }))
      );
    }
    setFetching(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) =>
      r.employee_name.toLowerCase().includes(q) ||
      r.branch_name.toLowerCase().includes(q)
    );
  }, [records, search]);

  /* ── Summary stats ── */
  const stats = useMemo(() => ({
    total:    filtered.length,
    present:  filtered.filter((r) => r.check_in_time).length,
    complete: filtered.filter((r) => r.check_in_time && r.check_out_time).length,
  }), [filtered]);

  const branchLabel = (b: Branch) =>
    b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name;

  const handleExport = () => {
    const headers = ["Employee","Branch","Date","Check In","Check Out","Hours","Confidence","Method","Status"];
    const rows = filtered.map((r) => [
      r.employee_name,
      r.shop_number ? `${r.shop_number} - ${r.branch_name}` : r.branch_name,
      r.date,
      fmtTime(r.check_in_time),
      fmtTime(r.check_out_time),
      calcHours(r.check_in_time, r.check_out_time),
      r.face_recognition_confidence ? `${r.face_recognition_confidence}%` : "—",
      r.recognition_method ?? "—",
      r.status ?? "—",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `attendance_${fromDate}_${toDate}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader title="Attendance Management" subtitle="Face recognition attendance records" />

      <main className="container py-8 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Records",  value: stats.total,    icon: CalendarCheck, gradient: "from-purple-500/40 to-indigo-600/40" },
            { label: "Checked In",     value: stats.present,  icon: Users,         gradient: "from-emerald-500/40 to-teal-600/40"  },
            { label: "Complete (In+Out)", value: stats.complete, icon: CheckCircle,  gradient: "from-blue-500/40 to-indigo-600/40"  },
          ].map((c) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} px-5 py-5 shadow-md hover:shadow-lg transition-shadow`}
            >
              <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/15 pointer-events-none" />
              <div className="absolute right-4 -bottom-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <div className="relative flex items-start justify-between mb-2">
                <p className="text-[11px] font-semibold text-black/70 uppercase tracking-widest">{c.label}</p>
                <c.icon className="w-5 h-5 text-black/60" />
              </div>
              <p className="relative text-2xl font-bold text-black">{c.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employee or branch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>{branchLabel(b)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 h-9 text-sm" />
            <Input type="date" value={toDate}   onChange={(e) => setToDate(e.target.value)}   className="w-36 h-9 text-sm" />
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 h-9">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    {["Employee","Branch","Date","Check In","Check Out","Hours","Confidence","Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground text-xs py-12">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const hours = calcHours(r.check_in_time, r.check_out_time);
                      return (
                        <tr key={r.id} className="border-t border-border/40 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.employee_name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {r.shop_number ? `${r.shop_number} - ` : ""}{r.branch_name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(r.date)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.check_in_time ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                <Clock className="w-3 h-3" />{fmtTime(r.check_in_time)}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.check_out_time ? (
                              <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-semibold">
                                <Clock className="w-3 h-3" />{fmtTime(r.check_out_time)}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{hours}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                            {r.face_recognition_confidence ? `${r.face_recognition_confidence}%` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              r.check_in_time && r.check_out_time
                                ? "bg-emerald-500/10 text-emerald-600"
                                : r.check_in_time
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {r.check_in_time && r.check_out_time ? "Complete"
                                : r.check_in_time ? "In Progress"
                                : r.status ?? "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default AttendanceManagement;
