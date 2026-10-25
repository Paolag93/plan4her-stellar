import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import type{PlanBlockData}from'../plan/planData'
import'./MissedBlockScreen.css'
export function MissedBlockScreen({block,onBack,onChoose,onLeave}:{block?:PlanBlockData;onBack:()=>void;onChoose:()=>void;onLeave:()=>void}){
 return <main className={`missed-block-screen${block?.dateISO?' live-content-screen':''}`} data-figma-node="4198:197">
  <AppHeader title="Recover work" onBack={onBack}/>
  <div className="missed-block-screen__content">
   <h1>This block was missed</h1>
   <p className="missed-block-screen__intro">Nothing has moved yet. Fixed commitments stay protected.</p>
   <section className="missed-block-card"><span className="missed-block-card__check"/><div><span className="missed-block-card__top"><strong>{block?.title??'Prepare proposal'}</strong><em>Missed</em></span><span className="missed-block-card__meta">{block?.time??'09:00–10:30'} · Missed</span><span className="missed-block-card__badge">Flexible</span></div></section>
   <p className="missed-block-screen__label">WHAT NEXT</p>
   <p className="missed-block-screen__copy">Choose what happens to the unfinished work. You’ll preview the change first.</p>
   <Button className="missed-block-screen__choose" type="button" onClick={onChoose}>Choose what happens next</Button>
   <Button className="missed-block-screen__leave" hierarchy="tertiary" type="button" onClick={onLeave}>Leave unscheduled</Button>
  </div>
 </main>
}
