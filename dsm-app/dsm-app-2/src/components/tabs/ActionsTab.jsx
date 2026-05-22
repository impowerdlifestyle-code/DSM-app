import ActionForm from '../ActionForm.jsx'
import ActionsSubNav from './ActionsSubNav.jsx'
import { submitActionSteps, getActionSteps, awardXp } from '../../lib/supabase.js'
import { XP_TABLE } from '../../data/gamification.js'

export default function ActionsTab({ user, profile, submissions, setSubmissions, setTab, onActionSaved, hideWorkouts }) {
  return (
    <div className="fade">
      <ActionsSubNav active="steps" setTab={setTab} hideWorkouts={hideWorkouts} />
      <ActionForm
        playerName={profile?.full_name || user?.email}
        initialSubmissions={submissions}
        onSubmit={async (formData) => {
          const { error } = await submitActionSteps(formData, user.id)
          if (error) {
            alert('Error saving: ' + (error.message || JSON.stringify(error)))
            return
          }
          await awardXp(user.id, 'action_step', XP_TABLE.actionStep, null, formData.sessionType)
          if (onActionSaved) await onActionSaved()
          const { data: updated } = await getActionSteps(user.id)
          setSubmissions(updated || [])
          alert(`✅ Action steps submitted · +${XP_TABLE.actionStep} XP`)
          setTab('home')
        }}
      />
    </div>
  )
}
