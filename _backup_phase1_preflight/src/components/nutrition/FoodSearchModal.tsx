import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { MealType, FoodItem } from '../../types/wellness';
import {
  FoodSearchResultItem,
  searchLocalKeralaIndianFoods,
  searchSavedFoods,
  searchOpenFoodFacts,
  calculateNutritionForPortion,
} from '../../services/foodSearchService';
import {
  X,
  Search,
  Plus,
  Check,
  Utensils,
  Globe,
  Bookmark,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Flame,
  Scale,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react';

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMealType?: MealType;
  targetDate?: string;
}

export const FoodSearchModal: React.FC<FoodSearchModalProps> = ({
  isOpen,
  onClose,
  initialMealType = 'breakfast',
  targetDate,
}) => {
  const {
    selectedDate,
    data,
    logMeal,
    saveFoodTemplate,
  } = useWellness();

  const effectiveDate = targetDate || selectedDate;

  // Tabs: 'search' | 'manual'
  const [modalTab, setModalTab] = useState<'search' | 'manual'>('search');

  // Meal type
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  useEffect(() => {
    if (initialMealType) {
      setMealType(initialMealType);
    }
  }, [initialMealType, isOpen]);

  // Search filter: 'all' | 'kerala' | 'packaged' | 'saved'
  const [sourceFilter, setSourceFilter] = useState<'all' | 'kerala' | 'packaged' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  // Results
  const [onlineResults, setOnlineResults] = useState<FoodSearchResultItem[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Selected food for portioning & confirmation
  const [selectedFood, setSelectedFood] = useState<FoodSearchResultItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [portionUnit, setPortionUnit] = useState<'servings_or_pieces' | 'grams'>('servings_or_pieces');

  // Fine-tuning overrides
  const [isFineTuning, setIsFineTuning] = useState(false);
  const [customCalories, setCustomCalories] = useState<string>('');
  const [customProtein, setCustomProtein] = useState<string>('');
  const [customCarbs, setCustomCarbs] = useState<string>('');
  const [customFats, setCustomFats] = useState<string>('');
  const [customServingName, setCustomServingName] = useState<string>('');
  const [alsoSaveTemplate, setAlsoSaveTemplate] = useState(false);

  // Manual entry fields (preserved 100% from original)
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFats, setManualFats] = useState('');
  const [manualServing, setManualServing] = useState('1 serving');
  const [manualSaveAsTemplate, setManualSaveAsTemplate] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFood(null);
      setQuantity(1);
      setPortionUnit('servings_or_pieces');
      setIsFineTuning(false);
      setOnlineError(null);
      setAlsoSaveTemplate(false);
    }
  }, [isOpen]);

  // Local results: Indian/Kerala & Saved foods (instant, 0ms)
  const localKeralaResults = useMemo(() => {
    return searchLocalKeralaIndianFoods(searchQuery);
  }, [searchQuery]);

  const localSavedResults = useMemo(() => {
    return searchSavedFoods(searchQuery, data.savedFoods);
  }, [searchQuery, data.savedFoods]);

  // Trigger Open Food Facts search when user submits or when packaged filter is clicked
  const executeOnlineSearch = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setOnlineResults([]);
      setOnlineError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearchingOnline(true);
    setOnlineError(null);

    try {
      const items = await searchOpenFoodFacts(query, controller.signal);
      setOnlineResults(items);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setOnlineError('Could not reach Open Food Facts network. Local foods remain available.');
      }
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Debounced online search on query typing (after 600ms)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setOnlineResults([]);
      setOnlineError(null);
      return;
    }

    const timer = setTimeout(() => {
      executeOnlineSearch(searchQuery);
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combined and filtered search results
  const displayedResults = useMemo(() => {
    let combined: FoodSearchResultItem[] = [];

    if (sourceFilter === 'kerala') {
      combined = localKeralaResults;
    } else if (sourceFilter === 'saved') {
      combined = localSavedResults;
    } else if (sourceFilter === 'packaged') {
      combined = onlineResults;
    } else {
      // 'all': Show saved first, then local Kerala foods, then online packaged foods
      combined = [...localSavedResults, ...localKeralaResults, ...onlineResults];
    }

    return combined;
  }, [sourceFilter, localKeralaResults, localSavedResults, onlineResults]);

  // Portion calculations when food is selected
  const calculatedPortion = useMemo(() => {
    if (!selectedFood) return null;
    return calculateNutritionForPortion(selectedFood, quantity, portionUnit);
  }, [selectedFood, quantity, portionUnit]);

  // Update fine-tune inputs when portion calculation changes
  useEffect(() => {
    if (calculatedPortion) {
      setCustomCalories(String(calculatedPortion.calories));
      setCustomProtein(String(calculatedPortion.protein));
      setCustomCarbs(String(calculatedPortion.carbs));
      setCustomFats(String(calculatedPortion.fats));
      setCustomServingName(calculatedPortion.servingDescription);
    }
  }, [calculatedPortion]);

  if (!isOpen) return null;

  // Handle selecting food from list
  const handleSelectFood = (food: FoodSearchResultItem) => {
    setSelectedFood(food);
    setQuantity(1);
    setPortionUnit('servings_or_pieces');
    setIsFineTuning(false);
    setAlsoSaveTemplate(false);
  };

  // Final confirmation to log the selected food
  const handleConfirmLogFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) return;

    const finalCal = isFineTuning
      ? parseInt(customCalories, 10) || 0
      : calculatedPortion?.calories || 0;
    const finalP = isFineTuning
      ? parseFloat(customProtein) || 0
      : calculatedPortion?.protein || 0;
    const finalC = isFineTuning
      ? parseFloat(customCarbs) || 0
      : calculatedPortion?.carbs || 0;
    const finalF = isFineTuning
      ? parseFloat(customFats) || 0
      : calculatedPortion?.fats || 0;
    const finalServing = isFineTuning
      ? customServingName.trim() || calculatedPortion?.servingDescription || selectedFood.baseServing
      : calculatedPortion?.servingDescription || selectedFood.baseServing;

    logMeal({
      date: effectiveDate,
      mealType,
      name: selectedFood.name,
      calories: finalCal,
      protein: finalP,
      carbs: finalC,
      fats: finalF,
      serving: finalServing,
    });

    if (alsoSaveTemplate) {
      saveFoodTemplate({
        name: selectedFood.name,
        calories: finalCal,
        protein: finalP,
        carbs: finalC,
        fats: finalF,
        servingSize: finalServing,
      });
    }

    onClose();
  };

  // Handle Manual Form Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const cal = parseInt(manualCalories, 10) || 0;
    const p = parseFloat(manualProtein) || 0;
    const c = parseFloat(manualCarbs) || 0;
    const f = parseFloat(manualFats) || 0;
    const s = manualServing.trim() || '1 serving';

    logMeal({
      date: effectiveDate,
      mealType,
      name: manualName.trim(),
      calories: cal,
      protein: p,
      carbs: c,
      fats: f,
      serving: s,
    });

    if (manualSaveAsTemplate) {
      saveFoodTemplate({
        name: manualName.trim(),
        calories: cal,
        protein: p,
        carbs: c,
        fats: f,
        servingSize: s,
      });
    }

    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFats('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-[#121217] border border-white/[0.1] rounded-3xl p-4 sm:p-6 shadow-2xl my-auto max-h-[92vh] flex flex-col relative text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Log Food & Nutrition</h2>
              <span className="text-[11px] text-neutral-400 block">
                Target date: <span className="text-neutral-200 font-mono-num">{effectiveDate}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Slot Selector */}
        <div className="mt-3">
          <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1.5">
            Meal Slot
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-[#0e0e12] p-1 rounded-2xl border border-white/[0.06]">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMealType(t)}
                className={`py-1.5 text-xs capitalize rounded-xl transition-all cursor-pointer font-medium ${
                  mealType === t
                    ? 'bg-[#1e1e26] text-[#00E5FF] font-semibold border border-[#00E5FF]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Top Mode Tabs: Search Database vs Manual Entry */}
        {!selectedFood && (
          <div className="flex gap-2 mt-3 pt-2">
            <button
              type="button"
              onClick={() => setModalTab('search')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalTab === 'search'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'bg-white/[0.03] text-neutral-400 border border-white/[0.04] hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Food Database
            </button>
            <button
              type="button"
              onClick={() => setModalTab('manual')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalTab === 'manual'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'bg-white/[0.03] text-neutral-400 border border-white/[0.04] hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Custom Manual Entry
            </button>
          </div>
        )}

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto mt-3 pr-0.5 space-y-3">
          
          {/* TAB 1: FOOD DATABASE SEARCH */}
          {modalTab === 'search' && !selectedFood && (
            <div className="space-y-3">
              {/* Search input + button */}
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        executeOnlineSearch(searchQuery);
                      }
                    }}
                    placeholder="Search puttu, appam, dosa, chicken, egg, oats..."
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#00E5FF]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => executeOnlineSearch(searchQuery)}
                  disabled={isSearchingOnline || !searchQuery.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-[#00E5FF] text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-[#33ebff] transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isSearchingOnline ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  Search
                </button>
              </div>

              {/* Source Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setSourceFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    sourceFilter === 'all'
                      ? 'bg-white/[0.12] text-white font-semibold'
                      : 'bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  All ({displayedResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFilter('kerala')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    sourceFilter === 'kerala'
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-semibold'
                      : 'bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-[#00E5FF]" />
                  Kerala & Indian ({localKeralaResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceFilter('packaged');
                    if (searchQuery && onlineResults.length === 0) {
                      executeOnlineSearch(searchQuery);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    sourceFilter === 'packaged'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Globe className="w-3 h-3 text-emerald-400" />
                  Packaged (Open Food Facts)
                </button>
                {data.savedFoods.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSourceFilter('saved')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                      sourceFilter === 'saved'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                        : 'bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Bookmark className="w-3 h-3 text-purple-400" />
                    Saved Foods ({localSavedResults.length})
                  </button>
                )}
              </div>

              {/* Online Network Notice / Error */}
              {onlineError && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{onlineError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeOnlineSearch(searchQuery)}
                    className="underline hover:text-amber-200 cursor-pointer ml-2"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Results List */}
              <div className="space-y-2">
                {displayedResults.map((food) => (
                  <div
                    key={food.id}
                    onClick={() => handleSelectFood(food)}
                    className="p-3 rounded-2xl bg-[#16161d] hover:bg-[#1c1c25] border border-white/[0.06] hover:border-[#00E5FF]/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#00E5FF] transition-colors">
                          {food.name}
                        </span>
                        {food.sourceType === 'kerala_indian' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 font-medium shrink-0">
                            Kerala
                          </span>
                        )}
                        {food.sourceType === 'open_food_facts' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium shrink-0">
                            Packaged
                          </span>
                        )}
                        {food.sourceType === 'saved_template' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium shrink-0">
                            Saved
                          </span>
                        )}
                      </div>

                      {food.regionalName && (
                        <span className="text-[11px] text-neutral-400 block truncate mt-0.5">
                          {food.regionalName}
                        </span>
                      )}

                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Base: {food.baseServing}
                      </span>
                    </div>

                    {/* Macro snapshot */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono-num">
                        <span className="text-xs sm:text-sm font-bold text-white block">
                          {food.caloriesPerBase} <span className="text-[10px] text-neutral-400 font-normal">kcal</span>
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          <span className="text-[#00E5FF]">{food.proteinPerBase}P</span> •{' '}
                          <span className="text-amber-300">{food.carbsPerBase}C</span> •{' '}
                          <span className="text-rose-400">{food.fatsPerBase}F</span>
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-[#00E5FF] transition-colors" />
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {displayedResults.length === 0 && !isSearchingOnline && (
                  <div className="py-8 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-800/80 flex items-center justify-center mx-auto text-neutral-500">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-neutral-300">
                        No food items found matching "{searchQuery}"
                      </p>
                      <p className="text-[11px] text-neutral-500 max-w-xs mx-auto mt-1">
                        Try searching for popular Kerala staples like <span className="text-neutral-400 font-semibold">puttu</span>, <span className="text-neutral-400 font-semibold">appam</span>, <span className="text-neutral-400 font-semibold">dosa</span>, or enter details manually.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setManualName(searchQuery);
                        setModalTab('manual');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-[#00E5FF]/20 text-[#00E5FF] text-xs font-semibold border border-white/[0.08] hover:border-[#00E5FF]/40 transition-all cursor-pointer"
                    >
                      + Enter "{searchQuery}" Manually
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FOOD PORTIONING & CONFIRMATION VIEW */}
          {selectedFood && (
            <form onSubmit={handleConfirmLogFood} className="space-y-4">
              {/* Back to search button */}
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Food Search
              </button>

              {/* Selected Item Card */}
              <div className="p-3.5 rounded-2xl bg-[#181822] border border-white/[0.08] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{selectedFood.name}</h3>
                    {selectedFood.regionalName && (
                      <span className="text-xs text-neutral-400 block mt-0.5">{selectedFood.regionalName}</span>
                    )}
                    <span className="text-[11px] text-[#00E5FF] block mt-0.5 font-medium">
                      Nutritional Basis: {selectedFood.baseServing}
                    </span>
                  </div>
                  {selectedFood.sourceType === 'kerala_indian' && (
                    <span className="px-2 py-0.5 rounded-lg bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 text-[10px] font-semibold">
                      Kerala Standard
                    </span>
                  )}
                  {selectedFood.sourceType === 'open_food_facts' && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                      Open Food Facts
                    </span>
                  )}
                </div>

                {selectedFood.notes && (
                  <p className="text-[11px] text-neutral-400 italic pt-1 border-t border-white/[0.04]">
                    ℹ️ {selectedFood.notes}
                  </p>
                )}
                {selectedFood.isEstimate && (
                  <p className="text-[10px] text-neutral-500">
                    Values are standard estimates (Indian Food Composition Tables / NIN). Home cooking recipes may vary with oil &amp; coconut.
                  </p>
                )}
              </div>

              {/* Quantity and Serving Adjustment */}
              <div className="p-3.5 rounded-2xl bg-[#14141a] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Portion &amp; Quantity</span>
                  <div className="flex bg-[#0e0e12] p-0.5 rounded-xl border border-white/[0.06] text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPortionUnit('servings_or_pieces')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        portionUnit === 'servings_or_pieces'
                          ? 'bg-[#1e1e26] text-[#00E5FF] font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {selectedFood.servingUnit === 'piece' ? 'By Pieces' : 'By Servings'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPortionUnit('grams');
                        setQuantity(selectedFood.baseWeightGrams || 100);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        portionUnit === 'grams'
                          ? 'bg-[#1e1e26] text-[#00E5FF] font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      By Weight (g)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      {portionUnit === 'servings_or_pieces'
                        ? `Number of ${selectedFood.servingUnit === 'piece' ? 'Pieces' : 'Servings'}`
                        : 'Weight in Grams (g)'}
                    </label>
                    <input
                      type="number"
                      step={portionUnit === 'servings_or_pieces' ? '0.5' : '10'}
                      min="0.1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1c1c24] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono-num font-bold focus:outline-none focus:border-[#00E5FF]"
                    />
                  </div>

                  <div className="flex gap-1.5 pt-5">
                    {portionUnit === 'servings_or_pieces' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setQuantity(1)}
                          className="px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono-num text-neutral-300"
                        >
                          1
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuantity(2)}
                          className="px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono-num text-neutral-300"
                        >
                          2
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuantity(3)}
                          className="px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono-num text-neutral-300"
                        >
                          3
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setQuantity(50)}
                          className="px-2 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono-num text-neutral-300"
                        >
                          50g
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuantity(100)}
                          className="px-2 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono-num text-neutral-300"
                        >
                          100g
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuantity(150)}
                          className="px-2 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono-num text-neutral-300"
                        >
                          150g
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <span className="text-[11px] text-neutral-400 block">
                  Logged as: <span className="text-white font-medium">{calculatedPortion?.servingDescription}</span>
                </span>
              </div>

              {/* Dynamic Macro Summary Card */}
              <div className="p-3.5 rounded-2xl bg-[#14141a] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Calculated Nutritional Macros
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFineTuning(!isFineTuning)}
                    className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    {isFineTuning ? 'Hide Custom Edits' : 'Edit / Fine-Tune Values'}
                  </button>
                </div>

                {!isFineTuning ? (
                  <div className="grid grid-cols-4 gap-2 text-center font-mono-num pt-1">
                    <div className="p-2 rounded-xl bg-[#1a1a24] border border-white/[0.04]">
                      <span className="text-[10px] text-neutral-400 block">Calories</span>
                      <span className="text-sm sm:text-base font-bold text-white">
                        {calculatedPortion?.calories}
                      </span>
                      <span className="text-[9px] text-neutral-500 block">kcal</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1a1a24] border border-white/[0.04]">
                      <span className="text-[10px] text-[#00E5FF] block">Protein</span>
                      <span className="text-sm sm:text-base font-bold text-[#00E5FF]">
                        {calculatedPortion?.protein}g
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1a1a24] border border-white/[0.04]">
                      <span className="text-[10px] text-amber-300 block">Carbs</span>
                      <span className="text-sm sm:text-base font-bold text-amber-300">
                        {calculatedPortion?.carbs}g
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1a1a24] border border-white/[0.04]">
                      <span className="text-[10px] text-rose-400 block">Fats</span>
                      <span className="text-sm sm:text-base font-bold text-rose-400">
                        {calculatedPortion?.fats}g
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Calories</label>
                        <input
                          type="number"
                          value={customCalories}
                          onChange={(e) => setCustomCalories(e.target.value)}
                          className="w-full bg-[#1c1c24] border border-white/[0.08] rounded-xl px-2 py-1.5 text-xs text-white font-mono-num focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#00E5FF] block mb-1">Protein (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customProtein}
                          onChange={(e) => setCustomProtein(e.target.value)}
                          className="w-full bg-[#1c1c24] border border-white/[0.08] rounded-xl px-2 py-1.5 text-xs text-white font-mono-num focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-300 block mb-1">Carbs (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customCarbs}
                          onChange={(e) => setCustomCarbs(e.target.value)}
                          className="w-full bg-[#1c1c24] border border-white/[0.08] rounded-xl px-2 py-1.5 text-xs text-white font-mono-num focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-rose-400 block mb-1">Fats (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customFats}
                          onChange={(e) => setCustomFats(e.target.value)}
                          className="w-full bg-[#1c1c24] border border-white/[0.08] rounded-xl px-2 py-1.5 text-xs text-white font-mono-num focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Serving Label</label>
                      <input
                        type="text"
                        value={customServingName}
                        onChange={(e) => setCustomServingName(e.target.value)}
                        className="w-full bg-[#1c1c24] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Option to also save as reusable food template */}
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alsoSaveTemplate}
                  onChange={(e) => setAlsoSaveTemplate(e.target.checked)}
                  className="rounded border-white/[0.2] bg-neutral-800 text-[#00E5FF] focus:ring-0"
                />
                <span>Save this portion to My Saved Foods for 1-click re-logging</span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFood(null)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-black text-xs font-bold cyan-glow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Log to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANUAL ENTRY FORM (PRESERVED 100%) */}
          {modalTab === 'manual' && !selectedFood && (
            <form onSubmit={handleManualSubmit} className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Food / Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scrambled Eggs with Avocado"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Calories</label>
                  <input
                    type="number"
                    placeholder="kcal"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#00E5FF] block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="g"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-amber-300 block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="g"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-rose-400 block mb-1">Fats (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="g"
                    value={manualFats}
                    onChange={(e) => setManualFats(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Serving Size</label>
                <input
                  type="text"
                  placeholder="e.g. 2 eggs + 50g avocado"
                  value={manualServing}
                  onChange={(e) => setManualServing(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={manualSaveAsTemplate}
                  onChange={(e) => setManualSaveAsTemplate(e.target.checked)}
                  className="rounded border-white/[0.2] bg-neutral-800 text-[#00E5FF] focus:ring-0"
                />
                <span>Save this food to My Saved Foods list</span>
              </label>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-black text-xs font-bold cyan-glow cursor-pointer transition-all"
                >
                  Save to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
