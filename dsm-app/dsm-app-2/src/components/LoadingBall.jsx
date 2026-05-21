/**
 * CSS-only 3D-feeling soccer ball loading screen.
 * - Sphere body via radial-gradient on a circle (lighting illusion)
 * - Truncated-icosahedron pentagon/hexagon pattern via inline SVG mask
 * - Rotates around the Y axis with perspective for the 3D parallax feel
 * - DSM logo + player name (cached from prior signin) anchored to viewer
 *   so they don't spin with the ball
 *
 * No JS animation, no payload — works before React even mounts content.
 */
export default function LoadingBall() {
  const name = (typeof localStorage !== 'undefined' && localStorage.getItem('dsm_player_name')) || ''
  const firstName = name.split(' ')[0] || ''

  return (
    <div style={shell}>
      <style>{css}</style>

      <div className="dsm-stage">
        <div className="dsm-ball-spin">
          <div className="dsm-ball" />
          <div className="dsm-ball-shine" />
        </div>
      </div>

      <div className="dsm-shadow" />

      {firstName ? (
        <div className="dsm-name-line">{firstName}</div>
      ) : (
        <div className="dsm-wordmark">DiLorenzo Soccer Mindset</div>
      )}
      <div className="dsm-tag">{firstName ? 'Lacing up' : 'Loading'}</div>
    </div>
  )
}

const shell = {
  position: 'fixed', inset: 0,
  background: '#000',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: 28,
  overflow: 'hidden',
}

const css = `
@keyframes dsm-spin   { from { transform: rotateY(0deg);   } to { transform: rotateY(360deg);   } }
@keyframes dsm-bob    { 0%,100% { transform: translateY(0)  } 50% { transform: translateY(-10px) } }
@keyframes dsm-shadow { 0%,100% { transform: translateX(-50%) scaleX(1)   ; opacity: 0.45 } 50% { transform: translateX(-50%) scaleX(0.78); opacity: 0.22 } }
@keyframes dsm-fade   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

.dsm-stage {
  position: relative;
  width: 220px; height: 220px;
  perspective: 900px;
  perspective-origin: 50% 40%;
  animation: dsm-bob 3.4s ease-in-out infinite;
}

.dsm-ball-spin {
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  animation: dsm-spin 5.2s linear infinite;
}

/* The ball itself: radial-gradient sphere + soccer-ball SVG pattern mask */
.dsm-ball {
  position: absolute; inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%,
      #ffffff 0%, #f4f4f4 18%, #d8d8d8 42%, #8a8a8a 78%, #2a2a2a 100%);
  box-shadow:
    inset -22px -22px 60px rgba(0,0,0,0.55),
    inset 14px 14px 36px rgba(255,255,255,0.18),
    0 30px 60px -20px rgba(255,255,255,0.18);
}

/* Hex/pent texture — SVG repeated as background-image overlay */
.dsm-ball::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: 50%;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><pattern id='hex' x='0' y='0' width='40' height='34.64' patternUnits='userSpaceOnUse'><polygon points='20,2 38,11.5 38,28.5 20,38 2,28.5 2,11.5' fill='none' stroke='%23111' stroke-width='1.4'/><polygon points='0,28.5 0,45.5 -20,55 -20,55 0,28.5' fill='none' stroke='%23111' stroke-width='1.4'/></pattern><radialGradient id='fade' cx='0.5' cy='0.5' r='0.5'><stop offset='65%25' stop-color='white' stop-opacity='1'/><stop offset='100%25' stop-color='white' stop-opacity='0'/></radialGradient><mask id='m'><circle cx='100' cy='100' r='100' fill='url(%23fade)'/></mask></defs><rect width='200' height='200' fill='url(%23hex)' mask='url(%23m)'/><polygon points='100,55 122,68 114,92 86,92 78,68' fill='%23111'/><text x='100' y='83' font-family='Bebas Neue, Oswald, Arial Narrow, sans-serif' font-size='14' font-weight='400' fill='white' text-anchor='middle' letter-spacing='1.6'>DSM</text><polygon points='55,108 70,98 84,108 80,124 60,124' fill='%23111'/><polygon points='145,108 130,98 116,108 120,124 140,124' fill='%23111'/><polygon points='100,150 78,140 86,118 114,118 122,140' fill='%23111' opacity='0.55'/></svg>");
  background-size: cover;
  opacity: 0.85;
  mix-blend-mode: multiply;
}

/* A second highlight that doesn't spin — fixed specular glint */
.dsm-ball-shine {
  position: absolute; inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 22%);
  pointer-events: none;
}

.dsm-name-line {
  font-family: 'Bebas Neue', 'Oswald', 'Arial Narrow', sans-serif;
  font-size: 38px;
  font-weight: 400;
  letter-spacing: 4px;
  color: #fafafa;
  text-transform: uppercase;
  text-shadow: 0 0 14px rgba(255,255,255,0.55), 0 0 28px rgba(255,255,255,0.3), 0 0 56px rgba(255,255,255,0.15);
  margin-top: -8px;
  animation: dsm-fade 0.7s ease both;
}
.dsm-wordmark {
  font-family: 'Bebas Neue', 'Oswald', 'Arial Narrow', sans-serif;
  font-size: 18px;
  letter-spacing: 6px;
  color: #fafafa;
  text-transform: uppercase;
  text-shadow: 0 0 14px rgba(255,255,255,0.55), 0 0 28px rgba(255,255,255,0.3);
  margin-top: -8px;
  animation: dsm-fade 0.7s ease both;
}

.dsm-shadow {
  position: absolute; bottom: 22%; left: 50%;
  width: 180px; height: 18px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.18), rgba(255,255,255,0));
  filter: blur(6px);
  animation: dsm-shadow 3.4s ease-in-out infinite;
}

.dsm-tag {
  font-family: 'Bebas Neue', 'Oswald', sans-serif;
  font-size: 11px; letter-spacing: 4px;
  color: #555; font-weight: 400;
  text-transform: uppercase;
}
`
