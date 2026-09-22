import { foodCollection, ordersCollection, restaurantCollection, couponsCollection } from '../../config/db';
import { GeminiPoolService } from './geminiPool.service';
import { IChatMessage, TUserRole } from './ai.interface';

interface ChatContextParams {
  userRole: TUserRole | string;
  message: string;
  chatHistory?: IChatMessage[];
  userId?: string;
  userEmail?: string;
  cartItems?: any[];
}

export class AiService {
  /**
   * Fast, lightweight food context retrieval with field projection & restaurant lookup
   */
  private static async getLiveFoodContext(searchQuery?: string) {
    try {
      const query: any = {
        $or: [{ status: 'available' }, { isAvailable: true }, { isAvailable: 'true' }, { status: { $exists: false } }],
      };

      const [foods, restaurants] = await Promise.all([
        foodCollection
          .find(query, {
            projection: {
              name: 1,
              restaurantId: 1,
              restaurantName: 1,
              price: 1,
              discountPrice: 1,
              category: 1,
              image: 1,
              isSpicy: 1,
              isVegetarian: 1,
            },
          })
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray(),
        restaurantCollection
          .find({ status: { $ne: 'blocked' } }, { projection: { name: 1 } })
          .limit(15)
          .toArray(),
      ]);

      const restMap: Record<string, string> = {};
      restaurants.forEach((r: any) => {
        restMap[r._id?.toString() || ''] = r.name;
      });

      if (!foods || foods.length === 0) return [];

      return foods.map((f: any) => {
        const restId = f.restaurantId?.toString() || '';
        return {
          id: f._id?.toString(),
          restaurantId: restId,
          name: f.name,
          category: f.category || 'Dishes',
          price: Number(f.price) || 0,
          discountPrice: f.discountPrice ? Number(f.discountPrice) : undefined,
          image: f.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
          isSpicy: Boolean(f.isSpicy),
          isVegetarian: Boolean(f.isVegetarian),
          restaurantName: f.restaurantName || restMap[restId] || 'FoodFlow Kitchen',
          rating: 4.8,
        };
      });
    } catch (error) {
      console.warn('[AiService] DB food context query error:', error);
      return [];
    }
  }

  /**
   * Fast order context retrieval
   */
  private static async getUserOrdersContext(userId?: string, userEmail?: string) {
    if (!userId && !userEmail) return [];

    try {
      const queryConditions: any[] = [];
      if (userId) queryConditions.push({ userId });
      if (userEmail) queryConditions.push({ userEmail });

      const orders = await ordersCollection
        .find(
          { $or: queryConditions },
          {
            projection: {
              orderId: 1,
              orderStatus: 1,
              paymentStatus: 1,
              totalAmount: 1,
              deliveryFee: 1,
              items: 1,
              riderInfo: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      return orders.map((o: any) => ({
        orderId: o.orderId || o._id?.toString(),
        status: o.orderStatus || 'Placed',
        totalAmount: o.totalAmount,
        deliveryFee: o.deliveryFee || 40,
        items: (o.items || []).map((it: any) => ({
          name: it.name || it.foodItem?.name,
          quantity: it.quantity,
          price: it.price,
        })),
        riderInfo: o.riderInfo
          ? {
              name: o.riderInfo.name,
              phone: o.riderInfo.phone,
            }
          : null,
      }));
    } catch (error) {
      console.warn('[AiService] DB order context query error:', error);
      return [];
    }
  }

  /**
   * Fallback rule engine if API calls fail
   */
  private static generateFallbackReply(message: string, liveFoods: any[], userOrders: any[]): string {
    const q = message.toLowerCase();
    
    if (q.includes('order') || q.includes('অর্ডার') || q.includes('track') || q.includes('ট্র্যাক')) {
      if (userOrders.length > 0) {
        const ord = userOrders[0];
        return `আপনার অর্ডার #${ord.orderId}-এর স্ট্যাটাস: **${ord.status}**। ডেলিভারি রাইডার: ${ord.riderInfo?.name || 'খোঁজা হচ্ছে'}।\n\n\`\`\`order_status\n${JSON.stringify(ord)}\n\`\`\``;
      }
      return `আপনার কোনো সক্রিয় অর্ডার পাওয়া যায়নি। নতুন খাবার অর্ডার করলে এখানে লাইভ স্ট্যাটাস দেখতে পারবেন!`;
    }

    if (q.includes('চার্জ') || q.includes('delivery')) {
      return `FoodFlow-তে স্ট্যান্ডার্ড ডেলিভারি চার্জ মাত্র **৳৪০**। সাধারণত ২৫-৪০ মিনিটের মধ্যে ডেলিভারি সম্পন্ন হয়।`;
    }

    let matches = [...liveFoods];
    if (q.includes('ঝাল') || q.includes('spicy')) {
      matches = matches.filter(f => f.isSpicy || f.category.toLowerCase().includes('pizza') || f.category.toLowerCase().includes('burger'));
    }
    const recs = (matches.length > 0 ? matches : liveFoods).slice(0, 3);

    if (recs.length > 0) {
      const names = recs.map(f => `${f.name} (৳${f.discountPrice || f.price})`).join(' ও ');
      return `আপনার জন্য দারুণ কিছু খাবার অপশন হলো **${names}**। সরাসরি কার্টে যোগ করে সহজে অর্ডার করুন!\n\n\`\`\`food_recommendations\n${JSON.stringify(recs, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"চেকআউট করুন"}]\n\`\`\``;
    }

    return `স্বাগতম FoodFlow-তে! আপনার পছন্দের খাবার বা বাজেটের কথা জানান, আমি সেরা খাবার খুঁজে দিচ্ছি।`;
  }

  public static async processChat(params: ChatContextParams) {
    const { userRole, message, chatHistory = [], userId, userEmail, cartItems = [] } = params;

    // Fast parallel DB query
    const [liveFoods, userOrders] = await Promise.all([
      this.getLiveFoodContext(message),
      this.getUserOrdersContext(userId, userEmail),
    ]);

    // System instruction with comprehensive FoodFlow context
    const systemInstruction = `
You are FoodFlow AI, an ultra-smart, helpful food recommendation & customer support assistant for FoodFlow.

PLATFORM INFO:
- FoodFlow is a premier food delivery platform in Bangladesh.
- Standard delivery fee is ৳40. Fast delivery in 25-40 minutes.
- Support payment methods: Stripe (cards), Cash on Delivery (COD), Mobile Banking.
- For all questions regarding FoodFlow features, restaurant partner joining, rider joining, menu recommendations, budget packages, replies should be polite, accurate, and concise (2-4 sentences) in Bengali (বাংলা) by default.

RECOMMENDATIONS:
- When user asks for food suggestions or mentions budget/taste (e.g., ৳500 budget, 2 people, spicy):
  Suggest 2-3 matching dishes from LIVE FOODS. Calculate total + ৳40 delivery charge.
  Always append this structured JSON block at the very end:
\`\`\`food_recommendations
[{"id":"<id>","restaurantId":"<restaurantId>","name":"<name>","price":<price>,"discountPrice":<discountPrice_or_null>,"restaurantName":"<restaurantName>","image":"<image_url>","rating":4.8,"isSpicy":<true/false>}]
\`\`\`

\`\`\`action_buttons
[{"type":"CHECKOUT","label":"চেকআউট করুন"}]
\`\`\`

LIVE FOODS: ${JSON.stringify(liveFoods)}
USER ORDERS: ${JSON.stringify(userOrders)}
USER CART: ${JSON.stringify(cartItems)}
`;

    const trimmedHistory = chatHistory.slice(-4).map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || m.message || '' }],
    }));

    const contents = [...trimmedHistory, { role: 'user', parts: [{ text: message.trim() }] }];

    try {
      const replyText = await GeminiPoolService.generateContentWithFailover({
        contents,
        systemInstruction,
        temperature: 0.6,
        maxOutputTokens: 800,
      });

      return {
        reply: replyText,
      };
    } catch (err) {
      console.warn('[AiService] Gemini failed, using fallback:', err);
      const fallback = this.generateFallbackReply(message, liveFoods, userOrders);
      return {
        reply: fallback,
      };
    }
  }
}

