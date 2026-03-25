import { assertSupabase } from './supabase'

export async function getTenantBySlug(slug) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getTenantProducts(tenantId) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getTenantSlots(tenantId) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('tenant_slots')
    .select('*, product:products(*)')
    .eq('tenant_id', tenantId)
    .order('slot_no', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getTenantPayments(tenantId) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('tenant_payment_methods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getTenantPaymentMethodsAdmin(tenantId) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('tenant_payment_methods')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getTenantOrders(tenantId) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getOrderById(orderId) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*, payment_method:tenant_payment_methods(*)')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getTenantPickupLocations(tenantId, { admin = false } = {}) {
  const supabase = assertSupabase()
  let query = supabase
    .from('tenant_pickup_locations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (!admin) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data || []
}
