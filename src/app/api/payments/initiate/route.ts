import { NextRequest, NextResponse } from "next/server";
import { initiateS3PPayment, verifyTransaction } from "@/lib/payments/s3p";
import { initiateEnkapPayment } from "@/lib/payments/enkap";
import { updateOrderPaymentStatus } from "@/lib/supabase";

export type PaymentMethod = 'mobile_money' | 'enkap';

interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  orderRef: string;
  phone: string;
  email: string;
  customerName: string;
  cardType: string;
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

    const { method, amount, orderRef, phone, email, customerName, cardType, orderDetails } = body;

    // Validate required fields
    if (!method || !amount || !orderRef || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Store order details in session/database for later verification
    // For now, we'll include them in the transaction reference

    if (method === 'mobile_money') {
      // Use S3P for Mobile Money (MTN, Orange Money)
      const result = await initiateS3PPayment(amount, phone, orderRef, customerName);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentMethod: 'mobile_money',
        ptn: result.ptn,
        trid: result.trid, // Transaction reference for verification
        status: result.status,
        message: result.message || "Veuillez confirmer le paiement sur votre téléphone",
        orderRef,
      });

    } else if (method === 'enkap') {
      // Use E-nkap for card/multi-channel payments
      const result = await initiateEnkapPayment({
        amount,
        orderRef,
        customerName,
        customerEmail: email,
        customerPhone: phone,
        description: `Carte ${cardType} - ${orderRef}`,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

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

// GET endpoint to check Mobile Money payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trid = searchParams.get('trid');
    const ptn = searchParams.get('ptn');
    const orderRef = searchParams.get('orderRef');

    // Prefer TRID for verification (more reliable)
    const transactionRef = trid || ptn;

    if (!transactionRef) {
      return NextResponse.json(
        { success: false, error: "Missing transaction reference" },
        { status: 400 }
      );
    }

    const result = await verifyTransaction(transactionRef);

    // Update payment status in database if we have the order reference
    if (orderRef && (result.status === 'SUCCESS' || result.status === 'FAILED' || result.status === 'ERRORED')) {
      const dbStatus = result.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
      await updateOrderPaymentStatus(orderRef, dbStatus, 'mobile_money');
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      amount: result.amount,
      errorMessage: result.errorMessage,
    });

  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur de vérification" },
      { status: 500 }
    );
  }
}
