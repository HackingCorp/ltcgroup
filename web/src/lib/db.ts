import pg from 'pg';

const { Pool } = pg;

// Reuse pool across hot-reloads in development
const globalForPg = globalThis as unknown as { pgPool: pg.Pool | undefined };

const dbUrl = process.env.DATABASE_URL
  || process.env.POSTGRES_URL
  || process.env.SUPABASE_DB_URL
  || 'postgresql://ltcgroup:ltcgroup_secret@localhost:5432/ltcgroup';

const pool = globalForPg.pgPool ?? new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export { pool };

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
  try {
    const result = await pool.query(
      `INSERT INTO orders (
        order_ref, card_type, first_name, last_name, birth_date, birth_city,
        city_neighborhood, phone, email, profession, id_number, registration_number,
        father_name, mother_name, delivery_option, delivery_address, shipping_city,
        no_niu, card_price, delivery_fee, niu_fee, total, payment_status, payment_method
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *`,
      [
        order.order_ref, order.card_type, order.first_name, order.last_name,
        order.birth_date, order.birth_city, order.city_neighborhood, order.phone,
        order.email, order.profession, order.id_number, order.registration_number,
        order.father_name, order.mother_name, order.delivery_option, order.delivery_address,
        order.shipping_city, order.no_niu, order.card_price, order.delivery_fee,
        order.niu_fee, order.total, order.payment_status, order.payment_method,
      ]
    );
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error('Database insert error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

// Get order by reference
export async function getOrderByRef(orderRef: string): Promise<Order | null> {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE order_ref = $1', [orderRef]);
    return result.rows[0] || null;
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
    await pool.query(
      'UPDATE orders SET payment_status = $1, payment_method = $2, updated_at = NOW() WHERE order_ref = $3',
      [paymentStatus, paymentMethod, orderRef]
    );
    return true;
  } catch (err) {
    console.error('Database update error:', err);
    return false;
  }
}

// Get all orders (for admin)
export async function getAllOrders(limit = 100, offset = 0): Promise<Order[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
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

// Save a new transaction
export async function saveTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<{ success: boolean; data?: Transaction; error?: string }> {
  try {
    const result = await pool.query(
      `INSERT INTO transactions (
        ptn, trid, order_ref, amount, phone, customer_name, customer_email,
        payment_method, provider, status, error_code, error_message, initiated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        transaction.ptn, transaction.trid, transaction.order_ref, transaction.amount,
        transaction.phone, transaction.customer_name, transaction.customer_email,
        transaction.payment_method, transaction.provider, transaction.status,
        transaction.error_code, transaction.error_message,
        transaction.initiated_at || new Date().toISOString(),
      ]
    );
    return { success: true, data: result.rows[0] };
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
    let query: string;
    let params: unknown[];

    if (identifier.ptn) {
      query = 'UPDATE transactions SET status = $1, completed_at = NOW(), error_code = $2, error_message = $3 WHERE ptn = $4';
      params = [status, errorCode, errorMessage, identifier.ptn];
    } else if (identifier.trid) {
      query = 'UPDATE transactions SET status = $1, completed_at = NOW(), error_code = $2, error_message = $3 WHERE trid = $4';
      params = [status, errorCode, errorMessage, identifier.trid];
    } else {
      console.error('No identifier provided for transaction update');
      return false;
    }

    await pool.query(query, params);
    return true;
  } catch (err) {
    console.error('Transaction update error:', err);
    return false;
  }
}

// Get transaction by PTN or TRID
export async function getTransaction(identifier: { ptn?: string; trid?: string }): Promise<Transaction | null> {
  try {
    let query: string;
    let params: unknown[];

    if (identifier.ptn) {
      query = 'SELECT * FROM transactions WHERE ptn = $1';
      params = [identifier.ptn];
    } else if (identifier.trid) {
      query = 'SELECT * FROM transactions WHERE trid = $1';
      params = [identifier.trid];
    } else {
      return null;
    }

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Transaction fetch error:', err);
    return null;
  }
}

// Get all transactions (for admin)
export async function getAllTransactions(limit = 100, offset = 0): Promise<Transaction[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('Transactions fetch error:', err);
    return [];
  }
}
