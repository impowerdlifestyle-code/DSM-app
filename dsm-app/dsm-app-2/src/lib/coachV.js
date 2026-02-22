// Coach V AI — Built from Valentino DiLorenzo's Real Coaching Style

export function getCoachVResponse(input) {
  const msg = input.toLowerCase()

  if (match(msg, ['hello','hi','hey','sup','coach'])) return random([
    "Yo! Coach V here. Let's lock in — what's on your mind today? 🔥",
    "What's up athlete! Talk to me. What do you need to work on? 💪",
    "Coach V in the building. You ready to work on that mindset? Let's go. 🦈",
  ])

  if (match(msg, ['mental loop','loop','system','process'])) return random([
    "The Mental Loop is your reset system:\n\n1 SHARK MENTALITY — go in aggressive, fearless, hungry\n2 GOLDFISH MENTALITY — mistake? Gone in 1-2 seconds\n3 POSITIVE SELF TALK — say 'next play' and mean it\n4 Back to SHARK — re-engage, attack again\n\nRuns on repeat the entire game. Master it and nothing can stop you. 🦈",
  ])

  if (match(msg, ['1v1','scared','afraid','fear','bigger','defender','physical','tackle','challenge'])) return random([
    "I hear this all the time. Bigger defender and your brain says 'don't do it.' That's your amygdala firing. Here's the truth: when you go in HESITANT, you're more likely to get hurt. When you commit fully — shark mentality — you're in control. Aggressive is safe. Hesitant is dangerous. Action step: Next 1v1, commit fully before you even touch the ball. 🦈",
    "Fear in 1v1s comes from focusing on what you DON'T want. Flip it. Focus on winning the ball. Focus on being aggressive. Shark mentality means you WANT the 1v1. Action step: In your next practice, seek out 1v1 situations instead of avoiding them.",
    "Bigger defenders aren't scarier — they're just bigger. Speed beats size. Technique beats size. Confidence beats size. The only thing holding you back is the story you're telling yourself. Change the story. You're a shark. Sharks don't back down. 🦈",
  ])

  if (match(msg, ['shark','aggressive','fearless','attack','risk'])) return random([
    "Shark Mentality means one thing: you keep moving forward. Sharks don't swim backwards. They don't hesitate. They don't ask for permission. On that pitch, you take risks. You challenge for balls you're not sure you'll win. That's the mentality. Action step: Make 3 aggressive decisions you'd normally avoid in your next session. 🦈",
    "Here's what I tell my athletes: go into tackles AGGRESSIVELY — safely, but aggressively. When you commit fully, you reduce injury risk and you win more balls. Hesitation is what gets you hurt. Commitment is what wins games. Be the shark. 🦈",
    "Shark Mentality is an identity, not just a strategy. You don't DO shark mentality — you ARE a shark. Before your next game say out loud: 'I am a shark. I am aggressive. I am fearless. I move forward.' Say it 3 times and mean every word.",
  ])

  if (match(msg, ['goldfish','mistake','forget','error','bad pass','miss','messed up','reset'])) return random([
    "Goldfish forget in 1-2 seconds. That's your superpower. Bad touch? 1-2 seconds, gone. Missed shot? 1-2 seconds, gone. Lost the 1v1? 1-2 seconds, GONE. The best players in the world have short memories. Action step: Every mistake today — shake your hands out and say 'next play.' 🐠",
    "Here's what happens when you dwell: your brain replays the error, you lose focus on the CURRENT play, you make another mistake. It's a cycle. The goldfish mentality BREAKS the cycle. 1-2 seconds max. Then locked back in.",
    "The mistake already happened. You can't change it. The ONLY thing you control is the next play. 1-2 seconds to process, then switch fully to what's in front of you. Goldfish mentality isn't weakness — it's elite mental skill. 🐠",
  ])

  if (match(msg, ['self talk','voice','head','negative','positive','inner'])) return random([
    "Your inner voice is either coaching you or destroying you. In tough moments — what's yours saying? Replace 'I can't do this' with 'next play' and 'I'm a shark.' Simple phrases that reset your brain. Action step: Write down 3 power phrases you'll use in your next game. 💬",
    "Positive self talk is a TOOL. When you say 'next play' after a mistake, you're telling your brain to stop processing the past and focus forward. Words create reality on the pitch.",
  ])

  if (match(msg, ['growth','fixed','mindset','improve','better','develop'])) return random([
    "Fixed mindset: 'I'm either good at this or I'm not.' Growth mindset: 'I'm not good at this YET.' That one word — YET — changes everything. Your abilities grow with effort. Every rep of ball mastery, every action step you log — that's you growing. Never stop. 💪",
    "Effort is the primary driver of success. Not talent. Not genetics. EFFORT. The athletes I've seen go furthest aren't always the most talented — they're the most disciplined. Are you putting in the work? Action step: Log your ball mastery today. 🔥",
  ])

  if (match(msg, ['confidence','confident','believe','doubt','unsure'])) return random([
    "Confidence isn't something you wait to feel — it's something you BUILD. Every rep of ball mastery. Every action step you complete. Every time you run the mental loop. You're building confidence brick by brick. You don't find it. You earn it. Action step: Log your training today. 💪",
    "Your brain focuses on what you tell it. If you're thinking 'I can't beat this defender' — your brain makes it true. Flip it. 'I am a shark. I take risks. I move forward.' Your body follows your mind. Train your mind first.",
  ])

  if (match(msg, ['nervous','nerves','anxiety','worried','stress','pressure'])) return random([
    "Nerves mean you care. Use them. Channel that energy into aggression, into focus, into your pre-match routine. 5 deep breaths. Shark mentality phrase. Visualize one aggressive action in the first 5 minutes. Then go compete. 🔥",
    "Reframe the nerves. Instead of 'I'm so nervous' say 'I'm so ready.' Same physical feeling — completely different mental response. Your brain believes what you tell it. Tell it you're ready. Tell it you're a shark.",
  ])

  if (match(msg, ['lost','lose','bad game','terrible','played bad'])) return random([
    "One bad game doesn't define you. What defines you is how you RESPOND. Goldfish mentality applies to games too. Process it, learn from it, move on. What's one thing you'll fix this week? 🐠",
    "Losses hurt. Good. That means you care. Now use that hurt. Write down ONE thing that went wrong and ONE specific thing you'll do in training to fix it. That's how champions are built — in the response to the losses.",
  ])

  if (match(msg, ['ball mastery','weak foot','technical','skills','training'])) return random([
    "15 minutes of ball mastery every single day. No exceptions. Daily technical work on weak foot, first touch, moves. It compounds. 15 mins today feels small. 15 mins for 6 months straight? That's elite technical ability. Log it. ⚽",
    "Weak foot work is non-negotiable. Your strong foot is already good — your weak foot is where your next level lives. Every day, at least 50% of your ball mastery should be weak foot. That discomfort is growth. 🔥",
  ])

  if (match(msg, ['action steps','form','log','submit','practice'])) return random([
    "Action steps after EVERY practice and game. No exceptions. Which mentalities did you use? When? How did it help? That's the data that shows me how you're growing. Don't skip it. ✅",
    "The action steps form is your mental performance log. Most athletes only track physical stats. You're tracking mental — shark moments, goldfish resets, self talk. That's what separates DSM athletes from everyone else.",
  ])

  if (match(msg, ['check in','weekly','tuesday','reflect'])) return random([
    "Weekly check-in before Tuesday. Every week. Your wins, your challenges, your DSM moments. That's how I coach you between sessions. Fill it in honestly. 📋",
    "The weekly check-in isn't homework — it's a coaching tool. When you write your biggest win, you reinforce it. When you write your challenge, you start solving it. When you set your goal, you commit to it.",
  ])

  if (match(msg, ['visualize','visualization','imagine','mental rep'])) return random([
    "Visualization is a mental rep. Your brain can't tell the difference between a vivid visualization and reality — it fires the same neural pathways. Before your next game: close your eyes, see yourself winning a 1v1, feel the aggression, run it 3 times. Then go do it. 👁️",
  ])

  if (match(msg, ['motivat','tired','lazy','hard','struggle'])) return random([
    "You don't need motivation — you need discipline. Motivation comes and goes. Discipline shows up every day whether you feel like it or not. Show up anyway. 🔥",
    "On the days you don't feel like it — those are the most important days. That's where champions separate themselves. 15 minutes of ball mastery even when you're tired. That's the work. 💪",
  ])

  if (match(msg, ['schedule','program','daily','how often'])) return random([
    "Your program structure:\n\nDAILY (Mon-Fri): 15 min ball mastery + weak foot\nPRACTICE DAYS: Action steps form after every session\nWEEKLY: Check-in form before Tuesday\nDAILY HABIT: Morning visualization, pre-match routine, reflection\n\nStay consistent. In 3 months you won't recognize yourself. 💪",
  ])

  if (match(msg, ['italy','scout','trial','professional','pro'])) return random([
    "You want that opportunity? Earn it. Get your ball mastery dialed in, get your mental game sharp, and when that trial comes — you'll be ready. The athletes who made it were the ones who were PREPARED. Are you preparing? 🔥",
  ])

  return random([
    "Lock in. Whatever you're going through — shark mentality. Keep moving forward. What specific challenge do you want to work on today? 🦈",
    "Talk to me. Give me more details and I'll give you a specific action step you can use today. 💪",
    "Process over outcome. Don't focus on the result — focus on the work. What's one thing you can do TODAY to get better? ⚽",
    "Every challenge has a solution. Tell me exactly what's happening and we'll break it down together. Shark, Goldfish, or Self Talk — which one do you need right now? 🔥",
  ])
}

function match(msg, keywords) {
  return keywords.some(k => msg.includes(k))
}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const SUGGESTED_QUESTIONS = [
  "How do I stop being scared in 1v1s?",
  "I keep dwelling on my mistakes",
  "I'm nervous before big games",
  "Explain the Mental Loop",
  "How do I build confidence?",
  "I had a bad game today",
  "What is Shark Mentality?",
  "What is Goldfish Mentality?",
  "How often should I train?",
  "I don't feel motivated today",
]
