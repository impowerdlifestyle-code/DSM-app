import { C, tokens as t } from '../../styles.js'
import { PARENT_GUIDE } from '../../lib/constants.js'

export default function ParentsTab() {
  return (
    <div style={C.scroll} className="fade">
      <div style={C.title}>PARENTS</div>
      <div style={C.sub}>BEST PRACTICES GUIDE</div>
      <div style={C.orange}>
        <span style={C.olbl}>FROM COACH VALENTINO</span>
        <div style={{ fontSize:15, fontWeight:700, lineHeight:1.4 }}>"Parents are the most influential people in a young athlete's mental development. Here's how to help -- not hurt."</div>
      </div>
      {PARENT_GUIDE.map((item, i) => (
        <div key={i} style={C.card}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ fontSize:22 }}>{item.icon}</div>
            <div style={{ fontSize:15, fontWeight:800 }}>{item.title}</div>
          </div>
          <div style={{ fontSize:13, color:t.color.textDim, lineHeight:1.6 }}>{item.content}</div>
        </div>
      ))}
    </div>
  )
}
