import{PLAN_BLOCKS,WEEK_DAYS,type PlanBlockData,type PlanBlockId,type PlanWeekDay}from'./planData'
import{PlanBlockCard}from'./PlanBlockCard'
import './PlanShared.css'

export function ScheduledLoad({value}:{value?:number}){
 const load=value===undefined?65:Math.max(0,Math.min(100,Math.round(value)))
 return <section className="scheduled-load">
  <div className="scheduled-load__head"><span>Scheduled load</span><strong>{load}%</strong></div>
  <div className="scheduled-load__track"><span style={value===undefined?undefined:{width:`${load}%`}}/></div>
  <div className="scheduled-load__foot"><strong>{load>=100?'At capacity':'Within capacity'}</strong><span>{100-load}% remains open.</span></div>
 </section>
}

export function WeekJumpStrip({onJump,week,blocks}:{onJump:(id:PlanBlockId)=>void;week?:readonly PlanWeekDay[];blocks?:PlanBlockData[]}){
 return <nav className="week-jump" aria-label="Week">
  {(week??WEEK_DAYS).map((d,i)=><button key={d.short} type="button" onClick={()=>onJump(blocks!==undefined||week!==undefined?d.dateISO??d.short.toLowerCase():i<5?PLAN_BLOCKS[i].id:i===5?'sat':'sun')}>
   <span>{d.short}</span><strong>{d.number}</strong>
  </button>)}
 </nav>
}

export function DaySection({
 block,onOpen,onMore,time,status,idPrefix='plan-day'
}:{block:PlanBlockData;onOpen:()=>void;onMore:()=>void;time?:string;status?:'Changed';idPrefix?:string}){
 const current=block.id==='prepare'
 return <section className={`plan-day ${status?'plan-day--changed ':''}${current?'plan-day--current':''}`.trim()} id={`${idPrefix}-${block.id}`}>
  <header>
   <div><strong>{block.day}</strong><span>{block.date.replace(block.shortDay+' ','')}</span></div>
   {current?<em>Today</em>:null}
  </header>
  <PlanBlockCard block={block} time={time} status={status} onOpen={onOpen} onMore={onMore}/>
 </section>
}

export function EmptyDay({day,date,id}:{day:string;date:string;id:string}){
 return <section className="plan-day-empty" id={id}>
  <header><div><strong>{day}</strong><span>{date}</span></div></header>
  <strong className="plan-day-empty__title">No planned blocks</strong>
  <span className="plan-day-empty__body">Leave this day open, or capture a task for later.</span>
 </section>
}

export function PlanAgenda({blocks,week=WEEK_DAYS,idPrefix,onOpen,onMore,changedBlockIds=[],todayISO}:{blocks:PlanBlockData[];week?:readonly PlanWeekDay[];idPrefix:string;onOpen:(block:PlanBlockData)=>void;onMore:(block:PlanBlockData)=>void;changedBlockIds?:readonly string[];todayISO?:string}){
 return <>{week.map(day=>{
  const dayBlocks=blocks.filter(block=>day.dateISO&&block.dateISO?day.dateISO===block.dateISO:day.label===block.day)
  const id=`${idPrefix}-${day.dateISO??day.short.toLowerCase()}`
  if(!dayBlocks.length)return <EmptyDay key={id} id={id} day={day.label} date={day.date}/>
  const current=Boolean(todayISO&&day.dateISO===todayISO)
  return <section key={id} id={id} className={`plan-day${current?' plan-day--current':''}`} style={{height:'auto',flexBasis:'auto'}}>
   <header><div><strong>{day.label}</strong><span>{day.date}</span></div>{current?<em>Today</em>:null}</header>
   {dayBlocks.map(block=><PlanBlockCard key={block.id} block={block} status={changedBlockIds.includes(block.id)?'Changed':block.status} onOpen={()=>onOpen(block)} onMore={()=>onMore(block)}/>) }
  </section>
 })}</>
}
