"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, Button, Input } from "@/components/ui";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import { withdrawalsService } from "@/services/withdrawals.service";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import type { BalanceInfo, Withdrawal, WithdrawalListResponse } from "@/types";

const withdrawalSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  method: z.enum(["MOBILE_MONEY", "BANK_TRANSFER"]),
  mobile_money_number: z.string().optional(),
  mobile_money_operator: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_name: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.method === "MOBILE_MONEY") {
    if (!data.mobile_money_number) {
      ctx.addIssue({ code: "custom", message: "Phone number is required", path: ["mobile_money_number"] });
    }
    if (!data.mobile_money_operator) {
      ctx.addIssue({ code: "custom", message: "Operator is required", path: ["mobile_money_operator"] });
    }
  }
  if (data.method === "BANK_TRANSFER") {
    if (!data.bank_name) {
      ctx.addIssue({ code: "custom", message: "Bank name is required", path: ["bank_name"] });
    }
    if (!data.bank_account_number) {
      ctx.addIssue({ code: "custom", message: "Account number is required", path: ["bank_account_number"] });
    }
    if (!data.bank_account_name) {
      ctx.addIssue({ code: "custom", message: "Account name is required", path: ["bank_account_name"] });
    }
  }
});

type WithdrawalForm = z.infer<typeof withdrawalSchema>;

export default function MerchantWithdrawalsPage() {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { method: "MOBILE_MONEY" },
  });

  const method = watch("method");

  const loadData = async () => {
    try {
      const [b, w] = await Promise.all([
        merchantDashboardService.getBalance(),
        withdrawalsService.list({ page_size: 50 }),
      ]);
      setBalance(b);
      setWithdrawals(w);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onSubmit = async (data: WithdrawalForm) => {
    setSubmitting(true);
    try {
      await withdrawalsService.create({
        amount: parseFloat(data.amount),
        method: data.method,
        mobile_money_number: data.mobile_money_number,
        mobile_money_operator: data.mobile_money_operator,
        bank_name: data.bank_name,
        bank_account_number: data.bank_account_number,
        bank_account_name: data.bank_account_name,
      });
      toast.success("Withdrawal request submitted!");
      reset();
      loadData();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Request failed"
          : "Request failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>

      {/* Balance Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: "Total Earned", value: balance?.total_earned ?? 0 },
              { label: "Total Fees", value: balance?.total_fees ?? 0 },
              { label: "Withdrawn", value: balance?.total_withdrawn ?? 0 },
              { label: "Pending", value: balance?.pending_withdrawals ?? 0 },
              { label: "Available", value: balance?.available_balance ?? 0, highlight: true },
            ].map((item) => (
              <div key={item.label} className={item.highlight ? "sm:border-l sm:pl-4" : ""}>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`text-lg font-bold ${item.highlight ? "text-green-600" : "text-gray-900"}`}>
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Request Withdrawal */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Request Withdrawal</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
            <Input
              id="amount"
              label="Amount (XAF)"
              type="number"
              placeholder="Enter amount"
              error={errors.amount?.message}
              {...register("amount")}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                {...register("method")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-200"
              >
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            {method === "MOBILE_MONEY" && (
              <>
                <Input
                  id="mobile_money_number"
                  label="Phone Number"
                  placeholder="+237..."
                  error={errors.mobile_money_number?.message}
                  {...register("mobile_money_number")}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <select
                    {...register("mobile_money_operator")}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-200"
                  >
                    <option value="">Select operator</option>
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="ORANGE">Orange Money</option>
                  </select>
                  {errors.mobile_money_operator && (
                    <p className="mt-1 text-xs text-red-500">{errors.mobile_money_operator.message}</p>
                  )}
                </div>
              </>
            )}

            {method === "BANK_TRANSFER" && (
              <>
                <Input
                  id="bank_name"
                  label="Bank Name"
                  placeholder="Bank name"
                  error={errors.bank_name?.message}
                  {...register("bank_name")}
                />
                <Input
                  id="bank_account_number"
                  label="Account Number"
                  placeholder="Account number"
                  error={errors.bank_account_number?.message}
                  {...register("bank_account_number")}
                />
                <Input
                  id="bank_account_name"
                  label="Account Name"
                  placeholder="Account holder name"
                  error={errors.bank_account_name?.message}
                  {...register("bank_account_name")}
                />
              </>
            )}

            <Button type="submit" isLoading={submitting}>
              Submit Withdrawal Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Withdrawal History</h2>
        </CardHeader>
        <CardContent>
          {withdrawals && withdrawals.withdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {withdrawals.withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs">{w.reference}</td>
                      <td className="py-3">{formatCurrency(w.amount, w.currency)}</td>
                      <td className="py-3 text-xs">
                        {w.method === "MOBILE_MONEY" ? `Mobile Money (${w.mobile_money_operator})` : "Bank Transfer"}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(w.status)}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">No withdrawals yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
