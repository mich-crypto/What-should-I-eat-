// Mifflin-St Jeor BMR + activity multiplier + goal adjustment, then a
// standard macro split. Simple, transparent, editable in Settings.

export function computeTargets(settings) {
  const { sex, age, heightCm, weightKg, activity, goal } = settings;
  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  let tdee = bmr * activity;
  if (goal === "lose") tdee -= 400;
  if (goal === "gain") tdee += 350;
  tdee = Math.max(1200, Math.round(tdee));

  // Macro split: 30% protein / 40% carbs / 30% fat (kcal), converted to grams.
  const protein = Math.round((tdee * 0.3) / 4);
  const carbs = Math.round((tdee * 0.4) / 4);
  const fat = Math.round((tdee * 0.3) / 9);

  return { kcal: tdee, protein, carbs, fat };
}

export function sumNutrition(recipes) {
  return recipes.reduce(
    (acc, r) => {
      if (!r) return acc;
      acc.kcal += r.nutrition.kcal;
      acc.protein += r.nutrition.protein;
      acc.carbs += r.nutrition.carbs;
      acc.fat += r.nutrition.fat;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function pct(value, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}
