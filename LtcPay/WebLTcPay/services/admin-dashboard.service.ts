import api from "@/lib/api";

export const adminDashboardService = {
  // ── Disputes ────────────────────────────────────────────────
  async getDisputes(params?: { status?: string; page?: number; page_size?: number }) {
    const response = await api.get("/admin/disputes", { params });
    return response.data;
  },

  async getDisputeStats() {
    const response = await api.get("/admin/disputes/stats");
    return response.data;
  },

  // ── Fees ────────────────────────────────────────────────────
  async getFeeRules(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/admin/fees/rules", { params });
    return response.data;
  },

  async getFeeOverrides(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/admin/fees/overrides", { params });
    return response.data;
  },

  async getFeeStats() {
    const response = await api.get("/admin/fees/stats");
    return response.data;
  },

  // ── Finance ─────────────────────────────────────────────────
  async getFinanceStats() {
    const response = await api.get("/admin/finance/stats");
    return response.data;
  },

  async getSettlements(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/admin/finance/settlements", { params });
    return response.data;
  },

  async getRevenueSplit() {
    const response = await api.get("/admin/finance/revenue-split");
    return response.data;
  },

  // ── Health ──────────────────────────────────────────────────
  async getHealth() {
    const response = await api.get("/admin/health/");
    return response.data;
  },

  async getHealthServices() {
    const response = await api.get("/admin/health/services");
    return response.data;
  },

  // ── Security ────────────────────────────────────────────────
  async getAuditLogs(params?: { page?: number; page_size?: number; severity?: string }) {
    const response = await api.get("/admin/security/audit-logs", { params });
    return response.data;
  },

  async getSecurityStats() {
    const response = await api.get("/admin/security/stats");
    return response.data;
  },

  // ── Users ───────────────────────────────────────────────────
  async getUsers(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/admin/users/", { params });
    return response.data;
  },

  async getUserRoles() {
    const response = await api.get("/admin/users/roles");
    return response.data;
  },

  // ── Webhooks ─────────────────────────────────────────────────
  async getWebhookStats() {
    const response = await api.get("/admin/webhooks/stats");
    return response.data;
  },

  async getWebhookLogs(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/admin/webhooks/logs", { params });
    return response.data;
  },

  async getWebhookMethodBreakdown() {
    const response = await api.get("/admin/webhooks/method-breakdown");
    return response.data;
  },

  async getWebhookErrors() {
    const response = await api.get("/admin/webhooks/errors");
    return response.data;
  },
};
