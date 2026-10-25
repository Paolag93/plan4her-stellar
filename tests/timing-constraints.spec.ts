import { chooseExactTime, chooseExactDate } from './picker-helpers'
import { expect, test } from '@playwright/test'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'
import type { AppState } from '../src/domain/types'

async function readState(page: import('@playwright/test').Page):Promise<AppState>{
 return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),STORAGE_KEY)
}

test('an edit beyond an explicit deadline is rejected before preview and preserves the saved plan',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
 const state=createInitialState()
 state.tasks=[{id:'deadline-task',title:'Submit deadline report',kind:'Flexible',importance:'Must',duration:'60 min',meta:'60 min',deadline:'2026-10-12'}]
 state.acceptedPlan=generateWeeklyPlan({...state,weekStart:'2026-10-12'})
 state.draftPlan=state.acceptedPlan;state.onboardingComplete=true
 await page.addInitScript(({key,state})=>{if(!sessionStorage.getItem('timing-seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('timing-seeded','yes')}},{key:STORAGE_KEY,state})
 await page.goto('/')
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Plan',exact:true}).click()
 await page.getByRole('button',{name:'Actions for Submit deadline report',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Edit or move/}).click()
 await chooseExactDate(page, '2026-10-14')
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText(/deadline/i)
 await expect(page.locator('.edit-plan-block-screen')).toBeVisible()
 expect((await readState(page)).acceptedPlan).toEqual(state.acceptedPlan)
 expect((await readState(page)).history).toEqual([])
 // A valid correction remains usable after the rejected edit.
 await chooseExactDate(page, '2026-10-12')
 await chooseExactTime(page, '10:00')
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 await expect(page.locator('.adjust-scope-screen')).toBeVisible()
 await page.getByRole('radio',{name:/Rest of the week/}).click()
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 await page.getByRole('button',{name:/^Apply changes?$/}).click()
 await expect.poll(async()=>(await readState(page)).acceptedPlan?.blocks[0].start).toBe('10:00')
 await page.reload()
 expect((await readState(page)).acceptedPlan?.blocks[0]).toMatchObject({dateISO:'2026-10-12',start:'10:00'})
})
