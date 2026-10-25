import { useDialogFocus } from '../../components/useDialogFocus'
import type{PlanBlockData}from'./planData'
import './PlanBlockActionsOverlay.css'
export function PlanBlockActionsOverlay({block,onClose,onEdit,onWhy}:{block:PlanBlockData;onClose:()=>void;onEdit:()=>void;onWhy:()=>void}){
 const dialogRef = useDialogFocus(onClose)
 return <div className="plan-actions-layer" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <section ref={dialogRef} className={`plan-actions-overlay${block.dateISO?' plan-actions-overlay--live':''}`} role="dialog" aria-modal="true" aria-label={`${block.title} actions`} data-figma-node={block.overlayNode}>
   <h2>{block.title}</h2><button className="plan-actions-overlay__close" type="button" onClick={onClose} aria-label="Close">×</button>
   <button className="plan-actions-overlay__action plan-actions-overlay__action--edit" type="button" onClick={onEdit}><strong>Edit or move</strong><span>Change date, time or duration.</span></button>
   <button className="plan-actions-overlay__action plan-actions-overlay__action--why" type="button" onClick={onWhy}><strong>Why this time?</strong><span>See the signals used for placement.</span></button>
  </section>
 </div>
}
