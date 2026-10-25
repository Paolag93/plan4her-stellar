import{comparePlanBlocks,type PlanComparisonProps}from'./planData'
import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import type{AdjustScope}from'./AdjustPlanScopeScreen'
import'./PlanDiffScreen.css'

function DiffCard({kind,title,before,after,note}:{kind:string;title:string;before:string;after:string;note:string}){
 return <article className={kind==='Split'?'plan-diff-card plan-diff-card--split':'plan-diff-card'}>
  <header className="plan-diff-card__top"><strong>{title}</strong><em className={kind==='Split'?'plan-diff-card__badge plan-diff-card__badge--split':'plan-diff-card__badge plan-diff-card__badge--moved'}>{kind}</em></header>
  <div className="plan-diff-card__columns">
   <div className="plan-diff-card__before"><span>Before</span><p>{before}</p></div>
   <div className="plan-diff-card__after"><span>After</span><p>{after}</p></div>
  </div>
  <small>{note}</small>
 </article>
}

export function PlanDiffScreen({scope,onBack,onKeep,onApply,changes,before,after,previousVersion,currentVersion,scheduledLoad}:PlanComparisonProps&{scope:AdjustScope;onBack:()=>void;onKeep:()=>void;onApply:()=>void}){
 const week=scope==='week'
 const actual=changes??(before&&after?comparePlanBlocks(before,after):undefined)
 return <main className={`plan-diff-screen${actual?' plan-diff-screen--dynamic':''}`} data-figma-node={week?'4199:1180':'4380:5991'}>
  <AppHeader title="Review changes" onBack={onBack}/>
  <div className="plan-diff-screen__content" role="region" aria-label="Proposed plan changes" tabIndex={0}>
   <h1>{actual?`${actual.length} ${actual.length===1?'block':'blocks'} would change`:week?'2 blocks would change':'1 block would change'}</h1>{previousVersion||currentVersion?<p>{previousVersion??'Previous plan'} → {currentVersion??'Current plan'}</p>:null}
   <p className="plan-diff-screen__intro">Nothing changes until you apply this preview.</p>
   <section className="plan-diff-screen__protected"><strong>Fixed commitments stay untouched</strong><span>{scheduledLoad===undefined?(actual?'No completed task is reopened.':'Planned load remains 65% · no completed task is reopened.'):`Planned load ${Math.round(scheduledLoad)}% · no completed task is reopened.`}</span></section>
   {actual?actual.map(change=><DiffCard key={change.id} {...change}/>):<>
   <DiffCard kind="Moved" title="Prepare proposal" before="Monday · 09:00–10:30" after="Monday · 14:00–15:30" note="Moved to protect the new fixed commitment."/>
   {week?<DiffCard kind="Split" title="Research notes" before="Tuesday · 10:00–11:00" after="Tue · 10:00–10:30 + Wed · 11:00–11:30" note="Split into two 30-minute blocks to keep daily load viable."/>:null}
   </>}
   <div className={week?'plan-diff-screen__spacer':'plan-diff-screen__spacer plan-diff-screen__spacer--today'}/>
   <Button className="plan-diff-screen__keep" hierarchy="secondary" type="button" onClick={onKeep}>Keep plan as is</Button>
   <Button className="plan-diff-screen__apply" type="button" onClick={onApply} disabled={actual?.length===0}>{week?'Apply changes':'Apply change'}</Button>
  </div>
 </main>
}
