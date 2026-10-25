import{expect,test}from'@playwright/test'

const cases=[
 ['today','p6-da01-today.png','4198:154'],
 ['today-tue','p6-da01-tue.png','4272:3513'],
 ['complete','p6-da03-complete.png','4198:185'],
 ['complete-partial','p6-da03-partial.png','4199:960'],
 ['recovery-missed','p6-rc01-missed.png','4198:197'],
 ['recovery-options-move','p6-rc02-move-selected.png','4199:1066'],
 ['recovery-preview-missed-move','p6-rc03-move-preview.png','4198:217'],
 ['recovery-applied-missed-move','p6-rc04-move-applied.png','4198:227'],
 ['more','p6-da07-more.png','4198:298'],
 ['cycle-context','p6-da08-cycle-context.png','4250:4081'],
 ['cycle-help','p6-help-cycle-context.png','4317:5697'],
]as const

test.describe('MVP Daily visual parity with canonical Figma',()=>{
 for(const[qa,snapshot,node]of cases){
  test(`${node} · ${qa}`,async({page})=>{
   await page.goto(`/?qa=${qa}`)
   await expect(page.locator(`[data-figma-node="${node}"]`)).toBeVisible()
   await expect(page).toHaveScreenshot(snapshot,{animations:'disabled',caret:'hide',maxDiffPixelRatio:.05,threshold:.15})
  })
 }
})
