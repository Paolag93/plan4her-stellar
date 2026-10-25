import{useState,useEffect}from'react'
import type{RootTab}from'../../components/BottomNav'
import{PLAN_BLOCKS,type PlanBlockData}from'../plan/planData'
import{CompleteBlockScreen,type CompletionResult}from'./CompleteBlockScreen'
import{CycleContextHelpScreen}from'./CycleContextHelpScreen'
import{CycleContextScreen,type CycleContextValues}from'./CycleContextScreen'
import{MoreScreen}from'./MoreScreen'
import{TodayScreen}from'./TodayScreen'
import type{DailyDayKey,DailyTaskId,DailyTaskData}from'./todayData'
import{MissedBlockScreen}from'../recovery/MissedBlockScreen'
import{RecoveryAppliedScreen,type RecoveryAppliedKind}from'../recovery/RecoveryAppliedScreen'
import{RecoveryHelpScreen}from'../recovery/RecoveryHelpScreen'
import{RecoveryOptionsScreen,type RecoveryOptionsMode}from'../recovery/RecoveryOptionsScreen'
import type{RecoveryPresentation}from'../recovery/recoveryData'
import type{RecoveryChoice}from'../recovery/RecoveryOption'
import{RecoveryPreviewScreen,type RecoveryPreviewKind}from'../recovery/RecoveryPreviewScreen'

type DailyView='today'|'complete'|'missed'|'options'|'preview'|'applied'|'recovery-help'|'more'|'cycle'|'cycle-help'

function dayFromQa(qa?:string|null):DailyDayKey{
 if(qa==='today-tue')return'tue';if(qa==='today-wed')return'wed';if(qa==='today-thu')return'thu';if(qa==='today-fri')return'fri';if(qa==='today-sat')return'sat';if(qa==='today-sun')return'sun';return'mon'
}
function doneFromQa(qa?:string|null){return{meeting:qa==='today-meeting-done'||qa==='today-both-done',groceries:qa==='today-groceries-done'||qa==='today-both-done'}}
function completionFromQa(qa?:string|null):CompletionResult|null{return qa==='complete-done'?'done':qa==='complete-partial'?'partial':qa==='complete-missed'?'missed':null}
function modeFromQa(qa?:string|null):RecoveryOptionsMode{return qa?.includes('partial')?'partial':'missed'}
function choiceFromQa(qa?:string|null):RecoveryChoice|null{return qa?.includes('split')?'split':qa?.includes('move')?'move':null}
function previewFromQa(qa?:string|null):RecoveryPreviewKind{
 if(qa==='recovery-preview-missed-split')return'missed-split'
 if(qa==='recovery-preview-partial-move')return'partial-move'
 if(qa==='recovery-preview-partial-split')return'partial-split'
 return'missed-move'
}
function appliedFromQa(qa?:string|null):RecoveryAppliedKind{
 if(qa==='recovery-applied-missed-split')return'missed-split'
 if(qa==='recovery-applied-partial-move')return'partial-move'
 if(qa==='recovery-applied-partial-split')return'partial-split'
 return'missed-move'
}
function viewFromQa(qa?:string|null,entry:'today'|'more'='today'):DailyView{
 if(qa?.startsWith('complete'))return'complete'
 if(qa==='recovery-missed')return'missed'
 if(qa==='recovery-help')return'recovery-help'
 if(qa?.startsWith('recovery-options')||qa?.startsWith('recovery-partial'))return'options'
 if(qa?.startsWith('recovery-preview'))return'preview'
 if(qa?.startsWith('recovery-applied'))return'applied'
 if(qa==='more')return'more'
 if(qa==='cycle-context'||qa==='cycle-context-off'||qa==='cycle-context-focused')return'cycle'
 if(qa==='cycle-help')return'cycle-help'
 return entry
}

export interface DailyFlowProps{
 blocks?:PlanBlockData[]
 tasks?:DailyTaskData[]
 weekDays?:ReadonlyArray<{short:string;number:string;label?:string;date?:string;dateISO?:string}>
 cycle?:CycleContextValues
 onToggleTaskDone?:(id:string)=>void
 onComplete?:(block:PlanBlockData,result:CompletionResult)=>boolean|void
 onPreviewRecovery?:(block:PlanBlockData,mode:RecoveryOptionsMode,choice:RecoveryChoice)=>RecoveryPresentation|null
 onApplyRecovery?:()=>boolean|void
 onUndoRecovery?:()=>boolean|void
 onSaveCycle?:(values:CycleContextValues)=>boolean|void
 qa?:string|null
 navigationKey?:number
 entry?:'today'|'more'
 onPlan:()=>void
 onTasks:()=>void
 onQuickCapture:()=>void
 onAddWithDetails:()=>void
 onTask:(id:DailyTaskId)=>void
 onOpenRationale:(block:PlanBlockData)=>void
 onEditBlock:(block:PlanBlockData)=>void
 onPlanningPreferences?:()=>void
 onPrivacy?:()=>void
 onGuidance?:()=>void
}

export function DailyFlow({blocks,tasks,weekDays,cycle,onToggleTaskDone,onComplete,onPreviewRecovery,onApplyRecovery,onUndoRecovery,onSaveCycle,qa,entry='today',navigationKey=0,onPlan,onTasks,onQuickCapture,onAddWithDetails,onTask,onOpenRationale,onEditBlock,onPlanningPreferences,onPrivacy,onGuidance}:DailyFlowProps){
 const[selectedDay,setSelectedDay]=useState<DailyDayKey>(()=>qa?dayFromQa(qa):(['sun','mon','tue','wed','thu','fri','sat']as DailyDayKey[])[new Date().getDay()])
 const[cycleDraft,setCycleDraft]=useState<CycleContextValues|undefined>()
 const[selectedBlock,setSelectedBlock]=useState<PlanBlockData|undefined>(()=>blocks===undefined?PLAN_BLOCKS[0]:blocks[0])
 const[proposal,setProposal]=useState<RecoveryPresentation|undefined>()
 const[recoveryError,setRecoveryError]=useState<string|null>(null)
 const[view,setView]=useState<DailyView>(()=>viewFromQa(qa,entry))
 useEffect(()=>{if(navigationKey>0)setView(entry)},[navigationKey,entry])
 const[completion,setCompletion]=useState<CompletionResult|null>(()=>completionFromQa(qa))
 const[recoveryMode,setRecoveryMode]=useState<RecoveryOptionsMode>(()=>modeFromQa(qa))
 const[recoveryChoice,setRecoveryChoice]=useState<RecoveryChoice|null>(()=>choiceFromQa(qa))
 const[previewKind,setPreviewKind]=useState<RecoveryPreviewKind>(()=>previewFromQa(qa))
 const[appliedKind,setAppliedKind]=useState<RecoveryAppliedKind>(()=>appliedFromQa(qa))
 const[cycleReturn,setCycleReturn]=useState<'today'|'more'>('today')

 const navigate=(tab:RootTab)=>{if(tab==='today')setView('today');else if(tab==='plan')onPlan();else if(tab==='tasks')onTasks();else setView('more')}
 const openCycle=(from:'today'|'more')=>{setCycleDraft(undefined);setCycleReturn(from);setView('cycle')}
 const openPreview=(mode:RecoveryOptionsMode,choice:RecoveryChoice)=>{setRecoveryError(null);if(blocks!==undefined){if(!selectedBlock||!onPreviewRecovery){setRecoveryError('This block cannot be recovered yet.');return}const next=onPreviewRecovery(selectedBlock,mode,choice);if(!next){setRecoveryError('No open window fits this work. Keep it unscheduled or update your availability.');return}setProposal(next)}setRecoveryMode(mode);setRecoveryChoice(choice);const kind=(mode==='partial'?`partial-${choice}`:`missed-${choice}`)as RecoveryPreviewKind;setPreviewKind(kind);setView('preview')}
 const applyPreview=()=>{if((blocks!==undefined&&!onApplyRecovery)||onApplyRecovery?.()===false){setRecoveryError('This change could not be applied. Review the plan and try again.');return}setAppliedKind(previewKind as RecoveryAppliedKind);setView('applied')}

 switch(view){
  case'complete':return<CompleteBlockScreen block={selectedBlock} initial={completion} onBack={()=>setView('today')} onContinue={result=>{if(selectedBlock&&onComplete?.(selectedBlock,result)===false)return;setCompletion(result);if(result==='done')setView('today');else if(result==='partial'){setRecoveryMode('partial');setRecoveryChoice(null);setView('options')}else setView('missed')}}/>
  case'missed':return<MissedBlockScreen block={selectedBlock} onBack={()=>{setCompletion('missed');setView('complete')}} onChoose={()=>{setRecoveryMode('missed');setRecoveryChoice(null);setView('options')}} onLeave={()=>setView('today')}/>
  case'options':return<RecoveryOptionsScreen error={recoveryError} remainingMinutes={blocks!==undefined&&selectedBlock?Math.ceil((parseInt(selectedBlock.duration)||0)/2):undefined} mode={recoveryMode} initial={recoveryChoice} onBack={()=>recoveryMode==='partial'?(setCompletion('partial'),setView('complete')):setView('missed')} onPreview={choice=>openPreview(recoveryMode,choice)} onHelp={()=>setView('recovery-help')}/>
  case'preview':return<RecoveryPreviewScreen proposal={proposal} kind={previewKind} onBack={()=>setView('options')} onKeep={()=>setView('today')} onApply={applyPreview}/>
  case'applied':return<RecoveryAppliedScreen proposal={proposal} selectedBlock={selectedBlock} kind={appliedKind} onBackToday={()=>setView('today')} onUndo={()=>{if(onUndoRecovery?.()!==false)setView('today')}} onNavigate={navigate} onEditBlock={onEditBlock} onOpenRationale={onOpenRationale}/>
  case'recovery-help':return<RecoveryHelpScreen onBack={()=>setView('options')}/>
  case'more':return<MoreScreen onPlanningPreferences={onPlanningPreferences} onCycleContext={()=>openCycle('more')} onPrivacy={onPrivacy} onHelp={onGuidance} onNavigate={navigate}/>
  case'cycle':return<CycleContextScreen value={cycleDraft??cycle} initialEnabled={qa!=='cycle-context-off'} initialFocused={qa==='cycle-context-focused'} onBack={()=>setView(cycleReturn)} onSave={values=>{if(onSaveCycle?.(values)!==false)setView('more')}} onHelp={values=>{if(cycle)setCycleDraft(values);setView('cycle-help')}}/>
  case'cycle-help':return<CycleContextHelpScreen onBack={()=>setView('cycle')}/>
  default:return<TodayScreen blocks={blocks} tasks={tasks} weekDays={weekDays} cycle={cycle} onToggleTaskDone={onToggleTaskDone} initialDay={selectedDay} onDayChange={setSelectedDay} initialDone={doneFromQa(qa)} onUpdateProgress={block=>{setSelectedBlock(block);setProposal(undefined);setRecoveryError(null);setCompletion(null);setView('complete')}} onViewPlan={onPlan} onTask={onTask} onPhase={()=>openCycle('today')} onNavigate={navigate} onQuickCapture={onQuickCapture} onAddWithDetails={onAddWithDetails} onOpenRationale={onOpenRationale} onEditBlock={onEditBlock}/>
 }
}
