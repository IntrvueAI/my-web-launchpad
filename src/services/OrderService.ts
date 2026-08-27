import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/models/Order';

export const OrderService = {
  async createOrder(pack: 2 | 3 | 5): Promise<{ checkoutUrl: string; sessionId: string }> {
    const { data, error } = await supabase.functions.invoke('create-payment', { body: { pack } });
    if (error) throw error;
    return { checkoutUrl: data.url, sessionId: data.session_id };
  },

  async verifyOrder(sessionId: string): Promise<{ creditsAdded: number; balance: number }> {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { session_id: sessionId },
    });
    if (error) throw error;
    return { creditsAdded: data.credits_added, balance: data.balance };
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Order[];
  },
};
