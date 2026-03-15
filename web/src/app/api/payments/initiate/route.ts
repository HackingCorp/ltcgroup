import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink, getPaymentLinkStatus, PAYIN_COUNTRIES } from "@/lib/payments/payin";
import { initiateEnkapPayment } from "@/lib/payments/enkap";
import { updateOrderPaymentStatus, saveTransaction, updateTransactionStatus, supabase } from "@/lib/db";

export type PaymentMethod = 'mobile_money' | 'enkap';

interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  orderRef: string;
  phone: string;
  email: string;
  customerName: string;
  cardType: string;
  countryCode?: string; // ISO 2-letter code, required for mobile_money
  orderDetails: {
    cardPrice: number;
    deliveryFee: number;
    niuFee: number;
    deliveryOption: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();

    const { method, amount, orderRef, phone, email, customerName, cardType, countryCode, orderDetails } = body;

    // Validate required fields
    if (!method || !amount || !orderRef || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0 || amount > 10000000 || !Number.isFinite(amount)) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Validate phone format (Cameroon)
    const phoneClean = phone.replace(/[\s\-\+]/g, '');
    if (!/^(237)?[62]\d{7,8}$/.test(phoneClean)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate orderRef format
    if (!/^[A-Za-z0-9\-]{3,50}$/.test(orderRef)) {
      return NextResponse.json(
        { success: false, error: "Invalid order reference" },
        { status: 400 }
      );
    }

    // Idempotency: check for existing PENDING transaction with this orderRef
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('order_ref', orderRef)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({
        success: true,
        paymentMethod: existingTx.payment_method,
        transactionId: existingTx.trid,
        orderRef: existingTx.order_ref,
        amount: existingTx.amount,
        existing: true,
      });
    }

    if (method === 'mobile_money') {
      // Validate country code
      if (!countryCode || !PAYIN_COUNTRIES[countryCode.toUpperCase()]) {
        return NextResponse.json(
          { success: false, error: "Invalid or missing country code for Mobile Money payment" },
          { status: 400 }
        );
      }

      // Use Payin for Mobile Money (payment link)
      // Build the redirect URL for after payment (user-facing callback page)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ltcgroup.site';
      const redirectUrl = `${baseUrl}/services/solutions-financieres/payment/callback?status=COMPLETED&order_id=${encodeURIComponent(orderRef)}&method=mobile_money`;

      const result = await createPaymentLink({
        amount,
        countryCode,
        orderRef,
        customerName,
        customerEmail: email,
        customerPhone: phone,
        description: `Carte ${cardType} - ${orderRef}`,
        callbackUrl: process.env.PAYIN_WEBHOOK_URL || '',
        redirectUrl,
      });

      if (!result.success) {
        // Save failed transaction attempt
        await saveTransaction({
          order_ref: orderRef,
          amount,
          phone,
          customer_name: customerName,
          customer_email: email,
          payment_method: 'mobile_money',
          provider: countryCode.toUpperCase(),
          status: 'FAILED',
          error_message: result.error,
        });

        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      // Save transaction to database
      await saveTransaction({
        trid: result.transactionId,
        order_ref: orderRef,
        amount,
        phone,
        customer_name: customerName,
        customer_email: email,
        payment_method: 'mobile_money',
        provider: countryCode.toUpperCase(),
        status: 'PENDING',
      });

      return NextResponse.json({
        success: true,
        paymentMethod: 'mobile_money',
        paymentUrl: result.paymentLink,
        transactionId: result.transactionId,
        paymentLinkId: result.paymentLinkId,
        totalAmount: result.totalAmount,
        orderRef,
      });

    } else if (method === 'enkap') {
      // Use E-nkap for card/multi-channel payments (unchanged)
      const result = await initiateEnkapPayment({
        amount,
        orderRef,
        customerName,
        customerEmail: email,
        customerPhone: phone,
        description: `Carte ${cardType} - ${orderRef}`,
      });

      if (!result.success) {
        await saveTransaction({
          order_ref: orderRef,
          amount,
          phone,
          customer_name: customerName,
          customer_email: email,
          payment_method: 'enkap',
          status: 'FAILED',
          error_message: result.error,
        });

        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      await saveTransaction({
        trid: result.transactionId,
        order_ref: orderRef,
        amount,
        phone,
        customer_name: customerName,
        customer_email: email,
        payment_method: 'enkap',
        status: 'PENDING',
      });

      return NextResponse.json({
        success: true,
        paymentMethod: 'enkap',
        orderId: result.orderId,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
        orderRef,
      });

    } else {
      return NextResponse.json(
        { success: false, error: "Invalid payment method" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check Mobile Money payment status (Payin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const orderRef = searchParams.get('orderRef');

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Missing transaction ID" },
        { status: 400 }
      );
    }

    const result = await getPaymentLinkStatus(transactionId);

    // Update transaction and order status in database
    if (result.status === 'COMPLETED' || result.status === 'FAILED' || result.status === 'REFUNDED') {
      const dbStatus = result.status === 'COMPLETED' ? 'SUCCESS' : 'FAILED';

      await updateTransactionStatus(
        { trid: transactionId },
        dbStatus,
      );

      if (orderRef) {
        await updateOrderPaymentStatus(orderRef, dbStatus, 'mobile_money');
      }
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      amount: result.amount,
    });

  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur de vérification" },
      { status: 500 }
    );
  }
}
