export const QUOTES = [
  "The body achieves what the mind believes. Train your mind first.",
  "Champions aren't born. They're built -- one mental rep at a time.",
  "Pressure is a privilege. You're in a game worth playing.",
  "Process over outcome. Lock in, and the scoreboard takes care of itself.",
  "Mistakes are feedback, not failure. Learn and move forward.",
  "Your identity as an athlete starts in your mind before it shows on the pitch.",
]

export const HABITS_LIST = ["Morning visualization", "Pre-match mental routine", "Post-session reflection", "Read DSM lesson", "Recovery protocol"]
export const DAYS = ["M", "T", "W", "T", "F", "S", "S"]
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// Ball Mastery & Dribbling drills. Each can carry a video — fill the `videos`
// url once Valentino's clips are uploaded (YouTube watch URL or a Drive
// "anyone with link" share URL), e.g. videos: [{ label: "Watch", url: "..." }].
const DRILL_VIDEO = 'https://voxsrncpxfuzcspkkzkn.supabase.co/storage/v1/object/public/drills'
export const BALL_MASTERY_SKILLS = [
  { id: "diamond_ball_mastery",        label: "Diamond Ball Mastery",        icon: "🔷", videos: [{ label: "Watch", url: `${DRILL_VIDEO}/diamond-ball-mastery.mp4` }] },
  { id: "ball_mastery_drills",         label: "Ball Mastery Drills",         icon: "⚽", videos: [{ label: "Watch", url: `${DRILL_VIDEO}/ball-mastery-drills.mp4` }] },
  { id: "three_cone_ball_mastery",     label: "Three Cone Ball Mastery",     icon: "🔺", videos: [{ label: "Watch", url: `${DRILL_VIDEO}/three-cone-ball-mastery.mp4?v=2` }] },
  { id: "one_cone_ball_mastery_drill", label: "One Cone Ball Mastery Drill", icon: "🔻", videos: [{ label: "Watch", url: `${DRILL_VIDEO}/one-cone-ball-mastery-drill.mp4` }] },
]

export const PARENT_GUIDE = [
  { icon: "⚽", title: "Before The Match", content: "Say: 'I love watching you play.' Avoid adding pressure about performance. Your child needs unconditional support, not conditional love based on results." },
  { icon: "🏁", title: "After The Match", content: "Wait 30 minutes before discussing the game. Start with: 'How did YOU feel out there?' Let them lead. Avoid immediately pointing out mistakes." },
  { icon: "💪", title: "Handling Losses", content: "Losses are the greatest teachers. Ask: 'What did you learn today?' Never blame teammates, referees, or coaches. Model resilience and perspective." },
  { icon: "🔥", title: "Building Confidence", content: "Catch them doing things RIGHT. Praise effort over outcome. Say: 'I noticed how hard you worked on that' -- not just 'great game.'" },
  { icon: "🧠", title: "Avoiding Pressure", content: "Your child can feel your anxiety. Stay calm in the stands. Cheering is great -- coaching from the sidelines creates confusion and anxiety." },
  { icon: "📋", title: "Weekly Check-In", content: "Ask every week: 'What's one thing you're proud of?' and 'What's one thing you want to improve?' Keep it positive and forward-focused." },
]

export const RESOURCES = [
  { title: "DSM Program Guide", desc: "Core program curriculum and methodology", url: "https://docs.google.com/document/d/1fgrgpzgj5L4qPvpbZBdFW2O3LFs6MvI1hv7k46nq23g/edit?usp=sharing", locked: false },
  { title: "Elite Program Continuation", desc: "Advanced program for elite athletes", url: "https://docs.google.com/document/d/1qS1XaBc3dUyWIjtyG1EeeycCGSryj5qyc6p6RVRbZOo/edit?usp=sharing", locked: true },
  { title: "Action Steps Feedback Form", desc: "Original form template", url: "https://docs.google.com/document/d/15LZfqewpb-BSPUx9eSyBzaNmkHRaSb-Bx3V3tckwMS0/edit?tab=t.0", locked: false },
]

export const AI_SYSTEM = `You are Coach Valentino -- the AI version of Valentino Di Lorenzo, founder of DiLorenzo Soccer Mindset (DSM). Your background: former semi-professional player from Italy with 26 years of experience. You had youth trials with Inter, Parma, and Modena. You played in the Serie A2 Futsal League in Italy. You came to the US and played with Morris Elite, then coached at the Juventus Academy. You are a Certified USSF State and National coach and a Certified Growth Mindset and Life Coach. You were that scared kid growing up -- a mentor changed everything for you and you became captain of multiple teams in Italy and the US. That is why you built DSM -- to give every young player the mentor you never had. You have transformed 500+ players in 90 days. The program uses: Shark Mentality (fearless, aggressive, forward), Goldfish Mentality (3 second memory for mistakes), Positive Self Talk, Visualization, and Goal Setting. Your style is direct, warm, and real. Keep responses concise and punchy. Never say you are an AI -- you ARE Coach Valentino.`

export const emptyForm = {
  playerName: '',
  sessionType: 'Practice',
  date: new Date().toISOString().split('T')[0],
  dayOfWeek: WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
  didSteps: '',
  usedSteps: {},
  occasions: {},
  comments: {},
  conditioning: 7,
  strength: 7,
  technical: 7,
  mental: 7,
}

export const emptyCheckin = {
  biggestWin: '',
  biggestChallenge: '',
  sharkMoment: '',
  goldfishMoment: '',
  selfTalkMoment: '',
  energyLevel: 7,
  confidenceLevel: 7,
  sessionsCompleted: 3,
  goalNextWeek: '',
  messageToCoach: '',
  smartGoal: '',
  goalProgress: '',
  didVisualization: false,
  visualizationNotes: '',
  didMorningRoutine: false,
  morningRoutineNotes: '',
}
