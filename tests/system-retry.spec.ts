import { chooseExactTime } from './picker-helpers'
import { expect, test } from '@playwright/test'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'
import type { AppState } from '../src/domain/types'

test('failed plan save preserves the current plan and retries the same preview without generating a week',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
 const state=createInitialState()
 state.tasks=[{id:'retry-task',title:'Review pending save',kind:'Flexible',importance:'Important',duration:'60 min',meta:'60 min'}]
 state.acceptedPlan=generateWeeklyPlan({...state,weekStart:'2026-10-12'});state.draftPlan=state.acceptedPlan;state.onboardingComplete=true
 await page.addInitScript(({key,state})=>{if(!sessionStorage.getItem('retry-seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('retry-seeded','yes')}},{key:STORAGE_KEY,state})
 await page.goto('/')
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Plan',exact:true}).click()
 await page.getByRole('button',{name:'Actions for Review pending save',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Edit or move/}).click()
 await chooseExactTime(page, '14:00')
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 await page.getByRole('radio',{name:/Rest of the week/}).click()
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 await expect(page.locator('.plan-diff-screen')).toContainText('14:00')
 // Simulate a recoverable local storage write failure, without changing saved data.
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Reflect.set(window,'restoreStorageWrites',()=>{Storage.prototype.setItem=original});Storage.prototype.setItem=function(key,value){if(key==='plan4her:local-state:v1')throw new DOMException('Full','QuotaExceededError');original.call(this,key,value)}})
 await page.getByRole('button',{name:/^Apply changes?$/}).click()
 await expect(page.locator('[data-figma-node="4250:4278"]')).toBeVisible()
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!) as AppState,STORAGE_KEY)
 expect((await saved()).acceptedPlan).toEqual(state.acceptedPlan)
 expect((await saved()).history).toEqual([])
 await page.getByRole('button',{name:'Try again',exact:true}).click()
 await expect(page.locator('.plan-diff-screen')).toContainText('14:00')
 expect((await saved()).acceptedPlan).toEqual(state.acceptedPlan)
 await page.evaluate(()=>Reflect.get(window,'restoreStorageWrites')())
 await page.getByRole('button',{name:/^Apply changes?$/}).click()
 await expect.poll(async()=>(await saved()).acceptedPlan?.blocks[0].start).toBe('14:00')
 expect((await saved()).history).toHaveLength(1)
 await page.reload()
 expect((await saved()).acceptedPlan?.blocks[0].start).toBe('14:00')
})

test('live cycle date uses the canonical settings calendar and persists the selected date',async({page},testInfo)=>{
 await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
 const state=createInitialState()
 state.tasks=[{id:'calendar-task',title:'Calendar check',kind:'Flexible',duration:'30 min',meta:'30 min'}]
 state.acceptedPlan=generateWeeklyPlan({...state,weekStart:'2026-10-12'});state.draftPlan=state.acceptedPlan;state.onboardingComplete=true
 state.cycleMode='natural';state.cycleBasics={lastPeriodStart:'2026-10-05',cycleLength:28}
 await page.goto('/')
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:STORAGE_KEY,state})
 await page.reload()
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'More',exact:true}).click()
 await page.getByRole('button',{name:'Cycle context',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Your preferences',exact:true})).toBeVisible()
 await expect(page.locator('.cycle-context-summary')).toContainText('Day 8')
 await expect(page.locator('.cycle-context-summary')).toContainText('Usual length: 28 days')
 await expect(page.locator('.cycle-context-summary')).not.toContainText('Cycle context')
 await page.screenshot({path:testInfo.outputPath('live-cycle-settings.png')})
 await page.getByRole('button',{name:'Last period started',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Select last period start date'})
 await expect(dialog).toHaveAttribute('data-figma-node','4565:6154')
 await page.screenshot({path:testInfo.outputPath('live-cycle-settings-calendar.png')})
 await expect(dialog.getByRole('button',{name:'5',exact:true})).toHaveAttribute('aria-pressed','true')
 await dialog.getByRole('button',{name:'7',exact:true}).click()
 await page.getByRole('button',{name:'Save cycle context',exact:true}).click()
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).cycleBasics.lastPeriodStart,STORAGE_KEY)).toBe('2026-10-07')
 await page.reload()
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).cycleBasics.lastPeriodStart,STORAGE_KEY)).toBe('2026-10-07')
})

test('a failed recovery save returns to the identical pending preview and preserves execution',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
 const state=createInitialState()
 state.tasks=[{id:'recovery-retry',title:'Recover without losing progress',kind:'Flexible',duration:'60 min',meta:'60 min'}]
 state.acceptedPlan=generateWeeklyPlan({...state,weekStart:'2026-10-12'});state.draftPlan=state.acceptedPlan;state.onboardingComplete=true
 await page.goto('/')
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:STORAGE_KEY,state});await page.reload()
 await page.getByRole('button',{name:'Update progress',exact:true}).click()
 await page.getByRole('radio',{name:/Partially done/}).click()
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('button',{name:/Split into two/}).click()
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),STORAGE_KEY)
 const preview=await page.locator('.recovery-preview-screen').innerText()
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Reflect.set(window,'restoreStorageWrites',()=>{Storage.prototype.setItem=original});Storage.prototype.setItem=function(key,value){if(key==='plan4her:local-state:v1')throw new DOMException('Full','QuotaExceededError');original.call(this,key,value)}})
 await page.getByRole('button',{name:'Apply change',exact:true}).click()
 await expect(page.locator('[data-figma-node="4250:4278"]')).toBeVisible()
 await expect(page.locator('.recovery-preview-screen')).toBeHidden()
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),STORAGE_KEY)).toEqual(before)
 await page.getByRole('button',{name:'Try again',exact:true}).click()
 await expect(page.locator('.recovery-preview-screen')).toBeVisible()
 expect(await page.locator('.recovery-preview-screen').innerText()).toBe(preview)
 await page.evaluate(()=>Reflect.get(window,'restoreStorageWrites')())
 await page.getByRole('button',{name:'Apply change',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Plan updated',exact:true})).toBeVisible()
 const result=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),STORAGE_KEY)
 expect(result.history).toHaveLength(1)
 expect(result.acceptedPlan.blocks.filter((b:{status:string})=>b.status==='done').reduce((sum:number,b:{completedMinutes:number})=>sum+b.completedMinutes,0)).toBe(30)
})
