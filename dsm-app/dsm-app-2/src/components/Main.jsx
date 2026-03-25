/*
 * ══════════════════════════════════════════════════════════════════
 * DSM APP — Main-26.jsx (FULLY DEBUGGED VERSION)
 * ══════════════════════════════════════════════════════════════════
 *
 * BUGS FIXED (search "BUG FIX" for critical DB fixes):
 *
 *   1.  loadAthleteProfile() — Action steps query was replaced with
 *       Promise.resolve({data:[]}) so coach dashboard NEVER loaded
 *       athlete action steps. Restored to getActionSteps(athlete.id).
 *
 *   2.  Leaderboard — asCount was hardcoded to 0 instead of querying
 *       the action_steps table. Restored the Supabase count query.
 *       ⚠️  VERIFY: table name may differ — check supabase.js.
 *
 *   3.  Weekly check-in upsert — missing onConflict parameter.
 *       Added { onConflict: 'user_id,week' }.
 *       ⚠️  REQUIRES in Supabase SQL Editor:
 *         ALTER TABLE weekly_checkins
 *           ADD CONSTRAINT weekly_checkins_user_week_unique
 *           UNIQUE (user_id, week);
 *
 *   4.  mindset_map upsert — same onConflict fix.
 *       ⚠️  REQUIRES:
 *         ALTER TABLE mindset_map
 *           ADD CONSTRAINT mindset_map_user_week_unique
 *           UNIQUE (user_id, week);
 *
 *   5.  downloadReport() called with `user` instead of `profile` —
 *       the user object doesn't have full_name, so reports showed
 *       wrong name. Fixed to pass `profile`.
 *
 *   6.  loadUserData() had zero error handling — one failed query
 *       would silently crash the whole app. Wrapped in try/catch.
 *       Also added null check on profile result.
 *
 *   7.  loadAthleteProfile() — same missing error handling. Wrapped.
 *
 *   8.  Micro reps progress bar counted ALL gameDayChecked items
 *       including gameday checklist entries, inflating the count.
 *       Fixed to only count drill-specific IDs.
 *
 *   9.  Coach dashboard typo: "COACH VALENTINOIEW" → "COACH VALENTINO VIEW"
 *
 *   10. Duplicate matchMsg for "how are you" — second block was dead
 *       code (first match always wins). Removed.
 *
 *   11. Chat send button (→) called sendChat() with no arguments,
 *       so clicking it did nothing. Fixed to read from input ref.
 *
 *   12. Removed dead code: handleSubmitForm (replaced by ActionForm),
 *       form state, savingForm state, setF, microRepDone state.
 *
 *   13. Added error handling to: mistake resets, MAP save, community
 *       post creation. All previously had no error feedback.
 *
 * ──────────────────────────────────────────────────────────────────
 * REMAINING ISSUES (need supabase.js or DB access to fix):
 *
 *   A. Verify submitActionSteps() in lib/supabase.js maps form
 *      fields to the correct database columns.
 *
 *   B. The action_steps table name in leaderboard query (~line 700)
 *      may not match your actual table. Check supabase.js.
 *
 *   C. ElevenLabs API key is exposed client-side via VITE_ env var.
 *      Should be proxied through a Vercel serverless function.
 *
 *   D. N+1 leaderboard query fires one DB call per athlete.
 *      Replace with aggregated query or Supabase RPC.
 *
 *   E. Supabase Site URL must be set to your live domain
 *      (dsm-app-beta.vercel.app) not localhost:3000.
 *
 *   F. This 3300-line file should be split into separate components.
 * ══════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, signOut, submitActionSteps, getActionSteps, saveHabits, getHabits, logDay, getAllProfiles, getAllActionSteps, updateAccessLevel } from '../lib/supabase.js'

const QUOTES = [
  "The body achieves what the mind believes. Train your mind first.",
  "Champions aren't born. They're built -- one mental rep at a time.",
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
  { icon: "🔥", title: "Building Confidence", content: "Catch them doing things RIGHT. Praise effort over outcome. Say: 'I noticed how hard you worked on that' -- not just 'great game.'" },
  { icon: "🧠", title: "Avoiding Pressure", content: "Your child can feel your anxiety. Stay calm in the stands. Cheering is great -- coaching from the sidelines creates confusion and anxiety." },
  { icon: "📋", title: "Weekly Check-In", content: "Ask every week: 'What's one thing you're proud of?' and 'What's one thing you want to improve?' Keep it positive and forward-focused." },
]

const RESOURCES = [
  { title: "DSM Program Guide", desc: "Core program curriculum and methodology", url: "https://docs.google.com/document/d/1fgrgpzgj5L4qPvpbZBdFW2O3LFs6MvI1hv7k46nq23g/edit?usp=sharing", locked: false },
  { title: "Elite Program Continuation", desc: "Advanced program for elite athletes", url: "https://docs.google.com/document/d/1qS1XaBc3dUyWIjtyG1EeeycCGSryj5qyc6p6RVRbZOo/edit?usp=sharing", locked: true },
  { title: "Action Steps Feedback Form", desc: "Original form template", url: "https://docs.google.com/document/d/15LZfqewpb-BSPUx9eSyBzaNmkHRaSb-Bx3V3tckwMS0/edit?tab=t.0", locked: false },
]

const AI_SYSTEM = `You are Coach Valentino -- the AI version of Valentino Di Lorenzo, founder of DiLorenzo Soccer Mindset (DSM). Your background: former semi-professional player from Italy with 26 years of experience. You had youth trials with Inter, Parma, and Modena. You played in the Serie A2 Futsal League in Italy. You came to the US and played with Morris Elite, then coached at the Juventus Academy. You are a Certified USSF State and National coach and a Certified Growth Mindset and Life Coach. You were that scared kid growing up -- a mentor changed everything for you and you became captain of multiple teams in Italy and the US. That is why you built DSM -- to give every young player the mentor you never had. You have transformed 500+ players in 90 days. The program uses: Shark Mentality (fearless, aggressive, forward), Goldfish Mentality (3 second memory for mistakes), Positive Self Talk, Visualization, and Goal Setting. Your style is direct, warm, and real. Keep responses concise and punchy. Never say you are an AI -- you ARE Coach Valentino.`

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
  // Week 4+
  smartGoal: '', goalProgress: '',
  // Week 5+
  didVisualization: false, visualizationNotes: '',
  didMorningRoutine: false, morningRoutineNotes: '',
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
  
  if (matchMsg(msg, ['sad','upset','crying','down','depressed','feel bad','feel terrible','awful','hate this','want to quit','giving up','cant do this'])) return randomMsg([
    "Hey -- I hear you. What's going on? Talk to me. 💙",
    "That's real and I'm not gonna brush past it. What happened? Tell me everything.",
    "I got you. What's going on? Sometimes just getting it out helps. I'm listening.",
  ])

  if (matchMsg(msg, ['i scored','we won','got selected','made the team','played great','best game','hat trick','clean sheet'])) return randomMsg([
    "YOOO let's gooo!! That's what I'm talking about!! Tell me everything 🔥🔥",
    "LETSSS GOOO!! I knew you had it in you!! What was going through your head when it happened? 🦈",
    "That's HUGE!! Proud of you for real. What mental tool do you think helped you most today?",
  ])

  if (matchMsg(msg, ['nervous','scared','anxious','worried','butterflies','shaking','freaking out'])) return randomMsg([
    "Okay first -- breathe. That feeling? That's just your body getting ready to compete. It means you care. Now tell me what's coming up.",
    "Those nerves are actually a good sign -- means you're about to do something that matters. What's the situation?",
    "Channel it. Nerves = energy. Use the energizing breath: sharp inhale through nose, sharp exhale through mouth x3. Feel that? Now you're ready. 🦈",
  ])

  if (matchMsg(msg, ['my coach','the coach','coach yelled','coach benched','hate my coach','coach is wrong'])) return randomMsg([
    "That's frustrating, I get it. Here's the thing -- you can only control YOUR reaction. How did you respond in the moment?",
    "Tough situation. Here's what I want you to do -- focus only on what you CAN control. Your effort. Your attitude. Your preparation. That's it.",
    "Hey -- I hear you. Coach relationships can be complicated. But remember: the athletes who succeed are the ones who find a way to learn from every coach, even the tough ones.",
  ])

  if (matchMsg(msg, ['bad training','bad practice','terrible practice','practice was rough','messed up today','struggled today'])) return randomMsg([
    "Rough one today huh. What happened? Walk me through it.",
    "Bad practices are part of the process. The question is -- what did you learn? Give me one thing.",
    "One bad practice means nothing. What matters is how you show up TOMORROW. What's your plan?",
  ])

  if (matchMsg(msg, ['what should i do','can you help','need help','need advice','help me'])) return randomMsg([
    "Of course -- that's what I'm here for. Tell me what's going on and we'll figure it out together 💪",
    "Talk to me. What's the situation?",
    "Yeah let's work through it. What's the situation?",
  ])

  if (matchMsg(msg, ['hello','hi','hey','sup','wassup','whats good'])) return randomMsg([
    "Hey! Good to hear from you. How are you doing?",
    "Hey! What's on your mind today?",
    "What's up! Ready to work? 🦈",
  ])

  if (matchMsg(msg, ['how are you','how r you','you good','hows it going','how you doing','how have you been','how u doing'])) return randomMsg([
    "I am doing really well, thank you for asking! How are you doing?",
    "Doing great, locked in as always! How about you -- how has training been going? 🔥",
    "Good! Ready to help you level up. How are YOU doing?",
  ])

  if (matchMsg(msg, ['what are you doing','what you up to','what you doing','whatcha doing'])) return randomMsg([
    "Thinking about soccer mindset 24/7 -- that's just how I'm built 😂 What's going on with you? 💪",
    "Always working. Right now I'm focused on YOU. What do you need?",
  ])

  if (matchMsg(msg, ['good morning','morning'])) return randomMsg([
    "Good morning! Big day ahead -- what's the plan?",
    "Morning! What's one thing you want to accomplish today?",
    "Rise up! Morning is when champions get ahead. What are you working on today? 🦈",
  ])

  if (matchMsg(msg, ['good night','goodnight','going to sleep','going to bed'])) return randomMsg([
    "Good night! Get your rest -- recovery is part of training. See you tomorrow 💪",
    "Rest well. Champions recover hard. Big day tomorrow 🦈",
  ])

  if (matchMsg(msg, ['bored','nothing to do','chilling'])) return randomMsg([
    "Bored?? That's 15 minutes of ball mastery calling your name 😂⚽",
    "No such thing as bored for an athlete. Grab a ball. 15 minutes weak foot. Go.",
  ])

  if (matchMsg(msg, ['haha','lol','lmao','funny'])) return randomMsg([
    "Ha! Glad you're in a good mood 😂 Now let's channel that energy into training. What are we working on? 🔥",
    "Love the energy! Use it. What's on the agenda today?",
  ])

  if (matchMsg(msg, ['thank','thanks','thank you','appreciate'])) return randomMsg([
    "Always! Come back and tell me how it goes 💪",
    "That's what I'm here for. Keep putting in the work and the results will follow.",
    "Of course. Now go execute. 🦈",
  ])

  if (matchMsg(msg, ['mental loop','loop','system','process'])) return randomMsg([
    "The mental loop is: Recognize -- Reset -- Refocus. Recognize the negative thought. Reset with a breath or cue word. Refocus on the next play. That's it. 3 steps.",
  ])

  if (matchMsg(msg, ['1v1','afraid','fear','bigger','defender','physical','tackle','challenge'])) return randomMsg([
    "Bigger defender and your brain says back off. Here's the truth: when you go in HESITANT, you're more likely to get hurt. Commit fully. Shark mentality.",
    "Speed beats size. Confidence beats size. The only thing holding you back is the story you're telling yourself. Change the story.",
  ])

  if (matchMsg(msg, ['shark','aggressive','fearless','attack','risk'])) return randomMsg([
    "Shark Mentality means one thing: you keep moving forward. Sharks don't swim backwards. They don't hesitate. On that next chance -- go. Full commitment. 🦈",
    "Be a shark. Fearless. Aggressive. Forward. What's your shark phrase?",
  ])

  if (matchMsg(msg, ['goldfish','mistake','forget','error','bad pass','miss','messed up','reset'])) return randomMsg([
    "The mistake already happened. You can't change it. The ONLY thing you control is the next play. 1-2 seconds to process, then switch fully to what's next. 🐠",
    "Goldfish mentality -- 3 second memory for mistakes. Process it, forget it, move forward. What's the next play?",
  ])

  if (matchMsg(msg, ['self talk','voice','head','negative thoughts','positive','inner'])) return randomMsg([
    "Your inner voice is either coaching you or destroying you. Replace 'I cannot do this' with 'next play and I am a shark'. Try it right now.",
    "Catch the negative thought. Name it. Replace it. What's your go-to self talk phrase?",
  ])

  if (matchMsg(msg, ['growth','fixed','mindset','improve','better','develop'])) return randomMsg([
    "Fixed mindset: I am either good at this or not. Growth mindset: I am not good at this YET. That one word -- YET -- changes everything.",
    "Every rep of ball mastery, every action step you log -- that's growth happening in real time. Trust the process.",
  ])

  if (matchMsg(msg, ['confidence','confident','believe','doubt','unsure'])) return randomMsg([
    "Confidence is not something you wait to feel -- it's something you BUILD. Every rep of ball mastery. Every action step. Brick by brick.",
    "You do not need to FEEL confident to ACT confident. Call for the ball. Take the first touch forward. The action creates the feeling.",
  ])

  if (matchMsg(msg, ['lost','lose','bad game','terrible','played bad'])) return randomMsg([
    "One bad game does not define you. What defines you is how you RESPOND. Goldfish mentality applies to games too. Process it, learn from it, move on.",
    "Losses hurt. Good. That means you care. Now use that hurt. Name ONE thing that went wrong and ONE thing you will do in training to fix it.",
  ])

  if (matchMsg(msg, ['ball mastery','weak foot','technical','skills','training'])) return randomMsg([
    "Ball mastery is the foundation. 15-20 minutes every day. Weak foot especially. The players who dominate are the ones who put in the reps nobody else does.",
    "Technical work compounds. 15 minutes today plus 15 minutes tomorrow plus consistency -- that's how you become unguardable.",
  ])

  if (matchMsg(msg, ['visualization','visualize','mental warmup','imagery','imagine','picture','mental rep'])) return randomMsg([
    "Mo Salah said 90% of his goals are visualized BEFORE he scores them. See the action in your mind. Feel it. Then go do it.",
    "Close your eyes. See yourself making the aggressive first touch. See yourself winning the 1v1. Your brain cannot tell the difference between a vivid visualization and the real thing.",
  ])

  if (matchMsg(msg, ['goal setting','smart goal','specific goal','measurable','process goal'])) return randomMsg([
    "There are two types of goals -- outcome and process. Outcome: win the game. Process: make 3 aggressive runs. Focus on the process. That's what you control.",
    "A goal without a plan is just a wish. What's your specific action for this week?",
  ])

  if (matchMsg(msg, ['bench','not playing','playing time','substitute','sitting out'])) return randomMsg([
    "Not getting playing time is painful. Use it as fuel. What can you control right now? Your attitude in training. Your preparation. Your mental game.",
    "Every great player has sat on the bench at some point. The question is -- what do you do with that time?",
  ])

  if (matchMsg(msg, ['pressure','coach watching','eyes on me','big moment'])) return randomMsg([
    "High pressure moments are where champions are MADE. Trust your preparation. You have done the work. Now express it.",
    "Pressure reveals character. Breathe. Trust the process. You are ready for this.",
  ])

  if (matchMsg(msg, ['compare','friend','teammate','better than me','not as good'])) return randomMsg([
    "Stop comparing your journey to someone else's. We are ALL on different journeys. Focus on being better than YOU were yesterday.",
    "Comparing yourself to others feeds limiting beliefs. Your only competition is the version of you from yesterday.",
  ])

  if (matchMsg(msg, ['body language','shoulders','slump','head down'])) return randomMsg([
    "Your body language affects your mindset AS MUCH as your mindset affects your body language. Stand tall, chest out, head up -- even when things go wrong.",
    "Fake it until your body catches up with your mind. Head up. Shoulders back. That's a champion right there.",
  ])

  if (matchMsg(msg, ['parent','mom','dad','family'])) return randomMsg([
    "Family pressure is real. Remember -- you play for YOU. Your growth. Your journey. Channel that love into motivation.",
    "Talk to them. Tell them what support looks like for you. Most parents just want what is best for you -- help them understand what that means.",
  ])

  if (matchMsg(msg, ['college','scholarship','pro','professional','career','future','tryout'])) return randomMsg([
    "The path to college and pro soccer starts with one thing: being unignorable. Work so hard that coaches have no choice but to notice you.",
    "Focus on the process today. The future takes care of itself when you do the work consistently.",
  ])

  if (matchMsg(msg, ['game tomorrow','match tomorrow','big game','tournament tomorrow','playoffs'])) return randomMsg([
    "Tonight: visualize 3 aggressive actions you will take tomorrow. Sleep well. Tomorrow you go to war. 🦈",
    "Pre-game routine: eat well, visualize, say your shark phrase, energizing breath x3. You are ready.",
  ])

  if (matchMsg(msg, ['motivat','tired','lazy','hard','struggle','dont want'])) return randomMsg([
    "On the days you do not feel like it -- those are the most important days. That is where champions separate themselves.",
    "Discipline beats motivation every time. Motivation comes and goes. Discipline shows up every day.",
  ])

  if (matchMsg(msg, ['what team did you play','where did you play','your team','did you play soccer','you play','your career','you played','your club','what club','inter','parma','futsal','semi pro','morris','juventus'])) return randomMsg([
    "I am a former semi-professional player from Italy with over 26 years of experience. I had youth trials with Inter, Parma, and Modena. Then I came to the US and built my pro career with Morris Elite. After that I coached at the Juventus Academy here in the US -- focusing on mindset and building confidence. That whole journey is what DSM is built on. 🦈",
    "I grew up in Italy, had trials with Inter, Parma, and Modena youth teams. Came to the US, played with Morris Elite, then coached at the Juventus Academy. 26 years in the game. I know what it takes -- technically and mentally. 🦈",
    "Started as a scared kid in Italy -- I know that feeling personally. Had trials with Inter, Parma, and Modena. Made it to the Serie A2 Futsal League. Then Morris Elite in the US. Then Juventus Academy as a coach. Everything I teach comes from that journey. 🦈",
  ])

  if (matchMsg(msg, ['where are you from','your background','about you','who are you','tell me about yourself','valentino','coach valentino','your story'])) return randomMsg([
    "I was that kid playing scared. Thanks to a mentor who believed in me I overcame my fears and became captain of multiple teams in Italy and the US. Former semi-pro from Italy -- trials with Inter, Parma, and Modena. Played in the Serie A2 Futsal League. Morris Elite in the US. Juventus Academy coach. Now I am a certified USSF coach and Growth Mindset and Life Coach. I built DSM to give every young player the mentor I wish I had. 🦈",
    "Born in Italy, grew up playing scared. A mentor changed everything for me -- I went on to have trials with Inter, Parma, and Modena youth teams, played Serie A2 Futsal, came to the US with Morris Elite, coached at Juventus Academy. 26 years in the game. Now I help young players build the mental game I had to figure out the hard way.",
  ])

  if (matchMsg(msg, ['are you certified','your credentials','life coach','mindset coach','qualification','certified','ussf'])) return randomMsg([
    "Yes -- I am a Certified USSF State and National coach, and a Certified Growth Mindset and Life Coach. That combined with 26 years on the field as a player and coach. This program is built on real psychology AND real soccer experience. 🦈",
  ])

  if (matchMsg(msg, ['scared','playing scared','fear','i was scared','scared kid'])) return randomMsg([
    "You know what -- I was that kid too. Playing scared, afraid to make mistakes, freezing in big moments. A mentor believed in me and changed everything. I went on to become captain of multiple teams. That is exactly why I built DSM -- so no player has to figure this out alone. 🦈",
    "I was the scared kid. Seriously. I know exactly what that feels like. And I know exactly how to fix it -- because I lived it. That is not just a program. That is my story. 🦈",
  ])

  if (matchMsg(msg, ['guarantee','results','does it work','proof','does dsm work'])) return randomMsg([
    "We are so confident in this program it comes with a guarantee. If you do everything we ask -- complete 90% of daily tasks -- and do not see results, we will work with you 1-on-1 until you do. The program works. But YOU have to show up. 🦈",
    "The results speak for themselves. 90% of success is mental. Most programs focus only on technical. We train the full player -- mental toughness, belief, self talk, visualization, goal setting. Do the work and the results follow.",
  ])

  if (matchMsg(msg, ['90 days','how long','program length','duration','how many weeks'])) return randomMsg([
    "The core program is 90 days. That is enough time to build real habits, real mental toughness, and see real results on the field. After 90 days we recommend continuing with the group program to maintain and build on what you have achieved.",
    "90 days to transform your mental game. But honestly the habits you build -- ball mastery daily, action steps after every session, weekly check-ins -- those stay with you for life. 🦈",
  ])

  if (matchMsg(msg, ['what is dsm','about this program','how does this work','explain the program'])) return randomMsg([
    "DSM -- DiLorenzo Soccer Mindset -- is a mental performance program for youth soccer players. We train the mental game: Shark Mentality, Goldfish Mentality, Self Talk, Visualization, and Goal Setting. The mental game is what separates good players from great ones.",
  ])

  if (matchMsg(msg, ['do i need to submit','submit feedback','when do i submit','when to submit','do i have to submit'])) return randomMsg([
    "Yes! Submit your Action Steps feedback after EVERY practice and game. That goes straight to me and your coach. Then do your Ball Mastery daily. And once a week fill out your Weekly Check-In. Those three things are the foundation of the program. 🦈",
    "Three things you need to do: 1) Submit Action Steps after every practice and game. 2) Log your Ball Mastery every day. 3) Complete your Weekly Check-In once a week. Do those consistently and you will see real results.",
  ])

  if (matchMsg(msg, ['feedback','action steps','when to log','after practice','after game','submit after'])) return randomMsg([
    "Submit your Action Steps after EVERY practice and game -- no exceptions. Rate your conditioning, strength, technical, and mental performance. Log which tools you used: Shark, Goldfish, Self Talk. That data goes to your coach and helps us track your growth. 🦈",
    "After every single practice and game -- open the app, go to Action Steps, and submit your feedback. Your coach reviews it. It takes 2 minutes and it makes a huge difference.",
  ])

  if (matchMsg(msg, ['ball mastery','how often ball mastery','when ball mastery','daily ball','do ball mastery'])) return randomMsg([
    "Ball mastery is DAILY. Every single day. Even 15 minutes counts. Go to the Ball Mastery tab, pick your skills, log your reps. Consistency is the key -- a little every day beats a lot once a week.",
    "Every day. No days off on ball mastery. 15-20 minutes minimum. Open the Ball Mastery tab, work your skills, log it. Your weak foot especially -- that is where the biggest gains are hiding.",
  ])

  if (matchMsg(msg, ['weekly check','check in','checkin','how often check in','when check in'])) return randomMsg([
    "Weekly Check-In is once per week. Every week, reflect on your energy, confidence, sessions completed, biggest win, biggest challenge, and your goal for next week. It takes 5 minutes and it keeps you locked in on your growth. 📋",
    "Once a week -- that is your Weekly Check-In. Rate your energy and confidence, log your wins and challenges, set your goal for next week. Your coach reads every single one.",
  ])

  if (matchMsg(msg, ['what do i do','what should i do every day','daily routine','program routine','how to use the app'])) return randomMsg([
    "Here is your daily routine: Every day -- Ball Mastery. After every practice and game -- Action Steps feedback. Once a week -- Weekly Check-In. Plus whenever you need me, I am right here. That is the full program. 🦈",
    "Simple: Ball Mastery every day. Action Steps after every practice and game. Weekly Check-In once a week. Do those three things consistently and the mental and technical growth will follow. Trust the process.",
  ])

  if (matchMsg(msg, ['idk','not sure','confused'])) return randomMsg([
    "That is okay -- confusion means you are learning something new. Tell me exactly what you are working on and I will break it down.",
    "Let us figure it out together. Give me more details about what is going on and we will work through it.",
  ])

  if (matchMsg(msg, ['good','great','amazing','awesome','killed it','played well','won','victory','scored'])) return randomMsg([
    "Let us GOOO!! That is what I am talking about! Keep that energy going 🔥",
    "YESS!! Proud of you! What mental tool helped you most today?",
    "That is the work paying off!! Do not stop now -- build on it 🦈",
  ])

  if (matchMsg(msg, ['tired','exhausted','sore','hurt','pain','injured','sick'])) return randomMsg([
    "Listen to your body. Rest is part of training. Use the time to visualize and prep your mindset.",
    "Recovery is training. Sleep, nutrition, and rest are what allow the hard work to actually stick.",
  ])

  return randomMsg([
    "Process over outcome. What is one thing you can do TODAY to get better? 🦈",
    "Every challenge has a solution. Tell me exactly what is happening and we will break it down.",
    "Real talk -- the athletes who make it are not the most talented. They are the most consistent. Show up every day. Do the work. Trust the process. 💪",
  ])
}
// ── STANDALONE ACTION FORM (fixes mobile typing) ──
const StepCard = React.memo(({icon,title,desc,k,usedSteps,occasions,comments,onToggle,onOccasion,onComment}) => {
  const [occ, setOcc] = useState(occasions[k]||'')
  const [com, setCom] = useState(comments[k]||'')
  const used = usedSteps[k]
  // Use refs to call parent without triggering re-render
  const occRef = React.useRef(onOccasion)
  const comRef = React.useRef(onComment)
  React.useEffect(() => { occRef.current = onOccasion }, [onOccasion])
  React.useEffect(() => { comRef.current = onComment }, [onComment])
  return (
    <div style={{background:'#111',borderRadius:12,padding:16,marginBottom:8,border:`1px solid ${used?'#ff3d00':'#1e1e1e'}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:used?10:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:20}}>{icon}</div>
          <div>
            <div style={{fontSize:13,fontWeight:800}}>{title}</div>
            <div style={{fontSize:10,color:'#555'}}>{desc}</div>
          </div>
        </div>
        <button onClick={()=>onToggle(k)}
          style={{background:used?'#ff3d00':'#1e1e1e',border:'none',borderRadius:20,padding:'5px 10px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
          {used?'✓ USED':'MARK'}
        </button>
      </div>
      {used && (
        <div>
          <div style={{fontSize:9,letterSpacing:3,color:'#555',fontWeight:700,marginBottom:7}}>OCCASION</div>
          <input style={{width:'100%',background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:10,padding:'12px 14px',fontSize:14,color:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8}}
            placeholder="When did you use this?" value={occ}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            onChange={e=>{const v=e.target.value; setOcc(v); occRef.current(k,v)}} />
          <div style={{fontSize:9,letterSpacing:3,color:'#555',fontWeight:700,marginBottom:7}}>COMMENTS</div>
          <textarea style={{width:'100%',background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:10,padding:'12px 14px',fontSize:13,color:'#fff',fontFamily:'inherit',outline:'none',resize:'none',boxSizing:'border-box',height:55}}
            placeholder="How did it help?" value={com}
            onChange={e=>{const v=e.target.value; setCom(v); comRef.current(k,v)}} />
        </div>
      )}
    </div>
  )
})

function ActionForm({ user, playerName, onSubmit, initialSubmissions }) {
  const WEEKDAYS2 = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
  const [form, setForm] = useState({
    playerName: playerName || '',
    sessionType:'Practice',
    date: new Date().toISOString().split('T')[0],
    dayOfWeek: WEEKDAYS2[new Date().getDay()===0?6:new Date().getDay()-1],
    didSteps:'', usedSteps:{}, occasions:{}, comments:{},
    conditioning:7, strength:7, technical:7, mental:7,
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const handleToggle = useCallback((k) => setForm(p=>({...p,usedSteps:{...p.usedSteps,[k]:!p.usedSteps[k]}})), [])
  const handleOccasion = useCallback((k,v) => setForm(p=>({...p,occasions:{...p.occasions,[k]:v}})), [])
  const handleComment = useCallback((k,v) => setForm(p=>({...p,comments:{...p.comments,[k]:v}})), [])

  const handleSubmit = async () => {
    if(!form.didSteps) return alert('Did you do the action steps?')
    setSaving(true)
    try {
      await onSubmit({ ...form, playerName: playerName || form.playerName })
      setForm({ playerName: playerName||'', sessionType:'Practice', date:new Date().toISOString().split('T')[0], dayOfWeek:WEEKDAYS2[new Date().getDay()===0?6:new Date().getDay()-1], didSteps:'', usedSteps:{}, occasions:{}, comments:{}, conditioning:7, strength:7, technical:7, mental:7 })
    } catch(e) {
      alert('Something went wrong. Try again.')
    }
    setSaving(false)
  }

  const inp = {width:'100%',background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:10,padding:'12px 14px',fontSize:14,color:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}
  const lbl = {fontSize:9,letterSpacing:3,color:'#555',fontWeight:700,marginBottom:7,display:'block'}
  const btn = {background:'linear-gradient(135deg,#ff3d00,#ff6d00)',border:'none',borderRadius:10,padding:'14px 18px',fontSize:13,fontWeight:800,letterSpacing:2,color:'#fff',cursor:'pointer',width:'100%',fontFamily:'inherit',marginBottom:8}
  const card = {background:'#111',borderRadius:12,padding:16,marginBottom:10,border:'1px solid #1e1e1e'}
  const orange = {background:'linear-gradient(135deg,#ff3d00,#ff6d00)',borderRadius:12,padding:'18px 16px',marginBottom:12}

  return (
    <div style={{padding:'16px 20px 40px'}}>
      <div style={{fontSize:26,fontWeight:900,letterSpacing:2,marginBottom:2}}>ACTION STEPS</div>
      <div style={{fontSize:9,color:'#555',letterSpacing:3,fontWeight:700,marginBottom:12}}>AFTER EVERY PRACTICE & GAME</div>
      <div style={orange}>
        <span style={{...lbl,color:'rgba(255,255,255,0.6)'}}>⚠️ REQUIRED -- NO EXCEPTIONS</span>
        <div style={{fontSize:14,fontWeight:800,lineHeight:1.4}}>Fill this out after EVERY practice and game. It goes straight to Coach Valentino. 🦈</div>
      </div>
      <div style={card}>
        <span style={lbl}>PLAYER</span>
        <div style={{...inp, color:'#ff3d00', fontWeight:800, background:'#0d0d0d', cursor:'default', marginBottom:10}}>
          {playerName || '—'}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <div><span style={lbl}>SESSION</span>
            <select value={form.sessionType} onChange={e=>set('sessionType',e.target.value)}
              style={{background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:10,padding:'12px 14px',color:'#fff',fontFamily:'inherit',fontSize:14,outline:'none',width:'100%'}}>
              <option>Practice</option><option>Game</option>
            </select>
          </div>
          <div><span style={lbl}>DATE</span>
            <input type="date" style={inp} value={form.date} onChange={e=>set('date',e.target.value)} />
          </div>
        </div>
        <span style={lbl}>DAY</span>
        <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
          {WEEKDAYS2.map(d=>(
            <button key={d} onClick={()=>set('dayOfWeek',d)}
              style={{background:form.dayOfWeek===d?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'6px 10px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>
              {d.slice(0,3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div style={card}>
        <span style={lbl}>DID YOU DO THE ACTION STEPS?</span>
        <div style={{display:'flex',gap:8}}>
          {['Yes','No'].map(opt=>(
            <button key={opt} onClick={()=>set('didSteps',opt)}
              style={{flex:1,background:form.didSteps===opt?'#ff3d00':'#1e1e1e',border:'none',borderRadius:10,padding:12,fontSize:14,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>
              {opt==='Yes'?'✅ YES':'❌ NO'}
            </button>
          ))}
        </div>
      </div>
      <span style={lbl}>WHICH DID YOU USE?</span>
      {[
        {icon:"🦈",title:"SHARK MENTALITY",desc:"Taking risks, aggressive, fearless",k:"shark"},
        {icon:"🐠",title:"GOLDFISH MENTALITY",desc:"Short term memory for mistakes",k:"goldfish"},
        {icon:"💬",title:"POSITIVE SELF TALK",desc:"Control your inner voice",k:"selftalk"},
        {icon:"🔇",title:"TUNE OUT COACH YELLING",desc:"Stay focused under pressure",k:"tuneout"},
      ].map(s=>(
        <StepCard key={s.k} {...s}
          usedSteps={form.usedSteps}
          occasions={form.occasions}
          comments={form.comments}
          onToggle={handleToggle}
          onOccasion={handleOccasion}
          onComment={handleComment}
        />
      ))}
      <div style={{...card,opacity:0.4,marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontSize:20}}>👁️</div>
            <div><div style={{fontSize:13,fontWeight:800,color:'#555'}}>VISUALIZATION</div>
              <div style={{fontSize:10,color:'#444'}}>Unlocks at Lesson 5</div></div>
          </div>
          <div style={{background:'#1e1e1e',borderRadius:20,padding:'4px 10px',fontSize:9,fontWeight:800,color:'#555'}}>🔒 LOCKED</div>
        </div>
      </div>
      <div style={card}>
        <span style={lbl}>RATE MY PERFORMANCE (1-10)</span>
        {['conditioning','strength','technical','mental'].map(k=>(
          <div key={k} style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:12,color:'#aaa',textTransform:'capitalize'}}>{k}</span>
              <span style={{fontSize:14,fontWeight:900,color:'#ff3d00'}}>{form[k]}/10</span>
            </div>
            <input type="range" min="1" max="10" value={form[k]} onChange={e=>set(k,parseInt(e.target.value))}
              style={{accentColor:'#ff3d00',width:'100%'}} />
          </div>
        ))}
      </div>
      <button style={btn} onClick={handleSubmit} disabled={saving}>
        {saving?'SAVING...':'📤 SUBMIT'}
      </button>
      {initialSubmissions?.length > 0 && <>
        <span style={{...lbl,marginTop:16}}>PAST SUBMISSIONS</span>
        {initialSubmissions.slice(0,5).map((s,i)=>(
          <div key={i} style={card}>
            <div style={{fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2}}>{s.day_of_week}, {s.date} · {s.session_type}</div>
            <div style={{fontSize:14,fontWeight:800,marginTop:2}}>{s.player_name}</div>
          </div>
        ))}
      </>}
    </div>
  )
}

export default function Main({ user }) {
  const [tab, setTab] = useState('home')
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [streak, setStreak] = useState(0)
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState(HABITS_LIST.map(h => ({ label: h, days: [false,false,false,false,false,false,false] })))
  const [submissions, setSubmissions] = useState([])
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hey! I'm Coach Valentino 🔥 Ask me anything about mindset, match prep, or your training!" }])
  const [chatInput, setChatInput] = useState('')
  const chatInputRef = useRef('')
  const [chatLoading, setChatLoading] = useState(false)
  const [typingMsg, setTypingMsg] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [allAthletes, setAllAthletes] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [ballMastery, setBallMastery] = useState({})
  const [ballHistory, setBallHistory] = useState([])
  const [savingBall, setSavingBall] = useState(false)
  const [checkin, setCheckin] = useState(emptyCheckin)
  const [checkinHistory, setCheckinHistory] = useState([])
  const [checkinDone, setCheckinDone] = useState(false)
  const [savingCheckin, setSavingCheckin] = useState(false)
  const [allCheckins, setAllCheckins] = useState([])
  const [allBallMastery, setAllBallMastery] = useState([])
  const [athleteProfileTab, setAthleteProfileTab] = useState('overview')
  const [coachFilter, setCoachFilter] = useState('all')
  const [athleteProgramWeek, setAthleteProgramWeek] = useState(1)
  const [gameDayChecked, setGameDayChecked] = useState({})
  const [mistakes, setMistakes] = useState([])
  const [newMistake, setNewMistake] = useState({ situation:'', reset:'', tool:'' })
  const [map, setMap] = useState({ goal:'', focusArea:'', weeklyWin:'', adjustment:'', commitment:'' })
  const [mapSaved, setMapSaved] = useState(false)
  const [mentalTab, setMentalTab] = useState('microreps')
  const [sessionNotes, setSessionNotes] = useState([])
  const [newSessionNote, setNewSessionNote] = useState({ title:'', content:'', fathomLink:'', date: new Date().toISOString().split('T')[0] })
  const [coachNote, setCoachNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [athleteMessages, setAthleteMessages] = useState([])
  const [newCoachMsg, setNewCoachMsg] = useState('')
  const [athleteActionSteps, setAthleteActionSteps] = useState([])
  const [athleteCheckins, setAthleteCheckins] = useState([])
  const [athleteBallMastery, setAthleteBallMastery] = useState([])
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
  const [progressTab, setProgressTab] = useState('overview')
  const [savingChallenge, setSavingChallenge] = useState(false)
  const chatEnd = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  const currentWeek = getWeekKey()

  useEffect(() => { loadUserData() }, [user])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadAthleteProfile(athlete) {
    try {
    const [as, ci, bm, sn, msgs] = await Promise.all([
      // BUG FIX: was Promise.resolve({data:[]}) — action steps were never being fetched
      getActionSteps(athlete.id),
      supabase.from('weekly_checkins').select('*').eq('user_id', athlete.id).order('created_at', {ascending:false}).limit(20),
      supabase.from('ball_mastery').select('*').eq('user_id', athlete.id).order('created_at', {ascending:false}).limit(20),
      supabase.from('session_notes').select('*').eq('athlete_id', athlete.id).order('created_at', {ascending:false}).limit(20),
      supabase.from('coach_messages').select('*, profiles!coach_messages_sender_id_fkey(full_name, role)').or(`athlete_id.eq.${athlete.id}`).order('created_at', {ascending:true}).limit(50),
    ])
    setAthleteActionSteps(as.data || [])
    setAthleteCheckins(ci.data || [])
    setAthleteBallMastery(bm.data || [])
    setSessionNotes(sn.data || [])
    setAthleteMessages(msgs.data || [])
    setAthleteProfileTab('overview')
    } catch(err) { console.error('loadAthleteProfile error:', err) }
  }

  async function loadUserData() {
    try {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p) { console.error('No profile found for user'); return }
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
        // BUG FIX: was hardcoded to 0 — action steps were never counted in leaderboard scores
        const { count: asCount } = await supabase.from('action_steps').select('id', { count: 'exact' }).eq('user_id', a.id)
        const { count: ciCount } = await supabase.from('weekly_checkins').select('id', { count: 'exact' }).eq('user_id', a.id)
        const score = (a.streak||0)*3 + (bmCount||0)*2 + (asCount||0)*2 + (ciCount||0)*1
        return { ...a, bmCount: bmCount||0, asCount: asCount||0, ciCount: ciCount||0, score }
      }))
      setLeaderboard(enriched.sort((a,b) => b.score - a.score))
    }

    // Load mistake resets
    const { data: mr } = await supabase.from('mistake_resets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (mr) setMistakes(mr)

    // Load MAP
    const { data: mapData } = await supabase.from('mindset_map').select('*').eq('user_id', user.id).eq('week', getWeekKey()).single()
    if (mapData) { setMap({ goal: mapData.goal||'', focusArea: mapData.focus_area||'', weeklyWin: mapData.weekly_win||'', adjustment: mapData.adjustment||'', commitment: mapData.commitment||'' }); setMapSaved(true) }

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
    } catch(err) { console.error('loadUserData error:', err) }
  }

  const toggleHabit = async (hi, di) => {
    const updated = habits.map((h, i) => i === hi ? { ...h, days: h.days.map((d, j) => j === di ? !d : d) } : h)
    setHabits(updated)
    await saveHabits(user.id, updated)
  }

  const setCI = (k, v) => setCheckin(p => ({ ...p, [k]: v }))

  const completedHabits = habits.reduce((a, h) => a + h.days.filter(Boolean).length, 0)
  const totalHabits = habits.length * 7
  const pct = Math.round((completedHabits / totalHabits) * 100)
  const todayBMLogged = ballHistory.some(b => b.date === today)
  const todayActionLogged = submissions.some(s => s.date === today)
  const isCoach = profile?.role === 'coach'
  const isAdmin = user?.email === 'valentino@dilorenzosoccermindset.com' || profile?.is_admin === true
  const myName = profile?.full_name || user?.email
  const isEliteLocked = profile?.access_level !== 'paid' && profile?.access_level !== 'mentoring_elite'

  const handleLogDay = async () => {
    const { streak: ns } = await logDay(user.id)
    setStreak(ns || streak + 1)
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
    setSavingCheckin(true)
    // BUG FIX: Added onConflict so upsert knows to match on user_id+week
    // NOTE FOR DEVELOPER: Ensure weekly_checkins table has a UNIQUE constraint on (user_id, week)
    const { error } = await supabase.from('weekly_checkins').upsert([{
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
      smart_goal: checkin.smartGoal,
      goal_progress: checkin.goalProgress,
      did_visualization: checkin.didVisualization,
      visualization_notes: checkin.visualizationNotes,
      did_morning_routine: checkin.didMorningRoutine,
      morning_routine_notes: checkin.morningRoutineNotes,
    }], { onConflict: 'user_id,week' })
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
    const msg = msgOverride || (chatInputRef.current?.value || chatInput).trim()
    if (!msg) return
    if (chatInputRef.current) chatInputRef.current.value = ''
    setChatInput('')
    setMessages(p => [...p, { role: 'user', content: msg }])
    setChatLoading(true)
    setTimeout(() => {
      const reply = getCoachVResponse(msg)
      setChatLoading(false)
      // Word by word typing effect
      const words = reply.split(' ')
      let i = 0
      setTypingMsg('')
      const interval = setInterval(() => {
        i++
        setTypingMsg(words.slice(0, i).join(' '))
        if (i >= words.length) {
          clearInterval(interval)
          setMessages(p => [...p, { role: 'assistant', content: reply }])
          setTypingMsg('')
          speakText(reply)
        }
      }, 60)
    }, 600)
  }

  // ── REPORT DOWNLOAD ──
  const downloadReport = async (athleteData, actionSteps, checkins, ballMasteryData, forCoach=false) => {
    const name = athleteData?.full_name || athleteData?.email || 'Athlete'
    const today = new Date().toLocaleDateString()

    // ── EXCEL ──
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
      const wb = XLSX.utils.book_new()

      // Sheet 1: All Sessions
      const sessionRows = [['Date','Day','Session','Did Steps','Shark','Goldfish','Self Talk','Tune Out','Conditioning','Strength','Technical','Mental']]
      actionSteps.forEach(s => {
        sessionRows.push([s.date, s.day_of_week, s.session_type, s.did_action_steps,
          s.shark_used?'✅':'', s.goldfish_used?'✅':'', s.selftalk_used?'✅':'', s.tuneout_used?'✅':'',
          s.conditioning, s.strength, s.technical, s.mental])
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sessionRows), 'All Sessions')

      // Sheet 2: Weekly Summary
      const weekRows = [['Week','Energy','Confidence','Sessions','Biggest Win','Biggest Challenge']]
      checkins.forEach(c => {
        weekRows.push([c.week, c.energy_level, c.confidence_level, c.sessions_completed, c.biggest_win, c.biggest_challenge])
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(weekRows), 'Weekly Check-Ins')

      // Sheet 3: Mental Tools Stats
      const tools = ['shark','goldfish','selftalk','tuneout']
      const toolRows = [['Tool','Times Used','Usage %','Occasions']]
      tools.forEach(t => {
        const used = actionSteps.filter(s=>s[t+'_used']).length
        const pct = actionSteps.length ? Math.round((used/actionSteps.length)*100) : 0
        const occasions = actionSteps.filter(s=>s[t+'_used']&&s[t+'_occasion']).map(s=>s[t+'_occasion']).join(' | ')
        toolRows.push([t.charAt(0).toUpperCase()+t.slice(1)+' Mentality', used, pct+'%', occasions])
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toolRows), 'Mental Tools')

      // Sheet 4: Performance Over Time
      const perfRows = [['Date','Conditioning','Strength','Technical','Mental','Average']]
      actionSteps.forEach(s => {
        const avg = ((s.conditioning+s.strength+s.technical+s.mental)/4).toFixed(1)
        perfRows.push([s.date, s.conditioning, s.strength, s.technical, s.mental, avg])
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perfRows), 'Performance Ratings')

      // Sheet 5: Ball Mastery
      if(ballMasteryData?.length) {
        const bmRows = [['Date','Skills Practiced','Total Reps','Notes']]
        ballMasteryData.forEach(b => bmRows.push([b.date, b.total_skills, b.total_reps, b.notes]))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bmRows), 'Ball Mastery')
      }

      XLSX.writeFile(wb, `DSM-Progress-${name.replace(/ /g,'-')}-${today}.xlsx`)
    } catch(e) { console.error('Excel error:', e) }

    // ── PDF ──
    try {
      const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      const doc = new jsPDF()
      const orange = [255, 61, 0]
      const orangeLight = [255, 109, 0]
      const white = [255, 255, 255]
      const gray = [150, 150, 150]
      const darkGray = [80, 80, 80]
      const dark = [20, 20, 20]
      const cardBg = [28, 28, 28]

      const pageW = 210, pageH = 297
      let y = 0
      let pageNum = 1

      function newPage() {
        doc.addPage()
        pageNum++
        // dark background
        doc.setFillColor(...dark)
        doc.rect(0, 0, pageW, pageH, 'F')
        // top bar
        doc.setFillColor(...orange)
        doc.rect(0, 0, pageW, 10, 'F')
        doc.setTextColor(...white)
        doc.setFontSize(6)
        doc.setFont('helvetica','bold')
        doc.text('DI LORENZO SOCCER MINDSET — PROGRESS REPORT', 14, 7)
        doc.text(`${name.toUpperCase()} | Page ${pageNum}`, pageW-14, 7, { align:'right' })
        y = 18
      }

      function checkY(needed) {
        if (y + needed > pageH - 14) newPage()
      }

      function sectionHeader(title) {
        checkY(14)
        doc.setFillColor(...orange)
        doc.rect(14, y-1, pageW-28, 9, 'F')
        doc.setTextColor(...white)
        doc.setFont('helvetica','bold')
        doc.setFontSize(9)
        doc.text(title, 17, y+5)
        y += 13
      }

      function statBox(x, bY, w, h, label, val, color=[255,61,0]) {
        doc.setFillColor(...cardBg)
        doc.rect(x, bY, w, h, 'F')
        doc.setTextColor(...color)
        doc.setFont('helvetica','bold')
        doc.setFontSize(16)
        doc.text(String(val), x+w/2, bY+h-7, { align:'center' })
        doc.setTextColor(...gray)
        doc.setFontSize(5.5)
        doc.text(label, x+w/2, bY+h-2, { align:'center' })
      }

      // ── COVER PAGE ──
      doc.setFillColor(...dark)
      doc.rect(0, 0, pageW, pageH, 'F')
      doc.setFillColor(...orange)
      doc.rect(0, 0, pageW, 40, 'F')
      doc.setTextColor(...white)
      doc.setFont('helvetica','bold')
      doc.setFontSize(22)
      doc.text('DI LORENZO SOCCER MINDSET', pageW/2, 16, { align:'center' })
      doc.setFontSize(10)
      doc.setTextColor('rgba(255,255,255,0.8)')
      doc.text('ATHLETE PROGRESS REPORT', pageW/2, 26, { align:'center' })
      doc.setFontSize(7)
      doc.text(`Generated: ${today}`, pageW/2, 34, { align:'center' })

      y = 56
      doc.setTextColor(...orange)
      doc.setFontSize(24)
      doc.setFont('helvetica','bold')
      doc.text(name.toUpperCase(), pageW/2, y, { align:'center' }); y += 12

      // Summary stat boxes
      const boxW = 40, boxH = 22, boxGap = 4
      const totalBoxW = 4*boxW + 3*boxGap
      const boxStartX = (pageW - totalBoxW) / 2
      const boxes = [
        ['ACTION STEPS', actionSteps.length],
        ['CHECK-INS', checkins.length],
        ['BALL SESSIONS', ballMasteryData?.length || 0],
        ['DAY STREAK', forCoach ? '--' : (athleteData?.streak || 0)],
      ]
      boxes.forEach((b,i) => statBox(boxStartX+i*(boxW+boxGap), y, boxW, boxH, b[0], b[1]))
      y += boxH + 10

      // Divider
      doc.setDrawColor(...orange)
      doc.setLineWidth(0.5)
      doc.line(14, y, pageW-14, y); y += 8

      // Performance averages (from action steps)
      if (actionSteps.length > 0) {
        doc.setTextColor(...gray)
        doc.setFont('helvetica','bold')
        doc.setFontSize(7)
        doc.text('AVERAGE PERFORMANCE RATINGS', pageW/2, y, { align:'center' }); y += 5
        const ratingKeys = ['conditioning','strength','technical','mental']
        const ratingLabels = ['CONDITIONING','STRENGTH','TECHNICAL','MENTAL']
        const rbW = 38, rbH = 20, rbGap = 4
        const rbTotal = 4*rbW + 3*rbGap
        const rbX = (pageW - rbTotal) / 2
        ratingKeys.forEach((k,i) => {
          const avg = (actionSteps.reduce((a,s)=>a+(s[k]||0),0)/actionSteps.length).toFixed(1)
          statBox(rbX+i*(rbW+rbGap), y, rbW, rbH, ratingLabels[i], avg, [255,140,0])
        })
        y += rbH + 8
      }

      // Mental tools quick view
      if (actionSteps.length > 0) {
        doc.setDrawColor(...cardBg)
        doc.setLineWidth(0.3)
        doc.line(14, y, pageW-14, y); y += 6
        doc.setTextColor(...gray)
        doc.setFont('helvetica','bold')
        doc.setFontSize(7)
        doc.text('MENTAL TOOLS USAGE', pageW/2, y, { align:'center' }); y += 6
        const tools = [['shark','Shark Mentality'],['goldfish','Goldfish Mentality'],['selftalk','Self Talk'],['tuneout','Tune Out']]
        tools.forEach(([k,lbl]) => {
          const cnt = actionSteps.filter(s=>s[k+'_used']).length
          const pct = Math.round((cnt/actionSteps.length)*100)
          doc.setTextColor(...white)
          doc.setFont('helvetica','normal')
          doc.setFontSize(7)
          doc.text(lbl, 30, y+1)
          doc.text(`${cnt}x (${pct}%)`, 95, y+1)
          doc.setFillColor(...cardBg)
          doc.rect(115, y-3, 65, 5, 'F')
          doc.setFillColor(...orange)
          doc.rect(115, y-3, Math.max(1, pct*0.65), 5, 'F')
          y += 8
        })
      }

      // Footer
      doc.setFillColor(...orange)
      doc.rect(0, pageH-12, pageW, 12, 'F')
      doc.setTextColor(...white)
      doc.setFontSize(6)
      doc.setFont('helvetica','normal')
      doc.text('DiLorenzo Soccer Mindset | dsm-app-beta.vercel.app', 14, pageH-5)
      doc.text(`Coach Valentino Di Lorenzo`, pageW-14, pageH-5, { align:'right' })

      // ── PAGE 2: ACTION STEPS HISTORY ──
      if (actionSteps.length > 0) {
        newPage()
        sectionHeader(`✅ ACTION STEPS HISTORY (${actionSteps.length} SESSIONS)`)

        // Table header
        checkY(10)
        doc.setFillColor(40, 40, 40)
        doc.rect(14, y-2, pageW-28, 8, 'F')
        doc.setTextColor(...orange)
        doc.setFont('helvetica','bold')
        doc.setFontSize(6)
        doc.text('DATE', 17, y+3)
        doc.text('SESSION', 45, y+3)
        doc.text('STEPS', 80, y+3)
        doc.text('COND', 97, y+3)
        doc.text('STR', 110, y+3)
        doc.text('TECH', 121, y+3)
        doc.text('MNT', 133, y+3)
        doc.text('AVG', 145, y+3)
        doc.text('MENTAL TOOLS', 157, y+3)
        y += 10

        actionSteps.forEach((s,i) => {
          checkY(9)
          if (i%2===0) { doc.setFillColor(18,18,18); doc.rect(14, y-2, pageW-28, 8, 'F') }
          const avg = (((s.conditioning||0)+(s.strength||0)+(s.technical||0)+(s.mental||0))/4).toFixed(1)
          const tools = [s.shark_used?'🦈':'',s.goldfish_used?'🐠':'',s.selftalk_used?'💬':'',s.tuneout_used?'🔇':''].filter(Boolean).join(' ')
          doc.setTextColor(...white)
          doc.setFont('helvetica','normal')
          doc.setFontSize(6)
          doc.text(s.date||'', 17, y+3)
          doc.text((s.session_type||'').substring(0,14), 45, y+3)
          doc.setTextColor(s.did_action_steps==='Yes'?[100,220,100]:[220,80,80])
          doc.text(s.did_action_steps==='Yes'?'YES':'NO', 80, y+3)
          doc.setTextColor(...white)
          doc.text(String(s.conditioning||'-'), 99, y+3)
          doc.text(String(s.strength||'-'), 112, y+3)
          doc.text(String(s.technical||'-'), 123, y+3)
          doc.text(String(s.mental||'-'), 135, y+3)
          doc.setTextColor(...orangeLight)
          doc.text(avg, 147, y+3)
          doc.setTextColor(...gray)
          doc.setFontSize(5.5)
          doc.text(tools, 157, y+3)
          y += 8
        })

        // Comments section
        const withComments = actionSteps.filter(s=>s.shark_comments||s.goldfish_comments||s.selftalk_comments||s.tuneout_comments)
        if (withComments.length > 0) {
          checkY(16)
          sectionHeader('SESSION NOTES & COMMENTS')
          withComments.slice(0,8).forEach(s => {
            checkY(20)
            doc.setFillColor(...cardBg)
            doc.rect(14, y, pageW-28, 1, 'F')
            doc.setTextColor(...orange)
            doc.setFont('helvetica','bold')
            doc.setFontSize(6.5)
            doc.text(`${s.date} · ${s.session_type}`, 17, y+5)
            y += 8
            const comments = [
              s.shark_comments?`Shark: ${s.shark_comments}`:'',
              s.goldfish_comments?`Goldfish: ${s.goldfish_comments}`:'',
              s.selftalk_comments?`Self Talk: ${s.selftalk_comments}`:'',
              s.tuneout_comments?`Tune Out: ${s.tuneout_comments}`:'',
            ].filter(Boolean)
            comments.forEach(c => {
              checkY(7)
              doc.setTextColor(...gray)
              doc.setFont('helvetica','normal')
              doc.setFontSize(6)
              const lines = doc.splitTextToSize(c, pageW-35)
              doc.text(lines, 20, y)
              y += lines.length * 5 + 2
            })
          })
        }
      }

      // ── PAGE 3: WEEKLY CHECK-INS ──
      if (checkins.length > 0) {
        newPage()
        sectionHeader(`📋 WEEKLY CHECK-IN HISTORY (${checkins.length} CHECK-INS)`)

        // Averages row
        const avgE = (checkins.reduce((a,c)=>a+c.energy_level,0)/checkins.length).toFixed(1)
        const avgC = (checkins.reduce((a,c)=>a+c.confidence_level,0)/checkins.length).toFixed(1)
        const avgS = (checkins.reduce((a,c)=>a+c.sessions_completed,0)/checkins.length).toFixed(1)
        const smW = (pageW-28)/3-3
        ;[[14,'ENERGY AVG',avgE],[14+smW+3,'CONFIDENCE AVG',avgC],[14+2*(smW+3),'SESSIONS AVG',avgS]].forEach(([x,lbl,val]) => {
          statBox(x, y, smW, 18, lbl, val)
        })
        y += 24

        checkins.forEach((c,i) => {
          checkY(30)
          doc.setFillColor(...cardBg)
          doc.rect(14, y, pageW-28, 28, 'F')
          // Week label + ratings
          doc.setTextColor(...orange)
          doc.setFont('helvetica','bold')
          doc.setFontSize(7.5)
          doc.text(c.week||'', 18, y+7)
          const ratings = [[c.energy_level,'⚡ ENERGY'],[c.confidence_level,'💪 CONF'],[c.sessions_completed,'🏃 SESSIONS']]
          ratings.forEach(([val,lbl],j)=>{
            doc.setTextColor(...orange)
            doc.setFontSize(9)
            doc.setFont('helvetica','bold')
            doc.text(String(val||''), 80+j*35, y+7)
            doc.setTextColor(...gray)
            doc.setFontSize(5.5)
            doc.text(lbl, 80+j*35, y+12)
          })
          let cy = y + 16
          if (c.biggest_win) {
            doc.setTextColor(...white)
            doc.setFontSize(6)
            doc.setFont('helvetica','bold')
            doc.text('WIN:', 18, cy)
            doc.setFont('helvetica','normal')
            doc.setTextColor(...gray)
            const lines = doc.splitTextToSize(c.biggest_win, pageW-50)
            doc.text(lines[0], 30, cy)
            cy += 5
          }
          if (c.biggest_challenge) {
            doc.setTextColor(...white)
            doc.setFontSize(6)
            doc.setFont('helvetica','bold')
            doc.text('CHALLENGE:', 18, cy)
            doc.setFont('helvetica','normal')
            doc.setTextColor(...gray)
            const lines = doc.splitTextToSize(c.biggest_challenge, pageW-55)
            doc.text(lines[0], 42, cy)
            cy += 5
          }
          if (c.goal_next_week) {
            doc.setTextColor(...orangeLight)
            doc.setFontSize(6)
            doc.setFont('helvetica','bold')
            doc.text(`GOAL: ${c.goal_next_week.substring(0,60)}`, 18, cy)
          }
          y += 32
        })
      }

      // ── PAGE 4: BALL MASTERY ──
      if (ballMasteryData?.length > 0) {
        newPage()
        sectionHeader(`⚽ BALL MASTERY HISTORY (${ballMasteryData.length} SESSIONS)`)

        const totalReps = ballMasteryData.reduce((a,b)=>a+(b.total_reps||0),0)
        statBox(14, y, 55, 18, 'TOTAL SESSIONS', ballMasteryData.length)
        statBox(73, y, 55, 18, 'TOTAL REPS', totalReps)
        statBox(132, y, 55, 18, 'AVG REPS/SESSION', Math.round(totalReps/ballMasteryData.length))
        y += 24

        // Table
        doc.setFillColor(40,40,40)
        doc.rect(14, y-2, pageW-28, 8, 'F')
        doc.setTextColor(...orange)
        doc.setFont('helvetica','bold')
        doc.setFontSize(6)
        doc.text('DATE', 17, y+3)
        doc.text('SKILLS', 55, y+3)
        doc.text('REPS', 95, y+3)
        doc.text('NOTES', 115, y+3)
        y += 10

        ballMasteryData.forEach((b,i) => {
          checkY(9)
          if (i%2===0) { doc.setFillColor(18,18,18); doc.rect(14, y-2, pageW-28, 8, 'F') }
          doc.setTextColor(...white)
          doc.setFont('helvetica','normal')
          doc.setFontSize(6)
          doc.text(b.date||'', 17, y+3)
          doc.text(String(b.total_skills||0), 65, y+3)
          doc.setTextColor(...orange)
          doc.text(String(b.total_reps||0), 97, y+3)
          doc.setTextColor(...gray)
          doc.text((b.notes||'').substring(0,50), 115, y+3)
          y += 8
        })
      }

      // Footer on last page
      doc.setFillColor(...orange)
      doc.rect(0, pageH-12, pageW, 12, 'F')
      doc.setTextColor(...white)
      doc.setFontSize(6)
      doc.text('DiLorenzo Soccer Mindset | dsm-app-beta.vercel.app', 14, pageH-5)
      doc.text(`${name} | ${today}`, pageW-14, pageH-5, { align:'right' })

      doc.save(`DSM-ProgressReport-${name.replace(/ /g,'-')}-${today}.pdf`)
    } catch(e) { console.error('PDF error:', e) }
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
            JOIN NOW -- FANBASIS 🔥
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
    { id: 'bot', icon: '🤖', label: 'COACH V' },
    { id: 'progress', icon: '📈', label: 'PROGRESS' },
    ...(isCoach ? [{ id: 'dashboard', icon: '🏆', label: 'COACH' }] : []),
  ]

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
        input, textarea, select { -webkit-user-select: text; user-select: text; }
        input:focus, textarea:focus { outline: none; -webkit-tap-highlight-color: transparent; }
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
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>-- Coach Valentino</div>
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
            {[
              ['🤖','COACH VALENTINO','AI mindset coach','bot'],
              ['📋','WEEKLY CHECK-IN','Reflect & lock in','weekly'],
              ['📊','HABIT TRACKER','Track your streak','tracker'],
              ['🧠','MENTAL TOOLS','Train your mind','mental'],
              ['👥','COMMUNITY','Connect with team','community'],
              ['🏆','COMPETE','Challenges','compete'],
              ['👨‍👩‍👧','PARENTS','Best practices guide','parents'],
              ['🎥','COURSE','Video lessons','course'],
            ].map(([icon,label,sub,t]) => (
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
            {profile.assigned_coach && !isCoach && <div style={{ fontSize:11,color:'#ff3d00',fontWeight:800,marginTop:4 }}>👤 My Coach: {profile.assigned_coach}</div>}
          </div>}
        </div>
      )}

      {/* ── ACTION STEPS ── */}
      {tab === 'actions' && (
        <div className="fade">
          <ActionForm user={user} playerName={profile?.full_name || user?.email} initialSubmissions={submissions} onSubmit={async (formData) => {
            const { data, error } = await submitActionSteps(formData, user.id)
            if (error) {
              alert('Error saving: ' + (error.message || JSON.stringify(error)))
              return
            }
            const { data: updated } = await getActionSteps(user.id)
            setSubmissions(updated || [])
            alert('✅ Action steps submitted to Coach Valentino!')
            setTab('home')
          }} />
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
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Tap each skill you trained. Set your reps. Be honest -- this is YOUR progress. 🦈</div>
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
                value={ballMastery.notes||''} onChange={e => setBallMastery(p => ({ ...p,notes:e.target.value }))} />
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
          <div style={C.sub}>{currentWeek} -- REFLECT & LOCK IN</div>
          {checkinDone ? (
            <div>
              <div style={{ ...C.card,borderColor:'#1a4a1a',textAlign:'center',padding:36,marginBottom:16 }}>
                <div style={{ fontSize:44,marginBottom:10 }}>✅</div>
                <div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>THIS WEEK SUBMITTED!</div>
                <div style={{ fontSize:13,color:'#555',marginBottom:16 }}>Coach Valentino has your check-in. See you next week. 🔥</div>
                <button onClick={()=>setCheckinDone(false)}
                  style={{ background:'#1e1e1e',border:'1px solid #333',borderRadius:10,padding:'10px 18px',fontSize:11,fontWeight:800,color:'#aaa',cursor:'pointer',fontFamily:'inherit',letterSpacing:1 }}>
                  ✏️ EDIT / RE-SUBMIT THIS WEEK
                </button>
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
              <span style={C.olbl}>WEEK: {currentWeek} · PROGRAM WEEK {profile?.program_week||1}</span>
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Time to reflect. Be real with yourself -- that's how you grow. 🦈</div>
            </div>

            {/* ALWAYS VISIBLE: Confidence + Energy + Sessions */}
            <div style={C.card}>
              <span style={C.lbl}>RATE YOUR WEEK</span>
              {[['energyLevel','⚡ Energy Level',1,10],['confidenceLevel','💪 Confidence 1-10',1,10],['sessionsCompleted','🏃 Sessions Completed',0,14]].map(([k,l,min,max])=>(
                <div key={k} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                    <span style={{ fontSize:12,color:'#aaa' }}>{l}</span>
                    <span style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{checkin[k]}{k==='sessionsCompleted'?'':'/10'}</span>
                  </div>
                  <input type="range" min={min} max={max} value={checkin[k]} onChange={e=>setCI(k,parseInt(e.target.value))} style={{ accentColor:'#ff3d00',width:'100%' }} />
                </div>
              ))}
            </div>

            {/* ALWAYS VISIBLE: Wins + Challenge */}
            <div style={C.card}>
              <span style={C.lbl}>🏆 BIGGEST WIN THIS WEEK *</span>
              <textarea style={{ ...C.ta,height:65,marginBottom:12 }} placeholder="What are you most proud of?" value={checkin.biggestWin} onChange={e=>setCI('biggestWin',e.target.value)} />
              <span style={C.lbl}>💥 BIGGEST CHALLENGE</span>
              <textarea style={{ ...C.ta,height:65 }} placeholder="What was hardest this week?" value={checkin.biggestChallenge} onChange={e=>setCI('biggestChallenge',e.target.value)} />
            </div>

            {/* ALWAYS VISIBLE: Action Steps */}
            <div style={C.card}>
              <span style={C.lbl}>✅ ACTION STEPS THIS WEEK</span>
              <div style={{ fontSize:12,color:'#555',marginBottom:10 }}>How many times did you use the DSM tools?</div>
              {[['sharkMoment','🦈 SHARK MOMENT','When did you take a fearless risk?'],['goldfishMoment','🐠 GOLDFISH MOMENT','When did you forget a mistake fast?'],['selfTalkMoment','💬 SELF TALK MOMENT','When did you control your inner voice?']].map(([k,l,p])=>(
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9,color:'#ff3d00',letterSpacing:2,fontWeight:700,marginBottom:5 }}>{l}</div>
                  <textarea style={{ ...C.ta,height:55 }} placeholder={p} value={checkin[k]} onChange={e=>setCI(k,e.target.value)} />
                </div>
              ))}
            </div>

            {/* ALWAYS VISIBLE: Ball Mastery */}
            <div style={C.card}>
              <span style={C.lbl}>⚽ BALL MASTERY THIS WEEK</span>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                <span style={{ fontSize:12,color:'#aaa' }}>Sessions completed</span>
                <span style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{checkin.sessionsCompleted}</span>
              </div>
              <div style={{ fontSize:11,color:'#555',marginBottom:8 }}>Log your sessions in the Ball Mastery tab after each training.</div>
              <div style={{ display:'flex',gap:6 }}>
                {[0,1,2,3,4,5,6,7].map(n=>(
                  <button key={n} onClick={()=>setCI('sessionsCompleted',n)}
                    style={{ flex:1,background:checkin.sessionsCompleted===n?'#ff3d00':'#1e1e1e',border:'none',borderRadius:6,padding:'8px 4px',fontSize:11,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* WEEK 4+: Goal Setting */}
            {(profile?.program_week||1) >= 4 ? (
              <div style={{ ...C.card,borderColor:'#ff6d00' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                  <div style={{ background:'#ff6d00',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#fff' }}>WEEK 4+</div>
                  <span style={C.lbl}>🎯 GOAL SETTING</span>
                </div>
                <span style={C.lbl}>MY SMART GOAL THIS WEEK</span>
                <textarea style={{ ...C.ta,height:65,marginBottom:10 }} placeholder="Specific, Measurable, Achievable goal for this week..." value={checkin.smartGoal} onChange={e=>setCI('smartGoal',e.target.value)} />
                <span style={C.lbl}>PROGRESS ON LAST WEEK'S GOAL</span>
                <textarea style={{ ...C.ta,height:55,marginBottom:10 }} placeholder="How did you do on last week's goal?" value={checkin.goalProgress} onChange={e=>setCI('goalProgress',e.target.value)} />
                <span style={C.lbl}>🎯 GOAL FOR NEXT WEEK</span>
                <textarea style={{ ...C.ta,height:65 }} placeholder="What's your #1 mental focus next week?" value={checkin.goalNextWeek} onChange={e=>setCI('goalNextWeek',e.target.value)} />
              </div>
            ) : (
              <div style={{ ...C.card,opacity:0.4 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ background:'#333',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#fff' }}>WEEK 4</div>
                  <span style={{ fontSize:12,fontWeight:800,color:'#555' }}>🎯 Goal Setting -- Unlocks at Week 4</span>
                  <div style={{ marginLeft:'auto',fontSize:12 }}>🔒</div>
                </div>
              </div>
            )}

            {/* WEEK 5+: Visualization + Morning Routine */}
            {(profile?.program_week||1) >= 5 ? (
              <div style={{ ...C.card,borderColor:'#ffaa00' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
                  <div style={{ background:'#ffaa00',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#000' }}>WEEK 5+</div>
                  <span style={C.lbl}>👁️ VISUALIZATION & MORNING ROUTINE</span>
                </div>

                {/* Visualization */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontSize:13,fontWeight:800 }}>👁️ Did you visualize this week?</span>
                    <div style={{ display:'flex',gap:6 }}>
                      {[['Yes',true],['No',false]].map(([l,v])=>(
                        <button key={l} onClick={()=>setCI('didVisualization',v)}
                          style={{ background:checkin.didVisualization===v?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {checkin.didVisualization && (
                    <textarea style={{ ...C.ta,height:55 }} placeholder="What did you visualize? How did it feel?"
                      value={checkin.visualizationNotes} onChange={e=>setCI('visualizationNotes',e.target.value)} />
                  )}
                </div>

                {/* Morning Routine */}
                <div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontSize:13,fontWeight:800 }}>🌅 Did you do your morning routine?</span>
                    <div style={{ display:'flex',gap:6 }}>
                      {[['Yes',true],['No',false]].map(([l,v])=>(
                        <button key={l} onClick={()=>setCI('didMorningRoutine',v)}
                          style={{ background:checkin.didMorningRoutine===v?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {checkin.didMorningRoutine && (
                    <textarea style={{ ...C.ta,height:55 }} placeholder="Describe your routine..."
                      value={checkin.morningRoutineNotes} onChange={e=>setCI('morningRoutineNotes',e.target.value)} />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ ...C.card,opacity:0.4 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ background:'#333',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#fff' }}>WEEK 5</div>
                  <span style={{ fontSize:12,fontWeight:800,color:'#555' }}>👁️ Visualization & Morning Routine -- Unlocks at Week 5</span>
                  <div style={{ marginLeft:'auto',fontSize:12 }}>🔒</div>
                </div>
              </div>
            )}

            {/* ALWAYS: Message to coach */}
            <div style={C.card}>
              <span style={C.lbl}>💬 MESSAGE TO COACH VALENTINO</span>
              <textarea style={{ ...C.ta,height:65 }} placeholder="Anything you want Coach Valentino to know?" value={checkin.messageToCoach} onChange={e=>setCI('messageToCoach',e.target.value)} />
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

          {/* PDF DOWNLOAD */}
          {(submissions.length > 0 || checkinHistory.length > 0) && (
            <button onClick={()=>downloadReport(profile, submissions, checkinHistory, ballHistory)}
              style={{ ...C.btn, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              📥 SAVE PROGRESS REPORT PDF
            </button>
          )}

          {/* SECTION TABS */}
          {(() => {
            const hasAny = submissions.length > 0 || checkinHistory.length > 0 || ballHistory.length > 0
            if (!hasAny) return (
              <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                <div style={{ fontSize:44, marginBottom:12 }}>📈</div>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO DATA YET</div>
                <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>Start logging action steps, weekly check-ins, and ball mastery to see your full progress here. 🦈</div>
              </div>
            )

            const progTabs = [
              { id:'overview', label:'📊 Overview' },
              { id:'actions', label:'✅ Actions' },
              { id:'checkins', label:'📋 Check-Ins' },
              { id:'ball', label:'⚽ Ball' },
            ]

            return (
              <>
                {/* Tab selector */}
                <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto' }}>
                  {progTabs.map(t=>(
                    <button key={t.id} onClick={()=>setProgressTab(t.id)}
                      style={{ flexShrink:0, background:progressTab===t.id?'#ff3d00':'#1e1e1e', border:'none', borderRadius:10, padding:'8px 12px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── OVERVIEW TAB ── */}
                {progressTab==='overview' && <>
                  {/* Stats summary */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                    {[
                      ['✅', submissions.length, 'ACTIONS'],
                      ['📋', checkinHistory.length, 'CHECK-INS'],
                      ['⚽', ballHistory.length, 'BALL SESSIONS'],
                    ].map(([icon,val,lbl])=>(
                      <div key={lbl} style={{ ...C.card, textAlign:'center', padding:12 }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                        <div style={{ fontSize:26, fontWeight:900, color:'#ff3d00' }}>{val}</div>
                        <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Performance trend from action steps */}
                  {submissions.length > 0 && (()=>{
                    const avg = key => (submissions.reduce((a,s)=>a+(s[key]||0),0)/submissions.length).toFixed(1)
                    return (<>
                      <span style={C.lbl}>AVG PERFORMANCE RATINGS</span>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:14 }}>
                        {[['conditioning','💪','COND'],['strength','🏋️','STR'],['technical','⚽','TECH'],['mental','🧠','MNT']].map(([k,icon,lbl])=>(
                          <div key={k} style={{ ...C.card, textAlign:'center', padding:10 }}>
                            <div style={{ fontSize:16 }}>{icon}</div>
                            <div style={{ fontSize:22, fontWeight:900, color:'#ff3d00' }}>{avg(k)}</div>
                            <div style={{ fontSize:7, color:'#555', fontWeight:700, letterSpacing:1 }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </>)
                  })()}

                  {/* Energy & Confidence chart */}
                  {checkinHistory.length > 0 && <>
                    <span style={C.lbl}>ENERGY & CONFIDENCE OVER TIME</span>
                    <div style={{ ...C.card, padding:16, marginBottom:14 }}>
                      <div style={{ display:'flex', gap:14, marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:8,height:8,borderRadius:'50%',background:'#ff3d00' }}/><span style={{ fontSize:9,color:'#aaa',fontWeight:700 }}>ENERGY</span></div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:8,height:8,borderRadius:'50%',background:'#ff8c00' }}/><span style={{ fontSize:9,color:'#aaa',fontWeight:700 }}>CONFIDENCE</span></div>
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100 }}>
                        {[...checkinHistory].reverse().map((c,i)=>(
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:80 }}>
                              <div style={{ flex:1, background:'#ff3d00', borderRadius:'2px 2px 0 0', height:`${(c.energy_level/10)*100}%`, minHeight:3 }}/>
                              <div style={{ flex:1, background:'#ff8c00', borderRadius:'2px 2px 0 0', height:`${(c.confidence_level/10)*100}%`, minHeight:3 }}/>
                            </div>
                            <div style={{ fontSize:6,color:'#555',fontWeight:700 }}>W{c.week?.split('-W')[1]||''}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Week over week */}
                    {checkinHistory.length >= 2 && (()=>{
                      const latest = checkinHistory[0], prev = checkinHistory[1]
                      const eUp = latest.energy_level >= prev.energy_level
                      const cUp = latest.confidence_level >= prev.confidence_level
                      return (
                        <div style={{ ...C.card, borderColor: eUp&&cUp?'#1a4a1a':'#1e1e1e', marginBottom:14 }}>
                          <span style={C.lbl}>WEEK OVER WEEK TREND</span>
                          <div style={{ display:'flex', gap:16 }}>
                            <div><div style={{ fontSize:13,fontWeight:800 }}>{eUp?'⬆️':'⬇️'} Energy {eUp?'+':''}{latest.energy_level-prev.energy_level}</div><div style={{ fontSize:10,color:'#555' }}>vs last week</div></div>
                            <div><div style={{ fontSize:13,fontWeight:800 }}>{cUp?'⬆️':'⬇️'} Confidence {cUp?'+':''}{latest.confidence_level-prev.confidence_level}</div><div style={{ fontSize:10,color:'#555' }}>vs last week</div></div>
                          </div>
                        </div>
                      )
                    })()}
                  </>}

                  {/* Mental tools overview */}
                  {submissions.length > 0 && <>
                    <span style={C.lbl}>MENTAL TOOLS USAGE</span>
                    <div style={{ ...C.card, marginBottom:14 }}>
                      {[['shark','🦈','Shark Mentality'],['goldfish','🐠','Goldfish Mentality'],['selftalk','💬','Self Talk'],['tuneout','🔇','Tune Out']].map(([k,icon,lbl])=>{
                        const cnt = submissions.filter(s=>s[k+'_used']).length
                        const pct = Math.round((cnt/submissions.length)*100)
                        return (
                          <div key={k} style={{ marginBottom:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:12, fontWeight:700 }}>{icon} {lbl}</span>
                              <span style={{ fontSize:12, fontWeight:900, color:'#ff3d00' }}>{pct}% <span style={{ fontSize:9,color:'#555' }}>({cnt}/{submissions.length})</span></span>
                            </div>
                            <div style={{ height:5, background:'#1e1e1e', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#ff3d00,#ff6d00)', borderRadius:3 }}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>}

                  {/* Badges */}
                  {(()=>{
                    const badges = [
                      { icon:'🦈', label:'FIRST SHARK', desc:'Submitted first action step', earned:submissions.length>=1 },
                      { icon:'🔥', label:'7 DAY STREAK', desc:'Logged 7 days in a row', earned:streak>=7 },
                      { icon:'⚡', label:'30 DAY LEGEND', desc:'Logged 30 days in a row', earned:streak>=30 },
                      { icon:'⚽', label:'BALL MASTER', desc:'Logged 10 ball mastery sessions', earned:ballHistory.length>=10 },
                      { icon:'📋', label:'CHECK-IN PRO', desc:'Completed 4 weekly check-ins', earned:checkinHistory.length>=4 },
                      { icon:'💪', label:'ACTION HERO', desc:'Submitted 10 action steps', earned:submissions.length>=10 },
                      { icon:'🏆', label:'DSM ELITE', desc:'Completed 8 weekly check-ins', earned:checkinHistory.length>=8 },
                      { icon:'🧠', label:'MINDSET ATHLETE', desc:'Used all 4 mental tools', earned:submissions.some(s=>s.shark_used&&s.goldfish_used&&s.selftalk_used&&s.tuneout_used) },
                    ]
                    const earned = badges.filter(b=>b.earned), locked = badges.filter(b=>!b.earned)
                    return (<>
                      <span style={C.lbl}>🏅 BADGES ({earned.length}/{badges.length})</span>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                        {earned.map((b,i)=>(
                          <div key={i} style={{ ...C.card, borderColor:'#ff3d00', textAlign:'center', padding:14 }}>
                            <div style={{ fontSize:28, marginBottom:5 }}>{b.icon}</div>
                            <div style={{ fontSize:9, fontWeight:900, letterSpacing:1, color:'#ff3d00', marginBottom:3 }}>{b.label}</div>
                            <div style={{ fontSize:8, color:'#555' }}>{b.desc}</div>
                          </div>
                        ))}
                        {locked.map((b,i)=>(
                          <div key={i} style={{ ...C.card, textAlign:'center', padding:14, opacity:0.3 }}>
                            <div style={{ fontSize:28, marginBottom:5 }}>🔒</div>
                            <div style={{ fontSize:9, fontWeight:900, letterSpacing:1, color:'#555', marginBottom:3 }}>{b.label}</div>
                            <div style={{ fontSize:8, color:'#444' }}>{b.desc}</div>
                          </div>
                        ))}
                      </div>
                    </>)
                  })()}
                </>}

                {/* ── ACTION STEPS TAB ── */}
                {progressTab==='actions' && <>
                  {submissions.length === 0 ? (
                    <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                      <div style={{ fontSize:13, color:'#555' }}>No action steps logged yet. Hit the Actions tab to log your first session! ✅</div>
                    </div>
                  ) : <>
                    {/* Summary stats */}
                    <div style={{ ...C.card, marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                        <div style={{ fontSize:13, fontWeight:800 }}>Total Sessions</div>
                        <div style={{ fontSize:28, fontWeight:900, color:'#ff3d00' }}>{submissions.length}</div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6 }}>
                        {[['conditioning','💪','COND'],['strength','🏋️','STR'],['technical','⚽','TECH'],['mental','🧠','MNT']].map(([k,icon,lbl])=>{
                          const avg = (submissions.reduce((a,s)=>a+(s[k]||0),0)/submissions.length).toFixed(1)
                          return (
                            <div key={k} style={{ background:'#0a0a0a', borderRadius:8, padding:'8px 4px', textAlign:'center' }}>
                              <div style={{ fontSize:14 }}>{icon}</div>
                              <div style={{ fontSize:18, fontWeight:900, color:'#ff3d00' }}>{avg}</div>
                              <div style={{ fontSize:7, color:'#555', fontWeight:700, letterSpacing:1 }}>{lbl} AVG</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* All sessions list */}
                    <span style={C.lbl}>ALL SESSIONS ({submissions.length})</span>
                    {submissions.map((s,i)=>(
                      <div key={i} style={{ ...C.card, marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:11, color:'#ff3d00', fontWeight:800, letterSpacing:1 }}>{s.date}</div>
                            <div style={{ fontSize:9, color:'#555', fontWeight:700 }}>{s.day_of_week} · {s.session_type}</div>
                          </div>
                          <div style={{ fontSize:13, fontWeight:800 }}>{s.did_action_steps==='Yes'?'✅':'❌'}</div>
                        </div>
                        <div style={{ display:'flex', gap:10, marginBottom:8 }}>
                          {['conditioning','strength','technical','mental'].map(k=>(
                            <div key={k} style={{ textAlign:'center' }}>
                              <div style={{ fontSize:18, fontWeight:900, color:'#ff3d00' }}>{s[k]}</div>
                              <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                            </div>
                          ))}
                          <div style={{ textAlign:'center', marginLeft:'auto' }}>
                            <div style={{ fontSize:18, fontWeight:900, color:'#ff8c00' }}>{((( s.conditioning||0)+(s.strength||0)+(s.technical||0)+(s.mental||0))/4).toFixed(1)}</div>
                            <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>AVG</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {[['shark','🦈'],['goldfish','🐠'],['selftalk','💬'],['tuneout','🔇']].map(([k,icon])=>s[k+'_used']&&(
                            <span key={k} style={{ background:'#1a1a1a', border:'1px solid #ff3d00', borderRadius:20, padding:'2px 8px', fontSize:9, fontWeight:700, color:'#ff3d00' }}>{icon} {k.toUpperCase()}</span>
                          ))}
                        </div>
                        {(s.shark_comments||s.goldfish_comments||s.selftalk_comments||s.tuneout_comments) && (
                          <div style={{ marginTop:8, fontSize:11, color:'#666', lineHeight:1.5 }}>
                            {s.shark_comments && <div>🦈 {s.shark_comments}</div>}
                            {s.goldfish_comments && <div>🐠 {s.goldfish_comments}</div>}
                            {s.selftalk_comments && <div>💬 {s.selftalk_comments}</div>}
                            {s.tuneout_comments && <div>🔇 {s.tuneout_comments}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </>}
                </>}

                {/* ── CHECK-INS TAB ── */}
                {progressTab==='checkins' && <>
                  {checkinHistory.length === 0 ? (
                    <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                      <div style={{ fontSize:13, color:'#555' }}>No weekly check-ins yet. Complete your first one from the Weekly tab! 📋</div>
                    </div>
                  ) : <>
                    {/* Summary averages */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                      {[
                        ['⚡','ENERGY AVG',(checkinHistory.reduce((a,c)=>a+c.energy_level,0)/checkinHistory.length).toFixed(1)],
                        ['💪','CONF AVG',(checkinHistory.reduce((a,c)=>a+c.confidence_level,0)/checkinHistory.length).toFixed(1)],
                        ['🏃','SESSIONS AVG',(checkinHistory.reduce((a,c)=>a+c.sessions_completed,0)/checkinHistory.length).toFixed(1)],
                      ].map(([icon,lbl,val])=>(
                        <div key={lbl} style={{ ...C.card, textAlign:'center', padding:12 }}>
                          <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                          <div style={{ fontSize:22, fontWeight:900, color:'#ff3d00' }}>{val}</div>
                          <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>{lbl}</div>
                        </div>
                      ))}
                    </div>

                    {/* All check-ins list */}
                    <span style={C.lbl}>ALL WEEKLY CHECK-INS ({checkinHistory.length})</span>
                    {checkinHistory.map((c,i)=>(
                      <div key={i} style={{ ...C.card, marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div style={{ fontSize:11, color:'#ff3d00', fontWeight:800, letterSpacing:1 }}>{c.week}</div>
                          <div style={{ display:'flex', gap:12 }}>
                            {[['⚡',c.energy_level],['💪',c.confidence_level],['🏃',c.sessions_completed]].map(([icon,val],j)=>(
                              <div key={j} style={{ textAlign:'center' }}>
                                <div style={{ fontSize:16, fontWeight:900, color:'#ff3d00' }}>{val}</div>
                                <div style={{ fontSize:9 }}>{icon}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {c.biggest_win && <div style={{ fontSize:12, color:'#aaa', marginBottom:5 }}>🏆 <strong style={{ color:'#ccc' }}>Win:</strong> {c.biggest_win}</div>}
                        {c.biggest_challenge && <div style={{ fontSize:12, color:'#aaa', marginBottom:5 }}>💥 <strong style={{ color:'#ccc' }}>Challenge:</strong> {c.biggest_challenge}</div>}
                        {c.shark_moment && <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>🦈 {c.shark_moment}</div>}
                        {c.goldfish_moment && <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>🐠 {c.goldfish_moment}</div>}
                        {c.self_talk_moment && <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>💬 {c.self_talk_moment}</div>}
                        {c.goal_next_week && <div style={{ fontSize:12, color:'#ff3d00', marginTop:6 }}>🎯 Next week: {c.goal_next_week}</div>}
                        {c.message_to_coach && <div style={{ fontSize:11, color:'#888', fontStyle:'italic', marginTop:6, borderTop:'1px solid #1e1e1e', paddingTop:6 }}>"{c.message_to_coach}"</div>}
                      </div>
                    ))}
                  </>}
                </>}

                {/* ── BALL MASTERY TAB ── */}
                {progressTab==='ball' && <>
                  {ballHistory.length === 0 ? (
                    <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                      <div style={{ fontSize:13, color:'#555' }}>No ball mastery sessions yet. Log your first one from the Ball tab! ⚽</div>
                    </div>
                  ) : <>
                    <div style={{ ...C.card, marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div style={{ fontSize:13, fontWeight:800 }}>Total Sessions</div>
                        <div style={{ fontSize:28, fontWeight:900, color:'#ff3d00' }}>{ballHistory.length}</div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontSize:13, fontWeight:800 }}>Total Reps</div>
                        <div style={{ fontSize:28, fontWeight:900, color:'#ff3d00' }}>{ballHistory.reduce((a,b)=>a+(b.total_reps||0),0)}</div>
                      </div>
                    </div>
                    <span style={C.lbl}>ALL BALL MASTERY SESSIONS ({ballHistory.length})</span>
                    {ballHistory.map((b,i)=>(
                      <div key={i} style={{ ...C.card, marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div style={{ fontSize:11, color:'#ff3d00', fontWeight:800 }}>{b.date}</div>
                          <div style={{ display:'flex', gap:12 }}>
                            <div style={{ textAlign:'center' }}>
                              <div style={{ fontSize:16, fontWeight:900, color:'#ff3d00' }}>{b.total_skills}</div>
                              <div style={{ fontSize:7, color:'#555', fontWeight:700 }}>SKILLS</div>
                            </div>
                            <div style={{ textAlign:'center' }}>
                              <div style={{ fontSize:16, fontWeight:900, color:'#ff8c00' }}>{b.total_reps}</div>
                              <div style={{ fontSize:7, color:'#555', fontWeight:700 }}>REPS</div>
                            </div>
                          </div>
                        </div>
                        {b.notes && <div style={{ fontSize:11, color:'#666', marginTop:4 }}>{b.notes}</div>}
                        {b.skills && (()=>{
                          try {
                            const sk = typeof b.skills==='string'?JSON.parse(b.skills):b.skills
                            const practiced = Object.entries(sk).filter(([k,v])=>k!=='notes'&&v?.reps>0)
                            if (!practiced.length) return null
                            return (
                              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
                                {practiced.map(([k,v])=>(
                                  <span key={k} style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:20, padding:'2px 8px', fontSize:9, color:'#aaa', fontWeight:700 }}>
                                    {k.replace(/_/g,' ')} ×{v.reps}
                                  </span>
                                ))}
                              </div>
                            )
                          } catch { return null }
                        })()}
                      </div>
                    ))}
                  </>}
                </>}
              </>
            )
          })()}
        </div>
      )}

      {/* ── MENTAL TOOLS ── */}
      {tab === 'mental' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>MENTAL TOOLS</div>
          <div style={C.sub}>DAILY TRAINING FOR YOUR MIND</div>

          {/* Sub tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
            {[['microreps','⚡ Micro Reps'],['gameday','🎮 Game Day'],['mistakes','🔄 Resets'],['map','🗺️ MAP']].map(([t,l])=>(
              <button key={t} onClick={()=>setMentalTab(t)}
                style={{ flex:1, background:mentalTab===t?'#ff3d00':'#1e1e1e', border:'none', borderRadius:10, padding:'9px 6px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                {l}
              </button>
            ))}
          </div>

          {/* DAILY MICRO REPS */}
          {mentalTab === 'microreps' && (() => {
            const drills = [
              { id:'shark', icon:'🦈', title:'SHARK ACTIVATION', time:'30 sec', instruction:'Stand up straight. Say out loud: "I am aggressive. I am fearless. I move forward." Say it 3 times with full belief. Feel it in your body.' },
              { id:'goldfish', icon:'🐠', title:'MISTAKE RELEASE', time:'30 sec', instruction:'Think of one mistake from your last session. Now shake your hands out, take a strong exhale, and say "Next play." Watch the mistake disappear.' },
              { id:'breath', icon:'💨', title:'RESET BREATH', time:'45 sec', instruction:'Inhale for 4 seconds while clenching your fists. Hold for 2 seconds. Exhale for 6 seconds while releasing your fists. Repeat 3 times.' },
              { id:'selftalk', icon:'💬', title:'SELF TALK REP', time:'30 sec', instruction:'Write down one limiting belief you have about your game. Cross it out. Write the empowering version. Read it out loud twice.' },
              { id:'visualize', icon:'👁️', title:'QUICK VISUALIZATION', time:'60 sec', instruction:'Close your eyes. See yourself in your next game. One aggressive action -- a tackle, a shot, a dribble. Make it vivid. Feel the confidence.' },
              { id:'declaration', icon:'📣', title:'BELIEF DECLARATION', time:'20 sec', instruction:'Say your personal declaration out loud: "I believe I am capable of playing my best while having fun." Say it with conviction.' },
            ]
            const todayKey = today + '-microreps'
            return (
              <>
                <div style={C.orange}>
                  <span style={C.olbl}>TODAY'S MENTAL REPS</span>
                  <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>30-60 seconds each. Do them all. This is your daily mindset training. 🧠</div>
                </div>
                {drills.map((drill, i) => (
                  <div key={drill.id} style={{ ...C.card, borderColor: gameDayChecked[drill.id] ? '#ff3d00' : '#1e1e1e', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: gameDayChecked[drill.id] ? 10 : 0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ fontSize:24 }}>{drill.icon}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:800 }}>{drill.title}</div>
                          <div style={{ fontSize:10, color:'#555' }}>⏱ {drill.time}</div>
                        </div>
                      </div>
                      <button onClick={() => setGameDayChecked(p => ({...p, [drill.id]: !p[drill.id]}))}
                        style={{ background: gameDayChecked[drill.id] ? '#ff3d00' : '#1e1e1e', border:'none', borderRadius:20, padding:'5px 12px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                        {gameDayChecked[drill.id] ? '✓ DONE' : 'START'}
                      </button>
                    </div>
                    {gameDayChecked[drill.id] && (
                      <div style={{ background:'#0a0a0a', borderRadius:8, padding:'12px', fontSize:13, color:'#ccc', lineHeight:1.6 }}>
                        {drill.instruction}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ ...C.card, textAlign:'center', padding:20 }}>
                  <div style={{ fontSize:13, color:'#555', marginBottom:8 }}>
                    {['shark','goldfish','breath','selftalk','visualize','declaration'].filter(id => gameDayChecked[id]).length}/{drills.length} completed today
                  </div>
                  <div style={{ height:6, background:'#1e1e1e', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(['shark','goldfish','breath','selftalk','visualize','declaration'].filter(id => gameDayChecked[id]).length/drills.length)*100}%`, background:'linear-gradient(90deg,#ff3d00,#ff6d00)', borderRadius:3 }} />
                  </div>
                </div>
              </>
            )
          })()}

          {/* GAME DAY ACTIVATION */}
          {mentalTab === 'gameday' && (() => {
            const steps = [
              { id:'eaten', icon:'🍎', label:'I have eaten and hydrated properly' },
              { id:'kit', icon:'👕', label:'My kit and boots are ready' },
              { id:'visualization', icon:'👁️', label:'I did my pre-game visualization' },
              { id:'phrase', icon:'🦈', label:'I said my shark phrase out loud' },
              { id:'breath', icon:'💨', label:'I did my energizing breath' },
              { id:'goldfish', icon:'🐠', label:'I am ready to goldfish any mistake instantly' },
              { id:'selftalk', icon:'💬', label:'My self talk is positive and controlled' },
              { id:'locked', icon:'🔒', label:'I am locked in and ready to compete' },
            ]
            const allDone = steps.every(s => gameDayChecked['gd_'+s.id])
            return (
              <>
                <div style={C.orange}>
                  <span style={C.olbl}>PRE-GAME ACTIVATION</span>
                  <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Go through this checklist before every game. Every single one. 🦈</div>
                </div>
                {steps.map(step => (
                  <div key={step.id} onClick={() => setGameDayChecked(p => ({...p, ['gd_'+step.id]: !p['gd_'+step.id]}))}
                    style={{ ...C.card, borderColor: gameDayChecked['gd_'+step.id] ? '#1a4a1a' : '#1e1e1e', cursor:'pointer', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: gameDayChecked['gd_'+step.id] ? '#00aa44' : '#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                        {gameDayChecked['gd_'+step.id] ? '✓' : step.icon}
                      </div>
                      <div style={{ fontSize:13, fontWeight: gameDayChecked['gd_'+step.id] ? 700 : 600, color: gameDayChecked['gd_'+step.id] ? '#aaa' : '#fff', textDecoration: gameDayChecked['gd_'+step.id] ? 'line-through' : 'none' }}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                ))}
                {allDone && (
                  <div style={{ ...C.card, borderColor:'#1a4a1a', textAlign:'center', padding:24 }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>🦈</div>
                    <div style={{ fontSize:18, fontWeight:900, marginBottom:6 }}>YOU ARE READY.</div>
                    <div style={{ fontSize:13, color:'#555' }}>Go compete. Trust your preparation. Lock in from the first whistle.</div>
                  </div>
                )}
              </>
            )
          })()}

          {/* MISTAKE RESET TRACKING */}
          {mentalTab === 'mistakes' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>MISTAKE RESET LOG</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Log your mistakes AND how you reset. This is how you track your mental growth. 🐠</div>
              </div>
              <div style={C.card}>
                <span style={C.lbl}>LOG A RESET</span>
                <span style={C.lbl}>WHAT HAPPENED</span>
                <input style={{ ...C.inp, marginBottom:8 }} placeholder="e.g. Lost the ball under pressure"
                  value={newMistake.situation} onChange={e => setNewMistake(p => ({...p, situation: e.target.value}))} />
                <span style={C.lbl}>WHICH TOOL DID YOU USE</span>
                <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                  {[['shark','🦈 Shark'],['goldfish','🐠 Goldfish'],['selftalk','💬 Self Talk'],['breath','💨 Breath']].map(([t,l]) => (
                    <button key={t} onClick={() => setNewMistake(p => ({...p, tool:t}))}
                      style={{ background: newMistake.tool===t ? '#ff3d00' : '#1e1e1e', border:'none', borderRadius:20, padding:'6px 12px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <span style={C.lbl}>HOW DID YOU RESET</span>
                <input style={{ ...C.inp, marginBottom:10 }} placeholder="e.g. Shook it off and called for the ball"
                  value={newMistake.reset} onChange={e => setNewMistake(p => ({...p, reset: e.target.value}))} />
                <button style={C.btn} onClick={async () => {
                  if (!newMistake.situation || !newMistake.reset) return alert('Fill in what happened and how you reset!')
                  const { error } = await supabase.from('mistake_resets').insert([{ user_id: user.id, situation: newMistake.situation, reset_description: newMistake.reset, tool_used: newMistake.tool, date: today }])
                  if (error) { alert('Error saving: ' + error.message); return }
                  const { data: mr } = await supabase.from('mistake_resets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
                  if (mr) setMistakes(mr)
                  setNewMistake({ situation:'', reset:'', tool:'' })
                }}>LOG RESET ✅</button>
              </div>
              {mistakes.length === 0 ? (
                <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                  <div style={{ fontSize:13, color:'#555' }}>No resets logged yet. Start tracking your mental game! 🐠</div>
                </div>
              ) : <>
                <div style={{ ...C.card, textAlign:'center', padding:16, marginBottom:10 }}>
                  <div style={{ fontSize:9, color:'#555', letterSpacing:3, fontWeight:700, marginBottom:6 }}>TOTAL RESETS LOGGED</div>
                  <div style={{ fontSize:36, fontWeight:900, color:'#ff3d00' }}>{mistakes.length}</div>
                  <div style={{ fontSize:11, color:'#555', marginTop:4 }}>Every reset is mental growth 🧠</div>
                </div>
                {mistakes.map((m, i) => (
                  <div key={i} style={C.card}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ fontSize:10, color:'#ff3d00', fontWeight:700 }}>{m.date}</div>
                      {m.tool_used && <span style={{ background:'#1e1e1e', borderRadius:20, padding:'2px 8px', fontSize:9, fontWeight:700, color:'#ff3d00' }}>
                        {m.tool_used==='shark'?'🦈':m.tool_used==='goldfish'?'🐠':m.tool_used==='selftalk'?'💬':'💨'} {m.tool_used.toUpperCase()}
                      </span>}
                    </div>
                    <div style={{ fontSize:12, color:'#aaa', marginBottom:4 }}>💥 {m.situation}</div>
                    <div style={{ fontSize:12, color:'#4aff4a' }}>✓ {m.reset_description}</div>
                  </div>
                ))}
              </>}
            </>
          )}

          {/* WEEKLY MAP */}
          {mentalTab === 'map' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>MINDSET ACTION PLAN -- {currentWeek}</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Your weekly mental roadmap. Review it every Monday. Adjust every week. 🗺️</div>
              </div>
              <div style={C.card}>
                <span style={C.lbl}>🎯 MENTAL GOAL THIS WEEK</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="e.g. Reset within 2 seconds of every mistake"
                  value={map.goal} onChange={e => setMap(p => ({...p, goal: e.target.value}))} />
                <span style={C.lbl}>🔍 FOCUS AREA</span>
                <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                  {['Shark Mentality','Goldfish Mentality','Self Talk','Visualization','Confidence','Consistency'].map(f => (
                    <button key={f} onClick={() => setMap(p => ({...p, focusArea: f}))}
                      style={{ background: map.focusArea===f ? '#ff3d00' : '#1e1e1e', border:'none', borderRadius:20, padding:'6px 12px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                      {f}
                    </button>
                  ))}
                </div>
                <span style={C.lbl}>🏆 BIGGEST WIN LAST WEEK</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="What went well mentally?"
                  value={map.weeklyWin} onChange={e => setMap(p => ({...p, weeklyWin: e.target.value}))} />
                <span style={C.lbl}>🔄 WHAT TO ADJUST</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="What needs to improve this week?"
                  value={map.adjustment} onChange={e => setMap(p => ({...p, adjustment: e.target.value}))} />
                <span style={C.lbl}>💪 MY COMMITMENT</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="e.g. I will log every mistake reset this week"
                  value={map.commitment} onChange={e => setMap(p => ({...p, commitment: e.target.value}))} />
                <button style={C.btn} onClick={async () => {
                  if (!map.goal) return alert('Set your mental goal first!')
                  const { error } = await supabase.from('mindset_map').upsert([{
                    user_id: user.id, week: currentWeek,
                    goal: map.goal, focus_area: map.focusArea,
                    weekly_win: map.weeklyWin, adjustment: map.adjustment, commitment: map.commitment
                  }], { onConflict: 'user_id,week' })
                  if (error) { alert('Error saving: ' + error.message); return }
                  setMapSaved(true)
                  alert('MAP saved! Stay locked in this week. 🦈')
                }}>💾 SAVE MY MAP</button>
              </div>
              {mapSaved && (
                <div style={{ ...C.card, borderColor:'#1a4a1a' }}>
                  <span style={C.lbl}>THIS WEEK'S MAP</span>
                  {map.goal && <div style={{ fontSize:13, marginBottom:8 }}>🎯 <strong>Goal:</strong> {map.goal}</div>}
                  {map.focusArea && <div style={{ fontSize:13, marginBottom:8 }}>🔍 <strong>Focus:</strong> {map.focusArea}</div>}
                  {map.weeklyWin && <div style={{ fontSize:13, marginBottom:8 }}>🏆 <strong>Last week win:</strong> {map.weeklyWin}</div>}
                  {map.adjustment && <div style={{ fontSize:13, marginBottom:8 }}>🔄 <strong>Adjust:</strong> {map.adjustment}</div>}
                  {map.commitment && <div style={{ fontSize:13 }}>💪 <strong>Commitment:</strong> {map.commitment}</div>}
                </div>
              )}
            </>
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
            {typingMsg && (
              <div style={{ display:'flex',justifyContent:'flex-start',marginBottom:8 }}>
                <div style={{ maxWidth:'82%',background:'#1a1a1a',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',fontSize:14,lineHeight:1.5,color:'#fff' }}>
                  {typingMsg}<span style={{ display:'inline-block',width:8,height:14,background:'#ff3d00',marginLeft:3,borderRadius:2,animation:'blink 0.7s infinite' }}>|</span>
                </div>
              </div>
            )}
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
              <input style={{ ...C.inp,flex:1 }} placeholder="Ask Coach Valentino anything..."
                defaultValue=""
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                ref={el => { if(el) chatInputRef.current = el }}
                onKeyDown={e=>{if(e.key==='Enter'){const v=e.target.value;e.target.value='';sendChat(v)}}} />
              {!voiceMode&&<button onClick={startVoice} style={{ background:'#1e1e1e',border:'none',borderRadius:10,padding:'0 13px',fontSize:17,cursor:'pointer' }}>🎙️</button>}
              <button onClick={()=>{const v=chatInputRef.current?.value||'';if(chatInputRef.current)chatInputRef.current.value='';sendChat(v)}} style={{ background:'#ff3d00',border:'none',borderRadius:10,padding:'0 15px',fontSize:17,cursor:'pointer' }}>→</button>
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
                    const { error } = await supabase.from('community_posts').insert([{
                      user_id: user.id,
                      type: newPost.type,
                      content: newPost.content,
                      community: communityTab,
                    }])
                    if (error) { alert('Error posting: ' + error.message); setSavingPost(false); return }
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
            <div style={{ fontSize:15,fontWeight:700,lineHeight:1.4 }}>"Parents are the most influential people in a young athlete's mental development. Here's how to help -- not hurt."</div>
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
          <div style={C.sub}>COACH VALENTINO VIEW</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14 }}>
            {[[allAthletes.filter(a=>a.role==='athlete').length,'ATHLETES'],[allSubmissions.length,'ACTION STEPS'],[allCheckins.length,'CHECK-INS']].map(([n,l],i)=>(
              <div key={i} style={{ ...C.card,textAlign:'center',padding:12 }}>
                <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>{n}</div>
                <div style={{ fontSize:7,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          {allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')&&(isAdmin||a.assigned_coach===myName)).length > 0 && <>
            <span style={{ ...C.lbl, color:'#ff3d00' }}>⚠️ PENDING ACTIVATION</span>
            {allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')&&(isAdmin||a.assigned_coach===myName)).map((a,i)=>(
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
          {/* Coach filter -- admin only */}
          {isAdmin && allAthletes.filter(a=>a.role==='coach').length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              <button onClick={()=>setCoachFilter('all')}
                style={{ background:coachFilter==='all'?'#ff3d00':'#1e1e1e', border:'none', borderRadius:20, padding:'6px 14px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                ALL
              </button>
              <button onClick={()=>setCoachFilter('unassigned')}
                style={{ background:coachFilter==='unassigned'?'#ff3d00':'#1e1e1e', border:'none', borderRadius:20, padding:'6px 14px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                UNASSIGNED
              </button>
              {allAthletes.filter(a=>a.role==='coach').map((c,i)=>(
                <button key={i} onClick={()=>setCoachFilter(c.full_name||c.email)}
                  style={{ background:coachFilter===(c.full_name||c.email)?'#ff3d00':'#1e1e1e', border:'none', borderRadius:20, padding:'6px 14px', fontSize:10, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                  👤 {c.full_name||c.email}
                </button>
              ))}
            </div>
          )}

          {/* Stats bar -- admin only */}
          {isAdmin && <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              [allAthletes.filter(a=>a.role==='athlete').length, 'TOTAL'],
              [allAthletes.filter(a=>a.role==='athlete'&&a.access_level&&a.access_level!=='locked').length, 'ACTIVE'],
              [allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')).length, 'PENDING'],
            ].map(([n,l])=>(
              <div key={l} style={{ ...C.card, textAlign:'center', padding:10 }}>
                <div style={{ fontSize:22, fontWeight:900, color:'#ff3d00' }}>{n}</div>
                <div style={{ fontSize:8, color:'#555', letterSpacing:2, fontWeight:700 }}>{l}</div>
              </div>
            ))}
          </div>}

          {allAthletes.filter(a=>a.role==='athlete'&&a.access_level&&a.access_level!=='locked'
            &&(isAdmin ? (coachFilter==='all'||(coachFilter==='unassigned'?!a.assigned_coach:a.assigned_coach===coachFilter)) : a.assigned_coach===myName)
          ).map((a,i)=>(
            <div key={i} style={{ ...C.card,cursor:'pointer' }} onClick={()=>{ setSelectedAthlete(a); loadAthleteProfile(a); }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:800,marginBottom:2 }}>{a.full_name||a.email}</div>
                  <div style={{ fontSize:10,color:'#555' }}>🔥 {a.streak||0} streak · {a.access_level}</div>
                  {a.assigned_coach && <div style={{ fontSize:9,color:'#ff3d00',fontWeight:700,marginTop:2 }}>👤 {a.assigned_coach}</div>}
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
          <button onClick={()=>{ setSelectedAthlete(null); setAthleteProfileTab('overview') }}
            style={{ background:'none',border:'none',color:'#ff3d00',fontSize:12,fontWeight:800,letterSpacing:2,cursor:'pointer',fontFamily:'inherit',marginBottom:12,padding:0 }}>← BACK</button>

          {/* Header */}
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:14 }}>
            <div style={{ width:52,height:52,borderRadius:'50%',background:'#ff3d00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,flexShrink:0 }}>
              {(selectedAthlete.full_name||selectedAthlete.email||'?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:20,fontWeight:900 }}>{selectedAthlete.full_name||selectedAthlete.email}</div>
              <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,marginTop:2 }}>🔥 {selectedAthlete.streak||0} streak · {selectedAthlete.access_level}</div>
            </div>
          </div>

          {/* Access buttons */}
          <div style={{ display:'flex',gap:8,marginBottom:12 }}>
            <button onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,'paid'); setSelectedAthlete({...selectedAthlete,access_level:'paid'}); loadUserData(); }}
              style={{ flex:1,background:'#00aa44',border:'none',borderRadius:10,padding:'10px 8px',fontSize:11,fontWeight:900,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
              ✅ UNLOCK
            </button>
            <button onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,'locked'); setSelectedAthlete({...selectedAthlete,access_level:'locked'}); loadUserData(); }}
              style={{ flex:1,background:'#aa0000',border:'none',borderRadius:10,padding:'10px 8px',fontSize:11,fontWeight:900,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
              🔒 LOCK
            </button>
          </div>

          {/* Profile tabs */}
          <div style={{ display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' }}>
            {[['overview','📊'],['sessions','🎙️'],['feedback','✅'],['checkins','📋'],['ball','⚽'],['messages','💬']].map(([t,icon])=>(
              <button key={t} onClick={()=>setAthleteProfileTab(t)}
                style={{ background:athleteProfileTab===t?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'7px 10px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit',letterSpacing:1 }}>
                {icon} {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {athleteProfileTab==='overview' && <>

            {/* DOWNLOAD REPORT BUTTON - COACH */}
            <div style={{ display:'flex',gap:8,marginBottom:12 }}>
              <button onClick={()=>downloadReport(selectedAthlete, athleteActionSteps, athleteCheckins, athleteBallMastery, true)}
                style={{ flex:1,background:'linear-gradient(135deg,#ff3d00,#ff6d00)',border:'none',borderRadius:10,padding:'12px 8px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit',letterSpacing:1 }}>
                📥 DOWNLOAD PDF + EXCEL
              </button>
            </div>

            {/* STATS ROW */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12 }}>
              {[[selectedAthlete.streak||0,'STREAK','🔥'],[athleteActionSteps.length,'STEPS','✅'],[athleteBallMastery.length,'BALL','⚽'],[athleteCheckins.length,'CHECK-INS','📋']].map(([n,l,icon])=>(
                <div key={l} style={{ ...C.card,textAlign:'center',padding:10 }}>
                  <div style={{ fontSize:10,marginBottom:2 }}>{icon}</div>
                  <div style={{ fontSize:18,fontWeight:900,color:'#ff3d00' }}>{n}</div>
                  <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700,marginTop:1 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* ENERGY & CONFIDENCE CHART */}
            {athleteCheckins.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>⚡ ENERGY & 💪 CONFIDENCE OVER TIME</span>
                <div style={{ display:'flex',alignItems:'flex-end',gap:4,height:90,marginBottom:6 }}>
                  {[...athleteCheckins].reverse().map((c,i)=>(
                    <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                      <div style={{ width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:70 }}>
                        <div style={{ flex:1,background:'#ff3d00',borderRadius:'3px 3px 0 0',height:`${(c.energy_level/10)*70}px`,minHeight:3 }} />
                        <div style={{ flex:1,background:'#ff8c00',borderRadius:'3px 3px 0 0',height:`${(c.confidence_level/10)*70}px`,minHeight:3 }} />
                      </div>
                      <div style={{ fontSize:7,color:'#444',fontWeight:700 }}>W{c.week?.split('-W')[1]||i+1}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',gap:14,marginTop:4 }}>
                  {[['#ff3d00','ENERGY'],['#ff8c00','CONFIDENCE']].map(([color,label])=>(
                    <div key={label} style={{ display:'flex',alignItems:'center',gap:5 }}>
                      <div style={{ width:8,height:8,borderRadius:'50%',background:color }} />
                      <span style={{ fontSize:9,color:'#aaa',fontWeight:700 }}>{label}</span>
                    </div>
                  ))}
                  <div style={{ marginLeft:'auto',fontSize:10,color:'#ff3d00',fontWeight:900 }}>
                    avg {athleteCheckins.length ? (athleteCheckins.reduce((a,c)=>a+c.energy_level,0)/athleteCheckins.length).toFixed(1) : 0} / {athleteCheckins.length ? (athleteCheckins.reduce((a,c)=>a+c.confidence_level,0)/athleteCheckins.length).toFixed(1) : 0}
                  </div>
                </div>
              </div>
            )}

            {/* PERFORMANCE RATINGS */}
            {athleteActionSteps.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>📊 PERFORMANCE RATINGS (LAST 6 SESSIONS)</span>
                {['conditioning','strength','technical','mental'].map(metric=>{
                  const recent = [...athleteActionSteps].slice(0,6).reverse()
                  const avg = recent.length ? (recent.reduce((a,s)=>a+(s[metric]||0),0)/recent.length).toFixed(1) : 0
                  const trend = recent.length >= 2 ? (recent[recent.length-1][metric]||0) - (recent[0][metric]||0) : 0
                  return (
                    <div key={metric} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                        <span style={{ fontSize:11,color:'#aaa',textTransform:'capitalize',fontWeight:700 }}>{metric}</span>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <span style={{ fontSize:9,color:'#555' }}>avg {avg}/10</span>
                          <span style={{ fontSize:11,fontWeight:800,color:trend>0?'#4aff4a':trend<0?'#ff4444':'#555' }}>
                            {trend>0?'↑':trend<0?'↓':'→'} {Math.abs(trend)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display:'flex',alignItems:'flex-end',gap:3,height:36 }}>
                        {recent.map((s,i)=>(
                          <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                            <div style={{ fontSize:8,color:'#ff3d00',fontWeight:800 }}>{s[metric]}</div>
                            <div style={{ width:'100%',background:'#ff3d00',borderRadius:'2px 2px 0 0',height:`${((s[metric]||0)/10)*28}px`,minHeight:2 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* MENTAL TOOLS USAGE */}
            {athleteActionSteps.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>🧠 MENTAL TOOLS USAGE</span>
                {[['shark','🦈 Shark'],['goldfish','🐠 Goldfish'],['selftalk','💬 Self Talk'],['tuneout','🔇 Tune Out']].map(([k,label])=>{
                  const used = athleteActionSteps.filter(s=>s[k+'_used']).length
                  const pct = athleteActionSteps.length ? Math.round((used/athleteActionSteps.length)*100) : 0
                  return (
                    <div key={k} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                        <span style={{ fontSize:11,fontWeight:700 }}>{label}</span>
                        <span style={{ fontSize:11,color:'#ff3d00',fontWeight:800 }}>{pct}% ({used}/{athleteActionSteps.length})</span>
                      </div>
                      <div style={{ height:6,background:'#1e1e1e',borderRadius:3,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#ff3d00,#ff6d00)',borderRadius:3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* BALL MASTERY */}
            {athleteBallMastery.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>⚽ BALL MASTERY</span>
                <div style={{ display:'flex',justifyContent:'space-around',marginBottom:10 }}>
                  {[[athleteBallMastery.length,'SESSIONS'],[athleteBallMastery.reduce((a,b)=>a+(b.total_reps||0),0),'TOTAL REPS'],[Math.round(athleteBallMastery.reduce((a,b)=>a+(b.total_reps||0),0)/athleteBallMastery.length)||0,'AVG REPS']].map(([n,l])=>(
                    <div key={l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>{n}</div>
                      <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',alignItems:'flex-end',gap:3,height:50 }}>
                  {[...athleteBallMastery].reverse().slice(0,12).map((b,i)=>(
                    <div key={i} style={{ flex:1,background:'#ff3d00',borderRadius:'2px 2px 0 0',height:`${Math.min((b.total_reps||0)/3,46)}px`,minHeight:3 }} />
                  ))}
                </div>
              </div>
            )}

            {/* LATEST MESSAGE */}
            {athleteCheckins[0]?.message_to_coach && (
              <div style={{ ...C.card,borderColor:'#1a3a2a' }}>
                <span style={C.lbl}>💬 LATEST MESSAGE TO COACH</span>
                <div style={{ fontSize:13,color:'#aaa',fontStyle:'italic',lineHeight:1.6 }}>"{athleteCheckins[0].message_to_coach}"</div>
                <div style={{ fontSize:9,color:'#555',marginTop:6 }}>{athleteCheckins[0].week}</div>
              </div>
            )}

            {/* PROGRAM WEEK TRACKER */}
            <div style={C.card}>
              <span style={C.lbl}>📅 PROGRAM WEEK</span>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                {[1,2,3,4,5,6,7,8].map(w=>(
                  <button key={w}
                    onClick={async()=>{
                      setAthleteProgramWeek(w)
                      await supabase.from('profiles').update({ program_week: w }).eq('id', selectedAthlete.id)
                      setSelectedAthlete(p=>({...p, program_week: w}))
                    }}
                    style={{ background:(selectedAthlete.program_week||1)>=w?'#ff3d00':'#1e1e1e', border:'none', borderRadius:8, padding:'8px 12px', fontSize:12, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                    W{w}
                  </button>
                ))}
              </div>
              {/* Week breakdown */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { week:1, label:'Week 1-3', items:['Confidence 1-10','Action Steps','Ball Mastery'], color:'#ff3d00', unlocked: true },
                  { week:4, label:'Week 4', items:['+ Goal Setting'], color:'#ff6d00', unlocked: (selectedAthlete.program_week||1) >= 4 },
                  { week:5, label:'Week 5', items:['+ Visualization','+ Morning Routine'], color:'#ffaa00', unlocked: (selectedAthlete.program_week||1) >= 5 },
                ].map((phase,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background: phase.unlocked?'#111':'#0a0a0a', borderRadius:8, border:`1px solid ${phase.unlocked?phase.color:'#1e1e1e'}` }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:phase.unlocked?phase.color:'#333', flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:11, fontWeight:800, color:phase.unlocked?'#fff':'#444' }}>{phase.label}</div>
                      <div style={{ fontSize:10, color:phase.unlocked?'#888':'#333' }}>{phase.items.join(' · ')}</div>
                    </div>
                    {phase.unlocked && <div style={{ marginLeft:'auto', fontSize:10, color:phase.color, fontWeight:800 }}>✓ ACTIVE</div>}
                    {!phase.unlocked && <div style={{ marginLeft:'auto', fontSize:10, color:'#333', fontWeight:800 }}>🔒</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* CONFIDENCE TRACKER */}
            <div style={C.card}>
              <span style={C.lbl}>💪 CONFIDENCE LEVEL OVER TIME</span>
              {athleteCheckins.length === 0 ? (
                <div style={{ fontSize:12,color:'#555',textAlign:'center',padding:16 }}>No check-ins yet</div>
              ) : (
                <>
                  <div style={{ display:'flex',alignItems:'flex-end',gap:4,height:80,marginBottom:8 }}>
                    {[...athleteCheckins].reverse().map((c,i)=>(
                      <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                        <div style={{ fontSize:8,color:'#ff3d00',fontWeight:900 }}>{c.confidence_level}</div>
                        <div style={{ width:'100%',background:'linear-gradient(180deg,#ff3d00,#ff6d00)',borderRadius:'3px 3px 0 0',height:`${(c.confidence_level/10)*60}px`,minHeight:3 }} />
                        <div style={{ fontSize:7,color:'#444',fontWeight:700 }}>W{c.week?.split('-W')[1]||i+1}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between' }}>
                    <div style={{ fontSize:11,color:'#555' }}>Start: <span style={{ color:'#fff',fontWeight:800 }}>{[...athleteCheckins].reverse()[0]?.confidence_level}/10</span></div>
                    <div style={{ fontSize:11,color:'#555' }}>Latest: <span style={{ color:'#ff3d00',fontWeight:800 }}>{athleteCheckins[0]?.confidence_level}/10</span></div>
                    <div style={{ fontSize:11,color:'#555' }}>Change: <span style={{ fontWeight:800, color: athleteCheckins[0]?.confidence_level - [...athleteCheckins].reverse()[0]?.confidence_level > 0 ? '#4aff4a' : '#ff4444' }}>
                      {athleteCheckins[0]?.confidence_level - [...athleteCheckins].reverse()[0]?.confidence_level > 0 ? '+' : ''}{athleteCheckins[0]?.confidence_level - [...athleteCheckins].reverse()[0]?.confidence_level}
                    </span></div>
                  </div>
                </>
              )}
            </div>

            {/* GOAL SETTING -- Week 4+ */}
            {(selectedAthlete.program_week||1) >= 4 && (
              <div style={C.card}>
                <span style={C.lbl}>🎯 GOAL SETTING (WEEK 4+)</span>
                {athleteCheckins.filter(c=>c.goal_next_week).length === 0 ? (
                  <div style={{ fontSize:12,color:'#555',textAlign:'center',padding:12 }}>No goals set yet</div>
                ) : athleteCheckins.filter(c=>c.goal_next_week).slice(0,5).map((c,i)=>(
                  <div key={i} style={{ borderLeft:'2px solid #ff3d00', paddingLeft:10, marginBottom:10 }}>
                    <div style={{ fontSize:9,color:'#ff3d00',fontWeight:700,marginBottom:2 }}>{c.week}</div>
                    <div style={{ fontSize:12,color:'#fff',fontWeight:700 }}>🎯 {c.goal_next_week}</div>
                    {c.biggest_win && <div style={{ fontSize:11,color:'#4aff4a',marginTop:3 }}>✓ Win: {c.biggest_win}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* VISUALIZATION & MORNING ROUTINE -- Week 5+ */}
            {(selectedAthlete.program_week||1) >= 5 && (
              <div style={C.card}>
                <span style={C.lbl}>👁️ VISUALIZATION & MORNING ROUTINE (WEEK 5+)</span>
                {athleteActionSteps.length === 0 ? (
                  <div style={{ fontSize:12,color:'#555',textAlign:'center',padding:12 }}>No data yet</div>
                ) : (
                  <>
                    <div style={{ display:'flex',gap:12,marginBottom:12 }}>
                      <div style={{ flex:1,textAlign:'center' }}>
                        <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>
                          {athleteCheckins.filter(c=>c.did_visualization).length}
                        </div>
                        <div style={{ fontSize:9,color:'#555',letterSpacing:1,fontWeight:700 }}>VISUALIZATIONS</div>
                      </div>
                      <div style={{ flex:1,textAlign:'center' }}>
                        <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>
                          {athleteCheckins.filter(c=>c.did_morning_routine).length}
                        </div>
                        <div style={{ fontSize:9,color:'#555',letterSpacing:1,fontWeight:700 }}>MORNING ROUTINES</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11,color:'#555',textAlign:'center' }}>
                      Track these in the weekly check-in form
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={C.card}>
              <span style={C.lbl}>ASSIGNED COACH</span>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                {allAthletes.filter(a=>a.role==='coach').map((coach,i)=>(
                  <button key={i}
                    onClick={async()=>{
                      await supabase.from('profiles').update({ assigned_coach: coach.full_name||coach.email }).eq('id', selectedAthlete.id)
                      setSelectedAthlete(p=>({...p, assigned_coach: coach.full_name||coach.email}))
                      loadUserData()
                    }}
                    style={{ background: selectedAthlete.assigned_coach===(coach.full_name||coach.email)?'#ff3d00':'#1e1e1e', border:'none', borderRadius:10, padding:'10px 14px', fontSize:12, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                    👤 {coach.full_name||coach.email}
                  </button>
                ))}
                {allAthletes.filter(a=>a.role==='coach').length === 0 && (
                  <div style={{ fontSize:12, color:'#555' }}>No coaches found. Make sure coach accounts have role = "coach" in Supabase.</div>
                )}
              </div>
              {selectedAthlete.assigned_coach && (
                <div style={{ background:'#1a3a0a', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#4aff4a' }}>✓ Assigned to {selectedAthlete.assigned_coach}</div>
                  <button onClick={async()=>{
                    await supabase.from('profiles').update({ assigned_coach: null }).eq('id', selectedAthlete.id)
                    setSelectedAthlete(p=>({...p, assigned_coach: null}))
                    loadUserData()
                  }} style={{ background:'none', border:'none', fontSize:10, color:'#555', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>REMOVE</button>
                </div>
              )}
            </div>
            <div style={C.card}>
              <span style={C.lbl}>COACH NOTES (PRIVATE)</span>
              <textarea style={{ ...C.ta,height:80,marginBottom:8 }} placeholder="Private notes about this athlete..."
                value={coachNote} onChange={e=>setCoachNote(e.target.value)} />
              <button style={C.bsm} onClick={async()=>{
                setSavingNote(true)
                await supabase.from('coach_athlete_notes').upsert([{ coach_id:user.id,athlete_id:selectedAthlete.id,notes:coachNote }])
                setSavingNote(false)
                alert('Notes saved!')
              }}>{savingNote?'SAVING...':'SAVE NOTES'}</button>
            </div>
          </>}

          {/* SESSION NOTES */}
          {athleteProfileTab==='sessions' && <>
            <div style={C.card}>
              <span style={C.lbl}>ADD SESSION NOTES</span>
              <input style={{ ...C.inp,marginBottom:8 }} placeholder="Session title (e.g. Session 3 - Beliefs)"
                value={newSessionNote.title} onChange={e=>setNewSessionNote(p=>({...p,title:e.target.value}))} />
              <input type="date" style={{ ...C.inp,marginBottom:8 }} value={newSessionNote.date}
                onChange={e=>setNewSessionNote(p=>({...p,date:e.target.value}))} />
              <input style={{ ...C.inp,marginBottom:8 }} placeholder="Fathom recording link (optional)"
                value={newSessionNote.fathomLink} onChange={e=>setNewSessionNote(p=>({...p,fathomLink:e.target.value}))} />
              <textarea style={{ ...C.ta,height:140,marginBottom:8 }} placeholder="Paste Fathom notes / key takeaways here..."
                value={newSessionNote.content} onChange={e=>setNewSessionNote(p=>({...p,content:e.target.value}))} />
              <button style={C.btn} disabled={savingNote} onClick={async()=>{
                if(!newSessionNote.title) return alert('Add a title!')
                setSavingNote(true)
                await supabase.from('session_notes').insert([{
                  athlete_id:selectedAthlete.id, coach_id:user.id,
                  title:newSessionNote.title, content:newSessionNote.content,
                  fathom_link:newSessionNote.fathomLink, date:newSessionNote.date,
                }])
                setNewSessionNote({ title:'',content:'',fathomLink:'',date:new Date().toISOString().split('T')[0] })
                await loadAthleteProfile(selectedAthlete)
                setSavingNote(false)
              }}>{savingNote?'SAVING...':'💾 SAVE SESSION NOTES'}</button>
            </div>
            {sessionNotes.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}>
                <div style={{ fontSize:13,color:'#555' }}>No session notes yet. Add above! 🎙️</div>
              </div>
            ) : sessionNotes.map((note,i)=>(
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                  <div style={{ fontSize:14,fontWeight:800 }}>{note.title}</div>
                  <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{note.date}</div>
                </div>
                {note.fathom_link && (
                  <a href={note.fathom_link} target="_blank" rel="noreferrer"
                    style={{ display:'inline-block',background:'#1e1e1e',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:800,color:'#ff3d00',textDecoration:'none',marginBottom:8 }}>
                    🎙️ VIEW RECORDING
                  </a>
                )}
                {note.content && <div style={{ fontSize:12,color:'#aaa',lineHeight:1.6,whiteSpace:'pre-wrap' }}>{note.content}</div>}
              </div>
            ))}
          </>}

          {/* ACTION STEPS */}
          {athleteProfileTab==='feedback' && (
            athleteActionSteps.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}><div style={{ fontSize:13,color:'#555' }}>No action steps yet.</div></div>
            ) : athleteActionSteps.map((s,i)=>(
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                  <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2 }}>{s.date} · {s.session_type}</div>
                  <div style={{ fontSize:10,color:'#555' }}>{s.did_steps==='Yes'?'✅':'❌'}</div>
                </div>
                <div style={{ display:'flex',gap:12,marginBottom:8 }}>
                  {['conditioning','strength','technical','mental'].map(k=>(
                    <div key={k} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:16,fontWeight:900,color:'#ff3d00' }}>{s[k]}</div>
                      <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {[['shark','🦈'],['goldfish','🐠'],['selftalk','💬'],['tuneout','🔇']].map(([k,icon])=>s[k+'_used']&&(
                    <span key={k} style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 8px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>{icon}</span>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* CHECK-INS */}
          {athleteProfileTab==='checkins' && (
            athleteCheckins.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}><div style={{ fontSize:13,color:'#555' }}>No check-ins yet.</div></div>
            ) : athleteCheckins.map((c,i)=>(
              <div key={i} style={C.card}>
                <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2,marginBottom:8 }}>{c.week}</div>
                <div style={{ display:'flex',gap:14,marginBottom:8 }}>
                  {[['energy_level','⚡'],['confidence_level','💪'],['sessions_completed','🏃']].map(([k,icon])=>(
                    <div key={k} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:18,fontWeight:900,color:'#ff3d00' }}>{c[k]}</div>
                      <div style={{ fontSize:9,color:'#555' }}>{icon}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:12,color:'#aaa',marginBottom:4 }}>🏆 {c.biggest_win}</div>
                {c.biggest_challenge && <div style={{ fontSize:12,color:'#666',marginBottom:4 }}>💥 {c.biggest_challenge}</div>}
                {c.goal_next_week && <div style={{ fontSize:12,color:'#555',marginBottom:4 }}>🎯 {c.goal_next_week}</div>}
                {c.message_to_coach && <div style={{ fontSize:11,color:'#ff3d00',fontStyle:'italic',marginTop:6 }}>"{c.message_to_coach}"</div>}
              </div>
            ))
          )}

          {/* BALL MASTERY */}
          {athleteProfileTab==='ball' && (
            athleteBallMastery.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}><div style={{ fontSize:13,color:'#555' }}>No ball mastery sessions yet.</div></div>
            ) : athleteBallMastery.map((b,i)=>(
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between' }}>
                  <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{b.date}</div>
                  <div style={{ fontSize:10,color:'#555' }}>{b.total_skills} skills · {b.total_reps} reps</div>
                </div>
                {b.notes && <div style={{ fontSize:11,color:'#555',marginTop:4 }}>{b.notes}</div>}
              </div>
            ))
          )}

          {/* MESSAGES */}
          {athleteProfileTab==='messages' && (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              <div style={{ ...C.card,maxHeight:360,overflowY:'auto' }}>
                {athleteMessages.length===0 ? (
                  <div style={{ textAlign:'center',padding:20,fontSize:13,color:'#555' }}>No messages yet. Start the conversation! 💬</div>
                ) : athleteMessages.map((m,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:m.sender_id===user.id?'flex-end':'flex-start',marginBottom:8 }}>
                    <div style={{ maxWidth:'80%',background:m.sender_id===user.id?'#ff3d00':'#1e1e1e',borderRadius:10,padding:'8px 12px' }}>
                      <div style={{ fontSize:9,color:'rgba(255,255,255,0.6)',marginBottom:3 }}>{m.profiles?.full_name||'Athlete'}</div>
                      <div style={{ fontSize:13 }}>{m.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <input style={{ ...C.inp,flex:1 }} placeholder="Message athlete..."
                  value={newCoachMsg} onChange={e=>setNewCoachMsg(e.target.value)}
                  onKeyDown={async e=>{
                    if(e.key==='Enter'&&newCoachMsg.trim()){
                      await supabase.from('coach_messages').insert([{ sender_id:user.id,athlete_id:selectedAthlete.id,content:newCoachMsg }])
                      setNewCoachMsg('')
                      await loadAthleteProfile(selectedAthlete)
                    }
                  }} />
                <button onClick={async()=>{
                  if(!newCoachMsg.trim()) return
                  await supabase.from('coach_messages').insert([{ sender_id:user.id,athlete_id:selectedAthlete.id,content:newCoachMsg }])
                  setNewCoachMsg('')
                  await loadAthleteProfile(selectedAthlete)
                }} style={{ background:'#ff3d00',border:'none',borderRadius:10,padding:'0 14px',fontSize:16,cursor:'pointer' }}>→</button>
              </div>
            </div>
          )}
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

