import{useState}from'react'
import{PlanBlockActionsOverlay}from'./PlanBlockActionsOverlay'
import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import type{PlanBlockData}from'./planData'
import'./PlanRationaleScreen.css'

export function PlanRationaleScreen({block,source,onBack,onAdjust}:{block:PlanBlockData;source:'direct'|'overlay';onBack:()=>void;onAdjust:()=>void}){
 const[menuOpen,setMenuOpen]=useState(false)
 const isDirectPrepare=block.id==='prepare'&&source==='direct'
 const node=isDirectPrepare?(block.directRationaleNode??block.rationaleNode):block.rationaleNode
 const signals=block.signals.map(signal=>signal.title==='Cycle context'&&isDirectPrepare&&!block.dateISO?{...signal,body:'Your current follicular estimate slightly favored focused work earlier. This is a preference, never a rule, and you can ignore it.'}:signal)
 return <main className={`plan-rationale-screen${block.dateISO?' live-content-screen':''}`} data-figma-node={node}>
  <AppHeader title="Why this time" onBack={onBack}/>
  <div className="plan-rationale-screen__content">
   <section className="plan-rationale-screen__explained">
    <strong>{block.title}</strong><span>{block.time}</span><em>{block.fixed?'Fixed':'Flexible'}</em><p>{block.rationale}</p>
    <button type="button" aria-label={`Actions for ${block.title}`} onClick={()=>setMenuOpen(true)}><i/><i/><i/></button>
   </section>
   <h2>Signals used</h2>
   {signals.map((signal,index)=><article className={index===2?'plan-rationale-screen__signal plan-rationale-screen__signal--cycle':'plan-rationale-screen__signal'} key={signal.title}><strong>{signal.title}</strong><p>{signal.body}</p></article>)}
   <p className="plan-rationale-screen__note">Changing this block does not change your cycle data. Plan4Her will re-check the remaining schedule after you save.</p>
   <div className="plan-rationale-screen__spacer"/>
   <Button className="plan-rationale-screen__adjust" hierarchy="secondary" type="button" onClick={onAdjust}>Adjust this block</Button>
  </div>
  {menuOpen?<PlanBlockActionsOverlay block={block} onClose={()=>setMenuOpen(false)} onWhy={()=>setMenuOpen(false)} onEdit={()=>{setMenuOpen(false);onAdjust()}}/>:null}
 </main>
}
