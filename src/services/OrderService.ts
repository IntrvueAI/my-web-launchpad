import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';
import { Order } from '@/models/Order';

export const OrderService = {
  async createOrder(pack: 2 | 3 | 5): Promise<{ checkoutUrl: string; sessionId: string }> {
    const { data, error } = await invokeEdgeFunction<{ url: string; session_id: string }>('create-payment', { body: { pack } });
    if (error) throw error;
    if (!data) throw new Error('No response from create-payment');
    return { checkoutUrl: data.url, sessionId: data.session_id };
  },

  async verifyOrder(sessionId: string): Promise<{ creditsAdded: number; balance: number }> {
    const { data, error } = await invokeEdgeFunction<{ credits_added: number; balance: number }>('verify-payment', {
      body: { session_id: sessionId },
    });
    if (error) throw error;
    if (!data) throw new Error('No response from verify-payment');
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
