// Mock food database — common items for athlete macro tracking
// All values per single serving
export const FOODS = [
  // Proteins
  { id: 'chicken-breast', name: 'Chicken Breast', serving: '6 oz · grilled', cal: 280, p: 53, c: 0,  f: 6,  fav: true },
  { id: 'greek-yogurt',   name: 'Greek Yogurt',   serving: '1 cup · plain',   cal: 130, p: 23, c: 8,  f: 0,  fav: true },
  { id: 'whey',           name: 'Whey Protein',   serving: '1 scoop',          cal: 120, p: 24, c: 3,  f: 1,  fav: true },
  { id: 'eggs',           name: 'Eggs',           serving: '3 large',          cal: 215, p: 18, c: 1,  f: 14, fav: true },
  { id: 'salmon',         name: 'Salmon',         serving: '6 oz · baked',    cal: 360, p: 40, c: 0,  f: 20, fav: false },
  { id: 'tuna',           name: 'Canned Tuna',    serving: '1 can · 5 oz',    cal: 110, p: 26, c: 0,  f: 1,  fav: false },

  // Carbs
  { id: 'oats',           name: 'Oatmeal',        serving: '1 cup · cooked',  cal: 165, p: 6,  c: 28, f: 4,  fav: true },
  { id: 'rice-white',     name: 'White Rice',     serving: '1 cup · cooked',  cal: 205, p: 4,  c: 45, f: 0,  fav: true },
  { id: 'sweet-potato',   name: 'Sweet Potato',   serving: '1 large',          cal: 180, p: 4,  c: 41, f: 0,  fav: false },
  { id: 'banana',         name: 'Banana',         serving: '1 medium',         cal: 105, p: 1,  c: 27, f: 0,  fav: true },
  { id: 'whole-bread',    name: 'Whole Grain Bread', serving: '2 slices',     cal: 160, p: 8,  c: 28, f: 2,  fav: false },
  { id: 'pasta',          name: 'Pasta',          serving: '2 cups · cooked', cal: 440, p: 16, c: 88, f: 2,  fav: false },

  // Fats
  { id: 'almonds',        name: 'Almonds',        serving: '1 oz · 23 nuts',  cal: 165, p: 6,  c: 6,  f: 14, fav: false },
  { id: 'avocado',        name: 'Avocado',        serving: '½ fruit',          cal: 160, p: 2,  c: 9,  f: 15, fav: false },
  { id: 'olive-oil',      name: 'Olive Oil',      serving: '1 tbsp',           cal: 120, p: 0,  c: 0,  f: 14, fav: false },
  { id: 'peanut-butter',  name: 'Peanut Butter',  serving: '2 tbsp',           cal: 190, p: 8,  c: 7,  f: 16, fav: true },

  // Recovery / staples
  { id: 'gatorade',       name: 'Gatorade',       serving: '20 oz bottle',    cal: 140, p: 0,  c: 36, f: 0,  fav: false },
  { id: 'protein-bar',    name: 'Protein Bar',    serving: '1 bar',            cal: 220, p: 20, c: 24, f: 7,  fav: true },
  { id: 'milk-whole',     name: 'Whole Milk',     serving: '1 cup',            cal: 150, p: 8,  c: 12, f: 8,  fav: false },
  { id: 'apple',          name: 'Apple',          serving: '1 medium',         cal: 95,  p: 0,  c: 25, f: 0,  fav: false },
  { id: 'broccoli',       name: 'Broccoli',       serving: '1 cup · steamed', cal: 55,  p: 4,  c: 11, f: 1,  fav: false },
]

// Daily targets for an active soccer athlete (~17yo, 160lb)
export const NUTRITION_TARGETS = {
  cal: 2800,
  p: 175,   // grams protein
  c: 360,   // grams carbs
  f: 80,    // grams fat
}

// Mocked initial daily log (so the screen looks lived-in)
export const SEED_FOOD_LOG = [
  { id: '1', foodId: 'oats',         meal: 'Breakfast', qty: 1, time: '7:15 AM' },
  { id: '2', foodId: 'eggs',         meal: 'Breakfast', qty: 1, time: '7:15 AM' },
  { id: '3', foodId: 'banana',       meal: 'Snack',     qty: 1, time: '10:30 AM' },
  { id: '4', foodId: 'chicken-breast', meal: 'Lunch',   qty: 1, time: '12:45 PM' },
  { id: '5', foodId: 'rice-white',   meal: 'Lunch',     qty: 2, time: '12:45 PM' },
  { id: '6', foodId: 'whey',         meal: 'Snack',     qty: 1, time: '4:00 PM' },
  { id: '7', foodId: 'protein-bar',  meal: 'Snack',     qty: 1, time: '4:00 PM' },
]

// Mocked weekly trend (avg calories per day, last 7 days)
export const WEEKLY_TREND = [2640, 2820, 2710, 2890, 2580, 2950, 2730]

// Mocked body stats history for charts
export const BODY_STATS_HISTORY = [
  { date: '2026-03-18', weight: 158.2, bodyFat: 12.8 },
  { date: '2026-03-25', weight: 158.0, bodyFat: 12.5 },
  { date: '2026-04-01', weight: 159.4, bodyFat: 12.3 },
  { date: '2026-04-08', weight: 159.8, bodyFat: 12.0 },
  { date: '2026-04-15', weight: 160.2, bodyFat: 11.8 },
  { date: '2026-04-22', weight: 160.8, bodyFat: 11.6 },
  { date: '2026-04-29', weight: 161.0, bodyFat: 11.4 },
  { date: '2026-05-06', weight: 161.6, bodyFat: 11.3 },
  { date: '2026-05-13', weight: 162.0, bodyFat: 11.1 },
]

export const CURRENT_MEASUREMENTS = {
  weight: 162.0,
  bodyFat: 11.1,
  chest: 40.5,
  waist: 31.5,
  arm: 14.0,
  thigh: 22.5,
  resting_hr: 52,
  vo2: 56,
}

// Mocked calendar events for the week
export const CALENDAR_EVENTS = [
  { date: '2026-05-18', type: 'workout',  title: 'Lower Strength + Speed', time: '6:00 AM', status: 'today' },
  { date: '2026-05-18', type: 'practice', title: 'Team Practice',            time: '4:30 PM', status: 'today' },
  { date: '2026-05-19', type: 'workout',  title: 'Upper + Conditioning',     time: '6:00 AM', status: 'upcoming' },
  { date: '2026-05-20', type: 'practice', title: 'Team Practice',            time: '4:30 PM', status: 'upcoming' },
  { date: '2026-05-21', type: 'workout',  title: 'Recovery + Mobility',     time: '6:00 AM', status: 'upcoming' },
  { date: '2026-05-22', type: 'game',     title: 'Game vs. Hillsborough',   time: '7:00 PM', status: 'upcoming' },
  { date: '2026-05-23', type: 'rest',     title: 'Rest Day',                 time: 'All day', status: 'upcoming' },
  { date: '2026-05-24', type: 'workout',  title: 'Lower Power',              time: '8:00 AM', status: 'upcoming' },
]

// Coach-message templates for the upgraded chat
export const COACH_TEMPLATES = [
  "How are you feeling after yesterday's session?",
  "Send me a video of your warm-up today",
  "Great work this week — let's review your check-in",
  "Pre-game mindset: 3 deep breaths, 1 cue word, lock in 🦈",
  "Recovery focus today. Light mobility only.",
]
