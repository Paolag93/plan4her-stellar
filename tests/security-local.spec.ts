import { expect, test, type Page } from '@playwright/test'
import { createInitialState, MAX_STORAGE_CHARS, STORAGE_KEY } from '../src/domain/persistence'

async function rawState(page:Page){return page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)}
async function seedRaw(page:Page,raw:string){
 await page.addInitScript(({key,raw})=>{
  if(!sessionStorage.getItem('security-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('security-seed','yes')}
 },{key:STORAGE_KEY,raw})
 await page.goto('/')
}
const initial=createInitialState()
const malformed:[string,string][]=[
 ['corrupt JSON','{"version":'],
 ['future version',JSON.stringify({...initial,version:99})],
 ['prototype keys',JSON.stringify(initial).replace('"version":1','"version":1,"__proto__":{"polluted":true}')],
 ['bad date',JSON.stringify({...initial,cycleBasics:{lastPeriodStart:'2026-02-30',cycleLength:28}})],
 ['oversized data',JSON.stringify({...initial,tasks:[{id:'oversized',title:'x'.repeat(MAX_STORAGE_CHARS),kind:'Flexible',meta:'30 min'}]})],
]
for(const [name,raw] of malformed)test(`${name} stays untouched until explicit clear, then onboarding recovers`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await seedRaw(page,raw)
 await expect(page.getByRole('alert')).toContainText('Saved data could not be read')
 expect(await rawState(page)).toBe(raw)
 expect(await page.evaluate(()=>Object.prototype.hasOwnProperty.call(Object.prototype,'polluted'))).toBe(false)
 // Dismissing the warning and editing onboarding must not overwrite quarantine.
 await page.getByRole('button',{name:'Dismiss',exact:true}).click()
 await page.getByRole('button',{name:'Build my first week',exact:true}).click()
 await page.reload()
 await expect(page.getByRole('alert')).toContainText('Saved data could not be read')
 expect(await rawState(page)).toBe(raw)
 await page.getByRole('button',{name:'Review local data',exact:true}).click()
 await page.getByRole('button',{name:'Clear data on this device',exact:true}).click()
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 expect(await rawState(page)).toBe(raw)
 await page.getByRole('button',{name:'Clear data on this device',exact:true}).click()
 await page.getByRole('button',{name:'Clear data now',exact:true}).click()
 await expect(page.getByRole('button',{name:'Build my first week',exact:true})).toBeVisible()
 await expect.poll(async()=>JSON.parse((await rawState(page))??'null')?.tasks).toEqual([])
 await page.reload()
 await expect(page.getByRole('alert')).toHaveCount(0)
 expect(errors).toEqual([])
})

test('task markup stays literal after reload and analytics toggle sends no synthetic task marker',async({page})=>{
 const secret='synthetic-private-marker'
 const title=`<img src=x onerror="window.__xss=1"> ${secret} <script>window.__xss=1</script>`
 const leaks:string[]=[]
 page.on('request',request=>{
  if(request.url().includes(secret)||request.postData()?.includes(secret))leaks.push(request.url())
 })
 // A fixed Monday keeps the generated week from depending on the wall-clock time.
 await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
 await page.goto('/')
 await page.getByRole('button',{name:'Build my first week',exact:true}).click()
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('button',{name:'Continue without cycle context',exact:true}).click()
 await page.getByRole('button',{name:'Add my own task',exact:true}).click()
 await page.getByRole('textbox',{name:'Add a task · optional',exact:true}).fill(title)
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('button',{name:'Skip for now',exact:true}).click()
 await expect(page.locator('.review-plan-screen')).toBeVisible({timeout:15000})
 await expect(page.getByRole('main').getByText(title,{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Accept week',exact:true}).click()
 await page.reload()
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Tasks',exact:true}).click()
 await expect(page.getByRole('main').getByText(title,{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>Reflect.get(window,'__xss'))).toBeUndefined()
 expect(await page.locator('img[src="x"]').count()).toBe(0)
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Plan',exact:true}).click()
 await page.locator('.plan-block-card').filter({hasText:title}).getByRole('button').first().click()
 await expect(page.locator('.plan-rationale-screen')).toContainText(title)
 await page.getByRole('button',{name:'Back',exact:true}).click()
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'More',exact:true}).click()
 await page.getByRole('button',{name:'Privacy & data',exact:true}).click()
 await page.getByRole('switch',{name:'Anonymous product analytics'}).click()
 await expect.poll(async()=>JSON.parse((await rawState(page))??'null')?.analyticsConsent).toBe(true)
 await page.getByRole('switch',{name:'Anonymous product analytics'}).click()
 await expect.poll(async()=>JSON.parse((await rawState(page))??'null')?.analyticsConsent).toBe(false)
 expect(leaks).toEqual([])
 await page.getByRole('button',{name:'Clear data on this device',exact:true}).click()
 await page.getByRole('button',{name:'Clear data now',exact:true}).click()
 for(let i=0;i<3;i++){await page.goBack();await expect(page.locator('body')).not.toContainText(title);expect(await rawState(page)).not.toContain(secret)}
})

test('clearing device data also clears another open tab and cannot resurrect its old state',async({page,context})=>{
 const {fixturePlan}=await import('../src/domain/fixtures')
 const state=createInitialState();state.acceptedPlan=fixturePlan();state.draftPlan=state.acceptedPlan;state.onboardingComplete=true;state.tasks=[{id:'tab-private',title:'synthetic-second-tab-private',kind:'Flexible',meta:'30 min'}]
 await page.goto('/')
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:STORAGE_KEY,state})
 await page.reload()
 const other=await context.newPage();await other.goto('/')
 await expect(other.locator('.today-screen')).toBeVisible()
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'More',exact:true}).click()
 await page.getByRole('button',{name:'Privacy & data',exact:true}).click()
 await page.getByRole('button',{name:'Clear data on this device',exact:true}).click()
 await page.getByRole('button',{name:'Clear data now',exact:true}).click()
 await expect(other.getByRole('button',{name:'Build my first week',exact:true})).toBeVisible()
 await other.getByRole('button',{name:'Build my first week',exact:true}).click()
 await other.getByRole('checkbox',{name:'Share anonymous product usage'}).click()
 expect(await rawState(other)).not.toContain('synthetic-second-tab-private')
 await page.reload();expect(await rawState(page)).not.toContain('synthetic-second-tab-private')
 await other.close()
})

test('cycle draft rejects malformed numbers without overwriting the saved valid value',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
 await page.goto('/')
 await page.getByRole('button',{name:'Build my first week',exact:true}).click()
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('radio',{name:/Natural menstrual cycle/}).click()
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('button',{name:'Last period started',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'12',exact:true}).click()
 const field=page.getByRole('textbox',{name:'Typical cycle length · optional',exact:true})
 await field.fill('28x')
 await expect(field).toHaveAttribute('aria-invalid','true')
 await expect(field).toHaveAccessibleDescription('Enter a whole number from 15 to 90 days.')
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled()
 expect(JSON.parse((await rawState(page))!).cycleBasics.cycleLength).toBe(28)
 await expect(page.getByRole('alert')).toHaveCount(0)
 await field.fill('30')
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled()
 await expect.poll(async()=>JSON.parse((await rawState(page))!).cycleBasics.cycleLength).toBe(30)
})
