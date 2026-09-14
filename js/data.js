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

// A handful of placeholder food photos, cycled across the catalog. Swap
// these for real per-recipe photography once recipes come from a live API.
const PHOTOS = [
  "photo-1490645935967-10de6ba17061",
  "photo-1512058564366-18510be2db19",
  "photo-1476718406336-bb5a9690ee2a",
  "photo-1512621776951-a57141f2eefd",
  "photo-1525351484163-7529414344d8",
  "photo-1467003909585-2f8a72700288",
  "photo-1546069901-ba9599a7e63c",
  "photo-1547592166-23ac45744acd",
  "photo-1504674900247-0877df9cc836",
  "photo-1555939594-58d7cb561ad1",
  "photo-1540189549336-e6e99c3679fe",
];
let photoCursor = 0;
const nextPhoto = () => img(PHOTOS[photoCursor++ % PHOTOS.length]);

/** Compact recipe builder — keeps the catalog below readable as data, not boilerplate. */
function mk(id, title, meal, season, minutes, tags, nutrition, ingredients, steps) {
  return {
    id,
    title,
    meal,
    season,
    minutes,
    tags,
    image: nextPhoto(),
    nutrition: { kcal: nutrition[0], protein: nutrition[1], carbs: nutrition[2], fat: nutrition[3] },
    ingredients: ingredients.map(([name, qty, unit, category]) => ({ name, qty, unit, category })),
    steps,
  };
}

const ALL = ["all"];

export const RECIPES = [
  // ================= BREAKFAST =================
  mk("b-oats-berries", "Overnight Oats with Berries", "breakfast", ALL, 10, ["vegetarian", "no-cook"],
    [340, 12, 52, 9],
    [["Rolled oats", 60, "g", "Grains"], ["Milk", 150, "ml", "Dairy"], ["Greek yogurt", 60, "g", "Dairy"], ["Mixed berries", 80, "g", "Produce"], ["Honey", 10, "g", "Pantry"]],
    ["Stir oats, milk and yogurt together in a jar.", "Cover and refrigerate overnight (or at least 4 hours).", "Top with berries and a drizzle of honey before eating."]),

  mk("b-avocado-toast", "Avocado & Egg Toast", "breakfast", ALL, 12, ["vegetarian"],
    [380, 16, 32, 21],
    [["Sourdough bread", 2, "slice", "Bakery"], ["Avocado", 0.5, "pc", "Produce"], ["Eggs", 2, "pc", "Dairy"], ["Chili flakes", 1, "pinch", "Pantry"]],
    ["Toast the bread and fry or poach the eggs.", "Mash the avocado with a pinch of salt and spread on the toast.", "Top with the eggs and chili flakes."]),

  mk("b-shakshuka", "Shakshuka", "breakfast", ["autumn", "winter"], 25, ["vegetarian"],
    [320, 18, 18, 20],
    [["Eggs", 2, "pc", "Dairy"], ["Canned tomatoes", 200, "g", "Pantry"], ["Onion", 0.5, "pc", "Produce"], ["Bell pepper", 0.5, "pc", "Produce"], ["Feta cheese", 30, "g", "Dairy"]],
    ["Sauté onion and bell pepper until soft, about 5 minutes.", "Add tomatoes and simmer 8-10 minutes until thickened.", "Make wells in the sauce, crack in the eggs and cover until set.", "Finish with crumbled feta."]),

  mk("b-pancakes", "Buttermilk Pancakes", "breakfast", ALL, 20, ["vegetarian", "weekend"],
    [420, 11, 60, 14],
    [["Flour", 80, "g", "Pantry"], ["Buttermilk", 120, "ml", "Dairy"], ["Eggs", 1, "pc", "Dairy"], ["Maple syrup", 20, "g", "Pantry"]],
    ["Whisk flour, buttermilk and egg into a smooth batter.", "Cook spoonfuls in a hot buttered pan, 2 minutes per side.", "Stack and serve with maple syrup."]),

  mk("b-smoothie-bowl", "Mango Smoothie Bowl", "breakfast", ["spring", "summer"], 8, ["vegan", "no-cook"],
    [300, 8, 55, 6],
    [["Frozen mango", 150, "g", "Produce"], ["Banana", 1, "pc", "Produce"], ["Oat milk", 100, "ml", "Dairy"], ["Granola", 30, "g", "Pantry"]],
    ["Blend frozen mango, banana and oat milk until thick and smooth.", "Pour into a bowl.", "Top with granola."]),

  mk("b-yogurt-granola", "Greek Yogurt & Granola", "breakfast", ALL, 5, ["vegetarian", "no-cook", "quick"],
    [310, 20, 34, 10],
    [["Greek yogurt", 200, "g", "Dairy"], ["Granola", 40, "g", "Pantry"], ["Honey", 10, "g", "Pantry"], ["Mixed berries", 60, "g", "Produce"]],
    ["Spoon yogurt into a bowl.", "Top with granola, berries and a drizzle of honey."]),

  mk("b-burrito", "Breakfast Burrito", "breakfast", ALL, 15, ["high-protein"],
    [460, 22, 38, 24],
    [["Eggs", 2, "pc", "Dairy"], ["Tortilla wrap", 1, "pc", "Bakery"], ["Black beans", 80, "g", "Pantry"], ["Cheddar cheese", 30, "g", "Dairy"], ["Salsa", 30, "g", "Pantry"]],
    ["Scramble the eggs in a hot pan.", "Warm the tortilla, then layer eggs, beans, cheese and salsa.", "Fold and roll into a burrito."]),

  mk("b-french-toast", "Cinnamon French Toast", "breakfast", ["autumn", "winter"], 15, ["vegetarian"],
    [400, 14, 48, 16],
    [["Brioche bread", 2, "slice", "Bakery"], ["Eggs", 1, "pc", "Dairy"], ["Milk", 60, "ml", "Dairy"], ["Cinnamon", 1, "tsp", "Pantry"], ["Maple syrup", 15, "g", "Pantry"]],
    ["Whisk egg, milk and cinnamon together.", "Dip bread slices and fry in a buttered pan until golden on both sides.", "Serve with maple syrup."]),

  mk("b-omelette", "Veggie Omelette", "breakfast", ALL, 12, ["vegetarian", "gluten-free"],
    [340, 22, 8, 24],
    [["Eggs", 3, "pc", "Dairy"], ["Bell pepper", 0.5, "pc", "Produce"], ["Spinach", 30, "g", "Produce"], ["Cheddar cheese", 25, "g", "Dairy"]],
    ["Whisk the eggs with a pinch of salt.", "Sauté pepper and spinach briefly, then pour eggs over.", "Sprinkle with cheese, fold when set and serve."]),

  mk("b-chia-pudding", "Chia Pudding with Mango", "breakfast", ["spring", "summer"], 10, ["vegan", "no-cook"],
    [280, 9, 34, 12],
    [["Chia seeds", 30, "g", "Pantry"], ["Coconut milk", 180, "ml", "Pantry"], ["Mango", 0.5, "pc", "Produce"], ["Honey", 10, "g", "Pantry"]],
    ["Stir chia seeds into coconut milk and honey.", "Refrigerate at least 3 hours, stirring once, until thickened.", "Top with diced mango."]),

  mk("b-bircher", "Bircher Muesli with Apple", "breakfast", ["autumn"], 10, ["vegetarian", "no-cook"],
    [360, 11, 54, 10],
    [["Rolled oats", 60, "g", "Grains"], ["Apple", 1, "pc", "Produce"], ["Yogurt", 100, "g", "Dairy"], ["Apple juice", 60, "ml", "Pantry"], ["Walnuts", 15, "g", "Pantry"]],
    ["Grate the apple and mix with oats, yogurt and apple juice.", "Refrigerate overnight.", "Top with chopped walnuts before serving."]),

  mk("b-cottage-cheese", "Cottage Cheese & Pineapple Bowl", "breakfast", ["summer"], 5, ["vegetarian", "no-cook", "quick", "high-protein"],
    [260, 24, 22, 6],
    [["Cottage cheese", 200, "g", "Dairy"], ["Pineapple", 100, "g", "Produce"], ["Honey", 10, "g", "Pantry"]],
    ["Spoon cottage cheese into a bowl.", "Top with diced pineapple and a drizzle of honey."]),

  mk("b-salmon-bagel", "Smoked Salmon Bagel", "breakfast", ALL, 10, ["high-protein", "no-cook"],
    [420, 24, 42, 16],
    [["Bagel", 1, "pc", "Bakery"], ["Smoked salmon", 60, "g", "Fish"], ["Cream cheese", 30, "g", "Dairy"], ["Red onion", 0.2, "pc", "Produce"], ["Capers", 1, "tsp", "Pantry"]],
    ["Slice and toast the bagel.", "Spread with cream cheese.", "Top with smoked salmon, thin red onion and capers."]),

  mk("b-quesadilla", "Breakfast Quesadilla", "breakfast", ALL, 15, ["vegetarian"],
    [440, 20, 36, 22],
    [["Tortilla wrap", 2, "pc", "Bakery"], ["Eggs", 2, "pc", "Dairy"], ["Cheddar cheese", 40, "g", "Dairy"], ["Bell pepper", 0.3, "pc", "Produce"]],
    ["Scramble the eggs with diced pepper.", "Layer egg and cheese between the tortillas.", "Fry in a dry pan until golden and the cheese melts, then slice."]),

  mk("b-pb-banana-toast", "Peanut Butter Banana Toast", "breakfast", ALL, 5, ["vegetarian", "quick", "no-cook"],
    [370, 12, 42, 17],
    [["Wholegrain bread", 2, "slice", "Bakery"], ["Peanut butter", 30, "g", "Pantry"], ["Banana", 1, "pc", "Produce"], ["Cinnamon", 1, "pinch", "Pantry"]],
    ["Toast the bread.", "Spread with peanut butter.", "Top with sliced banana and a pinch of cinnamon."]),

  mk("b-frittata-muffins", "Mini Veggie Frittatas", "breakfast", ALL, 25, ["vegetarian", "batch-cook", "gluten-free"],
    [280, 18, 8, 18],
    [["Eggs", 4, "pc", "Dairy"], ["Spinach", 40, "g", "Produce"], ["Cherry tomatoes", 60, "g", "Produce"], ["Feta cheese", 30, "g", "Dairy"]],
    ["Whisk eggs and stir through chopped spinach, tomatoes and feta.", "Pour into a greased muffin tin.", "Bake at 180°C for 15-18 minutes until set."]),

  mk("b-porridge-apple", "Apple Cinnamon Porridge", "breakfast", ["autumn", "winter"], 12, ["vegetarian"],
    [330, 10, 56, 7],
    [["Rolled oats", 60, "g", "Grains"], ["Milk", 200, "ml", "Dairy"], ["Apple", 1, "pc", "Produce"], ["Cinnamon", 1, "tsp", "Pantry"]],
    ["Simmer oats in milk for 5-6 minutes, stirring.", "Dice and stir through the apple and cinnamon.", "Cook 2 more minutes until soft."]),

  mk("b-huevos", "Huevos Rancheros", "breakfast", ALL, 20, ["vegetarian", "gluten-free"],
    [400, 19, 30, 22],
    [["Eggs", 2, "pc", "Dairy"], ["Corn tortilla", 2, "pc", "Bakery"], ["Canned tomatoes", 150, "g", "Pantry"], ["Black beans", 80, "g", "Pantry"], ["Avocado", 0.3, "pc", "Produce"]],
    ["Simmer tomatoes with a pinch of chili to make a quick sauce.", "Fry the eggs.", "Warm tortillas and beans, then plate with sauce, eggs and avocado."]),

  mk("b-breakfast-tacos", "Breakfast Tacos", "breakfast", ALL, 15, ["high-protein"],
    [380, 20, 28, 20],
    [["Corn tortilla", 2, "pc", "Bakery"], ["Eggs", 2, "pc", "Dairy"], ["Chorizo", 40, "g", "Meat"], ["Cheddar cheese", 25, "g", "Dairy"]],
    ["Cook the chorizo until crisp, then scramble in the eggs.", "Warm the tortillas.", "Fill with the egg-chorizo mix and top with cheese."]),

  mk("b-waffles", "Blueberry Waffles", "breakfast", ["summer"], 20, ["vegetarian", "weekend"],
    [440, 12, 62, 16],
    [["Flour", 90, "g", "Pantry"], ["Milk", 130, "ml", "Dairy"], ["Eggs", 1, "pc", "Dairy"], ["Blueberries", 60, "g", "Produce"], ["Maple syrup", 15, "g", "Pantry"]],
    ["Mix flour, milk and egg into a batter and fold in blueberries.", "Cook in a waffle iron until golden.", "Serve with maple syrup."]),

  // ================= LUNCH =================
  mk("l-greek-salad", "Greek Salad with Chickpeas", "lunch", ["summer"], 15, ["vegetarian", "no-cook"],
    [420, 15, 30, 26],
    [["Cucumber", 1, "pc", "Produce"], ["Tomato", 2, "pc", "Produce"], ["Feta cheese", 50, "g", "Dairy"], ["Chickpeas", 120, "g", "Pantry"], ["Olives", 30, "g", "Pantry"], ["Olive oil", 15, "ml", "Pantry"]],
    ["Chop the cucumber and tomato into chunks.", "Toss with chickpeas, feta and olives.", "Dress with olive oil just before serving."]),

  mk("l-grain-bowl", "Roasted Veg Grain Bowl", "lunch", ["autumn"], 35, ["vegan"],
    [480, 14, 62, 18],
    [["Quinoa", 70, "g", "Grains"], ["Sweet potato", 150, "g", "Produce"], ["Broccoli", 100, "g", "Produce"], ["Chickpeas", 100, "g", "Pantry"], ["Tahini", 20, "g", "Pantry"]],
    ["Roast sweet potato and broccoli at 200°C for 20-25 minutes.", "Cook the quinoa according to package directions.", "Combine quinoa, roasted veg and chickpeas in a bowl.", "Finish with a spoonful of tahini."]),

  mk("l-chicken-wrap", "Grilled Chicken Wrap", "lunch", ALL, 20, ["high-protein"],
    [460, 34, 40, 17],
    [["Chicken breast", 120, "g", "Meat"], ["Tortilla wrap", 1, "pc", "Bakery"], ["Lettuce", 40, "g", "Produce"], ["Tomato", 1, "pc", "Produce"], ["Yogurt sauce", 30, "g", "Dairy"]],
    ["Season and grill the chicken breast, then slice.", "Warm the tortilla wrap.", "Layer lettuce, tomato, chicken and yogurt sauce, then roll up."]),

  mk("l-lentil-soup", "Red Lentil Soup", "lunch", ["autumn", "winter"], 30, ["vegan", "batch-cook"],
    [340, 18, 48, 8],
    [["Red lentils", 90, "g", "Pantry"], ["Carrot", 1, "pc", "Produce"], ["Onion", 0.5, "pc", "Produce"], ["Vegetable stock", 400, "ml", "Pantry"], ["Cumin", 1, "tsp", "Pantry"]],
    ["Sauté onion and carrot for 5 minutes.", "Add lentils, stock and cumin, then simmer 20 minutes until soft.", "Blend partially for a creamier texture and season to taste."]),

  mk("l-caprese-pasta", "Caprese Pasta Salad", "lunch", ["summer"], 20, ["vegetarian"],
    [500, 17, 64, 19],
    [["Pasta", 90, "g", "Grains"], ["Cherry tomatoes", 120, "g", "Produce"], ["Mozzarella", 80, "g", "Dairy"], ["Basil", 5, "g", "Produce"], ["Olive oil", 15, "ml", "Pantry"]],
    ["Cook the pasta according to package directions, then cool.", "Halve the cherry tomatoes and cube the mozzarella.", "Toss everything with olive oil and torn basil."]),

  mk("l-tuna-salad", "Tuna & White Bean Salad", "lunch", ALL, 12, ["high-protein", "no-cook", "quick"],
    [400, 32, 28, 16],
    [["Canned tuna", 120, "g", "Pantry"], ["White beans", 100, "g", "Pantry"], ["Red onion", 0.3, "pc", "Produce"], ["Lemon", 0.5, "pc", "Produce"], ["Olive oil", 10, "ml", "Pantry"]],
    ["Drain the tuna and beans.", "Toss with thinly sliced red onion, lemon juice and olive oil."]),

  mk("l-falafel-pita", "Falafel Pita", "lunch", ALL, 25, ["vegan"],
    [520, 18, 62, 22],
    [["Falafel", 6, "pc", "Pantry"], ["Pita bread", 1, "pc", "Bakery"], ["Cucumber", 0.5, "pc", "Produce"], ["Tomato", 0.5, "pc", "Produce"], ["Tahini", 20, "g", "Pantry"]],
    ["Fry or bake the falafel until crisp.", "Warm the pita and split it open.", "Fill with falafel, chopped veg and a drizzle of tahini."]),

  mk("l-caesar-salad", "Chicken Caesar Salad", "lunch", ALL, 20, ["high-protein"],
    [470, 36, 20, 27],
    [["Chicken breast", 120, "g", "Meat"], ["Romaine lettuce", 100, "g", "Produce"], ["Parmesan", 20, "g", "Dairy"], ["Croutons", 25, "g", "Bakery"], ["Caesar dressing", 30, "g", "Pantry"]],
    ["Grill and slice the chicken.", "Toss lettuce with dressing, parmesan and croutons.", "Top with the sliced chicken."]),

  mk("l-soba-bowl", "Miso Soba Noodle Bowl", "lunch", ["autumn", "winter"], 20, ["vegan"],
    [430, 16, 60, 12],
    [["Soba noodles", 90, "g", "Grains"], ["Miso paste", 20, "g", "Pantry"], ["Spinach", 60, "g", "Produce"], ["Spring onion", 1, "pc", "Produce"], ["Sesame oil", 10, "ml", "Pantry"]],
    ["Cook the soba noodles and drain.", "Whisk miso paste into warm water for a broth.", "Combine noodles, broth, spinach and spring onion; drizzle with sesame oil."]),

  mk("l-turkey-sandwich", "Turkey & Avocado Sandwich", "lunch", ALL, 10, ["high-protein", "quick", "no-cook"],
    [440, 28, 38, 18],
    [["Wholegrain bread", 2, "slice", "Bakery"], ["Turkey breast", 80, "g", "Meat"], ["Avocado", 0.4, "pc", "Produce"], ["Lettuce", 20, "g", "Produce"]],
    ["Mash the avocado and spread on one slice of bread.", "Layer turkey and lettuce.", "Close the sandwich and slice."]),

  mk("l-butternut-soup", "Butternut Squash Soup", "lunch", ["autumn", "winter"], 35, ["vegan", "batch-cook"],
    [320, 8, 46, 12],
    [["Butternut squash", 300, "g", "Produce"], ["Onion", 0.5, "pc", "Produce"], ["Vegetable stock", 400, "ml", "Pantry"], ["Coconut milk", 60, "ml", "Pantry"]],
    ["Sauté onion, then add cubed squash and stock.", "Simmer 20 minutes until the squash is tender.", "Blend until smooth and stir through coconut milk."]),

  mk("l-couscous-salad", "Mediterranean Couscous Salad", "lunch", ["summer"], 15, ["vegetarian", "no-cook"],
    [400, 11, 58, 14],
    [["Couscous", 80, "g", "Grains"], ["Cucumber", 0.5, "pc", "Produce"], ["Cherry tomatoes", 80, "g", "Produce"], ["Feta cheese", 40, "g", "Dairy"], ["Lemon", 0.5, "pc", "Produce"]],
    ["Pour boiling water over couscous, cover and let stand 5 minutes.", "Fluff with a fork, then stir through diced veg and feta.", "Finish with a squeeze of lemon."]),

  mk("l-bibimbap", "Bibimbap Bowl", "lunch", ALL, 30, ["high-protein"],
    [520, 26, 64, 18],
    [["Rice", 90, "g", "Grains"], ["Beef strips", 100, "g", "Meat"], ["Carrot", 1, "pc", "Produce"], ["Spinach", 60, "g", "Produce"], ["Egg", 1, "pc", "Dairy"], ["Gochujang", 15, "g", "Pantry"]],
    ["Cook the rice.", "Stir-fry the beef and separately sauté the carrot and spinach.", "Fry an egg sunny-side up.", "Arrange everything over rice with a spoonful of gochujang."]),

  mk("l-chickpea-curry", "Chickpea & Spinach Curry", "lunch", ["autumn", "winter"], 25, ["vegan", "batch-cook"],
    [440, 16, 56, 16],
    [["Chickpeas", 200, "g", "Pantry"], ["Spinach", 80, "g", "Produce"], ["Canned tomatoes", 150, "g", "Pantry"], ["Onion", 0.5, "pc", "Produce"], ["Curry powder", 10, "g", "Pantry"], ["Rice", 70, "g", "Grains"]],
    ["Sauté onion with curry powder until fragrant.", "Add tomatoes and chickpeas, simmer 12-15 minutes.", "Stir through spinach until wilted and serve over rice."]),

  mk("l-blt", "BLT Sandwich", "lunch", ["summer"], 12, ["quick"],
    [460, 18, 34, 28],
    [["Bacon", 60, "g", "Meat"], ["Sourdough bread", 2, "slice", "Bakery"], ["Lettuce", 20, "g", "Produce"], ["Tomato", 1, "pc", "Produce"], ["Mayonnaise", 15, "g", "Pantry"]],
    ["Fry the bacon until crisp.", "Toast the bread and spread with mayonnaise.", "Layer bacon, lettuce and tomato, then close and slice."]),

  mk("l-poke-bowl", "Poke Bowl", "lunch", ["summer"], 20, ["high-protein", "gluten-free"],
    [480, 30, 52, 16],
    [["Sushi rice", 80, "g", "Grains"], ["Raw tuna", 120, "g", "Fish"], ["Avocado", 0.4, "pc", "Produce"], ["Cucumber", 0.4, "pc", "Produce"], ["Soy sauce", 15, "ml", "Pantry"]],
    ["Cook and cool the sushi rice.", "Cube the tuna and marinate briefly in soy sauce.", "Assemble rice, tuna, avocado and cucumber in a bowl."]),

  mk("l-minestrone", "Minestrone Soup", "lunch", ["autumn", "winter"], 30, ["vegetarian", "batch-cook"],
    [340, 13, 50, 9],
    [["Canned tomatoes", 200, "g", "Pantry"], ["Carrot", 1, "pc", "Produce"], ["Celery", 1, "stalk", "Produce"], ["White beans", 100, "g", "Pantry"], ["Pasta", 40, "g", "Grains"]],
    ["Sauté carrot and celery for 5 minutes.", "Add tomatoes, beans and stock, simmer 15 minutes.", "Add pasta and cook until tender."]),

  mk("l-caprese-sandwich", "Caprese Sandwich", "lunch", ["summer"], 8, ["vegetarian", "quick", "no-cook"],
    [420, 16, 36, 24],
    [["Ciabatta roll", 1, "pc", "Bakery"], ["Mozzarella", 70, "g", "Dairy"], ["Tomato", 1, "pc", "Produce"], ["Basil", 5, "g", "Produce"], ["Olive oil", 10, "ml", "Pantry"]],
    ["Slice the ciabatta and drizzle with olive oil.", "Layer mozzarella, tomato and basil.", "Close and press lightly before serving."]),

  mk("l-thai-peanut-noodles", "Thai Peanut Noodle Salad", "lunch", ["summer"], 18, ["vegan"],
    [460, 14, 58, 18],
    [["Rice noodles", 90, "g", "Grains"], ["Peanut butter", 25, "g", "Pantry"], ["Carrot", 1, "pc", "Produce"], ["Cabbage", 60, "g", "Produce"], ["Lime", 0.5, "pc", "Produce"]],
    ["Cook the rice noodles and cool.", "Whisk peanut butter with lime juice and a little water for the dressing.", "Toss noodles with shredded carrot, cabbage and dressing."]),

  mk("l-tabbouleh", "Quinoa Tabbouleh", "lunch", ["summer"], 15, ["vegan", "no-cook", "gluten-free"],
    [340, 10, 44, 12],
    [["Quinoa", 80, "g", "Grains"], ["Parsley", 30, "g", "Produce"], ["Tomato", 1, "pc", "Produce"], ["Cucumber", 0.5, "pc", "Produce"], ["Lemon", 0.5, "pc", "Produce"]],
    ["Cook the quinoa and cool completely.", "Finely chop parsley, tomato and cucumber.", "Toss everything together with lemon juice and olive oil."]),

  mk("l-chicken-noodle-soup", "Chicken Noodle Soup", "lunch", ["autumn", "winter"], 30, ["high-protein", "batch-cook"],
    [380, 26, 40, 10],
    [["Chicken breast", 120, "g", "Meat"], ["Egg noodles", 60, "g", "Grains"], ["Carrot", 1, "pc", "Produce"], ["Celery", 1, "stalk", "Produce"], ["Chicken stock", 500, "ml", "Pantry"]],
    ["Poach the chicken in stock until cooked, then shred.", "Add carrot and celery, simmer 10 minutes.", "Add noodles and cook until tender; return chicken to the pot."]),

  mk("l-banh-mi", "Vietnamese Banh Mi", "lunch", ALL, 20, ["high-protein"],
    [480, 24, 48, 20],
    [["Baguette", 1, "pc", "Bakery"], ["Pork tenderloin", 100, "g", "Meat"], ["Carrot", 0.5, "pc", "Produce"], ["Cucumber", 0.3, "pc", "Produce"], ["Mayonnaise", 15, "g", "Pantry"]],
    ["Cook and slice the pork.", "Quick-pickle shredded carrot in a little vinegar and sugar.", "Split the baguette, spread with mayonnaise, and fill with pork, pickled carrot and cucumber."]),

  mk("l-broccoli-cheddar-soup", "Broccoli Cheddar Soup", "lunch", ["winter"], 25, ["vegetarian"],
    [420, 17, 26, 28],
    [["Broccoli", 250, "g", "Produce"], ["Cheddar cheese", 80, "g", "Dairy"], ["Onion", 0.5, "pc", "Produce"], ["Vegetable stock", 350, "ml", "Pantry"], ["Milk", 100, "ml", "Dairy"]],
    ["Sauté onion, then add broccoli and stock and simmer until tender.", "Blend until mostly smooth.", "Stir in milk and cheddar off the heat until melted."]),

  // ================= DINNER =================
  mk("d-salmon-veg", "Baked Salmon & Greens", "dinner", ALL, 30, ["high-protein", "gluten-free"],
    [520, 38, 20, 30],
    [["Salmon fillet", 150, "g", "Fish"], ["Broccoli", 120, "g", "Produce"], ["Lemon", 0.5, "pc", "Produce"], ["Olive oil", 10, "ml", "Pantry"], ["New potatoes", 150, "g", "Produce"]],
    ["Roast the potatoes at 200°C for 15 minutes.", "Add salmon and broccoli to the tray with olive oil and lemon.", "Roast a further 12-15 minutes until the salmon flakes."]),

  mk("d-veg-curry", "Coconut Vegetable Curry", "dinner", ["autumn", "winter"], 40, ["vegan", "batch-cook"],
    [540, 14, 62, 24],
    [["Coconut milk", 200, "ml", "Pantry"], ["Sweet potato", 150, "g", "Produce"], ["Chickpeas", 120, "g", "Pantry"], ["Spinach", 80, "g", "Produce"], ["Rice", 80, "g", "Grains"], ["Curry paste", 20, "g", "Pantry"]],
    ["Fry the curry paste briefly, then add coconut milk and sweet potato.", "Simmer 15-20 minutes until the sweet potato is tender.", "Stir in chickpeas and spinach, and serve over rice."]),

  mk("d-steak-potatoes", "Pan-Seared Steak & Potatoes", "dinner", ALL, 35, ["high-protein"],
    [620, 42, 34, 32],
    [["Beef steak", 150, "g", "Meat"], ["New potatoes", 200, "g", "Produce"], ["Green beans", 100, "g", "Produce"], ["Butter", 15, "g", "Dairy"]],
    ["Boil the potatoes until tender.", "Sear the steak in a hot pan, 2-4 minutes per side, then rest.", "Sauté green beans in butter and serve alongside."]),

  mk("d-pasta-tomato", "Pasta al Pomodoro", "dinner", ["summer", "autumn"], 25, ["vegetarian", "quick"],
    [560, 16, 88, 15],
    [["Pasta", 100, "g", "Grains"], ["Canned tomatoes", 250, "g", "Pantry"], ["Garlic", 2, "clove", "Produce"], ["Basil", 5, "g", "Produce"], ["Parmesan", 20, "g", "Dairy"]],
    ["Cook the pasta according to package directions.", "Sauté garlic, then add tomatoes and simmer 12-15 minutes.", "Toss the pasta through the sauce and finish with basil and parmesan."]),

  mk("d-stirfry-tofu", "Sesame Tofu Stir-fry", "dinner", ALL, 25, ["vegan", "quick"],
    [460, 24, 46, 20],
    [["Tofu", 150, "g", "Pantry"], ["Broccoli", 100, "g", "Produce"], ["Bell pepper", 1, "pc", "Produce"], ["Rice", 80, "g", "Grains"], ["Soy sauce", 15, "ml", "Pantry"], ["Sesame oil", 10, "ml", "Pantry"]],
    ["Cook the rice.", "Pan-fry cubed tofu until golden, then set aside.", "Stir-fry broccoli and pepper, return tofu, add soy sauce and sesame oil, and serve over rice."]),

  mk("d-chicken-traybake", "Roast Chicken Traybake", "dinner", ["autumn", "winter"], 45, ["high-protein", "batch-cook"],
    [580, 40, 36, 28],
    [["Chicken thighs", 200, "g", "Meat"], ["New potatoes", 200, "g", "Produce"], ["Carrot", 1, "pc", "Produce"], ["Red onion", 0.5, "pc", "Produce"], ["Olive oil", 15, "ml", "Pantry"]],
    ["Toss chicken and vegetables with olive oil on a tray.", "Roast at 200°C for 35-40 minutes until the chicken is cooked through.", "Rest 5 minutes before serving."]),

  mk("d-fishtacos", "Baja Fish Tacos", "dinner", ["summer"], 30, ["high-protein"],
    [500, 30, 44, 20],
    [["White fish fillet", 150, "g", "Fish"], ["Tortilla wrap", 2, "pc", "Bakery"], ["Cabbage", 60, "g", "Produce"], ["Lime", 0.5, "pc", "Produce"], ["Yogurt sauce", 30, "g", "Dairy"]],
    ["Season and pan-fry the fish until just cooked.", "Warm the tortillas.", "Fill with fish, shredded cabbage, a squeeze of lime and yogurt sauce."]),

  mk("d-bolognese", "Spaghetti Bolognese", "dinner", ["autumn", "winter"], 40, ["high-protein", "batch-cook"],
    [600, 32, 70, 20],
    [["Spaghetti", 100, "g", "Grains"], ["Ground beef", 150, "g", "Meat"], ["Canned tomatoes", 250, "g", "Pantry"], ["Onion", 0.5, "pc", "Produce"], ["Carrot", 0.5, "pc", "Produce"]],
    ["Brown the beef with onion and carrot.", "Add tomatoes and simmer uncovered 20-25 minutes.", "Cook the spaghetti and toss with the sauce."]),

  mk("d-tikka-masala", "Chicken Tikka Masala", "dinner", ["autumn", "winter"], 40, ["high-protein"],
    [560, 38, 42, 24],
    [["Chicken breast", 150, "g", "Meat"], ["Canned tomatoes", 200, "g", "Pantry"], ["Yogurt", 60, "g", "Dairy"], ["Garam masala", 10, "g", "Pantry"], ["Rice", 80, "g", "Grains"]],
    ["Marinate the chicken in yogurt and half the spice for 15 minutes if time allows.", "Sear the chicken, then add tomatoes and remaining spice; simmer 15 minutes.", "Serve over rice."]),

  mk("d-beef-broccoli", "Beef and Broccoli Stir-fry", "dinner", ALL, 25, ["high-protein", "quick"],
    [500, 34, 36, 22],
    [["Beef strips", 150, "g", "Meat"], ["Broccoli", 150, "g", "Produce"], ["Soy sauce", 20, "ml", "Pantry"], ["Garlic", 2, "clove", "Produce"], ["Rice", 80, "g", "Grains"]],
    ["Sear the beef strips quickly over high heat, then set aside.", "Stir-fry broccoli and garlic, then return the beef with soy sauce.", "Serve over rice."]),

  mk("d-margherita-pizza", "Margherita Pizza", "dinner", ["summer"], 35, ["vegetarian", "weekend"],
    [620, 24, 78, 22],
    [["Pizza dough", 200, "g", "Bakery"], ["Canned tomatoes", 100, "g", "Pantry"], ["Mozzarella", 100, "g", "Dairy"], ["Basil", 5, "g", "Produce"]],
    ["Stretch the dough onto a tray.", "Spread with crushed tomatoes and top with mozzarella.", "Bake at the oven's highest setting for 8-10 minutes; finish with fresh basil."]),

  mk("d-veg-lasagna", "Vegetable Lasagna", "dinner", ["autumn", "winter"], 55, ["vegetarian", "batch-cook"],
    [560, 22, 58, 26],
    [["Lasagna sheets", 90, "g", "Grains"], ["Zucchini", 100, "g", "Produce"], ["Canned tomatoes", 200, "g", "Pantry"], ["Ricotta", 80, "g", "Dairy"], ["Mozzarella", 60, "g", "Dairy"]],
    ["Sauté the zucchini and combine with the tomato sauce.", "Layer sauce, lasagna sheets and ricotta in a dish, repeating.", "Top with mozzarella and bake at 190°C for 30 minutes."]),

  mk("d-shrimp-scampi", "Shrimp Scampi", "dinner", ALL, 20, ["high-protein", "quick"],
    [540, 30, 62, 18],
    [["Shrimp", 150, "g", "Fish"], ["Spaghetti", 90, "g", "Grains"], ["Garlic", 3, "clove", "Produce"], ["Butter", 20, "g", "Dairy"], ["Lemon", 0.5, "pc", "Produce"]],
    ["Cook the spaghetti.", "Sauté garlic in butter, add shrimp and cook until pink.", "Toss with the pasta and a squeeze of lemon."]),

  mk("d-pork-apples", "Pork Tenderloin with Apples", "dinner", ["autumn"], 35, ["high-protein"],
    [520, 36, 30, 24],
    [["Pork tenderloin", 180, "g", "Meat"], ["Apple", 1, "pc", "Produce"], ["Onion", 0.5, "pc", "Produce"], ["New potatoes", 150, "g", "Produce"]],
    ["Sear the pork tenderloin on all sides.", "Add sliced apple and onion to the pan and roast at 190°C for 20 minutes.", "Rest, slice, and serve with boiled potatoes."]),

  mk("d-black-bean-enchiladas", "Black Bean Enchiladas", "dinner", ALL, 35, ["vegetarian", "batch-cook"],
    [480, 18, 58, 18],
    [["Corn tortilla", 3, "pc", "Bakery"], ["Black beans", 150, "g", "Pantry"], ["Canned tomatoes", 150, "g", "Pantry"], ["Cheddar cheese", 50, "g", "Dairy"]],
    ["Fill tortillas with black beans and roll up in a baking dish.", "Cover with tomato sauce and cheese.", "Bake at 190°C for 15-20 minutes until bubbling."]),

  mk("d-lemon-herb-chicken", "Lemon Herb Roast Chicken", "dinner", ["spring"], 50, ["high-protein", "gluten-free", "batch-cook"],
    [560, 42, 22, 30],
    [["Chicken thighs", 220, "g", "Meat"], ["Lemon", 1, "pc", "Produce"], ["New potatoes", 180, "g", "Produce"], ["Rosemary", 1, "sprig", "Produce"]],
    ["Toss chicken and potatoes with lemon juice, zest and rosemary.", "Roast at 200°C for 35-40 minutes until golden and cooked through."]),

  mk("d-mushroom-risotto", "Mushroom Risotto", "dinner", ["autumn", "winter"], 40, ["vegetarian"],
    [540, 14, 76, 18],
    [["Arborio rice", 90, "g", "Grains"], ["Mushrooms", 150, "g", "Produce"], ["Vegetable stock", 500, "ml", "Pantry"], ["Parmesan", 30, "g", "Dairy"], ["Onion", 0.3, "pc", "Produce"]],
    ["Sauté onion and mushrooms, then add rice and toast briefly.", "Add warm stock a ladle at a time, stirring, for about 18-20 minutes until creamy.", "Stir in parmesan off the heat."]),

  mk("d-teriyaki-salmon", "Teriyaki Salmon Bowl", "dinner", ALL, 25, ["high-protein"],
    [560, 36, 54, 20],
    [["Salmon fillet", 150, "g", "Fish"], ["Rice", 90, "g", "Grains"], ["Teriyaki sauce", 30, "ml", "Pantry"], ["Broccoli", 100, "g", "Produce"], ["Sesame seeds", 5, "g", "Pantry"]],
    ["Pan-fry the salmon and glaze with teriyaki sauce in the last minute.", "Steam the broccoli and cook the rice.", "Assemble in a bowl and sprinkle with sesame seeds."]),

  mk("d-chili-con-carne", "Chili Con Carne", "dinner", ["autumn", "winter"], 45, ["high-protein", "batch-cook"],
    [540, 34, 46, 22],
    [["Ground beef", 150, "g", "Meat"], ["Kidney beans", 150, "g", "Pantry"], ["Canned tomatoes", 200, "g", "Pantry"], ["Onion", 0.5, "pc", "Produce"], ["Chili powder", 10, "g", "Pantry"]],
    ["Brown the beef with onion and chili powder.", "Add tomatoes and beans, then simmer uncovered 25-30 minutes.", "Serve with rice or bread."]),

  mk("d-eggplant-parm", "Eggplant Parmesan", "dinner", ["summer", "autumn"], 45, ["vegetarian", "batch-cook"],
    [500, 20, 42, 28],
    [["Eggplant", 1, "pc", "Produce"], ["Canned tomatoes", 200, "g", "Pantry"], ["Mozzarella", 80, "g", "Dairy"], ["Parmesan", 20, "g", "Dairy"]],
    ["Slice and roast the eggplant at 200°C for 15 minutes.", "Layer with tomato sauce and cheeses in a dish.", "Bake a further 20 minutes until golden and bubbling."]),

  mk("d-katsu-curry", "Katsu Curry", "dinner", ["autumn", "winter"], 35, ["high-protein"],
    [620, 32, 68, 24],
    [["Chicken breast", 150, "g", "Meat"], ["Breadcrumbs", 40, "g", "Pantry"], ["Curry sauce", 150, "g", "Pantry"], ["Rice", 90, "g", "Grains"]],
    ["Coat the chicken in breadcrumbs and pan-fry until golden and cooked through.", "Warm the curry sauce.", "Slice the chicken and serve over rice with sauce."]),

  mk("d-moroccan-stew", "Moroccan Chickpea Stew", "dinner", ["winter"], 35, ["vegan", "batch-cook"],
    [460, 16, 64, 14],
    [["Chickpeas", 200, "g", "Pantry"], ["Canned tomatoes", 200, "g", "Pantry"], ["Carrot", 1, "pc", "Produce"], ["Cumin", 1, "tsp", "Pantry"], ["Couscous", 60, "g", "Grains"]],
    ["Sauté carrot with cumin, then add tomatoes and chickpeas.", "Simmer 20 minutes until the carrot is tender.", "Serve over couscous."]),

  mk("d-garlic-shrimp-pasta", "Garlic Butter Shrimp Pasta", "dinner", ALL, 22, ["high-protein", "quick"],
    [580, 32, 64, 20],
    [["Shrimp", 150, "g", "Fish"], ["Pasta", 100, "g", "Grains"], ["Garlic", 3, "clove", "Produce"], ["Butter", 20, "g", "Dairy"], ["Parsley", 5, "g", "Produce"]],
    ["Cook the pasta.", "Sauté garlic in butter, add shrimp and cook until pink.", "Toss with pasta and chopped parsley."]),
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}
