import { useId, useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import {
  CYCLE_PHASES, PLANNING_TEMPLATES, TEMPLATE_LABELS, WORK_TYPES, WORK_TYPE_LABELS,
  createDefaultCyclePreferences, type CyclePhase, type CyclePreferences, type PlanningTemplate, type WorkType,
} from '../../domain/cyclePreferences'
import './CyclePreferencesScreen.css'

export interface CyclePreferencesScreenProps {
  value: CyclePreferences
  onSave: (value: CyclePreferences) => void
  onBack: () => void
}

const TEMPLATE_DESCRIPTIONS: Record<PlanningTemplate, string> = {
  balanced: 'Prefer a matching estimated phase, then the earliest time that fits.',
  'high-output': 'Prefer a matching estimated phase, then place work closer to other flexible blocks.',
  recovery: 'Prefer a matching estimated phase, then a day with less planned work.',
}

function copyPreferences(value: CyclePreferences): CyclePreferences {
  return { template: value.template, phaseWork: {
    Menstrual: [...value.phaseWork.Menstrual],
    Follicular: [...value.phaseWork.Follicular],
    Ovulatory: [...value.phaseWork.Ovulatory],
    Luteal: [...value.phaseWork.Luteal],
  } }
}

export function CyclePreferencesScreen({ value, onSave, onBack }: CyclePreferencesScreenProps) {
  const [draft, setDraft] = useState(() => copyPreferences(value))
  const templateName = useId()
  const toggleWorkType = (phase: CyclePhase, workType: WorkType) => {
    setDraft(current => ({ ...current, phaseWork: { ...current.phaseWork,
      [phase]: current.phaseWork[phase].includes(workType)
        ? current.phaseWork[phase].filter(type => type !== workType)
        : [...current.phaseWork[phase], workType],
    } }))
  }

  return (
    <main className="cycle-preferences-screen live-content-screen">
      <AppHeader title="Cycle preferences" onBack={onBack} />
      <div className="cycle-preferences-screen__content">
        <section className="cycle-preferences-screen__intro">
          <span>PERSONAL PREFERENCES</span>
          <h2>Plan around what works for you</h2>
          <p>Choose the kinds of work you prefer in each estimated phase. These choices do not predict your energy or ability.</p>
        </section>

        <fieldset className="cycle-preferences-screen__templates">
          <legend>Planning template</legend>
          <p className="cycle-preferences-screen__help">These defaults guide flexible work when more than one time fits. Changing the template keeps your phase-work choices.</p>
          {PLANNING_TEMPLATES.map(template => (
            <label key={template} className={`cycle-preferences-screen__template${draft.template === template ? ' cycle-preferences-screen__template--selected' : ''}`}>
              <input type="radio" name={templateName} value={template} checked={draft.template === template}
                onChange={() => setDraft(current => ({ ...current, template }))} />
              <span><strong>{TEMPLATE_LABELS[template]}</strong><span>{TEMPLATE_DESCRIPTIONS[template]}</span></span>
            </label>
          ))}
        </fieldset>

        <section className="cycle-preferences-screen__mapping" aria-labelledby={`${templateName}-mapping`}>
          <h2 id={`${templateName}-mapping`}>Your phase-work mapping</h2>
          <p className="cycle-preferences-screen__help">Select any work types you prefer, or leave a phase empty. General tasks always stay neutral. Matching is used only when cycle context has an estimated phase.</p>
          {CYCLE_PHASES.map(phase => (
            <fieldset key={phase} className="cycle-preferences-screen__phase" data-phase={phase.toLowerCase()} aria-label={`${phase} Estimated`}>
              <legend><span className="cycle-preferences-screen__phase-dot" aria-hidden="true" />{phase}{' '}<span className="cycle-preferences-screen__estimated">Estimated</span></legend>
              {WORK_TYPES.filter(type => type !== 'general').map(workType => (
                <label key={workType} className="cycle-preferences-screen__work-type">
                  <input type="checkbox" checked={draft.phaseWork[phase].includes(workType)} onChange={() => toggleWorkType(phase, workType)} />
                  <span>{WORK_TYPE_LABELS[workType]}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <Button type="button" hierarchy="tertiary" onClick={() => setDraft(current => ({ ...current, phaseWork: createDefaultCyclePreferences().phaseWork }))}>Reset phase mapping</Button>
        </section>

        <aside className="cycle-preferences-screen__notice">
          <strong>Your constraints come first</strong>
          <p>Deadlines, availability, fixed commitments, pins and task priorities take precedence. Templates keep the full task duration and never reduce the work just to match a preference.</p>
          <p>Saved preferences guide your next plan preview. Review and apply changes before your accepted plan changes.</p>
        </aside>
        <Button type="button" onClick={() => onSave(copyPreferences(draft))}>Save preferences</Button>
        <Button type="button" hierarchy="tertiary" onClick={onBack}>Cancel</Button>
      </div>
    </main>
  )
}
