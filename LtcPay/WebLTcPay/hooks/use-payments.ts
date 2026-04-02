"use client";

import { useState, useCallback } from "react";
import { paymentsService, type PaymentFilters } from "@/services/payments.service";
import type { Payment, PaginatedResponse } from "@/types";

export function usePayments() {
  const [payments, setPayments] = useState<PaginatedResponse<Payment> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (filters: PaymentFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await paymentsService.list(filters);
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch payments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { payments, isLoading, error, fetchPayments };
}
