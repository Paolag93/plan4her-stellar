import{useState}from'react'
import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import{RecoveryOption,type RecoveryChoice}from'./RecoveryOption'
import'./RecoveryOptionsScreen.css'

export type RecoveryOptionsMode='missed'|'partial'
export function RecoveryOptionsScreen({mode,error,remainingMinutes=45,initial=null,onBack,onPreview,onHelp}:{mode:RecoveryOptionsMode;error?:string|null;remainingMinutes?:number;initial?:RecoveryChoice|null;onBack:()=>void;onPreview:(choice:RecoveryChoice)=>void;onHelp?:()=>void}){
 const[selected,setSelected]=useState<RecoveryChoice|null>(initial)
 const partial=mode==='partial'
 const node=partial?(selected==='move'?'4216:3818':selected==='split'?'4272:1932':'4216:3809'):(selected==='move'?'4199:1066':selected==='split'?'4272:1884':'4198:207')
 return <main className="recovery-options-screen" data-figma-node={node}>
  <AppHeader title={partial?'Remaining work':'Recovery options'} onBack={onBack}/>
  <div className="recovery-options-screen__content">
   <h1>{partial?`${remainingMinutes} minutes remain`:'What should happen next?'}</h1>
   <p className="recovery-options-screen__intro">{partial?`Only the unfinished ${remainingMinutes} minutes will change.`:'Pick one. You’ll review the exact change before applying it.'}</p>
   <RecoveryOption choice="move" title="Move later" description={partial?`Move the remaining ${remainingMinutes} minutes to the next open window.`:'Place the work in the next open window.'} impact={partial?`1 block · ${remainingMinutes} min`:'1 block · same duration'} selected={selected==='move'} onSelect={()=>setSelected('move')}/>
   <RecoveryOption choice="split" title="Split into two" description={partial?`Split the remaining ${remainingMinutes} minutes into two shorter sessions.`:'Break the work into two shorter sessions.'} impact={partial?`2 shorter blocks · ${remainingMinutes} min total`:'2 shorter blocks · same total time'} selected={selected==='split'} onSelect={()=>setSelected('split')}/>
   <p className="recovery-options-screen__note">Fixed commitments and completed work stay untouched.</p>
   {error?<p role="alert">{error}</p>:null}
   <Button className="recovery-options-screen__preview" type="button" disabled={!selected} onClick={()=>selected&&onPreview(selected)}>Preview changes</Button>
   {!partial&&!selected?<Button className="recovery-options-screen__help" hierarchy="tertiary" type="button" onClick={onHelp}>What happens to unfinished work?</Button>:null}
  </div>
 </main>
}
