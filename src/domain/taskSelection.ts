import type { Availability, PlanProposal, PlannerInput, TaskItem, WeeklyPlan } from './types'
import { comparePlanBlocks } from '../features/plan/planData'
import { validatePlan } from './changes'
import { availabilityWindow, clone, clock, durationMinutes, generateWeeklyPlan, localISO, minutes, overlaps, recalculate, resolveDate } from './planner'

/** Selected backlog additions are an atomic preview. Existing blocks, including
 * partial/completed work, are reservations and are never regenerated. */
export function proposeTaskSelection(
  plan: WeeklyPlan | null,
  input: PlannerInput,
  selectedTaskIds: string[],
  planningDate?: string,
): PlanProposal {
  const now = new Date(), today = planningDate ?? localISO(now)
  const selected = [...new Set(selectedTaskIds)]
  const base = plan ? clone(plan) : generateWeeklyPlan({ ...input, tasks: [], weekStart: input.weekStart ?? today })
  if (!plan && !input.commitments.length) base.warnings = []
  const result = (after: WeeklyPlan, errors: string[] = []): PlanProposal => ({
    kind: 'adjust', label: `Add ${selected.length} ${selected.length === 1 ? 'task' : 'tasks'} to plan`,
    before: clone(plan), after: clone(after), selectedTaskIds: selected,
    changes: errors.length ? [] : comparePlanBlocks(plan?.blocks ?? [], after.blocks), errors,
  })
  const selectedTasks = selected.map((id) => input.tasks.find((task) => task.id === id))
  const errors: string[] = []
  if (!selected.length) errors.push('Select at least one unscheduled task to add to your plan.')
  for (let i = 0; i < selected.length; i++) {
    const task = selectedTasks[i]
    if (!task) { errors.push('A selected task no longer exists. Choose your tasks again.'); continue }
    if (task.done) errors.push(`${task.title}: completed tasks cannot be added to the plan.`)
    if (base.blocks.some((block) => block.taskId === task.id)) errors.push(`${task.title}: this task is already in your plan.`)
    if (task.deadline && task.deadline !== 'No deadline' && !resolveDate(task.deadline, base.week)) errors.push(`${task.title}: enter a valid deadline before planning.`)
    if (task.kind === 'Fixed') {
      const date = resolveDate(task.fixedDate, base.week)
      const now = new Date(), earliest = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15
      if (date && (date < today || (date === today && today === localISO() && minutes(task.startTime ?? '') < earliest))) errors.push(`${task.title}: the fixed start time has passed. Edit the task before adding it.`)
    }
  }
  if (errors.length) return result(base, errors)

  const availability: Availability = { ...input.availability }
  for (const day of base.week) {
    if (day.dateISO! < today) availability[day.label as keyof Availability] = ''
    else if (day.dateISO === today && today === localISO()) {
      const window = availabilityWindow(availability[day.label as keyof Availability])
      const now = new Date(), start = Math.max(window?.[0] ?? 1440, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15)
      availability[day.label as keyof Availability] = window && start < window[1] ? `${clock(start)}–${clock(window[1])}` : ''
    }
  }
  // Fixed task reservations also support an existing block ending at midnight.
  // The commitment parser deliberately accepts clock times only through 23:59.
  const taskIds = new Set([...input.tasks.map((task) => task.id), ...(base.deferredTaskIds ?? [])])
  const reservations: TaskItem[] = base.blocks.map((block, index) => {
    let id = `__plan-reservation-${index}`
    while (taskIds.has(id)) id += '-reserved'
    taskIds.add(id)
    return { id, title: block.title, kind: 'Fixed', meta: block.duration, duration: block.duration, fixedDate: block.dateISO, startTime: block.start }
  })
  const commitments = input.commitments.filter((commitment) => !base.blocks.some((block) => block.id === `commitment-${commitment.id}`))
  const generated = generateWeeklyPlan({
    ...input, weekStart: base.weekStart, availability, commitments,
    templateAnchors: base.blocks.filter(block => !block.fixed),
    deferredTaskIds: base.deferredTaskIds?.filter((id) => !selected.includes(id)),
    tasks: [...reservations, ...selectedTasks as TaskItem[]],
  })
  errors.push(...generated.unscheduled.map((task) => `${task.title}: ${task.reason}`), ...generated.warnings)
  const additions = generated.blocks.filter((block) => block.taskId && selected.includes(block.taskId))
  if (additions.length !== selected.length && !errors.length) errors.push('All selected tasks must fit before any can be added. Try fewer tasks or edit your availability.')
  if (errors.length) return result(base, [...new Set(errors)])

  const after = recalculate({
    ...base,
    blocks: [...base.blocks, ...additions],
    unscheduled: base.unscheduled.filter((task) => !selected.includes(task.taskId)),
    ...(base.deferredTaskIds ? { deferredTaskIds: base.deferredTaskIds.filter((id) => !selected.includes(id)) } : {}),
    availableMinutes: Object.values(input.availability).reduce((sum, value) => { const window = availabilityWindow(value); return sum + (window ? window[1] - window[0] : 0) }, 0),
  })
  const preview = result(after)
  const validation = [...validatePlan(after, input.availability, input.tasks), ...validateTaskSelectionProposal(preview, input)]
  return validation.length ? result(base, [...new Set(validation)]) : preview
}

/** Also called at Apply: task inputs may change while the plan stays identical.
 * Other proposal kinds keep their existing editing/recovery semantics. */
export function validateTaskSelectionProposal(proposal: PlanProposal, input: PlannerInput, now = new Date()): string[] {
  if (!proposal.selectedTaskIds) return []
  const errors: string[] = [], selected = new Set(proposal.selectedTaskIds)
  const beforeBlocks = proposal.before?.blocks ?? []
  const oldIds = new Set(beforeBlocks.map((block) => block.id))
  const additions = proposal.after.blocks.filter((block) => !oldIds.has(block.id))
  if (!selected.size) errors.push('Select at least one unscheduled task to add to your plan.')
  for (const old of beforeBlocks) {
    if (JSON.stringify(proposal.after.blocks.find((block) => block.id === old.id)) !== JSON.stringify(old)) errors.push(`${old.title}: existing plan blocks must stay unchanged when adding tasks.`)
  }
  for (const id of selected) {
    const task = input.tasks.find((item) => item.id === id)
    if (!task || task.done) { errors.push(`${task?.title ?? 'A selected task'}: this task is no longer available to plan. Preview your selection again.`); continue }
    if (beforeBlocks.some((block) => block.taskId === id)) errors.push(`${task.title}: this task is already in your plan.`)
    const blocks = additions.filter((block) => block.taskId === id)
    if (blocks.length !== 1) { errors.push(`${task.title}: the full selected task must fit in the plan.`); continue }
    const block = blocks[0]
    const startsAt = new Date(`${block.dateISO}T${block.start}:00`).getTime()
    if (Number.isFinite(startsAt) && startsAt < now.getTime()) errors.push(`${task.title}: the planned start time has passed. Preview your selection again.`)
    if (block.status !== 'scheduled' || durationMinutes(block.duration) !== durationMinutes(task.duration)) errors.push(`${task.title}: keep the full task duration. Preview your selection again.`)
    const deadline = resolveDate(task.deadline, proposal.after.week)
    if (task.deadline && task.deadline !== 'No deadline' && !deadline) errors.push(`${task.title}: enter a valid deadline before planning.`)
    if (deadline && block.dateISO! > deadline) errors.push(`${task.title}: must finish on or before the deadline (${deadline}).`)
    if (task.kind === 'Fixed') {
      if (!block.fixed || block.dateISO !== resolveDate(task.fixedDate, proposal.after.week) || minutes(block.start) !== minutes(task.startTime ?? '')) errors.push(`${task.title}: keep the chosen fixed date and start time. Preview your selection again.`)
    } else if (block.fixed) errors.push(`${task.title}: this task is flexible. Preview your selection again.`)
    for (const commitment of input.commitments) {
      const date = resolveDate(commitment.date, proposal.after.week)
      const start = minutes(commitment.startTime), end = minutes(commitment.endTime)
      if (block.dateISO === date && minutes(block.start) < end && start < minutes(block.start) + durationMinutes(block.duration)) errors.push(`${task.title}: overlaps the fixed commitment ${commitment.title}.`)
    }
  }
  for (const block of additions) {
    // Without a previous plan, current fixed commitments form the initial plan.
    const initialCommitment = !proposal.before && !block.taskId ? input.commitments.find((commitment) => block.id === `commitment-${commitment.id}`) : undefined
    const isInitialCommitment = Boolean(initialCommitment)
    if (initialCommitment && (!block.fixed || block.dateISO !== resolveDate(initialCommitment.date, proposal.after.week) || minutes(block.start) !== minutes(initialCommitment.startTime) || durationMinutes(block.duration) !== minutes(initialCommitment.endTime) - minutes(initialCommitment.startTime))) errors.push(`${block.title}: the fixed commitment changed. Preview your selection again.`)
    if (!isInitialCommitment && (!block.taskId || !selected.has(block.taskId))) errors.push(`${block.title}: only selected unscheduled tasks can be added.`)
  }
  if (new Set(proposal.after.blocks.map((block) => block.id)).size !== proposal.after.blocks.length) errors.push('A selected task conflicts with an existing block. Preview your selection again.')
  for (let i = 0; i < additions.length; i++) for (let j = i + 1; j < additions.length; j++) if (overlaps(additions[i], additions[j])) errors.push(`${additions[i].title} overlaps ${additions[j].title}.`)
  return [...new Set(errors)]
}
