import { WORK_TYPES, type WorkType } from './cyclePreferences'
import type { TaskItem } from './types'

/**
 * Local, deterministic activity classifier. It infers a planner work type from a task's own words with weighted
 * keyword rules. It is not an AI model, runs entirely on the device, and sends nothing anywhere.
 * When nothing matches, or two different activity types score equally, it returns 'general' (no phase preference)
 * instead of guessing.
 */
type Rule = { type: Exclude<WorkType, 'general'>; strong: string[]; weak?: string[] }

const RULES: Rule[] = [
  { type: 'energizing-movement', strong: ['strength', 'workout', 'work out', 'gym', 'running', 'morning run', 'go for a run', '5k', '10k', 'jog', 'jogging', 'hiit', 'cardio', 'spin class', 'cycling', 'bike ride', 'boxing', 'crossfit', 'weights', 'weightlifting', 'lifting', 'swim', 'swimming', 'dance class', 'tennis', 'football', 'soccer', 'climbing', 'hike', 'hiking', 'bootcamp', 'circuit'], weak: ['training', 'exercise', 'sport'] },
  { type: 'restorative', strong: ['yoga', 'stretch', 'stretching', 'meditate', 'meditation', 'nap', 'massage', 'bath', 'breathwork', 'breathing', 'self care', 'self-care', 'spa', 'rest', 'recovery', 'restorative', 'mobility'], weak: ['gentle', 'walk', 'relax', 'sleep'] },
  { type: 'communication', strong: ['present', 'presentation', 'pitch', 'meeting', 'interview', 'networking', 'webinar', 'workshop session', 'coffee with', 'lunch with', 'dinner with', 'drinks with', 'reel', 'podcast', 'livestream', 'talk', 'speech', 'demo day'], weak: ['client', 'record', 'video', 'promo', 'slides', 'call with', 'catch up', 'catch-up'] },
  { type: 'creation-start', strong: ['deep work', 'write', 'writing', 'draft', 'design', 'brainstorm', 'prototype', 'sketch', 'compose', 'create', 'creating', 'build', 'outline'], weak: ['proposal', 'research', 'code', 'coding', 'develop', 'start', 'launch', 'idea', 'ideas', 'article', 'blog'] },
  { type: 'finishing-admin', strong: ['admin', 'expenses', 'expense', 'invoice', 'invoices', 'taxes', 'tax', 'budget', 'bills', 'paperwork', 'finalize', 'finalise', 'finish', 'reconcile', 'inbox', 'emails', 'follow up', 'follow-up', 'declutter', 'organize', 'organise', 'filing'], weak: ['pay', 'report', 'submit', 'email', 'tidy', 'savings', 'accounts', 'forms'] },
  { type: 'review-planning', strong: ['priorities', 'weekly review', 'plan the week', 'planning', 'retrospective', 'retro', 'reflect', 'reflection', 'journal', 'journaling', 'goals', 'roadmap'], weak: ['plan', 'review', 'agenda', 'schedule'] },
]

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ -]/g, '[ -]?')
const pattern = (words: string[]) => words.length ? new RegExp(`(?:^|[^a-z])(?:${words.map(escape).join('|')})(?=$|[^a-z])`, 'g') : null
const COMPILED = RULES.map(rule => ({ type: rule.type, strong: pattern(rule.strong), weak: pattern(rule.weak ?? []) }))

/** Scores each activity type from the text: strong words count 2, weak words 1. */
export function scoreActivity(text: string): Partial<Record<WorkType, number>> {
  const normalized = ` ${text.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ')} `
  const scores: Partial<Record<WorkType, number>> = {}
  for (const rule of COMPILED) {
    const score = 2 * (rule.strong ? normalized.match(rule.strong)?.length ?? 0 : 0) + (rule.weak ? normalized.match(rule.weak)?.length ?? 0 : 0)
    if (score) scores[rule.type] = score
  }
  return scores
}

/** Infers the activity type from a task's words. Ambiguous or unmatched text stays 'general'. */
export function inferWorkType(...texts: Array<string | undefined>): WorkType {
  const ranked = Object.entries(scoreActivity(texts.filter(Boolean).join(' '))).sort((a, b) => b[1] - a[1])
  if (!ranked.length || (ranked[1] && ranked[1][1] === ranked[0][1])) return 'general'
  return ranked[0][0] as WorkType
}

/** The type the planner uses: a stored type (including an explicit 'general') wins; otherwise it is inferred. */
export function effectiveWorkType(task: Pick<TaskItem, 'title' | 'workType'>): WorkType {
  return WORK_TYPES.find(type => type === task.workType) ?? inferWorkType(task.title)
}
