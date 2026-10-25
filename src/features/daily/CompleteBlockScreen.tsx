import{useState}from'react'
import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import{ChoiceCard}from'../../components/ChoiceCard'
import{PLAN_BLOCKS,type PlanBlockData}from'../plan/planData'
import{TodayPlanBlock}from'./TodayPlanBlock'
import'./CompleteBlockScreen.css'

export type CompletionResult='done'|'partial'|'missed'
export interface CompleteBlockScreenProps{block?:PlanBlockData;initial?:CompletionResult|null;onBack:()=>void;onContinue:(result:CompletionResult)=>void}

const choices:Array<{value:CompletionResult;title:string;description:string}>=[
 {value:'done',title:'Done',description:'Finished as planned.'},
 {value:'partial',title:'Partially done',description:'Some work remains.'},
 {value:'missed',title:'Missed',description:'This block didn’t happen.'},
]

export function CompleteBlockScreen({block=PLAN_BLOCKS[0],initial=null,onBack,onContinue}:CompleteBlockScreenProps){
 const[selected,setSelected]=useState<CompletionResult|null>(initial)
 const node=selected==='done'?'4199:907':selected==='partial'?'4199:960':selected==='missed'?'4199:1013':'4198:185'
 return <main className={`complete-block-screen${block.dateISO?' live-content-screen complete-block-screen--live':''}`} data-figma-node={node}>
  <AppHeader title="Complete block" onBack={onBack}/>
  <div className="complete-block-screen__content">
   <h1>What happened?</h1>
   <p className="complete-block-screen__intro">Choose one. Nothing moves until you review the next step.</p>
   <TodayPlanBlock title={block.title} time={block.time}/>
   <div className="complete-block-screen__choices" role="radiogroup" aria-label="Completion result">{choices.map(choice=><ChoiceCard key={choice.value} title={choice.title} description={choice.description} selected={selected===choice.value} onClick={()=>setSelected(choice.value)}/>)}</div>
   <p className="complete-block-screen__note">Nothing moves automatically.</p>
   <Button className="complete-block-screen__continue" type="button" disabled={!selected} onClick={()=>selected&&onContinue(selected)}>Continue</Button>
  </div>
 </main>
}
