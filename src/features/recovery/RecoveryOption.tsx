import './RecoveryOption.css'

export type RecoveryChoice='move'|'split'
export interface RecoveryOptionProps{
  choice:RecoveryChoice
  title:string
  description:string
  impact:string
  selected:boolean
  onSelect:()=>void
}
export function RecoveryOption({choice,title,description,impact,selected,onSelect}:RecoveryOptionProps){
 return <button type="button" className={selected?'recovery-option recovery-option--selected':'recovery-option'} aria-pressed={selected} onClick={onSelect}>
  <span className="recovery-option__icon"><img src={choice==='move'?'/assets/plan-resolution-move.svg':'/assets/plan-resolution-split.svg'} alt=""/></span>
  <span className="recovery-option__content"><strong>{title}</strong><span>{description}</span><em>{impact}</em></span>
  {selected?<span className="recovery-option__selected" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.5 6.2 11.5 13 4.5"/></svg></span>:null}
 </button>
}
