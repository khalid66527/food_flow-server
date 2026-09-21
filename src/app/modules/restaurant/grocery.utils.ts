export interface IParsedIngredient {
  raw: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  dishes: string[];
}

export interface IAisleGroup {
  category: string;
  aisleName: string;
  icon: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    displayQuantity: string;
    unit: string;
    dishes: string[];
    estimatedUnitCost?: number;
    isChecked?: boolean;
  }>;
}

/**
 * Standard Supermarket Aisle Categories
 */
export const GROCERY_AISLES = [
  { id: 'produce', name: 'Produce (Vegetables & Fresh Herbs)', icon: '🥦' },
  { id: 'meat', name: 'Meat & Poultry', icon: '🍗' },
  { id: 'seafood', name: 'Fish & Seafood', icon: '🐟' },
  { id: 'dairy', name: 'Dairy, Eggs & Chilled', icon: '🧀' },
  { id: 'grains', name: 'Grains, Rice, Flour & Pulses', icon: '🌾' },
  { id: 'spices', name: 'Spices, Herbs & Seasonings', icon: '🧂' },
  { id: 'oils', name: 'Oils, Sauces & Condiments', icon: '🍶' },
  { id: 'bakery', name: 'Bakery & Baking Supplies', icon: '🍞' },
  { id: 'beverages', name: 'Beverages, Sweeteners & Syrups', icon: '☕' },
  { id: 'packaging', name: 'Packaging & Kitchen Supplies', icon: '📦' },
  { id: 'pantry', name: 'General Pantry Staples', icon: '🥫' },
];

/**
 * Classify an ingredient into a supermarket aisle category based on keywords
 */
export const classifyIngredient = (ingredientName: string): string => {
  const lower = ingredientName.toLowerCase().trim();

  // Meat & Poultry
  if (
    /\b(chicken|beef|mutton|lamb|goat|duck|turkey|veal|kheema|mince|sausage|bacon|pork|meat|wings|drumstick|thigh|breast)\b/i.test(
      lower
    )
  ) {
    return 'Meat & Poultry';
  }

  // Seafood
  if (
    /\b(fish|salmon|tuna|prawn|prawns|shrimp|shrimps|crab|squid|lobster|rohu|rui|katla|hilsa|ilish|tilapia|bhetki|pomfret|calamari|seafood)\b/i.test(
      lower
    )
  ) {
    return 'Fish & Seafood';
  }

  // Dairy & Eggs
  if (
    /\b(milk|yogurt|curd|dahi|ghee|butter|paneer|cheese|mozzarella|cheddar|cream|heavy cream|sour cream|egg|eggs|dim|condensed milk|whipping cream|mayo)\b/i.test(
      lower
    )
  ) {
    return 'Dairy, Eggs & Chilled';
  }

  // Produce (Fresh Vegetables, Fruits, Aromatics, Herbs)
  if (
    /\b(onion|onions|pyaj|tomato|tomatoes|potato|potatoes|alu|garlic|lasun|ginger|ada|coriander|dhaniya|mint|pudina|chili|chillies|chilli|morich|lemon|lime|capsicum|bell pepper|carrot|cabbage|cauliflower|cucumber|spinach|palak|mushroom|mushrooms|lettuce|herb|vegetable|vegetables|peas|green peas|eggplant|brinjal|begun|zucchini|broccoli|radish|okra|bhindi|curry leaves|lemongrass|spring onion|scallion|banana|apple|mango|orange)\b/i.test(
      lower
    )
  ) {
    return 'Produce (Vegetables & Fresh Herbs)';
  }

  // Grains, Rice, Flour & Pulses
  if (
    /\b(rice|basmati|polao|chinigura|kalijeera|dal|daal|lentil|lentils|chickpeas|chana|gram|flour|atta|maida|semolina|suji|cornstarch|corn flour|noodle|noodles|pasta|spaghetti|macaroni|oats|breadcrumbs|besan|vermicelli|shemai|quinoa)\b/i.test(
      lower
    )
  ) {
    return 'Grains, Rice, Flour & Pulses';
  }

  // Spices, Herbs & Seasonings
  if (
    /\b(salt|pepper|black pepper|turmeric|haldi|chili powder|mirch|garam masala|masala|cumin|jeera|coriander powder|cardamom|elaichi|cinnamon|dalchini|clove|cloves|laung|bay leaf|bay leaves|tej pata|mustard seed|fenugreek|methi|kasuri methi|saffron|kesar|zafran|paprika|oregano|rosemary|thyme|nutmeg|jaiphal|mace|javitri|star anise|chaat masala|biryani masala|tandoori masala|allspice|cajun|cumin seeds|fennel|saunf)\b/i.test(
      lower
    )
  ) {
    return 'Spices, Herbs & Seasonings';
  }

  // Oils, Sauces & Condiments
  if (
    /\b(oil|mustard oil|soybean oil|olive oil|vegetable oil|sunflower oil|sesame oil|canola oil|soy sauce|soya sauce|vinegar|ketchup|tomato paste|tomato puree|chili sauce|hot sauce|mayonnaise|mustard paste|kasundi|fish sauce|oyster sauce|bbq sauce|sweet chili|tahini|honey)\b/i.test(
      lower
    )
  ) {
    return 'Oils, Sauces & Condiments';
  }

  // Bakery & Baking
  if (
    /\b(bread|bun|buns|burger bun|naan|roti|paratha|tortilla|pita|yeast|baking powder|baking soda|vanilla|vanilla extract|cocoa|cocoa powder|chocolate|dough)\b/i.test(
      lower
    )
  ) {
    return 'Bakery & Baking Supplies';
  }

  // Beverages & Sweeteners
  if (
    /\b(sugar|brown sugar|jaggery|gur|tea|chai|green tea|coffee|espresso|syrup|caramel|juice|soda|club soda|sparkling water|tonic|drink mix)\b/i.test(
      lower
    )
  ) {
    return 'Beverages, Sweeteners & Syrups';
  }

  // Packaging & Disposables
  if (
    /\b(box|container|foil|aluminum foil|cling film|paper bag|plastic bag|napkin|tissue|spoon|fork|knife|straw|cup|bowl|takeaway|disposable)\b/i.test(
      lower
    )
  ) {
    return 'Packaging & Kitchen Supplies';
  }

  return 'General Pantry Staples';
};

/**
 * Parse an ingredient string into numeric quantity, standard unit, and clean name
 * Example: "500g Basmati Rice" -> { quantity: 500, unit: "g", name: "Basmati Rice" }
 */
export const parseIngredientString = (rawIng: string): { quantity: number; unit: string; name: string } => {
  if (!rawIng || typeof rawIng !== 'string') {
    return { quantity: 1, unit: 'unit', name: 'Unknown Ingredient' };
  }

  const cleaned = rawIng.trim();

  // Pattern 1: Leading quantity & unit (e.g., "500g Basmati Rice", "1.5 kg Chicken", "2 tbsp Oil", "3 pcs Eggs")
  const leadingMatch = cleaned.match(/^([\d./]+)\s*([a-zA-Z]+)?\s*[:\-–]?\s*(.*)$/);
  if (leadingMatch) {
    const rawVal = leadingMatch[1];
    let qty = 1;
    if (rawVal.includes('/')) {
      const parts = rawVal.split('/');
      if (parts.length === 2 && parseFloat(parts[1]) !== 0) {
        qty = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    } else {
      qty = parseFloat(rawVal) || 1;
    }

    const unitCandidate = (leadingMatch[2] || '').toLowerCase();
    const restName = (leadingMatch[3] || '').trim();

    const recognizedUnits = ['g', 'gm', 'gram', 'grams', 'kg', 'kgs', 'kilo', 'kilogram', 'kilograms', 'ml', 'l', 'ltr', 'liter', 'liters', 'litre', 'litres', 'tbsp', 'tsp', 'cup', 'cups', 'pinch', 'pinches', 'pcs', 'pc', 'piece', 'pieces', 'pkt', 'packet', 'packets', 'pack', 'packs', 'clove', 'cloves', 'slice', 'slices', 'can', 'cans', 'bottle', 'bottles', 'tbsp.', 'tsp.', 'bunch', 'bunches'];

    if (recognizedUnits.includes(unitCandidate)) {
      const standardUnit = normalizeUnit(unitCandidate);
      const name = restName || cleaned;
      return { quantity: qty, unit: standardUnit, name: cleanIngredientName(name) };
    }

    // If unit candidate is part of the ingredient name (e.g. "2 Onions")
    if (restName) {
      const combinedName = `${leadingMatch[2]} ${restName}`.trim();
      return { quantity: qty, unit: 'pcs', name: cleanIngredientName(combinedName) };
    }

    if (unitCandidate) {
      return { quantity: qty, unit: 'pcs', name: cleanIngredientName(unitCandidate) };
    }
  }

  // Pattern 2: Trailing parentheses quantity (e.g., "Basmati Rice (500g)", "Chicken (1.5 kg)")
  const parenMatch = cleaned.match(/^(.*?)\s*\((\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\)$/);
  if (parenMatch) {
    const name = cleanIngredientName(parenMatch[1]);
    const qty = parseFloat(parenMatch[2]) || 1;
    const unitCandidate = (parenMatch[3] || 'pcs').toLowerCase();
    return { quantity: qty, unit: normalizeUnit(unitCandidate), name };
  }

  // Fallback: No explicit numeric quantity found
  return {
    quantity: 1,
    unit: 'portion',
    name: cleanIngredientName(cleaned),
  };
};

/**
 * Normalize units to standard representation
 */
export const normalizeUnit = (unitStr: string): string => {
  const u = (unitStr || '').toLowerCase().replace(/[.]+$/, '').trim();
  if (['g', 'gm', 'gram', 'grams'].includes(u)) return 'g';
  if (['kg', 'kgs', 'kilo', 'kilogram', 'kilograms'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'millilitre'].includes(u)) return 'ml';
  if (['l', 'ltr', 'liter', 'liters', 'litre', 'litres'].includes(u)) return 'L';
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(u)) return 'tbsp';
  if (['tsp', 'teaspoon', 'teaspoons'].includes(u)) return 'tsp';
  if (['cup', 'cups'].includes(u)) return 'cup';
  if (['pinch', 'pinches'].includes(u)) return 'pinch';
  if (['pcs', 'pc', 'piece', 'pieces'].includes(u)) return 'pcs';
  if (['pkt', 'packet', 'packets', 'pack', 'packs'].includes(u)) return 'pkt';
  if (['clove', 'cloves'].includes(u)) return 'cloves';
  if (['slice', 'slices'].includes(u)) return 'slices';
  if (['can', 'cans'].includes(u)) return 'can';
  if (['bunch', 'bunches'].includes(u)) return 'bunch';
  return u || 'pcs';
};

/**
 * Clean and capitalize ingredient names nicely
 */
export const cleanIngredientName = (name: string): string => {
  return name
    .replace(/^[-–,;:]+/, '')
    .replace(/[-–,;:]+$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Format quantity into readable display (e.g., 2500g -> 2.5 kg, 1500ml -> 1.5 L)
 */
export const formatDisplayQuantity = (quantity: number, unit: string): string => {
  const rounded = Math.round(quantity * 100) / 100;

  if (unit === 'g' && rounded >= 1000) {
    const inKg = Math.round((rounded / 1000) * 100) / 100;
    return `${inKg} kg`;
  }

  if (unit === 'ml' && rounded >= 1000) {
    const inL = Math.round((rounded / 1000) * 100) / 100;
    return `${inL} L`;
  }

  if (unit === 'portion' || unit === 'unit') {
    return `${rounded} ${unit}${rounded > 1 ? 's' : ''}`;
  }

  return `${rounded} ${unit}`;
};
