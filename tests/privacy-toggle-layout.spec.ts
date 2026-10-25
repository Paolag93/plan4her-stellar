import { expect,test } from '@playwright/test'

for(const width of [320,360,390,430])for(const height of [568,844]){
 test(`${width} × ${height}: Privacy & data toggle never clips its full explanation`,async({page},testInfo)=>{
  await page.setViewportSize({width,height})
  await page.goto('/?qa=privacy-data')
  const toggle=page.getByRole('switch',{name:'Anonymous product analytics'})
  for(const enabled of [false,true,false]){
   if((await toggle.getAttribute('aria-checked'))!==String(enabled))await toggle.click()
   await expect(toggle).toHaveAttribute('aria-checked',String(enabled))
   if(enabled&&width===390&&height===844)await page.screenshot({path:testInfo.outputPath('privacy-data-enabled-full-message.png')})
   const row=page.locator('.privacy-analytics'),copy=row.locator('p')
   await expect(copy).toHaveText(enabled?'Anonymous product analyticsEnabled · no task or cycle content is included.':'Anonymous product analyticsNo task or cycle content is included.')
   await copy.scrollIntoViewIfNeeded()
   const geometry=await row.evaluate(el=>{
    const r=el.getBoundingClientRect(),p=el.querySelector('p')!.getBoundingClientRect(),button=el.querySelector('button')!.getBoundingClientRect()
    const range=document.createRange();range.selectNodeContents(el.querySelector('p')!)
    return {rowHeight:r.height,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,copyBottom:p.bottom,rowBottom:r.bottom,textRects:Array.from(range.getClientRects()).filter(x=>x.width&&x.height).map(x=>({right:x.right,bottom:x.bottom})),copyRight:p.right,buttonLeft:button.left}
   })
   expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight)
   expect(geometry.copyBottom).toBeLessThanOrEqual(geometry.rowBottom+1)
   expect(geometry.copyRight).toBeLessThanOrEqual(geometry.buttonLeft)
   for(const rect of geometry.textRects)expect(rect.bottom).toBeLessThanOrEqual(geometry.rowBottom+1)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width)
   await page.getByRole('button',{name:'Clear data on this device',exact:true}).scrollIntoViewIfNeeded()
   await expect(page.getByRole('button',{name:'Clear data on this device',exact:true})).toBeInViewport()
  }
 })
}
