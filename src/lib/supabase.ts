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
