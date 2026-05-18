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

export const BALL_MASTERY_SKILLS = [
  { id: "toe_taps", label: "Toe Taps", icon: "⚽", videos: [{ label: "Toe Taps", url: "https://www.youtube.com/watch?v=dRAXOXBhoJk" }] },
  { id: "inside_outside", label: "Inside/Outside", icon: "🦶", videos: [{ label: "Inside/Outside", url: "https://www.youtube.com/watch?v=cJZChBCkpL4" }] },
  { id: "pullbacks", label: "Pull Backs", icon: "↩️", videos: [{ label: "Pull Backs", url: "https://www.youtube.com/watch?v=FzEkGHFCXTk" }] },
  { id: "scissors", label: "Scissors", icon: "✂️", videos: [{ label: "Scissors", url: "https://www.youtube.com/watch?v=4L3H3p-QO2I" }] },
  { id: "v_moves", label: "V Moves", icon: "✌️", videos: [{ label: "V Moves", url: "https://www.youtube.com/watch?v=ZbNDD73dBiI" }] },
  { id: "dribbling", label: "Dribbling", icon: "🏃", videos: [{ label: "Dribbling", url: "https://www.youtube.com/watch?v=U3N_qXaqrtI" }] },
  { id: "passing", label: "Passing", icon: "➡️", videos: [{ label: "Passing Basics", url: "https://www.youtube.com/watch?v=aBMqR7L2BgA" }, { label: "Passing & First Touch", url: "https://www.youtube.com/watch?v=NH4ZxxBnFW8" }] },
  { id: "shooting", label: "Shooting", icon: "🥅", videos: [{ label: "Shooting Technique", url: "https://www.youtube.com/watch?v=aJwWT54fvmQ" }, { label: "Power Shot", url: "https://www.youtube.com/watch?v=uTCLJ4_i8o0" }] },
  { id: "first_touch", label: "First Touch", icon: "🎯", videos: [{ label: "First Touch Basics", url: "https://www.youtube.com/watch?v=rFbNVGvJHMI" }, { label: "Passing & First Touch", url: "https://www.youtube.com/watch?v=NH4ZxxBnFW8" }] },
  { id: "juggling", label: "Juggling", icon: "🔄", videos: [{ label: "Juggling", url: "https://www.youtube.com/watch?v=MHpFzCQMoGE" }] },
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
