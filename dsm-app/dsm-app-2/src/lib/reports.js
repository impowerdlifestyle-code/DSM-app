export async function downloadReport(athleteData, actionSteps, checkins, ballMasteryData, forCoach = false) {
  const name = athleteData?.full_name || athleteData?.email || 'Athlete'
  const today = new Date().toLocaleDateString()

  // ── EXCEL ──
  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
    const wb = XLSX.utils.book_new()

    const sessionRows = [['Date','Day','Session','Did Steps','Shark','Goldfish','Self Talk','Tune Out','Conditioning','Strength','Technical','Mental']]
    actionSteps.forEach(s => {
      sessionRows.push([s.date, s.day_of_week, s.session_type, s.did_action_steps,
        s.shark_used?'✅':'', s.goldfish_used?'✅':'', s.selftalk_used?'✅':'', s.tuneout_used?'✅':'',
        s.conditioning, s.strength, s.technical, s.mental])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sessionRows), 'All Sessions')

    const weekRows = [['Week','Energy','Confidence','Sessions','Biggest Win','Biggest Challenge']]
    checkins.forEach(c => {
      weekRows.push([c.week, c.energy_level, c.confidence_level, c.sessions_completed, c.biggest_win, c.biggest_challenge])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(weekRows), 'Weekly Check-Ins')

    const tools = ['shark','goldfish','selftalk','tuneout']
    const toolRows = [['Tool','Times Used','Usage %','Occasions']]
    tools.forEach(t => {
      const used = actionSteps.filter(s=>s[t+'_used']).length
      const pct = actionSteps.length ? Math.round((used/actionSteps.length)*100) : 0
      const occasions = actionSteps.filter(s=>s[t+'_used']&&s[t+'_occasion']).map(s=>s[t+'_occasion']).join(' | ')
      toolRows.push([t.charAt(0).toUpperCase()+t.slice(1)+' Mentality', used, pct+'%', occasions])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toolRows), 'Mental Tools')

    const perfRows = [['Date','Conditioning','Strength','Technical','Mental','Average']]
    actionSteps.forEach(s => {
      const avg = ((s.conditioning+s.strength+s.technical+s.mental)/4).toFixed(1)
      perfRows.push([s.date, s.conditioning, s.strength, s.technical, s.mental, avg])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perfRows), 'Performance Ratings')

    if (ballMasteryData?.length) {
      const bmRows = [['Date','Skills Practiced','Total Reps','Notes']]
      ballMasteryData.forEach(b => bmRows.push([b.date, b.total_skills, b.total_reps, b.notes]))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bmRows), 'Ball Mastery')
    }

    XLSX.writeFile(wb, `DSM-Progress-${name.replace(/ /g,'-')}-${today}.xlsx`)
  } catch (e) { console.error('Excel error:', e) }

  // ── PDF ──
  try {
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    const doc = new jsPDF()
    const orange = [255, 61, 0]
    const orangeLight = [255, 109, 0]
    const white = [255, 255, 255]
    const gray = [150, 150, 150]
    const dark = [20, 20, 20]
    const cardBg = [28, 28, 28]

    const pageW = 210, pageH = 297
    let y = 0
    let pageNum = 1

    function newPage() {
      doc.addPage()
      pageNum++
      doc.setFillColor(...dark)
      doc.rect(0, 0, pageW, pageH, 'F')
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

    doc.setDrawColor(...orange)
    doc.setLineWidth(0.5)
    doc.line(14, y, pageW-14, y); y += 8

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

    doc.setFillColor(...orange)
    doc.rect(0, pageH-12, pageW, 12, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(6)
    doc.setFont('helvetica','normal')
    doc.text('DiLorenzo Soccer Mindset | dsm-app-beta.vercel.app', 14, pageH-5)
    doc.text(`Coach Valentino Di Lorenzo`, pageW-14, pageH-5, { align:'right' })

    if (actionSteps.length > 0) {
      newPage()
      sectionHeader(`✅ ACTION STEPS HISTORY (${actionSteps.length} SESSIONS)`)

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

    if (checkins.length > 0) {
      newPage()
      sectionHeader(`📋 WEEKLY CHECK-IN HISTORY (${checkins.length} CHECK-INS)`)

      const avgE = (checkins.reduce((a,c)=>a+c.energy_level,0)/checkins.length).toFixed(1)
      const avgC = (checkins.reduce((a,c)=>a+c.confidence_level,0)/checkins.length).toFixed(1)
      const avgS = (checkins.reduce((a,c)=>a+c.sessions_completed,0)/checkins.length).toFixed(1)
      const smW = (pageW-28)/3-3
      ;[[14,'ENERGY AVG',avgE],[14+smW+3,'CONFIDENCE AVG',avgC],[14+2*(smW+3),'SESSIONS AVG',avgS]].forEach(([x,lbl,val]) => {
        statBox(x, y, smW, 18, lbl, val)
      })
      y += 24

      checkins.forEach((c) => {
        checkY(30)
        doc.setFillColor(...cardBg)
        doc.rect(14, y, pageW-28, 28, 'F')
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

    if (ballMasteryData?.length > 0) {
      newPage()
      sectionHeader(`⚽ BALL MASTERY HISTORY (${ballMasteryData.length} SESSIONS)`)

      const totalReps = ballMasteryData.reduce((a,b)=>a+(b.total_reps||0),0)
      statBox(14, y, 55, 18, 'TOTAL SESSIONS', ballMasteryData.length)
      statBox(73, y, 55, 18, 'TOTAL REPS', totalReps)
      statBox(132, y, 55, 18, 'AVG REPS/SESSION', Math.round(totalReps/ballMasteryData.length))
      y += 24

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

    doc.setFillColor(...orange)
    doc.rect(0, pageH-12, pageW, 12, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(6)
    doc.text('DiLorenzo Soccer Mindset | dsm-app-beta.vercel.app', 14, pageH-5)
    doc.text(`${name} | ${today}`, pageW-14, pageH-5, { align:'right' })

    doc.save(`DSM-ProgressReport-${name.replace(/ /g,'-')}-${today}.pdf`)
  } catch (e) { console.error('PDF error:', e) }
}
