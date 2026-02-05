import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create client only if environment variables are set
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export { supabase };

// Types for database tables
export interface Order {
  id?: string;
  order_ref: string;
  card_type: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_city: string;
  city_neighborhood: string;
  phone: string;
  email: string;
  profession: string;
  id_number: string;
  registration_number?: string;
  father_name: string;
  mother_name: string;
  delivery_option: string;
  delivery_address?: string;
  shipping_city?: string;
  no_niu: boolean;
  card_price: number;
  delivery_fee: number;
  niu_fee: number;
  total: number;
  payment_status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'NOT_PAID';
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
}

// Save order to database
export async function saveOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: Order; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured - skipping database save');
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Database error:', err);
    return { success: false, error: 'Database connection error' };
  }
}

// Get order by reference
export async function getOrderByRef(orderRef: string): Promise<Order | null> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_ref', orderRef)
    .single();

  if (error) {
    console.error('Supabase select error:', error);
    return null;
  }

  return data;
}

// Update order payment status
export async function updateOrderPaymentStatus(
  orderRef: string,
  paymentStatus: Order['payment_status'],
  paymentMethod?: string
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return false;
  }

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString()
    })
    .eq('order_ref', orderRef);

  if (error) {
    console.error('Supabase update error:', error);
    return false;
  }

  return true;
}

// Get all orders (for admin)
export async function getAllOrders(limit = 100, offset = 0): Promise<Order[]> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return [];
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Supabase select error:', error);
    return [];
  }

  return data || [];
}

// =============================================
// TRANSACTIONS
// =============================================

export interface Transaction {
  id?: string;
  ptn?: string;
  trid?: string;
  order_ref?: string;
  amount: number;
  phone?: string;
  customer_name?: string;
  customer_email?: string;
  payment_method: string;
  provider?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'ERRORED';
  error_code?: string;
  error_message?: string;
  initiated_at?: string;
  completed_at?: string;
  created_at?: string;
}

// Save a new transaction (when payment is initiated)
export async function saveTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<{ success: boolean; data?: Transaction; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured - skipping transaction save');
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        initiated_at: transaction.initiated_at || new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Transaction save error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Transaction save error:', err);
    return { success: false, error: 'Database connection error' };
  }
}

// Update transaction status (when payment completes or fails)
export async function updateTransactionStatus(
  identifier: { ptn?: string; trid?: string },
  status: Transaction['status'],
  errorCode?: string,
  errorMessage?: string
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return false;
  }

  const updateData: Record<string, unknown> = {
    status,
    completed_at: new Date().toISOString(),
  };

  if (errorCode) updateData.error_code = errorCode;
  if (errorMessage) updateData.error_message = errorMessage;

  let query = supabase.from('transactions').update(updateData);

  if (identifier.ptn) {
    query = query.eq('ptn', identifier.ptn);
  } else if (identifier.trid) {
    query = query.eq('trid', identifier.trid);
  } else {
    console.error('No identifier provided for transaction update');
    return false;
  }

  const { error } = await query;

  if (error) {
    console.error('Transaction update error:', error);
    return false;
  }

  return true;
}

// Get transaction by PTN or TRID
export async function getTransaction(identifier: { ptn?: string; trid?: string }): Promise<Transaction | null> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  let query = supabase.from('transactions').select('*');

  if (identifier.ptn) {
    query = query.eq('ptn', identifier.ptn);
  } else if (identifier.trid) {
    query = query.eq('trid', identifier.trid);
  } else {
    return null;
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('Transaction fetch error:', error);
    return null;
  }

  return data;
}

// Get all transactions (for admin)
export async function getAllTransactions(limit = 100, offset = 0): Promise<Transaction[]> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return [];
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Transactions fetch error:', error);
    return [];
  }

  return data || [];
}
