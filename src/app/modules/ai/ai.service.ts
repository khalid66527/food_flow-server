import { ObjectId } from 'mongodb';
import { foodCollection, ordersCollection, restaurantCollection, settingsCollection, couponsCollection } from '../../config/db';
import { GeminiPoolService } from './geminiPool.service';
import { GroqService } from './groq.service';
import { AgentRouterService } from './agentRouter.service';
import { IChatMessage, TUserRole, IAiSettings, TAiProvider, IUserLocation, TMood, IPreSuggestedPrompt } from './ai.interface';

interface ChatContextParams {
  userRole: TUserRole | string;
  message: string;
  chatHistory?: IChatMessage[];
  userId?: string;
  userEmail?: string;
  userName?: string;
  cartItems?: any[];
  userLocation?: IUserLocation;
  userMood?: TMood | string;
}

const DEFAULT_AI_SETTINGS: IAiSettings = {
  key: 'ai_configuration',
  activeProvider: 'gemini',
  activeModel: 'gemini-2.5-flash',
  geminiKeys: [],
  groqKeys: [],
  agentRouterKeys: [],
  salesExecutivePrompt: `You are FoodFlow's Lead Food Concierge & Gourmet Sales Executive. FoodFlow is a premier online food delivery platform in Bangladesh.
Your mission: Entice, delight, and guide customers into ordering the best food deliverable to their location!

PERSONALITY & SALES TONE:
- Be warm, extremely polite, and mouthwateringly descriptive (বাংলায় কথা বলুন). Use appetizing sensory words (যেমন: মুচমুচে, গরম গরম, চিজি, ধোঁয়া ওঠা, স্পাইসি, সুগন্ধি বাসমতী চাল, অথেনটিক মসলা).
- Act as a proactive Sales Executive: If customer chooses a main dish, tempt them with a complementary beverage (ঠান্ডা কোক, বোরহানি), side (স্পাইসি উইংস, ফ্রেঞ্চ ফ্রাইজ) or dessert.
- Always be courteous, enthusiastic, and helpful. Keep responses concise (3-5 engaging sentences).

LOCATION CONTEXT ({{USER_LOCATION}}):
- Prioritize dishes from restaurants in the user's detected area/zone.
- Reassure the customer about swift delivery time (সাধারণত ২৫-৪০ মিনিটে খাবার পৌঁছাবে).

MOOD & CRAVINGS ({{USER_MOOD}}):
- Match the user's vibe (ঝাল/স্পাইসি, চিট ডে/বার্গার-পিজ্জা, হেলদি/সালাদ, লেট নাইট বাইটস, বাজেট কম্বো, পার্টি ও আড্ডা).

ORDER & BUDGET CALCULATION:
- Standard delivery fee is ৳৪০. When recommending packages within a budget, always include the ৳৪০ delivery fee calculation clearly.

STRUCTURED RECOMMENDATIONS:
Whenever suggesting food, ALWAYS append the structured food recommendations and checkout action button codeblocks at the very end of your response:
\`\`\`food_recommendations
[{"id":"<food_id>","restaurantId":"<restaurant_id>","name":"<name>","price":<price>,"discountPrice":<discountPrice_or_null>,"restaurantName":"<restaurant_name>","image":"<image_url>","rating":4.8,"isSpicy":<true/false>}]
\`\`\`
\`\`\`action_buttons
[{"type":"CHECKOUT","label":"চেকআউট করুন"}]
\`\`\`
`,
  temperature: 0.6,
  maxOutputTokens: 2048,
  locationAware: true,
  moodPillsEnabled: true,
  preSuggestedPromptsEnabled: true,
  preSuggestedPrompts: [
    { id: '1', label: '🔥 সেরা স্পাইসি খাবার', message: 'আজকের সেরা স্পাইসি ও ঝাল খাবার কী আছে?' },
    { id: '2', label: '💰 ৳৫০০ কম্বো (২ জন)', message: 'আমার বাজেট ৫০০ টাকা, ২ জনের জন্য সেরা কম্বো খাবার সাজিয়ে দাও।' },
    { id: '3', label: '⚡ দ্রুত ডেলিভারি', message: 'আমার এরিয়াতে সবচেয়ে দ্রুত ডেলিভারি কোন খাবারের?' },
    { id: '4', label: '🥗 হেলদি ডায়েট ফুড', message: 'হেলদি ও লো-ক্যালরি ডায়েট ফুড অপশন দেখাও।' },
    { id: '5', label: '🌙 লেট-নাইট স্ন্যাক্স', message: 'রাতে খাওয়ার মতো হালকা ও মজার কিছু সাজেস্ট করো।' },
    { id: '6', label: '🎉 ৪ জনের পার্টি প্ল্যাটার', message: '৪-৫ জনের আড্ডার জন্য একটা পারফেক্ট প্ল্যাটটার সাজিয়ে দাও।' },
  ],
  fallbackEnabled: true,
  updatedAt: new Date().toISOString(),
};

export class AiService {
  private static cachedSettings: IAiSettings | null = null;
  private static cacheExpiry: number = 0;

  /**
   * Fetch current AI settings with in-memory TTL caching (30 seconds)
   */
  public static async getSettings(): Promise<IAiSettings> {
    const now = Date.now();
    if (this.cachedSettings && now < this.cacheExpiry) {
      return this.cachedSettings;
    }

    try {
      let doc = await settingsCollection.findOne({ key: 'ai_configuration' });
      if (!doc) {
        await settingsCollection.insertOne(DEFAULT_AI_SETTINGS);
        doc = await settingsCollection.findOne({ key: 'ai_configuration' });
      }

      const mergedSettings: IAiSettings = {
        key: 'ai_configuration',
        activeProvider: (doc?.activeProvider || DEFAULT_AI_SETTINGS.activeProvider) as TAiProvider,
        activeModel: doc?.activeModel || DEFAULT_AI_SETTINGS.activeModel,
        geminiKeys: Array.isArray(doc?.geminiKeys) ? doc.geminiKeys : [],
        groqKeys: Array.isArray(doc?.groqKeys) ? doc.groqKeys : [],
        agentRouterKeys: Array.isArray(doc?.agentRouterKeys) ? doc.agentRouterKeys : [],
        salesExecutivePrompt: doc?.salesExecutivePrompt || DEFAULT_AI_SETTINGS.salesExecutivePrompt,
        temperature: Number(doc?.temperature ?? DEFAULT_AI_SETTINGS.temperature),
        maxOutputTokens: Number(doc?.maxOutputTokens ?? DEFAULT_AI_SETTINGS.maxOutputTokens),
        locationAware: doc?.locationAware !== false,
        moodPillsEnabled: doc?.moodPillsEnabled !== false,
        preSuggestedPromptsEnabled: doc?.preSuggestedPromptsEnabled !== false,
        preSuggestedPrompts: Array.isArray(doc?.preSuggestedPrompts) ? doc.preSuggestedPrompts : DEFAULT_AI_SETTINGS.preSuggestedPrompts,
        fallbackEnabled: doc?.fallbackEnabled !== false,
        updatedAt: doc?.updatedAt || new Date().toISOString(),
      };

      // Propagate raw keys to services
      const extractRaw = (arr: any[]) =>
        (arr || []).map((item) => (typeof item === 'string' ? item.trim() : item?.key?.trim() || '')).filter(Boolean);

      GeminiPoolService.setDynamicKeys(extractRaw(mergedSettings.geminiKeys));
      GroqService.setDynamicKeys(extractRaw(mergedSettings.groqKeys));
      AgentRouterService.setDynamicKeys(extractRaw(mergedSettings.agentRouterKeys));

      this.cachedSettings = mergedSettings;
      this.cacheExpiry = now + 30000; // 30 sec TTL
      return mergedSettings;
    } catch (err) {
      console.warn('[AiService] Failed to load AI settings from DB:', err);
      return DEFAULT_AI_SETTINGS;
    }
  }

  /**
   * Update AI settings in DB and invalidate cache
   */
  public static async updateSettings(payload: any): Promise<IAiSettings> {
    // 1. Add Key Action with full metrics tracking record
    if (payload.action === 'add_key' && payload.provider && payload.apiKey) {
      const field =
        payload.provider === 'groq'
          ? 'groqKeys'
          : payload.provider === 'agentrouter'
          ? 'agentRouterKeys'
          : 'geminiKeys';

      const cleanKey = String(payload.apiKey).trim();
      if (cleanKey && !cleanKey.includes('...')) {
        const keyDoc = {
          id: Math.random().toString(36).substring(2, 9),
          key: cleanKey,
          usageCount: 0,
          lastUsedAt: null,
          status: 'active',
          addedAt: new Date().toISOString(),
        };

        await settingsCollection.updateOne(
          { key: 'ai_configuration' },
          {
            $push: { [field]: keyDoc as any },
            $set: { updatedAt: new Date().toISOString() },
          },
          { upsert: true }
        );
      }
      this.cachedSettings = null;
      return this.getSettings();
    }

    // 2. Remove Key Action
    if (payload.action === 'remove_key' && payload.provider && typeof payload.index === 'number') {
      const field =
        payload.provider === 'groq'
          ? 'groqKeys'
          : payload.provider === 'agentrouter'
          ? 'agentRouterKeys'
          : 'geminiKeys';

      const doc = await settingsCollection.findOne({ key: 'ai_configuration' });
      const currentList: any[] = Array.isArray(doc?.[field]) ? [...doc[field]] : [];

      if (payload.index >= 0 && payload.index < currentList.length) {
        currentList.splice(payload.index, 1);
        await settingsCollection.updateOne(
          { key: 'ai_configuration' },
          {
            $set: { [field]: currentList, updatedAt: new Date().toISOString() },
          },
          { upsert: true }
        );
      }
      this.cachedSettings = null;
      return this.getSettings();
    }

    // 3. Reset Key Usage Action
    if (payload.action === 'reset_usage' && payload.provider) {
      const field =
        payload.provider === 'groq'
          ? 'groqKeys'
          : payload.provider === 'agentrouter'
          ? 'agentRouterKeys'
          : 'geminiKeys';

      const doc = await settingsCollection.findOne({ key: 'ai_configuration' });
      let currentList: any[] = Array.isArray(doc?.[field]) ? [...doc[field]] : [];

      if (typeof payload.index === 'number' && payload.index >= 0 && payload.index < currentList.length) {
        const item = currentList[payload.index];
        if (typeof item === 'object') {
          currentList[payload.index] = { ...item, usageCount: 0, status: 'active' };
        } else if (typeof item === 'string') {
          currentList[payload.index] = {
            id: `k-${payload.index}`,
            key: item,
            usageCount: 0,
            lastUsedAt: null,
            status: 'active',
            addedAt: new Date().toISOString(),
          };
        }
      } else {
        currentList = currentList.map((item, idx) => {
          if (typeof item === 'object') return { ...item, usageCount: 0, status: 'active' };
          return {
            id: `k-${idx}`,
            key: item,
            usageCount: 0,
            lastUsedAt: null,
            status: 'active',
            addedAt: new Date().toISOString(),
          };
        });
      }

      await settingsCollection.updateOne(
        { key: 'ai_configuration' },
        { $set: { [field]: currentList, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      this.cachedSettings = null;
      return this.getSettings();
    }

    // 4. General Settings Update - NEVER overwrite existing keys with masked values!
    const updateDoc: Partial<IAiSettings> = {
      updatedAt: new Date().toISOString(),
    };

    if (payload.activeProvider) updateDoc.activeProvider = payload.activeProvider;
    if (payload.activeModel) updateDoc.activeModel = payload.activeModel;

    // Only update keys if explicit unmasked keys are provided
    if (payload.action === 'set_keys') {
      if (Array.isArray(payload.geminiKeys)) updateDoc.geminiKeys = payload.geminiKeys.filter((k: any) => k && !String(k).includes('...'));
      if (Array.isArray(payload.groqKeys)) updateDoc.groqKeys = payload.groqKeys.filter((k: any) => k && !String(k).includes('...'));
      if (Array.isArray(payload.agentRouterKeys)) updateDoc.agentRouterKeys = payload.agentRouterKeys.filter((k: any) => k && !String(k).includes('...'));
    }

    if (payload.salesExecutivePrompt !== undefined) updateDoc.salesExecutivePrompt = payload.salesExecutivePrompt;
    if (payload.temperature !== undefined) updateDoc.temperature = Number(payload.temperature);
    if (payload.maxOutputTokens !== undefined) updateDoc.maxOutputTokens = Number(payload.maxOutputTokens);
    if (payload.locationAware !== undefined) updateDoc.locationAware = Boolean(payload.locationAware);
    if (payload.moodPillsEnabled !== undefined) updateDoc.moodPillsEnabled = Boolean(payload.moodPillsEnabled);
    if (payload.preSuggestedPromptsEnabled !== undefined) updateDoc.preSuggestedPromptsEnabled = Boolean(payload.preSuggestedPromptsEnabled);
    if (Array.isArray(payload.preSuggestedPrompts)) updateDoc.preSuggestedPrompts = payload.preSuggestedPrompts;
    if (payload.fallbackEnabled !== undefined) updateDoc.fallbackEnabled = Boolean(payload.fallbackEnabled);

    await settingsCollection.updateOne(
      { key: 'ai_configuration' },
      { $set: updateDoc },
      { upsert: true }
    );

    this.cachedSettings = null; // Invalidate cache
    return this.getSettings();
  }

  /**
   * Return masked settings for safe client display with full per-key metrics (Zero key exposure)
   */
  public static maskKeys(keys: any[]): any[] {
    return (keys || []).map((k, index) => {
      const raw = typeof k === 'string' ? k.trim() : (k?.key?.trim() || '');
      const masked = !raw || raw.length < 8 ? '••••••••' : `${raw.slice(0, 4)}...${raw.slice(-4)}`;
      return {
        id: typeof k === 'object' && k.id ? k.id : `k-${index}`,
        maskedKey: masked,
        usageCount: typeof k === 'object' && typeof k.usageCount === 'number' ? k.usageCount : 0,
        lastUsedAt: typeof k === 'object' ? k.lastUsedAt || null : null,
        status: typeof k === 'object' ? k.status || 'active' : 'active',
        addedAt: typeof k === 'object' ? k.addedAt || null : null,
      };
    });
  }

  /**
   * Live test a key against the requested provider (supports keyIndex lookup from DB)
   */
  public static async testKey(provider: TAiProvider, apiKey?: string, model?: string, keyIndex?: number) {
    let key = apiKey ? String(apiKey).trim() : '';

    if ((!key || key.includes('...')) && typeof keyIndex === 'number') {
      const doc = await settingsCollection.findOne({ key: 'ai_configuration' });
      const field =
        provider === 'groq'
          ? 'groqKeys'
          : provider === 'agentrouter'
          ? 'agentRouterKeys'
          : 'geminiKeys';

      const list: any[] = Array.isArray(doc?.[field]) ? doc[field] : [];
      if (keyIndex >= 0 && keyIndex < list.length) {
        const item = list[keyIndex];
        key = typeof item === 'string' ? item.trim() : (item?.key?.trim() || '');
      }
    }

    if (!key || key.includes('...')) {
      return { success: false, message: 'Valid API key not found' };
    }

    if (provider === 'groq') {
      return GroqService.testKey(key, model || 'openai/gpt-oss-120b');
    }
    if (provider === 'agentrouter') {
      return AgentRouterService.testKey(key);
    }
    return GeminiPoolService.testKey(key, model || 'gemini-2.5-flash');
  }

  /**
   * Extract true image from DB document (supports direct image, images array, base64 data URIs, or web URLs)
   */
  public static getTrueFoodImage(f: any): string {
    if (!f) return '';
    if (typeof f.image === 'string' && f.image.trim()) {
      return f.image.trim();
    }
    if (Array.isArray(f.images) && f.images.length > 0 && typeof f.images[0] === 'string' && f.images[0].trim()) {
      return f.images[0].trim();
    }
    return '';
  }

  /**
   * Fast location & mood-aware food context retrieval
   */
  private static async getLiveFoodContext(
    searchQuery?: string,
    location?: IUserLocation,
    mood?: TMood | string
  ) {
    try {
      const rawZoneIds: string[] = (
        Array.isArray((location as any)?.candidateZoneIds) && (location as any).candidateZoneIds.length > 0
          ? (location as any).candidateZoneIds.map(String)
          : (location as any)?.currentZoneId
          ? [String((location as any).currentZoneId)]
          : []
      ).filter(Boolean);

      const zoneNameStr = (location?.zoneName || '').trim();
      const districtStr = ((location as any)?.district || '').trim();
      const upazilaStr = ((location as any)?.upazila || '').trim();
      const cityStr = (location?.city || '').trim();
      const areaStr = (location?.area || '').trim();

      const hasSpecificLocation = Boolean(
        rawZoneIds.length > 0 ||
        (zoneNameStr && zoneNameStr !== 'All Bangladesh' && zoneNameStr !== 'Bangladesh') ||
        (districtStr && districtStr !== 'All Bangladesh' && districtStr !== 'Bangladesh') ||
        (cityStr && cityStr !== 'All Bangladesh' && cityStr !== 'Bangladesh')
      );

      let restQuery: any = { status: { $ne: 'blocked' } };

      if (rawZoneIds.length > 0) {
        const numericIds = rawZoneIds.map(Number).filter((n) => !isNaN(n));
        const allMatches: (string | number)[] = [...rawZoneIds, ...numericIds];
        restQuery = {
          status: { $ne: 'blocked' },
          $or: [
            { zoneId: { $in: allMatches } },
            { numericZoneId: { $in: allMatches } },
            { zoneIds: { $in: allMatches } },
            { numericZoneIds: { $in: allMatches } },
            { 'address.zoneId': { $in: allMatches } },
            { zoneMongoIdStr: { $in: rawZoneIds } },
          ],
        };
      } else if (hasSpecificLocation) {
        const zoneMatchConditions: any[] = [];
        const textMatchers = [zoneNameStr, upazilaStr, districtStr, areaStr, cityStr]
          .filter((t) => t && t !== 'All Bangladesh' && t !== 'Bangladesh');

        for (const text of textMatchers) {
          const clean = text.replace(/(Hub|Zone|Food Hub)$/i, '').trim();
          if (clean) {
            const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const reg = new RegExp(escaped, 'i');
            zoneMatchConditions.push(
              { 'address.zoneName': reg },
              { 'address.area': reg },
              { 'address.upazila': reg },
              { 'address.district': reg },
              { 'address.city': reg },
              { city: reg }
            );
          }
        }

        if (zoneMatchConditions.length > 0) {
          restQuery = {
            status: { $ne: 'blocked' },
            $or: zoneMatchConditions,
          };
        }
      }

      const restaurants = await restaurantCollection
        .find(restQuery, { projection: { name: 1, restaurantName: 1, zone: 1, address: 1, zoneId: 1 } })
        .limit(30)
        .toArray();

      const restMap: Record<string, string> = {};
      restaurants.forEach((r: any) => {
        restMap[r._id?.toString() || ''] = r.restaurantName || r.name || 'FoodFlow Restaurant';
      });

      const matchingRestaurantIds = restaurants.map((r: any) => r._id?.toString()).filter(Boolean);
      const matchingRestaurantObjectIds = matchingRestaurantIds
        .filter((id: string) => ObjectId.isValid(id))
        .map((id: string) => new ObjectId(id));

      let foodQuery: any = {
        $or: [{ status: 'available' }, { isAvailable: true }, { isAvailable: 'true' }, { status: { $exists: false } }],
      };

      if (hasSpecificLocation) {
        if (matchingRestaurantIds.length > 0) {
          foodQuery.restaurantId = {
            $in: [...matchingRestaurantIds, ...matchingRestaurantObjectIds],
          };
        } else {
          return [];
        }
      }

      const foods = await foodCollection
        .find(foodQuery, {
          projection: {
            name: 1,
            restaurantId: 1,
            restaurantName: 1,
            price: 1,
            discountPrice: 1,
            category: 1,
            image: 1,
            images: 1,
            isSpicy: 1,
            isVegetarian: 1,
          },
        })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();

      if (!foods || foods.length === 0) return [];

      let formatted = foods.map((f: any) => {
        const restId = f.restaurantId?.toString() || '';
        const trueImg = this.getTrueFoodImage(f);
        return {
          id: f._id?.toString(),
          restaurantId: restId,
          name: f.name,
          category: f.category || 'Dishes',
          price: Number(f.price) || 0,
          discountPrice: f.discountPrice ? Number(f.discountPrice) : undefined,
          // In prompt context, avoid 1MB base64 bloat; restored during post-processing
          image: (trueImg.startsWith('data:') || trueImg.length > 250)
            ? 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80'
            : (trueImg || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80'),
          trueImage: trueImg,
          isSpicy: Boolean(f.isSpicy),
          isVegetarian: Boolean(f.isVegetarian),
          restaurantName: f.restaurantName || restMap[restId] || 'FoodFlow Kitchen',
          rating: 4.8,
        };
      });

      // Mood-aware prioritization
      if (mood) {
        const m = String(mood).toLowerCase();
        if (m.includes('spicy') || m.includes('ঝাল')) {
          formatted = [...formatted].sort((a, b) => (b.isSpicy ? 1 : 0) - (a.isSpicy ? 1 : 0));
        } else if (m.includes('healthy') || m.includes('diet') || m.includes('হেলদি')) {
          formatted = [...formatted].sort((a, b) => (b.isVegetarian ? 1 : 0) - (a.isVegetarian ? 1 : 0));
        } else if (m.includes('budget') || m.includes('বাজেট')) {
          formatted = [...formatted].sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        }
      }

      return formatted.slice(0, 18);
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
   * Intelligent local fallback rule engine
   */
  private static generateFallbackReply(message: string, liveFoods: any[], userOrders: any[], location?: IUserLocation, mood?: string): string {
    const q = message.toLowerCase();

    if (q.includes('order') || q.includes('অর্ডার') || q.includes('track') || q.includes('ট্র্যাক')) {
      if (userOrders.length > 0) {
        const ord = userOrders[0];
        return `আপনার অর্ডার #${ord.orderId}-এর বর্তমান স্ট্যাটাস: **${ord.status}**। ডেলিভারি রাইডার: ${ord.riderInfo?.name || 'খোঁজা হচ্ছে'}।\n\n\`\`\`order_status\n${JSON.stringify(ord)}\n\`\`\``;
      }
      return `আপনার কোনো সক্রিয় অর্ডার পাওয়া যায়নি। নতুন কোনো খাবার অর্ডার করলে এখান থেকে লাইভ স্ট্যাটাস দেখতে পারবেন!`;
    }

    if (q.includes('চার্জ') || q.includes('delivery')) {
      return `FoodFlow-তে স্ট্যান্ডার্ড ডেলিভারি চার্জ মাত্র **৳৪০**। সাধারণত ২৫-৪০ মিনিটের মধ্যে গরম খাবার পৌঁছে যায়! 🚀`;
    }

    let matches = [...liveFoods];
    if (q.includes('ঝাল') || q.includes('spicy') || mood === 'spicy') {
      matches = matches.filter(f => f.isSpicy || f.category.toLowerCase().includes('pizza') || f.category.toLowerCase().includes('burger'));
    }
    const recs = (matches.length > 0 ? matches : liveFoods).slice(0, 3);

    const locPrefix = location?.zoneName || location?.area ? `আপনার এলাকা **${location.zoneName || location.area}**-এর জন্য ` : '';

    if (recs.length > 0) {
      const recsWithRealImages = recs.map((f: any) => ({
        ...f,
        image: f.trueImage || f.image,
      }));
      const names = recs.map(f => `${f.name} (৳${f.discountPrice || f.price})`).join(' ও ');
      return `স্বাগতম! ${locPrefix}আমাদের সেরা সুস্বাদু পছন্দের খাবারের মধ্যে রয়েছে **${names}**। কার্টে যোগ করে সহজে অর্ডার করুন!\n\n\`\`\`food_recommendations\n${JSON.stringify(recsWithRealImages, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"চেকআউট করুন"}]\n\`\`\``;
    }

    return `স্বাগতম FoodFlow-তে! আপনার পছন্দের খাবার বা বাজেটের কথা জানান, আমি এখনই সেরা খাবার খুঁজে দিচ্ছি।`;
  }

  /**
   * Post-processes AI replies to inject exact verified images and metadata from MongoDB
   */
  private static enrichRecommendations(reply: string, liveFoods: any[]): string {
    if (!reply || !Array.isArray(liveFoods) || liveFoods.length === 0) return reply;

    const foodMap = new Map<string, any>();
    liveFoods.forEach((f: any) => {
      if (f.id) foodMap.set(String(f.id), f);
      if (f.name) foodMap.set(String(f.name).toLowerCase().trim(), f);
    });

    let enriched = reply.replace(
      /```(?:food_recommendations|json:foods|json)?\s*(\[[\s\S]*?\])\s*```?/gi,
      (fullMatch, jsonStr) => {
        try {
          const list = JSON.parse(jsonStr);
          if (Array.isArray(list)) {
            const enrichedList = list.map((item: any) => {
              const doc = (item.id && foodMap.get(String(item.id))) ||
                (item.name && foodMap.get(String(item.name).toLowerCase().trim()));
              if (doc) {
                return {
                  ...item,
                  id: doc.id || item.id,
                  name: doc.name || item.name,
                  restaurantId: doc.restaurantId || item.restaurantId,
                  restaurantName: doc.restaurantName || item.restaurantName,
                  price: Number(doc.price) || item.price,
                  discountPrice: doc.discountPrice ? Number(doc.discountPrice) : item.discountPrice,
                  image: doc.trueImage || doc.image || item.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
                  rating: doc.rating ? Number(doc.rating) : item.rating || 4.8,
                  isSpicy: Boolean(doc.isSpicy ?? item.isSpicy),
                  isVegetarian: Boolean(doc.isVegetarian ?? item.isVegetarian),
                };
              }
              return item;
            });
            return '```food_recommendations\n' + JSON.stringify(enrichedList, null, 2) + '\n```';
          }
        } catch {
          // ignore
        }
        return fullMatch;
      }
    );

    // Also enrich cart_action block if present
    enriched = enriched.replace(
      /```(?:cart_action|json:cart)?\s*(\{\s*[\s\S]*?"(?:ADD_TO_CART|type)"[\s\S]*?\}\s*)\s*```?/gi,
      (fullMatch, jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && parsed.food) {
            const doc = (parsed.food.id && foodMap.get(String(parsed.food.id))) ||
              (parsed.food.name && foodMap.get(String(parsed.food.name).toLowerCase().trim()));
            if (doc) {
              parsed.food.id = doc.id || parsed.food.id;
              parsed.food.name = doc.name || parsed.food.name;
              parsed.food.restaurantId = doc.restaurantId || parsed.food.restaurantId;
              parsed.food.restaurantName = doc.restaurantName || parsed.food.restaurantName;
              parsed.food.price = Number(doc.price) || parsed.food.price;
              parsed.food.discountPrice = doc.discountPrice ? Number(doc.discountPrice) : parsed.food.discountPrice;
              parsed.food.image = doc.trueImage || doc.image || parsed.food.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80';
            }
            return '```cart_action\n' + JSON.stringify(parsed, null, 2) + '\n```';
          }
        } catch {}
        return fullMatch;
      }
    );

    return enriched;
  }

  /**
   * Process chat request across Groq, Agent Router, or Gemini with automatic cascading failover
   */
  public static async processChat(params: ChatContextParams) {
    const { userRole, message, chatHistory = [], userId, userEmail, cartItems = [], userLocation, userMood } = params;

    const [settings, liveFoods, userOrders] = await Promise.all([
      this.getSettings(),
      this.getLiveFoodContext(message, userLocation, userMood),
      this.getUserOrdersContext(userId, userEmail),
    ]);

    // Detect Add-To-Cart Intent
    const lowerMsg = message.toLowerCase();
    const isCartAddIntent =
      /(?:cart|কার্ট|ঝুড়ি|কিনব|কিনতে|নেব|অর্ডার|order|যোগ|add)/i.test(lowerMsg) &&
      /(?:add|যোগ|করো|দিন|দাও|কর|রাখো|ঢুকাও|ইনক্লুড|include|চাই|করুন|দিব|নেব|প্যাক)/i.test(lowerMsg);

    let detectedCartItem: any = null;
    if (isCartAddIntent && liveFoods.length > 0) {
      for (const f of liveFoods) {
        const cleanFoodName = f.name.toLowerCase().trim();
        if (
          lowerMsg.includes(cleanFoodName) ||
          cleanFoodName.split(/\s+/).some((part: string) => part.length >= 4 && lowerMsg.includes(part))
        ) {
          detectedCartItem = {
            id: f.id,
            name: f.name,
            price: Number(f.price) || 0,
            discountPrice: f.discountPrice ? Number(f.discountPrice) : undefined,
            restaurantId: f.restaurantId,
            restaurantName: f.restaurantName,
            image: f.trueImage || f.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
            category: f.category || 'Dishes',
            isSpicy: Boolean(f.isSpicy),
            isVegetarian: Boolean(f.isVegetarian),
            quantity: 1,
          };
          break;
        }
      }
    }

    // Build Sales Executive System Instruction
    const locationStr = userLocation?.zoneName || userLocation?.area || userLocation?.city || 'ঢাকা';
    const moodStr = userMood || 'সাধারণ ক্ষুধা';

    let customPrompt = settings.salesExecutivePrompt || DEFAULT_AI_SETTINGS.salesExecutivePrompt;
    customPrompt = customPrompt
      .replace(/{{USER_LOCATION}}/g, locationStr)
      .replace(/{{USER_MOOD}}/g, String(moodStr))
      .replace(/{{LIVE_FOODS}}/g, JSON.stringify(liveFoods.map(({ trueImage, ...rest }: any) => rest)))
      .replace(/{{USER_CART}}/g, JSON.stringify(cartItems))
      .replace(/{{ACTIVE_COUPONS}}/g, 'WELCOME20, CRAVE30');

    const geofenceRules = `
CRITICAL ZONE GEOFENCING & DISH AVAILABILITY RULES (MANDATORY):
1. CUSTOMER'S ACTIVE LOCATION: ${locationStr}.
2. DELIVERABLE FOODS: You are strictly and ONLY allowed to suggest and recommend dishes that appear in the Live Foods Available list below (these are the ONLY items deliverable to ${locationStr}).
   - Absolutely NEVER invent or recommend dishes from other cities, other zones, or restaurants not present in Live Foods Available.
   - Every recommended dish MUST be from Live Foods Available with its exact name, restaurant, and price.
3. IF LIVE FOODS IS EMPTY (${liveFoods.length === 0 ? "CURRENT STATUS: EMPTY / 0 DISHES" : "CURRENT STATUS: HAS DISHES"}):
   - Clearly and politely explain in Bengali:
     "দুঃখিত! আপনার এলাকা (${locationStr})-তে আমাদের ফুড ডেলিভারি সার্ভিস এখনো সক্রিয় হয়নি বা এই মুহূর্তে কোনো অনুমোদিত রেস্টুরেন্ট খোলা নেই।"
   - Advise the customer to choose another nearby delivery area from the top location selector.
   - NEVER output any \`\`\`food_recommendations\`\`\` codeblock when Live Foods is empty.
4. IF THE CUSTOMER ASKS FOR A FOOD NOT IN LIVE FOODS (e.g. they ask for Burger, Biryani, Coffee, etc., but that specific category/food is not in Live Foods):
   - First, politely acknowledge and inform them:
     "দুঃখিত, আপনার বর্তমান লোকেশন (${locationStr})-তে এই মুহূর্তে কাঙ্ক্ষিত খাবারটি পাওয়া যাচ্ছে না।"
   - Then, act as a passionate, friendly gourmet concierge and convince them to try the best dishes that ARE currently available from the active restaurants in their area:
     "তবে আপনার এরিয়ার [Restaurant Name] থেকে গরম গরম [Food Name] (৳[Price]) এখনই অর্ডার করতে পারেন!"
   - ONLY include the truly available dishes in the \`\`\`food_recommendations\`\`\` codeblock.

CART ACTION INSTRUCTIONS:
If the customer explicitly asks to add a specific food item to their cart (e.g., "cart e dao", "cart a add koro", "কার্টে যোগ করো", "add to cart", etc.):
1. Confirm warmly in your Bengali response that the item has been added to their cart.
2. In addition to any food recommendations, append a \`\`\`cart_action\`\`\` codeblock:
\`\`\`cart_action
{
  "type": "ADD_TO_CART",
  "food": {
    "id": "<food_id>",
    "name": "<exact_food_name>",
    "price": <price>,
    "discountPrice": <discountPrice_or_null>,
    "restaurantId": "<restaurant_id>",
    "restaurantName": "<restaurant_name>",
    "image": "<image_url>",
    "quantity": 1
  }
}
\`\`\`
`;

    const fullSystemInstruction = `
${customPrompt}

${geofenceRules}

CONTEXT INFORMATION:
- Detected User Location: ${locationStr}
- User Mood/Vibe: ${moodStr}
- Live Foods Available: ${JSON.stringify(liveFoods.map(({ trueImage, ...rest }: any) => rest))}
- User Live Cart: ${JSON.stringify(cartItems)}
- User Recent Orders: ${JSON.stringify(userOrders)}

CRITICAL: Always output any dish recommendations strictly inside a single \`\`\`food_recommendations ... \`\`\` block containing a valid JSON array of objects with keys: id, restaurantId, name, price, discountPrice, restaurantName, image, rating, isSpicy.
`;

    // Prepare unified messages for OpenAI/Groq/AgentRouter format
    const allMessages: any[] = [];
    const trimmedHistory = chatHistory.slice(-4);
    trimmedHistory.forEach((item) => {
      const role = item.role === 'user' ? 'user' : 'assistant';
      const text = item.parts?.[0]?.text || item.content || '';
      if (text) allMessages.push({ role, content: text });
    });
    allMessages.push({ role: 'user', content: message });

    // Prepare contents for Gemini format
    const geminiContents: any[] = [];
    trimmedHistory.forEach((item) => {
      const role = item.role === 'user' ? 'user' : 'model';
      const text = item.parts?.[0]?.text || item.content || '';
      if (text) geminiContents.push({ role, parts: [{ text }] });
    });
    geminiContents.push({ role: 'user', parts: [{ text: message }] });

    const finalizeReply = (rawReply: string, provider: string, model: string) => {
      let reply = this.enrichRecommendations(rawReply, liveFoods);
      const cartBlockRegex = /```(?:cart_action|json:cart)?\s*(\{\s*[\s\S]*?"(?:ADD_TO_CART|type)"[\s\S]*?\}\s*)\s*```?/i;
      let finalCartAction: any = null;
      const cartMatch = reply.match(cartBlockRegex);
      if (cartMatch) {
        try {
          finalCartAction = JSON.parse(cartMatch[1].trim());
        } catch {}
      } else if (detectedCartItem) {
        finalCartAction = {
          type: 'ADD_TO_CART',
          action: 'ADD_TO_CART',
          food: detectedCartItem,
        };
        reply = `${reply}\n\n\`\`\`cart_action\n${JSON.stringify(finalCartAction, null, 2)}\n\`\`\``;
      }

      return {
        reply,
        provider,
        model,
        cartAction: finalCartAction,
      };
    };

    // Cascade order starting with activeProvider
    const candidateProviders: TAiProvider[] = [
      settings.activeProvider,
      settings.activeProvider === 'groq' ? 'agentrouter' : 'groq',
      'gemini',
    ];
    const providerSequence: TAiProvider[] = Array.from(new Set(candidateProviders));

    for (const provider of providerSequence) {
      try {
        if (provider === 'groq') {
          const rawReply = await GroqService.generateContent({
            messages: allMessages,
            systemPrompt: fullSystemInstruction,
            model: settings.activeModel.includes('qwen') || settings.activeModel.includes('llama') || settings.activeModel.includes('gpt-oss')
              ? settings.activeModel
              : 'qwen/qwen3.8-27b',
            temperature: settings.temperature,
            maxTokens: settings.maxOutputTokens,
          });
          if (rawReply) {
            return finalizeReply(rawReply, 'groq', settings.activeModel);
          }
        } else if (provider === 'agentrouter') {
          const rawReply = await AgentRouterService.generateContent({
            messages: allMessages,
            systemPrompt: fullSystemInstruction,
            temperature: settings.temperature,
            maxTokens: settings.maxOutputTokens,
          });
          if (rawReply) {
            return finalizeReply(rawReply, 'agentrouter', 'deepseek-v4-flash');
          }
        } else if (provider === 'gemini') {
          const rawReply = await GeminiPoolService.generateContentWithFailover({
            contents: geminiContents,
            systemInstruction: fullSystemInstruction,
            model: settings.activeModel.startsWith('gemini') ? settings.activeModel : 'gemini-2.5-flash',
            temperature: settings.temperature,
            maxOutputTokens: settings.maxOutputTokens,
          });
          if (rawReply) {
            return finalizeReply(rawReply, 'gemini', settings.activeModel);
          }
        }
      } catch (err: any) {
        console.warn(`[AiService] Provider ${provider} failed, falling over:`, err?.message || err);
      }
    }

    // If all providers fail, use intelligent local fallback
    console.warn('[AiService] All AI providers failed. Using intelligent local fallback.');
    const fallbackReply = this.generateFallbackReply(message, liveFoods, userOrders, userLocation, userMood);
    return finalizeReply(fallbackReply, 'fallback', 'local-rule-engine');
  }
}
