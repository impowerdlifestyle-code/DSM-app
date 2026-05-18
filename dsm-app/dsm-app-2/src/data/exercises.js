// Mock exercise library — sport-focused for soccer athletes
export const EXERCISES = [
  // Lower body / power
  { id: 'back-squat', name: 'Back Squat', category: 'Lower', equipment: 'Barbell', primary: 'Quads, Glutes', tags: ['strength', 'compound'], demo: 'https://www.youtube.com/watch?v=ultWZbUMPL8' },
  { id: 'front-squat', name: 'Front Squat', category: 'Lower', equipment: 'Barbell', primary: 'Quads', tags: ['strength', 'compound'], demo: 'https://www.youtube.com/watch?v=tlfahNdNPPI' },
  { id: 'rdl', name: 'Romanian Deadlift', category: 'Lower', equipment: 'Barbell', primary: 'Hamstrings, Glutes', tags: ['strength', 'hinge'], demo: '' },
  { id: 'bulgarian-split', name: 'Bulgarian Split Squat', category: 'Lower', equipment: 'Dumbbells', primary: 'Quads, Glutes', tags: ['unilateral'], demo: '' },
  { id: 'hip-thrust', name: 'Barbell Hip Thrust', category: 'Lower', equipment: 'Barbell', primary: 'Glutes', tags: ['hinge'], demo: '' },
  { id: 'box-jump', name: 'Box Jump', category: 'Power', equipment: 'Plyo Box', primary: 'Posterior chain', tags: ['power', 'plyometric'], demo: '' },
  { id: 'depth-jump', name: 'Depth Jump', category: 'Power', equipment: 'Plyo Box', primary: 'Reactive strength', tags: ['power', 'plyometric'], demo: '' },
  { id: 'broad-jump', name: 'Broad Jump', category: 'Power', equipment: 'None', primary: 'Posterior chain', tags: ['power', 'plyometric'], demo: '' },

  // Upper body
  { id: 'bench', name: 'Bench Press', category: 'Upper', equipment: 'Barbell', primary: 'Chest, Triceps', tags: ['strength', 'compound'], demo: '' },
  { id: 'pull-up', name: 'Pull-Up', category: 'Upper', equipment: 'Bar', primary: 'Lats, Biceps', tags: ['strength', 'bodyweight'], demo: '' },
  { id: 'db-row', name: 'Dumbbell Row', category: 'Upper', equipment: 'Dumbbells', primary: 'Back', tags: ['strength'], demo: '' },
  { id: 'ohp', name: 'Overhead Press', category: 'Upper', equipment: 'Barbell', primary: 'Shoulders', tags: ['strength'], demo: '' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', category: 'Upper', equipment: 'Dumbbells', primary: 'Chest', tags: ['strength'], demo: '' },

  // Core / Stability
  { id: 'plank', name: 'Front Plank', category: 'Core', equipment: 'None', primary: 'Core', tags: ['isometric'], demo: '' },
  { id: 'side-plank', name: 'Side Plank', category: 'Core', equipment: 'None', primary: 'Obliques', tags: ['isometric'], demo: '' },
  { id: 'pallof', name: 'Pallof Press', category: 'Core', equipment: 'Band', primary: 'Anti-rotation', tags: ['stability'], demo: '' },
  { id: 'copenhagen', name: 'Copenhagen Adductor', category: 'Core', equipment: 'Bench', primary: 'Adductors', tags: ['prehab', 'soccer'], demo: '' },

  // Speed / Conditioning
  { id: 'a-skip', name: 'A-Skip', category: 'Speed', equipment: 'None', primary: 'Sprint mechanics', tags: ['speed', 'drill'], demo: '' },
  { id: 'sprint-30', name: '30m Sprint', category: 'Speed', equipment: 'None', primary: 'Max velocity', tags: ['speed'], demo: '' },
  { id: 'shuttle', name: 'Shuttle Run (5-10-5)', category: 'Speed', equipment: 'Cones', primary: 'Change of direction', tags: ['agility'], demo: '' },
  { id: 'tempo-200', name: 'Tempo 200m', category: 'Conditioning', equipment: 'Track', primary: 'Aerobic', tags: ['conditioning', 'tempo'], demo: '' },
  { id: 'yo-yo', name: 'Yo-Yo Recovery', category: 'Conditioning', equipment: 'Cones', primary: 'Repeat sprint ability', tags: ['conditioning', 'soccer'], demo: '' },

  // Soccer-specific
  { id: 'cone-dribble', name: 'Cone Dribbling', category: 'Soccer', equipment: 'Cones + Ball', primary: 'Ball control', tags: ['technical', 'soccer'], demo: '' },
  { id: 'wall-pass', name: 'Wall Pass (1-touch)', category: 'Soccer', equipment: 'Wall + Ball', primary: 'First touch', tags: ['technical', 'soccer'], demo: '' },
  { id: 'finishing', name: 'Finishing Drill', category: 'Soccer', equipment: 'Goal + Ball', primary: 'Shot accuracy', tags: ['technical', 'soccer'], demo: '' },
]

export const EX_CATEGORIES = ['All', 'Lower', 'Upper', 'Power', 'Core', 'Speed', 'Conditioning', 'Soccer']

// Today's prescribed workout (mocked — would come from coach-assigned program)
export const TODAYS_WORKOUT = {
  id: 'mon-week3',
  name: 'Lower Strength + Speed',
  block: 'Week 3 · Lower A',
  duration: '52 min',
  exercises: [
    { exId: 'box-jump', sets: 3, reps: '5', weight: 'bodyweight', rest: 120, notes: 'Land soft, max height' },
    { exId: 'back-squat', sets: 4, reps: '6', weight: '185 lb', rest: 180, notes: 'Top set @ RPE 8' },
    { exId: 'rdl', sets: 3, reps: '8', weight: '135 lb', rest: 120, notes: '' },
    { exId: 'bulgarian-split', sets: 3, reps: '8/leg', weight: '40 lb', rest: 90, notes: '' },
    { exId: 'copenhagen', sets: 3, reps: '8/side', weight: 'bodyweight', rest: 60, notes: 'Prehab' },
    { exId: 'sprint-30', sets: 4, reps: '1', weight: '—', rest: 240, notes: 'Full recovery' },
  ],
}

// Mocked PR history (would come from workout_logs)
export const PR_HISTORY = [
  { exId: 'back-squat', value: '275 lb × 3', date: '2026-05-08', delta: '+10 lb' },
  { exId: 'bench',      value: '205 lb × 5', date: '2026-05-12', delta: '+5 lb' },
  { exId: 'broad-jump', value: '9\' 4"',     date: '2026-04-30', delta: '+3"' },
  { exId: 'sprint-30',  value: '4.21 s',     date: '2026-05-14', delta: '-0.08 s' },
]
