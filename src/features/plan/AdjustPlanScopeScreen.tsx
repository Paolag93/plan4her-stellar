import{handleRadioKeyDown}from'../../components/radioKeyboard'
import{useState}from'react'
import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import'./AdjustPlanScopeScreen.css'
export type AdjustScope='today'|'week'
export function AdjustPlanScopeScreen({onBack,onPreview,onHelp,onSelectionChange,initialSelected=null}:{onBack:()=>void;onPreview:(scope:AdjustScope)=>void;onHelp:()=>void;onSelectionChange?:(scope:AdjustScope)=>void;initialSelected?:AdjustScope|null}){
 const[selected,setSelected]=useState<AdjustScope|null>(initialSelected)
 const select=(scope:AdjustScope)=>{setSelected(scope);onSelectionChange?.(scope)}
 const node=selected==='today'?'4380:5933':selected==='week'?'4199:1139':'4199:1124'
 return <main className="adjust-scope-screen" data-figma-node={node}>
  <AppHeader title="Adjust plan" onBack={onBack}/>
  <div className="adjust-scope-screen__content">
   <h1>What should Plan4Her adjust?</h1><p className="adjust-scope-screen__intro">Choose the range. You’ll review every change before applying it.</p>
   <div className="adjust-scope-screen__choices" role="radiogroup" aria-label="Adjustment range">
    <button type="button" role="radio" tabIndex={selected==='week'?-1:0} onKeyDown={handleRadioKeyDown} aria-checked={selected==='today'} className={selected==='today'?'adjust-scope-screen__choice adjust-scope-screen__choice--selected':'adjust-scope-screen__choice'} onClick={()=>select('today')}><i/><span><strong>Rest of today</strong><small>Only future flexible blocks today.</small></span></button>
    <button type="button" role="radio" tabIndex={selected==='week'?0:-1} onKeyDown={handleRadioKeyDown} aria-checked={selected==='week'} className={selected==='week'?'adjust-scope-screen__choice adjust-scope-screen__choice--selected':'adjust-scope-screen__choice'} onClick={()=>select('week')}><i/><span><strong>Rest of the week</strong><small>Future flexible blocks through Sunday.</small></span></button>
   </div>
   <section className="adjust-scope-screen__protected"><h2>What stays protected</h2><p>• Fixed commitments never move.</p><p>• Completed tasks stay complete.</p><p>• Cycle context can guide placement, but never overrides your choices.</p></section>
   <div className={selected?'adjust-scope-screen__spacer adjust-scope-screen__spacer--selected':'adjust-scope-screen__spacer'}/>
   <Button className="adjust-scope-screen__preview" type="button" disabled={!selected} onClick={()=>selected&&onPreview(selected)}>Preview changes</Button>
   {!selected?<button className="adjust-scope-screen__help" type="button" onClick={onHelp}>How plan adjustments work</button>:null}
  </div>
 </main>
}
