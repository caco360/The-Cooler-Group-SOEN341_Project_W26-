import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { default: supabase } = await import("./supabase-client.js");

const CUSTOM_FDC_START = 11100419;
const CUSTOM_FOODS = [  // MORE GRAINS & CARBS
  
  // GRAINS & CARBS
  { name: "Rice, jasmine, cooked", calories: 129 },
  { name: "Rice, basmati, cooked", calories: 121 },
  { name: "Rice, wild, cooked", calories: 101 },
  { name: "Quinoa, cooked", calories: 120 },
  { name: "Barley, cooked", calories: 123 },
  { name: "Couscous, cooked", calories: 112 },
  { name: "Bulgur, cooked", calories: 83 },
  { name: "Millet, cooked", calories: 119 },
  { name: "Farro, cooked", calories: 110 },
  { name: "Spaghetti, cooked", calories: 158 },
  { name: "Macaroni, cooked", calories: 157 },
  { name: "Noodles, egg, cooked", calories: 138 },
  { name: "Bread, white", calories: 265 },
  { name: "Bread, whole wheat", calories: 247 },
  { name: "Bagel, plain", calories: 289 },
  { name: "Croissant", calories: 406 },
  { name: "Muffin, plain", calories: 377 },
  { name: "Pancakes", calories: 227 },
  { name: "Waffles", calories: 291 },
  { name: "Popcorn, air-popped", calories: 387 },

  // FRUITS
  { name: "Apple", calories: 52 },
  { name: "Banana", calories: 89 },
  { name: "Orange", calories: 47 },
  { name: "Orange juice", calories: 45 },
  { name: "Grapes", calories: 69 },
  { name: "Strawberries", calories: 32 },
  { name: "Blueberries", calories: 57 },
  { name: "Raspberries", calories: 52 },
  { name: "Blackberries", calories: 43 },
  { name: "Mango", calories: 60 },
  { name: "Pineapple", calories: 50 },
  { name: "Watermelon", calories: 30 },
  { name: "Cantaloupe", calories: 34 },
  { name: "Peach", calories: 39 },
  { name: "Pear", calories: 57 },
  { name: "Plum", calories: 46 },
  { name: "Cherry", calories: 63 },
  { name: "Kiwi", calories: 61 },
  { name: "Papaya", calories: 43 },
  { name: "Pomegranate", calories: 83 },

  // VEGETABLES
  { name: "Potato, raw", calories: 77 },
  { name: "Potato, baked", calories: 93 },
  { name: "Sweet potato", calories: 86 },
  { name: "Carrot", calories: 41 },
  { name: "Broccoli", calories: 34 },
  { name: "Cauliflower", calories: 25 },
  { name: "Spinach", calories: 23 },
  { name: "Kale", calories: 35 },
  { name: "Lettuce", calories: 15 },
  { name: "Tomato", calories: 18 },
  { name: "Cucumber", calories: 16 },
  { name: "Zucchini", calories: 17 },
  { name: "Eggplant", calories: 25 },
  { name: "Bell pepper", calories: 31 },
  { name: "Onion", calories: 40 },
  { name: "Garlic", calories: 149 },
  { name: "Mushrooms", calories: 22 },
  { name: "Green beans", calories: 31 },
  { name: "Corn", calories: 86 },
  { name: "Peas", calories: 81 },

  // PROTEINS (MEAT / FISH)
  { name: "Chicken breast, raw", calories: 120 },
  { name: "Chicken breast, cooked", calories: 165 },
  { name: "Chicken thigh, cooked", calories: 209 },
  { name: "Turkey breast", calories: 135 },
  { name: "Ground beef, 80% lean", calories: 254 },
  { name: "Ground beef, 90% lean", calories: 176 },
  { name: "Steak, ribeye", calories: 291 },
  { name: "Steak, sirloin", calories: 206 },
  { name: "Pork chop", calories: 231 },
  { name: "Bacon", calories: 541 },
  { name: "Ham", calories: 145 },
  { name: "Sausage", calories: 301 },
  { name: "Salmon", calories: 208 },
  { name: "Tuna, canned in water", calories: 132 },
  { name: "Shrimp", calories: 99 },
  { name: "Cod", calories: 82 },
  { name: "Tilapia", calories: 96 },
  { name: "Sardines", calories: 208 },
  { name: "Mackerel", calories: 305 },
  { name: "Anchovies", calories: 210 },

  // DAIRY & EGGS
  { name: "Milk, whole", calories: 61 },
  { name: "Milk, 2%", calories: 50 },
  { name: "Milk, skim", calories: 34 },
  { name: "Yogurt, plain", calories: 59 },
  { name: "Yogurt, Greek", calories: 97 },
  { name: "Cheese, cheddar", calories: 403 },
  { name: "Cheese, mozzarella", calories: 280 },
  { name: "Cheese, parmesan", calories: 431 },
  { name: "Egg, whole", calories: 155 },
  { name: "Egg white", calories: 52 },
  { name: "Ice cream, vanilla", calories: 207 },
  { name: "Custard", calories: 122 },
  { name: "Whipping cream", calories: 340 },

  // NUTS & SEEDS
  { name: "Peanuts", calories: 567 },
  { name: "Almonds", calories: 579 },
  { name: "Brazil nuts", calories: 659 },
  { name: "Macadamia nuts", calories: 718 },
  { name: "Sunflower seeds", calories: 584 },
  { name: "Hemp seeds", calories: 553 },

  // OILS & FATS
  { name: "Olive oil", calories: 884 },
  { name: "Vegetable oil", calories: 884 },
  { name: "Canola oil", calories: 884 },
  { name: "Coconut oil", calories: 892 },
  { name: "Lard", calories: 902 },

  // BEANS & LEGUMES
  { name: "Lentils, cooked", calories: 116 },
  { name: "Chickpeas, cooked", calories: 164 },
  { name: "Black beans", calories: 132 },
  { name: "Kidney beans", calories: 127 },
  { name: "Soybeans", calories: 173 },
  { name: "Tofu", calories: 76 },
  { name: "Tempeh", calories: 193 },

  // SNACKS & RANDOM BASICS
  { name: "Potato chips", calories: 536 },
  { name: "French fries", calories: 312 },
  { name: "Pretzels", calories: 380 },
  { name: "Cookies", calories: 502 },
  { name: "Cake, chocolate", calories: 371 },
  { name: "Cake, vanilla", calories: 257 },
  { name: "Donut", calories: 452 },
  { name: "Cereal, corn flakes", calories: 357 },
  { name: "Cereal, oats", calories: 379 },
  { name: "Protein powder", calories: 400 },
  { name: "Peanut butter", calories: 588 },
  { name: "Almond butter", calories: 614 },
  { name: "Nutella", calories: 539 },
  { name: "Cacao nibs", calories: 600 },
  { name: "Cocoa drink", calories: 77 },
  { name: "Coffee, black", calories: 1 },
  { name: "Tea, brewed", calories: 1 },
  { name: "Soft drink", calories: 42 },
  { name: "Beer", calories: 43 },
  { name: "Wine, red", calories: 85 },
   { name: "Peanut butter", calories: 588 },
  { name: "Almond butter", calories: 614 },
  { name: "Nutella", calories: 539 },
  { name: "Cacao nibs", calories: 600 },
  { name: "Protein powder", calories: 400 },
  { name: "Energy bar", calories: 350 },
  { name: "Protein bar", calories: 370 },
  { name: "Granola bar", calories: 420 },
  { name: "Trail mix", calories: 462 },
  { name: "Marshmallow", calories: 318 },
  { name: "Oats, cooked", calories: 71 },
  { name: "Brown rice, cooked", calories: 123 },
  { name: "White rice, cooked", calories: 130 },
  { name: "Brown bread", calories: 252 },
  { name: "Sourdough bread", calories: 289 },
  { name: "Tortilla, flour", calories: 304 },
  { name: "Tortilla, corn", calories: 218 },
  { name: "Pita bread", calories: 275 },
  { name: "English muffin", calories: 223 },
  { name: "Crackers", calories: 421 },
  { name: "Granola", calories: 471 },
  { name: "Rice cakes", calories: 387 },
  { name: "Gnocchi", calories: 131 },
  { name: "Ramen noodles, cooked", calories: 188 },
  { name: "Udon noodles, cooked", calories: 127 },
  { name: "Soba noodles, cooked", calories: 99 },
  { name: "Lasagna, cooked", calories: 132 },
  { name: "Pizza dough", calories: 266 },
  { name: "Bread crumbs", calories: 395 },
  { name: "Cornbread", calories: 330 },

  // MORE FRUITS
  { name: "Avocado", calories: 160 },
  { name: "Lemon", calories: 29 },
  { name: "Lime", calories: 30 },
  { name: "Grapefruit", calories: 42 },
  { name: "Coconut meat", calories: 354 },
  { name: "Dates", calories: 277 },
  { name: "Raisins", calories: 299 },
  { name: "Apricot", calories: 48 },
  { name: "Fig", calories: 74 },
  { name: "Guava", calories: 68 },
  { name: "Dragon fruit", calories: 60 },
  { name: "Passion fruit", calories: 97 },
  { name: "Cranberries", calories: 46 },
  { name: "Lychee", calories: 66 },
  { name: "Tangerine", calories: 53 },

  // MORE VEGETABLES
  { name: "Cabbage", calories: 25 },
  { name: "Red cabbage", calories: 31 },
  { name: "Brussels sprouts", calories: 43 },
  { name: "Asparagus", calories: 20 },
  { name: "Celery", calories: 16 },
  { name: "Beetroot", calories: 43 },
  { name: "Radish", calories: 16 },
  { name: "Pumpkin", calories: 26 },
  { name: "Butternut squash", calories: 45 },
  { name: "Arugula", calories: 25 },
  { name: "Leek", calories: 61 },
  { name: "Turnip", calories: 28 },
  { name: "Okra", calories: 33 },
  { name: "Artichoke", calories: 47 },
  { name: "Olives", calories: 115 },

  // MORE PROTEINS
  { name: "Chicken drumstick, cooked", calories: 216 },
  { name: "Ground turkey", calories: 203 },
  { name: "Turkey thigh", calories: 208 },
  { name: "Duck, cooked", calories: 337 },
  { name: "Lamb chop", calories: 294 },
  { name: "Veal", calories: 172 },
  { name: "Bison", calories: 143 },
  { name: "Venison", calories: 158 },
  { name: "Roast beef", calories: 217 },
  { name: "Beef liver", calories: 135 },
  { name: "Chicken liver", calories: 119 },
  { name: "Trout", calories: 190 },
  { name: "Halibut", calories: 111 },
  { name: "Haddock", calories: 90 },
  { name: "Crab", calories: 97 },
  { name: "Lobster", calories: 89 },
  { name: "Scallops", calories: 111 },
  { name: "Octopus", calories: 82 },
  { name: "Squid", calories: 92 },
  { name: "Smoked salmon", calories: 117 },

  // MORE DAIRY & EGGS
  { name: "Butter", calories: 717 },
  { name: "Cream cheese", calories: 342 },
  { name: "Cottage cheese", calories: 98 },
  { name: "Ricotta", calories: 174 },
  { name: "Feta cheese", calories: 265 },
  { name: "Swiss cheese", calories: 393 },
  { name: "Goat cheese", calories: 364 },
  { name: "Sour cream", calories: 193 },
  { name: "Kefir", calories: 55 },
  { name: "Condensed milk", calories: 321 },
  { name: "Evaporated milk", calories: 134 },
  { name: "Chocolate milk", calories: 83 },

  // MORE NUTS & SEEDS
  { name: "Cashews", calories: 553 },
  { name: "Walnuts", calories: 654 },
  { name: "Pistachios", calories: 562 },
  { name: "Pecans", calories: 691 },
  { name: "Hazelnuts", calories: 628 },
  { name: "Chia seeds", calories: 486 },
  { name: "Pumpkin seeds", calories: 559 },
  { name: "Sesame seeds", calories: 573 },
  { name: "Flax seeds", calories: 534 },
  { name: "Tahini", calories: 595 },

  // MORE BEANS & LEGUMES
  { name: "Pinto beans", calories: 143 },
  { name: "Navy beans", calories: 140 },
  { name: "Cannellini beans", calories: 139 },
  { name: "Edamame", calories: 121 },
  { name: "Split peas, cooked", calories: 118 },
  { name: "Refried beans", calories: 124 },
  { name: "Hummus", calories: 166 },
  { name: "Falafel", calories: 333 },

  // SAUCES & CONDIMENTS
  { name: "Ketchup", calories: 112 },
  { name: "Mayonnaise", calories: 680 },
  { name: "Mustard", calories: 66 },
  { name: "BBQ sauce", calories: 172 },
  { name: "Soy sauce", calories: 53 },
  { name: "Teriyaki sauce", calories: 89 },
  { name: "Hot sauce", calories: 29 },
  { name: "Salsa", calories: 36 },
  { name: "Pesto", calories: 454 },
  { name: "Tomato sauce", calories: 29 },
  { name: "Alfredo sauce", calories: 435 },
  { name: "Honey", calories: 304 },
  { name: "Maple syrup", calories: 260 },
  { name: "Jam", calories: 278 },

  // MORE SNACKS & SWEETS
  { name: "Dark chocolate", calories: 598 },
  { name: "Milk chocolate", calories: 535 },
  { name: "White chocolate", calories: 539 },
  { name: "Brownie", calories: 466 },
  { name: "Cheesecake", calories: 321 },
  { name: "Apple pie", calories: 237 },
  { name: "Chocolate chip cookie", calories: 488 },
  { name: "Muffin, blueberry", calories: 377 },
  { name: "Granola cereal", calories: 471 },
  { name: "Nachos", calories: 346 },
  { name: "Crackers, cheese", calories: 489 },
  { name: "Pudding, chocolate", calories: 120 },
  { name: "Gelatin dessert", calories: 62 },
  { name: "Ice pop", calories: 87 },

  // DRINKS
  { name: "Apple juice", calories: 46 },
  { name: "Cranberry juice", calories: 46 },
  { name: "Lemonade", calories: 40 },
  { name: "Sports drink", calories: 24 },
  { name: "Energy drink", calories: 45 },
  { name: "Milkshake, vanilla", calories: 112 },
  { name: "Smoothie, fruit", calories: 85 },
  { name: "Cappuccino", calories: 27 },
  { name: "Latte", calories: 43 },
  { name: "Hot chocolate", calories: 89 },
{ name: "Water", calories: 0 }
];

async function main() {
  const foodRows = CUSTOM_FOODS.map((item, index) => ({
    fdc_id: CUSTOM_FDC_START + index,
    description: item.name
  }));

  const nutrientRows = CUSTOM_FOODS.map((item, index) => ({
    id: CUSTOM_FDC_START + index,
    fdc_id: CUSTOM_FDC_START + index,
    nutrient_id: 1008,
    amount: item.calories
  }));

  const deleteStart = CUSTOM_FDC_START;

  const [deleteFoodsResult, deleteNutrientsResult] = await Promise.all([
    supabase.from("usda_foods").delete().gte("fdc_id", deleteStart),
    supabase.from("usda_food_nutrients_1008").delete().gte("fdc_id", deleteStart)
  ]);

  if (deleteFoodsResult.error) {
    throw deleteFoodsResult.error;
  }

  if (deleteNutrientsResult.error) {
    throw deleteNutrientsResult.error;
  }

  const { error: foodInsertError } = await supabase
    .from("usda_foods")
    .insert(foodRows);

  if (foodInsertError) {
    throw foodInsertError;
  }

  const { error: nutrientInsertError } = await supabase
    .from("usda_food_nutrients_1008")
    .insert(nutrientRows);

  if (nutrientInsertError) {
    throw nutrientInsertError;
  }

  console.log(`Seeded ${CUSTOM_FOODS.length} custom foods into Supabase.`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
