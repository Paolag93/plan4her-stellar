import { expect,test } from '@playwright/test'
import { createInitialState,STORAGE_KEY } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'

for(const width of [320,360,390,430,1024])test(`${width}px: live backlog selection checkmark stays centered in its checkbox and touch target`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:844})
 await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
 const state=createInitialState();state.tasks=[{id:'check-center',title:'Centered task check',kind:'Flexible',duration:'30 min',meta:'30 min'}]
 state.acceptedPlan=generateWeeklyPlan({...state,tasks:[],weekStart:'2026-10-12'});state.draftPlan=state.acceptedPlan;state.onboardingComplete=true
 await page.goto('/');await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:STORAGE_KEY,state});await page.reload()
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Tasks',exact:true}).click()
 const row=page.locator('.p4h-task-card').filter({hasText:'Centered task check'}),control=row.locator('.p4h-task-card__check-touch')
 for(const done of [false,true,false]){
  if(await control.getAttribute('aria-pressed')!==String(done))await control.click()
  await expect(control).toHaveAttribute('aria-pressed',String(done))
  const positions=await row.evaluate(el=>{
   const box=(selector:string)=>{const r=el.querySelector(selector)!.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}}
   return {target:box('.p4h-task-card__check-touch'),checkbox:box('.p4h-task-card__checkbox'),path:el.querySelector('path')?box('path'):null}
  })
  expect(positions.target.width).toBeGreaterThanOrEqual(44);expect(positions.target.height).toBeGreaterThanOrEqual(44)
  expect(Math.abs(positions.target.x-positions.checkbox.x)).toBeLessThan(.5)
  expect(Math.abs(positions.target.y-positions.checkbox.y)).toBeLessThan(.5)
  if(done){
   expect(Math.abs(positions.path!.x-positions.checkbox.x)).toBeLessThan(.5)
   expect(Math.abs(positions.path!.y-positions.checkbox.y)).toBeLessThan(.5)
   if(width===390)await page.screenshot({path:testInfo.outputPath('live-tasks-centered-check.png')})
  }else expect(positions.path).toBeNull()
 }
 await page.reload();await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Tasks',exact:true}).click()
 await expect(page.getByRole('button',{name:'Select Centered task check for planning',exact:true})).toHaveAttribute('aria-pressed','false')
 await expect(page.getByRole('button',{name:'Mark Centered task check done',exact:true})).toBeVisible()
})
