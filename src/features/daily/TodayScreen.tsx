import{Fragment,useState}from'react'
import{AddTaskChooser}from'../../components/AddTaskChooser'
import{AppHeader}from'../../components/AppHeader'
import{BottomNav,type RootTab}from'../../components/BottomNav'
import{Button}from'../../components/Button'
import{TaskCard}from'../../components/TaskCard'
import{PLAN_BLOCKS,type PlanBlockData}from'../plan/planData'
import{PlanBlockActionsOverlay}from'../plan/PlanBlockActionsOverlay'
import{DAILY_DAYS,type DailyDayKey,type DailyTaskId,type DailyTaskData}from'./todayData'
import{PhaseContextCard}from'./PhaseContextCard'
import{selectedCycleContext}from'./selectedCycleContext'
import{TodayPlanBlock}from'./TodayPlanBlock'
import{EmptyTodayScreen}from'../system/ConditionalSystemScreens'
import{localISO}from'../../domain/planner'
import'./TodayScreen.css'
import'../community/community.css'

export interface TodayGoal{title:string;challengeTitle:string;summary:string;checkedInToday:boolean;actionLabel?:string;onCheckIn:()=>void;onOpen:()=>void}

export interface TodayScreenProps{
 goal?:TodayGoal
 blocks?:PlanBlockData[]
 tasks?:DailyTaskData[]
 weekDays?:ReadonlyArray<{short:string;number:string;label?:string;date?:string;dateISO?:string}>
 cycle?:{mode?:string|null;enabled:boolean;lastPeriodStart:string|null;cycleLength:number}
 onToggleTaskDone?:(id:string)=>void
 onDayChange?:(day:DailyDayKey)=>void
 initialDay?:DailyDayKey
 initialDone?:{meeting?:boolean;groceries?:boolean}
 onUpdateProgress:(block?:PlanBlockData)=>void
 onViewPlan:()=>void
 onTask:(id:DailyTaskId)=>void
 onPhase:()=>void
 onNavigate:(tab:RootTab)=>void
 onQuickCapture:()=>void
 onAddWithDetails:()=>void
 onOpenRationale:(block:PlanBlockData)=>void
 onEditBlock:(block:PlanBlockData)=>void
}

export function TodayScreen({goal,blocks,tasks,weekDays,cycle,onToggleTaskDone,onDayChange,initialDay='mon',initialDone={},onUpdateProgress,onViewPlan,onTask,onPhase,onNavigate,onQuickCapture,onAddWithDetails,onOpenRationale,onEditBlock}:TodayScreenProps){
 const[day,setDay]=useState<DailyDayKey>(initialDay)
 const[meetingDone,setMeetingDone]=useState(Boolean(initialDone.meeting))
 const[groceriesDone,setGroceriesDone]=useState(Boolean(initialDone.groceries))
 const[chooser,setChooser]=useState(false)
 const[menuBlock,setMenuBlock]=useState<PlanBlockData|null>(null)
 const data=DAILY_DAYS.find(item=>item.key===day)??DAILY_DAYS[0]
 const figmaNode=day==='mon'?(meetingDone&&groceriesDone?'4273:3226':meetingDone?'4272:3858':groceriesDone?'4272:3992':data.nodeId):data.nodeId
 const controlled=blocks!==undefined
 const dayIndex=DAILY_DAYS.findIndex(item=>item.key===day)
 const strip=DAILY_DAYS.map((item,index)=>({...item,...weekDays?.[index]}))
 const dayBlocks=controlled?blocks.filter(block=>weekDays?.[dayIndex]?.dateISO&&block.dateISO?block.dateISO===weekDays[dayIndex].dateISO:block.shortDay.toLowerCase()===data.short.toLowerCase()):[]
 const planBlock=controlled?dayBlocks[0]:data.plan?PLAN_BLOCKS.find(block=>block.id===data.plan!.planId):undefined
 const dayTasks=tasks!==undefined?tasks.filter(task=>task.day===day):data.tasks
 const cycleContext=cycle?selectedCycleContext(weekDays?.[dayIndex]?.dateISO,cycle):null
 const cycleStatus=cycleContext?.status
 const cycleDayLabel=cycleContext?.status==='estimated'?`Day ${cycleContext.day}`:cycleStatus==='off'?'Cycle context off':cycleStatus==='unsupported-pattern'?'No phase estimate':cycleStatus==='no-date'?'No date added':cycleStatus==='before-start'?'Before your recorded start':'Estimate unavailable'
 const cycleNote=cycleStatus==='estimated'?'Cycle timing for this day is an estimate.':cycleStatus==='off'?'Your plan uses your tasks, availability and fixed commitments.':cycleStatus==='unsupported-pattern'?'This pattern does not use natural-cycle phase estimates. Planning stays neutral.':cycleStatus==='no-date'?'Add a period start date to see an estimate for this day.':cycleStatus==='before-start'?'This day is earlier than the period start date you entered.':cycleStatus==='invalid-length'?'Update your usual cycle length to see an estimate.':'A valid selected date and period start date are needed.'
 const toggle=(id:DailyTaskId)=>{if(day!=='mon')return;if(id==='meeting')setMeetingDone(v=>!v);if(id==='groceries')setGroceriesDone(v=>!v)}
 // Other empty days retain their date strip; SS02 represents the actual empty Today.
 const selectedDate=weekDays?.[dayIndex]?.dateISO
 if(controlled&&!dayBlocks.length&&!dayTasks.length&&selectedDate===localISO())return <EmptyTodayScreen onNavigate={onNavigate} onQuickCapture={onQuickCapture} onAddWithDetails={onAddWithDetails}/>
 return <main className={controlled?'today-screen today-screen--live':day==='tue'?'today-screen today-screen--tuesday-fixture':'today-screen'} data-figma-node={figmaNode}>
  <AppHeader title={day==='tue'&&!controlled?'Tuesday · 24 Oct':'Today'}/>
  <div className="today-screen__scroll">
   <nav className="today-date-strip" aria-label="Week">{strip.map(item=><button key={item.key} type="button" className={item.key===day?'today-date-chip today-date-chip--selected':'today-date-chip'} aria-current={item.key===day?'date':undefined} onClick={()=>{setDay(item.key);onDayChange?.(item.key)}}><span>{item.short}</span><strong>{item.number}</strong></button>)}</nav>
   {planBlock||dayTasks.length?<>{planBlock?<><p className="today-screen__section-label">AGENDA</p>{(controlled?dayBlocks:[planBlock]).map(block=><Fragment key={block.id}><TodayPlanBlock status={controlled?block.status:undefined} fixed={controlled?block.fixed:undefined} title={controlled?block.title:data.plan!.title} time={controlled?block.time:data.plan!.time} rationale={controlled?block.rationale:data.plan!.rationale} onMore={()=>setMenuBlock(block)}/><Button className="today-screen__plan-cta" hierarchy={!controlled&&day==='tue'?'secondary':'primary'} type="button" disabled={controlled&&block.status==='done'} onClick={()=>controlled||data.plan?.cta==='Update progress'?onUpdateProgress(block):onViewPlan()}>{controlled?(block.status==='done'?'Completed':'Update progress'):data.plan!.cta}</Button></Fragment>)}</>:null}<p className="today-screen__section-label">LATER TODAY</p>{dayTasks.map(task=><TaskCard key={task.id} title={task.title} meta={task.meta} kind={task.kind} done={tasks!==undefined?Boolean(task.done):day==='mon'&&(task.id==='meeting'?meetingDone:task.id==='groceries'?groceriesDone:false)} onOpen={()=>onTask(task.id)} onToggleDone={tasks!==undefined?()=>onToggleTaskDone?.(task.id):day==='mon'&&(task.id==='meeting'||task.id==='groceries')?()=>toggle(task.id):undefined}/>)}</>:<><h1 className="today-screen__empty-title">{controlled?`Nothing scheduled for ${weekDays?.[dayIndex]?.label??data.short}`:data.emptyHeadline}</h1><p className="today-screen__empty-body">{controlled?'Your accepted plan keeps this day open. Capture something new only if it needs attention.':data.emptyBody}</p><Button className="today-screen__review-tasks" hierarchy="secondary" type="button" onClick={()=>onNavigate('tasks')}>Review Tasks</Button></>}
   {controlled&&goal&&selectedDate===localISO()?<><p className="today-screen__section-label">RHYTHM POOL</p><section className="today-goal-card" aria-label="Rhythm Pool"><button type="button" className="today-goal-card__open" onClick={goal.onOpen}><span>{goal.challengeTitle}</span><strong>{goal.title}</strong></button><p>{goal.summary}</p>{goal.checkedInToday?<p role="status">Checked in for today.</p>:<Button type="button" hierarchy="secondary" onClick={goal.onCheckIn}>{goal.actionLabel??'Check in for today'}</Button>}</section></>:null}
   <p className="today-screen__section-label">CYCLE CONTEXT</p>
   <PhaseContextCard phase={cycleContext?(cycleContext.phase??'Cycle context'):undefined} tone={cycleContext?(cycleContext.phase??'neutral'):undefined} estimated={cycleContext?cycleStatus==='estimated':undefined} day={cycleContext?cycleDayLabel:data.phase.day} pattern={cycleContext?(cycleStatus==='estimated'?'Energy can vary':'Your preferences'):data.phase.pattern} planNote={cycleContext?cycleNote:data.phase.note} footnote={cycleContext&&cycleStatus!=='estimated'?'You can update your cycle preferences anytime.':undefined} onOpen={onPhase}/>
   <p className="today-screen__quick-rule">Quick capture saves new tasks as Unscheduled.</p>
  </div>
  <BottomNav active="today" onNavigate={onNavigate}/>
  <button className="today-screen__fab" type="button" aria-label="Add task" onClick={()=>setChooser(true)}>+</button>
  {chooser?<AddTaskChooser onDismiss={()=>setChooser(false)} onQuickCapture={()=>{setChooser(false);onQuickCapture()}} onAddWithDetails={()=>{setChooser(false);onAddWithDetails()}}/>:null}
  {menuBlock?<PlanBlockActionsOverlay block={menuBlock} onClose={()=>setMenuBlock(null)} onEdit={()=>{setMenuBlock(null);onEditBlock(menuBlock)}} onWhy={()=>{setMenuBlock(null);onOpenRationale(menuBlock)}}/>:null}
 </main>
}
