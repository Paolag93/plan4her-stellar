import{useState}from'react'
import{AppHeader}from'../../components/AppHeader'
import{BottomNav,type RootTab}from'../../components/BottomNav'
import{Button}from'../../components/Button'
import{PLAN_BLOCKS,type PlanBlockData,type PlanBlockId,type PlanViewDataProps}from'./planData'
import{PlanAgenda,DaySection,EmptyDay,ScheduledLoad,WeekJumpStrip}from'./PlanShared'
import{PlanBlockActionsOverlay}from'./PlanBlockActionsOverlay'
import'./ActivePlanScreen.css'

export type ActivePlanMode='active'|'week-applied'|'today-applied'|'restored'
export function ActivePlanScreen({mode,onAdjust,onRecentChanges,onUndo,onNavigate,onAddTask,onOpenRationale,onEditBlock,blocks,week,scheduledLoad,todayISO,changedBlockIds}:PlanViewDataProps&{changedBlockIds?:string[];mode:ActivePlanMode;onAdjust:()=>void;onRecentChanges:()=>void;onUndo:()=>void;onNavigate:(tab:RootTab)=>void;onAddTask:()=>void;onOpenRationale:(block:PlanBlockData,source:'direct'|'overlay')=>void;onEditBlock:(block:PlanBlockData,source:'direct'|'overlay')=>void}){
 const[menuBlock,setMenuBlock]=useState<PlanBlockData|null>(null)
 const applied=mode!=='active',weekApplied=mode==='week-applied',restored=mode==='restored'
 const node=mode==='active'?'4198:286':weekApplied?'4317:5381':restored?'4318:5535':'4380:6044'
 const title=restored?'Previous plan restored':applied?'Plan updated':'Your week'
 const count=changedBlockIds?.length??0
 const body=blocks!==undefined?(restored?'Your previous weekly plan is active again.':applied?`${count} ${count===1?'block changed':'blocks changed'}. Everything else stayed in place.`:'Your accepted week stays editable.'):mode==='active'?'Your accepted week stays editable.':restored?'Your previous weekly plan is active again.':weekApplied?'2 flexible blocks changed. Everything else stayed in place.':'1 flexible block changed today. The rest of your week stayed the same.'
 const jump=(id:PlanBlockId|'sat'|'sun')=>document.getElementById(id==='sat'?'active-day-sat':id==='sun'?'active-day-sun':`active-day-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'})
 const timeFor=(block:PlanBlockData)=>restored?undefined:block.id==='prepare'&&applied?'14:00–15:30':block.id==='research'&&weekApplied?'10:00–10:30 + Wed · 11:00–11:30':undefined
 const changed=(block:PlanBlockData)=>!restored&&(block.id==='prepare'&&applied||block.id==='research'&&weekApplied)
 return <main className={`active-plan-screen${applied?' active-plan-screen--applied':''}${blocks!==undefined?' active-plan-screen--live':''}`} data-figma-node={node}>
  <AppHeader title="Plan"/>
  <div className="active-plan-screen__scroll" style={blocks!==undefined?{height:620,maxHeight:'calc(100% - 208px)'}:undefined}>
   {applied?<div className="active-plan-screen__success" aria-hidden="true"><svg viewBox="0 0 22 22"><path d="m5 11.5 4 4 8-9"/></svg></div>:null}
   <h1>{title}</h1><p className="active-plan-screen__intro">{body}</p><ScheduledLoad value={scheduledLoad}/><WeekJumpStrip onJump={jump} blocks={blocks} week={week}/><p className="active-plan-screen__section-label">WEEK AGENDA</p>
   {!applied?<p className="active-plan-screen__hint">Use ••• for rationale, timing changes or moving a block.</p>:null}
   {blocks!==undefined?<PlanAgenda blocks={blocks} week={week} todayISO={todayISO} idPrefix="active-day" changedBlockIds={changedBlockIds} onOpen={block=>onOpenRationale(block,'direct')} onMore={setMenuBlock}/>:<>
   {PLAN_BLOCKS.map(block=><DaySection key={block.id} block={block} idPrefix="active-day" time={timeFor(block)} status={changed(block)?'Changed':undefined} onOpen={()=>block.id==='prepare'&&onOpenRationale(block,'direct')} onMore={()=>setMenuBlock(block)}/>)}
   <EmptyDay day="Saturday" date="28 Oct" id="active-day-sat"/><EmptyDay day="Sunday" date="29 Oct" id="active-day-sun"/>
   </>}
   <Button className="active-plan-screen__adjust" type="button" onClick={onAdjust}>Adjust plan</Button>
   {mode!=='today-applied'?<Button className="active-plan-screen__recent" hierarchy="secondary" type="button" onClick={onRecentChanges}>{applied?'Review changes':'Recent changes'}</Button>:null}
   <div className="active-plan-screen__bottom-space"/>
  </div>
  <BottomNav active="plan" onNavigate={onNavigate}/>
  {mode==='active'||restored?<button className="active-plan-screen__fab" type="button" onClick={onAddTask} aria-label="Add task">+</button>:null}
  {applied?<div className="active-plan-screen__snackbar" role="status"><span className="active-plan-screen__status-dot"/><span>{restored?'Previous plan restored':weekApplied?'Changes applied':'Change applied'}</span><button type="button" onClick={onUndo}>Undo</button></div>:null}
  {menuBlock?<PlanBlockActionsOverlay block={menuBlock} onClose={()=>setMenuBlock(null)} onEdit={()=>{setMenuBlock(null);onEditBlock(menuBlock,'overlay')}} onWhy={()=>{setMenuBlock(null);onOpenRationale(menuBlock,'overlay')}}/>:null}
 </main>
}
