import{useState}from'react'
import{AppHeader}from'../../components/AppHeader'
import{BottomNav,type RootTab}from'../../components/BottomNav'
import{Button}from'../../components/Button'
import{PLAN_BLOCKS,type PlanBlockData,type PlanBlockId,type PlanViewDataProps}from'./planData'
import{PlanAgenda,DaySection,EmptyDay,ScheduledLoad,WeekJumpStrip}from'./PlanShared'
import{PlanBlockActionsOverlay}from'./PlanBlockActionsOverlay'
import'./PlanAcceptedScreen.css'

export function PlanAcceptedScreen({onUndo,onStartToday,onNavigate,onOpenRationale,onEditBlock,blocks,week,scheduledLoad,todayISO}:PlanViewDataProps&{onUndo:()=>void;onStartToday:()=>void;onNavigate:(tab:RootTab)=>void;onOpenRationale:(block:PlanBlockData,source:'direct'|'overlay')=>void;onEditBlock:(block:PlanBlockData,source:'direct'|'overlay')=>void}){
 const[menuBlock,setMenuBlock]=useState<PlanBlockData|null>(null)
 const jump=(id:PlanBlockId|'sat'|'sun')=>document.getElementById(id==='sat'?'accepted-day-sat':id==='sun'?'accepted-day-sun':`accepted-day-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'})
 return <main className="plan-accepted-screen" data-figma-node="4198:141">
  <AppHeader title="Plan"/>
  <div className="plan-accepted-screen__scroll" style={blocks!==undefined?{height:620}:undefined}>
   <div className="plan-accepted-screen__success" aria-hidden="true"><svg viewBox="0 0 22 22"><path d="m5 11.5 4 4 8-9"/></svg></div>
   <h1>Your week is ready</h1>
   <p className="plan-accepted-screen__intro">Start with today. Flexible blocks can still be adjusted later.</p>
   <ScheduledLoad value={scheduledLoad}/><WeekJumpStrip onJump={jump} blocks={blocks} week={week}/><p className="plan-accepted-screen__section-label">WEEK AGENDA</p>
   {blocks!==undefined?<PlanAgenda blocks={blocks} week={week} todayISO={todayISO} idPrefix="accepted-day" onOpen={block=>onOpenRationale(block,'direct')} onMore={setMenuBlock}/>:<>
   {PLAN_BLOCKS.map(block=><div id={`accepted-day-${block.id}`} key={block.id}><DaySection block={block} onOpen={()=>block.id==='prepare'&&onOpenRationale(block,'direct')} onMore={()=>setMenuBlock(block)}/></div>)}
   <div id="accepted-day-sat"><EmptyDay day="Saturday" date="28 Oct" id="accepted-empty-sat"/></div>
   <div id="accepted-day-sun"><EmptyDay day="Sunday" date="29 Oct" id="accepted-empty-sun"/></div>
   </>}
   <Button className="plan-accepted-screen__start" type="button" onClick={onStartToday}>Start with Today</Button>
  </div>
  <BottomNav active="plan" onNavigate={onNavigate}/>
  <div className="plan-accepted-screen__snackbar" role="status"><span className="plan-accepted-screen__status-dot"/><span>Week saved</span><button type="button" onClick={onUndo}>Undo</button></div>
  {menuBlock?<PlanBlockActionsOverlay block={menuBlock} onClose={()=>setMenuBlock(null)} onEdit={()=>{setMenuBlock(null);onEditBlock(menuBlock,'overlay')}} onWhy={()=>{setMenuBlock(null);onOpenRationale(menuBlock,'overlay')}}/>:null}
 </main>
}