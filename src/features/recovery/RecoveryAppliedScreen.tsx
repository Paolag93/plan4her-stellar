import{useState}from'react'
import{BottomNav,type RootTab}from'../../components/BottomNav'
import{Button}from'../../components/Button'
import{AppHeader}from'../../components/AppHeader'
import{PlanBlockActionsOverlay}from'../plan/PlanBlockActionsOverlay'
import{PLAN_BLOCKS,type PlanBlockData}from'../plan/planData'
import{ScheduledLoad}from'../plan/PlanShared'
import type{RecoveryPresentation}from'./recoveryData'
import'./RecoveryAppliedScreen.css'

export type RecoveryAppliedKind='missed-move'|'missed-split'|'partial-move'|'partial-split'
const data={
 'missed-move':{node:'4198:227',body:'Prepare proposal moved to 14:00–15:30.',title:'Prepare proposal',time:'14:00–15:30'},
 'missed-split':{node:'4379:5697',body:'Prepare proposal was split into two 45-minute blocks.',title:'Prepare proposal',time:'Today · 15:00–15:45 + Tomorrow · 09:00–09:45'},
 'partial-move':{node:'4379:5805',body:'The remaining 45 minutes moved to tomorrow at 09:00.',title:'Prepare proposal · remaining work',time:'Tomorrow · 09:00–09:45'},
 'partial-split':{node:'4379:5925',body:'The remaining 45 minutes were split into two shorter blocks.',title:'Prepare proposal · remaining work',time:'Today · 20 min + Tomorrow · 25 min'},
}
export function RecoveryAppliedScreen({kind,proposal,selectedBlock,onBackToday,onUndo,onNavigate,onEditBlock,onOpenRationale}:{kind:RecoveryAppliedKind;proposal?:RecoveryPresentation;selectedBlock?:PlanBlockData;onBackToday:()=>void;onUndo:()=>void;onNavigate:(tab:RootTab)=>void;onEditBlock:(block:PlanBlockData)=>void;onOpenRationale:(block:PlanBlockData)=>void}){
 const fixture=data[kind];const d=proposal?{...fixture,title:proposal.title,time:proposal.after,body:proposal.appliedBody??`${proposal.title} updated.`}:fixture;const[menu,setMenu]=useState(false);const block=proposal?(proposal.actionBlock??proposal.blocks?.find(candidate=>candidate.status!=='done'&&selectedBlock&&(candidate.id===selectedBlock.id||candidate.id.startsWith(`${selectedBlock.id}-part-`)))):(selectedBlock??PLAN_BLOCKS[0])
 return <main className={`recovery-applied-screen${proposal?' live-content-screen recovery-applied-screen--live':''}`} data-figma-node={d.node}>
  <AppHeader title="Today"/>
  <div className="recovery-applied-screen__content">
   <div className="recovery-applied-screen__success" aria-hidden="true"><svg viewBox="0 0 22 22"><path d="m5 11.5 4 4 8-9"/></svg></div>
   <h1>Plan updated</h1><p className="recovery-applied-screen__intro">{d.body}</p>{!proposal?<ScheduledLoad/>:null}
   <p className="recovery-applied-screen__label">CHANGED</p>
   <article className="recovery-applied-card"><div className="recovery-applied-card__top"><strong>{d.title}</strong><em>Changed</em></div><span>{d.time}</span><b>Flexible</b><button type="button" aria-label={`Actions for ${d.title}`} disabled={!block} onClick={()=>setMenu(true)}><img src="/assets/plan-more.svg" alt=""/></button></article>
   <p className="recovery-applied-screen__note">Undo restores the previous plan.</p>
   <Button className="recovery-applied-screen__back" type="button" onClick={onBackToday}>Back to Today</Button>
  </div>
  <BottomNav active="today" onNavigate={onNavigate}/>
  <div className="recovery-applied-screen__snackbar" role="status" onClick={onUndo}><span/><p>Change applied</p><button type="button" onClick={(e)=>{e.stopPropagation();onUndo()}}>Undo</button></div>
  {menu&&block?<PlanBlockActionsOverlay block={block} onClose={()=>setMenu(false)} onEdit={()=>{setMenu(false);onEditBlock(block)}} onWhy={()=>{setMenu(false);onOpenRationale(block)}}/>:null}
 </main>
}
