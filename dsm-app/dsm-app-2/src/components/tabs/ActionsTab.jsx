import ActionForm from '../ActionForm.jsx'
import ActionsSubNav from './ActionsSubNav.jsx'
import { submitActionSteps, getActionSteps } from '../../lib/supabase.js'

export default function ActionsTab({ user, profile, submissions, setSubmissions, setTab }) {
  return (
    <div className="fade">
      <ActionsSubNav active="steps" setTab={setTab} />
      <ActionForm
        playerName={profile?.full_name || user?.email}
        initialSubmissions={submissions}
        onSubmit={async (formData) => {
          const { error } = await submitActionSteps(formData, user.id)
          if (error) {
            alert('Error saving: ' + (error.message || JSON.stringify(error)))
            return
          }
          const { data: updated } = await getActionSteps(user.id)
          setSubmissions(updated || [])
          alert('✅ Action steps submitted to Coach Valentino!')
          setTab('home')
        }}
      />
    </div>
  )
}
