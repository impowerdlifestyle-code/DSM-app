import { useState, useEffect, useRef } from 'react'
import { supabase, signOut, submitActionSteps, getActionSteps, saveHabits, getHabits, logDay, getAllProfiles, getAllActionSteps, updateAccessLevel } from '../lib/supabase.js'

const QUOTES = [
  "The body achieves what the mind believes. Train your mind first.",
  "Champions aren't born. They're built — one mental rep at a time.",
  "Pressure is a privilege. You're in a game worth playing.",
  "Process over outcome. Lock in, and the scoreboard takes care of itself.",
  "Mistakes are feedback, not failure. Learn and move forward.",
  "Your identity as an athlete starts in your mind before it shows on the pitch.",
]

const HABITS_LIST = ["Morning visualization", "Pre-match mental routine", "Post-session reflection", "Read DSM lesson", "Recovery protocol"]
const DAYS = ["M", "T", "W", "T", "F", "S", "S"]
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const BALL_MASTERY_SKILLS = [
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

const PARENT_GUIDE = [
  { icon: "⚽", title: "Before The Match", content: "Say: 'I love watching you play.' Avoid adding pressure about performance. Your child needs unconditional support, not conditional love based on results." },
  { icon: "🏁", title: "After The Match", content: "Wait 30 minutes before discussing the game. Start with: 'How did YOU feel out there?' Let them lead. Avoid immediately pointing out mistakes." },
  { icon: "💪", title: "Handling Losses", content: "Losses are the greatest teachers. Ask: 'What did you learn today?' Never blame teammates, referees, or coaches. Model resilience and perspective." },
  { icon: "🔥", title: "Building Confidence", content: "Catch them doing things RIGHT. Praise effort over outcome. Say: 'I noticed how hard you worked on that' — not just 'great game.'" },
  { icon: "🧠", title: "Avoiding Pressure", content: "Your child can feel your anxiety. Stay calm in the stands. Cheering is great — coaching from the sidelines creates confusion and anxiety." },
  { icon: "📋", title: "Weekly Check-In", content: "Ask every week: 'What's one thing you're proud of?' and 'What's one thing you want to improve?' Keep it positive and forward-focused." },
]

const RESOURCES = [
  { title: "DSM Program Guide", desc: "Core program curriculum and methodology", url: "https://docs.google.com/document/d/1fgrgpzgj5L4qPvpbZBdFW2O3LFs6MvI1hv7k46nq23g/edit?usp=sharing", locked: false },
  { title: "Elite Program Continuation", desc: "Advanced program for elite athletes", url: "https://docs.google.com/document/d/1qS1XaBc3dUyWIjtyG1EeeycCGSryj5qyc6p6RVRbZOo/edit?usp=sharing", locked: true },
  { title: "Action Steps Feedback Form", desc: "Original form template", url: "https://docs.google.com/document/d/15LZfqewpb-BSPUx9eSyBzaNmkHRaSb-Bx3V3tckwMS0/edit?tab=t.0", locked: false },
]

const AI_SYSTEM = `You are Coach Valentino — the AI version of Valentino DiLorenzo, founder of DiLorenzo Soccer Mindset (DSM). You coach youth soccer athletes on mental performance. Your style is direct, energetic, and motivating. You believe mindset comes BEFORE skill. You teach: Shark Mentality (taking risks, aggressive, fearless), Goldfish Mentality (short term memory for mistakes — forget and move on), and Positive Self Talk. Use phrases like "lock in", "dominate", "elite mindset", "process over outcome", "be a shark not a fish". Always end with an action step. You're tough but caring. Keep responses concise and punchy. Never say you're an AI — you ARE Coach Valentino.`

const ELEVEN_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const ELEVEN_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID

const emptyForm = {
  playerName: '', sessionType: 'Practice',
  date: new Date().toISOString().split('T')[0],
  dayOfWeek: WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
  didSteps: '', usedSteps: {}, occasions: {}, comments: {},
  conditioning: 7, strength: 7, technical: 7, mental: 7,
}

const emptyCheckin = {
  biggestWin: '', biggestChallenge: '',
  sharkMoment: '', goldfishMoment: '', selfTalkMoment: '',
  energyLevel: 7, confidenceLevel: 7, sessionsCompleted: 3,
  goalNextWeek: '', messageToCoach: '',
}

function getWeekKey() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}


// ── COACH VALENTINO RESPONSES (built-in) ──
const SUGGESTED_QUESTIONS = [
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

function matchMsg(msg, keywords) {
  return keywords.some(k => msg.includes(k))
}
function randomMsg(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getCoachVResponse(input) {
  const msg = input.toLowerCase()
  if (matchMsg(msg, ['hello','hi','hey','sup','coach'])) return randomMsg([
    "Yo! Coach Valentino here. Let's lock in — what's on your mind today? 🔥",
    "What's up athlete! Talk to me. What do you need to work on? 💪",
    "Coach Valentino in the building. Ready to work on that mindset? Let's go. 🦈",
  ])
  if (matchMsg(msg, ['mental loop','loop','system','process'])) return randomMsg([
    "The Mental Loop is your reset system:\n\n1️⃣ SHARK MENTALITY — go in aggressive, fearless, hungry\n2️⃣ GOLDFISH MENTALITY — mistake? Gone in 1-2 seconds\n3️⃣ POSITIVE SELF TALK — say next play and mean it\n4️⃣ Back to SHARK — re-engage, attack again\n\nRuns on repeat the entire game. Master it and nothing can stop you. 🦈",
  ])
  if (matchMsg(msg, ['1v1','scared','afraid','fear','bigger','defender','physical','tackle','challenge'])) return randomMsg([
    "I hear this all the time. Bigger defender and your brain says don't do it. That's your amygdala firing. Here's the truth: when you go in HESITANT, you're more likely to get hurt. When you commit fully — shark mentality — you're in control. Aggressive is safe. Hesitant is dangerous. Action step: Next 1v1, commit fully before you even touch the ball. 🦈",
    "Fear in 1v1s comes from focusing on what you DON'T want. Flip it. Focus on winning the ball. Shark mentality means you WANT the 1v1. Action step: In your next practice, seek out 1v1 situations instead of avoiding them.",
    "Bigger defenders aren't scarier — they're just bigger. Speed beats size. Confidence beats size. The only thing holding you back is the story you're telling yourself. Change the story. You're a shark. 🦈",
  ])
  if (matchMsg(msg, ['shark','aggressive','fearless','attack','risk'])) return randomMsg([
    "Shark Mentality means one thing: you keep moving forward. Sharks don't swim backwards. They don't hesitate. On that pitch, you take risks. You challenge for balls you're not sure you'll win. Action step: Make 3 aggressive decisions you'd normally avoid in your next session. 🦈",
    "Shark Mentality is an identity, not just a strategy. You don't DO shark mentality — you ARE a shark. Before your next game say out loud: I am a shark. I am aggressive. I am fearless. I move forward. Say it 3 times. 🦈",
  ])
  if (matchMsg(msg, ['goldfish','mistake','forget','error','bad pass','miss','messed up','reset'])) return randomMsg([
    "Goldfish forget in 1-2 seconds. That's your superpower. Bad touch? Gone. Missed shot? Gone. Lost the 1v1? GONE. The best players in the world have short memories. Action step: Every mistake today — shake your hands out and say next play. 🐠",
    "The mistake already happened. You can't change it. The ONLY thing you control is the next play. 1-2 seconds to process, then switch fully to what's in front of you. Goldfish mentality is elite mental skill. 🐠",
  ])
  if (matchMsg(msg, ['self talk','voice','head','negative','positive','inner'])) return randomMsg([
    "Your inner voice is either coaching you or destroying you. Replace I can't do this with next play and I'm a shark. Simple phrases that reset your brain. Action step: Write down 3 power phrases you'll use in your next game. 💬",
  ])
  if (matchMsg(msg, ['growth','fixed','mindset','improve','better','develop'])) return randomMsg([
    "Fixed mindset: I'm either good at this or I'm not. Growth mindset: I'm not good at this YET. That one word — YET — changes everything. Your abilities grow with effort. Every rep of ball mastery, every action step you log — that's you growing. 💪",
  ])
  if (matchMsg(msg, ['confidence','confident','believe','doubt','unsure'])) return randomMsg([
    "Confidence isn't something you wait to feel — it's something you BUILD. Every rep of ball mastery. Every action step you complete. You're building confidence brick by brick. You don't find it. You earn it. 💪",
    "Your brain focuses on what you tell it. Flip it. I am a shark. I take risks. I move forward. Your body follows your mind. Train your mind first.",
  ])
  if (matchMsg(msg, ['nervous','nerves','anxiety','worried','stress','pressure'])) return randomMsg([
    "Nerves mean you care. Use them. Channel that energy into aggression, into your pre-match routine. 5 deep breaths. Shark mentality phrase. Visualize one aggressive action in the first 5 minutes. Then go compete. 🔥",
    "Reframe the nerves. Instead of I'm so nervous say I'm so ready. Same physical feeling — completely different mental response. Your brain believes what you tell it. Tell it you're a shark.",
  ])
  if (matchMsg(msg, ['lost','lose','bad game','terrible','played bad'])) return randomMsg([
    "One bad game doesn't define you. What defines you is how you RESPOND. Goldfish mentality applies to games too. Process it, learn from it, move on. What's one thing you'll fix this week? 🐠",
    "Losses hurt. Good. That means you care. Now use that hurt. Name ONE thing that went wrong and ONE thing you'll do in training to fix it. That's how champions are built. 💪",
  ])
  if (matchMsg(msg, ['ball mastery','weak foot','technical','skills','training'])) return randomMsg([
    "15 minutes of ball mastery every single day. No exceptions. Daily technical work on weak foot, first touch, moves. It compounds. 15 mins for 6 months straight? That's elite technical ability. Log it. ⚽",
    "Weak foot work is non-negotiable. Your strong foot is already good — your weak foot is where your next level lives. Every day, at least 50% of your ball mastery should be weak foot. That discomfort is growth. 🔥",
  ])
  if (matchMsg(msg, ['downshift','downshifting breath','calm breath','4 second','inhale 4','box breath','breathing technique'])) return randomMsg([
    "The downshifting breath is for when you need to CALM DOWN — too amped, too frustrated, too in your head:\n\nInhale for 4 seconds — clench your fists\nHold for 2 seconds\nExhale for 6 seconds — release your fists\n\nDo this once or twice and your nervous system physically calms down. Use it before big moments, at halftime, or when frustration is building. Practice it in ball mastery so it is automatic. 💨",
  ])
  if (matchMsg(msg, ['energizing breath','energy breath','pump up','fire up','wake up','get going','fast exhale'])) return randomMsg([
    "The energizing breath is for when you need to WAKE UP — flat, low energy, not switched on:\n\nStrong inhale through the nose\nFast forceful exhale through the mouth\n\nOne or two of these and your body gets a shot of energy. Use it before kickoff, coming off the bench, or when you feel flat in the second half. Quick inhale, BOOM exhale. Fire yourself up. 🔥",
  ])
  if (matchMsg(msg, ['reactive','responsive','reactive self talk','responsive self talk','respond not react'])) return randomMsg([
    "There are two types of self-talk after a mistake:\n\nREACTIVE — automatic, negative, self-defeating. I am trash. Why did I do that. I suck.\nRESPONSIVE — chosen, positive, constructive. Forget it. Lock in. Next play.\n\nYou cannot stop the reactive thought from firing. But you CAN choose the responsive one that follows. That choice is your superpower. Train it every day in ball mastery. 💬",
  ])
  if (matchMsg(msg, ['rate mental','mental performance','1 to 10','mental score','rate yourself','felt in the zone','got distracted'])) return randomMsg([
    "When you fill in your action steps, rate your MENTAL performance 1-10 — not just your physical. And write a note explaining the score. Felt in the zone? What created that? Got distracted? What triggered it? The more detail you give, the better I can coach you. This data is how we track your real progress. 📊",
  ])
  if (matchMsg(msg, ['forget it','lock in','cue','cue word','trigger word','keyword','phrase'])) return randomMsg([
    "Your cue words are the triggers for your reset routine. Forget it — that is your goldfish cue. The mistake is gone. Lock in — that is your shark cue. You are back, aggressive, focused. Two words. That is the whole system. Use them EVERY time in ball mastery so they are completely automatic by game day. 🦈",
    "Pick your cue words and stick with them. Forget it. Next play. Let it go. Whatever goldfish phrase snaps you out of the past. Then Lock in. Be hungry. I got this. Whatever shark phrase fires you back up. Same words every time. Repetition builds the habit. The habit saves you in big moments. 🔥",
  ])
  if (matchMsg(msg, ['spiral','prevent spiral','stop spiraling','one mistake leads','snowball'])) return randomMsg([
    "The reset routine exists for one reason — to prevent the spiral. Mistake happens. You react. If you do NOT reset, the frustration carries into the next play. Then the next. Suddenly one bad touch turned into five bad minutes. The reset routine BREAKS that chain at step one. Goldfish it. Breathe. Shark back. Done. Do not let one mistake become five. 🦈",
    "Spiraling after mistakes is almost never physical — it is mental. Your technique does not suddenly get worse. Your FOCUS does. The reset routine brings your focus back to the present play where it belongs. Practice it after every mistake in ball mastery. Even the tiny ones. Build the habit when the pressure is low so it fires automatically when the pressure is high. 🔥",
  ])
  if (matchMsg(msg, ['helpful','unhelpful','resetting statement','reset statement','helpful self talk','check focus','awareness','notice'])) return randomMsg([
    "Stop thinking about self-talk as positive vs negative. Think about it as HELPFUL vs UNHELPFUL. The question is not: is this thought positive? The question is: is this thought helping me focus on the right things RIGHT NOW? If not — replace it with a resetting statement and get back in the game. 💬",
    "Here is the 4-step reset process for on-field self-talk:\n\n1 TRIGGER — mistake happens\n2 SELF-TALK 1 — automatic reaction fires (I suck, why did I do that)\n3 CHECK FOCUS — ask yourself: is this helping me right now?\n4 REFOCUS — use your resetting statement to get back to the present\n\nThe first step is just AWARENESS. Notice the unhelpful thought. That is it. You cannot replace what you cannot catch. Start there. 🔥",
    "Your brain will always have automatic reactions to mistakes — that is Self-Talk 1 and you cannot stop it. What you CAN control is Self-Talk 2 — your chosen resetting statement that brings you back to the present. Next play. Lock in. I got this. Pick yours. Practice it. Make it automatic. 💪",
  ])
  if (matchMsg(msg, ['resetting','reset statement','refocus','present play','past mistake','focus on present'])) return randomMsg([
    "Unhelpful self-talk after a mistake does one thing: it pulls your focus to the PAST. But the game is happening RIGHT NOW. Your resetting statement is what snaps you back to the present. It does not have to be positive — it just has to redirect your focus. Next play. Here. Now. That is all you need. 🦈",
    "Pair your resetting statement with a physical cue — deep breath, clap your hands, tap your chest. The physical action makes the reset more powerful and more automatic. Over time your brain learns: physical cue means reset. It fires without thinking. That is the goal. 🔥",
  ])
  if (matchMsg(msg, ['i suck','why did i','hate myself','so bad','terrible player','useless'])) return randomMsg([
    "That automatic reaction after a mistake — I suck, why did I do that — is Self-Talk 1. It is automatic. You cannot stop it firing. But you CAN stop it running the show. The moment you notice it, ask: is this helping me right now? The answer is no. So use your resetting statement. Next play. Back to the present. That is the move. 💬",
  ])
  if (matchMsg(msg, ['complacent','complacency','after a goal','too excited','celebrate too much','high after goal'])) return randomMsg([
    "Self-talk is not just for bad moments — it is for good ones too. Scored a great goal? Awesome. Enjoy it for 2 seconds. Then reset. Complacency after success is just as dangerous as frustration after mistakes. Stay locked in. The game is not over. Shark mentality does not take plays off. 🦈",
  ])
  if (matchMsg(msg, ['scanning','check shoulder','awareness','see the field','look before'])) return randomMsg([
    "Scanning before you receive the ball is one of the most underrated skills in football. Check your shoulder BEFORE the ball comes to you. Know where the pressure is. Know where your options are. By the time the ball arrives, your decision is already made. That is elite decision making. Build it into your ball mastery habit. ⚽",
  ])
  if (matchMsg(msg, ['smart goal','smart','specific','measurable','achievable','relevant','time bound','deadline'])) return randomMsg([
    "SMART goals turn vague wishes into a real plan:\n\nSPECIFIC — what, when, where\nMEASURABLE — how do you track it?\nACHIEVABLE — is it realistic?\nRELEVANT — does it matter to your game?\nTIME-BOUND — what is the deadline?\n\nExample: Practice right-foot passes 20 times, 3x per week, for 1 month. That is a SMART goal. Not just get better at passing. Be specific. Track it. Do it. 💪",
    "Vague goals get vague results. Make it SMART. Specific actions, measurable progress, a real deadline. Now you have a target you can actually hit. Action step: Take one goal you have right now and make it SMART. Write it down tonight. 🎯",
  ])
  if (matchMsg(msg, ['bench','not playing','playing time','substitute','sub','sitting out','quit','want to quit','demotivat'])) return randomMsg([
    "Bench time is NOT wasted time — if you use it right. Elite athletes on the bench do active visualization. Watch the game. Identify the opponent patterns. Mentally rehearse YOUR moment before it comes. When the coach calls your name, your brain is already ready. That is the difference between a player who sits and a player who PREPARES. 🦈",
    "Feeling frustrated about playing time? That frustration is a heavy weight — and heavy weights BUILD strength. Every athlete who ever made it went through periods of not playing. Salah sat on the bench. The ones who made it used bench time to get ready for their moment. Your moment is coming. Are you preparing for it? 💪",
    "Wanting to quit because you are not playing? That feeling makes sense. But quitting guarantees you never get the chance. Set process goals. Control what you can control. Use bench time for visualization. Journal your daily wins. Stay in it. Your moment comes to those who stay ready. 🔥",
  ])
  if (matchMsg(msg, ['journal','daily wins','write down wins','track wins','log wins','cheerleader'])) return randomMsg([
    "Journal your daily wins — every single day. Write down ONE thing you did well. Not goals. Not assists. One moment where you competed, reset, acted confidently, or improved. This trains your brain to FIND the positives instead of defaulting to what went wrong. Over weeks you will have proof of your progress that is impossible to deny. 💪",
    "Be your own cheerleader. Get your thoughts out of your head and onto paper. When frustration builds inside, it grows. When you write it down — name it, process it, move on — it loses power. Journal your wins daily. Journal your challenges. It gives you perspective and keeps you moving forward. 📝",
  ])
  if (matchMsg(msg, ['heavy weight','builds strength','tough period','gps','direction','effort without'])) return randomMsg([
    "Think of this tough period like lifting weights at the gym. The weight is heavy. It is uncomfortable. But that resistance is EXACTLY what builds strength. Easy periods do not build champions. Hard periods do. The frustration you are feeling right now? That is the weight. Keep lifting. 💪",
    "Goals are your GPS. Without them, you are putting in effort with no direction — and that leads to frustration. With clear process goals, every rep of ball mastery, every action step logged, every mental reset in a game is moving you FORWARD. Set the destination. Trust the route. 🔥",
  ])
  if (matchMsg(msg, ['spiral','snowball','one mistake leads','shutdown','shuts down','overthink first touch'])) return randomMsg([
    "The spiral is real — one mistake leads to frustration, frustration leads to another mistake, and suddenly your whole game falls apart. Here is how you BREAK it:\n\n1 Acknowledge the mistake — do not ignore it\n2 Goldfish it — Next play. Let it go. Quick inhale, strong exhale, clench and release your fists\n3 Shark mentality — Lock in. Be hungry. Attack the next moment\n\nThe spiral only continues if you let it. You have the tools to break it. Use them. 🦈",
    "Shutting down after mistakes is the most common mental challenge I see. One bad touch and suddenly your shoulders drop, you stop calling for the ball, you go quiet. That is the spiral starting. Catch it EARLY. The moment you feel frustration rising — run the mental loop. Goldfish then Shark. Break the spiral before it builds. 🔥",
  ])
  if (matchMsg(msg, ['vocal','speak up','call for ball','quiet on field','ownership','blame','letting coach down'])) return randomMsg([
    "Being quiet on the field when you are uncomfortable is a confidence issue — not a personality issue. You CAN train yourself to be more vocal. Start small. Call for the ball once per half. Then twice. Build the habit. Leaders on the field are not born vocal — they practice it. Action step: In your next game, call for the ball at least 3 times out loud. 💪",
    "Feeling like you are letting the coach down after criticism? Reframe it. Coach criticism means they BELIEVE you can do better. They are not wasting their breath on players they have given up on. When the coach gets on you, say to yourself: they see my potential. Then go prove them right. 🦈",
  ])
  if (matchMsg(msg, ['reset breath','energizing breath','inhale exhale','clench fist','physical reset','cue word'])) return randomMsg([
    "Here is your physical reset tool: quick inhale through the nose, strong exhale through the mouth. While you exhale, clench your fists then release. This physically dumps the frustration energy out of your body. Pair it with your cue word — Next play. Let it go. Lock in. Be hungry. Whatever word snaps you back. Practice this in ball mastery so it is automatic in games. 🔥",
    "Cue words are powerful because they are instant. Next play. Let it go. Lock in. Be hungry. Pick yours and use it EVERY time you need to reset. The more you use it in low pressure training, the more automatic it becomes in high pressure games. That is the whole point of ball mastery — train the mental tools when the pressure is low so they fire automatically when the pressure is high. 🦈",
  ])
  if (matchMsg(msg, ['college camp','id camp','uncomfortable','avoid','underclassman','hard on self','critic'])) return randomMsg([
    "Avoiding uncomfortable situations — ID camps, trials, playing up — is the biggest mistake young athletes make. Those uncomfortable moments are exactly where you grow. The shark mentality is built for this. You do not need to FEEL ready. You need to GO anyway. Act first. Confidence follows. Action step: Sign up for the thing that scares you. Then prepare like crazy. 🦈",
    "Being hard on yourself after mistakes is normal. But there is a line between healthy self-criticism and self-destruction. Healthy: I made a mistake, I know what to fix, I will work on it. Self-destruction: I am rubbish, I will never be good enough, why bother. One builds you up. One tears you down. Which one are you choosing? 💪",
  ])
  if (matchMsg(msg, ['outcome goal','process goal','goal setting','outcome vs process','controllable','uncontrollable'])) return randomMsg([
    "There are two types of goals — outcome and process. Outcome goals are the end result: win the game, score a goal. Process goals are the controllable actions that GET you there: be aggressive, check your shoulders, make good decisions. Here's the key — you can't control the referee, your teammates, or the weather. You CAN control your effort, your decisions, your attitude. Focus on process goals. The outcomes take care of themselves. 💪",
    "Stop focusing only on the scoreboard. Focus on YOUR process. Did you check your shoulders before receiving? Did you take your first touch forward? Did you call for the ball? Those are the controllable actions that build a great player. Win the process and the outcomes follow. Action step: Before your next game, write down 3 process goals — not outcome goals. 🎯",
  ])
  if (matchMsg(msg, ['visualization','visualize','mental warmup','imagery','imagine','picture','mental rep','salah','90 percent','see myself'])) return randomMsg([
    "Mo Salah said 90% of his goals are visualized BEFORE he scores them. Think about that. He's already scored the goal in his mind before his body does it. That's visualization. It's a mental warmup — just like you warm up your body, you warm up your BRAIN. 30-60 seconds daily. See the sequence: check shoulders, turn, shoot, score. Make it as real as possible. 👁️",
    "Visualization tips from the best:\n\n1️⃣ Make it REALISTIC — game speed, your actual field\n2️⃣ Visualize the PROCESS not just the outcome — check shoulders, turn, finish\n3️⃣ Expect DISTRACTIONS — just refocus when they happen\n4️⃣ Do it DAILY — consistency builds the skill\n\n30-60 seconds every day. That's all it takes to start training your brain like a pro. 👁️",
    "Your brain cannot tell the difference between a vivid visualization and reality — it fires the same neural pathways. So when you visualize scoring against the best goalkeeper, you're literally training your brain for that moment. Do it before sleep. Do it before games. 30-60 seconds. Build the habit. 🔥",
  ])
  if (matchMsg(msg, ['promoted','promotion','first team','moved up','selected','nutmeg','scored','new team'])) return randomMsg([
    "Getting promoted to a higher team is PROOF the work is paying off. But don't let up now — that's exactly when some athletes relax. Use the promotion as fuel to work HARDER. You earned your spot. Now keep earning it every single session. Shark mentality — keep moving forward. 🦈",
    "You scored against their best goalkeeper in your FIRST session with the new team. That's not luck — that's preparation meeting opportunity. That's what daily ball mastery and mental training builds. Keep stacking those reps. The results speak for themselves. 🔥",
  ])
  if (matchMsg(msg, ['shooting','corners','accuracy','straight to keeper','finish','finishing'])) return randomMsg([
    "Shooting accuracy — aim for corners, not the center of the goal. Pick a corner BEFORE you shoot. Bottom left or bottom right. Decide early. Your body follows your focus. If you're thinking 'don't hit it straight' your brain focuses on straight. Instead think 'bottom right corner' and commit. Action step: In your next session, pick your corner before every single shot. ⚽",
    "Great finishers decide where they're shooting BEFORE they get the ball. As the chance develops, the corner is already chosen. Bottom left. Top right. Wherever. The decision is made. Then it's just execution. Practice this in ball mastery — every shot, pick your corner first. 🥅",
  ])
  if (matchMsg(msg, ['one two','combination','pass and go','wall pass'])) return randomMsg([
    "The one-two pass is one of the most effective moves in football — give it and go, get it back in space. It requires trust, timing, and movement. When it works it's unstoppable. Keep working that combination play in training. The best teams run it on instinct. 💪",
  ])
  if (matchMsg(msg, ['name learn move on','name it','learn from','move on','framework','3 step','setback process'])) return randomMsg([
    "The Name, Learn, Move On framework — use it every time something goes wrong:\n\n1️⃣ NAME IT — be honest. 'I lost the ball because I didn't check my shoulder.'\n2️⃣ LEARN — what do you do differently next time? Treat it as DATA, not failure.\n3️⃣ MOVE ON — goldfish mentality. It's gone. Next play.\n\nThis isn't just for mistakes in games. Use it for not getting selected, bad training sessions, tough feedback from coaches. Name it. Learn from it. Move on. 🐠",
    "Setbacks are data. That's it. Not proof you're bad. Not proof you don't belong. DATA. Name what happened honestly, extract the lesson, then goldfish it and move forward. That's what elite athletes do. That's what you're going to do. Action step: Next time something goes wrong, write down Name / Learn / Move On before you go to sleep. 💪",
  ])
  if (matchMsg(msg, ['trampoline','salah','rejected','not selected','dropped','cut','left out','bench','not picked'])) return randomMsg([
    "Mo Salah was rejected by Chelsea. Let that sink in. Chelsea said no to Mo Salah. He used that rejection as a TRAMPOLINE — bounced off it, went to Roma, developed, and became one of the best players in the world at Liverpool. Your setback is your trampoline. How high are you going to bounce? 🦈",
    "Not being selected isn't the end — it's information. The athletes who make it aren't the ones who never get rejected. They're the ones who use rejection as fuel. Self-belief, resilience, determination. That's your response to being left out. Name it. Learn from it. Come back stronger. 🔥",
    "With 55 players competing for spots, not being selected is going to happen. That's the reality. The question isn't IF it happens — it's HOW YOU RESPOND when it does. Trampoline mindset. Every setback is a setup for a comeback. What are you going to do with it? 💪",
  ])
  if (matchMsg(msg, ['visualization','visualize','pre match','pre game','mental prep','4 minute','5 minute','calm','tournament prep'])) return randomMsg([
    "Pre-match visualization is one of the most powerful tools you have. Here's the format: 4-5 minutes before your game. Close your eyes. See yourself DEFENDING — winning headers, making tackles. PASSING — sharp, accurate, decisive. CREATING — dribbling past players, making things happen. SCORING — putting the ball in the net. Run through all of it. Feel it. Then go do it. 👁️",
    "The 4-minute pre-tournament visualization builds two things: calm AND confidence. When you've already seen yourself succeed in your mind, your body knows what to do when it happens for real. Your brain can't tell the difference between a vivid visualization and reality. Use that. Action step: Do your visualization tonight before your next game. 🔥",
  ])
  if (matchMsg(msg, ['two footed','weak foot','both feet','dual footed','left foot','right foot','dembele','cazorla'])) return randomMsg([
    "Being two-footed is a TRAINED skill — not something you're born with. Dembélé. Santi Cazorla. They worked for it. If your right foot is strong for dribbling and your left foot is strong for shooting — you're already on your way. Now it's about putting in the reps. 15 minutes of weak foot work every single day. That's how you become a threat from both sides. ⚽",
    "Two-footed players are rare because most athletes avoid the discomfort of weak foot training. You do it anyway. That discomfort IS the growth. Every rep with your weaker foot is building something most players never develop. Stay consistent with it. 🔥",
  ])
  if (matchMsg(msg, ['selected','selection','contribution','team play','positioning','passing not goals'])) return randomMsg([
    "Here's something athletes miss: coaches see MORE than just goals. Passing, positioning, movement, attitude, team play — that's what gets you selected. You got picked after one month because your coach saw your CONTRIBUTIONS, not just your stats. Keep being a team player. Keep doing the things that don't show up on the scoresheet. That's what builds a long career. 💪",
  ])
  if (matchMsg(msg, ['inconsistent','inconsistency','sometimes good','sometimes bad','up and down','fluctuat'])) return randomMsg([
    "Inconsistency is almost never physical or technical — it's MENTAL. You play great against strong teams and drop off against weaker ones? That's arousal levels. Your brain relaxes when it thinks the opponent is easy. Fix it: treat EVERY opponent like they're the best team you've ever faced. Same intensity. Same shark mentality. Every single game. 🦈",
    "Here's what's happening when you're inconsistent: your confidence is tied to the situation instead of to YOUR actions. When the game feels big, you rise. When it feels easy, you drop. The goal is to bring the same energy regardless of the opponent. Action step: Before your next game, say 'this is the hardest opponent I've ever faced' — even if it's not. Watch what happens. 🔥",
  ])
  if (matchMsg(msg, ['confident feeling','act confident','confident action','feel confident','wait to feel','acting confident'])) return randomMsg([
    "Here's the most important thing I can teach you about confidence: DO NOT wait to feel confident before acting confidently. Confident FEELINGS are uncontrollable — energy, ease, fun. Confident ACTIONS are controllable — calling for the ball, positive body language, shooting from inside the box. Act confident FIRST. The feelings follow. Always. 💪",
    "Separate your feelings from your actions. You don't need to FEEL confident to ACT confident. Call for the ball even when you're nervous. Shoot from inside the box even when you're doubting yourself. Take that first touch forward even when it feels risky. The action creates the feeling — not the other way around. That's the key. 🦈",
  ])
  if (matchMsg(msg, ['confidence','confident','believe','doubt','unsure','scale','build confidence'])) return randomMsg([
    "Confidence is a SKILL — not a personality trait, not something you're born with. It's a scale from 1 to 10 and you can MOVE that number through practice. Every time you do ball mastery and push through frustration, you build confidence. Every time you run the mental loop in a game, you build confidence. It compounds. Stack the reps. 💪",
    "Confidence isn't something you wait to feel — it's something you BUILD. Every rep of ball mastery. Every action step you complete. Every time you act confidently even when you don't feel it. You're building confidence brick by brick. You don't find it. You earn it. 💪",
    "Your brain focuses on what you tell it. Flip it. I am a shark. I take risks. I move forward. Your body follows your mind. Train your mind first.",
  ])
  if (matchMsg(msg, ['weak team','easy game','c team','lower level','easy opponent','relaxed','low intensity'])) return randomMsg([
    "Playing a weaker team and dropping off? That's a mental trap. Your brain lowers its arousal because it thinks you don't need to be switched on. Wrong. Elite athletes bring the SAME intensity to every game — training, friendlies, cup finals. It's all the same. Shark mentality doesn't take days off. Action step: Pick 3 confident actions to execute in your next game regardless of the opponent. 🦈",
    "The C team game is just as important as the derby. Why? Because consistency is a HABIT. You train your brain to switch on or off based on the opponent — that's a dangerous habit. Train it to switch on regardless. Same pre-match routine. Same shark mentality phrase. Same intensity. Every time. 🔥",
  ])
  if (matchMsg(msg, ['call for ball','shoot','first touch','box','positive action','one good thing'])) return randomMsg([
    "Here's your weekly focus: after every practice and game, write down ONE positive action you took. Not a goal. Not an assist. One moment where you acted confidently — called for the ball, took a shot, made an aggressive first touch. Find that moment. Celebrate it. That's how you train your brain to find confidence. ✅",
    "Confident actions to practice every session: call for the ball loudly, take your first touch FORWARD not backwards, shoot from inside the box when you get the chance, positive body language always. These are controllable. These build confidence. Log them in your action steps. 💪",
  ])
  if (matchMsg(msg, ['motivat','tired','lazy','hard','struggle','dont want'])) return randomMsg([
    "You don't need motivation — you need discipline. Motivation comes and goes. Discipline shows up every day whether you feel like it or not. Show up anyway. 🔥",
    "On the days you don't feel like it — those are the most important days. That's where champions separate themselves. 15 minutes of ball mastery even when you're tired. That's the work. 💪",
  ])
  if (matchMsg(msg, ['schedule','program','daily','how often'])) return randomMsg([
    "Your program: DAILY — 15 min ball mastery + weak foot. PRACTICE DAYS — Action steps form after every session. WEEKLY — Check-in form before Tuesday. DAILY HABIT — Morning visualization, pre-match routine, reflection. Stay consistent. In 3 months you won't recognize yourself. 💪",
  ])
  if (matchMsg(msg, ['belief','beliefs','limiting','story','wall','invisible','rubbish','not good enough','capable'])) return randomMsg([
    "Beliefs are the stories you tell yourself — and they shape EVERYTHING. Limiting beliefs are invisible walls. 'I'm rubbish.' 'I'm not as good as my friend.' Those thoughts are LYING to you. Here's the 2-step fix:\n\n1️⃣ IDENTIFY the limiting belief — catch it\n2️⃣ REPLACE it with an empowering belief\n\nInstead of 'I'm rubbish' try 'I have talent and I'm improving.' Same situation — completely different outcome. Action step: Write down one limiting belief you have right now and replace it. 💪",
    "Stop letting limiting beliefs run your game. Every time you think 'I can't do this' or 'I'm not good enough' — that's a limiting belief creating an invisible wall. You have to CHOOSE to break through it. The 2-step process: identify it, replace it. Do it every single day until the empowering belief becomes automatic. 🦈",
    "Here's your daily belief declaration — say it every morning: 'I believe I am capable of playing my best while having fun.' Say it out loud. Mean it. Your brain believes what you repeat. Repeat empowering beliefs until they become your reality. 🔥",
  ])
  if (matchMsg(msg, ['empowering','empower','affirmation','declaration','positive belief'])) return randomMsg([
    "Empowering beliefs fuel confidence and growth. Examples: 'I have talent and I'm improving.' 'We are all on different journeys.' 'I get better every single day.' These aren't fake — they're the TRUTH you choose to focus on. Write yours down. Say them daily. Log them in your self-talk section. 💬",
    "Your daily belief declaration is your most powerful mental tool. Write one sentence that captures who you're becoming as an athlete. Say it every morning before training. Say it before games. Burn it into your brain. That's how you build unshakeable confidence. 🦈",
  ])
  if (matchMsg(msg, ['progress','improving','better','archie','2.0','reset','recovery','frustration','body language'])) return randomMsg([
    "Progress isn't always a goal or a win. Sometimes progress is resetting faster after frustration. Catching yourself before the negative body language takes over. Choosing to respond instead of react. That's HUGE. That's the difference between an average athlete and an elite one. Recognize your progress — even the small wins. 💪",
    "Archie 1.0 reacted with frustration and slumped shoulders. Archie 2.0 catches it, resets, and keeps competing. Which version are you choosing today? Growth isn't linear — but every time you reset faster, you're leveling up. That's real progress. 🔥",
    "When pressure hits — slumped shoulders, frustration, negative self talk — that's your signal to run the reset routine. Shake it out. Say 'next play.' Stand tall. Shark mentality back on. The faster you reset, the better athlete you become. How fast can you reset? 🦈",
  ])
  if (matchMsg(msg, ['pressure','drill','demonstrate','selected','coach watching','eyes on me'])) return randomMsg([
    "High pressure moments are where champions are MADE. When the coach calls on you, when all eyes are on you — that's not a threat, that's an opportunity. Shark mentality means you WANT those moments. You step up, not back. Action step: Next time you feel pressure, say 'I want this' before you act. 🦈",
    "Pressure reveals character. When you're put on the spot in a drill, in a game, in front of everyone — what do you do? The mental work you do every day is FOR those moments. Trust your preparation. Trust the process. You've put in the reps. Now perform. 🔥",
  ])
  if (matchMsg(msg, ['journey','compare','friend','teammate','better than me','not as good'])) return randomMsg([
    "Stop comparing your journey to someone else's. We are ALL on different journeys. Your friend might be ahead of you right now — so what? Your path is YOUR path. Focus on being better than YOU were yesterday. That's the only comparison that matters. Action step: Write down one thing you did better today than last week. 💪",
    "Comparing yourself to others is a trap. It feeds limiting beliefs. 'I'm not as good as him.' 'She's better than me.' These thoughts steal your focus from YOUR development. Empowering belief: I am on my own journey and I improve every single day. Say it. Mean it. 🦈",
  ])
  if (matchMsg(msg, ['body language','shoulders','slump','head down','negative body'])) return randomMsg([
    "Your body language affects your mindset AS MUCH as your mindset affects your body language. Slumped shoulders tell your brain you've given up. Stand tall, chest out, head up — even when things go wrong. Fake it until your body catches up with your mind. That's a real technique used by elite athletes. 💪",
    "Catch the slumped shoulders before they catch you. The moment you feel frustration — stand tall. That physical reset triggers a mental reset. It's biology. Use it. Action step: Every time something goes wrong today, physically stand tall and take one deep breath before responding. 🦈",
  ])
  return randomMsg([
    "Lock in. Whatever you're going through — shark mentality. Keep moving forward. What specific challenge do you want to work on today? 🦈",
    "Talk to me. Give me more details and I'll give you a specific action step you can use today. 💪",
    "Process over outcome. Don't focus on the result — focus on the work. What's one thing you can do TODAY to get better? ⚽",
    "Every challenge has a solution. Tell me exactly what's happening and we'll break it down. Shark, Goldfish, or Self Talk — which one do you need right now? 🔥",
  ])
}

export default function Main({ user }) {
  const [tab, setTab] = useState('home')
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [streak, setStreak] = useState(0)
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState(HABITS_LIST.map(h => ({ label: h, days: [false,false,false,false,false,false,false] })))
  const [form, setForm] = useState(emptyForm)
  const [submissions, setSubmissions] = useState([])
  const [messages, setMessages] = useState([{ role: 'assistant', content: "What's up! I'm Coach Valentinoalentino 🔥 Ask me anything about mindset, match prep, or your action steps!" }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [allAthletes, setAllAthletes] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [savingForm, setSavingForm] = useState(false)
  const [ballMastery, setBallMastery] = useState({})
  const [ballHistory, setBallHistory] = useState([])
  const [savingBall, setSavingBall] = useState(false)
  const [checkin, setCheckin] = useState(emptyCheckin)
  const [checkinHistory, setCheckinHistory] = useState([])
  const [checkinDone, setCheckinDone] = useState(false)
  const [savingCheckin, setSavingCheckin] = useState(false)
  const [allCheckins, setAllCheckins] = useState([])
  const [allBallMastery, setAllBallMastery] = useState([])
  const [communityPosts, setCommunityPosts] = useState([])
  const [newPost, setNewPost] = useState({ type: 'win', content: '' })
  const [postingComment, setPostingComment] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [savingPost, setSavingPost] = useState(false)
  const [communityTab, setCommunityTab] = useState('athletes')
  const [challenges, setChallenges] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', type: 'weekly', target: 7, unit: 'sessions' })
  const [competitionTab, setCompetitionTab] = useState('leaderboard')
  const [savingChallenge, setSavingChallenge] = useState(false)
  const chatEnd = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  const currentWeek = getWeekKey()

  useEffect(() => { loadUserData() }, [user])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadUserData() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setStreak(p?.streak || 0)
    const { data: hd } = await getHabits(user.id)
    if (hd?.habits) setHabits(JSON.parse(hd.habits))
    const { data: sd } = await getActionSteps(user.id)
    if (sd) setSubmissions(sd)
    const { data: bd } = await supabase.from('ball_mastery').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14)
    if (bd) setBallHistory(bd)
    const { data: cd } = await supabase.from('weekly_checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    if (cd) {
      setCheckinHistory(cd)
      if (cd.find(c => c.week === currentWeek)) setCheckinDone(true)
    }
    // Load leaderboard
    const { data: lb } = await supabase
      .from('profiles')
      .select('id, full_name, email, streak, role')
      .eq('role', 'athlete')
      .order('streak', { ascending: false })
      .limit(20)
    if (lb) {
      // Enrich with counts
      const enriched = await Promise.all(lb.map(async (a) => {
        const { count: bmCount } = await supabase.from('ball_mastery').select('id', { count: 'exact' }).eq('user_id', a.id)
        const { count: asCount } = await supabase.from('action_steps').select('id', { count: 'exact' }).eq('user_id', a.id)
        const { count: ciCount } = await supabase.from('weekly_checkins').select('id', { count: 'exact' }).eq('user_id', a.id)
        const score = (a.streak||0)*3 + (bmCount||0)*2 + (asCount||0)*2 + (ciCount||0)*1
        return { ...a, bmCount: bmCount||0, asCount: asCount||0, ciCount: ciCount||0, score }
      }))
      setLeaderboard(enriched.sort((a,b) => b.score - a.score))
    }

    // Load challenges
    const { data: ch } = await supabase
      .from('challenges')
      .select('*, challenge_completions(user_id)')
      .order('created_at', { ascending: false })
      .limit(20)
    if (ch) setChallenges(ch)

    // Load community posts
    const { data: posts } = await supabase
      .from('community_posts')
      .select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))')
      .order('created_at', { ascending: false })
      .limit(50)
    if (posts) setCommunityPosts(posts)

    if (p?.role === 'coach') {
      const { data: at } = await getAllProfiles()
      setAllAthletes(at || [])
      const { data: as } = await getAllActionSteps()
      setAllSubmissions(as || [])
      const { data: ac } = await supabase.from('weekly_checkins').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(50)
      setAllCheckins(ac || [])
      const { data: ab } = await supabase.from('ball_mastery').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(50)
      setAllBallMastery(ab || [])
    }
  }

  const toggleHabit = async (hi, di) => {
    const updated = habits.map((h, i) => i === hi ? { ...h, days: h.days.map((d, j) => j === di ? !d : d) } : h)
    setHabits(updated)
    await saveHabits(user.id, updated)
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setCI = (k, v) => setCheckin(p => ({ ...p, [k]: v }))

  // Debounced input handler for smooth mobile typing
  const handleInput = (setter, key) => (e) => {
    const val = e.target.value
    setter(p => ({ ...p, [key]: val }))
  }

  const completedHabits = habits.reduce((a, h) => a + h.days.filter(Boolean).length, 0)
  const totalHabits = habits.length * 7
  const pct = Math.round((completedHabits / totalHabits) * 100)
  const todayBMLogged = ballHistory.some(b => b.date === today)
  const todayActionLogged = submissions.some(s => s.date === today)
  const isCoach = profile?.role === 'coach'
  const isEliteLocked = profile?.access_level !== 'paid' && profile?.access_level !== 'mentoring_elite'

  const handleLogDay = async () => {
    const { streak: ns } = await logDay(user.id)
    setStreak(ns || streak + 1)
  }

  const handleSubmitForm = async () => {
    if (!form.playerName) return alert('Enter your name!')
    if (!form.didSteps) return alert('Did you do the action steps?')
    setSavingForm(true)
    const { error } = await submitActionSteps(form, user.id)
    if (error) { alert('Error: ' + error.message); setSavingForm(false); return }
    const steps = ['shark','goldfish','selftalk','tuneout'].filter(k => form.usedSteps[k])
    const txt = `DSM ACTION STEPS\n${'='.repeat(40)}\nPLAYER: ${form.playerName}\nDAY: ${form.dayOfWeek}, ${form.date}\nSESSION: ${form.sessionType}\nDID STEPS: ${form.didSteps}\n\n${steps.map(k=>`✅ ${k.toUpperCase()}\n  Occasion: ${form.occasions[k]||'—'}\n  Comments: ${form.comments[k]||'—'}`).join('\n\n')}\n\nPERFORMANCE:\nConditioning: ${form.conditioning}/10\nStrength: ${form.strength}/10\nTechnical: ${form.technical}/10\nMental: ${form.mental}/10`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
    a.download = `DSM-${form.playerName}-${form.date}.txt`
    a.click()
    const { data: updated } = await getActionSteps(user.id)
    setSubmissions(updated || [])
    setForm(emptyForm)
    setSavingForm(false)
    alert('✅ Saved & downloaded!')
  }

  const handleSaveBall = async () => {
    const practiced = Object.keys(ballMastery).filter(k => k !== 'notes' && (ballMastery[k]?.reps || 0) > 0)
    if (!practiced.length) return alert('Mark at least one skill!')
    setSavingBall(true)
    const { error } = await supabase.from('ball_mastery').insert([{
      user_id: user.id, date: today,
      skills: JSON.stringify(ballMastery),
      total_skills: practiced.length,
      total_reps: practiced.reduce((a, k) => a + (ballMastery[k]?.reps || 0), 0),
      notes: ballMastery.notes || '',
    }])
    if (error) { alert('Error: ' + error.message); setSavingBall(false); return }
    const { data: bd } = await supabase.from('ball_mastery').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14)
    setBallHistory(bd || [])
    setBallMastery({})
    setSavingBall(false)
    alert('✅ Ball mastery logged!')
  }

  const handleSubmitCheckin = async () => {
    if (!checkin.biggestWin) return alert('Fill in your biggest win!')
    if (!checkin.goalNextWeek) return alert('Set a goal for next week!')
    setSavingCheckin(true)
    const { error } = await supabase.from('weekly_checkins').insert([{
      user_id: user.id, week: currentWeek,
      biggest_win: checkin.biggestWin,
      biggest_challenge: checkin.biggestChallenge,
      shark_moment: checkin.sharkMoment,
      goldfish_moment: checkin.goldfishMoment,
      self_talk_moment: checkin.selfTalkMoment,
      energy_level: checkin.energyLevel,
      confidence_level: checkin.confidenceLevel,
      sessions_completed: checkin.sessionsCompleted,
      goal_next_week: checkin.goalNextWeek,
      message_to_coach: checkin.messageToCoach,
    }])
    if (error) { alert('Error: ' + error.message); setSavingCheckin(false); return }
    setCheckinDone(true)
    setSavingCheckin(false)
    const { data: cd } = await supabase.from('weekly_checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    setCheckinHistory(cd || [])
    alert('✅ Weekly check-in submitted to Coach Valentino!')
  }

  async function speakText(text) {
    if (!voiceMode) return
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true } })
      })
      if (!res.ok) throw new Error()
      new Audio(URL.createObjectURL(await res.blob())).play()
    } catch {
      const u = new SpeechSynthesisUtterance(text); u.rate = 1.1; u.pitch = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  const sendChat = (msgOverride) => {
    const msg = msgOverride || chatInput.trim()
    if (!msg) return
    setChatInput('')
    setMessages(p => [...p, { role: 'user', content: msg }])
    setChatLoading(true)
    setTimeout(() => {
      const reply = getCoachVResponse(msg)
      setMessages(p => [...p, { role: 'assistant', content: reply }])
      speakText(reply)
      setChatLoading(false)
    }, 800)
  }

  const startVoice = () => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) return alert('Try Chrome!')
      const r = new SR(); r.lang = 'en-US'
      r.onstart = () => setIsRecording(true)
      r.onend = () => setIsRecording(false)
      r.onresult = e => sendChat(e.results[0][0].transcript)
      r.onerror = () => setIsRecording(false)
      r.start()
    } catch { alert('Voice not supported.') }
  }

  const C = {
    app: { fontFamily: "'Arial Narrow', Arial, sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#fff', maxWidth: 430, margin: '0 auto', paddingBottom: 80 },
    hdr: { padding: '16px 20px 12px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 100 },
    scroll: { padding: '16px 20px 40px' },
    card: { background: '#111', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid #1e1e1e' },
    orange: { background: 'linear-gradient(135deg,#ff3d00,#ff6d00)', borderRadius: 12, padding: '18px 16px', marginBottom: 12 },
    lbl: { fontSize: 9, letterSpacing: 3, color: '#555', fontWeight: 700, marginBottom: 7, display: 'block' },
    olbl: { fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 7, display: 'block' },
    title: { fontSize: 26, fontWeight: 900, letterSpacing: 2, marginBottom: 2 },
    sub: { fontSize: 9, color: '#555', letterSpacing: 3, fontWeight: 700, marginBottom: 12 },
    btn: { background: 'linear-gradient(135deg,#ff3d00,#ff6d00)', border: 'none', borderRadius: 10, padding: '14px 18px', fontSize: 13, fontWeight: 800, letterSpacing: 2, color: '#fff', cursor: 'pointer', width: '100%', fontFamily: 'inherit', marginBottom: 8 },
    bsm: { background: '#ff3d00', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 10, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
    inp: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    ta: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' },
    nav: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#0d0d0d', borderTop: '1px solid #1a1a1a', display: 'flex', padding: '6px 0 10px', zIndex: 200 },
    nb: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' },
  }

  // PAYWALL CHECK
  const isLocked = profile && profile.role !== 'coach' && profile.access_level === 'locked'
  const isPending = profile && profile.role !== 'coach' && !profile.access_level

  if (isLocked || isPending) {
    return (
      <div style={C.app}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body, #root { background: #0a0a0a; min-height: 100vh; }
          @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          .fade { animation: fadeIn 0.3s ease; }
        `}</style>
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'30px 24px', textAlign:'center' }} className="fade">
          <div style={{ fontSize:36, fontWeight:900, letterSpacing:4, marginBottom:4 }}>DSM</div>
          <div style={{ fontSize:9, letterSpacing:3, color:'#ff3d00', fontWeight:700, marginBottom:40 }}>DILORENZO SOCCER MINDSET</div>
          <div style={{ fontSize:60, marginBottom:20 }}>🔒</div>
          <div style={{ fontSize:24, fontWeight:900, letterSpacing:2, marginBottom:12 }}>UNLOCK YOUR ACCESS</div>
          <div style={{ fontSize:14, color:'#888', lineHeight:1.6, marginBottom:32, maxWidth:320 }}>
            You're one step away from the full DSM program. Join now to unlock Coach Valentino, Ball Mastery tracking, Weekly Check-ins and more.
          </div>
          <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:14, padding:'20px 18px', marginBottom:24, width:'100%', maxWidth:340 }}>
            <div style={{ fontSize:9, letterSpacing:3, color:'#555', fontWeight:700, marginBottom:12 }}>WHAT YOU GET</div>
            {[['🤖','Coach Valentino AI'],['⚽','Daily Ball Mastery Log'],['📋','Weekly Check-In'],['✅','Action Steps Tracker'],['📊','Habit Tracker'],['🦈','Full DSM Program']].map(([icon,label])=>(
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:18 }}>{icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#ccc' }}>{label}</div>
                <div style={{ marginLeft:'auto', fontSize:11, color:'#ff3d00', fontWeight:800 }}>✓</div>
              </div>
            ))}
          </div>
          <a href="https://www.fanbasis.com" target="_blank" rel="noreferrer"
            style={{ display:'block', width:'100%', maxWidth:340, background:'linear-gradient(135deg,#ff3d00,#ff6d00)', border:'none', borderRadius:12, padding:'16px 18px', fontSize:15, fontWeight:900, letterSpacing:2, color:'#fff', cursor:'pointer', textDecoration:'none', marginBottom:14 }}>
            JOIN NOW — FANBASIS 🔥
          </a>
          <div style={{ fontSize:11, color:'#444', lineHeight:1.6, maxWidth:300, marginBottom:24 }}>
            After payment, your coach will activate your account within 24 hours.
          </div>
          <button onClick={signOut} style={{ background:'none', border:'1px solid #333', borderRadius:8, padding:'8px 16px', fontSize:11, color:'#555', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
            SIGN OUT
          </button>
        </div>
      </div>
    )
  }

  const navTabs = [
    { id: 'home', icon: '⚡', label: 'HOME' },
    { id: 'actions', icon: '✅', label: 'ACTIONS' },
    { id: 'ball', icon: '⚽', label: 'BALL' },
    { id: 'weekly', icon: '📋', label: 'WEEKLY' },
    { id: 'tracker', icon: '📊', label: 'TRACK' },
    { id: 'progress', icon: '📈', label: 'PROGRESS' },
    { id: 'bot', icon: '🤖', label: 'COACH VALENTINO' },
    { id: 'community', icon: '👥', label: 'COMMUNITY' },
    { id: 'compete', icon: '🏆', label: 'COMPETE' },
    { id: 'parents', icon: '👨‍👩‍👧', label: 'PARENTS' },
    ...(isCoach ? [{ id: 'dashboard', icon: '🏆', label: 'COACH' }] : []),
  ]

  const ActionStep = ({ icon, title, desc, k }) => (
    <div style={{ ...C.card, borderColor: form.usedSteps[k] ? '#ff3d00' : '#1e1e1e', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.usedSteps[k] ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 10, color: '#555' }}>{desc}</div>
          </div>
        </div>
        <button onClick={() => setF('usedSteps', { ...form.usedSteps, [k]: !form.usedSteps[k] })}
          style={{ background: form.usedSteps[k] ? '#ff3d00' : '#1e1e1e', border: 'none', borderRadius: 20, padding: '5px 10px', fontSize: 10, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          {form.usedSteps[k] ? '✓ USED' : 'MARK'}
        </button>
      </div>
      {form.usedSteps[k] && (
        <div>
          <span style={C.lbl}>OCCASION</span>
          <input style={{ ...C.inp, marginBottom: 8 }} placeholder="When did you use this?" defaultValue={form.occasions[k] || ''} onBlur={e => setF('occasions', { ...form.occasions, [k]: e.target.value })} />
          <span style={C.lbl}>COMMENTS</span>
          <textarea style={{ ...C.ta, height: 55 }} placeholder="How did it help?" defaultValue={form.comments[k] || ''} onBlur={e => setF('comments', { ...form.comments, [k]: e.target.value })} />
        </div>
      )}
    </div>
  )

  return (
    <div style={C.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { background: #0a0a0a; min-height: 100vh; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .fade { animation: fadeIn 0.2s ease; }
        input::placeholder, textarea::placeholder { color: #333; }
        input[type=range] { accent-color: #ff3d00; width: 100%; }
        a { text-decoration: none; }
        select { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 12px 14px; color: #fff; font-family: inherit; font-size: 14px; outline: none; width: 100%; }
      `}</style>

      {/* HEADER */}
      <div style={C.hdr}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, lineHeight: 1 }}>DSM</div>
          <div style={{ fontSize: 8, letterSpacing: 2, color: '#ff3d00', fontWeight: 700, marginTop: 2 }}>DILORENZO SOCCER MINDSET</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3d00', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 20, fontWeight: 900, color: '#ff3d00' }}>{streak}</span>
            </div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: '#555', fontWeight: 700 }}>STREAK</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: '5px 9px', fontSize: 10, color: '#555', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>OUT</button>
        </div>
      </div>

      {/* ── HOME ── */}
      {tab === 'home' && (
        <div style={C.scroll} className="fade">
          <div style={C.orange}>
            <span style={C.olbl}>TODAY'S MINDSET FUEL</span>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>"{quote}"</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>— Coach Valentino</div>
          </div>

          {/* Today checklist */}
          <span style={C.lbl}>TODAY'S CHECKLIST</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {[
              { icon: '⚽', label: 'Ball Mastery', sub: 'Log your daily skills', done: todayBMLogged, tab: 'ball' },
              { icon: '✅', label: 'Action Steps', sub: 'After practice or game', done: todayActionLogged, tab: 'actions' },
              { icon: '📋', label: 'Weekly Check-In', sub: currentWeek, done: checkinDone, tab: 'weekly' },
            ].map(task => (
              <div key={task.tab} onClick={() => setTab(task.tab)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: task.done ? '#0d1a0d' : '#111', borderRadius: 12, cursor: 'pointer', border: `1px solid ${task.done ? '#1a4a1a' : '#1e1e1e'}` }}>
                <div style={{ fontSize: 22 }}>{task.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{task.label}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{task.sub}</div>
                </div>
                <div style={{ fontSize: 18 }}>{task.done ? '✅' : '→'}</div>
              </div>
            ))}
          </div>

          {/* Progress ring */}
          <div style={C.card}>
            <span style={C.lbl}>WEEKLY HABITS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#1e1e1e" strokeWidth="5" />
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#ff3d00" strokeWidth="5"
                    strokeDasharray={`${2*Math.PI*24}`} strokeDashoffset={`${2*Math.PI*24*(1-pct/100)}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 13, fontWeight: 900, color: '#ff3d00' }}>{pct}%</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{completedHabits}<span style={{ fontSize: 12, color: '#555' }}>/{totalHabits}</span></div>
                <div style={{ fontSize: 10, color: '#555' }}>habits this week</div>
                <div style={{ fontSize: 10, color: '#ff3d00', fontWeight: 800, letterSpacing: 1, marginTop: 3 }}>{pct>=70?'🔥 ELITE':pct>=40?'⚡ BUILDING':'💪 LET\'S GO'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[['🤖','COACH VALENTINO','AI coach','bot'],['🎥','COURSE','Video lessons','course']].map(([icon,label,sub,t]) => (
              <button key={t} onClick={() => setTab(t)} style={{ background:'#111',border:'1px solid #1e1e1e',borderRadius:12,padding:'14px 12px',textAlign:'left',cursor:'pointer' }}>
                <div style={{ fontSize:22,marginBottom:5 }}>{icon}</div>
                <div style={{ fontSize:11,fontWeight:800,letterSpacing:2,color:'#fff' }}>{label}</div>
                <div style={{ fontSize:10,color:'#555',marginTop:2 }}>{sub}</div>
              </button>
            ))}
          </div>
          <button style={C.btn} onClick={handleLogDay}>+ LOG TODAY ⚡</button>
          {profile && <div style={{ textAlign:'center',fontSize:11,color:'#333',marginTop:8 }}>
            {profile.full_name || user.email}{isCoach && <span style={{ color:'#ff3d00',marginLeft:8,fontWeight:800 }}>· COACH</span>}
          </div>}
        </div>
      )}

      {/* ── ACTION STEPS ── */}
      {tab === 'actions' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>ACTION STEPS</div>
          <div style={C.sub}>AFTER EVERY PRACTICE & GAME</div>
          <div style={{ ...C.orange }}>
            <span style={C.olbl}>⚠️ REQUIRED — NO EXCEPTIONS</span>
            <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Fill this out after EVERY practice and game. It goes straight to Coach Valentino. 🦈</div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>PLAYER NAME</span>
            <input style={{ ...C.inp, marginBottom: 10 }} placeholder="Your name" defaultValue={form.playerName} onBlur={e => setF('playerName', e.target.value)} onChange={e => setF('playerName', e.target.value)} />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10 }}>
              <div><span style={C.lbl}>SESSION</span>
                <select value={form.sessionType} onChange={e => setF('sessionType', e.target.value)}>
                  <option>Practice</option><option>Game</option>
                </select>
              </div>
              <div><span style={C.lbl}>DATE</span>
                <input type="date" style={C.inp} value={form.date} onChange={e => setF('date', e.target.value)} />
              </div>
            </div>
            <span style={C.lbl}>DAY</span>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
              {WEEKDAYS.map(d => (
                <button key={d} onClick={() => setF('dayOfWeek', d)}
                  style={{ background:form.dayOfWeek===d?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'6px 10px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                  {d.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>DID YOU DO THE ACTION STEPS?</span>
            <div style={{ display:'flex',gap:8 }}>
              {['Yes','No'].map(opt => (
                <button key={opt} onClick={() => setF('didSteps', opt)}
                  style={{ flex:1,background:form.didSteps===opt?'#ff3d00':'#1e1e1e',border:'none',borderRadius:10,padding:12,fontSize:14,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                  {opt==='Yes'?'✅ YES':'❌ NO'}
                </button>
              ))}
            </div>
          </div>
          <span style={C.lbl}>WHICH DID YOU USE?</span>
          <ActionStep icon="🦈" title="SHARK MENTALITY" desc="Taking risks, aggressive, fearless" k="shark" />
          <ActionStep icon="🐠" title="GOLDFISH MENTALITY" desc="Short term memory for mistakes" k="goldfish" />
          <ActionStep icon="💬" title="POSITIVE SELF TALK" desc="Control your inner voice" k="selftalk" />
          <ActionStep icon="🔇" title="TUNE OUT COACH YELLING" desc="Stay focused under pressure" k="tuneout" />
          <div style={{ ...C.card, opacity:0.4, marginBottom:10 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ fontSize:20 }}>👁️</div>
                <div><div style={{ fontSize:13,fontWeight:800,color:'#555' }}>VISUALIZATION</div>
                  <div style={{ fontSize:10,color:'#444' }}>Unlocks at Lesson 5</div></div>
              </div>
              <div style={{ background:'#1e1e1e',borderRadius:20,padding:'4px 10px',fontSize:9,fontWeight:800,color:'#555' }}>🔒 LOCKED</div>
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>RATE MY PERFORMANCE (1–10)</span>
            {['conditioning','strength','technical','mental'].map(k => (
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                  <span style={{ fontSize:12,color:'#aaa',textTransform:'capitalize' }}>{k}</span>
                  <span style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{form[k]}/10</span>
                </div>
                <input type="range" min="1" max="10" value={form[k]} onChange={e => setF(k, parseInt(e.target.value))} />
              </div>
            ))}
          </div>
          <button style={C.btn} onClick={handleSubmitForm} disabled={savingForm}>
            {savingForm ? 'SAVING...' : '📤 SUBMIT & DOWNLOAD'}
          </button>
          {submissions.length > 0 && <>
            <span style={{ ...C.lbl, marginTop: 16 }}>PAST SUBMISSIONS</span>
            {submissions.slice(0,5).map((s,i) => (
              <div key={i} style={C.card}>
                <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2 }}>{s.day_of_week}, {s.date} · {s.session_type}</div>
                <div style={{ fontSize:14,fontWeight:800,marginTop:2 }}>{s.player_name}</div>
                <div style={{ display:'flex',gap:8,marginTop:6,flexWrap:'wrap' }}>
                  {[['shark','🦈'],['goldfish','🐠'],['selftalk','💬'],['tuneout','🔇']].map(([k,icon]) => s[k+'_used'] &&
                    <span key={k} style={{ background:'#1e1e1e',borderRadius:20,padding:'2px 8px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>{icon}</span>
                  )}
                </div>
              </div>
            ))}
          </>}
        </div>
      )}

      {/* ── BALL MASTERY ── */}
      {tab === 'ball' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>BALL MASTERY</div>
          <div style={C.sub}>DAILY SKILLS LOG</div>
          {todayBMLogged ? (
            <div style={{ ...C.card, borderColor:'#1a4a1a', textAlign:'center', padding:36 }}>
              <div style={{ fontSize:44,marginBottom:10 }}>✅</div>
              <div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>TODAY LOGGED!</div>
              <div style={{ fontSize:13,color:'#555' }}>Ball mastery done. Come back tomorrow! 🔥</div>
            </div>
          ) : <>
            <div style={C.orange}>
              <span style={C.olbl}>LOG TODAY'S TRAINING</span>
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Tap each skill you trained. Set your reps. Be honest — this is YOUR progress. 🦈</div>
            </div>
            <div style={C.card}>
              <span style={C.lbl}>SKILLS PRACTICED</span>
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                {BALL_MASTERY_SKILLS.map(skill => (
                  <div key={skill.id} style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <button onClick={() => setBallMastery(p => ({ ...p, [skill.id]: (p[skill.id]?.reps||0)>0 ? {reps:0} : {reps:50} }))}
                      style={{ width:34,height:34,borderRadius:'50%',background:(ballMastery[skill.id]?.reps||0)>0?'#ff3d00':'#1e1e1e',border:'none',fontSize:15,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff' }}>
                      {(ballMastery[skill.id]?.reps||0)>0?'✓':skill.icon}
                    </button>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:13,fontWeight:800 }}>{skill.label}</div>
                        {(skill.videos||[]).map((v,vi)=>(
                          <a key={vi} href={v.url} target="_blank" rel="noreferrer"
                            style={{ fontSize:9, color:'#ff3d00', fontWeight:800, letterSpacing:1, textDecoration:'none', background:'#1e1e1e', borderRadius:6, padding:'2px 6px' }}>
                            ▶ {v.label}
                          </a>
                        ))}
                      </div>
                      {(ballMastery[skill.id]?.reps||0)>0 && (
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
                          <span style={{ fontSize:10,color:'#555' }}>Reps:</span>
                          <input type="number" min="1" max="9999"
                            style={{ ...C.inp,width:80,padding:'4px 8px',fontSize:13 }}
                            value={ballMastery[skill.id]?.reps||50}
                            onChange={e => setBallMastery(p => ({ ...p, [skill.id]:{...p[skill.id],reps:parseInt(e.target.value)||0} }))} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={C.card}>
              <span style={C.lbl}>NOTES</span>
              <textarea style={{ ...C.ta,height:70 }} placeholder="How did it go? What to improve tomorrow?"
                defaultValue={ballMastery.notes||''} onBlur={e => setBallMastery(p => ({ ...p,notes:e.target.value }))} />
            </div>
            <div style={{ ...C.card,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:9,color:'#555',letterSpacing:3,fontWeight:700,marginBottom:4 }}>SKILLS</div>
                <div style={{ fontSize:26,fontWeight:900,color:'#ff3d00' }}>{Object.keys(ballMastery).filter(k=>k!=='notes'&&(ballMastery[k]?.reps||0)>0).length}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:9,color:'#555',letterSpacing:3,fontWeight:700,marginBottom:4 }}>TOTAL REPS</div>
                <div style={{ fontSize:26,fontWeight:900,color:'#ff3d00' }}>{Object.entries(ballMastery).filter(([k])=>k!=='notes').reduce((a,[,v])=>a+(v?.reps||0),0)}</div>
              </div>
            </div>
            <button style={C.btn} onClick={handleSaveBall} disabled={savingBall}>
              {savingBall?'SAVING...':'⚽ LOG TODAY\'S TRAINING'}
            </button>
          </>}
          {ballHistory.length > 0 && <>
            <span style={{ ...C.lbl,marginTop:16 }}>RECENT SESSIONS</span>
            {ballHistory.slice(0,7).map((b,i) => (
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2 }}>{b.date}</div>
                  <div style={{ fontSize:10,color:'#555' }}>{b.total_skills} skills · {b.total_reps} reps</div>
                </div>
                {b.notes && <div style={{ fontSize:11,color:'#555',marginTop:5 }}>{b.notes}</div>}
              </div>
            ))}
          </>}
        </div>
      )}

      {/* ── WEEKLY CHECK-IN ── */}
      {tab === 'weekly' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>WEEKLY CHECK-IN</div>
          <div style={C.sub}>{currentWeek} — REFLECT & LOCK IN</div>
          {checkinDone ? (
            <div>
              <div style={{ ...C.card,borderColor:'#1a4a1a',textAlign:'center',padding:36,marginBottom:16 }}>
                <div style={{ fontSize:44,marginBottom:10 }}>✅</div>
                <div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>THIS WEEK SUBMITTED!</div>
                <div style={{ fontSize:13,color:'#555' }}>Coach Valentino has your check-in. See you next week. 🔥</div>
              </div>
              {checkinHistory.length > 0 && <>
                <span style={C.lbl}>PAST CHECK-INS</span>
                {checkinHistory.map((c,i) => (
                  <div key={i} style={C.card}>
                    <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2,marginBottom:8 }}>{c.week}</div>
                    <div style={{ display:'flex',gap:16,marginBottom:8 }}>
                      {[['energy_level','⚡ ENERGY'],['confidence_level','💪 CONFIDENCE'],['sessions_completed','🏃 SESSIONS']].map(([k,l])=>(
                        <div key={k} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:18,fontWeight:900,color:'#ff3d00' }}>{c[k]}</div>
                          <div style={{ fontSize:8,color:'#555',letterSpacing:1,fontWeight:700 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:12,color:'#aaa' }}>🏆 {c.biggest_win}</div>
                    {c.goal_next_week && <div style={{ fontSize:12,color:'#666',marginTop:4 }}>🎯 {c.goal_next_week}</div>}
                  </div>
                ))}
              </>}
            </div>
          ) : <>
            <div style={C.orange}>
              <span style={C.olbl}>WEEK: {currentWeek}</span>
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Time to reflect. Be real with yourself — that's how you grow. 🦈</div>
            </div>
            <div style={C.card}>
              <span style={C.lbl}>RATE YOUR WEEK</span>
              {[['energyLevel','⚡ Energy Level',1,10],['confidenceLevel','💪 Confidence',1,10],['sessionsCompleted','🏃 Sessions Completed',0,14]].map(([k,l,min,max])=>(
                <div key={k} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                    <span style={{ fontSize:12,color:'#aaa' }}>{l}</span>
                    <span style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{checkin[k]}{k==='sessionsCompleted'?'':'/10'}</span>
                  </div>
                  <input type="range" min={min} max={max} value={checkin[k]} onChange={e=>setCI(k,parseInt(e.target.value))} />
                </div>
              ))}
            </div>
            <div style={C.card}>
              <span style={C.lbl}>🏆 BIGGEST WIN THIS WEEK *</span>
              <textarea style={{ ...C.ta,height:65,marginBottom:12 }} placeholder="What are you most proud of?" defaultValue={checkin.biggestWin} onBlur={e=>setCI('biggestWin',e.target.value)} />
              <span style={C.lbl}>💥 BIGGEST CHALLENGE</span>
              <textarea style={{ ...C.ta,height:65 }} placeholder="What was hardest this week?" defaultValue={checkin.biggestChallenge} onBlur={e=>setCI('biggestChallenge',e.target.value)} />
            </div>
            <div style={C.card}>
              <span style={C.lbl}>DSM MOMENTS THIS WEEK</span>
              {[['sharkMoment','🦈 SHARK MOMENT','When did you take a fearless risk?'],['goldfishMoment','🐠 GOLDFISH MOMENT','When did you forget a mistake fast?'],['selfTalkMoment','💬 SELF TALK MOMENT','When did you control your inner voice?']].map(([k,l,p])=>(
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9,color:'#ff3d00',letterSpacing:2,fontWeight:700,marginBottom:5 }}>{l}</div>
                  <textarea style={{ ...C.ta,height:55 }} placeholder={p} value={checkin[k]} onChange={e=>setCI(k,e.target.value)} />
                </div>
              ))}
            </div>
            <div style={C.card}>
              <span style={C.lbl}>🎯 GOAL FOR NEXT WEEK *</span>
              <textarea style={{ ...C.ta,height:65,marginBottom:12 }} placeholder="What's your #1 focus next week?" defaultValue={checkin.goalNextWeek} onBlur={e=>setCI('goalNextWeek',e.target.value)} />
              <span style={C.lbl}>💬 MESSAGE TO COACH VALENTINO</span>
              <textarea style={{ ...C.ta,height:65 }} placeholder="Anything you want Coach Valentino to know?" defaultValue={checkin.messageToCoach} onBlur={e=>setCI('messageToCoach',e.target.value)} />
            </div>
            <button style={C.btn} onClick={handleSubmitCheckin} disabled={savingCheckin}>
              {savingCheckin?'SUBMITTING...':'📋 SUBMIT WEEKLY CHECK-IN'}
            </button>
          </>}
        </div>
      )}

      {/* ── TRACKER ── */}
      {tab === 'tracker' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>TRACKER</div>
          <div style={C.sub}>WEEKLY HABIT TRACKER</div>
          <div style={C.card}>
            <div style={{ display:'flex',alignItems:'center',gap:14 }}>
              <div style={{ fontSize:48,fontWeight:900,color:'#ff3d00',lineHeight:1 }}>{streak}</div>
              <div>
                <div style={{ fontSize:14,fontWeight:800 }}>DAY STREAK</div>
                <div style={{ fontSize:11,color:'#555',marginTop:2 }}>Keep showing up every day.</div>
                <button style={{ ...C.bsm,marginTop:8 }} onClick={handleLogDay}>+ LOG DAY</button>
              </div>
            </div>
          </div>
          <div style={{ ...C.card,overflowX:'auto' }}>
            <div style={{ display:'flex',minWidth:290,marginBottom:8 }}>
              <div style={{ width:110,flexShrink:0 }}/>
              {DAYS.map((d,i)=><div key={i} style={{ flex:1,textAlign:'center',fontSize:10,fontWeight:700,color:'#555' }}>{d}</div>)}
            </div>
            {habits.map((habit,hi)=>(
              <div key={hi} style={{ display:'flex',alignItems:'center',marginBottom:6,minWidth:290 }}>
                <div style={{ width:110,fontSize:10,color:'#aaa',fontWeight:600,paddingRight:6,flexShrink:0 }}>{habit.label}</div>
                {habit.days.map((done,di)=>(
                  <div key={di} onClick={()=>toggleHabit(hi,di)}
                    style={{ flex:1,height:26,borderRadius:5,background:done?'#ff3d00':'#1e1e1e',margin:'0 2px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:800 }}>
                    {done?'✓':''}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={C.card}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <span style={C.lbl}>THIS WEEK</span>
                <div style={{ fontSize:28,fontWeight:900 }}>{completedHabits}<span style={{ fontSize:12,color:'#555' }}>/{totalHabits}</span></div>
              </div>
              <div style={{ background:pct>=70?'#ff3d00':'#1e1e1e',padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:800 }}>
                {pct>=70?'🔥 ELITE':pct>=40?'⚡ GOOD':'📈 GROW'}
              </div>
            </div>
            <div style={{ height:4,background:'#1e1e1e',borderRadius:3,marginTop:10,overflow:'hidden' }}>
              <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#ff3d00,#ff6d00)',borderRadius:3 }}/>
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRESS ── */}
      {tab === 'progress' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>PROGRESS</div>
          <div style={C.sub}>YOUR JOURNEY OVER TIME</div>

          {/* Energy & Confidence Chart */}
          {checkinHistory.length > 0 ? <>
            <span style={C.lbl}>ENERGY & CONFIDENCE (LAST 8 WEEKS)</span>
            <div style={{ ...C.card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3d00' }} />
                    <span style={{ fontSize: 9, color: '#aaa', fontWeight: 700 }}>ENERGY</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff8c00' }} />
                    <span style={{ fontSize: 9, color: '#aaa', fontWeight: 700 }}>CONFIDENCE</span>
                  </div>
                </div>
              </div>
              {/* Bar chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                {[...checkinHistory].reverse().map((c, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 100 }}>
                      <div style={{ flex: 1, background: '#ff3d00', borderRadius: '3px 3px 0 0', height: `${(c.energy_level / 10) * 100}%`, minHeight: 4 }} />
                      <div style={{ flex: 1, background: '#ff8c00', borderRadius: '3px 3px 0 0', height: `${(c.confidence_level / 10) * 100}%`, minHeight: 4 }} />
                    </div>
                    <div style={{ fontSize: 7, color: '#555', fontWeight: 700 }}>{c.week?.split('-W')[1] ? 'W'+c.week.split('-W')[1] : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions completed */}
            <span style={C.lbl}>SESSIONS COMPLETED PER WEEK</span>
            <div style={{ ...C.card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {[...checkinHistory].reverse().map((c, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ fontSize: 9, color: '#ff3d00', fontWeight: 900 }}>{c.sessions_completed}</div>
                    <div style={{ width: '100%', background: '#ff3d00', borderRadius: '3px 3px 0 0', height: `${(c.sessions_completed / 14) * 60}px`, minHeight: 4 }} />
                    <div style={{ fontSize: 7, color: '#555', fontWeight: 700 }}>{c.week?.split('-W')[1] ? 'W'+c.week.split('-W')[1] : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Averages */}
            <span style={C.lbl}>YOUR AVERAGES</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                ['⚡', 'ENERGY', (checkinHistory.reduce((a,c)=>a+c.energy_level,0)/checkinHistory.length).toFixed(1)],
                ['💪', 'CONFIDENCE', (checkinHistory.reduce((a,c)=>a+c.confidence_level,0)/checkinHistory.length).toFixed(1)],
                ['🏃', 'SESSIONS', (checkinHistory.reduce((a,c)=>a+c.sessions_completed,0)/checkinHistory.length).toFixed(1)],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ ...C.card, textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#ff3d00' }}>{val}</div>
                  <div style={{ fontSize: 7, color: '#555', letterSpacing: 2, fontWeight: 700, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Trend */}
            {checkinHistory.length >= 2 && (() => {
              const latest = checkinHistory[0]
              const prev = checkinHistory[1]
              const energyUp = latest.energy_level >= prev.energy_level
              const confUp = latest.confidence_level >= prev.confidence_level
              return (
                <div style={{ ...C.card, borderColor: energyUp && confUp ? '#1a4a1a' : '#1e1e1e' }}>
                  <span style={C.lbl}>WEEK OVER WEEK</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>
                        {energyUp ? '⬆️' : '⬇️'} Energy {energyUp ? '+' : ''}{latest.energy_level - prev.energy_level}
                      </div>
                      <div style={{ fontSize: 10, color: '#555' }}>vs last week</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>
                        {confUp ? '⬆️' : '⬇️'} Confidence {confUp ? '+' : ''}{latest.confidence_level - prev.confidence_level}
                      </div>
                      <div style={{ fontSize: 10, color: '#555' }}>vs last week</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Ball mastery progress */}
            {ballHistory.length > 0 && <>
              <span style={C.lbl}>BALL MASTERY SESSIONS</span>
              <div style={{ ...C.card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Total Sessions</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#ff3d00' }}>{ballHistory.length}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Total Reps</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#ff3d00' }}>{ballHistory.reduce((a,b)=>a+(b.total_reps||0),0)}</div>
                </div>
              </div>
            </>}

            {/* BADGES */}
            {(() => {
              const badges = [
                { icon: '🦈', label: 'FIRST SHARK', desc: 'Submitted first action step', earned: submissions.length >= 1 },
                { icon: '🔥', label: '7 DAY STREAK', desc: 'Logged 7 days in a row', earned: streak >= 7 },
                { icon: '⚡', label: '30 DAY LEGEND', desc: 'Logged 30 days in a row', earned: streak >= 30 },
                { icon: '⚽', label: 'BALL MASTER', desc: 'Logged 10 ball mastery sessions', earned: ballHistory.length >= 10 },
                { icon: '📋', label: 'CHECK-IN PRO', desc: 'Completed 4 weekly check-ins', earned: checkinHistory.length >= 4 },
                { icon: '💪', label: 'ACTION HERO', desc: 'Submitted 10 action steps', earned: submissions.length >= 10 },
                { icon: '🏆', label: 'DSM ELITE', desc: 'Completed 8 weekly check-ins', earned: checkinHistory.length >= 8 },
                { icon: '🧠', label: 'MINDSET ATHLETE', desc: 'Used all 4 mental tools', earned: submissions.some(s => s.shark_used && s.goldfish_used && s.selftalk_used && s.tuneout_used) },
              ]
              const earned = badges.filter(b => b.earned)
              const locked = badges.filter(b => !b.earned)
              return (
                <>
                  <span style={C.lbl}>🏅 YOUR BADGES ({earned.length}/{badges.length})</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {earned.map((b, i) => (
                      <div key={i} style={{ ...C.card, borderColor: '#ff3d00', textAlign: 'center', padding: 14 }}>
                        <div style={{ fontSize: 32, marginBottom: 6 }}>{b.icon}</div>
                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: '#ff3d00', marginBottom: 3 }}>{b.label}</div>
                        <div style={{ fontSize: 9, color: '#555' }}>{b.desc}</div>
                      </div>
                    ))}
                    {locked.map((b, i) => (
                      <div key={i} style={{ ...C.card, textAlign: 'center', padding: 14, opacity: 0.35 }}>
                        <div style={{ fontSize: 32, marginBottom: 6, filter: 'grayscale(1)' }}>🔒</div>
                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: '#555', marginBottom: 3 }}>{b.label}</div>
                        <div style={{ fontSize: 9, color: '#444' }}>{b.desc}</div>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}

          </> : (
            <div style={{ ...C.card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📈</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>NO DATA YET</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Complete your weekly check-ins to see your progress charts here. The more you log, the more you can see yourself improving! 🦈</div>
            </div>
          )}
        </div>
      )}

      {/* ── COACH VALENTINO BOT ── */}
      {tab === 'bot' && (
        <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 116px)' }} className="fade">
          <div style={{ padding:'12px 20px 10px',borderBottom:'1px solid #1a1a1a',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div><div style={C.title}>COACH VALENTINO</div><div style={C.sub}>YOUR AI MINDSET COACH</div></div>
            <button onClick={()=>setVoiceMode(p=>!p)}
              style={{ background:voiceMode?'#ff3d00':'#1e1e1e',border:'none',borderRadius:20,padding:'7px 12px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
              {voiceMode?'🎙️ ON':'🎙️ OFF'}
            </button>
          </div>
          <div style={{ flex:1,overflowY:'auto',padding:'12px 20px' }}>
            {messages.length === 1 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: 3, fontWeight: 700, marginBottom: 10 }}>ASK COACH VALENTINO</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => sendChat(q)}
                      style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 20, padding: '6px 12px', fontSize: 11, color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg,i)=>(
              <div key={i} style={{ display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',marginBottom:10 }}>
                {msg.role==='assistant'&&<div style={{ width:28,height:28,borderRadius:'50%',background:'#ff3d00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,marginRight:7,flexShrink:0,alignSelf:'flex-end' }}>🤖</div>}
                <div style={{ maxWidth:'76%',padding:'10px 13px',borderRadius:13,background:msg.role==='user'?'#ff3d00':'#1a1a1a',fontSize:13,lineHeight:1.5,borderBottomRightRadius:msg.role==='user'?4:13,borderBottomLeftRadius:msg.role==='assistant'?4:13 }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading&&<div style={{ display:'flex',alignItems:'center',gap:7 }}>
              <div style={{ width:28,height:28,borderRadius:'50%',background:'#ff3d00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>🤖</div>
              <div style={{ background:'#1a1a1a',padding:'10px 13px',borderRadius:13,fontSize:12,color:'#666' }}>Thinking... 💭</div>
            </div>}
            <div ref={chatEnd}/>
          </div>
          <div style={{ padding:'10px 20px 12px',borderTop:'1px solid #1a1a1a' }}>
            {voiceMode&&<div style={{ textAlign:'center',marginBottom:10 }}>
              <button onClick={startVoice} style={{ width:58,height:58,borderRadius:'50%',background:isRecording?'linear-gradient(135deg,#ff3d00,#ff6d00)':'#1e1e1e',border:`3px solid ${isRecording?'#ff6d00':'#333'}`,fontSize:22,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:isRecording?'0 0 18px rgba(255,61,0,0.5)':'none' }}>
                {isRecording?'⏹️':'🎙️'}
              </button>
              <div style={{ fontSize:9,color:isRecording?'#ff3d00':'#555',fontWeight:800,letterSpacing:2,marginTop:5 }}>{isRecording?'● RECORDING...':'TAP TO SPEAK'}</div>
            </div>}
            <div style={{ display:'flex',gap:8 }}>
              <input style={{ ...C.inp,flex:1 }} placeholder="Ask Coach Valentino anything..." value={chatInput}
                onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} />
              {!voiceMode&&<button onClick={startVoice} style={{ background:'#1e1e1e',border:'none',borderRadius:10,padding:'0 13px',fontSize:17,cursor:'pointer' }}>🎙️</button>}
              <button onClick={()=>sendChat()} style={{ background:'#ff3d00',border:'none',borderRadius:10,padding:'0 15px',fontSize:17,cursor:'pointer' }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPETE ── */}
      {tab === 'compete' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>COMPETE</div>
          <div style={C.sub}>CHALLENGES & LEADERBOARD</div>

          {/* Tab switcher */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[['leaderboard','🏆 Leaderboard'],['challenges','⚡ Challenges'],['team','👥 Team']].map(([t,l])=>(
              <button key={t} onClick={()=>setCompetitionTab(t)}
                style={{ flex:1, background:competitionTab===t?'#ff3d00':'#1e1e1e', border:'none', borderRadius:10, padding:'9px 4px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                {l}
              </button>
            ))}
          </div>

          {/* LEADERBOARD */}
          {competitionTab === 'leaderboard' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>DSM RANKINGS</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Points = Streak×3 + Ball Mastery×2 + Action Steps×2 + Check-ins×1 🦈</div>
              </div>
              {leaderboard.length === 0 ? (
                <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>🏆</div>
                  <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO ATHLETES YET</div>
                  <div style={{ fontSize:13, color:'#555' }}>Leaderboard fills up as athletes join and log their work!</div>
                </div>
              ) : leaderboard.map((a, i) => (
                <div key={i} style={{ ...C.card, borderColor: i===0?'#ff3d00':i===1?'#888':i===2?'#cd7f32':'#1e1e1e', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize: i<3?28:18, fontWeight:900, width:36, textAlign:'center', flexShrink:0 }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:800 }}>{a.full_name||a.email}</div>
                      <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:9, color:'#ff3d00', fontWeight:700 }}>🔥 {a.streak||0} streak</span>
                        <span style={{ fontSize:9, color:'#555', fontWeight:700 }}>⚽ {a.bmCount} BM</span>
                        <span style={{ fontSize:9, color:'#555', fontWeight:700 }}>✅ {a.asCount} AS</span>
                        <span style={{ fontSize:9, color:'#555', fontWeight:700 }}>📋 {a.ciCount} CI</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:22, fontWeight:900, color:'#ff3d00' }}>{a.score}</div>
                      <div style={{ fontSize:8, color:'#555', letterSpacing:2, fontWeight:700 }}>PTS</div>
                    </div>
                  </div>
                  {a.id === user.id && <div style={{ marginTop:6, fontSize:9, color:'#ff3d00', fontWeight:800, letterSpacing:2 }}>← YOU</div>}
                </div>
              ))}
            </>
          )}

          {/* CHALLENGES */}
          {competitionTab === 'challenges' && (
            <>
              {isCoach && (
                <div style={{ ...C.card, marginBottom:14 }}>
                  <span style={C.lbl}>CREATE CHALLENGE</span>
                  <input style={{ ...C.inp, marginBottom:8 }} placeholder="Challenge title (e.g. 7-Day Shark)" value={newChallenge.title} onChange={e=>setNewChallenge(p=>({...p,title:e.target.value}))} />
                  <textarea style={{ ...C.ta, height:60, marginBottom:8 }} placeholder="Description..." value={newChallenge.description} onChange={e=>setNewChallenge(p=>({...p,description:e.target.value}))} />
                  <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <span style={C.lbl}>TYPE</span>
                      <select value={newChallenge.type} onChange={e=>setNewChallenge(p=>({...p,type:e.target.value}))}>
                        <option value="weekly">Weekly</option>
                        <option value="team">Team</option>
                        <option value="h2h">Head to Head</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={C.lbl}>TARGET</span>
                      <input type="number" style={C.inp} value={newChallenge.target} onChange={e=>setNewChallenge(p=>({...p,target:parseInt(e.target.value)||1}))} />
                    </div>
                  </div>
                  <button style={C.btn} disabled={savingChallenge||!newChallenge.title} onClick={async()=>{
                    setSavingChallenge(true)
                    await supabase.from('challenges').insert([{ ...newChallenge, created_by: user.id }])
                    setNewChallenge({ title:'', description:'', type:'weekly', target:7, unit:'sessions' })
                    const { data: ch } = await supabase.from('challenges').select('*, challenge_completions(user_id)').order('created_at',{ascending:false}).limit(20)
                    if(ch) setChallenges(ch)
                    setSavingChallenge(false)
                  }}>
                    {savingChallenge?'CREATING...':'⚡ CREATE CHALLENGE'}
                  </button>
                </div>
              )}

              {challenges.length === 0 ? (
                <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>⚡</div>
                  <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO CHALLENGES YET</div>
                  <div style={{ fontSize:13, color:'#555' }}>{isCoach?'Create the first challenge above!':'Coach Valentino will post challenges here. Stay ready! 🦈'}</div>
                </div>
              ) : challenges.map((ch, i) => {
                const completed = ch.challenge_completions?.some(c => c.user_id === user.id)
                const completedCount = ch.challenge_completions?.length || 0
                return (
                  <div key={i} style={{ ...C.card, borderColor: completed?'#1a4a1a':'#1e1e1e', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <div style={{ fontSize:9, background: ch.type==='weekly'?'#ff3d00':ch.type==='team'?'#0055aa':ch.type==='h2h'?'#aa0055':'#555', borderRadius:20, padding:'2px 8px', fontWeight:800, color:'#fff', letterSpacing:1 }}>
                            {ch.type==='weekly'?'⚡ WEEKLY':ch.type==='team'?'👥 TEAM':ch.type==='h2h'?'⚔️ H2H':'🤖 AUTO'}
                          </div>
                          {completed && <div style={{ fontSize:9, background:'#1a4a1a', borderRadius:20, padding:'2px 8px', fontWeight:800, color:'#4aff4a', letterSpacing:1 }}>✅ DONE</div>}
                        </div>
                        <div style={{ fontSize:15, fontWeight:900, marginBottom:4 }}>{ch.title}</div>
                        <div style={{ fontSize:12, color:'#888', lineHeight:1.5 }}>{ch.description}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:10, color:'#555' }}>👥 {completedCount} completed</div>
                      {!completed && !isCoach && (
                        <button onClick={async()=>{
                          await supabase.from('challenge_completions').insert([{ challenge_id:ch.id, user_id:user.id }])
                          const { data: chd } = await supabase.from('challenges').select('*, challenge_completions(user_id)').order('created_at',{ascending:false}).limit(20)
                          if(chd) setChallenges(chd)
                        }} style={{ background:'#ff3d00', border:'none', borderRadius:8, padding:'7px 14px', fontSize:10, fontWeight:900, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                          MARK COMPLETE ✅
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* TEAM CHALLENGE */}
          {competitionTab === 'team' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>TEAM GOAL</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>The whole DSM team working toward one goal. Every session counts. 🦈</div>
              </div>
              <div style={{ ...C.card, textAlign:'center', padding:24 }}>
                <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>TOTAL TEAM BALL MASTERY SESSIONS</div>
                <div style={{ fontSize:48, fontWeight:900, color:'#ff3d00', marginBottom:8 }}>{leaderboard.reduce((a,b)=>a+b.bmCount,0)}</div>
                <div style={{ fontSize:11, color:'#555', marginBottom:16 }}>sessions logged by the whole team</div>
                <div style={{ height:8, background:'#1e1e1e', borderRadius:5, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', width:`${Math.min((leaderboard.reduce((a,b)=>a+b.bmCount,0)/100)*100, 100)}%`, background:'linear-gradient(90deg,#ff3d00,#ff6d00)', borderRadius:5 }} />
                </div>
                <div style={{ fontSize:10, color:'#555' }}>Goal: 100 team sessions 🎯</div>
              </div>
              <div style={{ ...C.card, textAlign:'center', padding:24 }}>
                <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>TOTAL TEAM ACTION STEPS</div>
                <div style={{ fontSize:48, fontWeight:900, color:'#ff3d00', marginBottom:8 }}>{leaderboard.reduce((a,b)=>a+b.asCount,0)}</div>
                <div style={{ height:8, background:'#1e1e1e', borderRadius:5, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', width:`${Math.min((leaderboard.reduce((a,b)=>a+b.asCount,0)/50)*100, 100)}%`, background:'linear-gradient(90deg,#ff3d00,#ff6d00)', borderRadius:5 }} />
                </div>
                <div style={{ fontSize:10, color:'#555' }}>Goal: 50 team action steps 🎯</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── COMMUNITY ── */}
      {tab === 'community' && (
        <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 116px)' }} className="fade">
          <div style={{ padding:'12px 20px 0' }}>
            <div style={C.title}>COMMUNITY</div>
            <div style={C.sub}>DSM ATHLETE & PARENT NETWORK</div>
            <div style={{ display:'flex', gap:8, marginTop:10, marginBottom:0 }}>
              {[['athletes','⚽ Athletes'], ['parents','👨‍👩‍👧 Parents']].map(([t,l])=>(
                <button key={t} onClick={()=>setCommunityTab(t)}
                  style={{ flex:1, background:communityTab===t?'#ff3d00':'#1e1e1e', border:'none', borderRadius:10, padding:'9px 8px', fontSize:11, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'12px 20px' }}>

            {/* NEW POST */}
            {((communityTab==='athletes' && !isCoach && profile?.role!=='parent') || (communityTab==='parents' && profile?.role==='parent') || isCoach) && (
              <div style={{ ...C.card, marginBottom:12 }}>
                <span style={C.lbl}>SHARE WITH THE COMMUNITY</span>
                <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
                  {[['win','🏆 Win'],['milestone','📈 Milestone'],['question','❓ Question']].map(([t,l])=>(
                    <button key={t} onClick={()=>setNewPost(p=>({...p,type:t}))}
                      style={{ background:newPost.type===t?'#ff3d00':'#1e1e1e', border:'none', borderRadius:20, padding:'5px 12px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <textarea style={{ ...C.ta, height:70, marginBottom:8 }}
                  placeholder={newPost.type==='win'?'Share your win with the team! 🏆':newPost.type==='milestone'?'What milestone did you hit? 📈':'Ask Coach Valentino or the community ❓'}
                  value={newPost.content}
                  onChange={e=>setNewPost(p=>({...p,content:e.target.value}))} />
                <button style={C.btn} disabled={savingPost||!newPost.content.trim()}
                  onClick={async()=>{
                    if(!newPost.content.trim()) return
                    setSavingPost(true)
                    await supabase.from('community_posts').insert([{
                      user_id: user.id,
                      type: newPost.type,
                      content: newPost.content,
                      community: communityTab,
                    }])
                    setNewPost({type:'win',content:''})
                    const { data: posts } = await supabase
                      .from('community_posts')
                      .select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))')
                      .order('created_at', { ascending: false }).limit(50)
                    if(posts) setCommunityPosts(posts)
                    setSavingPost(false)
                  }}>
                  {savingPost?'POSTING...':'POST TO COMMUNITY 🔥'}
                </button>
              </div>
            )}

            {/* POSTS FEED */}
            {communityPosts.filter(p=>p.community===communityTab).length === 0 ? (
              <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                <div style={{ fontSize:44, marginBottom:12 }}>{communityTab==='athletes'?'⚽':'👨‍👩‍👧'}</div>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO POSTS YET</div>
                <div style={{ fontSize:13, color:'#555' }}>Be the first to post in the {communityTab} community! 🔥</div>
              </div>
            ) : communityPosts.filter(p=>p.community===communityTab).map((post,i)=>(
              <div key={i} style={{ ...C.card, marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'#ff3d00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, flexShrink:0 }}>
                    {(post.profiles?.full_name||post.profiles?.email||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{post.profiles?.full_name||post.profiles?.email}</div>
                    <div style={{ fontSize:9, color:'#555', marginTop:1 }}>{new Date(post.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ background: post.type==='win'?'#1a3a0a':post.type==='milestone'?'#0a1a3a':'#2a1a0a', borderRadius:20, padding:'3px 10px', fontSize:9, fontWeight:800, color: post.type==='win'?'#4aff4a':post.type==='milestone'?'#4a9fff':'#ffaa4a' }}>
                    {post.type==='win'?'🏆 WIN':post.type==='milestone'?'📈 MILESTONE':'❓ QUESTION'}
                  </div>
                </div>
                <div style={{ fontSize:14, lineHeight:1.6, marginBottom:10 }}>{post.content}</div>

                {/* Comments */}
                {post.community_comments?.length > 0 && (
                  <div style={{ borderTop:'1px solid #1e1e1e', paddingTop:8, marginBottom:8 }}>
                    {post.community_comments.map((c,ci)=>(
                      <div key={ci} style={{ display:'flex', gap:8, marginBottom:6 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', background:'#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, flexShrink:0 }}>
                          {(c.profiles?.full_name||c.profiles?.email||'?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1, background:'#0d0d0d', borderRadius:8, padding:'6px 10px' }}>
                          <div style={{ fontSize:10, fontWeight:800, color:'#ff3d00', marginBottom:2 }}>{c.profiles?.full_name||c.profiles?.email}</div>
                          <div style={{ fontSize:12, lineHeight:1.5 }}>{c.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                {postingComment===post.id ? (
                  <div style={{ display:'flex', gap:6 }}>
                    <input style={{ ...C.inp, flex:1, padding:'8px 12px', fontSize:12 }}
                      placeholder="Add a comment..." value={newComment}
                      onChange={e=>setNewComment(e.target.value)}
                      onKeyDown={async e=>{
                        if(e.key==='Enter' && newComment.trim()) {
                          await supabase.from('community_comments').insert([{ post_id:post.id, user_id:user.id, content:newComment }])
                          setNewComment('')
                          setPostingComment(null)
                          const { data: posts } = await supabase.from('community_posts').select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))').order('created_at',{ascending:false}).limit(50)
                          if(posts) setCommunityPosts(posts)
                        }
                      }} />
                    <button onClick={async()=>{
                      if(!newComment.trim()) return
                      await supabase.from('community_comments').insert([{ post_id:post.id, user_id:user.id, content:newComment }])
                      setNewComment('')
                      setPostingComment(null)
                      const { data: posts } = await supabase.from('community_posts').select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))').order('created_at',{ascending:false}).limit(50)
                      if(posts) setCommunityPosts(posts)
                    }} style={{ background:'#ff3d00', border:'none', borderRadius:8, padding:'0 12px', fontSize:14, cursor:'pointer' }}>→</button>
                  </div>
                ) : (
                  <button onClick={()=>{ setPostingComment(post.id); setNewComment('') }}
                    style={{ background:'none', border:'1px solid #2a2a2a', borderRadius:8, padding:'5px 12px', fontSize:10, fontWeight:800, color:'#555', cursor:'pointer', fontFamily:'inherit' }}>
                    💬 COMMENT
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PARENTS ── */}
      {tab === 'parents' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>PARENTS</div>
          <div style={C.sub}>BEST PRACTICES GUIDE</div>
          <div style={C.orange}>
            <span style={C.olbl}>FROM COACH VALENTINO</span>
            <div style={{ fontSize:15,fontWeight:700,lineHeight:1.4 }}>"Parents are the most influential people in a young athlete's mental development. Here's how to help — not hurt."</div>
          </div>
          {PARENT_GUIDE.map((item,i)=>(
            <div key={i} style={C.card}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                <div style={{ fontSize:22 }}>{item.icon}</div>
                <div style={{ fontSize:15,fontWeight:800 }}>{item.title}</div>
              </div>
              <div style={{ fontSize:13,color:'#bbb',lineHeight:1.6 }}>{item.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── COACH DASHBOARD ── */}
      {tab === 'dashboard' && isCoach && !selectedAthlete && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>DASHBOARD</div>
          <div style={C.sub}>COACH VALENTINOIEW</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14 }}>
            {[[allAthletes.filter(a=>a.role==='athlete').length,'ATHLETES'],[allSubmissions.length,'ACTION STEPS'],[allCheckins.length,'CHECK-INS']].map(([n,l],i)=>(
              <div key={i} style={{ ...C.card,textAlign:'center',padding:12 }}>
                <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>{n}</div>
                <div style={{ fontSize:7,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          {allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')).length > 0 && <>
            <span style={{ ...C.lbl, color:'#ff3d00' }}>⚠️ PENDING ACTIVATION</span>
            {allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')).map((a,i)=>(
              <div key={i} style={{ ...C.card, borderColor:'#ff3d00', cursor:'pointer' }} onClick={()=>setSelectedAthlete(a)}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:16,fontWeight:800,marginBottom:2 }}>{a.full_name||a.email}</div>
                    <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>⚠️ WAITING FOR ACTIVATION</div>
                  </div>
                  <button onClick={async(e)=>{ e.stopPropagation(); await updateAccessLevel(a.id,'paid'); loadUserData(); }}
                    style={{ background:'#00aa44',border:'none',borderRadius:8,padding:'8px 12px',fontSize:10,fontWeight:900,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                    UNLOCK
                  </button>
                </div>
              </div>
            ))}
          </>}
          <span style={C.lbl}>ACTIVE ATHLETES</span>
          {allAthletes.filter(a=>a.role==='athlete'&&a.access_level&&a.access_level!=='locked').map((a,i)=>(
            <div key={i} style={{ ...C.card,cursor:'pointer' }} onClick={()=>setSelectedAthlete(a)}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:800,marginBottom:2 }}>{a.full_name||a.email}</div>
                  <div style={{ fontSize:10,color:'#555' }}>🔥 {a.streak||0} streak · {a.access_level}</div>
                </div>
                <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>{a.streak||0}</div>
              </div>
            </div>
          ))}

          <span style={{ ...C.lbl,marginTop:14 }}>RECENT WEEKLY CHECK-INS</span>
          {allCheckins.slice(0,5).map((c,i)=>(
            <div key={i} style={C.card}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                <div style={{ fontSize:14,fontWeight:800 }}>{c.profiles?.full_name||c.profiles?.email}</div>
                <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{c.week}</div>
              </div>
              <div style={{ display:'flex',gap:14,marginBottom:6 }}>
                {[['energy_level','⚡'],['confidence_level','💪'],['sessions_completed','🏃']].map(([k,icon])=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16,fontWeight:900,color:'#ff3d00' }}>{c[k]}</div>
                    <div style={{ fontSize:8,color:'#555' }}>{icon}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12,color:'#aaa' }}>🏆 {c.biggest_win}</div>
              {c.message_to_coach&&<div style={{ fontSize:11,color:'#666',marginTop:4,fontStyle:'italic' }}>"{c.message_to_coach}"</div>}
            </div>
          ))}

          <span style={{ ...C.lbl,marginTop:14 }}>RECENT BALL MASTERY</span>
          {allBallMastery.slice(0,5).map((b,i)=>(
            <div key={i} style={C.card}>
              <div style={{ display:'flex',justifyContent:'space-between' }}>
                <div style={{ fontSize:14,fontWeight:800 }}>{b.profiles?.full_name||b.profiles?.email}</div>
                <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{b.date}</div>
              </div>
              <div style={{ fontSize:11,color:'#555',marginTop:4 }}>{b.total_skills} skills · {b.total_reps} reps</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dashboard' && isCoach && selectedAthlete && (
        <div style={C.scroll} className="fade">
          <button onClick={()=>setSelectedAthlete(null)} style={{ background:'none',border:'none',color:'#ff3d00',fontSize:12,fontWeight:800,letterSpacing:2,cursor:'pointer',fontFamily:'inherit',marginBottom:12,padding:0 }}>← BACK</button>
          <div style={C.title}>{selectedAthlete.full_name||selectedAthlete.email}</div>
          <div style={C.sub}>ATHLETE PROFILE</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
            <div style={{ ...C.card,textAlign:'center' }}>
              <div style={{ fontSize:26,fontWeight:900,color:'#ff3d00' }}>{selectedAthlete.streak||0}</div>
              <div style={{ fontSize:9,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>STREAK</div>
            </div>
            <div style={{ ...C.card,textAlign:'center' }}>
              <div style={{ fontSize:13,fontWeight:800,color:'#ff3d00',marginTop:4 }}>{selectedAthlete.access_level?.toUpperCase()}</div>
              <div style={{ fontSize:9,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>ACCESS</div>
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>ACCESS CONTROL</span>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <button onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,'paid'); setSelectedAthlete({...selectedAthlete,access_level:'paid'}); loadUserData(); }}
                style={{ flex:1, background:'#00aa44', border:'none', borderRadius:10, padding:'12px 8px', fontSize:11, fontWeight:900, color:'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                ✅ UNLOCK ACCESS
              </button>
              <button onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,'locked'); setSelectedAthlete({...selectedAthlete,access_level:'locked'}); loadUserData(); }}
                style={{ flex:1, background:'#aa0000', border:'none', borderRadius:10, padding:'12px 8px', fontSize:11, fontWeight:900, color:'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                🔒 LOCK ACCESS
              </button>
            </div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {['trial','mentoring','paid','locked'].map(level=>(
                <button key={level} onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,level); setSelectedAthlete({...selectedAthlete,access_level:level}); loadUserData(); }}
                  style={{ background:selectedAthlete.access_level===level?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'7px 11px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase' }}>
                  {level}
                </button>
              ))}
            </div>
          </div>
          <span style={C.lbl}>THEIR ACTION STEPS</span>
          {allSubmissions.filter(s=>s.user_id===selectedAthlete.id).slice(0,5).map((s,i)=>(
            <div key={i} style={C.card}>
              <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{s.date} · {s.session_type}</div>
              <div style={{ display:'flex',gap:10,marginTop:6 }}>
                {['conditioning','strength','technical','mental'].map(k=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{s[k]}</div>
                    <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NAV */}
      <div style={C.nav}>
        {navTabs.map(t=>(
          <button key={t.id} style={C.nb} onClick={()=>{ setTab(t.id); setSelectedAthlete(null); }}>
            <div style={{ fontSize:13,opacity:tab===t.id?1:0.3 }}>{t.icon}</div>
            <div style={{ fontSize:6,fontWeight:800,letterSpacing:1,color:tab===t.id?'#ff3d00':'#555' }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
