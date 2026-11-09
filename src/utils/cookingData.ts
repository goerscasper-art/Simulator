import { Ingredient, FoodItem } from '../types/housesim';

export const INGREDIENTS: Ingredient[] = [
  { id: 'flour', name: 'Flour', emoji: '🌾' },
  { id: 'egg', name: 'Egg', emoji: '🥚' },
  { id: 'milk', name: 'Milk', emoji: '🥛' },
  { id: 'meat', name: 'Meat', emoji: '🥩' },
  { id: 'tomato', name: 'Tomato', emoji: '🍅' },
  { id: 'cheese', name: 'Cheese', emoji: '🧀' },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬' },
  { id: 'potato', name: 'Potato', emoji: '🥔' },
  { id: 'apple', name: 'Apple', emoji: '🍎' },
  { id: 'sugar', name: 'Sugar', emoji: '🍬' },
];

// 15 Standard Handcrafted Cookbook Recipes
const CLASSIC_RECIPES_MAP: Record<string, FoodItem> = {
  'egg+flour+milk': {
    id: 'pancakes',
    name: 'Fluffy Pancakes',
    emoji: '🥞',
    effect: { type: 'speed', duration: 60, value: 1.5 },
    recipe: ['flour', 'egg', 'milk'],
  },
  'cheese+flour+tomato': {
    id: 'pizza',
    name: 'Margherita Pizza',
    emoji: '🍕',
    effect: { type: 'health', duration: 0, value: 50 },
    recipe: ['flour', 'tomato', 'cheese'],
  },
  'lettuce+meat+tomato': {
    id: 'burger',
    name: 'Classic Burger',
    emoji: '🍔',
    effect: { type: 'strength', duration: 90, value: 2.0 },
    recipe: ['meat', 'lettuce', 'tomato'],
  },
  'apple+flour+sugar': {
    id: 'apple_pie',
    name: 'Warm Apple Pie',
    emoji: '🥧',
    effect: { type: 'jump', duration: 45, value: 1.6 },
    recipe: ['apple', 'sugar', 'flour'],
  },
  'cheese+potato': {
    id: 'fries',
    name: 'Cheesy Fries',
    emoji: '🍟',
    effect: { type: 'health', duration: 30, value: 5 },
    recipe: ['potato', 'cheese'],
  },
  'egg+flour+sugar': {
    id: 'cake',
    name: 'Birthday Cake',
    emoji: '🎂',
    effect: { type: 'low-gravity', duration: 40, value: 0.4 },
    recipe: ['flour', 'sugar', 'egg'],
  },
  'lettuce+tomato': {
    id: 'salad',
    name: 'Garden Salad',
    emoji: '🥗',
    effect: { type: 'speed', duration: 120, value: 1.2 },
    recipe: ['lettuce', 'tomato'],
  },
  'meat': {
    id: 'steak',
    name: 'Seared Steak',
    emoji: '🥩',
    effect: { type: 'strength', duration: 120, value: 1.8 },
    recipe: ['meat'],
  },
  'cheese+egg': {
    id: 'omelette',
    name: 'Cheesy Omelette',
    emoji: '🍳',
    effect: { type: 'health', duration: 0, value: 30 },
    recipe: ['egg', 'cheese'],
  },
  'milk+tomato': {
    id: 'tomato_soup',
    name: 'Creamy Tomato Soup',
    emoji: '🥣',
    effect: { type: 'health', duration: 20, value: 2 },
    recipe: ['tomato', 'milk'],
  },
  'cheese+meat+potato': {
    id: 'baked_potato',
    name: 'Loaded Baked Potato',
    emoji: '🥔',
    effect: { type: 'strength', duration: 40, value: 1.4 },
    recipe: ['potato', 'cheese', 'meat'],
  },
  'apple+sugar': {
    id: 'fruit_salad',
    name: 'Sweet Fruit Salad',
    emoji: '🍓',
    effect: { type: 'speed', duration: 40, value: 1.3 },
    recipe: ['apple', 'sugar'],
  },
  'milk+sugar': {
    id: 'milkshake',
    name: 'Strawberry Milkshake',
    emoji: '🥤',
    effect: { type: 'low-gravity', duration: 20, value: 0.6 },
    recipe: ['milk', 'sugar'],
  },
  'flour+tomato': {
    id: 'pasta',
    name: 'Tomato Pasta',
    emoji: '🍝',
    effect: { type: 'health', duration: 0, value: 40 },
    recipe: ['flour', 'tomato'],
  },
  'cheese+flour+meat': {
    id: 'sandwich',
    name: 'Ham & Cheese Sandwich',
    emoji: '🥪',
    effect: { type: 'speed', duration: 30, value: 1.25 },
    recipe: ['flour', 'meat', 'cheese'],
  },
};

// Generate combination recipe attributes (name, emoji, suiting effect) dynamically
export function resolveCombination(sortedIds: string[]): FoodItem {
  const key = [...sortedIds].sort().join('+');
  if (CLASSIC_RECIPES_MAP[key]) {
    return CLASSIC_RECIPES_MAP[key];
  }

  const hasFlour = sortedIds.includes('flour');
  const hasEgg = sortedIds.includes('egg');
  const hasMilk = sortedIds.includes('milk');
  const hasMeat = sortedIds.includes('meat');
  const hasTomato = sortedIds.includes('tomato');
  const hasCheese = sortedIds.includes('cheese');
  const hasLettuce = sortedIds.includes('lettuce');
  const hasPotato = sortedIds.includes('potato');
  const hasApple = sortedIds.includes('apple');
  const hasSugar = sortedIds.includes('sugar');

  let name = '';
  let emoji = '🍲';
  let effectType: 'speed' | 'health' | 'jump' | 'low-gravity' | 'strength' | 'none' = 'none';
  let effectDuration = 30;
  let effectValue = 1.0;

  // 1. Assign emojis based on composition
  if (hasMeat) {
    emoji = hasCheese ? '🍖' : '🥩';
  } else if (hasApple) {
    emoji = hasSugar ? '🥧' : '🍎';
  } else if (hasTomato || hasLettuce) {
    emoji = '🥗';
  } else if (hasPotato) {
    emoji = '🥔';
  } else if (hasFlour || hasSugar) {
    emoji = hasEgg ? '🧁' : '🍞';
  } else if (hasMilk) {
    emoji = '🥛';
  } else if (hasEgg) {
    emoji = '🥚';
  }

  // 2. Assign effects dynamically based on ingredients
  if (hasSugar && hasMilk) {
    effectType = 'low-gravity';
    effectValue = 0.5;
    effectDuration = 45;
    emoji = '🥤';
  } else if (hasSugar && hasApple) {
    effectType = 'jump';
    effectValue = 1.7;
    effectDuration = 60;
    emoji = '🥧';
  } else if (hasSugar) {
    effectType = 'speed';
    effectValue = 1.5;
    effectDuration = 35;
    emoji = '🍬';
  } else if (hasMeat && hasCheese) {
    effectType = 'strength';
    effectValue = 2.0;
    effectDuration = 90;
    emoji = '🍖';
  } else if (hasMeat) {
    effectType = 'strength';
    effectValue = 1.8;
    effectDuration = 60;
  } else if (hasApple) {
    effectType = 'jump';
    effectValue = 1.5;
    effectDuration = 45;
  } else if (hasLettuce || hasTomato) {
    effectType = 'speed';
    effectValue = 1.3;
    effectDuration = 60;
    emoji = '🥗';
  } else if (hasCheese && hasPotato) {
    effectType = 'health';
    effectValue = 45;
    effectDuration = 0;
    emoji = '🍟';
  } else if (hasCheese) {
    effectType = 'health';
    effectValue = 35;
    effectDuration = 0;
    emoji = '🧀';
  } else if (hasPotato) {
    effectType = 'strength';
    effectValue = 1.3;
    effectDuration = 40;
  } else if (hasEgg) {
    effectType = 'health';
    effectValue = 25;
    effectDuration = 0;
  } else if (hasMilk) {
    effectType = 'low-gravity';
    effectValue = 0.7;
    effectDuration = 35;
  } else {
    effectType = 'health';
    effectValue = 15;
    effectDuration = 0;
  }

  // 3. Form elegant gourmet names based on combinations
  const itemNames = sortedIds.map(id => INGREDIENTS.find(i => i.id === id)?.name || id);
  if (itemNames.length === 1) {
    const ingName = itemNames[0];
    if (ingName === 'Flour') { name = 'Toasted Flour Dust'; emoji = '🌾'; }
    else if (ingName === 'Egg') { name = 'Sunnyside Boiled Egg'; emoji = '🥚'; }
    else if (ingName === 'Milk') { name = 'Warm Cup of Milk'; emoji = '🥛'; }
    else if (ingName === 'Meat') { name = 'Seared Tenderloin Strip'; emoji = '🥩'; }
    else if (ingName === 'Tomato') { name = 'Fresh Tomato Slices'; emoji = '🍅'; }
    else if (ingName === 'Cheese') { name = 'Gouda Cheese Wedge'; emoji = '🧀'; }
    else if (ingName === 'Lettuce') { name = 'Organic Lettuce Leaf'; emoji = '🥬'; }
    else if (ingName === 'Potato') { name = 'Starchy Potato Cubes'; emoji = '🥔'; }
    else if (ingName === 'Apple') { name = 'Crisp Red Apple Wedges'; emoji = '🍎'; }
    else if (ingName === 'Sugar') { name = 'Sweet Rock Sugar Candies'; emoji = '🍬'; }
  } else if (itemNames.length === 2) {
    const [n1, n2] = itemNames;
    if (hasMeat && hasCheese) { name = 'Cheesy Beef Meatballs'; emoji = '🍖'; }
    else if (hasTomato && hasCheese) { name = 'Caprese Tomato Skewers'; emoji = '🥗'; }
    else if (hasMeat && hasTomato) { name = 'Bolognese Ragu'; emoji = '🍲'; }
    else if (hasPotato && hasCheese) { name = 'Crispy Cheesy Fries'; emoji = '🍟'; }
    else if (hasApple && hasSugar) { name = 'Caramelized Sweet Apples'; emoji = '🍎'; }
    else if (hasMilk && hasSugar) { name = 'Sweet Vanilla Milkshake'; emoji = '🥤'; }
    else if (hasEgg && hasCheese) { name = 'Baked Cheese Frittata'; emoji = '🍳'; }
    else if (hasFlour && hasSugar) { name = 'Crisp Sugar Butter Cookie'; emoji = '🍪'; }
    else if (hasFlour && hasEgg) { name = 'Artisan Egg Noodles'; emoji = '🍜'; }
    else if (hasLettuce && hasTomato) { name = 'Fresh Italian Garden Salad'; emoji = '🥗'; }
    else {
      name = `${n1} & ${n2} Fusion Blend`;
    }
  } else {
    // 3 or more ingredients
    if (hasMeat) {
      name = `Ultimate Meat Stir-Fry Feast (${itemNames.length} Ingredients)`;
      emoji = '🍱';
    } else if (hasSugar && hasFlour) {
      name = `Sweet Honey Pastry Platter (${itemNames.length} Ingredients)`;
      emoji = '🍰';
    } else if (hasTomato || hasLettuce) {
      name = `Gourmet Harvest Salad Skillet (${itemNames.length} Ingredients)`;
      emoji = '🥗';
    } else {
      name = `Chef's Special Medley Pot (${itemNames.length} Ingredients)`;
      emoji = '🍲';
    }
  }

  return {
    id: `recipe-${key}`,
    name,
    emoji,
    effect: {
      type: effectType,
      duration: effectDuration,
      value: effectValue,
    },
    recipe: sortedIds,
  };
}

// Generate ALL 1,023 possible combinations programmatically
function generateAllRecipes(): FoodItem[] {
  const recipesList: FoodItem[] = [];
  
  // Power set helper (excluding empty subset)
  const n = INGREDIENTS.length;
  const numSubsets = Math.pow(2, n);
  
  for (let i = 1; i < numSubsets; i++) {
    const subsetIds: string[] = [];
    for (let j = 0; j < n; j++) {
      if ((i & (1 << j)) !== 0) {
        subsetIds.push(INGREDIENTS[j].id);
      }
    }
    // Sort subset for consistency
    subsetIds.sort();
    recipesList.push(resolveCombination(subsetIds));
  }
  
  return recipesList;
}

export const RECIPES: FoodItem[] = generateAllRecipes();

export function getMysteryDish(ingredients: string[]): FoodItem {
  return resolveCombination(ingredients);
}
