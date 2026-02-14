import { NextRequest, NextResponse } from "next/server";
import { initiateS3PPayment, verifyTransaction, detectService, S3P_SERVICES } from "@/lib/payments/s3p";
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
      // Detect provider (MTN or Orange)
      let provider = 'MTN';
      try {
        const serviceId = detectService(phone);
        provider = serviceId === S3P_SERVICES.ORANGE_MONEY ? 'ORANGE' : 'MTN';
      } catch {
        // Default to MTN if detection fails
      }

      // Use S3P for Mobile Money (MTN, Orange Money)
      const result = await initiateS3PPayment(amount, phone, orderRef, customerName);

      if (!result.success) {
        // Save failed transaction attempt
        await saveTransaction({
          order_ref: orderRef,
          amount,
          phone,
          customer_name: customerName,
          customer_email: email,
          payment_method: 'mobile_money',
          provider,
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
        ptn: result.ptn,
        trid: result.trid,
        order_ref: orderRef,
        amount,
        phone,
        customer_name: customerName,
        customer_email: email,
        payment_method: 'mobile_money',
        provider,
        status: 'PENDING',
      });

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
        // Save failed transaction attempt
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

      // Save transaction to database
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

    // Update transaction and order status in database
    if (result.status === 'SUCCESS' || result.status === 'FAILED' || result.status === 'ERRORED') {
      const dbStatus = result.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';

      // Update transaction status
      await updateTransactionStatus(
        { trid: trid || undefined, ptn: ptn || undefined },
        dbStatus,
        undefined,
        result.errorMessage
      );

      // Update order status if we have the order reference
      if (orderRef) {
        await updateOrderPaymentStatus(orderRef, dbStatus, 'mobile_money');
      }
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
