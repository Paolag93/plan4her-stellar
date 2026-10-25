import './RecoveryDiff.css'
export interface RecoveryDiffProps{title:string;status:'Moved'|'Split';before:string;after:string;reason:string;size:'move'|'split'|'partial'}
export function RecoveryDiff({title,status,before,after,reason,size}:RecoveryDiffProps){
 return <section className={`recovery-diff recovery-diff--${size}`}>
  <div className="recovery-diff__top"><strong>{title}</strong><span>{status}</span></div>
  <div className="recovery-diff__columns">
   <div className="recovery-diff__before"><strong>Before</strong><span>{before}</span></div>
   <div className="recovery-diff__after"><strong>After</strong><span>{after}</span></div>
  </div>
  <p>{reason}</p>
 </section>
}
