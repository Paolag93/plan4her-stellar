import{useEffect,useState}from'react'
import'./LoadingPlanScreen.css'

export function LoadingPlanScreen({onComplete}:{onComplete?:()=>void}){
 const[leaving,setLeaving]=useState(false)
 useEffect(()=>{
  if(!onComplete)return
  let completionTimeout:number|undefined
  const timeout=window.setTimeout(()=>{
   setLeaving(true)
   completionTimeout=window.setTimeout(onComplete,150)
  },1200)
  return()=>{window.clearTimeout(timeout);if(completionTimeout!==undefined)window.clearTimeout(completionTimeout)}
 },[onComplete])
 return <main className={leaving?'loading-plan-screen loading-plan-screen--leaving':'loading-plan-screen'} data-figma-node="4250:4238" aria-busy="true" aria-label="Building your week">
  <div className="loading-plan-screen__content">
   <h1>Building your week</h1>
   <div className="loading-plan-screen__line" aria-hidden="true"/>
   <div className="loading-plan-screen__block loading-plan-screen__block--one" aria-hidden="true"/>
   <div className="loading-plan-screen__block loading-plan-screen__block--two" aria-hidden="true"/>
   <div className="loading-plan-screen__block loading-plan-screen__block--three" aria-hidden="true"/>
  </div>
 </main>
}
