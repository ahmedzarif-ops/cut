# CUT OS nutrition catalog evidence ledger

**Release status:** STOP — reproducible technical recipes and calculations are
complete, but qualified nutrition, allergen, dietary-label, cultural, and legal
review is not.

**Catalog documented:** `2026-08-03.2`
**Source access and calculation date:** August 3, 2026
**Canonical implementation:**
[`lib/domain/src/balancedMeals.ts`](lib/domain/src/balancedMeals.ts)
**Automated calculation check:**
[`lib/domain/src/balancedMealNutritionEvidence.test.ts`](lib/domain/src/balancedMealNutritionEvidence.test.ts)

This ledger distinguishes engineering evidence from professional approval. The
fixed recipes, exact FoodData Central (FDC) records, gram weights, formula, and
runtime values are reproducible. That does **not** establish that a generic FDC
food exactly matches every product or preparation, that the allergen mapping is
complete, that a dietary/cultural label is appropriate in every jurisdiction,
or that a qualified professional has approved the result.

## Current runtime ledger

Every nutrition number is for the entire fixed single-serving recipe. `P`, `C`,
`F`, and `Fi` mean protein, carbohydrate, fat, and fiber in grams. Empty
allergen arrays mean only that none of the app's typed common allergens was
identified from the written recipe; they are not allergen-free claims.

| Template ID                     | Current serving and complete ingredient text                                                                                                                                                                                                                                                                                                                                                                        | Current per-serving estimate                      | Current dietary tags | Current common-allergen array                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| `bengali-chicken-curry-plate`   | **Bengali Chicken Curry Plate** — Entire recipe: 150 g chicken, 160 g rice, curry vegetables, spinach and cucumber. Ingredients: 150 g cooked stewed chicken breast; 160 g cooked long-grain white rice; 100 g cooked drained spinach; 100 g raw cucumber with peel; 100 g raw tomato; 50 g raw onion; 8 g olive oil; 5 g raw garlic; 5 g raw ginger; 1 g ground cumin seed; 1 g ground turmeric; 1 g iodized salt. | 600 kcal; P 53.5 g; C 64.7 g; F 13.9 g; Fi 6.1 g  | None                 | Empty (`[]`) — **not** evidence of no allergens or cross-contact |
| `desi-masoor-dal-egg-bowl`      | **Desi Masoor Dal & Egg Bowl** — Entire recipe: 180 g lentils, 100 g egg, 120 g brown rice, spinach and tomato. Ingredients: 180 g cooked drained red lentils; 100 g peeled hard-boiled egg; 120 g cooked long-grain brown rice; 75 g cooked drained spinach; 100 g raw tomato; 50 g raw onion; 5 g olive oil; 5 g raw garlic; 1 g ground cumin seed; 1 g ground turmeric; 1 g iodized salt.                        | 625 kcal; P 36.4 g; C 82.2 g; F 18.2 g; Fi 20.4 g | `vegetarian`         | `egg`                                                            |
| `lemon-herb-chicken-grain-bowl` | **Lemon Herb Chicken Grain Bowl** — Entire recipe: 150 g chicken, 160 g quinoa, zucchini, pepper and lemon herbs. Ingredients: 150 g cooked roasted chicken breast; 160 g cooked quinoa; 120 g cooked drained zucchini; 100 g raw red bell pepper; 10 g olive oil; 30 g raw lemon juice; 5 g raw garlic; 10 g fresh parsley; 1 g iodized salt.                                                                      | 590 kcal; P 56.6 g; C 47.7 g; F 19.3 g; Fi 8.3 g  | None                 | Empty (`[]`) — **not** evidence of no allergens or cross-contact |
| `salmon-sweet-potato-plate`     | **Salmon & Sweet Potato Plate** — Entire recipe: 150 g salmon, 220 g sweet potato, broccoli and romaine. Ingredients: 150 g dry-heat cooked Atlantic salmon; 220 g baked sweet potato flesh; 150 g cooked drained broccoli; 75 g raw romaine lettuce; 5 g olive oil; 15 g raw lemon juice; 1 g iodized salt.                                                                                                        | 620 kcal; P 42.1 g; C 59.8 g; F 24.7 g; Fi 13.8 g | `pescatarian`        | `fish`                                                           |
| `tofu-edamame-rice-bowl`        | **Tofu Edamame Rice Bowl** — Entire recipe: 150 g tofu, 100 g edamame, 120 g brown rice and vegetables. Ingredients: 150 g firm calcium-set tofu; 100 g prepared edamame; 120 g cooked long-grain brown rice; 100 g cooked drained broccoli; 75 g raw red cabbage; 10 g whole dried sesame seeds; 5 g sesame oil; 5 g raw ginger; 1 g iodized salt.                                                                 | 648 kcal; P 46.4 g; C 59.7 g; F 30.0 g; Fi 16.7 g | `vegan`              | `soy`; `sesame`                                                  |
| `greek-yogurt-oat-berry-bowl`   | **Greek Yogurt Oat Berry Bowl** — Entire recipe: 250 g Greek yogurt, 40 g oats, berries, banana and chia. Ingredients: 250 g plain nonfat Greek yogurt; 40 g dry rolled oats; 80 g raw strawberries; 50 g raw blueberries; 80 g raw banana; 10 g dried chia seeds.                                                                                                                                                  | 473 kcal; P 34.2 g; C 72.0 g; F 7.3 g; Fi 12.4 g  | `vegetarian`         | `milk`                                                           |

## Official source and calculation method

The records below were retrieved successfully by exact FDC ID from the current
USDA FoodData Central `/foods` API on August 3, 2026. They were also checked
against USDA's downloadable
[SR Legacy April 2018 JSON archive](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip)
and, for iodized salt, the current
[Foundation Foods April 2026 JSON archive](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip).
The [USDA API guide](https://fdc.nal.usda.gov/api-guide/) defines the food-detail
and multi-food endpoints and identifies FDC IDs as the record keys.

For each source, values are per 100 g and use these FDC nutrient IDs:

- `1008` — Energy, kcal
- `1003` — Protein, g
- `1005` — Carbohydrate by difference, g
- `1004` — Total lipid (fat), g
- `1079` — Fiber, total dietary, g

For each ingredient and nutrient:

`ingredient contribution = FDC value per 100 g × recipe grams ÷ 100`

Contributions are summed without intermediate rounding. The runtime then rounds
calories to the nearest whole kcal and protein, carbohydrate, fat, and fiber to
one decimal place. Iodized-salt record `746775` lists none of these five
nutrients; the five-field calculation therefore treats its contribution as
zero. Sodium is outside the current runtime schema and is not calculated here.

### FDC input registry

| FDC record                                                                     | Exact USDA food description                                                           |       kcal |      P (g) |      C (g) |      F (g) |     Fi (g) |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------: | ---------: | ---------: | ---------: | ---------: |
| [167747](https://fdc.nal.usda.gov/fdc-app.html#/food-details/167747/nutrients) | Lemon juice, raw                                                                      |         22 |       0.35 |       6.90 |       0.24 |       0.30 |
| [167762](https://fdc.nal.usda.gov/fdc-app.html#/food-details/167762/nutrients) | Strawberries, raw                                                                     |         32 |       0.67 |       7.68 |       0.30 |       2.00 |
| [168409](https://fdc.nal.usda.gov/fdc-app.html#/food-details/168409/nutrients) | Cucumber, with peel, raw                                                              |         15 |       0.65 |       3.63 |       0.11 |       0.50 |
| [168411](https://fdc.nal.usda.gov/fdc-app.html#/food-details/168411/nutrients) | Edamame, frozen, prepared                                                             |        121 |      11.91 |       8.91 |       5.20 |       5.20 |
| [168463](https://fdc.nal.usda.gov/fdc-app.html#/food-details/168463/nutrients) | Spinach, cooked, boiled, drained, without salt                                        |         23 |       2.97 |       3.75 |       0.26 |       2.40 |
| [168483](https://fdc.nal.usda.gov/fdc-app.html#/food-details/168483/nutrients) | Sweet potato, cooked, baked in skin, flesh, without salt                              |         90 |       2.01 |      20.71 |       0.15 |       3.30 |
| [168878](https://fdc.nal.usda.gov/fdc-app.html#/food-details/168878/nutrients) | Rice, white, long-grain, regular, enriched, cooked                                    |        130 |       2.69 |      28.17 |       0.28 |       0.40 |
| [168917](https://fdc.nal.usda.gov/fdc-app.html#/food-details/168917/nutrients) | Quinoa, cooked                                                                        |        120 |       4.40 |      21.30 |       1.92 |       2.80 |
| [169230](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169230/nutrients) | Garlic, raw                                                                           |        149 |       6.36 |      33.06 |       0.50 |       2.10 |
| [169231](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169231/nutrients) | Ginger root, raw                                                                      |         80 |       1.82 |      17.77 |       0.75 |       2.00 |
| [169247](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169247/nutrients) | Lettuce, cos or romaine, raw                                                          |         17 |       1.23 |       3.29 |       0.30 |       2.10 |
| [169292](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169292/nutrients) | Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt        |         15 |       1.14 |       2.69 |       0.36 |       1.00 |
| [169704](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169704/nutrients) | Rice, brown, long-grain, cooked (includes foods for USDA's Food Distribution Program) |        123 |       2.74 |      25.58 |       0.97 |       1.60 |
| [169967](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169967/nutrients) | Broccoli, cooked, boiled, drained, without salt                                       |         35 |       2.38 |       7.18 |       0.41 |       3.30 |
| [169977](https://fdc.nal.usda.gov/fdc-app.html#/food-details/169977/nutrients) | Cabbage, red, raw                                                                     |         31 |       1.43 |       7.37 |       0.16 |       2.10 |
| [170000](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170000/nutrients) | Onions, raw                                                                           |         40 |       1.10 |       9.34 |       0.10 |       1.70 |
| [170108](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170108/nutrients) | Peppers, sweet, red, raw                                                              |         26 |       0.99 |       6.03 |       0.30 |       2.10 |
| [170150](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170150/nutrients) | Seeds, sesame seeds, whole, dried                                                     |        573 |      17.73 |      23.45 |      49.67 |      11.80 |
| [170416](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170416/nutrients) | Parsley, fresh                                                                        |         36 |       2.97 |       6.33 |       0.79 |       3.30 |
| [170457](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170457/nutrients) | Tomatoes, red, ripe, raw, year-round average                                          |         18 |       0.88 |       3.89 |       0.20 |       1.20 |
| [170554](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170554/nutrients) | Seeds, chia seeds, dried                                                              |        486 |      16.54 |      42.12 |      30.74 |      34.40 |
| [170894](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170894/nutrients) | Yogurt, Greek, plain, nonfat (includes foods for USDA's Food Distribution Program)    |         59 |      10.19 |       3.60 |       0.39 |       0.00 |
| [170923](https://fdc.nal.usda.gov/fdc-app.html#/food-details/170923/nutrients) | Spices, cumin seed                                                                    |        375 |      17.81 |      44.24 |      22.27 |      10.50 |
| [171016](https://fdc.nal.usda.gov/fdc-app.html#/food-details/171016/nutrients) | Oil, sesame, salad or cooking                                                         |        884 |       0.00 |       0.00 |     100.00 |       0.00 |
| [171413](https://fdc.nal.usda.gov/fdc-app.html#/food-details/171413/nutrients) | Oil, olive, salad or cooking                                                          |        884 |       0.00 |       0.00 |     100.00 |       0.00 |
| [171477](https://fdc.nal.usda.gov/fdc-app.html#/food-details/171477/nutrients) | Chicken, broilers or fryers, breast, meat only, cooked, roasted                       |        165 |      31.02 |       0.00 |       3.57 |       0.00 |
| [171478](https://fdc.nal.usda.gov/fdc-app.html#/food-details/171478/nutrients) | Chicken, broilers or fryers, breast, meat only, cooked, stewed                        |        151 |      28.98 |       0.00 |       3.03 |       0.00 |
| [171711](https://fdc.nal.usda.gov/fdc-app.html#/food-details/171711/nutrients) | Blueberries, raw                                                                      |         57 |       0.74 |      14.49 |       0.33 |       2.40 |
| [172231](https://fdc.nal.usda.gov/fdc-app.html#/food-details/172231/nutrients) | Spices, turmeric, ground                                                              |        312 |       9.68 |      67.14 |       3.25 |      22.70 |
| [172421](https://fdc.nal.usda.gov/fdc-app.html#/food-details/172421/nutrients) | Lentils, mature seeds, cooked, boiled, without salt                                   |        116 |       9.02 |      20.13 |       0.38 |       7.90 |
| [172475](https://fdc.nal.usda.gov/fdc-app.html#/food-details/172475/nutrients) | Tofu, raw, firm, prepared with calcium sulfate                                        |        144 |      17.27 |       2.78 |       8.72 |       2.30 |
| [173424](https://fdc.nal.usda.gov/fdc-app.html#/food-details/173424/nutrients) | Egg, whole, cooked, hard-boiled                                                       |        155 |      12.58 |       1.12 |      10.61 |       0.00 |
| [173904](https://fdc.nal.usda.gov/fdc-app.html#/food-details/173904/nutrients) | Cereals, oats, regular and quick, not fortified, dry                                  |        379 |      13.15 |      67.70 |       6.52 |      10.10 |
| [173944](https://fdc.nal.usda.gov/fdc-app.html#/food-details/173944/nutrients) | Bananas, raw                                                                          |         89 |       1.09 |      22.84 |       0.33 |       2.60 |
| [175168](https://fdc.nal.usda.gov/fdc-app.html#/food-details/175168/nutrients) | Fish, salmon, Atlantic, farmed, cooked, dry heat                                      |        206 |      22.10 |       0.00 |      12.35 |       0.00 |
| [746775](https://fdc.nal.usda.gov/fdc-app.html#/food-details/746775/nutrients) | Salt, table, iodized                                                                  | Not listed | Not listed | Not listed | Not listed | Not listed |

## Fixed recipes and calculation results

Every gram amount is an edible amount in the state named. “Entire recipe” is
the yield: prepare the listed items, discard none of them, and consume the full
result as one catalog serving. Input mass is recorded to help reproduce the
recipe; heating can change final water weight. No unlisted garnish, sauce,
cooking fat, or sweetener is included.

### `bengali-chicken-curry-plate`

- **Inputs:** 150 g chicken (`171478`); 160 g white rice (`168878`); 100 g
  spinach (`168463`); 100 g cucumber (`168409`); 100 g tomato (`170457`); 50 g
  onion (`170000`); 8 g olive oil (`171413`); 5 g garlic (`169230`); 5 g ginger
  (`169231`); 1 g cumin (`170923`); 1 g turmeric (`172231`); 1 g iodized salt
  (`746775`).
- **Input mass/yield:** 681 g of listed inputs; entire cooked curry and plate is
  one serving.
- **Method boundary:** sauté the onion, garlic, ginger, cumin, and turmeric in
  all the oil; add tomato and the pre-weighed cooked chicken; cook without
  discarding liquid; serve all of it with all the rice, spinach, cucumber, and
  salt.
- **Unrounded sum:** 599.5400 kcal; P 53.5079 g; C 64.6673 g; F 13.9307 g; Fi
  6.1270 g.
- **Catalog value after specified rounding:** 600 kcal; P 53.5 g; C 64.7 g; F
  13.9 g; Fi 6.1 g.

### `desi-masoor-dal-egg-bowl`

- **Inputs:** 180 g red lentils using generic cooked-lentil record `172421`;
  100 g egg (`173424`); 120 g brown rice (`169704`); 75 g spinach (`168463`);
  100 g tomato (`170457`); 50 g onion (`170000`); 5 g olive oil (`171413`); 5 g
  garlic (`169230`); 1 g cumin (`170923`); 1 g turmeric (`172231`); 1 g iodized
  salt (`746775`).
- **Input mass/yield:** 638 g of listed inputs; entire cooked bowl is one
  serving.
- **Method boundary:** sauté onion, garlic, cumin, and turmeric in all the oil;
  add tomato and all the cooked lentils; cook without discarding liquid; serve
  the complete mixture with all the egg, rice, spinach, and salt.
- **Unrounded sum:** 625.1700 kcal; P 36.3544 g; C 82.1893 g; F 18.1832 g; Fi
  20.4270 g.
- **Catalog value after specified rounding:** 625 kcal; P 36.4 g; C 82.2 g; F
  18.2 g; Fi 20.4 g.

### `lemon-herb-chicken-grain-bowl`

- **Inputs:** 150 g chicken (`171477`); 160 g quinoa (`168917`); 120 g zucchini
  (`169292`); 100 g red bell pepper (`170108`); 10 g olive oil (`171413`); 30 g
  lemon juice (`167747`); 5 g garlic (`169230`); 10 g parsley (`170416`); 1 g
  iodized salt (`746775`).
- **Input mass/yield:** 586 g of listed inputs; entire assembled bowl is one
  serving.
- **Method boundary:** combine the pre-weighed cooked chicken, quinoa, and
  zucchini with all the raw pepper; use all oil, lemon, garlic, parsley, and
  salt as dressing; discard none.
- **Unrounded sum:** 589.5500 kcal; P 56.6480 g; C 47.6940 g; F 19.3350 g; Fi
  8.3050 g.
- **Catalog value after specified rounding:** 590 kcal; P 56.6 g; C 47.7 g; F
  19.3 g; Fi 8.3 g.

### `salmon-sweet-potato-plate`

- **Inputs:** 150 g salmon (`175168`); 220 g sweet potato (`168483`); 150 g
  broccoli (`169967`); 75 g romaine (`169247`); 5 g olive oil (`171413`); 15 g
  lemon juice (`167747`); 1 g iodized salt (`746775`).
- **Input mass/yield:** 616 g of listed inputs; entire assembled plate is one
  serving.
- **Method boundary:** serve all pre-weighed cooked salmon, sweet potato, and
  broccoli with all the romaine; use all oil, lemon, and salt as dressing;
  discard none.
- **Unrounded sum:** 619.7500 kcal; P 42.1170 g; C 59.8345 g; F 24.7310 g; Fi
  13.8300 g.
- **Catalog value after specified rounding:** 620 kcal; P 42.1 g; C 59.8 g; F
  24.7 g; Fi 13.8 g.

### `tofu-edamame-rice-bowl`

- **Inputs:** 150 g tofu (`172475`); 100 g edamame (`168411`); 120 g brown rice
  (`169704`); 100 g broccoli (`169967`); 75 g red cabbage (`169977`); 10 g
  sesame seeds (`170150`); 5 g sesame oil (`171016`); 5 g ginger (`169231`); 1
  g iodized salt (`746775`).
- **Input mass/yield:** 566 g of listed inputs; entire assembled bowl is one
  serving.
- **Method boundary:** combine all pre-weighed tofu, edamame, rice, and broccoli
  with all raw cabbage; use all sesame seeds, oil, ginger, and salt; discard
  none.
- **Unrounded sum:** 648.3500 kcal; P 46.4195 g; C 59.7170 g; F 29.9785 g; Fi
  16.7250 g.
- **Catalog value after specified rounding:** 648 kcal; P 46.4 g; C 59.7 g; F
  30.0 g; Fi 16.7 g.

### `greek-yogurt-oat-berry-bowl`

- **Inputs:** 250 g Greek yogurt (`170894`); 40 g oats (`173904`); 80 g
  strawberries (`167762`); 50 g blueberries (`171711`); 80 g banana (`173944`);
  10 g chia seeds (`170554`).
- **Input mass/yield:** 510 g of listed inputs; entire assembled bowl is one
  serving.
- **Method boundary:** combine and consume all listed ingredients; add no
  sweetener, oil, milk, topping, or garnish.
- **Unrounded sum:** 473.0000 kcal; P 34.1670 g; C 71.9530 g; F 7.3260 g; Fi
  12.3600 g.
- **Catalog value after specified rounding:** 473 kcal; P 34.2 g; C 72.0 g; F
  7.3 g; Fi 12.4 g.

## What this engineering pass closed

- All six templates now have fixed, complete, single-serving recipes with
  material oils, seasonings, exact edible weights, preparation state, and a
  one-recipe yield.
- All five runtime nutrition fields trace to exact current FDC records and a
  documented formula. The domain evidence test independently recomputes every
  published estimate from those values and gram weights.
- Catalog version `2026-08-03.2` supersedes the unsupported prior placeholders,
  including the earlier conflicting Bengali values.
- `high-protein`, `high-fiber`, `dairy-free`, and `gluten-free` tags were
  removed. The remaining `vegetarian`, `pescatarian`, and `vegan` tags describe
  only the listed recipe ingredients; they are not certification or
  cross-contact claims.
- Numeric API fit text now states only the calculated protein and fiber. The
  mobile screen no longer labels the first sorted item “RECOMMENDED DEFAULT.”
- The mobile allergen copy now says cross-contact is not assessed, requires
  review of every ingredient and package label, and explicitly says an empty
  list is not an allergen-free claim.

## Allergen evidence boundary

The current arrays map only obvious allergens in the written generic recipe:

| Template ID                     | Ingredient-based mapping                        | What remains unverified                                                            |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `bengali-chicken-curry-plate`   | No typed common allergen identified             | Actual products, subingredients, equipment, facility, and cross-contact            |
| `desi-masoor-dal-egg-bowl`      | `egg` from hard-boiled egg                      | Actual products, subingredients, equipment, facility, and cross-contact            |
| `lemon-herb-chicken-grain-bowl` | No typed common allergen identified             | Actual products, subingredients, equipment, facility, and cross-contact            |
| `salmon-sweet-potato-plate`     | `fish` from Atlantic salmon                     | Actual products, subingredients, equipment, facility, and cross-contact            |
| `tofu-edamame-rice-bowl`        | `soy` from tofu/edamame; `sesame` from seed/oil | Actual products, subingredients, equipment, facility, and cross-contact            |
| `greek-yogurt-oat-berry-bowl`   | `milk` from Greek yogurt                        | Actual yogurt/oat/products, subingredients, equipment, facility, and cross-contact |

This is an engineering mapping, not an allergen-safety review. It does not
assess a user's kitchen, restaurant preparation, substitutions, shared
equipment, “may contain” statements, or whether the typed allergen set is
sufficient in every launch jurisdiction.

## Remaining reviewer judgments

A qualified reviewer must decide and record, at minimum:

1. Whether each generic FDC record is an acceptable match for the actual food
   users will prepare, particularly generic cooked lentils as the source for
   red masoor, generic oats as rolled oats, and generic yogurt/tofu/rice.
2. Whether summing raw onion, tomato, garlic, ginger, herbs, and spices that are
   then cooked without discard needs cooking-retention or yield adjustment for
   the five displayed nutrients.
3. Whether the recipe methods, edible weights, serving sizes, rounding, and
   omission of sodium and micronutrients are suitable for the exact app copy.
4. Whether “Bengali Chicken Curry Plate” and “Desi Masoor Dal & Egg Bowl” are
   culturally honest names for these simplified fixed recipes; no credentialed
   cultural reviewer has signed off.
5. Whether `vegetarian`, `pescatarian`, and `vegan` may be used as
   ingredient-composition tags in each intended jurisdiction and whether more
   product/brand controls are required.
6. Whether the obvious-ingredient allergen mapping, warning language, and
   launch-jurisdiction allergen framework are adequate.
7. Whether “Balanced options,” the protein/fiber/calorie sorting formula,
   numeric fit text, and all App Store/accessibility copy are acceptable and
   non-misleading.

## Qualified-review signoff

Reviewer identity and credentials are intentionally blank. The product owner
must select appropriately qualified nutrition/health, allergen/dietary,
cultural, and legal reviewers for the intended launch jurisdictions. This
document does not designate or imply that any person is qualified.

| Template ID                     | Nutrition reviewer name, qualification, credential/license and jurisdiction | Recipe/source/calculation decision | Allergen/dietary reviewer or counsel and qualification | Allergen/dietary decision | Cultural reviewer and scope, if applicable | Overall decision (`approved`, `approved with conditions`, or `rejected`) | Review date  | Signed record/evidence reference |
| ------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------ | ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ | ------------ | -------------------------------- |
| `bengali-chicken-curry-plate`   | `[REQUIRED]`                                                                | `[REQUIRED]`                       | `[REQUIRED]`                                           | `[REQUIRED]`              | `[REQUIRED]`                               | `[REQUIRED]`                                                             | `[REQUIRED]` | `[REQUIRED]`                     |
| `desi-masoor-dal-egg-bowl`      | `[REQUIRED]`                                                                | `[REQUIRED]`                       | `[REQUIRED]`                                           | `[REQUIRED]`              | `[REQUIRED]`                               | `[REQUIRED]`                                                             | `[REQUIRED]` | `[REQUIRED]`                     |
| `lemon-herb-chicken-grain-bowl` | `[REQUIRED]`                                                                | `[REQUIRED]`                       | `[REQUIRED]`                                           | `[REQUIRED]`              | `N/A or required rationale`                | `[REQUIRED]`                                                             | `[REQUIRED]` | `[REQUIRED]`                     |
| `salmon-sweet-potato-plate`     | `[REQUIRED]`                                                                | `[REQUIRED]`                       | `[REQUIRED]`                                           | `[REQUIRED]`              | `N/A or required rationale`                | `[REQUIRED]`                                                             | `[REQUIRED]` | `[REQUIRED]`                     |
| `tofu-edamame-rice-bowl`        | `[REQUIRED]`                                                                | `[REQUIRED]`                       | `[REQUIRED]`                                           | `[REQUIRED]`              | `[REQUIRED]`                               | `[REQUIRED]`                                                             | `[REQUIRED]` | `[REQUIRED]`                     |
| `greek-yogurt-oat-berry-bowl`   | `[REQUIRED]`                                                                | `[REQUIRED]`                       | `[REQUIRED]`                                           | `[REQUIRED]`              | `N/A or required rationale`                | `[REQUIRED]`                                                             | `[REQUIRED]` | `[REQUIRED]`                     |

Signoff is valid only when its scope includes the frozen recipes, FDC-record
equivalence, preparation method, calculations, displayed numbers, ingredients,
allergen statements, dietary/cultural tags, ordering and fit language, in-app
disclosures, accessibility copy, App Store metadata, and intended launch
jurisdictions. Any affected catalog change requires a new version and renewed
approval.

## Medical and outcome claims are prohibited

Until separately substantiated and approved in writing for the exact wording,
audience, behavior, and launch jurisdictions, CUT OS must not state or imply
that a meal, ordering, nutrient estimate, or the app:

- diagnoses, treats, prevents, mitigates, or cures a disease or condition;
- guarantees weight loss, fat loss, muscle gain, a rate of change, adherence,
  health improvement, or any other outcome;
- is clinically proven, clinician/doctor approved, medically personalized,
  nutritionally complete, optimal, inherently healthy, or suitable for a
  medical condition;
- is safe for an allergy, free from cross-contact, or appropriate for a user's
  allergy or dietary restriction;
- meets an individual's calorie, protein, fiber, micronutrient, or other
  nutritional need; or
- closes, corrects, or treats a nutrient deficiency or health risk.

Do not use testimonials, screenshots, accessibility labels, App Store copy,
support content, notifications, or purchase copy to make indirectly what the
app may not claim directly. “Estimated,” “general wellness,” and “not medical
advice” do not make an otherwise unsupported outcome or safety claim
acceptable.

## Exact stop-the-line gaps before App Store submission

The technical source/calculation gaps are materially reduced, but every item
below remains open. If any remains open, the catalog and related App Store
claims are not approved for submission.

| Gate      | Current gap                                                                                                                                                                            | Evidence required to clear it                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NUT-04`  | Generic FDC-to-recipe equivalence, cooking-retention treatment, recipe method, serving suitability, and rounding have no qualified nutrition approval.                                 | Qualified reviewer signs the exact `2026-08-03.2` recipes, sources, method, calculations, uncertainties, and displayed values, with corrections versioned before release. |
| `ALG-01`  | The arrays map obvious generic-recipe ingredients only; actual product labels, subingredients, preparation aids, launch-market allergen rules, and cross-contact are unreviewed.       | Documented product/package/preparation review and qualified allergen/legal signoff; empty arrays remain explicitly non-safety claims.                                     |
| `DIET-01` | Remaining `vegetarian`, `pescatarian`, and `vegan` composition tags are not professionally or legally approved and do not control substitutions/brands.                                | Approved tag definitions, per-template ingredient evidence, jurisdiction review, and conditions; otherwise remove the tags.                                               |
| `CULT-01` | Bengali, Desi, Mediterranean-inspired, and East Asian-inspired naming has no recorded cultural/culinary review.                                                                        | Named reviewer with documented scope approves or corrects the final recipes, methods, and naming without fabricating authenticity.                                        |
| `COPY-01` | “Balanced options,” deterministic sorting, numeric fit text, allergen wording, disclosures, accessibility labels, and App Store nutrition copy have no final qualified/legal approval. | Review and signoff of the exact release binary and metadata, or removal/neutralization of unsupported wording.                                                            |
| `REV-01`  | No reviewer identity, qualification, jurisdiction, scope, decision, date, or signed record exists for any template.                                                                    | Completed signoff table and linked signed records for all six templates.                                                                                                  |
| `CFG-01`  | The calculation is synchronized to source and code locally, but it is not frozen to a signed production binary/API deployment and archived release record.                             | Verify catalog `2026-08-03.2` in the production API and signed build, then archive source evidence, calculation test output, approvals, and screenshots.                  |
| `QA-01`   | There is no final-device acceptance record for the revised long ingredient copy, scaled servings, disclosures, allergen wording, and accessibility output.                             | Release-build device checks and screenshots for all six templates at supported serving increments, including VoiceOver and narrow-screen review.                          |

This ledger covers only the nutrition-catalog evidence gate. Subscription,
privacy/legal, production-service, device-QA, App Store account, and submission
gates remain governed by their own release records.
