import { useState, useEffect, useCallback, useRef } from 'react'
import { DataTransferPanel } from '../features/data-transfer/DataTransferPanel'
import { CyclePreferencesScreen } from '../features/cycle-preferences/CyclePreferencesScreen'
import { createDefaultCyclePreferences } from '../domain/cyclePreferences'
import { AvailabilityScreen } from '../features/quick-start/AvailabilityScreen'
import { CycleBasicsScreen } from '../features/quick-start/CycleBasicsScreen'
import { CycleModeScreen, type CycleMode } from '../features/quick-start/CycleModeScreen'
import { FixedCommitmentsScreen } from '../features/quick-start/FixedCommitmentsScreen'
import { LoadingPlanScreen } from '../features/quick-start/LoadingPlanScreen'
import { PrivacyScreen } from '../features/quick-start/PrivacyScreen'
import { StarterTasksScreen } from '../features/quick-start/StarterTasksScreen'
import { OnboardingIntroScreen } from '../features/start/OnboardingIntroScreen'
import { NoExactDateScreen } from '../features/quick-start/NoExactDateScreen'
import { StartScreen } from '../features/start/StartScreen'
import { DailyFlow } from '../features/daily/DailyFlow'
import type { DailyTaskId } from '../features/daily/todayData'
import { ActivePlanScreen } from '../features/plan/ActivePlanScreen'
import { AdjustPlanScopeScreen, type AdjustScope } from '../features/plan/AdjustPlanScopeScreen'
import { EditPlanBlockScreen } from '../features/plan/EditPlanBlockScreen'
import { PlanAcceptedScreen } from '../features/plan/PlanAcceptedScreen'
import { PlanDiffScreen } from '../features/plan/PlanDiffScreen'
import { PLAN_BLOCKS, type PlanBlockData, type PlanBlockId } from '../features/plan/planData'
import { PlanRationaleScreen } from '../features/plan/PlanRationaleScreen'
import { ReviewPlanScreen } from '../features/plan/ReviewPlanScreen'
import { FeasibilityBlockedScreen } from '../features/plan/FeasibilityBlockedScreen'
import { RecentChangesScreen } from '../features/plan/RecentChangesScreen'
import { RestorePreviewScreen } from '../features/plan/RestorePreviewScreen'
import { AddTaskScreen } from '../features/tasks/AddTaskScreen'
import { QuickCaptureScreen } from '../features/tasks/QuickCaptureScreen'
import { TaskDetailsScreen } from '../features/tasks/TaskDetailsScreen'
import { TasksScreen, type CanonicalTaskId, type TaskItem } from '../features/tasks/TasksScreen'

import { createInitialState, STORAGE_KEY, loadState, saveState, clearState, generateWeeklyPlan, acceptPlan, applyProposal, applyDraftProposal, proposeTaskSelection, undoLastChange, proposeEdit, proposeAdjustment, proposeFeasibilityResolution, planningIssues, proposeRecovery, proposeRestore, updateBlockStatus, localISO, weekDays, currentWeekStart, starterTasksForPack, type AppState, type PlanProposal } from '../domain'
import { PrivacyDataScreen, ClearDataConfirmation, HelpScreen, WeeklyPlanningHelp, PlanAdjustmentsHelp, SystemStateScreen, EmptyTodayScreen, AIUnavailableScreen, BasicFallbackScreen } from '../features/system'
import { RecoveryHelpScreen } from '../features/recovery/RecoveryHelpScreen'
import { CycleContextHelpScreen } from '../features/daily/CycleContextHelpScreen'
import { CommunityFlow, communityFixture, entryFromQa, type CommunityEntry } from '../features/community/CommunityFlow'
import type { BackupBundle } from '../features/community/EncryptedBackupScreen'
import { activeParticipation, clearCommunity, createCommunityState, loadCommunity, poolProgress, saveCommunity, syncTaskCompletion, POOL_WEEKS, type CommunityState } from '../domain/community'

type MvpScreen =
  | 'start' | 'intro-rhythm' | 'intro-control' | 'privacy' | 'cycle-mode' | 'cycle-basics' | 'no-exact-date' | 'starter-tasks' | 'availability'
  | 'fixed-commitments' | 'loading-plan' | 'review-plan' | 'plan-rationale' | 'plan-edit' | 'plan-accepted'
  | 'active-plan' | 'adjust-scope' | 'plan-diff' | 'plan-applied' | 'feasibility-blocked' | 'recent-changes' | 'restore-preview' | 'restore-applied'
  | 'planning-preferences' | 'tasks' | 'quick-capture' | 'add-task' | 'task-details' | 'daily'
  | 'empty-today' | 'ai-unavailable' | 'basic-fallback' | 'privacy-data' | 'clear-data' | 'help' | 'weekly-help' | 'adjust-help' | 'recovery-help' | 'cycle-help' | 'system-error' | 'insufficient' | 'offline' | 'community'

const canonicalTaskLibrary: Record<CanonicalTaskId, TaskItem> = {
  dentist:{id:'dentist',canonicalId:'dentist',title:'Call dentist',meta:'30 min',kind:'Flexible',duration:'30 min',deadline:'Fri 27 Oct',importance:'Important'},
  groceries:{id:'groceries',canonicalId:'groceries',title:'Buy groceries',meta:'30 min',kind:'Flexible',duration:'30 min',deadline:'No deadline',importance:'Important'},
  yoga:{id:'yoga',canonicalId:'yoga',title:'Yoga class',meta:'Wed 18:00–19:30',kind:'Fixed',duration:'90 min',fixedDate:'Wed 25 Oct',startTime:'18:00',importance:'Important'},
  meeting:{id:'meeting',canonicalId:'meeting',title:'Team meeting',meta:'Mon 11:00–11:45',kind:'Fixed',duration:'45 min',fixedDate:'Mon 23 Oct',startTime:'11:00',importance:'Important'},
  prescription:{id:'prescription',canonicalId:'prescription',title:'Pick up prescription',meta:'30 min',kind:'Flexible',duration:'30 min',deadline:'No deadline',importance:'Important'},
}
const canonicalTasks:TaskItem[]=[canonicalTaskLibrary.dentist,canonicalTaskLibrary.groceries,canonicalTaskLibrary.yoga]

function qaMode(){return new URLSearchParams(window.location.search).get('qa')}
function detailQaTaskId():CanonicalTaskId|null{const qa=qaMode();if(qa==='task-details'||qa==='task-details-dentist')return'dentist';if(qa==='task-details-groceries')return'groceries';if(qa==='task-details-yoga')return'yoga';if(qa==='task-details-meeting')return'meeting';if(qa==='task-details-prescription')return'prescription';return null}
function planQaBlock():PlanBlockId|null{const qa=qaMode();for(const block of PLAN_BLOCKS){if(qa?.endsWith('-'+block.id))return block.id}return null}
function initialAdjustScope():AdjustScope{return qaMode()?.includes('today')?'today':'week'}
function initialScreenFromQa():MvpScreen{
 const qa=qaMode();if(entryFromQa(qa))return'community';if(qa&&['empty-today','ai-unavailable','basic-fallback','intro-rhythm','intro-control','no-exact-date','privacy-data','clear-data','help','weekly-help','adjust-help','offline','system-error'].includes(qa))return qa as MvpScreen;if(qa==='today'||qa?.startsWith('today-')||qa?.startsWith('complete')||qa?.startsWith('recovery-')||qa==='more'||qa?.startsWith('cycle-'))return'daily';if(qa?.startsWith('tasks'))return'tasks';if(qa==='quick-capture')return'quick-capture';if(qa==='add-task')return'add-task';if(detailQaTaskId())return'task-details'
 if(qa==='loading-plan')return'loading-plan';if(qa==='plan-review')return'review-plan';if(qa==='plan-accepted')return'plan-accepted';if(qa==='plan-active')return'active-plan';if(qa==='plan-feasibility')return'feasibility-blocked';if(qa==='recent-changes')return'recent-changes';if(qa==='restore-preview')return'restore-preview';if(qa==='restore-applied')return'restore-applied'
 if(qa==='adjust-scope')return'adjust-scope';if(qa==='adjust-week'||qa==='adjust-today')return'adjust-scope';if(qa==='plan-diff-week'||qa==='plan-diff-today')return'plan-diff';if(qa==='plan-applied-week'||qa==='plan-applied-today')return'plan-applied'
 if(qa?.startsWith('plan-rationale'))return'plan-rationale';if(qa?.startsWith('plan-edit'))return'plan-edit';return'start'
}
function initialTasksFromQa():TaskItem[]{const qa=qaMode();if(qa==='tasks-empty')return[];const withPrescription=qa?.startsWith('tasks-added')?[...canonicalTasks,canonicalTaskLibrary.prescription]:[...canonicalTasks];const doneId:CanonicalTaskId|null=qa==='tasks-done'||qa==='tasks-done-dentist'||qa==='tasks-added-done-dentist'?'dentist':qa==='tasks-done-groceries'||qa==='tasks-added-done-groceries'?'groceries':qa==='tasks-done-yoga'||qa==='tasks-added-done-yoga'?'yoga':qa==='tasks-added-done-prescription'?'prescription':null;return doneId?withPrescription.map(task=>task.canonicalId===doneId?{...task,done:true}:task):withPrescription}
function initialAddedStateFromQa(){return qaMode()?.startsWith('tasks-added')??false}

export function App(){
 const qa=qaMode();const fixture=Boolean(qa)
 const[loaded]=useState(()=>fixture?{state:createInitialState()}:loadState())
 const[state,setState]=useState<AppState>(loaded.state)
 const storedSnapshot=useRef('snapshot' in loaded?loaded.snapshot??null:null)
 const[loadBlocked,setLoadBlocked]=useState(Boolean(loaded.error))
 const[externalChange,setExternalChange]=useState(false)
 const[storageError,setStorageError]=useState<string|null>(loaded.error??null)
 const[screen,rawSetScreen]=useState<MvpScreen>(()=>fixture?initialScreenFromQa():loaded.state.acceptedPlan?'daily':loaded.state.draftPlan?(loaded.state.draftPlan.unscheduled.length?'feasibility-blocked':'review-plan'):'start')
 const fixtureTrail=useRef<MvpScreen[]>([])
 const screenRef=useRef(screen)
 screenRef.current=screen
 const[dailyMounted,setDailyMounted]=useState(screen==='daily')
 const[dailyNavigationKey,setDailyNavigationKey]=useState(0)
 const[sessionRevision,setSessionRevision]=useState(0)
 const[offlineNotice,setOfflineNotice]=useState(false)
 const offlineFocus=useRef<HTMLElement|null>(null)
 const setScreen=useCallback((next:MvpScreen)=>{
  if(next===screenRef.current)return
  const previousScreen=screenRef.current
  screenRef.current=next
  rawSetScreen(next)
  if(!fixture){
   if(!window.history.state?.screen)window.history.replaceState({screen:previousScreen},'')
   window.history.pushState({screen:next,previousScreen},'',`#${next}`)
  }else fixtureTrail.current.push(previousScreen)
 },[fixture])
 const goBack=(fallback:MvpScreen,onFallback?:()=>void)=>{if(fixture&&fixtureTrail.current.length){const previous=fixtureTrail.current.pop()!;screenRef.current=previous;rawSetScreen(previous)}else if(!fixture&&window.history.state?.previousScreen)window.history.back();else if(onFallback)onFallback();else{screenRef.current=fallback;rawSetScreen(fallback);if(!fixture)window.history.replaceState({screen:fallback},'',`#${fallback}`)}}
 useEffect(()=>{if(!fixture)window.history.replaceState({screen:screenRef.current},'',`#${screenRef.current}`)},[fixture])
 useEffect(()=>{if(fixture)return;const offline=()=>{offlineFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setOfflineNotice(true)};window.addEventListener('offline',offline);if(!navigator.onLine)offline();return()=>window.removeEventListener('offline',offline)},[fixture])
 useEffect(()=>{if(!offlineNotice&&offlineFocus.current?.isConnected){offlineFocus.current.focus({preventScroll:true});offlineFocus.current=null}},[offlineNotice])
 useEffect(()=>{if(screen==='daily')setDailyMounted(true)},[screen])
 useEffect(()=>{const onPop=(event:PopStateEvent)=>{const next=event.state?.screen??(state.acceptedPlan?'daily':'start');if(['daily','active-plan','plan-accepted','plan-applied','recent-changes','restore-preview','restore-applied'].includes(next))setPlanTarget('accepted');else if(next==='review-plan'||next==='feasibility-blocked')setPlanTarget('draft');rawSetScreen(next)};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[state.acceptedPlan])
 const saveCurrent=(next:AppState)=>{const result=saveState(next,undefined,{expectedRaw:storedSnapshot.current});if(result.conflict){setLoadBlocked(true);setExternalChange(true);setStorageError(result.error??'Reload saved data before making changes.')}if(!result.error)storedSnapshot.current=JSON.stringify(next);return result}
 useEffect(()=>{if(!fixture&&!loadBlocked){const result=saveCurrent(state);if(result.error)setStorageError(result.error);else setStorageError(null)}},[state,fixture,loadBlocked])
 const[tasksQa,setTasksQa]=useState<TaskItem[]>(initialTasksFromQa)
 const[loadedCommunity]=useState(()=>fixture?{state:communityFixture(qa,localISO())}:loadCommunity())
 const[community,setCommunity]=useState<CommunityState>(loadedCommunity.state)
 const[communityEntry,setCommunityEntry]=useState<CommunityEntry>(()=>entryFromQa(qa)??'community')
 const[communityKey,setCommunityKey]=useState(0)
 const persistCommunity=(next:CommunityState)=>{if(fixture){setCommunity(next);return true}if(loadedCommunity.error&&next!==community&&!communityUnlocked.current){setStorageError(loadedCommunity.error);return false}const result=saveCommunity(next);if(result.error){setStorageError(result.error);return false}setCommunity(next);return true}
 const communityUnlocked=useRef(!loadedCommunity.error)
 const openCommunity=(entry:CommunityEntry)=>{setCommunityEntry(entry);setCommunityKey(key=>key+1);setScreen('community')}
 const tasks=fixture?tasksQa:state.tasks
 const setTasks=(change:TaskItem[]|((current:TaskItem[])=>TaskItem[]))=>{if(fixture)setTasksQa(change);else setState(current=>({...current,tasks:typeof change==='function'?change(current.tasks):change}))}
 const[proposal,setProposal]=useState<PlanProposal|null>(null)
 const[resolution,setResolution]=useState<'move'|'split'|'defer'|null>(null)
 const[starterPack,setStarterPack]=useState<'balanced'|'work'|'life'>('balanced')
 const[starterCustom,setStarterCustom]=useState('')
 const[helpReturn,setHelpReturn]=useState<MvpScreen>('start')
 const[planError,setPlanError]=useState<string|null>(null)
 const[saveErrorReturn,setSaveErrorReturn]=useState<MvpScreen>('plan-diff')
 const[planTarget,setPlanTarget]=useState<'draft'|'accepted'>(()=>loaded.state.acceptedPlan?'accepted':'draft')
 const acceptedScreen=['daily','active-plan','plan-accepted','plan-applied','recent-changes','restore-preview','restore-applied'].includes(screen)
 const plan=acceptedScreen?state.acceptedPlan:planTarget==='draft'?(state.draftPlan??state.acceptedPlan):(state.acceptedPlan??state.draftPlan)
 const viewData=fixture?{}:{blocks:plan?.blocks??[],week:plan?.week??[],scheduledLoad:plan?.scheduledLoad??0,todayISO:localISO()}
 const input={tasks:state.tasks,availability:state.availability,commitments:state.commitments,cycleBasics:state.cycleBasics,cycleMode:state.cycleMode,cyclePreferences:state.cyclePreferences,weekStart:plan?.weekStart}
 const generate=useCallback(()=>{if(fixture){setScreen('review-plan');return}try{const next=generateWeeklyPlan({tasks:state.tasks,availability:state.availability,commitments:state.commitments,cycleBasics:state.cycleBasics,cycleMode:state.cycleMode,cyclePreferences:state.cyclePreferences});setState(current=>({...current,draftPlan:next}));setPlanTarget('draft');setScreen(next.blocks.length&&!next.unscheduled.length&&!next.warnings.length?'review-plan':'feasibility-blocked')}catch(error){setPlanError(error instanceof Error?error.message:'Unable to build this plan.');setScreen('fixed-commitments')}},[fixture,state.tasks,state.availability,state.commitments,state.cycleBasics,state.cycleMode,state.cyclePreferences,setScreen])
 const persistData=(next:AppState)=>{if(loadBlocked){setStorageError('Saved data needs attention before changes can be saved.');return false}const result=saveCurrent(next);if(result.error){setStorageError(result.error);return false}setStorageError(null);setPlanError(null);setState(next);return true}
 const persistPlan=(next:AppState)=>{if(loadBlocked){setStorageError('Saved data needs attention before a new plan can be saved.');setSaveErrorReturn(screen);setScreen('system-error');return false}const result=saveCurrent(next);if(result.error){setStorageError(result.error);setSaveErrorReturn(screen);setScreen('system-error');return false}setPlanError(null);setState(next);return true}
 const apply=()=>{if(fixture)return true;if(!proposal||proposal.errors.length){setPlanError(proposal?.errors.join(' ')??'Preview a change first.');return false}try{return persistPlan(planTarget==='accepted'&&state.acceptedPlan?applyProposal(state,proposal):applyDraftProposal(state,proposal))}catch(error){setPlanError(error instanceof Error?error.message:'Could not apply this change.');return false}}
 const undo=()=>{if(fixture)return true;try{return persistPlan(undoLastChange(state))}catch(error){setPlanError(error instanceof Error?error.message:'Could not undo this change.');return false}}
 const latest=state.history.filter(entry=>entry.kind!=='accept').at(-1)
 const comparisons=fixture?{}:{changes:proposal?.changes??[],scheduledLoad:proposal?.after.scheduledLoad??plan?.scheduledLoad??0}
 const historyComparison=fixture?{}:{before:latest?.before?.blocks??[],after:latest?.after.blocks??[]}
 const toggleTask=(id:string)=>{if(fixture){setTasks(current=>current.map(t=>t.id===id?{...t,done:!t.done}:t));return}let next={...state,tasks:state.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)};const task=next.tasks.find(t=>t.id===id);for(const block of next.acceptedPlan?.blocks??[])if(block.taskId===id)next=updateBlockStatus(next,block.id,task?.done?'done':'scheduled');if(persistData(next))syncGoalCheckIn(id,Boolean(task?.done))}
 const syncGoalCheckIn=(taskId:string,done:boolean)=>{const next=syncTaskCompletion(community,taskId,done,localISO());if(next!==community)persistCommunity(next)}
 const openHelp=(from:MvpScreen,target:MvpScreen='weekly-help')=>{setHelpReturn(from);setScreen(target)}

 const[selectedTaskId,setSelectedTaskId]=useState<CanonicalTaskId|string>(detailQaTaskId()??'dentist')
 const[addedState,setAddedState]=useState(initialAddedStateFromQa)
 const[savedMessage,setSavedMessage]=useState<'Saved to Tasks'|'Saved as Unscheduled'>('Saved to Tasks')
 const[lastAddedId,setLastAddedId]=useState<string|null>(null)
 const qaBlock=planQaBlock()
 const[selectedPlanBlock,setSelectedPlanBlock]=useState<PlanBlockData>(PLAN_BLOCKS.find(b=>b.id===qaBlock)??PLAN_BLOCKS[0])
 const[planSource,setPlanSource]=useState<'direct'|'overlay'>(qaMode()?.includes('overlay')?'overlay':'direct')
 const[planReturn,setPlanReturn]=useState<'review-plan'|'plan-accepted'|'active-plan'|'plan-applied'|'daily'>('review-plan')
 const[dailyEntry,setDailyEntry]=useState<'today'|'more'>('today')
 const[addTaskReturn,setAddTaskReturn]=useState<MvpScreen>('tasks')
 const[editReturn,setEditReturn]=useState<MvpScreen>('plan-rationale')
 const[taskReturn,setTaskReturn]=useState<'tasks'|'daily'>('tasks')
 const[quickCaptureReturn,setQuickCaptureReturn]=useState<'tasks'|'daily'>('tasks')
 const[noExactDateReturn,setNoExactDateReturn]=useState<'cycle-mode'|'cycle-basics'>('cycle-mode')
 const[adjustScope,setAdjustScope]=useState<AdjustScope>(initialAdjustScope)
 const[adjustSelection,setAdjustSelection]=useState<AdjustScope|null>(()=>qaMode()==='adjust-today'?'today':qaMode()==='adjust-week'?'week':null)

 const selectedTask=tasks.find(task=>task.id===selectedTaskId)??(selectedTaskId in canonicalTaskLibrary?canonicalTaskLibrary[selectedTaskId as CanonicalTaskId]:undefined)??canonicalTaskLibrary.dentist
 const saveNewTask=(task:TaskItem,message:'Saved to Tasks'|'Saved as Unscheduled')=>{if(fixture)setTasks(current=>[...current,task]);else if(!persistData({...state,tasks:[...state.tasks,task]}))return;setLastAddedId(task.id);setSavedMessage(message);setAddedState(true);setScreen('tasks')}
 const undoSaved=()=>{if(lastAddedId){if(fixture)setTasks(current=>current.filter(task=>task.id!==lastAddedId));else if(!persistData({...state,tasks:state.tasks.filter(task=>task.id!==lastAddedId)}))return}setLastAddedId(null);setAddedState(false)}
 const openQuickCapture=(from:'tasks'|'daily')=>{setQuickCaptureReturn(from);setScreen('quick-capture')}
 const openNoExactDate=(from:'cycle-mode'|'cycle-basics')=>{setNoExactDateReturn(from);setScreen('no-exact-date')}
 const openAddTask=()=>{setAddTaskReturn(screen);setScreen('add-task')}
 const openTask=(task:TaskItem,returnTo:'tasks'|'daily'='tasks')=>{setTaskReturn(returnTo);setSelectedTaskId(task.id);setScreen('task-details')}
 const openRationale=(block:PlanBlockData,source:'direct'|'overlay',returnTo:typeof planReturn)=>{setPlanTarget(returnTo==='review-plan'?'draft':'accepted');setSelectedPlanBlock(block);setPlanSource(source);setPlanReturn(returnTo);setScreen('plan-rationale')}
 const openEdit=(block:PlanBlockData,source:'direct'|'overlay',returnTo:typeof planReturn)=>{setProposal(null);setEditReturn(screen);setPlanTarget(returnTo==='review-plan'?'draft':'accepted');setSelectedPlanBlock(block);setPlanSource(source);setPlanReturn(returnTo);setScreen('plan-edit')}
 const openDaily=(entry:'today'|'more'='today')=>{setDailyMounted(true);setDailyNavigationKey(key=>key+1);setPlanTarget('accepted');setDailyEntry(entry);setScreen('daily')}
 const navPlan=(tab:'today'|'plan'|'tasks'|'more')=>{if(tab==='today')openDaily('today');if(tab==='tasks')setScreen('tasks');if(tab==='plan'){setPlanTarget(state.acceptedPlan?'accepted':'draft');setScreen(state.acceptedPlan?'active-plan':state.draftPlan?'review-plan':'start')};if(tab==='more')openDaily('more')}

 const resetDeviceState=()=>{setSessionRevision(revision=>revision+1);fixtureTrail.current=[];setDailyMounted(false);setDailyNavigationKey(0);setOfflineNotice(false);setAddTaskReturn('tasks');setEditReturn('plan-rationale');setState(createInitialState());setProposal(null);setResolution(null);setAdjustSelection(null);setPlanTarget('draft');setSelectedPlanBlock(PLAN_BLOCKS[0]);setSelectedTaskId('dentist');setStarterPack('balanced');setStarterCustom('');setAddedState(false);setLastAddedId(null);setHelpReturn('start');setDailyEntry('today');setTaskReturn('tasks');setAdjustScope('week');setPlanReturn('review-plan');setPlanSource('direct');setLoadBlocked(false);setExternalChange(false);setStorageError(null);setPlanError(null);rawSetScreen('start');window.history.replaceState({screen:'start'},'','#start')}

 useEffect(()=>{if(fixture)return;const clearFromAnotherTab=(event:StorageEvent)=>{if(event.key!==null&&event.key!==STORAGE_KEY)return;if(event.newValue!==null){if(event.newValue!==JSON.stringify(state)){setLoadBlocked(true);setExternalChange(true);setStorageError('Saved data changed in another tab. Reload this tab before making changes.')}return}const latest=loadState();storedSnapshot.current=latest.snapshot??null;resetDeviceState();setState(latest.state);if(latest.error){setLoadBlocked(true);setStorageError(latest.error)}else if(latest.state.acceptedPlan){setPlanTarget('accepted');setDailyMounted(true);rawSetScreen('daily');window.history.replaceState({screen:'daily'},'','#daily')}};window.addEventListener('storage',clearFromAnotherTab);return()=>window.removeEventListener('storage',clearFromAnotherTab)},[fixture,state])

 const dailyPlan=state.acceptedPlan
 const rhythm=activeParticipation(community)
 const rhythmStats=rhythm?poolProgress(rhythm,localISO()):null
 const rhythmWeek=rhythm&&rhythmStats?rhythm.weeks.find(w=>w.week===rhythmStats.week):undefined
 const todayGoal=rhythm&&rhythmStats&&!rhythmStats.ended?{title:rhythmStats.started?`Week ${rhythmStats.week} of ${POOL_WEEKS}`:`Starts Monday ${rhythm.startDate.slice(8)}`,challengeTitle:'Rhythm Pool',summary:rhythmWeek?`${rhythmWeek.items.filter(i=>i.status==='done').length} of ${rhythmWeek.count} commitments done this week · ${Math.round(rhythmStats.ratio*100)}% overall`:'Choose this week\'s 3–5 commitments.',checkedInToday:false,actionLabel:rhythmWeek?'Open my commitments':'Set commitments',onCheckIn:()=>openCommunity('progress'),onOpen:()=>openCommunity('progress')}:undefined
 const restoreBundle=(bundle:BackupBundle)=>{const result=saveCurrent(bundle.app);if(result.error)return result;const saved=saveCommunity(bundle.community);if(saved.error)return saved;communityUnlocked.current=true;resetDeviceState();setState(bundle.app);setCommunity(bundle.community);setPlanTarget(bundle.app.acceptedPlan?'accepted':'draft');const target=bundle.app.acceptedPlan?'daily':bundle.app.draftPlan?'review-plan':'start';setDailyMounted(Boolean(bundle.app.acceptedPlan));rawSetScreen(target);window.history.replaceState({screen:target},'',`#${target}`);return {}}
 const renderDaily=()=><DailyFlow key={sessionRevision} {...(fixture?{}:{blocks:dailyPlan?.blocks??[],tasks:[],weekDays:dailyPlan?.week??weekDays(currentWeekStart()),cycle:{mode:state.cycleMode,enabled:state.cycleMode!==null&&state.cycleMode!=='unsure',lastPeriodStart:state.cycleBasics?.lastPeriodStart??null,cycleLength:state.cycleBasics?.cycleLength??28},onToggleTaskDone:toggleTask,onComplete:(block:PlanBlockData,result:'done'|'partial'|'missed')=>persistData(updateBlockStatus(state,block.id,result)),onPreviewRecovery:(block:PlanBlockData,mode:'partial'|'missed',choice:'move'|'split')=>{if(!dailyPlan)return null;setPlanTarget('accepted');const next=proposeRecovery(dailyPlan,block.id,choice,{...input,weekStart:dailyPlan.weekStart});if(next.errors.length)return null;setProposal(next);return {title:block.title,before:`${block.date} · ${block.time}`,after:next.changes.map(x=>x.after).join(' + '),reason:next.label,blocks:next.after.blocks,actionBlock:next.after.blocks.find(candidate=>candidate.status!=='done'&&(choice==='move'?candidate.id===block.id:candidate.id.startsWith(`${block.id}-part-`))),remainingMinutes:mode==='partial'?Math.ceil(parseInt(block.duration)/2):parseInt(block.duration)}},onApplyRecovery:apply,onUndoRecovery:undo,onSaveCycle:(values:{enabled:boolean;lastPeriodStart:string|null;cycleLength:number})=>persistData({...state,cycleMode:values.enabled?(state.cycleMode&&state.cycleMode!=='unsure'?state.cycleMode:'natural'):null,cycleBasics:{lastPeriodStart:values.lastPeriodStart,cycleLength:values.cycleLength}})})} onPlanningPreferences={fixture?undefined:()=>setScreen('planning-preferences')} community={{onCommunity:()=>openCommunity(activeParticipation(community)?'progress':'community'),onSavings:()=>openCommunity('savings'),onBackup:()=>openCommunity('backup')}} goal={todayGoal} onPrivacy={()=>setScreen('privacy-data')} onGuidance={()=>setScreen('help')} qa={qaMode()} entry={dailyEntry} navigationKey={dailyNavigationKey} onPlan={()=>navPlan('plan')} onTasks={()=>setScreen('tasks')} onQuickCapture={()=>openQuickCapture('daily')} onAddWithDetails={openAddTask} onTask={(id:DailyTaskId)=>{const task=tasks.find(t=>t.id===id)??canonicalTaskLibrary[id as CanonicalTaskId];if(task)openTask(task,'daily')}} onOpenRationale={block=>{setPlanTarget('accepted');setSelectedPlanBlock(block);setPlanSource('overlay');setPlanReturn('daily');setScreen('plan-rationale')}} onEditBlock={block=>{setPlanTarget('accepted');setProposal(null);setEditReturn('daily');setSelectedPlanBlock(block);setPlanSource('overlay');setPlanReturn('daily');setScreen('plan-edit')}}/>

 const renderScreen=()=>{const needsPlan=['review-plan','plan-rationale','plan-edit','plan-accepted','active-plan','adjust-scope','plan-diff','plan-applied','recent-changes','restore-preview','restore-applied'];if(!fixture&&!plan&&needsPlan.includes(screen))return<StartScreen onHowItWorks={()=>setScreen('intro-rhythm')} onBuildFirstWeek={()=>setScreen('privacy')}/>;switch(screen){
  case'intro-rhythm':return<OnboardingIntroScreen step="rhythm" onBack={()=>goBack('start')} onContinue={()=>setScreen('intro-control')} onSetUp={()=>setScreen('privacy')}/>
  case'intro-control':return<OnboardingIntroScreen step="control" onBack={()=>goBack('intro-rhythm')} onContinue={()=>setScreen('privacy')} onSetUp={()=>setScreen('privacy')}/>
  case'no-exact-date':return<NoExactDateScreen onBack={()=>goBack(noExactDateReturn)} onAddPeriodDate={()=>setScreen('cycle-basics')} onContinueWithoutCycle={()=>{setState(c=>({...c,cycleMode:null,cycleBasics:null}));setScreen('starter-tasks')}}/>
  case'privacy':return<PrivacyScreen initialConsent={fixture?undefined:state.analyticsConsent} onChange={value=>setState(c=>({...c,analyticsConsent:value}))} onContinue={value=>{setState(c=>({...c,analyticsConsent:value}));setScreen('cycle-mode')}}/>
  case'cycle-mode':return<CycleModeScreen initialMode={fixture?undefined:state.cycleMode as CycleMode|null} onChange={mode=>setState(c=>({...c,cycleMode:mode}))} onBack={()=>goBack('privacy')} onContinue={(mode:CycleMode)=>mode==='unsure'?openNoExactDate('cycle-mode'):setScreen('cycle-basics')} onSkip={()=>{setState(c=>({...c,cycleMode:null,cycleBasics:null}));setScreen('starter-tasks')}}/>
  case'cycle-basics':return<CycleBasicsScreen onNoExactDate={()=>openNoExactDate('cycle-basics')} initialValues={fixture?undefined:state.cycleBasics??{lastPeriodStart:null,cycleLength:28}} cycleMode={state.cycleMode==='predictable'?'predictable':'natural'} onChange={values=>setState(c=>({...c,cycleBasics:values}))} onBack={()=>goBack('cycle-mode')} onContinue={values=>{setState(c=>({...c,cycleBasics:values}));setScreen('starter-tasks')}}/>
  case'starter-tasks':return<StarterTasksScreen initialPack={starterPack} initialCustomTask={fixture?undefined:starterCustom} onChange={(pack,custom)=>{setStarterPack(pack);setStarterCustom(custom??'')}} onBack={()=>goBack('cycle-mode')} onContinue={(pack,custom)=>{if(!fixture)setTasks(starterTasksForPack(pack,custom));setScreen('availability')}}/>
  case'availability':return<AvailabilityScreen initialValues={fixture?undefined:state.availability} onChange={values=>setState(c=>({...c,availability:values}))} onBack={()=>goBack('starter-tasks')} onContinue={values=>{setState(c=>({...c,availability:values}));setScreen('fixed-commitments')}}/>
  case'fixed-commitments':return<FixedCommitmentsScreen initialCommitments={fixture?undefined:state.commitments} onChange={items=>setState(c=>({...c,commitments:items}))} onBack={()=>goBack('availability')} onSkip={items=>{setState(c=>({...c,commitments:items}));setScreen('loading-plan')}} onContinue={items=>{setState(c=>({...c,commitments:items}));setScreen('loading-plan')}}/>
  case'loading-plan':return<LoadingPlanScreen onComplete={generate}/>
  case'review-plan':return<ReviewPlanScreen {...viewData} onHowItWorks={()=>openHelp('review-plan')} onAccept={()=>{try{if(!fixture&&(!plan||!plan.blocks.length||planningIssues(plan).length)){setScreen('feasibility-blocked');return}if(!fixture&&plan&&!persistPlan(acceptPlan(state,plan)))return;setPlanTarget('accepted');setScreen('plan-accepted')}catch(error){setPlanError(error instanceof Error?error.message:'Could not accept this plan.')}}} onAdjustPlan={()=>{setResolution(null);setAdjustSelection(null);setPlanTarget('draft');setProposal(null);setScreen('adjust-scope')}} onOpenRationale={(b,s)=>openRationale(b,s,'review-plan')} onEditBlock={(b,s)=>openEdit(b,s,'review-plan')}/>
  case'plan-rationale':return<PlanRationaleScreen block={selectedPlanBlock} source={planSource} onBack={()=>goBack(planReturn)} onAdjust={()=>openEdit(selectedPlanBlock,planSource,planReturn)}/>
  case'plan-edit':return<EditPlanBlockScreen block={!fixture&&proposal?.kind==='edit'&&JSON.stringify(proposal.before)===JSON.stringify(plan)?proposal.after.blocks.find(block=>block.id===selectedPlanBlock.id)??selectedPlanBlock:selectedPlanBlock} source={planSource} onBack={()=>goBack(editReturn)} onPreview={edit=>{setResolution(null);setAdjustSelection(null);try{if(!fixture&&plan){const next=proposeEdit(plan,edit,state.availability,state.tasks);setProposal(next);if(next.errors.length){setPlanError(next.errors.join(' '));return}setPlanError(null)}setScreen('adjust-scope')}catch(error){setPlanError(error instanceof Error?error.message:'Check the date and time.')}}}/>
  case'plan-accepted':return<PlanAcceptedScreen {...viewData} onUndo={()=>{if(undo())setScreen('review-plan')}} onStartToday={()=>openDaily('today')} onNavigate={navPlan} onOpenRationale={(b,s)=>openRationale(b,s,'plan-accepted')} onEditBlock={(b,s)=>openEdit(b,s,'plan-accepted')}/>
  case'active-plan':return<ActivePlanScreen {...viewData} mode="active" onAdjust={()=>{setResolution(null);setAdjustSelection(null);setPlanTarget('accepted');setProposal(null);setScreen('adjust-scope')}} onRecentChanges={()=>setScreen('recent-changes')} onUndo={undo} onNavigate={navPlan} onAddTask={openAddTask} onOpenRationale={(b,s)=>openRationale(b,s,'active-plan')} onEditBlock={(b,s)=>openEdit(b,s,'active-plan')}/>
  case'adjust-scope':return<AdjustPlanScopeScreen initialSelected={adjustSelection} onSelectionChange={setAdjustSelection} onHelp={()=>openHelp('adjust-scope','adjust-help')} onBack={()=>goBack(fixture||planTarget==='accepted'?'active-plan':'review-plan')} onPreview={scope=>{setAdjustScope(scope);if(!fixture&&resolution&&scope!=='week'){setPlanError('Choose Rest of the week to preview this weekly resolution.');return}if(!fixture&&plan&&!resolution&&proposal?.kind!=='edit'&&!(proposal?.kind==='adjust'&&scope===adjustScope&&JSON.stringify(proposal.before)===JSON.stringify(plan))){const next=proposeAdjustment(plan,input,scope);setProposal(next);if(next.errors.length){setState(c=>({...c,draftPlan:next.after}));setPlanTarget('draft');setScreen('feasibility-blocked');return}}setScreen('plan-diff')}}/>
  case'plan-diff':return<PlanDiffScreen {...comparisons} scope={adjustScope} onBack={()=>goBack(proposal?.selectedTaskIds?.length?'tasks':'adjust-scope')} onKeep={()=>{const wasSelection=Boolean(proposal?.selectedTaskIds?.length);setProposal(null);setScreen(wasSelection?'tasks':fixture||planTarget==='accepted'?'active-plan':'review-plan')}} onApply={()=>{if(apply()){setResolution(null);setScreen(fixture||planTarget==='accepted'?'plan-applied':proposal&&planningIssues(proposal.after).length?'feasibility-blocked':'review-plan')}}}/>
  case'plan-applied':return<ActivePlanScreen {...viewData} changedBlockIds={fixture?undefined:proposal?.changes.map(change=>change.id)??[]} mode={adjustScope==='week'?'week-applied':'today-applied'} onAdjust={()=>{setResolution(null);setAdjustSelection(null);setPlanTarget('accepted');setProposal(null);setScreen('adjust-scope')}} onRecentChanges={()=>setScreen('recent-changes')} onUndo={()=>{if(undo()){setProposal(null);setScreen('active-plan')}}} onNavigate={navPlan} onAddTask={openAddTask} onOpenRationale={(b,s)=>openRationale(b,s,'plan-applied')} onEditBlock={(b,s)=>openEdit(b,s,'plan-applied')}/>
  case'feasibility-blocked':return<FeasibilityBlockedScreen {...(fixture?{}:{requestedMinutes:state.tasks.filter(t=>!t.done).reduce((sum,t)=>sum+(parseInt(t.duration??'30')||30),0),availableMinutes:plan?.availableMinutes??0,unscheduled:[...(plan?.unscheduled??[]),...(plan?.warnings??[]).map(reason=>({title:'Planning input',reason}))],onEditTasks:()=>setScreen('tasks'),onRebuild:()=>setScreen('loading-plan')})} onBack={()=>setScreen(plan?.blocks.length?'review-plan':'tasks')} onResolve={kind=>{setAdjustSelection(null);if(fixture){setScreen('adjust-scope');return}if(!plan){setScreen('tasks');return}const next=proposeFeasibilityResolution(plan,input,kind==='split'?'split':'defer-lowest');if(next.errors.length){setPlanError(next.errors.join(' '));return}setProposal(next);setResolution(kind);setPlanTarget('draft');setScreen('adjust-scope')}} onEditAvailability={()=>setScreen('availability')}/>
  case'recent-changes':return<RecentChangesScreen {...historyComparison} onBack={()=>setScreen('active-plan')} onBackToApplied={()=>{setAdjustScope('week');setScreen(fixture?'plan-applied':'active-plan')}} onRestore={()=>{if(!fixture&&plan&&latest)setProposal(proposeRestore(plan,latest,state.availability,state.tasks));setScreen('restore-preview')}}/>
  case'restore-preview':return<RestorePreviewScreen {...comparisons} onBack={()=>goBack('recent-changes')} onBackToChanges={()=>setScreen('recent-changes')} onRestore={()=>{if(apply())setScreen('restore-applied')}}/>
  case'restore-applied':return<ActivePlanScreen {...viewData} mode="restored" onAdjust={()=>{setResolution(null);setAdjustSelection(null);setPlanTarget('accepted');setProposal(null);setScreen('adjust-scope')}} onRecentChanges={()=>setScreen('recent-changes')} onUndo={()=>{if(undo()){setAdjustScope('week');setScreen('plan-applied')}}} onNavigate={navPlan} onAddTask={openAddTask} onOpenRationale={(b,s)=>openRationale(b,s,'active-plan')} onEditBlock={(b,s)=>openEdit(b,s,'active-plan')}/>
  case'quick-capture':return<QuickCaptureScreen onBack={()=>goBack(quickCaptureReturn)} onCancel={()=>openDaily('today')} onSave={title=>{const canonical=fixture&&title===canonicalTaskLibrary.prescription.title;const task=canonical?{...canonicalTaskLibrary.prescription}:{id:crypto.randomUUID(),title,meta:'30 min',kind:'Flexible' as const,duration:'30 min',importance:'Important' as const};saveNewTask(task,'Saved to Tasks')}}/>
  case'add-task':return<AddTaskScreen liveMode={!fixture} onBack={()=>goBack(addTaskReturn)} onCancel={()=>goBack(addTaskReturn)} onSave={task=>saveNewTask(task,'Saved as Unscheduled')}/>
  case'task-details':return<TaskDetailsScreen liveMode={!fixture} task={selectedTask} onBack={()=>goBack(taskReturn)} onSave={updated=>{if(fixture)setTasks(current=>current.map(task=>task.id===updated.id?updated:task));else if(!persistData({...state,tasks:state.tasks.map(task=>task.id===updated.id?updated:task)}))return;setAddedState(false);setScreen(taskReturn)}} onDelete={deleted=>{if(fixture)setTasks(current=>current.filter(task=>task.id!==deleted.id));else if(!persistData({...state,tasks:state.tasks.filter(task=>task.id!==deleted.id)}))return;setAddedState(false);setScreen(taskReturn)}}/>
  case'tasks':return<TasksScreen tasks={tasks} planningSelection={!fixture} scheduledTaskIds={(state.acceptedPlan??state.draftPlan)?.blocks.flatMap(block=>block.taskId?[block.taskId]:[])??[]} planningError={planError??undefined} onAddToPlan={ids=>{const target=state.acceptedPlan??state.draftPlan;const next=proposeTaskSelection(target,{...input,weekStart:target?.weekStart},ids);if(next.errors.length){setPlanError(next.errors.join(' '));return}setPlanError(null);setResolution(null);setPlanTarget(state.acceptedPlan?'accepted':'draft');setProposal(next);setAdjustScope('week');setAdjustSelection('week');setScreen('plan-diff')}} addedState={addedState} savedMessage={savedMessage} onOpenTask={task=>openTask(task,'tasks')} onToggleDone={changed=>toggleTask(changed.id)} onQuickCapture={()=>openQuickCapture('tasks')} onAddWithDetails={openAddTask} onAddStarterTasks={()=>setScreen('starter-tasks')} onUndoSaved={undoSaved} onNavigate={navPlan}/>
  case'daily':return null
  case'community':return<CommunityFlow entry={communityEntry} navigationKey={communityKey} community={community} app={state} tasks={tasks} today={localISO()} qa={qa} onChange={persistCommunity} onExit={()=>openDaily('more')} onNavigate={navPlan} onRestore={restoreBundle}/>
  case'empty-today':return<EmptyTodayScreen onNavigate={navPlan} onQuickCapture={()=>openQuickCapture('daily')} onAddWithDetails={openAddTask}/>
  case'ai-unavailable':return<AIUnavailableScreen onNavigate={navPlan} onRetry={()=>setScreen('loading-plan')} onContinue={()=>{if(!fixture){const draft=generateWeeklyPlan(input);setState(current=>({...current,draftPlan:draft}));setPlanTarget('draft')}setScreen('basic-fallback')}}/>
  case'basic-fallback':return<BasicFallbackScreen {...(fixture?{}:{blocks:state.draftPlan?.blocks??[],scheduledLoad:state.draftPlan?.scheduledLoad??0})} onNavigate={navPlan} onReview={()=>{setPlanTarget('draft');setScreen('review-plan')}} onOpenRationale={block=>openRationale(block,'overlay','review-plan')} onEditBlock={block=>openEdit(block,'overlay','review-plan')}/>
  case'planning-preferences':return<CyclePreferencesScreen value={state.cyclePreferences??createDefaultCyclePreferences()} onBack={()=>goBack('daily')} onSave={value=>{if(persistData({...state,cyclePreferences:value}))goBack('daily')}}/>
  case'privacy-data':return<PrivacyDataScreen encryptedUploads={fixture?undefined:community.encryptedBackups.length} dataTools={fixture||loadBlocked?undefined:<><button type="button" className="privacy-encrypted-entry" onClick={()=>openCommunity('backup')}><strong>Encrypted backup (optional)</strong><span>Encrypt on this device with your passphrase, then download or store the ciphertext on IPFS.</span></button><DataTransferPanel state={state} onRestore={next=>{const result=saveCurrent(next);if(result.error)return result;resetDeviceState();setState(next);setPlanTarget(next.acceptedPlan?'accepted':'draft');const target=next.acceptedPlan?'daily':next.draftPlan?'review-plan':'start';setDailyMounted(Boolean(next.acceptedPlan));rawSetScreen(target);window.history.replaceState({screen:target},'',`#${target}`);return {}}}/></>} onBack={()=>openDaily('more')} onClear={()=>setScreen('clear-data')} analyticsEnabled={state.analyticsConsent} onAnalyticsChange={value=>{if(fixture)setState(c=>({...c,analyticsConsent:value}));else persistData({...state,analyticsConsent:value})}}/>
  case'clear-data':return<ClearDataConfirmation onBack={()=>setScreen('privacy-data')} onCancel={()=>setScreen('privacy-data')} onConfirm={()=>{const result=clearState(undefined,{expectedRaw:storedSnapshot.current});if(result.error){if(result.conflict){setLoadBlocked(true);setExternalChange(true)}setStorageError(result.error);return}storedSnapshot.current=null;clearCommunity();communityUnlocked.current=true;setCommunity(createCommunityState());resetDeviceState()}}/>
  case'help':return<HelpScreen onBack={()=>goBack('daily',()=>openDaily('more'))} onWeekly={()=>openHelp('help')} onAdjust={()=>openHelp('help','adjust-help')} onRecovery={()=>openHelp('help','recovery-help')} onCycle={()=>openHelp('help','cycle-help')}/>
  case'weekly-help':return<WeeklyPlanningHelp onBack={()=>goBack(helpReturn)}/>
  case'adjust-help':return<PlanAdjustmentsHelp onBack={()=>goBack(helpReturn)}/>
  case'recovery-help':return<RecoveryHelpScreen onBack={()=>goBack(helpReturn)}/>
  case'cycle-help':return<CycleContextHelpScreen onBack={()=>goBack(helpReturn)}/>
  case'system-error':case'insufficient':return<SystemStateScreen kind="error" onBack={()=>setScreen(saveErrorReturn)} onRetry={()=>{setStorageError(null);setScreen(saveErrorReturn)}} onContinue={()=>{setProposal(null);setStorageError(null);setScreen(fixture||state.acceptedPlan?'active-plan':state.draftPlan?'review-plan':'start')}} onNavigate={navPlan} onAdd={openAddTask}/>
  case'offline':return<SystemStateScreen kind="offline" onBack={()=>openDaily()} onRetry={()=>{if(navigator.onLine)openDaily()}} onContinue={()=>openDaily()} onNavigate={navPlan} onAdd={openAddTask}/>
  default:return<StartScreen onHowItWorks={()=>setScreen('intro-rhythm')} onBuildFirstWeek={()=>setScreen('privacy')}/>

 }}
 return <><div className="screen-preserved" hidden={offlineNotice}>{(storageError||(planError&&screen!=='tasks'))&&!fixture?<div role="alert" className="app-error">{storageError??planError}{externalChange?<button type="button" onClick={()=>window.location.reload()}>Reload saved data</button>:null}{loadBlocked&&!externalChange?<button type="button" onClick={()=>{setStorageError(null);setScreen('privacy-data')}}>Review local data</button>:null}<button type="button" onClick={()=>{setStorageError(null);setPlanError(null)}}>Dismiss</button></div>:null}{(screen==='daily'||!fixture&&dailyMounted||screen==='system-error'&&saveErrorReturn==='daily')?<div className="daily-preserved" hidden={screen!=='daily'}>{renderDaily()}</div>:null}{renderScreen()}</div>{offlineNotice?<SystemStateScreen kind="offline" onBack={()=>setOfflineNotice(false)} onRetry={()=>{if(navigator.onLine)setOfflineNotice(false)}} onContinue={()=>setOfflineNotice(false)} onNavigate={tab=>{setOfflineNotice(false);navPlan(tab)}} onAdd={()=>{setOfflineNotice(false);openAddTask()}}/>:null}</>
}
