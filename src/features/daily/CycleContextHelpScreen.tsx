import{AppHeader}from'../../components/AppHeader'
import'./CycleContextHelpScreen.css'

export function CycleContextHelpScreen({onBack}:{onBack:()=>void}){
 return <main className="cycle-help-screen" data-figma-node="4317:5697">
  <AppHeader title="How cycle context is used" onBack={onBack}/>
  <div className="cycle-help-screen__content">
   <h1>Cycle context is a planning preference</h1>
   <section><strong>Use what you know</strong><span>You can update cycle day, typical length and estimate confidence.</span></section>
   <section><strong>Uncertainty stays visible</strong><span>Estimated context is labeled as estimated instead of being presented as certain.</span></section>
   <section className="cycle-help-screen__accent"><strong>Planning, not diagnosis</strong><span>Cycle context can shape planning suggestions; it is never a medical diagnosis or a rule.</span></section>
   <p>You can turn this preference off or change it at any time.</p>
   <div className="cycle-help-screen__spacer" aria-hidden="true"/>
  </div>
 </main>
}
