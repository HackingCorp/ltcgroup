import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const globalForSupabase = globalThis as unknown as { supabase: SupabaseClient | undefined };

const supabase = globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseKey);

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
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
  registration_number?: string | null;
  father_name: string;
  mother_name: string;
  delivery_option: string;
  delivery_address?: string | null;
  shipping_city?: string | null;
  no_niu: boolean;
  card_price: number;
  delivery_fee: number;
  niu_fee: number;
  total: number;
  payment_status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'NOT_PAID';
  payment_method?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Save order to database
export async function saveOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: Order; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Database insert error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

// Get order by reference
export async function getOrderByRef(orderRef: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_ref', orderRef)
      .single();

    if (error) {
      console.error('Database select error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Database select error:', err);
    return null;
  }
}

// Update order payment status
export async function updateOrderPaymentStatus(
  orderRef: string,
  paymentStatus: Order['payment_status'],
  paymentMethod?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('order_ref', orderRef);

    if (error) {
      console.error('Database update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Database update error:', err);
    return false;
  }
}

// Get all orders (for admin)
export async function getAllOrders(limit = 100, offset = 0): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database select error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Database select error:', err);
    return [];
  }
}

// =============================================
// TRANSACTIONS
// =============================================

export interface Transaction {
  id?: string;
  ptn?: string | null;
  trid?: string | null;
  order_ref?: string | null;
  amount: number;
  phone?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  payment_method: string;
  provider?: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'ERRORED';
  error_code?: string | null;
  error_message?: string | null;
  initiated_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

// Save a new transaction
export async function saveTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<{ success: boolean; data?: Transaction; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        initiated_at: transaction.initiated_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Transaction save error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Transaction save error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

// Update transaction status
export async function updateTransactionStatus(
  identifier: { ptn?: string; trid?: string },
  status: Transaction['status'],
  errorCode?: string,
  errorMessage?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('transactions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        error_code: errorCode || null,
        error_message: errorMessage || null,
      });

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
      console.error('Transaction update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Transaction update error:', err);
    return false;
  }
}

// Get transaction by PTN or TRID
export async function getTransaction(identifier: { ptn?: string; trid?: string }): Promise<Transaction | null> {
  try {
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
      console.error('Transaction fetch error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Transaction fetch error:', err);
    return null;
  }
}

// Get all transactions (for admin)
export async function getAllTransactions(limit = 100, offset = 0): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Transactions fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Transactions fetch error:', err);
    return [];
  }
}
