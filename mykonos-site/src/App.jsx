import { useState, useMemo, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAEOgpz2jEaUE1CajK1FbqSMVSb5lUHdyU",
  authDomain: "mykonos2025-2d44a.firebaseapp.com",
  databaseURL: "https://mykonos2025-2d44a-default-rtdb.firebaseio.com",
  projectId: "mykonos2025-2d44a",
  storageBucket: "mykonos2025-2d44a.firebasestorage.app",
  messagingSenderId: "467122454609",
  appId: "1:467122454609:web:8a782bd3b81506f37d3870"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const DB_PATH = "mykonos2025";

const CATEGORIES = [
  { id: "hotel",      label: "מלון",             emoji: "🏨" },
  { id: "commission", label: "עמלה ניקו",         emoji: "💼" },
  { id: "scorpios",   label: "סקורפיוס",          emoji: "🦂" },
  { id: "food",       label: "אוכל & בר",         emoji: "🍹" },
  { id: "activities", label: "פעילויות & טיולים", emoji: "🤿" },
  { id: "flights",    label: "טיסות",             emoji: "✈️" },
];

const CC_FEE = 0.03;
// Firebase replaces localStorage
const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT_MEMBERS = [
  { name: "אלירן (המשלם)", paid: null  },
  { name: "עידן",          paid: 7500  },
  { name: "טל אביטון",     paid: 10000 },
  { name: "ליאל",          paid: 10000 },
  { name: "דודו",          paid: 5000  },
  { name: "עומר",          paid: 5000  },
  { name: "בר",            paid: 10000 },
  { name: "איתמר",         paid: 5000  },
  { name: "עומרי",         paid: 9500  },
  { name: "קוקי",          paid: 5000  },
  { name: "סעדה",          paid: 5000  },
  { name: "יוסי",          paid: 5000  },
  { name: "דניאל",         paid: 2500  },
  { name: "שגיא גיסי",     paid: 0     },
];

const DEFAULT_EXPENSES = [
  { id: 1, desc: "מלון",      amount: 50850, category: "hotel",      currency: "ILS", originalAmount: 50850 },
  { id: 2, desc: "עמלה ניקו", amount: 5700,  category: "commission", currency: "ILS", originalAmount: 5700  },
  { id: 3, desc: "סקורפיוס",  amount: 37000, category: "scorpios",   currency: "ILS", originalAmount: 37000 },
];

const fmt    = (n) => new Intl.NumberFormat("he-IL", { style:"currency", currency:"ILS", maximumFractionDigits:0 }).format(n);

// ── Bottom Sheet ──────────────────────────────────────────────
function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:100, opacity:open?1:0, pointerEvents:open?"auto":"none", transition:"opacity 0.25s" }} />
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"linear-gradient(180deg,#1a1f3c,#12162b)", borderRadius:"20px 20px 0 0", border:"1px solid rgba(255,255,255,0.12)", padding:"0 0 env(safe-area-inset-bottom,16px)", zIndex:101, transform:open?"translateY(0)":"translateY(100%)", transition:"transform 0.3s cubic-bezier(0.32,0.72,0,1)", maxHeight:"90vh", overflowY:"auto", direction:"rtl" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:99, background:"rgba(255,255,255,0.2)" }} />
        </div>
        {title && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 20px 16px" }}>
            <div style={{ fontSize:17, fontWeight:700, color:"#e2e8f0" }}>{title}</div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:30, height:30, color:"#94a3c0", cursor:"pointer", fontSize:16 }}>✕</button>
          </div>
        )}
        <div style={{ padding:"0 16px 32px" }}>{children}</div>
      </div>
    </>
  );
}

// ── NumPad ────────────────────────────────────────────────────
function NumPad({ value, onChange, currency, onCurrencyChange, eurRate, hideCurrency }) {
  const display = value || "0";
  const handleKey = (k) => {
    if (k==="⌫") { onChange(value.slice(0,-1)); return; }
    if (k==="." && value.includes(".")) return;
    if (k==="." && value==="") { onChange("0."); return; }
    if (value==="0" && k!==".") { onChange(k); return; }
    if (value.length>=8) return;
    onChange(value+k);
  };
  const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","."];
  const ilsPreview = value && !isNaN(parseFloat(value))
    ? currency==="EUR" && eurRate
      ? Math.round(parseFloat(value)*eurRate*(1+CC_FEE))
      : Math.round(parseFloat(value)*(1+CC_FEE))
    : null;

  return (
    <div>
      {!hideCurrency && (
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {["ILS","EUR"].map(cur=>(
            <button key={cur} onClick={()=>onCurrencyChange(cur)} style={{ flex:1,padding:"10px",borderRadius:12,border:`2px solid ${currency===cur?(cur==="EUR"?"#fbbf24":"#818cf8"):"rgba(255,255,255,0.1)"}`,background:currency===cur?(cur==="EUR"?"rgba(251,191,36,0.15)":"rgba(129,140,248,0.2)"):"rgba(255,255,255,0.04)",color:currency===cur?(cur==="EUR"?"#fbbf24":"#c7d2fe"):"#64748b",cursor:"pointer",fontSize:15,fontWeight:700 }}>{cur==="ILS"?"₪ שקל":"€ יורו"}</button>
          ))}
        </div>
      )}
      <div style={{ textAlign:"center",marginBottom:8,padding:"16px",background:"rgba(255,255,255,0.05)",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize:11,color:"#64748b",marginBottom:4 }}>{currency==="EUR"?"סכום ביורו":"סכום בשקלים"}</div>
        <div style={{ fontSize:44,fontWeight:800,color:"#fff",letterSpacing:-1,lineHeight:1 }}>{currency==="EUR"?"€":"₪"}{display}</div>
        {ilsPreview!==null && (
          <div style={{ fontSize:13,color:"#34d399",marginTop:6 }}>≈ {fmt(ilsPreview)} כולל עמלה 3%</div>
        )}
        {currency==="EUR" && eurRate && <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>שער: ₪{eurRate.toFixed(2)}</div>}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12,direction:"ltr" }}>
        {keys.map(k=>(
          <button key={k} onClick={()=>handleKey(k)} style={{ padding:"18px 0",borderRadius:14,border:"none",background:k==="⌫"?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.08)",color:k==="⌫"?"#f87171":"#e2e8f0",fontSize:k==="⌫"?20:24,fontWeight:600,cursor:"pointer" }}>{k}</button>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [members,  setMembersState]  = useState(DEFAULT_MEMBERS);
  const [expenses, setExpensesState] = useState(DEFAULT_EXPENSES);
  const [eurRate,  setEurRateState]  = useState(3.45);
  const [eurDate,  setEurDateState]  = useState(null);
  const [loaded,   setLoaded]        = useState(false);
  const [saving,   setSaving]        = useState(false);
  const [tab,      setTab]           = useState("summary");

  const [addSheet,    setAddSheet]    = useState(false);
  const [editExpSheet,setEditExpSheet]= useState(false);  // edit existing expense
  const [editMemSheet,setEditMemSheet]= useState(false);
  const [rateSheet,   setRateSheet]   = useState(false);

  const [form,      setForm]      = useState({ desc:"", amount:"", category:"hotel", currency:"ILS" });
  const [editExpId, setEditExpId] = useState(null);  // id of expense being edited
  const [editMemIdx,setEditMemIdx]= useState(null);
  const [editMem,   setEditMem]   = useState({ name:"", paid:"" });
  const [rateInput, setRateInput] = useState("");
  const [planned,    setPlannedState] = useState([]);
  const plannedRef   = useRef([]);
  const [payments,   setPaymentsState] = useState([]);
  const paymentsRef  = useRef([]);
  const [paySheet,   setPaySheet]   = useState(false);
  const [planSheet,  setPlanSheet]  = useState(false);
  const [editPlanSheet, setEditPlanSheet] = useState(false);
  const [editPlanId, setEditPlanId] = useState(null);
  const [planForm,   setPlanForm]   = useState({ desc:"", amount:"", category:"hotel", currency:"ILS" });
  const [payForm,    setPayForm]    = useState({ memberIdx:null, amount:"", method:"ביט" });
  const [editPaySheet, setEditPaySheet] = useState(false);
  const [editPayId,    setEditPayId]    = useState(null);
  const [fetching,  setFetching]  = useState(false);
  const [fetchErr,  setFetchErr]  = useState(false);

  const membersRef  = useRef(DEFAULT_MEMBERS);
  const expensesRef = useRef(DEFAULT_EXPENSES);
  const eurRateRef  = useRef(3.45);
  const eurDateRef  = useRef(null);

  // ── STORAGE: Firebase Realtime DB ──
  const saveAll = (patch = {}) => {
    if (patch.members  !== undefined) membersRef.current  = patch.members;
    if (patch.expenses !== undefined) expensesRef.current = patch.expenses;
    if (patch.eurRate  !== undefined) eurRateRef.current  = patch.eurRate;
    if (patch.eurDate  !== undefined) eurDateRef.current  = patch.eurDate;
    if (patch.planned  !== undefined) plannedRef.current  = patch.planned;
    if (patch.payments !== undefined) paymentsRef.current = patch.payments;
    try {
      set(ref(db, DB_PATH), {
        members:  membersRef.current,
        expenses: expensesRef.current,
        eurRate:  eurRateRef.current,
        eurDate:  eurDateRef.current,
        planned:  plannedRef.current,
        payments: paymentsRef.current,
      });
    } catch(e) { console.error("Firebase save failed", e); }
  };

  useEffect(() => {
    // Load from Firebase — onValue fires once immediately with current data
    const dbRef = ref(db, DB_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const d = snapshot.val();
      if (d) {
        if (d.members)  { membersRef.current  = d.members;  setMembersState(d.members);  }
        if (d.expenses) { expensesRef.current = d.expenses; setExpensesState(d.expenses); }
        if (d.eurRate)  { eurRateRef.current  = d.eurRate;  setEurRateState(d.eurRate);   }
        if (d.eurDate)  { eurDateRef.current  = d.eurDate;  setEurDateState(d.eurDate);   }
        if (d.planned)  { plannedRef.current  = d.planned;  setPlannedState(d.planned);   }
        if (d.payments) { paymentsRef.current = d.payments; setPaymentsState(d.payments); }
      }
      setLoaded(true);
      // After first load, unsubscribe (we don't want real-time sync overwriting local edits)
      unsubscribe();
    }, (error) => {
      console.error("Firebase load error", error);
      setLoaded(true);
    });
  }, []);

  const setMembers = (upd) => {
    setMembersState(prev => {
      const next = typeof upd==="function" ? upd(prev) : upd;
      saveAll({ members: next });
      return next;
    });
  };
  const setExpenses = (upd) => {
    setExpensesState(prev => {
      const next = typeof upd==="function" ? upd(prev) : upd;
      saveAll({ expenses: next });
      return next;
    });
  };
  const setPayments = (upd) => {
    setPaymentsState(prev => {
      const next = typeof upd==="function" ? upd(prev) : upd;
      saveAll({ payments: next });
      return next;
    });
  };

  const setPlanned = (upd) => {
    setPlannedState(prev => {
      const next = typeof upd==="function" ? upd(prev) : upd;
      saveAll({ planned: next });
      return next;
    });
  };

  const applyRate = (rate, date) => {
    setEurRateState(rate);
    setEurDateState(date);
    saveAll({ eurRate: rate, eurDate: date });
  };

  const fetchRate = async () => {
    setFetching(true); setFetchErr(false);
    try {
      // Primary: exchangerate-api (reliable, real-time)
      const res = await fetch("https://open.er-api.com/v6/latest/EUR");
      const d   = await res.json();
      if (d.rates?.ILS) {
        applyRate(parseFloat(d.rates.ILS.toFixed(4)), d.time_last_update_utc?.slice(0,10) || today());
        setRateSheet(false);
        setFetching(false);
        return;
      }
      throw new Error("no ILS");
    } catch {
      try {
        // Fallback: frankfurter
        const r2 = await fetch("https://api.frankfurter.app/latest?from=EUR&to=ILS");
        const d2 = await r2.json();
        if (d2.rates?.ILS) {
          applyRate(parseFloat(d2.rates.ILS.toFixed(4)), d2.date);
          setRateSheet(false);
          setFetching(false);
          return;
        }
        throw new Error("no ILS");
      } catch {
        try {
          // Fallback 2: fixer-compatible
          const r3 = await fetch("https://api.fxratesapi.com/latest?base=EUR&currencies=ILS");
          const d3 = await r3.json();
          if (d3.rates?.ILS) {
            applyRate(parseFloat(d3.rates.ILS.toFixed(4)), today());
            setRateSheet(false);
            setFetching(false);
            return;
          }
        } catch {}
        setFetchErr(true);
      }
    }
    setFetching(false);
  };

  const rateIsToday = eurDate === today();

  // ── CALCS ──
  const total         = useMemo(()=>expenses.reduce((s,e)=>s+e.amount,0),[expenses]);
  const numMembers    = members.length;
  const perPerson     = numMembers>0?total/numMembers:0;
  const friends       = members.slice(1);
  const totalReceived = useMemo(()=>friends.reduce((s,m)=>s+(m.paid||0),0),[members]);
  const totalNeeded   = perPerson*friends.length;
  const outstanding   = Math.max(0,totalNeeded-totalReceived);
  const friendsBal    = friends.map((m,i)=>({...m,idx:i+1,owes:perPerson-(m.paid||0)}));
  const paidFull      = friendsBal.filter(f=>f.owes<=1).length;
  const pct           = totalNeeded>0?Math.min(100,(totalReceived/totalNeeded)*100):0;
  const catTotals     = useMemo(()=>CATEGORIES.map(c=>({...c,total:expenses.filter(e=>e.category===c.id).reduce((s,e)=>s+e.amount,0)})),[expenses]);
  const eurToIls      = (eur) => eur*eurRate*(1+CC_FEE);

  // ── ACTIONS ──
  const openAdd = () => {
    setForm({ desc:"", amount:"", category:"hotel", currency:"ILS" });
    setAddSheet(true);
  };
  const commitAdd = () => {
    const amt = parseFloat(form.amount);
    if (!form.desc.trim()||isNaN(amt)||amt<=0) return;
    const final = form.currency==="EUR"?Math.round(eurToIls(amt)):Math.round(amt*(1+CC_FEE));
    setExpenses(prev=>[...prev,{ id:Date.now(), desc:form.desc.trim(), amount:final, category:form.category, currency:form.currency, originalAmount:amt }]);
    setAddSheet(false);
  };

  const openEditExp = (exp) => {
    setEditExpId(exp.id);
    setForm({ desc:exp.desc, amount:String(exp.originalAmount), category:exp.category, currency:exp.currency });
    setEditExpSheet(true);
  };
  const commitEditExp = () => {
    const amt = parseFloat(form.amount);
    if (!form.desc.trim()||isNaN(amt)||amt<=0) return;
    const final = form.currency==="EUR"?Math.round(eurToIls(amt)):Math.round(amt*(1+CC_FEE));
    setExpenses(prev=>prev.map(e=>e.id===editExpId?{ ...e, desc:form.desc.trim(), amount:final, category:form.category, currency:form.currency, originalAmount:amt }:e));
    setEditExpSheet(false);
  };

  const openEditMem = (idx) => {
    setEditMemIdx(idx);
    setEditMem({ name:members[idx].name, paid:members[idx].paid!=null?String(members[idx].paid):"" });
    setEditMemSheet(true);
  };
  const commitEditMem = () => {
    const paid = parseFloat(editMem.paid);
    setMembers(prev=>prev.map((m,i)=>i===editMemIdx?{...m,name:editMem.name||m.name,paid:isNaN(paid)?m.paid:paid}:m));
    setEditMemSheet(false);
  };

  if (!loaded) return <div style={{ minHeight:"100vh",background:"#0a0a1a",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3c0",fontSize:16,direction:"rtl" }}>טוען...</div>;

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#0a0a1a,#0f1535,#1a0a2e)",fontFamily:"'Segoe UI',sans-serif",direction:"rtl",color:"#e8e0f0",paddingBottom:100 }}>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(135deg,#1e3a5f,#2d1b69)",padding:"20px 16px 16px",borderBottom:"1px solid rgba(255,255,255,0.1)",position:"sticky",top:0,zIndex:10 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:26 }}>🏖️</span>
            <div>
              <div style={{ fontSize:19,fontWeight:700,color:"#fff" }}>מיקונוס 2025</div>
              <div style={{ fontSize:11,color:"#94a3c0" }}>14 משתתפים · {fmt(Math.round(perPerson))}/אדם · <span style={{ color:saving?"#fbbf24":"#34d399" }}>{saving?"שומר...":"✓ שמור"}</span></div>
            </div>
          </div>
          <div onClick={()=>{ setRateInput(eurRate.toFixed(4)); setFetchErr(false); setRateSheet(true); }} style={{ background:rateIsToday?"rgba(52,211,153,0.12)":"rgba(239,68,68,0.12)",borderRadius:10,padding:"6px 10px",border:`1px solid ${rateIsToday?"rgba(52,211,153,0.4)":"rgba(239,68,68,0.4)"}`,textAlign:"center",cursor:"pointer",minWidth:80 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#fbbf24" }}>€1 = ₪{eurRate.toFixed(2)}</div>
            <div style={{ fontSize:9,color:rateIsToday?"#34d399":"#f87171",marginTop:1 }}>{rateIsToday?"✓ עודכן היום":eurDate?`⚠️ ${eurDate}`:"⚠️ לא עודכן"}</div>
          </div>
        </div>

        {!rateIsToday && (
          <div onClick={()=>{ setRateInput(eurRate.toFixed(4)); setFetchErr(false); setRateSheet(true); }} style={{ background:"rgba(239,68,68,0.08)",borderRadius:10,padding:"9px 14px",marginBottom:12,border:"1px solid rgba(239,68,68,0.25)",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer" }}>
            <span style={{ fontSize:12,color:"#f87171" }}>⚠️ שער היורו לא עודכן היום</span>
            <span style={{ fontSize:12,color:"#f87171",fontWeight:700 }}>לחץ לרענון ←</span>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
          {[
            { label:"סה״כ הוצאות", value:fmt(total),                 color:"#60a5fa" },
            { label:"התקבל",       value:fmt(totalReceived),          color:"#34d399" },
            { label:"נשאר לגבות", value:fmt(Math.round(outstanding)), color:outstanding>0?"#f87171":"#34d399" },
          ].map(x=>(
            <div key={x.label} style={{ background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 6px",textAlign:"center",border:"1px solid rgba(255,255,255,0.09)" }}>
              <div style={{ fontSize:15,fontWeight:700,color:x.color }}>{x.value}</div>
              <div style={{ fontSize:10,color:"#94a3c0",marginTop:2 }}>{x.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex",gap:6 }}>
          {[{id:"summary",label:"📊 סיכום"},{id:"people",label:"👥 חברים"},{id:"expenses",label:"💸 הוצאות"},{id:"planned",label:"🗓 צפוי"},{id:"pay",label:"💳 תשלום"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"8px 0",borderRadius:10,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:tab===t.id?"linear-gradient(135deg,#3b82f6,#8b5cf6)":"rgba(255,255,255,0.07)",color:tab===t.id?"#fff":"#94a3c0" }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px",maxWidth:480,margin:"0 auto" }}>

        {/* ── SUMMARY ── */}
        {tab==="summary" && (
          <div>
            {/* Progress */}
            <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:16,padding:18,marginBottom:14,border:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                <span style={{ fontSize:13,fontWeight:600,color:"#c7d2fe" }}>גביית כסף מ-13 חברים</span>
                <span style={{ fontSize:13,color:"#60a5fa" }}>{fmt(totalReceived)} / {fmt(Math.round(totalNeeded))}</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.1)",borderRadius:99,height:10,overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:99,background:"linear-gradient(90deg,#3b82f6,#8b5cf6,#34d399)",width:`${pct}%`,transition:"width 0.5s" }} />
              </div>
              <div style={{ fontSize:12,color:"#64748b",marginTop:6 }}>{paidFull} מתוך 13 סיימו · {Math.round(pct)}%</div>
            </div>

            {/* Friends */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#c7d2fe",marginBottom:10 }}>פירוט לפי חבר</div>
              {friendsBal.map(f=>{
                const ov=f.owes<-1,done=Math.abs(f.owes)<=1;
                return (
                  <div key={f.idx} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:7,background:done?"rgba(52,211,153,0.07)":ov?"rgba(251,191,36,0.07)":"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px",border:`1px solid ${done?"rgba(52,211,153,0.2)":ov?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.07)"}` }}>
                    <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>{f.name[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{f.name}</div>
                      {/* BIG received amount */}
                      <div style={{ fontSize:22,fontWeight:800,color:"#60a5fa",lineHeight:1.2,marginTop:2 }}>{fmt(f.paid||0)}</div>
                      {/* EUR equivalent below */}
                      
                      <div style={{ fontSize:10,color:"#475569",marginTop:1 }}>צריך {fmt(Math.round(perPerson))}</div>
                    </div>
                    <div style={{ textAlign:"center",minWidth:65 }}>
                      {done&&<span style={{ color:"#34d399",fontWeight:700,fontSize:20 }}>✓</span>}
                      {ov&&<><div style={{ fontSize:10,color:"#fbbf24" }}>עודף</div><div style={{ color:"#fbbf24",fontWeight:800,fontSize:15 }}>{fmt(Math.round(Math.abs(f.owes)))}</div></>}
                      {!done&&!ov&&<><div style={{ fontSize:10,color:"#94a3c0" }}>חסר</div><div style={{ color:"#f87171",fontWeight:800,fontSize:18 }}>{fmt(Math.round(f.owes))}</div></>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category totals */}
            <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:16,padding:16,border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#c7d2fe",marginBottom:12 }}>הוצאות לפי קטגוריה</div>
              {catTotals.filter(c=>c.total>0).map(c=>(
                <div key={c.id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:9 }}>
                  <span style={{ fontSize:18 }}>{c.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,color:"#94a3c0" }}>{c.label}</div>
                    <div style={{ background:"rgba(255,255,255,0.08)",borderRadius:99,height:4,marginTop:4,overflow:"hidden" }}>
                      <div style={{ height:"100%",borderRadius:99,background:"linear-gradient(90deg,#3b82f6,#8b5cf6)",width:`${total>0?(c.total/total)*100:0}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign:"left",minWidth:90 }}>
                    {/* Big ILS */}
                    <div style={{ fontSize:15,fontWeight:800,color:"#e2e8f0" }}>{fmt(c.total)}</div>
                    {/* EUR below */}
                    
                    <div style={{ fontSize:10,color:"#475569" }}>{fmt(Math.round(c.total/numMembers))}/אדם</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PEOPLE ── */}
        {tab==="people" && (
          <div>
            <div style={{ fontSize:12,color:"#64748b",marginBottom:12 }}>לחץ על חבר לעדכון תשלום</div>
            {/* Payer */}
            <div style={{ background:"rgba(251,191,36,0.08)",borderRadius:14,padding:"13px 14px",marginBottom:8,border:"1px solid rgba(251,191,36,0.25)",display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#ef4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff" }}>א</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14,fontWeight:600,color:"#fbbf24" }}>אלירן 👑 (המשלם)</div>
                <div style={{ fontSize:24,fontWeight:800,color:"#60a5fa",lineHeight:1.2 }}>{fmt(total)}</div>
                
                <div style={{ fontSize:10,color:"#64748b" }}>חלקך {fmt(Math.round(perPerson))}</div>
              </div>
            </div>
            {friends.map((m,i)=>{
              const idx=i+1,owes=perPerson-(m.paid||0),done=Math.abs(owes)<=1,ov=owes<-1;
              return (
                <div key={idx} onClick={()=>openEditMem(idx)} style={{ background:done?"rgba(52,211,153,0.08)":"rgba(255,255,255,0.05)",borderRadius:14,padding:"13px 14px",marginBottom:8,border:`1px solid ${done?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer" }}>
                  <div style={{ width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff",flexShrink:0 }}>{m.name[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{m.name}</div>
                    <div style={{ fontSize:24,fontWeight:800,color:"#60a5fa",lineHeight:1.2 }}>{fmt(m.paid||0)}</div>
                    
                  </div>
                  <div style={{ textAlign:"center",minWidth:60 }}>
                    {done?<span style={{ color:"#34d399",fontWeight:700,fontSize:20 }}>✓</span>
                     :ov?<><div style={{ fontSize:10,color:"#fbbf24" }}>עודף</div><div style={{ color:"#fbbf24",fontWeight:800,fontSize:15 }}>{fmt(Math.round(Math.abs(owes)))}</div></>
                     :<><div style={{ fontSize:10,color:"#94a3c0" }}>חסר</div><div style={{ color:"#f87171",fontWeight:800,fontSize:18 }}>{fmt(Math.round(owes))}</div></>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── EXPENSES ── */}
        {tab==="expenses" && (
          <div>
            <div style={{ background:"rgba(251,191,36,0.08)",borderRadius:12,padding:"10px 14px",border:"1px solid rgba(251,191,36,0.2)",marginBottom:12,fontSize:12,color:"#fbbf24" }}>
              💳 עמלת אשראי 3% נוספת אוטומטית · שער יורו: ₪{eurRate.toFixed(2)}
            </div>
            {expenses.map(e=>{
              const cat=CATEGORIES.find(c=>c.id===e.category);
              return (
                <div key={e.id} style={{ background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"13px 14px",marginBottom:8,border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ fontSize:24 }}>{cat?.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{e.desc}</div>
                    <div style={{ fontSize:12,color:"#64748b",marginTop:1 }}>{cat?.label}</div>
                    {/* BIG ILS amount */}
                    <div style={{ fontSize:22,fontWeight:800,color:"#60a5fa",lineHeight:1.3,marginTop:4 }}>{fmt(e.amount)}</div>
                    {/* EUR below */}
                    
                    <div style={{ fontSize:10,color:"#475569" }}>{fmt(Math.round(e.amount/numMembers))}/אדם</div>
                  </div>
                  {/* Edit + Delete buttons */}
                  <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                    <button onClick={()=>openEditExp(e)} style={{ background:"rgba(99,102,241,0.2)",border:"none",borderRadius:8,color:"#818cf8",cursor:"pointer",padding:"6px 10px",fontSize:14 }}>✏️</button>
                    <button onClick={()=>setExpenses(prev=>prev.filter(x=>x.id!==e.id))} style={{ background:"rgba(239,68,68,0.15)",border:"none",borderRadius:8,color:"#ef4444",cursor:"pointer",padding:"6px 10px",fontSize:14 }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PLANNED ── */}
      {tab==="planned" && (
        <div>
          <div style={{ fontSize:12,color:"#64748b",marginBottom:12 }}>הוצאות שאתה מתכנן לשלם — כמה כל אחד יצטרך להחזיר</div>

          {/* Planned totals card */}
          {planned.length>0 && (() => {
            const planTotal = planned.reduce((s,p)=>s+p.amount,0);
            const planPer   = numMembers>0 ? planTotal/numMembers : 0;
            return (
              <div style={{ background:"linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))",borderRadius:16,padding:18,marginBottom:16,border:"1px solid rgba(99,102,241,0.4)" }}>
                <div style={{ fontSize:13,fontWeight:600,color:"#c7d2fe",marginBottom:10 }}>סיכום הוצאות צפויות</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                  <div>
                    <div style={{ fontSize:11,color:"#64748b" }}>סה״כ צפוי</div>
                    <div style={{ fontSize:24,fontWeight:800,color:"#a78bfa" }}>{fmt(planTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11,color:"#64748b" }}>לאדם</div>
                    <div style={{ fontSize:24,fontWeight:800,color:"#818cf8" }}>{fmt(Math.round(planPer))}</div>
                  </div>
                </div>
                <div style={{ marginTop:12,padding:"10px 14px",background:"rgba(255,255,255,0.06)",borderRadius:10 }}>
                  <div style={{ fontSize:11,color:"#64748b",marginBottom:6 }}>כל חבר יצטרך לשלם:</div>
                  <div style={{ fontSize:18,fontWeight:700,color:"#34d399" }}>{fmt(Math.round(planPer))}</div>
                  <div style={{ fontSize:11,color:"#475569",marginTop:2 }}>מתוך סה״כ {fmt(planTotal)} ל-{numMembers} משתתפים</div>
                </div>
              </div>
            );
          })()}

          {/* Per-category breakdown */}
          {planned.length>0 && (
            <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:16,padding:16,marginBottom:16,border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#c7d2fe",marginBottom:12 }}>לפי קטגוריה</div>
              {CATEGORIES.map(c=>{
                const items = planned.filter(p=>p.category===c.id);
                if(items.length===0) return null;
                const catTotal = items.reduce((s,p)=>s+p.amount,0);
                return (
                  <div key={c.id} style={{ marginBottom:10,padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:12,border:"1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:18 }}>{c.emoji}</span>
                        <span style={{ fontSize:13,color:"#94a3c0" }}>{c.label}</span>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:15,fontWeight:700,color:"#e2e8f0" }}>{fmt(catTotal)}</div>
                        <div style={{ fontSize:10,color:"#475569" }}>{fmt(Math.round(catTotal/numMembers))}/אדם</div>
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}

          {/* Planned items list */}
          {planned.map(p=>{
            const cat=CATEGORIES.find(c=>c.id===p.category);
            return (
              <div key={p.id} style={{ background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"13px 14px",marginBottom:8,border:"1px solid rgba(99,102,241,0.2)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ fontSize:22 }}>{cat?.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{p.desc}</div>
                    <div style={{ fontSize:12,color:"#64748b" }}>{cat?.label}</div>
                    <div style={{ fontSize:20,fontWeight:800,color:"#a78bfa",lineHeight:1.3,marginTop:4 }}>{fmt(p.amount)}</div>
                    <div style={{ fontSize:10,color:"#475569" }}>{fmt(Math.round(p.amount/numMembers))}/אדם</div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                    <button onClick={()=>{ setEditPlanId(p.id); setPlanForm({ desc:p.desc, amount:String(p.originalAmount), category:p.category, currency:p.currency }); setEditPlanSheet(true); }} style={{ background:"rgba(99,102,241,0.2)",border:"none",borderRadius:8,color:"#818cf8",cursor:"pointer",padding:"6px 10px",fontSize:14 }}>✏️</button>
                    <button onClick={()=>setPlanned(prev=>prev.filter(x=>x.id!==p.id))} style={{ background:"rgba(239,68,68,0.15)",border:"none",borderRadius:8,color:"#ef4444",cursor:"pointer",padding:"6px 10px",fontSize:14 }}>🗑</button>
                  </div>
                </div>
                {/* Convert to expense button */}
                <button onClick={()=>{
                  // Add to expenses
                  const newExpense = { id:Date.now(), desc:p.desc, amount:p.amount, category:p.category, currency:p.currency||"ILS", originalAmount:p.originalAmount||p.amount };
                  const newExpenses = [...expensesRef.current, newExpense];
                  // Remove from planned
                  const newPlanned = plannedRef.current.filter(x=>x.id!==p.id);
                  saveAll({ expenses:newExpenses, planned:newPlanned });
                  setExpensesState(newExpenses);
                  setPlannedState(newPlanned);
                }} style={{
                  width:"100%", marginTop:10, padding:"10px",
                  borderRadius:10, border:"none",
                  background:"linear-gradient(135deg,rgba(5,150,105,0.25),rgba(16,185,129,0.25))",
                  color:"#34d399", fontWeight:700, fontSize:13,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  border:"1px solid rgba(52,211,153,0.3)"
                }}>
                  ✓ שולם — העבר להוצאות
                </button>
              </div>
            );
          })}

          {planned.length===0 && (
            <div style={{ textAlign:"center",padding:"40px 0",color:"#475569" }}>
              <div style={{ fontSize:36,marginBottom:8 }}>🗓</div>
              <div style={{ fontSize:14 }}>עוד אין הוצאות צפויות</div>
              <div style={{ fontSize:12,marginTop:4 }}>לחץ + כדי להוסיף</div>
            </div>
          )}
        </div>
      )}

      {/* ── PAY TAB ── */}
      {tab==="pay" && (
        <div>
          {/* New payment button */}
          <button onClick={()=>{ setPayForm({ memberIdx:null, amount:"", method:"ביט" }); setPaySheet(true); }} style={{ width:"100%",padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <span style={{ fontSize:22 }}>+</span> רשום תשלום חדש
          </button>

          {/* Payment history */}
          <div style={{ fontSize:13,fontWeight:600,color:"#c7d2fe",marginBottom:12 }}>היסטוריית תשלומים</div>
          {payments.length===0 && (
            <div style={{ textAlign:"center",padding:"40px 0",color:"#475569" }}>
              <div style={{ fontSize:36,marginBottom:8 }}>💳</div>
              <div style={{ fontSize:14 }}>עוד לא נרשמו תשלומים</div>
            </div>
          )}
          {[...payments].reverse().map(p=>{
            const member = members[p.memberIdx];
            return (
              <div key={p.id} style={{ background:"rgba(5,150,105,0.08)",borderRadius:14,padding:"14px 16px",marginBottom:10,border:"1px solid rgba(5,150,105,0.25)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#059669,#10b981)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0 }}>{member?.name[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15,fontWeight:700,color:"#e2e8f0" }}>{member?.name}</div>
                    <div style={{ fontSize:12,color:"#64748b",marginTop:2 }}>{p.method} · {new Date(p.date).toLocaleDateString("he-IL",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}</div>
                  </div>
                  <div style={{ textAlign:"left",marginLeft:8 }}>
                    <div style={{ fontSize:22,fontWeight:800,color:"#34d399",marginBottom:6 }}>+{fmt(p.amount)}</div>
                    <div style={{ display:"flex",gap:6,justifyContent:"flex-end" }}>
                      <button onClick={()=>{
                        setEditPayId(p.id);
                        setPayForm({ memberIdx:p.memberIdx, amount:String(p.amount), method:p.method });
                        setEditPaySheet(true);
                      }} style={{ background:"rgba(99,102,241,0.2)",border:"none",borderRadius:8,color:"#818cf8",cursor:"pointer",padding:"4px 8px",fontSize:13 }}>✏️</button>
                      <button onClick={()=>{
                        // Remove payment and subtract from member total
                        const newPayments = paymentsRef.current.filter(x=>x.id!==p.id);
                        const newMembers  = membersRef.current.map((m,i)=>i===p.memberIdx?{...m,paid:Math.max(0,(m.paid||0)-p.amount)}:m);
                        saveAll({ payments:newPayments, members:newMembers });
                        setPaymentsState(newPayments);
                        setMembersState(newMembers);
                      }} style={{ background:"rgba(239,68,68,0.15)",border:"none",borderRadius:8,color:"#ef4444",cursor:"pointer",padding:"4px 8px",fontSize:13 }}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      {tab==="expenses" && (
        <button onClick={openAdd} style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",padding:"14px 32px",borderRadius:99,border:"none",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 8px 32px rgba(99,102,241,0.5)",zIndex:50,display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:22 }}>+</span> הוסף הוצאה
        </button>
      )}
      {tab==="planned" && (
        <button onClick={()=>{ setPlanForm({ desc:"", amount:"", category:"hotel", currency:"ILS" }); setPlanSheet(true); }} style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",padding:"14px 32px",borderRadius:99,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 8px 32px rgba(139,92,246,0.5)",zIndex:50,display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:22 }}>+</span> הוסף הוצאה צפויה
        </button>
      )}

      {/* ══ SHEET: Add Expense ══ */}
      <BottomSheet open={addSheet} onClose={()=>setAddSheet(false)} title="הוצאה חדשה">
        <input placeholder="תיאור (לדוגמה: ארוחת ערב)" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{ width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#e2e8f0",fontSize:16,boxSizing:"border-box",outline:"none",marginBottom:14 }} />
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setForm(f=>({...f,category:c.id}))} style={{ padding:"10px",borderRadius:12,border:`2px solid ${form.category===c.id?"#818cf8":"rgba(255,255,255,0.1)"}`,background:form.category===c.id?"rgba(129,140,248,0.2)":"rgba(255,255,255,0.04)",color:form.category===c.id?"#c7d2fe":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} currency={form.currency} onCurrencyChange={v=>setForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={commitAdd} disabled={!form.desc.trim()||!form.amount||parseFloat(form.amount)<=0} style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:(!form.desc.trim()||!form.amount)?"rgba(99,102,241,0.3)":"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}>הוסף הוצאה</button>
      </BottomSheet>

      {/* ══ SHEET: Edit Expense ══ */}
      <BottomSheet open={editExpSheet} onClose={()=>setEditExpSheet(false)} title="עריכת הוצאה">
        <input placeholder="תיאור" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{ width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#e2e8f0",fontSize:16,boxSizing:"border-box",outline:"none",marginBottom:14 }} />
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setForm(f=>({...f,category:c.id}))} style={{ padding:"10px",borderRadius:12,border:`2px solid ${form.category===c.id?"#818cf8":"rgba(255,255,255,0.1)"}`,background:form.category===c.id?"rgba(129,140,248,0.2)":"rgba(255,255,255,0.04)",color:form.category===c.id?"#c7d2fe":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} currency={form.currency} onCurrencyChange={v=>setForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={commitEditExp} disabled={!form.desc.trim()||!form.amount||parseFloat(form.amount)<=0} style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#f59e0b,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}>שמור שינויים</button>
      </BottomSheet>

      {/* ══ SHEET: Edit Member ══ */}
      <BottomSheet open={editMemSheet} onClose={()=>setEditMemSheet(false)} title={editMemIdx!==null?`עדכון · ${members[editMemIdx]?.name}`:""}>
        <div style={{ fontSize:13,color:"#64748b",marginBottom:8 }}>שם החבר</div>
        <input placeholder="שם" value={editMem.name} onChange={e=>setEditMem(f=>({...f,name:e.target.value}))} style={{ width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#e2e8f0",fontSize:16,boxSizing:"border-box",outline:"none",marginBottom:20 }} />
        <div style={{ fontSize:13,color:"#64748b",marginBottom:8 }}>כמה שילם? (₪)</div>
        <NumPad value={editMem.paid} onChange={v=>setEditMem(f=>({...f,paid:v}))} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />
        <button onClick={commitEditMem} style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}>שמור</button>
      </BottomSheet>

      {/* ══ SHEET: Add Planned ══ */}
      <BottomSheet open={planSheet} onClose={()=>setPlanSheet(false)} title="הוצאה צפויה חדשה">
        <input placeholder="תיאור (לדוגמה: ספא, סיבוב אופנועים...)" value={planForm.desc} onChange={e=>setPlanForm(f=>({...f,desc:e.target.value}))} style={{ width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#e2e8f0",fontSize:16,boxSizing:"border-box",outline:"none",marginBottom:14 }} />
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setPlanForm(f=>({...f,category:c.id}))} style={{ padding:"10px",borderRadius:12,border:`2px solid ${planForm.category===c.id?"#8b5cf6":"rgba(255,255,255,0.1)"}`,background:planForm.category===c.id?"rgba(139,92,246,0.2)":"rgba(255,255,255,0.04)",color:planForm.category===c.id?"#c4b5fd":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={planForm.amount} onChange={v=>setPlanForm(f=>({...f,amount:v}))} currency={planForm.currency} onCurrencyChange={v=>setPlanForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={()=>{
          const amt=parseFloat(planForm.amount);
          if(!planForm.desc.trim()||isNaN(amt)||amt<=0) return;
          const final=planForm.currency==="EUR"?Math.round(amt*eurRate*(1+CC_FEE)):Math.round(amt*(1+CC_FEE));
          setPlanned(prev=>[...prev,{ id:Date.now(), desc:planForm.desc.trim(), amount:final, category:planForm.category, currency:planForm.currency, originalAmount:amt }]);
          setPlanSheet(false);
        }} disabled={!planForm.desc.trim()||!planForm.amount||parseFloat(planForm.amount)<=0} style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}>הוסף הוצאה צפויה</button>
      </BottomSheet>

      {/* ══ SHEET: Edit Planned ══ */}
      <BottomSheet open={editPlanSheet} onClose={()=>setEditPlanSheet(false)} title="עריכת הוצאה צפויה">
        <input placeholder="תיאור" value={planForm.desc} onChange={e=>setPlanForm(f=>({...f,desc:e.target.value}))} style={{ width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#e2e8f0",fontSize:16,boxSizing:"border-box",outline:"none",marginBottom:14 }} />
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setPlanForm(f=>({...f,category:c.id}))} style={{ padding:"10px",borderRadius:12,border:`2px solid ${planForm.category===c.id?"#8b5cf6":"rgba(255,255,255,0.1)"}`,background:planForm.category===c.id?"rgba(139,92,246,0.2)":"rgba(255,255,255,0.04)",color:planForm.category===c.id?"#c4b5fd":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={planForm.amount} onChange={v=>setPlanForm(f=>({...f,amount:v}))} currency={planForm.currency} onCurrencyChange={v=>setPlanForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={()=>{
          const amt=parseFloat(planForm.amount);
          if(!planForm.desc.trim()||isNaN(amt)||amt<=0) return;
          const final=planForm.currency==="EUR"?Math.round(amt*eurRate*(1+CC_FEE)):Math.round(amt*(1+CC_FEE));
          setPlanned(prev=>prev.map(p=>p.id===editPlanId?{...p,desc:planForm.desc.trim(),amount:final,category:planForm.category,currency:planForm.currency,originalAmount:amt}:p));
          setEditPlanSheet(false);
        }} style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#f59e0b,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}>שמור שינויים</button>
      </BottomSheet>

      {/* ══ SHEET: New Payment ══ */}
      <BottomSheet open={paySheet} onClose={()=>setPaySheet(false)} title="רישום תשלום">

        {/* Step 1: pick member */}
        <div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>מי שילם?</div>
        <div style={{ marginBottom:16,maxHeight:200,overflowY:"auto" }}>
          {members.slice(1).map((m,i)=>{
            const idx=i+1;
            const selected=payForm.memberIdx===idx;
            return (
              <div key={idx} onClick={()=>setPayForm(f=>({...f,memberIdx:idx}))} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,marginBottom:6,border:`2px solid ${selected?"#10b981":"rgba(255,255,255,0.1)"}`,background:selected?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)",cursor:"pointer" }}>
                <div style={{ width:34,height:34,borderRadius:"50%",background:selected?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>{m.name[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{m.name}</div>
                  <div style={{ fontSize:11,color:"#64748b" }}>שילם עד כה: {fmt(m.paid||0)}</div>
                </div>
                {selected && <span style={{ color:"#34d399",fontSize:20 }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Step 2: payment method */}
        <div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>איך שילם?</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16 }}>
          {["ביט","פייבוקס","העברה","מזומן","פפר","אחר"].map(m=>(
            <button key={m} onClick={()=>setPayForm(f=>({...f,method:m}))} style={{ padding:"10px 6px",borderRadius:10,border:`2px solid ${payForm.method===m?"#10b981":"rgba(255,255,255,0.1)"}`,background:payForm.method===m?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)",color:payForm.method===m?"#34d399":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600 }}>{m}</button>
          ))}
        </div>

        {/* Step 3: amount */}
        <div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>סכום ששילם (₪)</div>
        <NumPad value={payForm.amount} onChange={v=>setPayForm(f=>({...f,amount:v}))} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />

        <button
          onClick={()=>{
            const amt=parseFloat(payForm.amount);
            if(payForm.memberIdx===null||isNaN(amt)||amt<=0) return;
            // Build both updates and save atomically in one call
            const newPay={ id:Date.now(), memberIdx:payForm.memberIdx, amount:amt, method:payForm.method, date:new Date().toISOString() };
            const newPayments = [...paymentsRef.current, newPay];
            const newMembers  = membersRef.current.map((m,i)=>i===payForm.memberIdx?{...m,paid:(m.paid||0)+amt}:m);
            // Update refs and save once
            saveAll({ payments: newPayments, members: newMembers });
            // Then update React state
            setPaymentsState(newPayments);
            setMembersState(newMembers);
            setPaySheet(false);
          }}
          disabled={payForm.memberIdx===null||!payForm.amount||parseFloat(payForm.amount)<=0}
          style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:(payForm.memberIdx===null||!payForm.amount)?"rgba(5,150,105,0.3)":"linear-gradient(135deg,#059669,#10b981)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}
        >
          ✓ אשר תשלום
        </button>
      </BottomSheet>

      {/* ══ SHEET: Edit Payment ══ */}
      <BottomSheet open={editPaySheet} onClose={()=>setEditPaySheet(false)} title="עריכת תשלום">
        <div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>מי שילם?</div>
        <div style={{ marginBottom:16,maxHeight:180,overflowY:"auto" }}>
          {members.slice(1).map((m,i)=>{
            const idx=i+1;
            const selected=payForm.memberIdx===idx;
            return (
              <div key={idx} onClick={()=>setPayForm(f=>({...f,memberIdx:idx}))} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,marginBottom:6,border:`2px solid ${selected?"#10b981":"rgba(255,255,255,0.1)"}`,background:selected?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)",cursor:"pointer" }}>
                <div style={{ width:34,height:34,borderRadius:"50%",background:selected?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>{m.name[0]}</div>
                <div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{m.name}</div></div>
                {selected && <span style={{ color:"#34d399",fontSize:20 }}>✓</span>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>איך שילם?</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16 }}>
          {["ביט","פייבוקס","העברה","מזומן","פפר","אחר"].map(m=>(
            <button key={m} onClick={()=>setPayForm(f=>({...f,method:m}))} style={{ padding:"10px 6px",borderRadius:10,border:`2px solid ${payForm.method===m?"#10b981":"rgba(255,255,255,0.1)"}`,background:payForm.method===m?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)",color:payForm.method===m?"#34d399":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600 }}>{m}</button>
          ))}
        </div>
        <div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>סכום (₪)</div>
        <NumPad value={payForm.amount} onChange={v=>setPayForm(f=>({...f,amount:v}))} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />
        <button onClick={()=>{
          const amt=parseFloat(payForm.amount);
          if(payForm.memberIdx===null||isNaN(amt)||amt<=0) return;
          const oldPay = paymentsRef.current.find(x=>x.id===editPayId);
          const oldAmt = oldPay?.amount || 0;
          const oldIdx = oldPay?.memberIdx;
          // Build updated payments and members atomically
          const newPayments = paymentsRef.current.map(x=>x.id===editPayId?{...x,memberIdx:payForm.memberIdx,amount:amt,method:payForm.method}:x);
          const newMembers  = membersRef.current.map((m,i)=>{
            let paid = m.paid || 0;
            if (i===oldIdx)           paid = Math.max(0, paid - oldAmt); // remove old
            if (i===payForm.memberIdx) paid = paid + amt;                 // add new
            return { ...m, paid };
          });
          saveAll({ payments:newPayments, members:newMembers });
          setPaymentsState(newPayments);
          setMembersState(newMembers);
          setEditPaySheet(false);
        }} style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#f59e0b,#10b981)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}>שמור שינויים</button>
      </BottomSheet>

      {/* ══ SHEET: EUR Rate ══ */}
      <BottomSheet open={rateSheet} onClose={()=>setRateSheet(false)} title="עדכון שער יורו">
        <button onClick={fetchRate} disabled={fetching} style={{ width:"100%",padding:"14px",borderRadius:12,border:"none",marginBottom:14,cursor:fetching?"default":"pointer",background:fetching?"rgba(16,185,129,0.2)":"linear-gradient(135deg,#059669,#10b981)",color:"#fff",fontWeight:700,fontSize:15 }}>
          {fetching?"⏳ מושך שער...":"🌐 שלוף שער עדכני אוטומטית"}
        </button>
        {fetchErr&&<div style={{ background:"rgba(239,68,68,0.1)",borderRadius:10,padding:"10px 14px",border:"1px solid rgba(239,68,68,0.3)",marginBottom:14,fontSize:12,color:"#f87171" }}>⚠️ נכשל — הכנס ידנית (חפש "EUR ILS" בגוגל)</div>}
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
          <div style={{ flex:1,height:1,background:"rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize:12,color:"#64748b" }}>או הכנס ידנית</span>
          <div style={{ flex:1,height:1,background:"rgba(255,255,255,0.1)" }} />
        </div>
        <div style={{ fontSize:13,color:"#94a3c0",marginBottom:8,textAlign:"center" }}>שער נוכחי: ₪{eurRate.toFixed(4)}</div>
        <NumPad value={rateInput} onChange={setRateInput} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />
        <button onClick={()=>{ const r=parseFloat(rateInput); if(!isNaN(r)&&r>0){applyRate(r,today());setRateSheet(false);}}} style={{ width:"100%",marginTop:16,padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#f59e0b,#ef4444)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer" }}>שמור שער</button>
      </BottomSheet>
    </div>
  );
}
