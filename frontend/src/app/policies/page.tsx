"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Trash2,
  ChevronRight,
  Sparkles,
  File,
  CheckCircle2,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import StatusBadge from "@/components/ui/StatusBadge";
import SeverityBadge from "@/components/ui/SeverityBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import AuthGuard from "@/components/layout/AuthGuard";
import { listPolicies, uploadPolicy, demoUpload, deletePolicy, getPolicy, reanalyzePolicy } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [policyRules, setPolicyRules] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPolicies = async () => {
    try {
      const res = await listPolicies();
      setPolicies(res.data.policies || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // Poll policy list until pollingId becomes active
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      try {
        const res = await listPolicies();
        const all = res.data.policies || [];
        setPolicies(all);
        const target = all.find((p: any) => p.policy_id === pollingId);
        if (target && target.status === "active") {
          setPollingId(null);
          setUploadResult((prev: any) => prev ? { ...prev, rules_extracted: target.rule_count, status: "active", message: `✓ AI finished — ${target.rule_count} compliance rules extracted. Click the policy card to view them.` } : prev);
          // If the modal is open for this policy, refresh it too
          if (modalOpen && selectedPolicy?.policy_id === pollingId) {
            const detail = await getPolicy(pollingId);
            setPolicyRules(detail.data.rules || []);
            const fp = detail.data.policy;
            setSelectedPolicy((prev: any) => ({ ...prev, ...fp }));
            setAiAnalysis(fp?.ai_analysis || null);
          }
        }
      } catch {/* ignore */}
    }, 5000);
    return () => clearInterval(interval);
  }, [pollingId, modalOpen, selectedPolicy?.policy_id]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    setPollingId(null);
    try {
      const res = await uploadPolicy(file);
      setUploadResult(res.data);
      fetchPolicies();
      // Start polling if AI is still processing
      if (res.data.status === "processing") {
        setPollingId(res.data.policy_id);
      }
    } catch (e: any) {
      setUploadResult({ error: e?.response?.data?.detail || "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleDemoUpload = async () => {
    setUploading(true);
    setUploadResult(null);
    setPollingId(null);
    try {
      const res = await demoUpload();
      setUploadResult(res.data);
      fetchPolicies();
      if (res.data.status === "processing") {
        setPollingId(res.data.policy_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (policyId: string) => {
    try {
      await deletePolicy(policyId);
      fetchPolicies();
    } catch (e) {
      console.error(e);
    }
  };

  const showPolicyDetail = async (policy: any) => {
    setSelectedPolicy(policy);
    setAiAnalysis(null);
    setPolicyRules([]);
    setLoadingDetail(true);
    setModalOpen(true);
    try {
      const res = await getPolicy(policy.policy_id);
      setPolicyRules(res.data.rules || []);
      const fullPolicy = res.data.policy;
      setSelectedPolicy((prev: any) => ({ ...prev, ...fullPolicy }));
      setAiAnalysis(fullPolicy?.ai_analysis || null);
    } catch {
      setPolicyRules([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const refreshDetail = async () => {
    if (!selectedPolicy?.policy_id) return;
    setLoadingDetail(true);
    try {
      const res = await getPolicy(selectedPolicy.policy_id);
      setPolicyRules(res.data.rules || []);
      const fullPolicy = res.data.policy;
      setSelectedPolicy((prev: any) => ({ ...prev, ...fullPolicy }));
      setAiAnalysis(fullPolicy?.ai_analysis || null);
      fetchPolicies();
    } catch {/* ignore */}
    finally { setLoadingDetail(false); }
  };

  const triggerAnalysis = async () => {
    if (!selectedPolicy?.policy_id) return;
    setLoadingDetail(true);
    try {
      await reanalyzePolicy(selectedPolicy.policy_id);
      setAiAnalysis({ status: "processing", summary: "AI analysis is running in the background…" });
      // Poll until done
      setPollingId(selectedPolicy.policy_id);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <AuthGuard>
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px]">
        <Topbar />
        <div className="p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Policy Management</h1>
            <p className="text-gray-400 text-sm">
              Upload compliance policies and extract rules using AI
            </p>
          </motion.div>

          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <GlassCard className="!p-8" animate={false}>
              <div className="flex flex-col items-center text-center">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Upload size={28} className="text-blue-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upload Compliance Policy
                </h3>
                <p className="text-sm text-gray-400 mb-6 max-w-md">
                  Upload a PDF policy document. Our AI will extract structured compliance
                  rules automatically.
                </p>
                <div className="flex gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUpload(e.target.files[0]);
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="glass-button flex items-center gap-2 px-6 py-3"
                  >
                    <File size={16} />
                    {uploading ? "Processing..." : "Upload PDF"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDemoUpload}
                    disabled={uploading}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <Sparkles size={16} className="text-purple-400" />
                    Demo Policy
                  </motion.button>
                </div>
              </div>

              {/* Upload Result */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6"
                  >
                    <LoadingSpinner text="AI is analyzing your policy document..." />
                  </motion.div>
                )}
                {uploadResult && !uploading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 glass-card !p-4"
                  >
                    {uploadResult.error ? (
                      <p className="text-red-400 text-sm">{uploadResult.error}</p>
                    ) : (
                      <div className="flex items-start gap-3">
                        {uploadResult.status === "processing" ? (
                          <div className="shrink-0 mt-0.5">
                            <LoadingSpinner />
                          </div>
                        ) : (
                          <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${uploadResult.status === "processing" ? "text-yellow-400" : "text-green-400"}`}>
                            {uploadResult.message}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-400">
                            <span>Policy ID: {uploadResult.policy_id}</span>
                            {uploadResult.page_count > 0 && <span>Pages: {uploadResult.page_count}</span>}
                            {uploadResult.rules_extracted > 0 && <span>Rules: {uploadResult.rules_extracted}</span>}
                            {uploadResult.status === "processing" && <span className="text-yellow-400 animate-pulse">AI processing…</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>

          {/* Policies List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Policies</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card p-5 animate-pulse space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10" />
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ) : policies.length === 0 ? (
              <GlassCard className="text-center py-12">
                <FileText size={48} className="text-white/10 mx-auto mb-4" />
                <p className="text-gray-400">No policies uploaded yet</p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {policies.map((p, i) => (
                  <motion.div
                    key={p.policy_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard className="flex flex-col h-full" animate={false}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                          <FileText size={18} className="text-blue-400" />
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                        {p.filename}
                      </h3>
                      <p className="text-xs text-gray-400 mb-3">
                        ID: {p.policy_id}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                        <span>{p.page_count} pages</span>
                        <span>{p.rule_count} rules</span>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => showPolicyDetail(p)}
                          className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1"
                        >
                          View Rules <ChevronRight size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.policy_id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Policy Detail Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Policy: ${selectedPolicy?.filename || ""}`}
          maxWidth="max-w-4xl"
        >
          {selectedPolicy && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card !p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedPolicy.page_count}
                  </p>
                  <p className="text-xs text-gray-400">Pages</p>
                </div>
                <div className="glass-card !p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {policyRules.length}
                  </p>
                  <p className="text-xs text-gray-400">Rules Extracted</p>
                </div>
                <div className="glass-card !p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {selectedPolicy.text_length?.toLocaleString() || "—"}
                  </p>
                  <p className="text-xs text-gray-400">Characters</p>
                </div>
              </div>

              {/* AI Overview Section */}
              {loadingDetail && !aiAnalysis && (
                <div className="glass-card !p-4 flex items-center gap-3">
                  <LoadingSpinner />
                  <p className="text-xs text-gray-400">Loading AI analysis…</p>
                </div>
              )}
              {!loadingDetail && (!aiAnalysis || aiAnalysis?.status === "error") && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card !p-5 border border-purple-500/20 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-400" /> AI Overview
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {aiAnalysis?.status === "error"
                        ? `Previous attempt failed: ${aiAnalysis.summary}`
                        : "No AI analysis yet for this policy."}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={triggerAnalysis}
                    disabled={loadingDetail}
                    className="shrink-0 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all text-xs font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    Generate AI Overview
                  </motion.button>
                </motion.div>
              )}
              {aiAnalysis?.status === "processing" && (
                <div className="glass-card !p-4 flex items-center gap-3 border border-yellow-500/20">
                  <LoadingSpinner />
                  <div className="flex-1">
                    <p className="text-xs text-yellow-400 font-medium">AI is analyzing your document…</p>
                    <p className="text-xs text-gray-500 mt-0.5">Rules will appear once extraction completes (20–30 s).</p>
                  </div>
                  <button
                    onClick={refreshDetail}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline shrink-0"
                  >
                    Refresh
                  </button>
                </div>
              )}
              {aiAnalysis?.status === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card !p-5 border border-purple-500/20 space-y-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} className="text-purple-400" />
                    <h3 className="text-sm font-semibold text-purple-300">AI Document Overview</h3>
                    {aiAnalysis.document_type && (
                      <span className="ml-auto text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                        {aiAnalysis.document_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{aiAnalysis.summary}</p>
                  {aiAnalysis.key_requirements?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-2">Key Requirements</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {aiAnalysis.key_requirements.map((req: string, i: number) => (
                          <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                            <span className="text-green-400 mt-0.5 shrink-0">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiAnalysis.risk_areas?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-2">Risk Areas</p>
                      <div className="flex gap-2 flex-wrap">
                        {aiAnalysis.risk_areas.map((area: string) => (
                          <span key={area} className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiAnalysis.compliance_frameworks?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {aiAnalysis.compliance_frameworks.map((fw: string) => (
                        <span key={fw} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="flex items-center justify-between mt-6 mb-3">
                <h3 className="text-sm font-semibold text-gray-500">
                  Extracted Compliance Rules
                </h3>
                <button
                  onClick={refreshDetail}
                  disabled={loadingDetail}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline disabled:opacity-50"
                >
                  {loadingDetail ? "Refreshing…" : "↻ Refresh"}
                </button>
              </div>
              <div className="space-y-3">
                {policyRules.map((rule, i) => (
                  <motion.div
                    key={rule.rule_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card !p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-400">
                        {rule.rule_id}
                      </span>
                      <SeverityBadge severity={rule.severity} />
                      <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                        {rule.category}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 font-medium mb-1">
                      {rule.condition}
                    </p>
                    <p className="text-xs text-gray-400">{rule.required_action}</p>
                    {rule.policy_reference && (
                      <p className="text-xs text-blue-400/60 mt-2">
                        Ref: {rule.policy_reference}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
    </AuthGuard>
  );
}
