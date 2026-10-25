import type {PlanBlockData} from '../plan/planData'

/** A read-only proposal prepared by the application. Rendering never mutates the plan. */
export interface RecoveryPresentation {
 title:string
 before:string
 after:string
 reason:string
 headline?:string
 body?:string
 appliedBody?:string
 blocks?:PlanBlockData[]
 actionBlock?:PlanBlockData
 remainingMinutes?:number
}
