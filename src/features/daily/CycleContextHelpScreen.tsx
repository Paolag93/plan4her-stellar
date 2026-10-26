import{AppHeader}from'../../components/AppHeader'
import'./CycleContextHelpScreen.css'

export function CycleContextHelpScreen({onBack}:{onBack:()=>void}){
 return <main className="cycle-help-screen" data-figma-node="4317:5697">
  <AppHeader title="How cycle context is used" onBack={onBack}/>
  <div className="cycle-help-screen__content">
   <h1>Your rhythm, working for you</h1>
   <section><strong>Use what you know</strong><span>You can update cycle day, typical length and estimate confidence.</span></section>
   <section><strong>Estimates, clearly labeled</strong><span>Cycle day and phase are estimates, and Plan4Her always shows them that way.</span></section>
   <section className="cycle-help-screen__accent"><strong>Planning, not diagnosis</strong><span>Cycle insights shape your plan. They never diagnose you or set rules for you.</span></section>
   <p>You can turn this preference off or change it at any time.</p>
   <div className="cycle-help-screen__spacer" aria-hidden="true"/>
  </div>
 </main>
}
