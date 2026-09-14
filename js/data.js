// Sample recipe catalog.
//
// In a production build this array would be replaced by results pulled live
// from a recipe API (e.g. Spoonacular / Edamam) and/or generated on demand by
// the Google Gemini API — see js/ai.js. Every recipe here carries the same
// shape that API layer produces, so swapping the source later doesn't touch
// any UI code.
//
// nutrition is PER SERVING. ingredients quantities are PER SERVING (the
// planner scales them by household size when building the shopping list).

export const SEASONS = ["spring", "summer", "autumn", "winter"];

export function currentSeason(date = new Date()) {
  const m = date.getMonth(); // 0-11
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

const img = (id) => `https://images.unsplash.com/${id}?w=900&q=70&auto=format&fit=crop`;

export const RECIPES = [
  // ---------- BREAKFAST ----------
  {
    id: "b-oats-berries",
    title: "Overnight Oats with Berries",
    meal: "breakfast",
    season: ["all"],
    minutes: 10,
    tags: ["vegetarian", "no-cook"],
    image: img("photo-1490645935967-10de6ba17061"),
    nutrition: { kcal: 340, protein: 12, carbs: 52, fat: 9 },
    ingredients: [
      { name: "Rolled oats", qty: 60, unit: "g", category: "Grains" },
      { name: "Milk", qty: 150, unit: "ml", category: "Dairy" },
      { name: "Greek yogurt", qty: 60, unit: "g", category: "Dairy" },
      { name: "Mixed berries", qty: 80, unit: "g", category: "Produce" },
      { name: "Honey", qty: 10, unit: "g", category: "Pantry" },
    ],
  },
  {
    id: "b-avocado-toast",
    title: "Avocado & Egg Toast",
    meal: "breakfast",
    season: ["all"],
    minutes: 12,
    tags: ["vegetarian"],
    image: img("photo-1512058564366-18510be2db19"),
    nutrition: { kcal: 380, protein: 16, carbs: 32, fat: 21 },
    ingredients: [
      { name: "Sourdough bread", qty: 2, unit: "slice", category: "Bakery" },
      { name: "Avocado", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Eggs", qty: 2, unit: "pc", category: "Dairy" },
      { name: "Chili flakes", qty: 1, unit: "pinch", category: "Pantry" },
    ],
  },
  {
    id: "b-shakshuka",
    title: "Shakshuka",
    meal: "breakfast",
    season: ["autumn", "winter"],
    minutes: 25,
    tags: ["vegetarian"],
    image: img("photo-1476718406336-bb5a9690ee2a"),
    nutrition: { kcal: 320, protein: 18, carbs: 18, fat: 20 },
    ingredients: [
      { name: "Eggs", qty: 2, unit: "pc", category: "Dairy" },
      { name: "Canned tomatoes", qty: 200, unit: "g", category: "Pantry" },
      { name: "Onion", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Bell pepper", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Feta cheese", qty: 30, unit: "g", category: "Dairy" },
    ],
  },
  {
    id: "b-pancakes",
    title: "Buttermilk Pancakes",
    meal: "breakfast",
    season: ["all"],
    minutes: 20,
    tags: ["vegetarian", "weekend"],
    image: img("photo-1512621776951-a57141f2eefd"),
    nutrition: { kcal: 420, protein: 11, carbs: 60, fat: 14 },
    ingredients: [
      { name: "Flour", qty: 80, unit: "g", category: "Pantry" },
      { name: "Buttermilk", qty: 120, unit: "ml", category: "Dairy" },
      { name: "Eggs", qty: 1, unit: "pc", category: "Dairy" },
      { name: "Maple syrup", qty: 20, unit: "g", category: "Pantry" },
    ],
  },
  {
    id: "b-smoothie-bowl",
    title: "Mango Smoothie Bowl",
    meal: "breakfast",
    season: ["spring", "summer"],
    minutes: 8,
    tags: ["vegan", "no-cook"],
    image: img("photo-1490645935967-10de6ba17061"),
    nutrition: { kcal: 300, protein: 8, carbs: 55, fat: 6 },
    ingredients: [
      { name: "Frozen mango", qty: 150, unit: "g", category: "Produce" },
      { name: "Banana", qty: 1, unit: "pc", category: "Produce" },
      { name: "Oat milk", qty: 100, unit: "ml", category: "Dairy" },
      { name: "Granola", qty: 30, unit: "g", category: "Pantry" },
    ],
  },
  {
    id: "b-yogurt-granola",
    title: "Greek Yogurt & Granola",
    meal: "breakfast",
    season: ["all"],
    minutes: 5,
    tags: ["vegetarian", "no-cook", "quick"],
    image: img("photo-1490645935967-10de6ba17061"),
    nutrition: { kcal: 310, protein: 20, carbs: 34, fat: 10 },
    ingredients: [
      { name: "Greek yogurt", qty: 200, unit: "g", category: "Dairy" },
      { name: "Granola", qty: 40, unit: "g", category: "Pantry" },
      { name: "Honey", qty: 10, unit: "g", category: "Pantry" },
      { name: "Mixed berries", qty: 60, unit: "g", category: "Produce" },
    ],
  },

  // ---------- LUNCH ----------
  {
    id: "l-greek-salad",
    title: "Greek Salad with Chickpeas",
    meal: "lunch",
    season: ["summer"],
    minutes: 15,
    tags: ["vegetarian", "no-cook"],
    image: img("photo-1525351484163-7529414344d8"),
    nutrition: { kcal: 420, protein: 15, carbs: 30, fat: 26 },
    ingredients: [
      { name: "Cucumber", qty: 1, unit: "pc", category: "Produce" },
      { name: "Tomato", qty: 2, unit: "pc", category: "Produce" },
      { name: "Feta cheese", qty: 50, unit: "g", category: "Dairy" },
      { name: "Chickpeas", qty: 120, unit: "g", category: "Pantry" },
      { name: "Olives", qty: 30, unit: "g", category: "Pantry" },
      { name: "Olive oil", qty: 15, unit: "ml", category: "Pantry" },
    ],
  },
  {
    id: "l-grain-bowl",
    title: "Roasted Veg Grain Bowl",
    meal: "lunch",
    season: ["autumn"],
    minutes: 35,
    tags: ["vegan"],
    image: img("photo-1547592166-23ac45744acd"),
    nutrition: { kcal: 480, protein: 14, carbs: 62, fat: 18 },
    ingredients: [
      { name: "Quinoa", qty: 70, unit: "g", category: "Grains" },
      { name: "Sweet potato", qty: 150, unit: "g", category: "Produce" },
      { name: "Broccoli", qty: 100, unit: "g", category: "Produce" },
      { name: "Chickpeas", qty: 100, unit: "g", category: "Pantry" },
      { name: "Tahini", qty: 20, unit: "g", category: "Pantry" },
    ],
  },
  {
    id: "l-chicken-wrap",
    title: "Grilled Chicken Wrap",
    meal: "lunch",
    season: ["all"],
    minutes: 20,
    tags: ["high-protein"],
    image: img("photo-1467003909585-2f8a72700288"),
    nutrition: { kcal: 460, protein: 34, carbs: 40, fat: 17 },
    ingredients: [
      { name: "Chicken breast", qty: 120, unit: "g", category: "Meat" },
      { name: "Tortilla wrap", qty: 1, unit: "pc", category: "Bakery" },
      { name: "Lettuce", qty: 40, unit: "g", category: "Produce" },
      { name: "Tomato", qty: 1, unit: "pc", category: "Produce" },
      { name: "Yogurt sauce", qty: 30, unit: "g", category: "Dairy" },
    ],
  },
  {
    id: "l-lentil-soup",
    title: "Red Lentil Soup",
    meal: "lunch",
    season: ["autumn", "winter"],
    minutes: 30,
    tags: ["vegan", "batch-cook"],
    image: img("photo-1540189549336-e6e99c3679fe"),
    nutrition: { kcal: 340, protein: 18, carbs: 48, fat: 8 },
    ingredients: [
      { name: "Red lentils", qty: 90, unit: "g", category: "Pantry" },
      { name: "Carrot", qty: 1, unit: "pc", category: "Produce" },
      { name: "Onion", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Vegetable stock", qty: 400, unit: "ml", category: "Pantry" },
      { name: "Cumin", qty: 1, unit: "tsp", category: "Pantry" },
    ],
  },
  {
    id: "l-caprese-pasta",
    title: "Caprese Pasta Salad",
    meal: "lunch",
    season: ["summer"],
    minutes: 20,
    tags: ["vegetarian"],
    image: img("photo-1467003909585-2f8a72700288"),
    nutrition: { kcal: 500, protein: 17, carbs: 64, fat: 19 },
    ingredients: [
      { name: "Pasta", qty: 90, unit: "g", category: "Grains" },
      { name: "Cherry tomatoes", qty: 120, unit: "g", category: "Produce" },
      { name: "Mozzarella", qty: 80, unit: "g", category: "Dairy" },
      { name: "Basil", qty: 5, unit: "g", category: "Produce" },
      { name: "Olive oil", qty: 15, unit: "ml", category: "Pantry" },
    ],
  },
  {
    id: "l-tuna-salad",
    title: "Tuna & White Bean Salad",
    meal: "lunch",
    season: ["all"],
    minutes: 12,
    tags: ["high-protein", "no-cook", "quick"],
    image: img("photo-1525351484163-7529414344d8"),
    nutrition: { kcal: 400, protein: 32, carbs: 28, fat: 16 },
    ingredients: [
      { name: "Canned tuna", qty: 120, unit: "g", category: "Pantry" },
      { name: "White beans", qty: 100, unit: "g", category: "Pantry" },
      { name: "Red onion", qty: 0.3, unit: "pc", category: "Produce" },
      { name: "Lemon", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Olive oil", qty: 10, unit: "ml", category: "Pantry" },
    ],
  },

  // ---------- DINNER ----------
  {
    id: "d-salmon-veg",
    title: "Baked Salmon & Greens",
    meal: "dinner",
    season: ["all"],
    minutes: 30,
    tags: ["high-protein", "gluten-free"],
    image: img("photo-1504674900247-0877df9cc836"),
    nutrition: { kcal: 520, protein: 38, carbs: 20, fat: 30 },
    ingredients: [
      { name: "Salmon fillet", qty: 150, unit: "g", category: "Fish" },
      { name: "Broccoli", qty: 120, unit: "g", category: "Produce" },
      { name: "Lemon", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Olive oil", qty: 10, unit: "ml", category: "Pantry" },
      { name: "New potatoes", qty: 150, unit: "g", category: "Produce" },
    ],
  },
  {
    id: "d-veg-curry",
    title: "Coconut Vegetable Curry",
    meal: "dinner",
    season: ["autumn", "winter"],
    minutes: 40,
    tags: ["vegan", "batch-cook"],
    image: img("photo-1546069901-ba9599a7e63c"),
    nutrition: { kcal: 540, protein: 14, carbs: 62, fat: 24 },
    ingredients: [
      { name: "Coconut milk", qty: 200, unit: "ml", category: "Pantry" },
      { name: "Sweet potato", qty: 150, unit: "g", category: "Produce" },
      { name: "Chickpeas", qty: 120, unit: "g", category: "Pantry" },
      { name: "Spinach", qty: 80, unit: "g", category: "Produce" },
      { name: "Rice", qty: 80, unit: "g", category: "Grains" },
      { name: "Curry paste", qty: 20, unit: "g", category: "Pantry" },
    ],
  },
  {
    id: "d-steak-potatoes",
    title: "Pan-Seared Steak & Potatoes",
    meal: "dinner",
    season: ["all"],
    minutes: 35,
    tags: ["high-protein"],
    image: img("photo-1555939594-58d7cb561ad1"),
    nutrition: { kcal: 620, protein: 42, carbs: 34, fat: 32 },
    ingredients: [
      { name: "Beef steak", qty: 150, unit: "g", category: "Meat" },
      { name: "New potatoes", qty: 200, unit: "g", category: "Produce" },
      { name: "Green beans", qty: 100, unit: "g", category: "Produce" },
      { name: "Butter", qty: 15, unit: "g", category: "Dairy" },
    ],
  },
  {
    id: "d-pasta-tomato",
    title: "Pasta al Pomodoro",
    meal: "dinner",
    season: ["summer", "autumn"],
    minutes: 25,
    tags: ["vegetarian", "quick"],
    image: img("photo-1467003909585-2f8a72700288"),
    nutrition: { kcal: 560, protein: 16, carbs: 88, fat: 15 },
    ingredients: [
      { name: "Pasta", qty: 100, unit: "g", category: "Grains" },
      { name: "Canned tomatoes", qty: 250, unit: "g", category: "Pantry" },
      { name: "Garlic", qty: 2, unit: "clove", category: "Produce" },
      { name: "Basil", qty: 5, unit: "g", category: "Produce" },
      { name: "Parmesan", qty: 20, unit: "g", category: "Dairy" },
    ],
  },
  {
    id: "d-stirfry-tofu",
    title: "Sesame Tofu Stir-fry",
    meal: "dinner",
    season: ["all"],
    minutes: 25,
    tags: ["vegan", "quick"],
    image: img("photo-1547592166-23ac45744acd"),
    nutrition: { kcal: 460, protein: 24, carbs: 46, fat: 20 },
    ingredients: [
      { name: "Tofu", qty: 150, unit: "g", category: "Pantry" },
      { name: "Broccoli", qty: 100, unit: "g", category: "Produce" },
      { name: "Bell pepper", qty: 1, unit: "pc", category: "Produce" },
      { name: "Rice", qty: 80, unit: "g", category: "Grains" },
      { name: "Soy sauce", qty: 15, unit: "ml", category: "Pantry" },
      { name: "Sesame oil", qty: 10, unit: "ml", category: "Pantry" },
    ],
  },
  {
    id: "d-chicken-traybake",
    title: "Roast Chicken Traybake",
    meal: "dinner",
    season: ["autumn", "winter"],
    minutes: 45,
    tags: ["high-protein", "batch-cook"],
    image: img("photo-1467003909585-2f8a72700288"),
    nutrition: { kcal: 580, protein: 40, carbs: 36, fat: 28 },
    ingredients: [
      { name: "Chicken thighs", qty: 200, unit: "g", category: "Meat" },
      { name: "New potatoes", qty: 200, unit: "g", category: "Produce" },
      { name: "Carrot", qty: 1, unit: "pc", category: "Produce" },
      { name: "Red onion", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Olive oil", qty: 15, unit: "ml", category: "Pantry" },
    ],
  },
  {
    id: "d-fishtacos",
    title: "Baja Fish Tacos",
    meal: "dinner",
    season: ["summer"],
    minutes: 30,
    tags: ["high-protein"],
    image: img("photo-1504674900247-0877df9cc836"),
    nutrition: { kcal: 500, protein: 30, carbs: 44, fat: 20 },
    ingredients: [
      { name: "White fish fillet", qty: 150, unit: "g", category: "Fish" },
      { name: "Tortilla wrap", qty: 2, unit: "pc", category: "Bakery" },
      { name: "Cabbage", qty: 60, unit: "g", category: "Produce" },
      { name: "Lime", qty: 0.5, unit: "pc", category: "Produce" },
      { name: "Yogurt sauce", qty: 30, unit: "g", category: "Dairy" },
    ],
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}
