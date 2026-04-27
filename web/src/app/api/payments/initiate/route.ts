import { NextRequest, NextResponse } from "next/server";
import { createDirectPayment, getPaymentStatus, LtcPayOperator } from "@/lib/payments/ltcpay";
import { initiateEnkapPayment } from "@/lib/payments/enkap";
import { updateOrderPaymentStatus, saveTransaction, updateTransactionStatus, getPendingTransactionByOrderRef } from "@/lib/db";

export type PaymentMethod = 'mobile_money' | 'enkap';

const VALID_OPERATORS: LtcPayOperator[] = ["MTN", "ORANGE"];

interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  orderRef: string;
  phone: string;
  email: string;
  customerName: string;
  cardType: string;
  operator?: LtcPayOperator; // Required for mobile_money
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

    const { method, amount, orderRef, phone, email, customerName, cardType, operator, orderDetails } = body;

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
    const existingTx = await getPendingTransactionByOrderRef(orderRef);

    if (existingTx) {
      return NextResponse.json({
        success: true,
        paymentMethod: existingTx.payment_method,
        reference: existingTx.trid,
        orderRef: existingTx.order_ref,
        amount: existingTx.amount,
        existing: true,
      });
    }

    if (method === 'mobile_money') {
      // Validate operator (MTN or ORANGE)
      if (!operator || !VALID_OPERATORS.includes(operator)) {
        return NextResponse.json(
          { success: false, error: "Veuillez selectionner un operateur (MTN ou Orange)" },
          { status: 400 }
        );
      }

      // Use LTCPay Direct API for Mobile Money (push to phone)
      const webhookUrl = process.env.LTCPAY_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ltcgroup.site'}/api/payments/webhook`;

      const result = await createDirectPayment({
        amount,
        operator,
        customerPhone: phone,
        merchantReference: orderRef,
        description: `Carte ${cardType} - ${orderRef}`,
        customerName,
        customerEmail: email,
        callbackUrl: webhookUrl,
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
          provider: operator,
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
        trid: result.reference,
        order_ref: orderRef,
        amount,
        phone,
        customer_name: customerName,
        customer_email: email,
        payment_method: 'mobile_money',
        provider: operator,
        status: 'PENDING',
      });

      return NextResponse.json({
        success: true,
        paymentMethod: 'mobile_money',
        reference: result.reference,
        status: result.status,
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

// GET endpoint to check Mobile Money payment status (LTCPay)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference') || searchParams.get('trid');
    const orderRef = searchParams.get('orderRef');

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Missing payment reference" },
        { status: 400 }
      );
    }

    const result = await getPaymentStatus(reference);

    // Map LTCPay statuses to DB/frontend statuses
    let dbStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
    let frontendStatus: string;

    switch (result.status) {
      case 'COMPLETED':
        dbStatus = 'SUCCESS';
        frontendStatus = 'SUCCESS';
        break;
      case 'FAILED':
      case 'EXPIRED':
      case 'CANCELLED':
        dbStatus = 'FAILED';
        frontendStatus = 'FAILED';
        break;
      case 'PROCESSING':
      case 'PENDING':
      default:
        dbStatus = 'PENDING';
        frontendStatus = 'PENDING';
        break;
    }

    // Update transaction and order status in database for terminal statuses
    if (dbStatus === 'SUCCESS' || dbStatus === 'FAILED') {
      await updateTransactionStatus(
        { trid: reference },
        dbStatus,
      );

      if (orderRef) {
        await updateOrderPaymentStatus(orderRef, dbStatus, 'mobile_money');
      }
    }

    return NextResponse.json({
      success: true,
      status: frontendStatus,
      ltcpayStatus: result.status,
      amount: result.amount,
      failureReason: result.failureReason,
    });

  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur de verification" },
      { status: 500 }
    );
  }
}
