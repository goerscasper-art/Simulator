import React from 'react';
import { ChefHat, ShoppingBasket, X, Utensils, Heart, Zap, ArrowUp, Wind, Shield } from 'lucide-react';
import { FoodItem, Ingredient } from '../types/housesim';
import { INGREDIENTS, RECIPES } from '../utils/cookingData';

interface CookingMenuProps {
  isOpen?: boolean;
  onClose: () => void;
  ingredients?: string[];
  inventory?: string[];
  cookedFood: FoodItem[];
  onCook: (recipe: FoodItem) => void;
  onEat: (food: FoodItem) => void;
}

export const CookingMenu: React.FC<CookingMenuProps> = ({
  isOpen = true,
  onClose,
  ingredients,
  inventory,
  cookedFood,
  onCook,
  onEat,
}) => {
  if (!isOpen) return null;
  const effectiveIngredients = ingredients || inventory || [];

  const canCook = (recipe: FoodItem) => {
    const inv = [...(effectiveIngredients || [])];
    for (const req of recipe.recipe) {
      const idx = inv.indexOf(req);
      if (idx === -1) return false;
      inv.splice(idx, 1);
    }
    return true;
  };

  const getIngredientEmoji = (id: string) => INGREDIENTS.find((i) => i.id === id)?.emoji || '❓';
  const getIngredientName = (id: string) => INGREDIENTS.find((i) => i.id === id)?.name || id;

  const countIngredient = (id: string) => (ingredients || []).filter((i) => i === id).length;

  // Show classic cookbook recipes (15 core), plus other combinations ONLY if they are cookable with current ingredients
  const filteredRecipes = RECIPES.filter((recipe) => {
    const isClassic = !recipe.id.startsWith('recipe-');
    if (isClassic) return true;
    return canCook(recipe);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 select-none cursor-default transition-all animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-9 bg-white/5 border-b border-white/10 flex items-center justify-between pl-3.5 pr-0 select-none shrink-0">
          <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
            <ChefHat className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>Gourmet Cooking Station</span>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-full text-[#cccccc] hover:bg-[#e81123] hover:text-white flex items-center justify-center transition-colors text-xs"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-transparent">
          {/* Left Panel: Inventory & Recipes */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 border-r border-white/5">
            {/* Ingredients Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBasket className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-[11px] font-semibold text-[#a0a0a0] uppercase tracking-wider">Your Ingredients</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {INGREDIENTS.map((ing) => {
                  const count = countIngredient(ing.id);
                  return (
                    <div
                      key={ing.id}
                      className={`p-3 rounded-[4px] border backdrop-blur-sm transition-all ${
                        count > 0 ? 'bg-white/5 border-white/10 shadow-sm' : 'bg-black/20 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{ing.emoji}</div>
                      <div className="text-xs font-semibold text-[#f3f3f3] truncate">{ing.name}</div>
                      <div className="text-[10px] text-[#9e9e9e] mt-0.5 font-mono">Qty: {count}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recipes Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-[11px] font-semibold text-[#a0a0a0] uppercase tracking-wider">Available Recipes ({filteredRecipes.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredRecipes.map((recipe) => {
                  const possible = canCook(recipe);
                  return (
                    <div
                      key={recipe.id}
                      className={`p-3.5 rounded-[4px] border backdrop-blur-sm transition-all ${
                        possible
                          ? 'bg-white/5 border-white/10 hover:border-[#0078d4]/60'
                          : 'bg-black/20 border-white/5 opacity-65'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{recipe.emoji}</span>
                          <div>
                            <h4 className="text-xs font-semibold text-[#f3f3f3]">{recipe.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {recipe.effect.type === 'speed' && <Zap className="w-3 h-3 text-yellow-400" />}
                              {recipe.effect.type === 'health' && <Heart className="w-3 h-3 text-red-500" />}
                              {recipe.effect.type === 'jump' && <ArrowUp className="w-3 h-3 text-green-400" />}
                              {recipe.effect.type === 'low-gravity' && <Wind className="w-3 h-3 text-blue-300" />}
                              {recipe.effect.type === 'strength' && <Shield className="w-3 h-3 text-purple-400" />}
                              <span className="text-[10px] text-[#9e9e9e] uppercase font-mono">
                                {recipe.effect.type.replace('-', ' ')}
                                {recipe.effect.duration > 0 && ` (${recipe.effect.duration}s)`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {recipe.recipe.map((ingId, idx) => (
                          <span
                            key={idx}
                            title={getIngredientName(ingId)}
                            className={`px-2 py-0.5 rounded-[3px] text-[10px] border flex items-center gap-1 backdrop-blur-sm ${
                              countIngredient(ingId) > 0
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-[#85e89d]'
                                : 'bg-rose-950/40 border-rose-500/30 text-[#f97583]'
                            }`}
                          >
                            {getIngredientEmoji(ingId)} {getIngredientName(ingId)}
                          </span>
                        ))}
                      </div>

                      <button
                        disabled={!possible}
                        onClick={() => onCook(recipe)}
                        className={`w-full py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                          possible
                            ? 'bg-[#0078d4]/80 hover:bg-[#0078d4] text-white shadow-lg'
                            : 'bg-white/5 border border-white/10 text-[#666666] cursor-not-allowed'
                        }`}
                      >
                        Cook Dish
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Panel: Cooked Food Inventory */}
          <div className="w-full md:w-72 bg-black/10 p-5 overflow-y-auto backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="w-4 h-4 text-[#0078d4]" />
              <h3 className="text-[11px] font-semibold text-[#a0a0a0] uppercase tracking-wider">Ready to Eat</h3>
            </div>

            {(cookedFood || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4 border border-dashed border-white/10 rounded-[4px]">
                <Utensils className="w-6 h-6 text-[#555555] mb-2" />
                <p className="text-xs text-[#888888]">No cooked dishes yet. Get cooking!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(cookedFood || []).map((food, idx) => (
                  <div
                    key={`${food.id}-${idx}`}
                    className="bg-white/5 border border-white/10 rounded-[4px] p-3 hover:bg-white/10 backdrop-blur-sm transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className="text-2xl">{food.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#f3f3f3] truncate">{food.name}</div>
                        <div className="text-[10px] text-[#60cdff] uppercase font-mono">
                          {food.effect.type !== 'none' ? food.effect.type : 'Delicious!'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onEat(food)}
                      className="w-full py-1.5 bg-[#0078d4]/80 hover:bg-[#0078d4] border border-white/10 text-white rounded-[4px] text-xs font-semibold transition-all shadow-md"
                    >
                      Eat Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
