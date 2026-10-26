import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Automated WCAG checks complement, rather than replace, keyboard/device review.
const screens=['start','tasks','add-task','task-details','plan-review','plan-rationale-prepare','plan-edit-prepare','plan-active','adjust-scope','plan-diff-week','recent-changes','today','complete','recovery-missed','recovery-options','more','cycle-context','privacy-data','clear-data','help','weekly-help','offline','system-error','community','rhythm-terms','community-commitments','community-progress','community-result','savings','savings-optedin','rewards','backup']
for(const screen of screens){test(`WCAG automated scan: ${screen}`,async({page})=>{
 await page.goto(`/?qa=${screen}`)
 await page.locator('main').waitFor()
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
 expect(result.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([])
})}
test('WCAG scan while dialog is open excludes inert background',async({page})=>{
 await page.goto('/?qa=today')
 await page.getByRole('button',{name:'Add task',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible()
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
 expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([])
})
