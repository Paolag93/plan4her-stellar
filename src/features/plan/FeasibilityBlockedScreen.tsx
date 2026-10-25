import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import'./FeasibilityBlockedScreen.css'

const RESOLUTION_ICONS={
 move:'/assets/plan-resolution-move.svg',
 split:'/assets/plan-resolution-split.svg',
 defer:'/assets/plan-resolution-defer.svg',
}as const

function ResolutionCard({kind,title,description,impact,onClick}:{kind:keyof typeof RESOLUTION_ICONS;title:string;description:string;impact:string;onClick:()=>void}){
 return <button type="button" className="feasibility-resolution" onClick={onClick}>
  <img className="feasibility-resolution__icon" src={RESOLUTION_ICONS[kind]} alt="" width="44" height="44"/>
  <span className="feasibility-resolution__copy"><strong>{title}</strong><span>{description}</span><em>{impact}</em></span>
 </button>
}

export type FeasibilityResolution='move'|'split'|'defer'
export interface FeasibilityBlockedScreenProps {
 onBack:()=>void
 onResolve:(kind:FeasibilityResolution)=>void
 onEditAvailability:()=>void
 onEditTasks?:()=>void
 onRebuild?:()=>void
 requestedMinutes?:number
 availableMinutes?:number
 unscheduled?:readonly {title:string;reason:string}[]
}
function formatMinutes(value:number){const minutes=Math.max(0,Math.round(value));return minutes>=60?`${Math.floor(minutes/60)} h${minutes%60?` ${minutes%60}`:''}`:`${minutes} min`}
export function FeasibilityBlockedScreen({onBack,onResolve,onEditAvailability,onEditTasks,onRebuild,requestedMinutes,availableMinutes,unscheduled}:FeasibilityBlockedScreenProps){
 const controlled=requestedMinutes!==undefined||availableMinutes!==undefined||unscheduled!==undefined
 const hasMetrics=Number.isFinite(requestedMinutes)&&Number.isFinite(availableMinutes)
 const requested=Math.max(0,requestedMinutes??0),available=Math.max(0,availableMinutes??0),excess=Math.max(0,requested-available)
 const intro=!hasMetrics?'Some work could not be scheduled. Review the reasons below, then adjust your tasks or availability.':requested===0?'Review your tasks and availability before rebuilding the plan.':excess>0?`Your tasks request ${formatMinutes(requested)}, with ${formatMinutes(available)} available. Plan4Her won’t overbook your week.`:'Some work needs a different time window. Available time alone may not satisfy fixed times, deadlines or task duration.'

 return <main className="feasibility-screen" data-figma-node="4250:1749">
  <AppHeader title="Plan needs changes" onBack={onBack}/>
  <div className="feasibility-screen__content">
   <h1>This plan doesn’t fit yet</h1>
   <p className="feasibility-screen__intro" style={controlled?{height:'auto',minHeight:60}:undefined}>{controlled?intro:'You have 5 h available for flexible work, but your tasks need 6 h 30. Plan4Her won’t overbook your week.'}</p>
   {controlled?<>
    {hasMetrics?<section className="feasibility-capacity" style={{height:86}}>
     <strong className="feasibility-capacity__label">{excess>0?'Over capacity':'Check time windows'}</strong>
     <b className="feasibility-capacity__metric" style={{width:'auto'}}>{excess>0?`+${formatMinutes(excess)}`:''}</b>
     <p className="feasibility-capacity__explanation" style={{width:'100%'}}>{formatMinutes(requested)} requested · {formatMinutes(available)} available</p>
     <p style={{position:'absolute',top:52,margin:0,fontSize:12,lineHeight:'16px'}}>{excess>0?`Reduce work or add at least ${formatMinutes(excess)} of availability.`:'Review the unscheduled work below.'}</p>
    </section>:null}
    {unscheduled?.length?<div role="status">{unscheduled.map((item,index)=><p key={`${item.title}-${index}`} style={{fontSize:14,lineHeight:'20px'}}><strong>{item.title}</strong><br/>{item.reason}</p>)}</div>:null}
   </>:<section className="feasibility-capacity">
    <strong className="feasibility-capacity__label">Over capacity</strong>
    <b className="feasibility-capacity__metric">+1 h 30</b>
    <p className="feasibility-capacity__explanation">6 h 30 requested · 5 h available</p>
    <div className="feasibility-capacity__bar"><span className="feasibility-capacity__fits"/><span className="feasibility-capacity__excess"/></div>
    <i className="feasibility-capacity__limit"/>
    <span className="feasibility-capacity__limit-label">capacity limit</span>
    <div className="feasibility-capacity__fits-legend"><i/>5 h fits</div>
    <div className="feasibility-capacity__excess-legend"><i/>1 h 30 doesn’t fit</div>
    <small>Free up 1 h 30 before rebuilding the plan.</small>
   </section>}
   <h2>{controlled?'Choose what to adjust':'Choose how to free up 1 h 30'}</h2>
   <div className="feasibility-resolution-options">
    <ResolutionCard kind="move" title="Move less important work" description="Remove a less important task from this week for now." impact={controlled?'Review which work can move':'Moves 1 block · keeps duration'} onClick={()=>onResolve('move')}/>
    <ResolutionCard kind="split" title="Split a longer task" description="Break a long flexible task across smaller viable windows." impact={controlled?'Review viable smaller windows':'Creates smaller blocks'} onClick={()=>onResolve('split')}/>
    <ResolutionCard kind="defer" title="Defer one task" description="Remove a less important task from this week for now." impact={controlled?'Choose work to leave unscheduled':'Frees 90 min this week'} onClick={()=>onResolve('defer')}/>
   </div>
   <button className="feasibility-screen__availability" type="button" onClick={onEditAvailability}>Edit availability instead</button>
   {onEditTasks?<button className="feasibility-screen__availability" type="button" onClick={onEditTasks}>Edit tasks</button>:null}
   <div className="feasibility-screen__spacer" aria-hidden="true"/>
   <Button className="feasibility-screen__rebuild" type="button" disabled={!onRebuild} onClick={onRebuild}>Rebuild plan</Button>
  </div>
 </main>
}
