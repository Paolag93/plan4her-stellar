import { expect, test } from '@playwright/test'
import { createInitialState, STORAGE_KEY, fixturePlan } from '../src/domain'

test('manifest has a stable launch identity and real canonical installation icons',async({page,request})=>{
 await page.goto('/')
 const href=await page.locator('link[rel="manifest"]').getAttribute('href')
 expect(href).toBeTruthy()
 const response=await request.get(href!)
 expect(response.ok()).toBe(true)
 const manifest=await response.json()
 expect(manifest).toMatchObject({id:'/',start_url:'/',scope:'/',display:'standalone',name:'Plan4Her'})
 for(const size of [192,512]){
  const icon=manifest.icons.find((i:{sizes:string})=>i.sizes===`${size}x${size}`)
  expect(icon).toMatchObject({type:'image/png',purpose:'any'})
  expect(await page.evaluate(src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=()=>resolve(null);image.src=src}),icon.src)).toEqual([size,size])
 }
})

test('installed app shell reloads offline and keeps device-local state out of response caches',async({page,context})=>{
 const state=createInitialState();state.acceptedPlan=fixturePlan();state.draftPlan=state.acceptedPlan;state.onboardingComplete=true;state.tasks=[{id:'offline-test',title:'PRIVATE-SYNTHETIC-LOCAL-ONLY',kind:'Flexible',meta:'30 min',duration:'30 min'}]
 await page.goto('/')
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:STORAGE_KEY,state})
 const script=await page.evaluate(()=>navigator.serviceWorker.ready.then(registration=>registration.active?.scriptURL))
 expect(script).toContain('/sw.js')
 await page.reload()
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller))
 await expect(page.locator('.today-screen')).toBeVisible()
 const cached=await page.evaluate(async()=>{const result:string[]=[];for(const name of await caches.keys()){const cache=await caches.open(name);for(const request of await cache.keys())result.push(request.url)}return result})
 expect(cached.some(url=>url.includes('PRIVATE-SYNTHETIC'))).toBe(false)
 expect(cached.some(url=>url.endsWith('.woff2'))).toBe(true)
 await context.setOffline(true)
 await page.reload()
 await expect(page.locator('[data-figma-node="4250:4255"]')).toBeVisible()
 await page.getByRole('button',{name:'Continue offline',exact:true}).click()
 await expect(page.locator('.today-screen')).toBeVisible()
 await page.getByRole('button',{name:'Tasks',exact:true}).click()
 await expect(page.locator('.tasks-screen')).toContainText('PRIVATE-SYNTHETIC-LOCAL-ONLY')
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),STORAGE_KEY)
 expect(stored.tasks).toEqual(state.tasks)
 await context.setOffline(false)
 await page.reload()
 await expect(page.locator('.today-screen')).toBeVisible()
})
