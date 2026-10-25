import './TodayPlanBlock.css'

export interface TodayPlanBlockProps {
  title: string
  time: string
  status?:string
  fixed?:boolean
  rationale?: string
  onMore?: () => void
}

export function TodayPlanBlock({ title, time, rationale, status, fixed, onMore }: TodayPlanBlockProps) {
  return (
    <article className={rationale ? 'today-plan-block today-plan-block--rationale' : 'today-plan-block'}>
      <strong>{title}</strong>
      <span className="today-plan-block__time">{time}</span>
      <span className="today-plan-block__badge">{status==='done'?'Done':status==='partial'?'Partially done':status==='missed'?'Missed':fixed?'Fixed':'Flexible'}</span>
      {rationale ? <p>{rationale}</p> : null}
      <button type="button" className="today-plan-block__more" aria-label={`Actions for ${title}`} onClick={onMore}>
        <img src="/assets/plan-more.svg" alt="" width="20" height="20" />
      </button>
    </article>
  )
}
