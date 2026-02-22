"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Upload,
  FileSpreadsheet,
  FileJson,
  PlusCircle,
  Server,
  Trash2,
  Search,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Building2,
  HardDrive,
  Eye,
  Tag,
  Calendar,
  Hash,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthGuard from "@/components/layout/AuthGuard";
import {
  uploadRecordsFile,
  addManualRecord,
  importBulkJson,
  uploadJsonFile,
  connectExternalDatabase,
  listRecords,
  deleteRecord,
  triggerScan,
} from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

type UploadMode = "excel" | "json" | "manual" | "database";

const MODES: { id: UploadMode; label: string; icon: any; desc: string }[] = [
  { id: "excel", label: "Excel / CSV", icon: FileSpreadsheet, desc: "Upload .xlsx or .csv files" },
  { id: "json", label: "JSON Import", icon: FileJson, desc: "Paste JSON or upload .json file" },
  { id: "manual", label: "Manual Entry", icon: PlusCircle, desc: "Add records one by one" },
  { id: "database", label: "Database", icon: Server, desc: "Connect to external MongoDB" },
];

const RECORD_TYPES = ["employee", "server", "vendor", "data_store", "application", "network", "custom"];
const DEPARTMENTS = ["Engineering", "Marketing", "Finance", "Infrastructure", "Procurement", "Analytics", "HR", "Legal", "General"];

export default function RecordsPage() {
  // ─── State ───
  const [mode, setMode] = useState<UploadMode>("excel");
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ by_type: {}, by_department: {} });
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [scanning, setScanning] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual form
  const [manualType, setManualType] = useState("employee");
  const [manualDept, setManualDept] = useState("General");
  const [manualFields, setManualFields] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);

  // JSON
  const [jsonText, setJsonText] = useState("");
  const [jsonRecordType, setJsonRecordType] = useState("employee");
  const [jsonDept, setJsonDept] = useState("General");

  // Excel
  const [excelRecordType, setExcelRecordType] = useState("employee");
  const [excelDept, setExcelDept] = useState("General");

  // Database
  const [dbUri, setDbUri] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbCollection, setDbCollection] = useState("");
  const [dbRecordType, setDbRecordType] = useState("external");
  const [dbDept, setDbDept] = useState("External");
  const [dbLimit, setDbLimit] = useState(500);

  // ─── Fetch ───
  const fetchRecords = useCallback(async () => {
    try {
      const res = await listRecords({ record_type: typeFilter || undefined, department: deptFilter || undefined });
      setRecords(res.data.records || []);
      setTotalRecords(res.data.total || 0);
      setStats({ by_type: res.data.by_type || {}, by_department: res.data.by_department || {} });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [typeFilter, deptFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ─── Handlers ───
  const clearResult = () => { setResult(null); setError(""); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    clearResult();
    try {
      if (file.name.endsWith(".json")) {
        const res = await uploadJsonFile(file, jsonRecordType, jsonDept);
        setResult(res.data);
      } else {
        const res = await uploadRecordsFile(file, excelRecordType, excelDept);
        setResult(res.data);
      }
      fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleJsonImport = async () => {
    if (!jsonText.trim()) { setError("Paste JSON data first"); return; }
    setUploading(true);
    clearResult();
    try {
      let parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) parsed = [parsed];
      const body = {
        records: parsed.map((r: any) => ({
          record_id: r.record_id || r.id || undefined,
          type: r.type || jsonRecordType,
          department: r.department || jsonDept,
          data: r.data || r,
        })),
      };
      const res = await importBulkJson(body);
      setResult(res.data);
      setJsonText("");
      fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Invalid JSON");
    } finally {
      setUploading(false);
    }
  };

  const handleManualAdd = async () => {
    const data: Record<string, any> = {};
    for (const f of manualFields) {
      if (f.key.trim()) {
        const vl = f.value.trim().toLowerCase();
        if (vl === "true") data[f.key.trim()] = true;
        else if (vl === "false") data[f.key.trim()] = false;
        else if (!isNaN(Number(f.value)) && f.value.trim() !== "") data[f.key.trim()] = Number(f.value);
        else data[f.key.trim()] = f.value.trim();
      }
    }
    if (Object.keys(data).length === 0) { setError("Add at least one field"); return; }
    setUploading(true);
    clearResult();
    try {
      const res = await addManualRecord({ type: manualType, department: manualDept, data });
      setResult(res.data);
      setManualFields([{ key: "", value: "" }]);
      fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to add record");
    } finally {
      setUploading(false);
    }
  };

  const handleDbConnect = async () => {
    if (!dbUri || !dbName || !dbCollection) { setError("Fill all connection fields"); return; }
    setUploading(true);
    clearResult();
    try {
      const res = await connectExternalDatabase({
        connection_string: dbUri,
        database_name: dbName,
        collection_or_table: dbCollection,
        record_type: dbRecordType,
        department: dbDept,
        limit: dbLimit,
      });
      setResult(res.data);
      fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Connection failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      await deleteRecord(recordId);
      fetchRecords();
    } catch { /* ignore */ }
  };

  const handleScanNow = async () => {
    setScanning(true);
    try {
      await triggerScan();
      setResult({ message: "Compliance scan completed! Check the Violations page for results." });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const filtered = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.record_id?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      JSON.stringify(r.data || {}).toLowerCase().includes(q)
    );
  });

  // ─── Render ───
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--bg)]">
        <Sidebar />
        <Topbar />
        <main className="ml-[240px] pt-20 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Database size={32} className="text-blue-400" /> Company Records
              </h1>
              <p className="text-gray-500 mt-1">
                Upload records via Excel, CSV, JSON, manual entry, or database connector
              </p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleScanNow}
                disabled={scanning}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {scanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {scanning ? "Scanning..." : "Run Compliance Scan"}
              </motion.button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <GlassCard>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Layers size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Records</p>
                  <p className="text-gray-900 text-xl font-bold">{totalRecords}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <HardDrive size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Record Types</p>
                  <p className="text-gray-900 text-xl font-bold">{Object.keys(stats.by_type).length}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Building2 size={20} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Departments</p>
                  <p className="text-gray-900 text-xl font-bold">{Object.keys(stats.by_department).length}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Database size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Sources</p>
                  <p className="text-gray-900 text-xl font-bold">
                    {new Set(records.map((r) => r.source || "seed")).size}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Upload Modes */}
          <GlassCard className="mb-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Records</h2>

              {/* Mode Tabs */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {MODES.map((m) => (
                  <motion.button
                    key={m.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setMode(m.id); clearResult(); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      mode === m.id
                        ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40"
                        : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <m.icon size={16} />
                    {m.label}
                  </motion.button>
                ))}
              </div>

              {/* ─── Excel / CSV Mode ─── */}
              {mode === "excel" && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">
                    Upload an Excel (.xlsx) or CSV file. The first row should be column headers.
                    Each row becomes a company record for compliance scanning.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Record Type</label>
                      <select
                        value={excelRecordType}
                        onChange={(e) => setExcelRecordType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      >
                        {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Department</label>
                      <select
                        value={excelDept}
                        onChange={(e) => setExcelDept(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      >
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/15 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all"
                  >
                    <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Click to upload Excel or CSV file</p>
                    <p className="text-gray-400 text-xs mt-1">Supports .xlsx, .xls, .csv</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* ─── JSON Mode ─── */}
              {mode === "json" && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">
                    Paste a JSON array of records, or upload a .json file. Each object should have data fields to scan.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Default Record Type</label>
                      <select
                        value={jsonRecordType}
                        onChange={(e) => setJsonRecordType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      >
                        {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Default Department</label>
                      <select
                        value={jsonDept}
                        onChange={(e) => setJsonDept(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      >
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={8}
                    placeholder={`[\n  {\n    "name": "Alice",\n    "email": "alice@co.com",\n    "mfa_enabled": true,\n    "data_encryption": false\n  }\n]`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-400"
                  />
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleJsonImport}
                      disabled={uploading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm disabled:opacity-50"
                    >
                      {uploading ? "Importing..." : "Import JSON"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15"
                    >
                      Upload .json File
                    </motion.button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* ─── Manual Mode ─── */}
              {mode === "manual" && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">
                    Add a single record by specifying its type, department, and key-value data fields.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Record Type</label>
                      <select
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      >
                        {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Department</label>
                      <select
                        value={manualDept}
                        onChange={(e) => setManualDept(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      >
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-gray-500 text-xs block">Data Fields</label>
                    {manualFields.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={f.key}
                          onChange={(e) => {
                            const copy = [...manualFields];
                            copy[i].key = e.target.value;
                            setManualFields(copy);
                          }}
                          placeholder="Field name (e.g. mfa_enabled)"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-400"
                        />
                        <input
                          value={f.value}
                          onChange={(e) => {
                            const copy = [...manualFields];
                            copy[i].value = e.target.value;
                            setManualFields(copy);
                          }}
                          placeholder="Value (true/false/number/text)"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-400"
                        />
                        {manualFields.length > 1 && (
                          <button
                            onClick={() => setManualFields(manualFields.filter((_, j) => j !== i))}
                            className="text-red-400/60 hover:text-red-400 p-2"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setManualFields([...manualFields, { key: "", value: "" }])}
                      className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1"
                    >
                      <PlusCircle size={14} /> Add Field
                    </button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleManualAdd}
                    disabled={uploading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm disabled:opacity-50"
                  >
                    {uploading ? "Adding..." : "Add Record"}
                  </motion.button>
                </div>
              )}

              {/* ─── Database Mode ─── */}
              {mode === "database" && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">
                    Connect to an external MongoDB database and pull records directly.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Connection String</label>
                      <input
                        value={dbUri}
                        onChange={(e) => setDbUri(e.target.value)}
                        placeholder="mongodb://host:27017 or mongodb+srv://..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Database Name</label>
                        <input
                          value={dbName}
                          onChange={(e) => setDbName(e.target.value)}
                          placeholder="my_database"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Collection / Table</label>
                        <input
                          value={dbCollection}
                          onChange={(e) => setDbCollection(e.target.value)}
                          placeholder="employees"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Record Type</label>
                        <select
                          value={dbRecordType}
                          onChange={(e) => setDbRecordType(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        >
                          {["external", ...RECORD_TYPES].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Department</label>
                        <select
                          value={dbDept}
                          onChange={(e) => setDbDept(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        >
                          {["External", ...DEPARTMENTS].map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Max Records</label>
                        <input
                          type="number"
                          value={dbLimit}
                          onChange={(e) => setDbLimit(Number(e.target.value))}
                          min={1}
                          max={10000}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDbConnect}
                    disabled={uploading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm disabled:opacity-50"
                  >
                    {uploading ? "Connecting..." : "Connect & Import"}
                  </motion.button>
                </div>
              )}

              {/* Result / Error Toast */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-3"
                  >
                    <CheckCircle2 size={20} className="text-green-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-green-300 text-sm font-medium">{result.message}</p>
                      {result.records_imported && (
                        <p className="text-green-400/60 text-xs mt-1">{result.records_imported} records imported</p>
                      )}
                      {result.columns_detected && (
                        <p className="text-green-400/60 text-xs mt-1">
                          Columns: {result.columns_detected.join(", ")}
                        </p>
                      )}
                    </div>
                    <button onClick={clearResult} className="text-gray-400 hover:text-white">
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
                  >
                    <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-300 text-sm flex-1">{error}</p>
                    <button onClick={clearResult} className="text-gray-400 hover:text-white">
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>

          {/* Records Table */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-gray-900">All Records</h2>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-900 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-400"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-900 text-xs focus:outline-none"
                  >
                    <option value="">All Types</option>
                    {Object.keys(stats.by_type).map((t) => (
                      <option key={t} value={t}>{t} ({stats.by_type[t]})</option>
                    ))}
                  </select>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-900 text-xs focus:outline-none"
                  >
                    <option value="">All Depts</option>
                    {Object.keys(stats.by_department).map((d) => (
                      <option key={d} value={d}>{d} ({stats.by_department[d]})</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2 py-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4 px-3 py-3 border-b border-white/5">
                      <div className="w-24 h-3.5 rounded bg-white/10" />
                      <div className="w-20 h-3.5 rounded bg-white/10" />
                      <div className="w-28 h-3.5 rounded bg-white/10" />
                      <div className="w-16 h-3.5 rounded bg-white/10" />
                      <div className="flex-1 h-3.5 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No records found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs border-b border-white/10">
                        <th className="text-left py-3 px-3">Record ID</th>
                        <th className="text-left py-3 px-3">Type</th>
                        <th className="text-left py-3 px-3">Department</th>
                        <th className="text-left py-3 px-3">Source</th>
                        <th className="text-left py-3 px-3">Data Summary</th>
                        <th className="text-right py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 100).map((r, i) => (
                        <motion.tr
                          key={r.record_id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => setSelectedRecord(r)}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3 text-white font-mono text-xs">{r.record_id}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400">
                              {r.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 text-xs">{r.department}</td>
                          <td className="py-3 px-3 text-gray-400 text-xs">{r.source || "seed"}</td>
                          <td className="py-3 px-3 text-gray-500 text-xs max-w-[300px] truncate">
                            {Object.entries(r.data || {}).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRecord(r); }}
                                className="text-blue-400/40 hover:text-blue-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="View details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(r.record_id); }}
                                className="text-red-400/50 hover:text-red-400 p-1"
                                title="Delete record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length > 100 && (
                    <p className="text-center text-gray-400 text-xs mt-3">
                      Showing 100 of {filtered.length} records
                    </p>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </main>

        {/* ─── Record Detail Modal ─── */}
        <AnimatePresence>
          {selectedRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Database size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold text-lg font-mono">{selectedRecord.record_id}</h2>
                      <p className="text-gray-500 text-xs mt-0.5">Record Detail View</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Metadata */}
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Metadata</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
                      <Tag size={14} className="text-blue-400 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Type</p>
                        <p className="text-white text-sm font-medium capitalize">{selectedRecord.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
                      <Building2 size={14} className="text-purple-400 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Department</p>
                        <p className="text-white text-sm font-medium">{selectedRecord.department || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
                      <Hash size={14} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Source</p>
                        <p className="text-white text-sm font-medium truncate">{selectedRecord.source || "seed"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
                      <Calendar size={14} className="text-green-400 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Imported At</p>
                        <p className="text-white text-sm font-medium">
                          {selectedRecord.created_at
                            ? new Date(selectedRecord.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Fields */}
                <div className="p-6">
                  <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    Data Fields ({Object.keys(selectedRecord.data || {}).length})
                  </h3>
                  {Object.keys(selectedRecord.data || {}).length === 0 ? (
                    <p className="text-gray-500 text-sm">No data fields found.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(selectedRecord.data || {}).map(([key, value]) => {
                        const isBoolean = typeof value === "boolean";
                        const isBool = isBoolean ? value : String(value).toLowerCase();
                        const isTrue = isBool === true || isBool === "true";
                        const isFalse = isBool === false || isBool === "false";
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/5"
                          >
                            <span className="text-gray-400 text-sm font-mono">{key}</span>
                            {isBoolean || isBool === "true" || isBool === "false" ? (
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isTrue ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                              }`}>
                                {isTrue ? "✓ true" : "✗ false"}
                              </span>
                            ) : (
                              <span className="text-white text-sm text-right max-w-[60%] break-words">
                                {String(value)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/2">
                  <p className="text-gray-500 text-xs">
                    {Object.keys(selectedRecord.data || {}).length} fields &middot; {selectedRecord.type} record
                  </p>
                  <button
                    onClick={() => { handleDelete(selectedRecord.record_id); setSelectedRecord(null); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={13} /> Delete Record
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}
