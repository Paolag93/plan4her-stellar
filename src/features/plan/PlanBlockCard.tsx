import type{PlanBlockData}from'./planData'
import './PlanBlockCard.css'

export function PlanBlockCard({block,onOpen,onMore,time,status,moreIconSrc='/assets/plan-more.svg'}:{block:PlanBlockData;onOpen:()=>void;onMore:()=>void;time?:string;status?:string;moreIconSrc?:string}){
 return <article className={status?'plan-block-card plan-block-card--changed':'plan-block-card'}>
  <button className="plan-block-card__main" type="button" onClick={onOpen} aria-label={`${block.title}, ${time??block.time}`}>
   <span className="plan-block-card__top"><strong>{block.title}</strong>{status?<em>{status}</em>:null}</span>
   <span className="plan-block-card__time">{time??block.time}</span>
   <span className="plan-block-card__badge">{block.fixed?'Fixed':'Flexible'}</span>
  </button>
  <button className="plan-block-card__more" type="button" onClick={onMore} aria-label={`Actions for ${block.title}`}>
   <img src={moreIconSrc} alt="" width="20" height="20"/>
  </button>
 </article>
}
