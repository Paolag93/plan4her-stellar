import{AppHeader}from'../../components/AppHeader'
import'./RecoveryHelpScreen.css'

export function RecoveryHelpScreen({onBack}:{onBack:()=>void}){
 return <main className="recovery-help-screen" data-figma-node="4317:5659">
  <AppHeader title="When a task isn’t finished" onBack={onBack}/>
  <div className="recovery-help-screen__content">
   <h1>Only unfinished work changes</h1>
   <section><strong>Choose a fix</strong><span>Move later or split the remaining work into smaller viable blocks.</span></section>
   <section><strong>Preview before applying</strong><span>You see exactly what would change before your plan is updated.</span></section>
   <section className="recovery-help-screen__accent"><strong>Undo remains available</strong><span>After a change, Undo restores the plan you had before.</span></section>
   <p>Fixed commitments and completed work stay protected.</p>
   <div className="recovery-help-screen__spacer" aria-hidden="true"/>
  </div>
 </main>
}
