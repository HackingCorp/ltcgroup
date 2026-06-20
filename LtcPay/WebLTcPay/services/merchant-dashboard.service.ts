import api from "@/lib/api";
import type { MerchantDashboardStats, BalanceInfo, BalanceByCountryInfo, Payment, PaginatedResponse } from "@/types";

export const merchantDashboardService = {
  async getStats(): Promise<MerchantDashboardStats> {
    const response = await api.get<MerchantDashboardStats>("/merchant-dashboard/stats");
    return response.data;
  },

  async getPayments(params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Payment>> {
    const response = await api.get<PaginatedResponse<Payment>>("/merchant-dashboard/payments", {
      params,
    });
    return response.data;
  },

  async getPayment(reference: string): Promise<Payment> {
    const response = await api.get<Payment>(`/merchant-dashboard/payments/${reference}`);
    return response.data;
  },

  async getBalance(): Promise<BalanceInfo> {
    const response = await api.get<BalanceInfo>("/merchant-dashboard/balance");
    return response.data;
  },

  async getBalanceByCountry(): Promise<BalanceByCountryInfo> {
    const response = await api.get<BalanceByCountryInfo>("/merchant-dashboard/balance/by-country");
    return response.data;
  },

  // ── Refunds ──────────────────────────────────────
  async getRefunds(params?: { page?: number; page_size?: number; status?: string }) {
    const response = await api.get("/merchant-dashboard/refunds", { params });
    return response.data;
  },

  async getRefundStats() {
    const response = await api.get("/merchant-dashboard/refunds/stats");
    return response.data;
  },

  // ── Payment Links ────────────────────────────────
  async getLinks(params?: { page?: number; page_size?: number; active?: boolean }) {
    const response = await api.get("/merchant-dashboard/links", { params });
    return response.data;
  },

  // ── Team ─────────────────────────────────────────
  async getTeamMembers() {
    const response = await api.get("/merchant-dashboard/team/members");
    return response.data;
  },

  async getTeamRoles() {
    const response = await api.get("/merchant-dashboard/team/roles");
    return response.data;
  },

  // ── Reports ──────────────────────────────────────
  async getReports(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/merchant-dashboard/reports", { params });
    return response.data;
  },

  async getReportTypes() {
    const response = await api.get("/merchant-dashboard/reports/types");
    return response.data;
  },

  // ── Notifications ────────────────────────────────
  async getNotifications(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/merchant-dashboard/notifications", { params });
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get("/merchant-dashboard/notifications/unread-count");
    return response.data;
  },

  async getNotificationPreferences() {
    const response = await api.get("/merchant-dashboard/notifications/preferences");
    return response.data;
  },

  // ── KYC ──────────────────────────────────────────
  async getKyc() {
    const response = await api.get("/merchant-dashboard/kyc");
    return response.data;
  },

  async getKycDocuments() {
    const response = await api.get("/merchant-dashboard/kyc/documents");
    return response.data;
  },

  // ── Settings ─────────────────────────────────────
  async getSettings() {
    const response = await api.get("/merchant-dashboard/settings");
    return response.data;
  },

  // ── Billing ──────────────────────────────────────
  async getBillingInvoices(params?: { page?: number }) {
    const response = await api.get("/merchant-dashboard/billing/invoices", { params });
    return response.data;
  },

  async getBillingCurrent() {
    const response = await api.get("/merchant-dashboard/billing/current");
    return response.data;
  },

  // ── Withdrawals / Payouts ────────────────────────
  async getWithdrawals(params?: { page?: number; page_size?: number }) {
    const response = await api.get("/merchant-dashboard/withdrawals", { params });
    return response.data;
  },
};
