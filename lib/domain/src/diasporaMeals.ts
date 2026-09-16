import type {
  BalancedMealTemplate,
  CommonAllergen,
  NutritionFacts,
} from "./balancedMeals";
import {
  CURATED_FOOD_CATALOG,
  curatedFoodSupportsDiet,
  type CuratedFoodItem,
} from "./foodCatalog";

export interface DiasporaMealIngredientEvidence {
  foodId: string;
  grams: number;
  label?: string;
}

export interface DiasporaMealEvidence {
  id: string;
  name: string;
  servingDescription: string;
  cuisine: string;
  ingredients: readonly DiasporaMealIngredientEvidence[];
}

const FOOD_BY_ID = new Map(
  CURATED_FOOD_CATALOG.map((food) => [food.id, food] as const),
);

function foodFor(seed: DiasporaMealIngredientEvidence): CuratedFoodItem {
  const food = FOOD_BY_ID.get(seed.foodId);
  if (!food) throw new Error(`Unknown curated food: ${seed.foodId}`);
  return food;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function nutritionForIngredients(
  ingredients: readonly DiasporaMealIngredientEvidence[],
): NutritionFacts {
  const total = ingredients.reduce<NutritionFacts>(
    (sum, ingredient) => {
      const food = foodFor(ingredient);
      const factor = ingredient.grams / food.servingGrams;
      return {
        caloriesKcal:
          sum.caloriesKcal + food.nutritionPerServing.caloriesKcal * factor,
        proteinG: sum.proteinG + food.nutritionPerServing.proteinG * factor,
        carbsG: sum.carbsG + food.nutritionPerServing.carbsG * factor,
        fatG: sum.fatG + food.nutritionPerServing.fatG * factor,
        fiberG: sum.fiberG + food.nutritionPerServing.fiberG * factor,
      };
    },
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
  return {
    caloriesKcal: round(total.caloriesKcal, 0),
    proteinG: round(total.proteinG, 1),
    carbsG: round(total.carbsG, 1),
    fatG: round(total.fatG, 1),
    fiberG: round(total.fiberG, 1),
  };
}

function dietaryTagsForIngredients(
  ingredients: readonly DiasporaMealIngredientEvidence[],
): readonly string[] {
  const foods = ingredients.map(foodFor);
  if (foods.every((food) => curatedFoodSupportsDiet(food, "vegan"))) {
    return ["vegan"];
  }
  if (foods.every((food) => curatedFoodSupportsDiet(food, "vegetarian"))) {
    return ["vegetarian"];
  }
  if (foods.every((food) => curatedFoodSupportsDiet(food, "pescatarian"))) {
    return ["pescatarian"];
  }
  return [];
}

function allergensForIngredients(
  ingredients: readonly DiasporaMealIngredientEvidence[],
): readonly CommonAllergen[] {
  return [
    ...new Set(
      ingredients.flatMap((ingredient) => foodFor(ingredient).commonAllergens),
    ),
  ].sort();
}

function makeMeal(seed: DiasporaMealEvidence): BalancedMealTemplate {
  return {
    id: seed.id,
    name: seed.name,
    servingDescription: seed.servingDescription,
    cuisine: seed.cuisine,
    ingredients: seed.ingredients.map((ingredient) => {
      const food = foodFor(ingredient);
      return `${ingredient.grams} g ${ingredient.label ?? food.name}`;
    }),
    dietaryTags: dietaryTagsForIngredients(seed.ingredients),
    commonAllergens: allergensForIngredients(seed.ingredients),
    nutritionPerServing: nutritionForIngredients(seed.ingredients),
  };
}

const BENGALI_MASALA: readonly DiasporaMealIngredientEvidence[] = [
  { foodId: "tomato-raw", grams: 80, label: "tomato" },
  { foodId: "onion-raw", grams: 50, label: "onion" },
  { foodId: "garlic-raw", grams: 5, label: "garlic" },
  { foodId: "ginger-raw", grams: 5, label: "ginger" },
  { foodId: "canola-oil", grams: 5, label: "cooking oil" },
  { foodId: "cumin-ground", grams: 1, label: "ground cumin" },
  { foodId: "coriander-seed-ground", grams: 1, label: "ground coriander" },
  { foodId: "turmeric-ground", grams: 1, label: "ground turmeric" },
  { foodId: "chili-powder", grams: 1, label: "chili powder" },
  { foodId: "table-salt", grams: 1, label: "salt" },
];

const LIGHT_MASALA: readonly DiasporaMealIngredientEvidence[] = [
  { foodId: "tomato-raw", grams: 60, label: "tomato" },
  { foodId: "onion-raw", grams: 40, label: "onion" },
  { foodId: "garlic-raw", grams: 4, label: "garlic" },
  { foodId: "ginger-raw", grams: 4, label: "ginger" },
  { foodId: "canola-oil", grams: 4, label: "cooking oil" },
  { foodId: "cumin-ground", grams: 1, label: "ground cumin" },
  { foodId: "turmeric-ground", grams: 1, label: "ground turmeric" },
  { foodId: "table-salt", grams: 1, label: "salt" },
];

const KACHUMBER: readonly DiasporaMealIngredientEvidence[] = [
  { foodId: "cucumber-raw", grams: 100, label: "cucumber" },
  { foodId: "tomato-raw", grams: 60, label: "tomato" },
  { foodId: "onion-raw", grams: 25, label: "onion" },
  { foodId: "lime-juice", grams: 15, label: "lime juice" },
  { foodId: "cilantro-raw", grams: 5, label: "cilantro" },
];

const SHORSHE_BASE: readonly DiasporaMealIngredientEvidence[] = [
  { foodId: "mustard-seed-ground", grams: 8, label: "ground mustard seed" },
  { foodId: "green-chili-raw", grams: 4, label: "green chili" },
  { foodId: "turmeric-ground", grams: 1, label: "ground turmeric" },
  { foodId: "canola-oil", grams: 5, label: "cooking oil" },
  { foodId: "table-salt", grams: 1, label: "salt" },
];

export const DIASPORA_MEAL_SOURCE_RECIPES: readonly DiasporaMealEvidence[] = [
  {
    id: "murgir-jhol-bhaat-lau",
    name: "Murgir Jhol-Style Bhaat & Lau",
    servingDescription:
      "One plate of light chicken curry, rice, and bottle gourd",
    cuisine: "Bengali home-style",
    ingredients: [
      { foodId: "chicken-breast-stewed", grams: 150 },
      { foodId: "rice-white-cooked", grams: 150, label: "cooked white rice" },
      {
        foodId: "bottle-gourd-cooked",
        grams: 150,
        label: "cooked bottle gourd (lau)",
      },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "chicken-bhuna-roti-kachumber",
    name: "Chicken Bhuna-Style Roti Plate",
    servingDescription:
      "One plate of concentrated chicken masala, roti, and kachumber",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      { foodId: "chicken-thigh-roasted", grams: 150 },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
      ...KACHUMBER,
    ],
  },
  {
    id: "murgir-jhol-bhaat-begun",
    name: "Murgir Jhol-Style Bhaat & Begun",
    servingDescription: "One plate of chicken curry, rice, and soft eggplant",
    cuisine: "Bengali home-style",
    ingredients: [
      { foodId: "chicken-breast-stewed", grams: 150 },
      { foodId: "rice-white-cooked", grams: 140, label: "cooked white rice" },
      {
        foodId: "eggplant-cooked",
        grams: 130,
        label: "cooked eggplant (begun)",
      },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "chicken-shobji-khichuri",
    name: "Chicken Shobji Khichuri-Style Bowl",
    servingDescription:
      "One bowl of chicken, rice, lentils, and mixed vegetables",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      { foodId: "chicken-breast-stewed", grams: 120 },
      { foodId: "rice-white-cooked", grams: 100, label: "cooked white rice" },
      { foodId: "lentils-cooked", grams: 110, label: "cooked lentils" },
      { foodId: "cauliflower-cooked", grams: 80 },
      { foodId: "green-peas-cooked", grams: 50 },
      { foodId: "carrots-cooked", grams: 50 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "dim-masoor-khichuri",
    name: "Dim Masoor Khichuri-Style Bowl",
    servingDescription: "One bowl of egg, rice, red lentils, and vegetables",
    cuisine: "Bengali home-style",
    ingredients: [
      { foodId: "egg-hard-boiled", grams: 100, label: "hard-boiled egg (dim)" },
      { foodId: "rice-white-cooked", grams: 100, label: "cooked white rice" },
      { foodId: "lentils-cooked", grams: 140, label: "cooked red lentils" },
      { foodId: "cauliflower-cooked", grams: 80 },
      { foodId: "green-peas-cooked", grams: 50 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "mung-shobji-khichuri",
    name: "Mung Shobji Khichuri-Style Bowl",
    servingDescription:
      "One plant-based bowl of rice, mung beans, and vegetables",
    cuisine: "Bengali home-style",
    ingredients: [
      { foodId: "rice-white-cooked", grams: 110, label: "cooked white rice" },
      { foodId: "mung-beans-cooked", grams: 170, label: "cooked mung beans" },
      { foodId: "cauliflower-cooked", grams: 80 },
      { foodId: "green-peas-cooked", grams: 50 },
      { foodId: "carrots-cooked", grams: 50 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "tilapia-jhol-rice-spinach",
    name: "Tilapia Jhol-Style Rice & Spinach",
    servingDescription: "One plate of light fish curry, rice, and spinach",
    cuisine: "North American Bengali home-style",
    ingredients: [
      { foodId: "tilapia-cooked", grams: 160 },
      { foodId: "rice-white-cooked", grams: 150, label: "cooked white rice" },
      { foodId: "spinach-cooked", grams: 120 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "carp-jhol-rice-lau",
    name: "Rui-Style Carp Jhol & Lau",
    servingDescription: "One plate of carp curry, rice, and bottle gourd",
    cuisine: "Bengali home-style",
    ingredients: [
      { foodId: "carp-cooked", grams: 160, label: "cooked carp (rui-style)" },
      { foodId: "rice-white-cooked", grams: 150, label: "cooked white rice" },
      {
        foodId: "bottle-gourd-cooked",
        grams: 140,
        label: "cooked bottle gourd (lau)",
      },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "cod-shorshe-rice-greens",
    name: "Shorshe-Style Cod Rice Plate",
    servingDescription:
      "One plate of mustard-style cod, rice, and mustard greens",
    cuisine: "North American Bengali home-style",
    ingredients: [
      { foodId: "cod-cooked", grams: 170 },
      { foodId: "rice-white-cooked", grams: 150, label: "cooked white rice" },
      { foodId: "mustard-greens-cooked", grams: 120 },
      ...SHORSHE_BASE,
    ],
  },
  {
    id: "salmon-shorshe-rice-okra",
    name: "Shorshe-Style Salmon & Okra",
    servingDescription: "One plate of mustard-style salmon, rice, and okra",
    cuisine: "North American Bengali home-style",
    ingredients: [
      { foodId: "salmon-cooked", grams: 150 },
      { foodId: "rice-white-cooked", grams: 130, label: "cooked white rice" },
      { foodId: "okra-cooked", grams: 130 },
      ...SHORSHE_BASE,
    ],
  },
  {
    id: "chingri-lau-bhaat",
    name: "Chingri-Lau-Style Bhaat Plate",
    servingDescription: "One plate of shrimp and bottle gourd curry with rice",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      { foodId: "shrimp-cooked", grams: 160, label: "cooked shrimp (chingri)" },
      {
        foodId: "bottle-gourd-cooked",
        grams: 180,
        label: "cooked bottle gourd (lau)",
      },
      { foodId: "rice-white-cooked", grams: 140, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "chingri-kumra-dal-bhaat",
    name: "Chingri Kumra, Dal & Bhaat",
    servingDescription: "One plate of shrimp-pumpkin curry, lentils, and rice",
    cuisine: "Bengali home-style",
    ingredients: [
      { foodId: "shrimp-cooked", grams: 130, label: "cooked shrimp (chingri)" },
      { foodId: "pumpkin-cooked", grams: 160, label: "cooked pumpkin (kumra)" },
      { foodId: "lentils-cooked", grams: 100, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 120, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "dim-bhuna-dal-bhaat",
    name: "Dim Bhuna-Style Dal & Bhaat",
    servingDescription: "One plate of egg masala, lentils, and rice",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      { foodId: "egg-hard-boiled", grams: 100, label: "hard-boiled egg (dim)" },
      { foodId: "lentils-cooked", grams: 130, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 130, label: "cooked white rice" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "dim-roti-palak",
    name: "Dim, Roti & Palak Plate",
    servingDescription: "One plate of eggs, roti, and spinach",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "egg-hard-boiled", grams: 100, label: "hard-boiled egg (dim)" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      { foodId: "spinach-cooked", grams: 140, label: "cooked spinach (palak)" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "aloo-begun-bhorta-dal-bhaat",
    name: "Aloo-Begun Bhorta-Style Dal Plate",
    servingDescription: "One plate of potato-eggplant mash, lentils, and rice",
    cuisine: "Bangladeshi home-style",
    ingredients: [
      { foodId: "potato-boiled", grams: 120, label: "boiled potato (aloo)" },
      {
        foodId: "eggplant-cooked",
        grams: 120,
        label: "cooked eggplant (begun)",
      },
      { foodId: "lentils-cooked", grams: 160, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 120, label: "cooked white rice" },
      { foodId: "onion-raw", grams: 30, label: "chopped onion" },
      { foodId: "green-chili-raw", grams: 3, label: "green chili" },
      { foodId: "canola-oil", grams: 4, label: "cooking oil" },
    ],
  },
  {
    id: "tuna-bhorta-dal-bhaat",
    name: "Tuna Bhorta-Style Dal & Bhaat",
    servingDescription:
      "One diaspora plate of tuna mash, lentils, rice, and cucumber",
    cuisine: "North American Bangladeshi home-style",
    ingredients: [
      { foodId: "tuna-canned-water", grams: 140, label: "water-packed tuna" },
      { foodId: "lentils-cooked", grams: 140, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 130, label: "cooked white rice" },
      { foodId: "onion-raw", grams: 30, label: "chopped onion" },
      { foodId: "green-chili-raw", grams: 3, label: "green chili" },
      { foodId: "canola-oil", grams: 4, label: "cooking oil" },
      { foodId: "cucumber-raw", grams: 100 },
    ],
  },
  {
    id: "sardine-bhorta-bhaat-cucumber",
    name: "Sardine Bhorta-Style Bhaat Plate",
    servingDescription:
      "One diaspora plate of sardine mash, rice, and cucumber",
    cuisine: "North American Bangladeshi home-style",
    ingredients: [
      {
        foodId: "sardines-canned-oil",
        grams: 110,
        label: "drained canned sardines",
      },
      { foodId: "rice-white-cooked", grams: 150, label: "cooked white rice" },
      { foodId: "onion-raw", grams: 35, label: "chopped onion" },
      { foodId: "green-chili-raw", grams: 3, label: "green chili" },
      { foodId: "lime-juice", grams: 15 },
      { foodId: "cucumber-raw", grams: 120 },
    ],
  },
  {
    id: "masoor-dal-bhaat-dherosh-bhaji",
    name: "Masoor Dal, Bhaat & Dherosh Bhaji",
    servingDescription: "One plant-based plate of lentils, rice, and okra",
    cuisine: "Bengali home-style",
    ingredients: [
      {
        foodId: "lentils-cooked",
        grams: 190,
        label: "cooked red lentils (masoor dal)",
      },
      { foodId: "rice-white-cooked", grams: 130, label: "cooked white rice" },
      { foodId: "okra-cooked", grams: 150, label: "cooked okra (dherosh)" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "mung-dal-bhaat-badha-kopi-bhaji",
    name: "Mung Dal, Bhaat & Cabbage Bhaji",
    servingDescription:
      "One plant-based plate of mung beans, rice, and cabbage",
    cuisine: "Bengali home-style",
    ingredients: [
      {
        foodId: "mung-beans-cooked",
        grams: 190,
        label: "cooked mung beans (mung dal)",
      },
      { foodId: "rice-white-cooked", grams: 130, label: "cooked white rice" },
      { foodId: "cabbage-cooked", grams: 160, label: "cooked cabbage" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "split-pea-dal-roti-phulkopi",
    name: "Split-Pea Dal, Roti & Phulkopi",
    servingDescription: "One plant-based plate of dal, roti, and cauliflower",
    cuisine: "North American Desi weeknight",
    ingredients: [
      {
        foodId: "split-peas-cooked",
        grams: 190,
        label: "cooked split-pea dal",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      {
        foodId: "cauliflower-cooked",
        grams: 160,
        label: "cooked cauliflower (phulkopi)",
      },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "korola-dim-dal-bhaat",
    name: "Korola, Dim, Dal & Bhaat",
    servingDescription: "One plate of bitter gourd, egg, lentils, and rice",
    cuisine: "Bengali home-style",
    ingredients: [
      {
        foodId: "bitter-gourd-cooked",
        grams: 110,
        label: "cooked bitter gourd (korola)",
      },
      { foodId: "egg-hard-boiled", grams: 100, label: "hard-boiled egg (dim)" },
      { foodId: "lentils-cooked", grams: 120, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 110, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "lau-murgi-dal-bhaat",
    name: "Lau-Murgi, Dal & Bhaat",
    servingDescription:
      "One plate of chicken and bottle gourd curry, dal, and rice",
    cuisine: "Bangladeshi home-style",
    ingredients: [
      { foodId: "chicken-breast-stewed", grams: 130 },
      {
        foodId: "bottle-gourd-cooked",
        grams: 180,
        label: "cooked bottle gourd (lau)",
      },
      { foodId: "lentils-cooked", grams: 100, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 110, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "kumra-murgi-masoor-bowl",
    name: "Kumra-Murgi Masoor Bowl",
    servingDescription: "One bowl of chicken, pumpkin, lentils, and rice",
    cuisine: "Bangladeshi home-style",
    ingredients: [
      { foodId: "chicken-breast-stewed", grams: 130 },
      { foodId: "pumpkin-cooked", grams: 170, label: "cooked pumpkin (kumra)" },
      { foodId: "lentils-cooked", grams: 110, label: "cooked red lentils" },
      { foodId: "rice-white-cooked", grams: 100, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "beef-bhuna-roti-kachumber",
    name: "Beef Bhuna-Style Roti Plate",
    servingDescription: "One plate of lean beef masala, roti, and kachumber",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      {
        foodId: "beef-top-round-roasted",
        grams: 150,
        label: "lean cooked beef",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
      ...KACHUMBER,
    ],
  },
  {
    id: "goat-jhol-bhaat-shaak",
    name: "Goat Jhol-Style Bhaat & Shaak",
    servingDescription: "One plate of goat curry, rice, and mustard greens",
    cuisine: "Bangladeshi home-style",
    ingredients: [
      { foodId: "goat-roasted", grams: 140, label: "cooked goat" },
      { foodId: "rice-white-cooked", grams: 140, label: "cooked white rice" },
      {
        foodId: "mustard-greens-cooked",
        grams: 130,
        label: "cooked mustard greens (shaak)",
      },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "turkey-keema-motor-bhaat",
    name: "Turkey Keema-Style Motor Bhaat",
    servingDescription: "One diaspora bowl of turkey, green peas, and rice",
    cuisine: "North American Desi weeknight",
    ingredients: [
      {
        foodId: "turkey-breast-roasted",
        grams: 160,
        label: "cooked chopped turkey",
      },
      {
        foodId: "green-peas-cooked",
        grams: 90,
        label: "cooked green peas (motor)",
      },
      { foodId: "rice-brown-cooked", grams: 140, label: "cooked brown rice" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "beef-keema-motor-roti",
    name: "Lean Beef Keema-Style Roti Plate",
    servingDescription: "One plate of chopped beef and peas with roti",
    cuisine: "North American Desi weeknight",
    ingredients: [
      {
        foodId: "beef-top-round-roasted",
        grams: 150,
        label: "lean cooked chopped beef",
      },
      { foodId: "green-peas-cooked", grams: 90, label: "cooked green peas" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "muri-dim-kachumber-bowl",
    name: "Muri, Dim & Kachumber Bowl",
    servingDescription:
      "One quick bowl of puffed rice, egg, and chopped vegetables",
    cuisine: "Bangladeshi diaspora snack-meal",
    ingredients: [
      { foodId: "puffed-rice", grams: 45, label: "puffed rice (muri)" },
      { foodId: "egg-hard-boiled", grams: 100, label: "hard-boiled egg (dim)" },
      { foodId: "peanuts-roasted", grams: 15, label: "roasted peanuts" },
      { foodId: "green-chili-raw", grams: 3, label: "green chili" },
      ...KACHUMBER,
    ],
  },
  {
    id: "muri-doi-kola-badam-bowl",
    name: "Muri, Doi, Kola & Badam Bowl",
    servingDescription:
      "One quick bowl of puffed rice, yogurt, banana, and peanuts",
    cuisine: "Bangladeshi diaspora breakfast",
    ingredients: [
      { foodId: "puffed-rice", grams: 45, label: "puffed rice (muri)" },
      {
        foodId: "yogurt-plain-lowfat",
        grams: 200,
        label: "plain low-fat yogurt (doi)",
      },
      { foodId: "banana-raw", grams: 100, label: "banana (kola)" },
      {
        foodId: "peanuts-roasted",
        grams: 20,
        label: "roasted peanuts (badam)",
      },
    ],
  },
  {
    id: "mango-doi-oat-bowl",
    name: "Mango Doi Oat Bowl",
    servingDescription: "One breakfast bowl of yogurt, mango, oats, and chia",
    cuisine: "North American Desi breakfast",
    ingredients: [
      {
        foodId: "greek-yogurt-nonfat",
        grams: 220,
        label: "plain Greek yogurt",
      },
      { foodId: "mango-raw", grams: 140, label: "mango (aam)" },
      { foodId: "oats-dry", grams: 40, label: "rolled oats" },
      { foodId: "chia-seeds", grams: 10 },
    ],
  },
  {
    id: "guava-doi-chia-bowl",
    name: "Guava Doi Chia Bowl",
    servingDescription: "One breakfast bowl of yogurt, guava, chia, and oats",
    cuisine: "North American Desi breakfast",
    ingredients: [
      {
        foodId: "greek-yogurt-nonfat",
        grams: 220,
        label: "plain Greek yogurt",
      },
      { foodId: "guava-raw", grams: 150, label: "guava (peyara)" },
      { foodId: "chia-seeds", grams: 12 },
      { foodId: "oats-dry", grams: 35, label: "rolled oats" },
    ],
  },
  {
    id: "chola-roti-kachumber",
    name: "Chola, Roti & Kachumber",
    servingDescription:
      "One plant-based plate of chickpeas, roti, and chopped salad",
    cuisine: "South Asian home-style",
    ingredients: [
      {
        foodId: "chickpeas-cooked",
        grams: 200,
        label: "cooked chickpeas (chola)",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
      ...KACHUMBER,
    ],
  },
  {
    id: "rajma-chawal-cucumber-doi",
    name: "Rajma Chawal & Cucumber Doi",
    servingDescription:
      "One vegetarian bowl of kidney beans, rice, and cucumber yogurt",
    cuisine: "South Asian home-style",
    ingredients: [
      {
        foodId: "kidney-beans-cooked",
        grams: 200,
        label: "cooked kidney beans (rajma)",
      },
      {
        foodId: "rice-white-cooked",
        grams: 140,
        label: "cooked white rice (chawal)",
      },
      {
        foodId: "yogurt-plain-lowfat",
        grams: 120,
        label: "plain low-fat yogurt",
      },
      { foodId: "cucumber-raw", grams: 100 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "chana-masala-roti",
    name: "Chana Masala-Style Roti Plate",
    servingDescription: "One plant-based plate of chickpea masala and roti",
    cuisine: "South Asian home-style",
    ingredients: [
      {
        foodId: "chickpeas-cooked",
        grams: 210,
        label: "cooked chickpeas (chana)",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
      { foodId: "lime-juice", grams: 15 },
      { foodId: "cilantro-raw", grams: 5 },
    ],
  },
  {
    id: "palak-paneer-roti",
    name: "Palak Paneer-Style Roti Plate",
    servingDescription: "One vegetarian plate of paneer, spinach, and roti",
    cuisine: "South Asian home-style",
    ingredients: [
      { foodId: "paneer", grams: 120 },
      { foodId: "spinach-cooked", grams: 180, label: "cooked spinach (palak)" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "paneer-phulkopi-brown-rice",
    name: "Paneer-Phulkopi Brown Rice Bowl",
    servingDescription:
      "One vegetarian bowl of paneer, cauliflower, and brown rice",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "paneer", grams: 120 },
      {
        foodId: "cauliflower-cooked",
        grams: 180,
        label: "cooked cauliflower (phulkopi)",
      },
      { foodId: "rice-brown-cooked", grams: 130, label: "cooked brown rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "chicken-tikka-style-brown-rice",
    name: "Chicken Tikka-Style Brown Rice Bowl",
    servingDescription:
      "One weeknight bowl of spiced chicken, brown rice, and salad",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "chicken-breast-roasted", grams: 160 },
      {
        foodId: "yogurt-plain-lowfat",
        grams: 60,
        label: "plain yogurt marinade",
      },
      { foodId: "rice-brown-cooked", grams: 140, label: "cooked brown rice" },
      { foodId: "cumin-ground", grams: 1 },
      { foodId: "coriander-seed-ground", grams: 1 },
      { foodId: "chili-powder", grams: 1 },
      ...KACHUMBER,
    ],
  },
  {
    id: "grilled-chicken-roti-salad",
    name: "Grilled Chicken Roti & Salad",
    servingDescription:
      "One quick plate of grilled chicken, roti, and kachumber",
    cuisine: "North American Desi weeknight",
    ingredients: [
      {
        foodId: "chicken-breast-roasted",
        grams: 170,
        label: "grilled-style chicken breast",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...KACHUMBER,
    ],
  },
  {
    id: "turkey-keema-roti-kachumber",
    name: "Turkey Keema-Style Roti & Kachumber",
    servingDescription:
      "One weeknight plate of chopped turkey, roti, and salad",
    cuisine: "North American Desi weeknight",
    ingredients: [
      {
        foodId: "turkey-breast-roasted",
        grams: 170,
        label: "cooked chopped turkey",
      },
      { foodId: "green-peas-cooked", grams: 70, label: "cooked green peas" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...LIGHT_MASALA,
      ...KACHUMBER,
    ],
  },
  {
    id: "goat-palak-roti",
    name: "Goat, Palak & Roti Plate",
    servingDescription: "One plate of goat curry, spinach, and roti",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      { foodId: "goat-roasted", grams: 140, label: "cooked goat" },
      { foodId: "spinach-cooked", grams: 160, label: "cooked spinach (palak)" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "tilapia-roti-kachumber",
    name: "Tilapia, Roti & Kachumber",
    servingDescription: "One quick plate of tilapia, roti, and chopped salad",
    cuisine: "North American Bengali weeknight",
    ingredients: [
      { foodId: "tilapia-cooked", grams: 180 },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      { foodId: "turmeric-ground", grams: 1 },
      { foodId: "chili-powder", grams: 1 },
      { foodId: "canola-oil", grams: 4, label: "cooking oil" },
      ...KACHUMBER,
    ],
  },
  {
    id: "shrimp-roti-pumpkin",
    name: "Shrimp, Roti & Pumpkin Plate",
    servingDescription: "One plate of shrimp masala, pumpkin, and roti",
    cuisine: "North American Bengali weeknight",
    ingredients: [
      { foodId: "shrimp-cooked", grams: 170 },
      { foodId: "pumpkin-cooked", grams: 170 },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "dal-roti-dherosh-bhaji",
    name: "Dal, Roti & Dherosh Bhaji",
    servingDescription: "One plant-based plate of lentils, roti, and okra",
    cuisine: "South Asian home-style",
    ingredients: [
      { foodId: "lentils-cooked", grams: 200, label: "cooked lentils (dal)" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      { foodId: "okra-cooked", grams: 160, label: "cooked okra (dherosh)" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "black-bean-desi-rice-bowl",
    name: "Desi-Spiced Black Bean Rice Bowl",
    servingDescription:
      "One plant-based diaspora bowl of black beans, rice, and salad",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "black-beans-cooked", grams: 200, label: "cooked black beans" },
      { foodId: "rice-brown-cooked", grams: 140, label: "cooked brown rice" },
      ...LIGHT_MASALA,
      ...KACHUMBER,
    ],
  },
  {
    id: "tofu-palak-roti",
    name: "Tofu Palak-Style Roti Plate",
    servingDescription: "One plant-based plate of tofu, spinach, and roti",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "tofu-firm", grams: 170 },
      { foodId: "spinach-cooked", grams: 180, label: "cooked spinach (palak)" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "tofu-lau-bhaat",
    name: "Tofu-Lau Bhaat Bowl",
    servingDescription:
      "One plant-based diaspora bowl of tofu, bottle gourd, and rice",
    cuisine: "North American Bengali weeknight",
    ingredients: [
      { foodId: "tofu-firm", grams: 170 },
      {
        foodId: "bottle-gourd-cooked",
        grams: 180,
        label: "cooked bottle gourd (lau)",
      },
      { foodId: "rice-brown-cooked", grams: 130, label: "cooked brown rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "jackfruit-chola-bhaat",
    name: "Jackfruit, Chola & Bhaat Bowl",
    servingDescription:
      "One plant-based bowl of jackfruit, chickpeas, and rice",
    cuisine: "Bengali-inspired diaspora",
    ingredients: [
      { foodId: "jackfruit-raw", grams: 170, label: "jackfruit (kathal)" },
      {
        foodId: "chickpeas-cooked",
        grams: 160,
        label: "cooked chickpeas (chola)",
      },
      { foodId: "rice-brown-cooked", grams: 110, label: "cooked brown rice" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "plantain-dal-bhaat-shaak",
    name: "Plantain, Dal, Bhaat & Shaak",
    servingDescription:
      "One plant-based plate of plantain, lentils, rice, and greens",
    cuisine: "Bangladeshi home-style",
    ingredients: [
      { foodId: "plantain-boiled", grams: 130, label: "boiled plantain" },
      { foodId: "lentils-cooked", grams: 160, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 100, label: "cooked white rice" },
      {
        foodId: "mustard-greens-cooked",
        grams: 130,
        label: "cooked mustard greens (shaak)",
      },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "paratha-dim-doi-kachumber",
    name: "Paratha, Dim, Doi & Kachumber",
    servingDescription:
      "One breakfast plate of paratha, egg, yogurt, and chopped salad",
    cuisine: "Bangladeshi diaspora breakfast",
    ingredients: [
      { foodId: "paratha", grams: 90 },
      { foodId: "egg-hard-boiled", grams: 100, label: "hard-boiled egg (dim)" },
      {
        foodId: "yogurt-plain-lowfat",
        grams: 100,
        label: "plain yogurt (doi)",
      },
      ...KACHUMBER,
    ],
  },
  {
    id: "naan-chicken-cucumber-doi",
    name: "Naan, Chicken & Cucumber Doi Plate",
    servingDescription:
      "One weeknight plate of chicken, naan, yogurt, and cucumber",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "chicken-breast-roasted", grams: 160 },
      { foodId: "naan", grams: 90 },
      {
        foodId: "yogurt-plain-lowfat",
        grams: 100,
        label: "plain yogurt (doi)",
      },
      { foodId: "cucumber-raw", grams: 120 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "cottage-cheese-mango-oat-bowl",
    name: "Cottage Cheese, Mango & Oat Bowl",
    servingDescription: "One high-protein breakfast bowl with mango and oats",
    cuisine: "North American Desi breakfast",
    ingredients: [
      { foodId: "cottage-cheese-lowfat", grams: 220 },
      { foodId: "mango-raw", grams: 140 },
      { foodId: "oats-dry", grams: 35, label: "rolled oats" },
      { foodId: "chia-seeds", grams: 10 },
    ],
  },
  {
    id: "grilled-salmon-brown-rice-shobji",
    name: "Grilled Salmon Brown Rice & Shobji",
    servingDescription:
      "One quick plate of salmon, brown rice, and mixed vegetables",
    cuisine: "North American Bengali weeknight",
    ingredients: [
      { foodId: "salmon-cooked", grams: 150, label: "grilled-style salmon" },
      { foodId: "rice-brown-cooked", grams: 130, label: "cooked brown rice" },
      { foodId: "broccoli-cooked", grams: 120 },
      { foodId: "green-beans-cooked", grams: 100 },
      { foodId: "lime-juice", grams: 15 },
      { foodId: "canola-oil", grams: 4, label: "cooking oil" },
    ],
  },
  {
    id: "grilled-chicken-sweet-potato-kachumber",
    name: "Grilled Chicken, Sweet Potato & Kachumber",
    servingDescription:
      "One quick plate of chicken, sweet potato, and chopped salad",
    cuisine: "North American Desi weeknight",
    ingredients: [
      {
        foodId: "chicken-breast-roasted",
        grams: 170,
        label: "grilled-style chicken breast",
      },
      { foodId: "sweet-potato-baked", grams: 220 },
      ...KACHUMBER,
    ],
  },
  {
    id: "tuna-chola-kachumber-roti",
    name: "Tuna, Chola, Kachumber & Roti",
    servingDescription:
      "One diaspora plate of tuna, chickpeas, salad, and roti",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "tuna-canned-water", grams: 130, label: "water-packed tuna" },
      {
        foodId: "chickpeas-cooked",
        grams: 120,
        label: "cooked chickpeas (chola)",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...KACHUMBER,
    ],
  },
  {
    id: "sardine-aloo-bhorta-roti",
    name: "Sardine-Aloo Bhorta-Style Roti Plate",
    servingDescription:
      "One diaspora plate of sardine-potato mash, roti, and cucumber",
    cuisine: "North American Bangladeshi home-style",
    ingredients: [
      {
        foodId: "sardines-canned-oil",
        grams: 100,
        label: "drained canned sardines",
      },
      { foodId: "potato-boiled", grams: 140, label: "boiled potato (aloo)" },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      { foodId: "onion-raw", grams: 30, label: "chopped onion" },
      { foodId: "green-chili-raw", grams: 3, label: "green chili" },
      { foodId: "lime-juice", grams: 15 },
      { foodId: "cucumber-raw", grams: 100 },
    ],
  },
  {
    id: "date-banana-doi-oat-bowl",
    name: "Date, Banana, Doi & Oat Bowl",
    servingDescription:
      "One breakfast bowl of yogurt, fruit, oats, and almonds",
    cuisine: "North American Desi breakfast",
    ingredients: [
      {
        foodId: "greek-yogurt-nonfat",
        grams: 220,
        label: "plain Greek yogurt (doi-style)",
      },
      { foodId: "dates-medjool", grams: 36, label: "Medjool dates (khejur)" },
      { foodId: "banana-raw", grams: 90 },
      { foodId: "oats-dry", grams: 35, label: "rolled oats" },
      { foodId: "almonds-raw", grams: 15 },
    ],
  },
  {
    id: "chicken-cabbage-roti",
    name: "Chicken, Cabbage Bhaji & Roti",
    servingDescription: "One weeknight plate of chicken, cabbage, and roti",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      { foodId: "chicken-breast-stewed", grams: 150 },
      {
        foodId: "cabbage-cooked",
        grams: 170,
        label: "cooked cabbage bhaji-style",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "cod-phulkopi-dal-bhaat",
    name: "Cod, Phulkopi, Dal & Bhaat",
    servingDescription: "One plate of cod, cauliflower, lentils, and rice",
    cuisine: "North American Bengali home-style",
    ingredients: [
      { foodId: "cod-cooked", grams: 160 },
      {
        foodId: "cauliflower-cooked",
        grams: 150,
        label: "cooked cauliflower (phulkopi)",
      },
      { foodId: "lentils-cooked", grams: 100, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 110, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "tilapia-kumra-dal-bhaat",
    name: "Tilapia, Kumra, Dal & Bhaat",
    servingDescription: "One plate of tilapia, pumpkin, lentils, and rice",
    cuisine: "North American Bengali home-style",
    ingredients: [
      { foodId: "tilapia-cooked", grams: 160 },
      { foodId: "pumpkin-cooked", grams: 150, label: "cooked pumpkin (kumra)" },
      { foodId: "lentils-cooked", grams: 100, label: "cooked lentils (dal)" },
      { foodId: "rice-white-cooked", grams: 110, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "chicken-okra-brown-rice",
    name: "Chicken, Okra & Brown Rice Bowl",
    servingDescription: "One weeknight bowl of chicken, okra, and brown rice",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "chicken-breast-roasted", grams: 160 },
      { foodId: "okra-cooked", grams: 160 },
      { foodId: "rice-brown-cooked", grams: 140, label: "cooked brown rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "beef-lau-bhaat",
    name: "Beef-Lau Bhaat Bowl",
    servingDescription: "One bowl of lean beef, bottle gourd, and rice",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      {
        foodId: "beef-top-round-roasted",
        grams: 150,
        label: "lean cooked beef",
      },
      {
        foodId: "bottle-gourd-cooked",
        grams: 180,
        label: "cooked bottle gourd (lau)",
      },
      { foodId: "rice-white-cooked", grams: 120, label: "cooked white rice" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "paneer-motor-roti",
    name: "Paneer-Motor Roti Plate",
    servingDescription: "One vegetarian plate of paneer, green peas, and roti",
    cuisine: "South Asian home-style",
    ingredients: [
      { foodId: "paneer", grams: 120 },
      {
        foodId: "green-peas-cooked",
        grams: 100,
        label: "cooked green peas (motor)",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "chola-palak-brown-rice",
    name: "Chola-Palak Brown Rice Bowl",
    servingDescription:
      "One plant-based bowl of chickpeas, spinach, and brown rice",
    cuisine: "North American Desi weeknight",
    ingredients: [
      {
        foodId: "chickpeas-cooked",
        grams: 190,
        label: "cooked chickpeas (chola)",
      },
      { foodId: "spinach-cooked", grams: 160, label: "cooked spinach (palak)" },
      { foodId: "rice-brown-cooked", grams: 120, label: "cooked brown rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "tofu-kumra-mung-bowl",
    name: "Tofu, Kumra & Mung Bowl",
    servingDescription: "One plant-based bowl of tofu, pumpkin, and mung beans",
    cuisine: "North American Bengali weeknight",
    ingredients: [
      { foodId: "tofu-firm", grams: 160 },
      { foodId: "pumpkin-cooked", grams: 160, label: "cooked pumpkin (kumra)" },
      { foodId: "mung-beans-cooked", grams: 150, label: "cooked mung beans" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "eggplant-chola-roti",
    name: "Begun, Chola & Roti Plate",
    servingDescription:
      "One plant-based plate of eggplant, chickpeas, and roti",
    cuisine: "Bengali-inspired diaspora",
    ingredients: [
      {
        foodId: "eggplant-cooked",
        grams: 180,
        label: "cooked eggplant (begun)",
      },
      {
        foodId: "chickpeas-cooked",
        grams: 170,
        label: "cooked chickpeas (chola)",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...BENGALI_MASALA,
    ],
  },
  {
    id: "coconut-shrimp-rice-green-beans",
    name: "Coconut Shrimp Rice & Green Beans",
    servingDescription:
      "One diaspora bowl of coconut shrimp, rice, and green beans",
    cuisine: "Bengali-inspired diaspora",
    ingredients: [
      { foodId: "shrimp-cooked", grams: 160 },
      { foodId: "coconut-milk-canned", grams: 60 },
      { foodId: "rice-white-cooked", grams: 130, label: "cooked white rice" },
      { foodId: "green-beans-cooked", grams: 130 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "coconut-chicken-pumpkin-rice",
    name: "Coconut Chicken, Pumpkin & Rice",
    servingDescription:
      "One diaspora bowl of coconut chicken, pumpkin, and rice",
    cuisine: "Bengali-inspired diaspora",
    ingredients: [
      { foodId: "chicken-breast-stewed", grams: 150 },
      { foodId: "coconut-milk-canned", grams: 50 },
      { foodId: "pumpkin-cooked", grams: 150 },
      { foodId: "rice-white-cooked", grams: 120, label: "cooked white rice" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "egg-chola-roti",
    name: "Dim, Chola & Roti Plate",
    servingDescription: "One filling plate of egg, chickpeas, and roti",
    cuisine: "Bangladeshi diaspora",
    ingredients: [
      { foodId: "egg-hard-boiled", grams: 100, label: "hard-boiled egg (dim)" },
      {
        foodId: "chickpeas-cooked",
        grams: 160,
        label: "cooked chickpeas (chola)",
      },
      { foodId: "roti", grams: 86, label: "whole-wheat roti" },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "chicken-masoor-roti-spinach",
    name: "Chicken, Masoor, Roti & Spinach",
    servingDescription: "One plate of chicken, red lentils, roti, and spinach",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "chicken-breast-roasted", grams: 130 },
      { foodId: "lentils-cooked", grams: 120, label: "cooked red lentils" },
      { foodId: "roti", grams: 60, label: "whole-wheat roti" },
      { foodId: "spinach-cooked", grams: 120 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "cod-mung-rice-cabbage",
    name: "Cod, Mung, Rice & Cabbage",
    servingDescription: "One plate of cod, mung beans, rice, and cabbage",
    cuisine: "North American Bengali home-style",
    ingredients: [
      { foodId: "cod-cooked", grams: 150 },
      { foodId: "mung-beans-cooked", grams: 110, label: "cooked mung beans" },
      { foodId: "rice-white-cooked", grams: 100, label: "cooked white rice" },
      { foodId: "cabbage-cooked", grams: 140 },
      ...LIGHT_MASALA,
    ],
  },
  {
    id: "turkey-dal-brown-rice-sabzi",
    name: "Turkey, Dal, Brown Rice & Sabzi",
    servingDescription:
      "One weeknight bowl of turkey, lentils, brown rice, and vegetables",
    cuisine: "North American Desi weeknight",
    ingredients: [
      { foodId: "turkey-breast-roasted", grams: 150 },
      { foodId: "lentils-cooked", grams: 120, label: "cooked lentils (dal)" },
      { foodId: "rice-brown-cooked", grams: 100, label: "cooked brown rice" },
      {
        foodId: "zucchini-cooked",
        grams: 130,
        label: "cooked zucchini (sabzi)",
      },
      ...LIGHT_MASALA,
    ],
  },
];

/**
 * Deliberate, source-linked combinations modeled on documented Bengali and
 * South Asian home-food patterns in North America. "Style" labels distinguish
 * practical diaspora adaptations from a claim that one recipe is universal.
 */
export const DIASPORA_MEAL_CATALOG: readonly BalancedMealTemplate[] =
  DIASPORA_MEAL_SOURCE_RECIPES.map(makeMeal);
