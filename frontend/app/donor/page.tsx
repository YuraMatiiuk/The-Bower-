"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./donor.css";

const BLUE = "#0873B9";
const GREEN = "#16A34A";

type Me = { name?: string; email?: string; user?: { name?: string; email?: string } };
type Profile = { name: string; email: string; phone?: string; address?: string; suburb?: string; postcode?: string; };
type Donation = {
  id: number | string;
  name: string;
  status: "pending"|"approved"|"scheduled"|"collected"|"rejected";
  category?: string; condition?: string; created_at?: string;
};

const STATUS_ORDER: Donation["status"][] = ["pending","approved","scheduled","collected","rejected"];

export default function DonorDashboard(){
  const router = useRouter();

  // header user
  const [me,setMe] = useState<Me>({});
  const [menuOpen,setMenuOpen]=useState(false);
  const menuRef = useRef<HTMLDivElement|null>(null);

  // profile
  const [profile,setProfile]=useState<Profile>({name:"",email:"",phone:"",address:"",suburb:"",postcode:""});
  const [saving,setSaving]=useState(false);
  const [saveMsg,setSaveMsg]=useState<string|null>(null);
  const [saveErr,setSaveErr]=useState<string|null>(null);

  // donations
  const [donations,setDonations]=useState<Donation[]>([]);
  const [donationErr,setDonationErr]=useState<string|null>(null);
  const [filter,setFilter]=useState<"all"|Donation["status"]>("all");

  // fetch me/profile/donations
  useEffect(()=>{(async()=>{
    try{const r=await fetch("/api/auth/me",{cache:"no-store",credentials:"include"});if(r.ok)setMe(await r.json());}catch{}
  })()},[]);
  useEffect(()=>{(async()=>{
    try{const r=await fetch("/api/donor/profile",{cache:"no-store",credentials:"include"});if(r.ok){const p=await r.json();setProfile({name:p?.name||"",email:p?.email||"",phone:p?.phone||"",address:p?.address||"",suburb:p?.suburb||"",postcode:p?.postcode||""});}}catch{}
  })();(async()=>{
    try{const r=await fetch("/api/donor/donations",{cache:"no-store",credentials:"include"});
      if(r.ok){const data=await r.json();const list:Donation[]=Array.isArray(data)?data:(Array.isArray(data?.items)?data.items:[]);setDonations(list);}else setDonations([]);
    }catch{setDonationErr("Could not load your donations.");}
  })();},[]);

  // close menu on outside click
  useEffect(()=>{
    function onDocClick(e:MouseEvent){ if(!menuRef.current) return; if(!menuRef.current.contains(e.target as Node)) setMenuOpen(false);}
    if(menuOpen) document.addEventListener("mousedown",onDocClick);
    return()=>document.removeEventListener("mousedown",onDocClick);
  },[menuOpen]);

  // display name + initials
  const displayName = useMemo(()=>{
    const nm = (me?.name||me?.user?.name||"").trim(); if(nm) return nm;
    const em = (me?.email||me?.user?.email||"").trim(); return em?em.split("@")[0]:"User";
  },[me]);
  const initials = useMemo(()=>{
    const parts = displayName.split(" ").filter(Boolean);
    const t=(s:string)=>s?.[0]?.toUpperCase()||"";
    return (t(parts[0])+t(parts[parts.length-1]||"")||"U").slice(0,2);
  },[displayName]);

  async function onLogout(){ try{await fetch("/api/auth/logout",{method:"POST",credentials:"include"});}catch{} router.push("/login"); }

  async function onSaveProfile(e:React.FormEvent){ e.preventDefault(); setSaving(true); setSaveErr(null); setSaveMsg(null);
    try{
      const r=await fetch("/api/donor/profile",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});
      if(r.ok) setSaveMsg("Profile saved.");
      else{const d=await r.json().catch(()=>({})); setSaveErr(d?.error||"Failed to save profile.");}
    }catch{setSaveErr("Network error. Please try again.");}
    finally{ setSaving(false); setTimeout(()=>setSaveMsg(null),2000); }
  }

  const visibleDonations = filter==="all"?donations:donations.filter(d=>d.status===filter);

  return(
    <div>
      {/* HEADER */}
      <header className="bwr-header">
        <div className="bwr-header__inner">
          <h1 className="bwr-title">
            <AwardIcon className="w-7 h-7" />
            Donor Dashboard
          </h1>
          <div className="bwr-user" ref={menuRef}>
            <button className="bwr-user__btn" onClick={()=>setMenuOpen(s=>!s)} aria-haspopup="menu" aria-expanded={menuOpen}>
              <div className="bwr-user__avatar">{initials}</div>
              <span>{displayName}</span>
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M5.5 7.5l4.5 4.5 4.5-4.5"/></svg>
            </button>
            {menuOpen&&(
              <div role="menu" className="bwr-user__menu">
                <button className="bwr-user__item" onClick={onLogout} role="menuitem">Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="bwr-wrap">
        <div className="bwr-container">
          {/* Top row: upcoming + actions */}
          <div className="bwr-toprow">
            <section className="bwr-card" style={{flex:1}}>
              <h2>Upcoming Collections (next 7 days)</h2>
              <p className="bwr-subtle">No scheduled collections in the next week.</p>
            </section>
            <div className="bwr-actions">
              <button className="bwr-btn bwr-btn--primary" onClick={()=>router.push("/donate")}>New Donation</button>
              <button className="bwr-btn bwr-btn--secondary" onClick={()=>router.push("/collection")}>My Collections</button>
            </div>
          </div>

          {/* Grid: profile (left 2) + donations (right 1) */}
          <div className="bwr-grid">
            {/* Profile */}
            <section className="bwr-card">
              <h2>My Details</h2>
              <form onSubmit={onSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name">
                  <Input value={profile.name} onChange={(e)=>setProfile(p=>({...p,name:e.target.value}))} placeholder="Name"/>
                </Field>
                <Field label="Email">
                  <Input type="email" value={profile.email} onChange={(e)=>setProfile(p=>({...p,email:e.target.value}))} placeholder="Email"/>
                </Field>
                <Field label="Phone">
                  <Input value={profile.phone||""} onChange={(e)=>setProfile(p=>({...p,phone:e.target.value}))} placeholder="Phone"/>
                </Field>
                <Field label="Street address">
                  <Input value={profile.address||""} onChange={(e)=>setProfile(p=>({...p,address:e.target.value}))} placeholder="Street address"/>
                </Field>
                <Field label="Suburb">
                  <Input value={profile.suburb||""} onChange={(e)=>setProfile(p=>({...p,suburb:e.target.value}))} placeholder="Suburb"/>
                </Field>
                <Field label="Postcode">
                  <Input value={profile.postcode||""} onChange={(e)=>setProfile(p=>({...p,postcode:e.target.value}))} placeholder="Postcode"/>
                </Field>
                <div className="md:col-span-2 flex items-center gap-4 pt-2">
                  <button type="submit" disabled={saving} className="bwr-save" style={{opacity:saving?0.7:1}}>
                    {saving?"Saving…":"Save profile"}
                  </button>
                  {saveMsg && <span style={{color:"#166534",fontSize:"0.9rem"}}>{saveMsg}</span>}
                  {saveErr && <span style={{color:"#b91c1c",fontSize:"0.9rem"}}>{saveErr}</span>}
                </div>
              </form>
            </section>

            {/* Donations */}
            <section className="bwr-card">
              <div className="flex items-center justify-between mb-3">
                <h2>My Donations</h2>
              </div>

              <div className="bwr-pills">
                <button className={`bwr-pill ${filter==="all"?"bwr-pill--active":""}`} onClick={()=>setFilter("all")}>All</button>
                {STATUS_ORDER.map(s=>(
                  <button key={s} className={`bwr-pill ${filter===s?"bwr-pill--active":""}`} onClick={()=>setFilter(s)}>
                    {s[0].toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>

              {donationErr && <p style={{color:"#b91c1c",fontSize:".9rem",marginBottom:".5rem"}}>{donationErr}</p>}

              {visibleDonations.length===0 ? (
                <div className="bwr-subtle">No matching donations.</div>
              ):(
                <ul className="bwr-list">
                  {visibleDonations.map(d=>(
                    <li key={d.id} className="bwr-row">
                      <div>
                        <div style={{fontWeight:600}}>{d.name}</div>
                        <div className="bwr-meta">
                          {[
                            d.category && `Category: ${d.category}`,
                            d.condition && `Condition: ${d.condition}`,
                            d.created_at && new Date(d.created_at).toLocaleDateString(),
                          ].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                      <span className={`bwr-status bwr-status--${d.status}`}>{d.status[0].toUpperCase()+d.status.slice(1)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* small UI helpers (unchanged semantics) */
function Field({label,children}:{label:string;children:React.ReactNode}){return(<label className="bwr-field"><span>{label}</span>{children}</label>);}
function Input(props:React.InputHTMLAttributes<HTMLInputElement>){return(<input {...props} className={"bwr-input "+(props.className||"")} />);}

function AwardIcon({className="w-6 h-6"}:{className?:string}){return(
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4"/><path d="M8 12l-2 10 6-3 6 3-2-10"/>
  </svg>
);}
