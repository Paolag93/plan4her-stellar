import{useState}from'react'
import{AppHeader}from'../../components/AppHeader'
import{Button}from'../../components/Button'
import{CalendarOverlay}from'../../components/CalendarOverlay'
import{pickerCycleLength}from'../../components/pickerValues'
import{TextField}from'../../components/TextField'
import{isISODate,localISO}from'../../domain/planner'
import{selectedCycleContext}from'./selectedCycleContext'
import'./CycleContextScreen.css'

export interface CycleContextValues{mode?:string|null;enabled:boolean;lastPeriodStart:string|null;cycleLength:number;cycleLengthDraft?:string}
export function CycleContextScreen({value,initialEnabled=true,initialFocused=false,onBack,onSave,onHelp}:{value?:CycleContextValues;initialEnabled?:boolean;initialFocused?:boolean;onBack:()=>void;onSave:(value:CycleContextValues)=>void;onHelp:(value:CycleContextValues)=>void}){
 const[enabled,setEnabled]=useState(value?.enabled??initialEnabled)
 const[cycleFocused,setCycleFocused]=useState(initialFocused)
 const[calendarOpen,setCalendarOpen]=useState(false)
 const[lastPeriod,setLastPeriod]=useState(value?.lastPeriodStart?Number(value.lastPeriodStart.slice(8,10)):16)
 const[lastPeriodStart,setLastPeriodStart]=useState(value?.lastPeriodStart??'')
 const[cycleLength,setCycleLength]=useState(value?.cycleLengthDraft??String(value?.cycleLength??28))
 const parsedLength=pickerCycleLength(cycleLength)
 const validLength=Number.isFinite(parsedLength)
 const validDate=!lastPeriodStart||isISODate(lastPeriodStart)&&lastPeriodStart<=localISO()
 const calendarMonth=value?(lastPeriodStart?.slice(0,7)||localISO().slice(0,7)):undefined
 const dateLabel=value?(lastPeriodStart&&isISODate(lastPeriodStart)?new Intl.DateTimeFormat('en',{day:'numeric',month:'short'}).format(new Date(`${lastPeriodStart}T12:00:00`)):'Select a date'):`${lastPeriod} Oct`
 const context=selectedCycleContext(localISO(),{mode:enabled?(value?.mode&&value.mode!=='unsure'?value.mode:'natural'):value?.mode,enabled,lastPeriodStart:lastPeriodStart||null,cycleLength:parsedLength})
 const estimatedDay=context.status==='estimated'?context.day:null
 const canSave=!value||!enabled||(validLength&&validDate)
 const currentValues=():CycleContextValues=>({mode:value?.mode,enabled,lastPeriodStart:value?(validDate?(lastPeriodStart||null):value.lastPeriodStart):`2023-10-${String(lastPeriod).padStart(2,'0')}`,cycleLength:validLength?parsedLength:value?.cycleLength??28})
 const node=!enabled?'4272:3365':cycleFocused?'4272:3324':'4250:4081'
 return <main className="cycle-context-screen" data-figma-node={node}>
  <AppHeader title="Cycle context" onBack={onBack}/>
  <div className="cycle-context-screen__content">
   <h1>{value?'Your preferences':'Your cycle context'}</h1>
   <p className="cycle-context-screen__intro">Estimated from your last period date and usual cycle length. You can turn it off anytime.</p>
   <section className="cycle-context-summary">
    <header><div><span>{value?(enabled?'Estimated timing':'Planning context off'):'Day 8'}</span><strong>{value?(!enabled?'Cycle context':context.status==='unsupported-pattern'?'No phase estimate':estimatedDay?`Day ${estimatedDay}`:!lastPeriodStart?'No date added':!validLength?'Check cycle length':'Check period date'):'Follicular'}</strong></div>{!value||estimatedDay?<em>Estimated</em>:null}</header>
    <h2>{value?(validLength?`Usual length: ${parsedLength} days`:'Update your usual cycle length'):'Possible pattern: focused work may feel easier'}</h2>
    <p>{value?(context.status==='unsupported-pattern'?'This pattern does not use natural-cycle phase estimates.':'Based on the period date you entered.'):'Estimated from your last period date and usual cycle length.'}</p>
    <small>{value?'An estimate, not a measurement. You can update it anytime.':'Cycle timing is estimated and can be updated anytime.'}</small>
   </section>
   <TextField label="Last period started" text={dateLabel} invalid={Boolean(value)&&!validDate} supportingText={value&&!validDate?'Choose today or an earlier date.':undefined} filled={!value||Boolean(lastPeriodStart)} onClick={()=>{setCycleFocused(false);setCalendarOpen(true)}}/>
   <TextField label="Typical cycle length · optional" text={value?cycleLength:`${cycleLength} days`} editable={Boolean(value)} onChangeText={setCycleLength} inputMode="numeric" invalid={Boolean(value)&&!validLength} supportingText={value&&!validLength?'Enter a cycle length from 15 to 90 days.':undefined} filled focused={cycleFocused} onClick={()=>setCycleFocused(true)} onBlur={()=>setCycleFocused(false)}/>
   <div className="cycle-context-screen__switch-row"><span>Use cycle context in planning</span><button type="button" role="switch" aria-label="Use cycle context in planning" aria-checked={enabled} className={enabled?'cycle-context-switch cycle-context-switch--on':'cycle-context-switch'} onClick={()=>{setCycleFocused(false);setEnabled(v=>!v)}}><span/></button></div>
   <Button className="cycle-context-screen__save" type="button" disabled={!canSave} onClick={()=>{if(canSave)onSave(currentValues())}}>Save cycle context</Button>
   {!cycleFocused?<Button className="cycle-context-screen__help" hierarchy="tertiary" type="button" onClick={()=>onHelp({...currentValues(),lastPeriodStart:lastPeriodStart||null,cycleLengthDraft:cycleLength})}>How cycle context works</Button>:null}
  </div>
  {calendarOpen?<CalendarOverlay mode="settings" month={calendarMonth} selectedDay={value?(lastPeriodStart?Number(lastPeriodStart.slice(-2)):null):lastPeriod} maxDate={value?localISO():undefined} onSelectDate={value?date=>{setLastPeriodStart(date);setCalendarOpen(false)}:undefined} onClose={()=>setCalendarOpen(false)} onSelect={day=>{setLastPeriod(day);if(value)setLastPeriodStart(`${calendarMonth}-${String(day).padStart(2,'0')}`);setCalendarOpen(false)}}/>:null}
 </main>
}
