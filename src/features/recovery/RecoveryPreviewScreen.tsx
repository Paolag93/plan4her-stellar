import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import{RecoveryDiff}from'./RecoveryDiff'
import type{RecoveryPresentation}from'./recoveryData'
import'./RecoveryPreviewScreen.css'

export type RecoveryPreviewKind='missed-move'|'missed-split'|'partial-move'|'partial-split'
const data={
 'missed-move':{node:'4198:217',headline:'1 block would move',body:'Nothing changes until you apply it.',title:'Prepare proposal',status:'Moved' as const,before:'Today · 09:00–10:30',after:'Today · 14:00–15:30',reason:'Next available focus window.',size:'move' as const},
 'missed-split':{node:'4379:5647',headline:'1 block would split',body:'Nothing changes until you apply it.',title:'Prepare proposal',status:'Split' as const,before:'Today · 09:00–10:30',after:'Today · 15:00–15:45 + Tomorrow · 09:00–09:45',reason:'Two shorter blocks · same total time.',size:'split' as const},
 'partial-move':{node:'4379:5767',headline:'45 min would move',body:'Only the unfinished work changes.',title:'Prepare proposal · remaining work',status:'Moved' as const,before:'Today · 45 min remaining',after:'Tomorrow · 09:00–09:45',reason:'Moves only the unfinished work.',size:'partial' as const},
 'partial-split':{node:'4379:5875',headline:'45 min would split',body:'Only the unfinished work changes.',title:'Prepare proposal · remaining work',status:'Split' as const,before:'Today · 45 min remaining',after:'Today · 20 min + Tomorrow · 25 min',reason:'Two shorter blocks · 45 min total.',size:'partial' as const},
}
export function RecoveryPreviewScreen({kind,proposal,onBack,onKeep,onApply}:{proposal?:RecoveryPresentation;kind:RecoveryPreviewKind;onBack:()=>void;onKeep:()=>void;onApply:()=>void}){
 const fixture=data[kind]
 const d=proposal?{...fixture,...proposal,headline:proposal.headline??(kind.endsWith('split')?'1 block would split':'1 block would move'),body:proposal.body??fixture.body}:fixture
 return <main className={`recovery-preview-screen${proposal?' live-content-screen':''}`} data-figma-node={d.node}>
  <AppHeader title="Review changes" onBack={onBack}/>
  <div className="recovery-preview-screen__content">
   <h1>{d.headline}</h1><p className="recovery-preview-screen__intro">{d.body}</p>
   <RecoveryDiff title={d.title} status={d.status} before={d.before} after={d.after} reason={d.reason} size={d.size}/>
   <p className="recovery-preview-screen__note">Fixed commitments and completed work stay untouched.</p>
   <Button className="recovery-preview-screen__keep" hierarchy="secondary" type="button" onClick={onKeep}>Keep plan as is</Button>
   <Button className="recovery-preview-screen__apply" type="button" onClick={onApply}>Apply change</Button>
  </div>
 </main>
}
