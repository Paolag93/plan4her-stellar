import{AppHeader}from'../../components/AppHeader'
import{BottomNav,type RootTab}from'../../components/BottomNav'
import{Button}from'../../components/Button'
import'./MoreScreen.css'

export interface MoreCommunityLinks{onCommunity:()=>void;onPartners:()=>void;onSavings:()=>void;onBackup:()=>void}

export function MoreScreen({onCycleContext,onPlanningPreferences,onPrivacy,onHelp,onNavigate,community}:{onCycleContext:()=>void;onPlanningPreferences?:()=>void;onPrivacy?:()=>void;onHelp?:()=>void;onNavigate:(tab:RootTab)=>void;community?:MoreCommunityLinks}){
 return <main className="more-screen" data-figma-node="4198:298">
  <AppHeader title="More"/>
  <div className="more-screen__scroll">
   <h1>Preferences &amp; support</h1>
   <p className="more-screen__intro">Planning context, community, privacy and help in one place.</p>
   <p className="more-screen__label">PLANNING</p>
   <Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={onCycleContext}>Cycle context</Button>
   {onPlanningPreferences?<Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={onPlanningPreferences}>Planning preferences</Button>:null}
   {community?<><p className="more-screen__label">COMMUNITY</p>
   <Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={community.onCommunity}>Community challenges</Button>
   <Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={community.onPartners}>Accountability partners</Button>
   <Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={community.onSavings}>Savings &amp; rewards · Testnet</Button></>:null}
   <p className="more-screen__label">PRIVACY &amp; HELP</p>
   <Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={onPrivacy}>Privacy &amp; data</Button>
   {community?<Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={community.onBackup}>Encrypted backup</Button>:null}
   <Button className="more-screen__menu" hierarchy="secondary" type="button" onClick={onHelp}>Help &amp; guidance</Button>
  </div>
  <BottomNav active="more" onNavigate={onNavigate}/>
 </main>
}
