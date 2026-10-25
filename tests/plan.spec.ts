import{expect,test}from'@playwright/test'

test.describe('MVP Generate + Review Plan — canonical Figma flow',()=>{
 test('Loading Plan transitions after Figma 1.2s timeout into PL01',async({page})=>{await page.goto('/?qa=loading-plan');await expect(page.locator('[data-figma-node="4250:4238"]')).toBeVisible();await expect(page.locator('[data-figma-node="4198:128"]')).toBeVisible({timeout:2500})})
 test('Review Plan exposes exact week and Accept route',async({page})=>{await page.goto('/?qa=plan-review');await expect(page.locator('[data-figma-node="4198:128"]')).toBeVisible();await expect(page.getByText('Your first plan is ready')).toBeVisible();await expect(page.getByText('65%')).toBeVisible();await page.getByRole('button',{name:'Accept week'}).click();await expect(page.locator('[data-figma-node="4198:141"]')).toBeVisible();await expect(page.getByText('Week saved')).toBeVisible()})
 test('Prepare proposal opens canonical direct rationale and edit states',async({page})=>{await page.goto('/?qa=plan-review');await page.getByRole('button',{name:'Prepare proposal, 09:00–10:30'}).click();await expect(page.locator('[data-figma-node="4250:1715"]')).toBeVisible();await expect(page.getByText('Your current follicular estimate slightly favored focused work earlier. This is a preference, never a rule, and you can ignore it.')).toBeVisible();await page.getByRole('button',{name:'Adjust this block'}).click();await expect(page.locator('[data-figma-node="4250:1732"]')).toBeVisible()})
 test('Prepare proposal block menu follows overlay-specific Figma nodes',async({page})=>{await page.goto('/?qa=plan-review');await page.getByRole('button',{name:'Actions for Prepare proposal'}).click();await expect(page.locator('[data-figma-node="4700:7670"]')).toBeVisible();await page.getByRole('button',{name:/Why this time/}).click();await expect(page.locator('[data-figma-node="4700:7586"]')).toBeVisible()})
 test('Each block keeps subject-specific rationale node',async({page})=>{const cases=[['research','4700:7681','Research notes'],['review','4700:7775','Review proposal'],['admin','4700:7869','Admin follow-up'],['finalize','4700:7963','Finalize proposal']];for(const[id,node,title]of cases){await page.goto(`/?qa=plan-rationale-${id}`);await expect(page.locator(`[data-figma-node="${node}"]`)).toBeVisible();await expect(page.getByText(title,{exact:true}).first()).toBeVisible()}})
 test('Plan Accepted Undo returns to Review Plan',async({page})=>{await page.goto('/?qa=plan-accepted');await expect(page.locator('[data-figma-node="4198:141"]')).toBeVisible();await page.getByRole('button',{name:'Undo'}).click();await expect(page.locator('[data-figma-node="4198:128"]')).toBeVisible()})
})

test.describe('MVP Adjust Plan — canonical Figma flow',()=>{
 test('Review Plan Adjust opens unselected PL05, then week selection and week diff',async({page})=>{await page.goto('/?qa=plan-review');await page.getByRole('button',{name:'Adjust plan'}).click();await expect(page.locator('[data-figma-node="4199:1124"]')).toBeVisible();await expect(page.getByRole('button',{name:'Preview changes'})).toBeDisabled();await page.getByRole('radio',{name:/Rest of the week/}).click();await expect(page.locator('[data-figma-node="4199:1139"]')).toBeVisible();await page.getByRole('button',{name:'Preview changes'}).click();await expect(page.locator('[data-figma-node="4199:1180"]')).toBeVisible();await expect(page.getByText('2 blocks would change')).toBeVisible()})
 test('Week diff applies and Undo returns to PL08 Active Plan',async({page})=>{await page.goto('/?qa=plan-diff-week');await expect(page.locator('[data-figma-node="4199:1180"]')).toBeVisible();await page.getByRole('button',{name:'Apply changes'}).click();await expect(page.locator('[data-figma-node="4317:5381"]')).toBeVisible();await expect(page.getByText('Changes applied')).toBeVisible();await page.getByRole('button',{name:'Undo'}).click();await expect(page.locator('[data-figma-node="4198:286"]')).toBeVisible()})
 test('Today selection uses Today diff and Today applied node',async({page})=>{await page.goto('/?qa=adjust-today');await expect(page.locator('[data-figma-node="4380:5933"]')).toBeVisible();await page.getByRole('button',{name:'Preview changes'}).click();await expect(page.locator('[data-figma-node="4380:5991"]')).toBeVisible();await expect(page.getByText('1 block would change')).toBeVisible();await page.getByRole('button',{name:'Apply change'}).click();await expect(page.locator('[data-figma-node="4380:6044"]')).toBeVisible();await expect(page.getByText('Change applied')).toBeVisible()})
 test('Keep plan as is returns to PL08 Active Plan',async({page})=>{await page.goto('/?qa=plan-diff-week');await page.getByRole('button',{name:'Keep plan as is'}).click();await expect(page.locator('[data-figma-node="4198:286"]')).toBeVisible();await expect(page.getByText('Your accepted week stays editable.')).toBeVisible()})
})


test.describe('MVP Plan remaining canonical states',()=>{
 test('Active Plan opens Recent Changes and restore flow returns through PL10',async({page})=>{
  await page.goto('/?qa=plan-active')
  await page.getByRole('button',{name:'Recent changes'}).click()
  await expect(page.locator('[data-figma-node="4250:1767"]')).toBeVisible()
  await page.getByRole('button',{name:'Restore previous plan'}).click()
  await expect(page.locator('[data-figma-node="4272:1806"]')).toBeVisible()
  await page.getByRole('button',{name:'Restore previous plan'}).click()
  await expect(page.locator('[data-figma-node="4318:5535"]')).toBeVisible()
  await expect(page.getByRole('heading',{name:'Previous plan restored'})).toBeVisible()
  await page.getByRole('button',{name:'Undo'}).click()
  await expect(page.locator('[data-figma-node="4317:5381"]')).toBeVisible()
 })
 test('PL04 feasibility is conditional and routes resolutions into PL05',async({page})=>{
  await page.goto('/?qa=plan-feasibility')
  await expect(page.locator('[data-figma-node="4250:1749"]')).toBeVisible()
  await expect(page.getByText('This plan doesn’t fit yet')).toBeVisible()
  await page.getByRole('button',{name:/Move less important work/}).click()
  await expect(page.locator('[data-figma-node="4199:1124"]')).toBeVisible()
 })
 test('overlay-specific PL03 uses exact date/start/duration overlays from Figma',async({page})=>{
  await page.goto('/?qa=plan-edit-overlay-prepare')
  await expect(page.locator('[data-figma-node="4700:7603"]')).toBeVisible()
  await page.getByRole('button',{name:'Date'}).click()
  await expect(page.locator('[data-figma-node="4701:7826"]')).toBeVisible()
  await page.getByRole('button',{name:'23'}).click()
  await page.getByRole('button',{name:'Start time'}).click()
  await expect(page.locator('[data-figma-node="4701:7936"]')).toBeVisible()
  await expect(page.getByRole('button',{name:'11:30 AM'})).toBeVisible()
  await page.getByRole('button',{name:'11:30 AM'}).click()
  await page.getByRole('button',{name:'Duration'}).click()
  await expect(page.locator('[data-figma-node="4701:7956"]')).toBeVisible()
  await expect(page.getByRole('button',{name:'90 min'})).toBeVisible()
 })
})

test.describe('MVP Plan Figma geometry guards',()=>{
 test('PL03 Fixed time switch preserves canonical 52×44 target and 44×24 track',async({page})=>{
  await page.goto('/?qa=plan-edit-prepare')
  const screen=page.locator('[data-figma-node="4250:1732"]')
  await expect(screen).toBeVisible()
  const toggle=page.getByRole('switch')
  await expect(toggle).toHaveCSS('width','52px')
  await expect(toggle).toHaveCSS('height','44px')
  const before=await toggle.evaluate(el=>{
   const s=getComputedStyle(el,'::before')
   return {width:s.width,height:s.height,left:s.left,top:s.top,backgroundColor:s.backgroundColor,borderTopWidth:s.borderTopWidth}
  })
  expect(before.width).toBe('44px')
  expect(before.height).toBe('24px')
  expect(before.left).toBe('4px')
  expect(before.top).toBe('10px')
  expect(before.backgroundColor).toBe('rgb(237, 239, 227)')
  expect(before.borderTopWidth).toBe('1px')
  await toggle.click()
  await expect(page.locator('[data-figma-node="4272:2636"]')).toBeVisible()
  const onBefore=await toggle.evaluate(el=>{
   const s=getComputedStyle(el,'::before')
   return {backgroundColor:s.backgroundColor,borderTopWidth:s.borderTopWidth}
  })
  expect(onBefore.backgroundColor).toBe('rgb(130, 192, 204)')
  expect(onBefore.borderTopWidth).toBe('0px')
 })
})


test.describe('MVP Plan exact Figma layout/token guards',()=>{
 test('PL01 keeps canonical current-day and section-label tokens',async({page})=>{
  await page.goto('/?qa=plan-review')
  await expect(page.locator('[data-figma-node="4198:128"]')).toBeVisible()
  await expect(page.locator('.review-plan-screen__intro')).toHaveCSS('height','60px')
  await expect(page.locator('.review-plan-screen__section-label')).toHaveCSS('color','rgb(22, 105, 122)')
  await expect(page.locator('.plan-day--current > header strong')).toHaveCSS('color','rgb(9, 71, 69)')
  await expect(page.locator('.plan-day--current > header em')).toHaveCSS('background-color','rgb(130, 192, 204)')
 })

 test('PL04 capacity header preserves the exact Figma single-line box',async({page})=>{
  await page.goto('/?qa=plan-feasibility')
  const label=page.locator('.feasibility-capacity__label')
  await expect(label).toHaveCSS('width','99px')
  await expect(label).toHaveCSS('height','20px')
  await expect(label).toHaveCSS('font-size','14px')
  await expect(label).toHaveCSS('line-height','20px')
  await expect(label).toHaveCSS('white-space','nowrap')
  await expect(page.locator('.feasibility-capacity__bar')).toHaveCSS('width','358px')
  await expect(page.locator('.feasibility-capacity__bar')).toHaveCSS('height','16px')
 })

 test('PL09 Recent changes preserves canonical 60px intro and 60px notice',async({page})=>{
  await page.goto('/?qa=recent-changes')
  await expect(page.locator('.recent-changes-screen__intro')).toHaveCSS('height','60px')
  const notice=page.locator('.recent-changes-screen__notice')
  await expect(notice).toHaveCSS('height','60px')
  await expect(notice.locator('strong')).toHaveCSS('font-size','12px')
  await expect(notice.locator('strong')).toHaveCSS('line-height','16px')
 })

 test('PL09 Restore preview preserves canonical 40px intro and 76px protected summary',async({page})=>{
  await page.goto('/?qa=restore-preview')
  await expect(page.locator('.restore-preview-screen__intro')).toHaveCSS('height','40px')
  const notice=page.locator('.restore-preview-screen__notice')
  await expect(notice).toHaveCSS('height','76px')
  await expect(notice.locator('strong')).toHaveCSS('font-size','12px')
  await expect(notice.locator('strong')).toHaveCSS('line-height','16px')
 })

 test('Accepted and active plan keep WEEK AGENDA in the Figma accent token',async({page})=>{
  for(const qa of ['plan-accepted','plan-active','plan-applied-week','plan-applied-today','restore-applied']){
   await page.goto('/?qa='+qa)
   const label=page.locator('.plan-accepted-screen__section-label, .active-plan-screen__section-label').first()
   await expect(label).toHaveCSS('color','rgb(22, 105, 122)')
  }
 })
})


test.describe('MVP Loading Plan exact Figma guard',()=>{
 test('SS01 contains only the canonical heading and four skeletons at exact bounds',async({page})=>{
  await page.goto('/?qa=loading-plan')
  const screen=page.locator('[data-figma-node="4250:4238"]')
  await expect(screen).toBeVisible()
  await expect(screen.getByRole('heading',{name:'Building your week'})).toHaveCSS('left','16px')
  await expect(screen.getByRole('heading',{name:'Building your week'})).toHaveCSS('top','132px')
  await expect(screen.locator('.loading-plan-screen__line')).toHaveCSS('top','182px')
  await expect(screen.locator('.loading-plan-screen__line')).toHaveCSS('width','190px')
  await expect(screen.locator('.loading-plan-screen__block--one')).toHaveCSS('top','210px')
  await expect(screen.locator('.loading-plan-screen__block--one')).toHaveCSS('height','92px')
  await expect(screen.locator('.loading-plan-screen__block--two')).toHaveCSS('top','320px')
  await expect(screen.locator('.loading-plan-screen__block--two')).toHaveCSS('height','92px')
  await expect(screen.locator('.loading-plan-screen__block--three')).toHaveCSS('top','430px')
  await expect(screen.locator('.loading-plan-screen__block--three')).toHaveCSS('height','64px')
  await expect(screen.locator('p')).toHaveCount(0)
 })
})


test.describe('PL03 exact Figma control geometry',()=>{
 test('Fixed time switch matches Figma 52×44 touch target and 44×24 track',async({page})=>{
  await page.goto('/?qa=plan-edit-prepare')
  const control=page.getByRole('switch')
  await expect(control).toHaveCSS('width','52px')
  await expect(control).toHaveCSS('height','44px')
  const before=await control.evaluate(el=>{
   const s=getComputedStyle(el,'::before')
   return {left:s.left,top:s.top,width:s.width,height:s.height,background:s.backgroundColor,border:s.borderTopWidth}
  })
  expect(before).toEqual({left:'4px',top:'10px',width:'44px',height:'24px',background:'rgb(237, 239, 227)',border:'1px'})
  await control.click()
  await expect(page.locator('[data-figma-node="4272:2636"]')).toBeVisible()
  const on=await control.evaluate(el=>{
   const s=getComputedStyle(el,'::before')
   return {background:s.backgroundColor,border:s.borderTopWidth}
  })
  expect(on).toEqual({background:'rgb(130, 192, 204)',border:'0px'})
 })
})
