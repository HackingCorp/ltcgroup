import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink, getPaymentLinkStatus, PAYIN_COUNTRIES } from "@/lib/payments/payin";
import { initiateEnkapPayment } from "@/lib/payments/enkap";
import { updateOrderPaymentStatus, saveTransaction, updateTransactionStatus } from "@/lib/db";

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

    if (method === 'mobile_money') {
      // Validate country code
      if (!countryCode || !PAYIN_COUNTRIES[countryCode.toUpperCase()]) {
        return NextResponse.json(
          { success: false, error: "Invalid or missing country code for Mobile Money payment" },
          { status: 400 }
        );
      }

      // Use Payin for Mobile Money (payment link)
      const result = await createPaymentLink({
        amount,
        countryCode,
        orderRef,
        customerName,
        customerEmail: email,
        customerPhone: phone,
        description: `Carte ${cardType} - ${orderRef}`,
        callbackUrl: process.env.PAYIN_WEBHOOK_URL || '',
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
