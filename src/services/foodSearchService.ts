import { INDIAN_KERALA_FOODS, IndianKeralaFood } from '../data/indianKeralaFoods';
import { FoodItem } from '../types/wellness';

export type FoodSourceType = 'kerala_indian' | 'open_food_facts' | 'saved_template';

export interface FoodSearchResultItem {
  id: string;
  name: string;
  regionalName?: string;
  sourceType: FoodSourceType;
  brandOrCategory?: string;
  baseServing: string;
  baseWeightGrams: number;
  servingUnit: 'piece' | 'cup' | 'serving' | 'g';
  caloriesPerBase: number;
  proteinPerBase: number;
  carbsPerBase: number;
  fatsPerBase: number;
  isEstimate: boolean;
  notes?: string;
  thumbnailUrl?: string;
}

export interface PortionCalculation {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingDescription: string;
}

/**
 * Calculates dynamic nutritional macros when quantity or unit is adjusted.
 */
export function calculateNutritionForPortion(
  item: FoodSearchResultItem,
  quantity: number,
  unit: 'servings_or_pieces' | 'grams'
): PortionCalculation {
  const safeQty = Math.max(0, quantity || 0);

  let multiplier = 1;
  let servingDescription = item.baseServing;

  if (unit === 'grams') {
    // Pro-rate based on item's baseWeightGrams (or 100g if unspecified)
    const baseWeight = item.baseWeightGrams > 0 ? item.baseWeightGrams : 100;
    multiplier = safeQty / baseWeight;
    servingDescription = `${Math.round(safeQty)}g`;
  } else {
    // Multiplier is straight quantity
    multiplier = safeQty;
    const unitLabel = item.servingUnit === 'piece'
      ? (safeQty === 1 ? 'piece' : 'pieces')
      : (item.servingUnit === 'cup' ? (safeQty === 1 ? 'cup' : 'cups') : 'serving');
    servingDescription = `${safeQty} ${unitLabel} (${Math.round(safeQty * item.baseWeightGrams)}g approx.)`;
  }

  return {
    calories: Math.round(item.caloriesPerBase * multiplier),
    protein: Math.round(item.proteinPerBase * multiplier * 10) / 10,
    carbs: Math.round(item.carbsPerBase * multiplier * 10) / 10,
    fats: Math.round(item.fatsPerBase * multiplier * 10) / 10,
    servingDescription,
  };
}

/**
 * Searches the local Indian & Kerala food database.
 * Completely offline, instant, zero latency.
 */
export function searchLocalKeralaIndianFoods(query: string): FoodSearchResultItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    // Return curated recommendations if query is empty
    return INDIAN_KERALA_FOODS.map(mapKeralaItemToSearchResult);
  }

  const terms = trimmed.split(/\s+/).filter(Boolean);

  const matched = INDIAN_KERALA_FOODS.filter((food) => {
    const searchable = `${food.name} ${food.regionalName || ''} ${food.category} ${food.notes}`.toLowerCase();
    return terms.every((t) => searchable.includes(t));
  });

  return matched.map(mapKeralaItemToSearchResult);
}

function mapKeralaItemToSearchResult(food: IndianKeralaFood): FoodSearchResultItem {
  return {
    id: food.id,
    name: food.name,
    regionalName: food.regionalName,
    sourceType: 'kerala_indian',
    brandOrCategory: 'Indian & Kerala Traditional',
    baseServing: food.baseServing,
    baseWeightGrams: food.baseWeightGrams,
    servingUnit: food.servingUnit,
    caloriesPerBase: food.calories,
    proteinPerBase: food.protein,
    carbsPerBase: food.carbs,
    fatsPerBase: food.fats,
    isEstimate: food.isEstimate,
    notes: food.notes,
  };
}

/**
 * Converts user's saved food templates into search results.
 */
export function searchSavedFoods(query: string, savedFoods: FoodItem[] = []): FoodSearchResultItem[] {
  const trimmed = query.trim().toLowerCase();
  const filtered = !trimmed
    ? savedFoods
    : savedFoods.filter((f) => f.name.toLowerCase().includes(trimmed));

  return filtered.map((f) => ({
    id: f.id,
    name: f.name,
    sourceType: 'saved_template',
    brandOrCategory: 'My Saved Template',
    baseServing: f.servingSize || '1 serving',
    baseWeightGrams: 100, // Standard baseline assumption
    servingUnit: 'serving',
    caloriesPerBase: f.calories,
    proteinPerBase: f.protein,
    carbsPerBase: f.carbs,
    fatsPerBase: f.fats,
    isEstimate: false,
    notes: 'User custom saved template',
  }));
}

/**
 * Queries Open Food Facts public API for packaged foods.
 * Free, open, no API key or subscription needed.
 */
export async function searchOpenFoodFacts(
  query: string,
  signal?: AbortSignal
): Promise<FoodSearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    trimmed
  )}&search_simple=1&action=process&json=1&page_size=20`;

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.products)) {
      return [];
    }

    const items: FoodSearchResultItem[] = [];

    for (const p of data.products) {
      const name = p.product_name || p.product_name_en || p.generic_name;
      if (!name || typeof name !== 'string' || name.trim().length === 0) continue;

      const nutriments = p.nutriments || {};

      // Open Food Facts returns energy either in kcal or kJ
      let kcal = Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0);
      if (!kcal && nutriments['energy-kj_100g']) {
        kcal = Math.round(Number(nutriments['energy-kj_100g']) / 4.184);
      }

      const protein = Number(nutriments['proteins_100g'] ?? nutriments['proteins'] ?? 0);
      const carbs = Number(nutriments['carbohydrates_100g'] ?? nutriments['carbohydrates'] ?? 0);
      const fats = Number(nutriments['fat_100g'] ?? nutriments['fat'] ?? 0);

      // Only include products with valid nutritional data
      if (kcal === 0 && protein === 0 && carbs === 0 && fats === 0) {
        continue;
      }

      const brand = p.brands ? String(p.brands).split(',')[0].trim() : 'Packaged Product';
      const serving = p.serving_size ? String(p.serving_size).trim() : '100g';

      items.push({
        id: `off_${p.code || p.id || Math.random().toString(36).slice(2, 9)}`,
        name: name.trim(),
        sourceType: 'open_food_facts',
        brandOrCategory: brand,
        baseServing: serving.toLowerCase().includes('100g') ? '100g' : `100g (Serving: ${serving})`,
        baseWeightGrams: 100, // Standard 100g basis from Open Food Facts
        servingUnit: 'g',
        caloriesPerBase: Math.round(kcal),
        proteinPerBase: Math.round(protein * 10) / 10,
        carbsPerBase: Math.round(carbs * 10) / 10,
        fatsPerBase: Math.round(fats * 10) / 10,
        isEstimate: false,
        notes: `Packaged food entry from Open Food Facts (Barcode: ${p.code || 'N/A'})`,
        thumbnailUrl: p.image_front_thumb_url || p.image_thumb_url,
      });
    }

    return items;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return [];
    }
    console.warn('Open Food Facts API request failed:', err);
    throw err;
  }
}
