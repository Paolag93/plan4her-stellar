import{useRef,useState}from'react'
import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import{PLAN_BLOCKS,type PlanBlockData,type PlanBlockId,type PlanViewDataProps}from'./planData'
import{PlanAgenda,DaySection,EmptyDay,ScheduledLoad,WeekJumpStrip}from'./PlanShared'
import{PlanBlockActionsOverlay}from'./PlanBlockActionsOverlay'
import'./ReviewPlanScreen.css'

export interface ReviewPlanScreenProps extends PlanViewDataProps{
 onHowItWorks?:()=>void
 onAccept:()=>void
 onAdjustPlan:()=>void
 onOpenRationale:(block:PlanBlockData,source:'direct'|'overlay')=>void
 onEditBlock:(block:PlanBlockData,source:'direct'|'overlay')=>void
}

export function ReviewPlanScreen({onHowItWorks,onAccept,onAdjustPlan,onOpenRationale,onEditBlock,blocks,week,scheduledLoad,phases,todayISO}:ReviewPlanScreenProps){
 const[menuBlock,setMenuBlock]=useState<PlanBlockData|null>(null)
 const scrollRef=useRef<HTMLDivElement>(null)
 const jump=(id:PlanBlockId|'sat'|'sun')=>document.getElementById(id==='sat'?'plan-day-sat':id==='sun'?'plan-day-sun':`plan-day-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'})
 return <main className="review-plan-screen" data-figma-node="4198:128">
  <AppHeader title="Plan"/>
  <div className="review-plan-screen__scroll" ref={scrollRef}>
   <h1>Your first plan is ready</h1>
   <p className="review-plan-screen__intro">Check the week, then accept it or adjust anything that doesn’t fit.</p>
   <ScheduledLoad value={scheduledLoad}/>
   <WeekJumpStrip onJump={jump} blocks={blocks} week={week}/>
   <p className="review-plan-screen__section-label">THIS WEEK</p>
   <p className="review-plan-screen__hint">Use ••• for rationale, timing changes or moving a block.</p>
   {blocks!==undefined?<PlanAgenda blocks={blocks} week={week} todayISO={todayISO} phases={phases} idPrefix="plan-day" onOpen={block=>onOpenRationale(block,'direct')} onMore={setMenuBlock}/>:<>
   {PLAN_BLOCKS.map(block=><DaySection key={block.id} block={block} onOpen={()=>onOpenRationale(block,'direct')} onMore={()=>setMenuBlock(block)}/>)}
   <EmptyDay day="Saturday" date="28 Oct" id="plan-day-sat"/>
   <EmptyDay day="Sunday" date="29 Oct" id="plan-day-sun"/>
   </>}
   <Button className="review-plan-screen__adjust" hierarchy="secondary" type="button" onClick={onAdjustPlan}>Adjust plan</Button>
   <Button className="review-plan-screen__accept" type="button" onClick={onAccept}>Accept week</Button>
   <button className="review-plan-screen__help" type="button" onClick={onHowItWorks}>How weekly planning works</button>
  </div>
  {menuBlock?<PlanBlockActionsOverlay block={menuBlock} onClose={()=>setMenuBlock(null)} onEdit={()=>{setMenuBlock(null);onEditBlock(menuBlock,'overlay')}} onWhy={()=>{setMenuBlock(null);onOpenRationale(menuBlock,'overlay')}}/>:null}
 </main>
}