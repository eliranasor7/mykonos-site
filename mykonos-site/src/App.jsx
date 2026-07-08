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

// ── ADMIN PIN — שנה כאן את הקוד שלך ──
const ADMIN_PIN = "2025";

const CATEGORIES = [
  { id: "hotel",      label: "מלון",             emoji: "🏨" },
  { id: "commission", label: "עמלה ניקו",         emoji: "💼" },
  { id: "scorpios",   label: "סקורפיוס",          emoji: "🦂" },
  { id: "food",       label: "אוכל & בר",         emoji: "🍹" },
  { id: "activities", label: "פעילויות & טיולים", emoji: "🤿" },
  { id: "flights",    label: "טיסות",             emoji: "✈️" },
  { id: "party",      label: "מסיבות",            emoji: "🎉" },
];

// גלריית תמונות מוכנות לאירועים
const PRESET_IMAGES = [
  { label: "מיקונוס", url: "https://images.unsplash.com/photo-1601581875039-e899893d520c?w=800&q=70&auto=format" },
  { label: "ביץ' קלאב", url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=70&auto=format" },
  { label: "מסיבה", url: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=70&auto=format" },
  { label: "יאכטה", url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=70&auto=format" },
  { label: "מסעדה", url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=70&auto=format" },
  { label: "מלון & בריכה", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=70&auto=format" },
  { label: "קוקטיילים", url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=70&auto=format" },
  { label: "טיסה", url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=70&auto=format" },
  { label: "דיג'יי", url: "https://images.unsplash.com/photo-1571266028243-d220c6a9de8c?w=800&q=70&auto=format" },
  { label: "שקיעה", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=70&auto=format" },
];

const HERO_IMAGE = "https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1200&q=75&auto=format";

const CC_FEE = 0.03;
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

const fmt = (n) => new Intl.NumberFormat("he-IL", { style:"currency", currency:"ILS", maximumFractionDigits:0 }).format(n);

// ── Compress uploaded image to small base64 ──
function compressImage(file, maxW = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Bottom Sheet ──
function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:100, opacity:open?1:0, pointerEvents:open?"auto":"none", transition:"opacity 0.25s" }} />
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"linear-gradient(180deg,#16122b,#0d0a1f)", borderRadius:"24px 24px 0 0", border:"1px solid rgba(236,72,153,0.25)", borderBottom:"none", padding:"0 0 env(safe-area-inset-bottom,16px)", zIndex:101, transform:open?"translateY(0)":"translateY(100%)", transition:"transform 0.3s cubic-bezier(0.32,0.72,0,1)", maxHeight:"92vh", overflowY:"auto", direction:"rtl" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:44, height:4, borderRadius:99, background:"rgba(236,72,153,0.4)" }} />
        </div>
        {title && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 20px 16px" }}>
            <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{title}</div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:32, height:32, color:"#94a3c0", cursor:"pointer", fontSize:16 }}>✕</button>
          </div>
        )}
        <div style={{ padding:"0 16px 32px" }}>{children}</div>
      </div>
    </>
  );
}

// ── NumPad ──
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
            <button key={cur} onClick={()=>onCurrencyChange(cur)} style={{ flex:1,padding:"11px",borderRadius:14,border:`2px solid ${currency===cur?(cur==="EUR"?"#f59e0b":"#ec4899"):"rgba(255,255,255,0.1)"}`,background:currency===cur?(cur==="EUR"?"rgba(245,158,11,0.15)":"rgba(236,72,153,0.15)"):"rgba(255,255,255,0.04)",color:currency===cur?(cur==="EUR"?"#fbbf24":"#f9a8d4"):"#64748b",cursor:"pointer",fontSize:15,fontWeight:700 }}>{cur==="ILS"?"₪ שקל":"€ יורו"}</button>
          ))}
        </div>
      )}
      <div style={{ textAlign:"center",marginBottom:8,padding:"18px",background:"rgba(255,255,255,0.05)",borderRadius:18,border:"1px solid rgba(236,72,153,0.2)" }}>
        <div style={{ fontSize:11,color:"#64748b",marginBottom:4 }}>{currency==="EUR"?"סכום ביורו":"סכום בשקלים"}</div>
        <div style={{ fontSize:46,fontWeight:900,color:"#fff",letterSpacing:-1,lineHeight:1 }}>{currency==="EUR"?"€":"₪"}{display}</div>
        {ilsPreview!==null && <div style={{ fontSize:13,color:"#34d399",marginTop:6 }}>≈ {fmt(ilsPreview)} כולל עמלה 3%</div>}
        {currency==="EUR" && eurRate && <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>שער: ₪{eurRate.toFixed(2)}</div>}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12,direction:"ltr" }}>
        {keys.map(k=>(
          <button key={k} onClick={()=>handleKey(k)} style={{ padding:"17px 0",borderRadius:16,border:"none",background:k==="⌫"?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.07)",color:k==="⌫"?"#f87171":"#fff",fontSize:k==="⌫"?20:24,fontWeight:600,cursor:"pointer" }}>{k}</button>
        ))}
      </div>
    </div>
  );
}

// ── Image Picker (upload / URL / presets / google search) ──
function ImagePicker({ image, onChange, searchQuery }) {
  const fileRef = useRef(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl]   = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:13,color:"#f9a8d4",fontWeight:700,marginBottom:10 }}>📸 תמונת האירוע</div>

      {/* Current image preview */}
      {image && (
        <div style={{ position:"relative", marginBottom:10 }}>
          <img src={image} alt="" style={{ width:"100%", height:150, objectFit:"cover", borderRadius:16, border:"2px solid rgba(236,72,153,0.4)" }} />
          <button onClick={()=>onChange(null)} style={{ position:"absolute", top:8, left:8, background:"rgba(0,0,0,0.7)", border:"none", borderRadius:"50%", width:30, height:30, color:"#f87171", cursor:"pointer", fontSize:15 }}>✕</button>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
        <button onClick={()=>fileRef.current?.click()} style={{ padding:"10px 4px", borderRadius:12, border:"1px solid rgba(236,72,153,0.3)", background:"rgba(236,72,153,0.1)", color:"#f9a8d4", cursor:"pointer", fontSize:12, fontWeight:600 }}>📱 העלה תמונה</button>
        <button onClick={()=>setShowUrl(v=>!v)} style={{ padding:"10px 4px", borderRadius:12, border:"1px solid rgba(168,85,247,0.3)", background:"rgba(168,85,247,0.1)", color:"#c4b5fd", cursor:"pointer", fontSize:12, fontWeight:600 }}>🔗 הדבק לינק</button>
        <button onClick={()=>window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery||"mykonos party")}&tbm=isch`,"_blank")} style={{ padding:"10px 4px", borderRadius:12, border:"1px solid rgba(34,211,238,0.3)", background:"rgba(34,211,238,0.1)", color:"#67e8f9", cursor:"pointer", fontSize:12, fontWeight:600 }}>🔍 חפש בגוגל</button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={async e=>{
        const f = e.target.files?.[0];
        if (f) {
          try { const b64 = await compressImage(f); onChange(b64); } catch {}
        }
        e.target.value = "";
      }} />

      {showUrl && (
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <input placeholder="הדבק כתובת תמונה (URL)" value={urlInput} onChange={e=>setUrlInput(e.target.value)}
            style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#fff", fontSize:13, outline:"none", direction:"ltr" }} />
          <button onClick={()=>{ if(urlInput.trim()){ onChange(urlInput.trim()); setUrlInput(""); setShowUrl(false); } }} style={{ padding:"10px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>אישור</button>
        </div>
      )}

      {/* Preset gallery */}
      <div style={{ fontSize:11, color:"#64748b", marginBottom:6 }}>או בחר מהגלריה:</div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:6 }}>
        {PRESET_IMAGES.map(p=>(
          <div key={p.url} onClick={()=>onChange(p.url)} style={{ flexShrink:0, cursor:"pointer", textAlign:"center" }}>
            <img src={p.url} alt={p.label} style={{ width:76, height:56, objectFit:"cover", borderRadius:10, border:image===p.url?"2px solid #ec4899":"2px solid transparent" }} />
            <div style={{ fontSize:9, color:"#94a3c0", marginTop:2 }}>{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════ MAIN APP ══════════════════════
export default function App() {
  const [members,  setMembersState]  = useState(DEFAULT_MEMBERS);
  const [expenses, setExpensesState] = useState(DEFAULT_EXPENSES);
  const [eurRate,  setEurRateState]  = useState(3.45);
  const [eurDate,  setEurDateState]  = useState(null);
  const [planned,  setPlannedState]  = useState([]);
  const [payments, setPaymentsState] = useState([]);
  const [loaded,   setLoaded]        = useState(false);
  const [tab,      setTab]           = useState("events");

  // Admin mode
  const [isAdmin, setIsAdmin]     = useState(false);
  const [pinSheet, setPinSheet]   = useState(false);
  const [pinInput, setPinInput]   = useState("");
  const [pinError, setPinError]   = useState(false);

  const membersRef  = useRef(DEFAULT_MEMBERS);
  const expensesRef = useRef(DEFAULT_EXPENSES);
  const eurRateRef  = useRef(3.45);
  const eurDateRef  = useRef(null);
  const plannedRef  = useRef([]);
  const paymentsRef = useRef([]);

  // Sheets
  const [addSheet, setAddSheet]           = useState(false);
  const [editExpSheet, setEditExpSheet]   = useState(false);
  const [editExpId, setEditExpId]         = useState(null);
  const [editMemSheet, setEditMemSheet]   = useState(false);
  const [editMemIdx, setEditMemIdx]       = useState(null);
  const [addMemSheet, setAddMemSheet]     = useState(false);
  const [newMemName, setNewMemName]       = useState("");
  const [rateSheet, setRateSheet]         = useState(false);
  const [rateInput, setRateInput]         = useState("");
  const [fetching, setFetching]           = useState(false);
  const [fetchErr, setFetchErr]           = useState(false);
  const [planSheet, setPlanSheet]         = useState(false);
  const [editPlanSheet, setEditPlanSheet] = useState(false);
  const [editPlanId, setEditPlanId]       = useState(null);
  const [paySheet, setPaySheet]           = useState(false);
  const [editPaySheet, setEditPaySheet]   = useState(false);
  const [editPayId, setEditPayId]         = useState(null);

  const [form, setForm]         = useState({ desc:"", amount:"", category:"party", currency:"ILS", image:null });
  const [planForm, setPlanForm] = useState({ desc:"", amount:"", category:"party", currency:"ILS", image:null });
  const [editMem, setEditMem]   = useState({ name:"", paid:"" });
  const [payForm, setPayForm]   = useState({ memberIdx:null, amount:"", method:"ביט" });

  // ── Admin persistence ──
  useEffect(() => {
    try { if (localStorage.getItem("mykonos-admin")==="1") setIsAdmin(true); } catch {}
  }, []);
  const tryUnlock = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setPinSheet(false);
      setPinInput("");
      setPinError(false);
      try { localStorage.setItem("mykonos-admin","1"); } catch {}
    } else {
      setPinError(true);
      setPinInput("");
    }
  };
  const lockAdmin = () => {
    setIsAdmin(false);
    try { localStorage.removeItem("mykonos-admin"); } catch {}
  };

  // ── STORAGE (Firebase) ──
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
        planned:  plannedRef.current  || [],
        payments: paymentsRef.current || [],
      });
    } catch(e) { console.error("Firebase save failed", e); }
  };

  useEffect(() => {
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
      unsubscribe();
    }, () => setLoaded(true));
  }, []);

  const setMembers  = (upd) => setMembersState(prev => { const next = typeof upd==="function"?upd(prev):upd; saveAll({ members:next }); return next; });
  const setExpenses = (upd) => setExpensesState(prev => { const next = typeof upd==="function"?upd(prev):upd; saveAll({ expenses:next }); return next; });
  const setPlanned  = (upd) => setPlannedState(prev => { const next = typeof upd==="function"?upd(prev):upd; saveAll({ planned:next }); return next; });
  const applyRate = (rate, date) => { setEurRateState(rate); setEurDateState(date); saveAll({ eurRate:rate, eurDate:date }); };

  const fetchRate = async () => {
    setFetching(true); setFetchErr(false);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/EUR");
      const d = await res.json();
      if (d.rates?.ILS) { applyRate(parseFloat(d.rates.ILS.toFixed(4)), d.time_last_update_utc?.slice(0,10)||today()); setRateSheet(false); setFetching(false); return; }
      throw 0;
    } catch {
      try {
        const r2 = await fetch("https://api.frankfurter.app/latest?from=EUR&to=ILS");
        const d2 = await r2.json();
        if (d2.rates?.ILS) { applyRate(parseFloat(d2.rates.ILS.toFixed(4)), d2.date); setRateSheet(false); setFetching(false); return; }
        throw 0;
      } catch { setFetchErr(true); }
    }
    setFetching(false);
  };

  const rateIsToday = eurDate === today();

  // ── CALCS ──
  const total          = useMemo(()=>expenses.reduce((s,e)=>s+e.amount,0),[expenses]);
  const numMembers     = members.length;
  const perPerson      = numMembers>0?total/numMembers:0;
  const friends        = members.slice(1);
  const totalReceived  = useMemo(()=>friends.reduce((s,m)=>s+(m.paid||0),0),[members]);
  const totalNeeded    = perPerson*friends.length;
  const outstanding    = Math.max(0,totalNeeded-totalReceived);
  const friendsBal     = friends.map((m,i)=>({...m,idx:i+1,owes:perPerson-(m.paid||0)}));
  const paidFull       = friendsBal.filter(f=>f.owes<=1).length;
  const pct            = totalNeeded>0?Math.min(100,(totalReceived/totalNeeded)*100):0;
  const eurToIls       = (eur)=>eur*eurRate*(1+CC_FEE);

  // ── ACTIONS ──
  const commitAdd = () => {
    const amt = parseFloat(form.amount);
    if (isNaN(amt)||amt<=0) return;
    const cat = CATEGORIES.find(c=>c.id===form.category);
    const desc = form.desc.trim() || cat?.label || form.category;
    const final = form.currency==="EUR"?Math.round(eurToIls(amt)):Math.round(amt*(1+CC_FEE));
    setExpenses(prev=>[...prev,{ id:Date.now(), desc, amount:final, category:form.category, currency:form.currency, originalAmount:amt, image:form.image||null }]);
    setForm({ desc:"", amount:"", category:"party", currency:"ILS", image:null });
    setAddSheet(false);
  };

  const openEditExp = (exp) => {
    setEditExpId(exp.id);
    setForm({ desc:exp.desc, amount:String(exp.originalAmount), category:exp.category, currency:exp.currency, image:exp.image||null });
    setEditExpSheet(true);
  };
  const commitEditExp = () => {
    const amt = parseFloat(form.amount);
    if (isNaN(amt)||amt<=0) return;
    const cat = CATEGORIES.find(c=>c.id===form.category);
    const desc = form.desc.trim() || cat?.label || form.category;
    const final = form.currency==="EUR"?Math.round(eurToIls(amt)):Math.round(amt*(1+CC_FEE));
    setExpenses(prev=>prev.map(e=>e.id===editExpId?{ ...e, desc, amount:final, category:form.category, currency:form.currency, originalAmount:amt, image:form.image||null }:e));
    setEditExpSheet(false);
  };

  const openEditMem = (idx) => {
    if (!isAdmin) return;
    setEditMemIdx(idx);
    setEditMem({ name:members[idx].name, paid:members[idx].paid!=null?String(members[idx].paid):"" });
    setEditMemSheet(true);
  };
  const commitEditMem = () => {
    const paid = parseFloat(editMem.paid);
    setMembers(prev=>prev.map((m,i)=>i===editMemIdx?{...m,name:editMem.name||m.name,paid:isNaN(paid)?m.paid:paid}:m));
    setEditMemSheet(false);
  };

  const inp = { width:"100%", padding:"13px 15px", borderRadius:14, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#fff", fontSize:16, boxSizing:"border-box", outline:"none" };

  if (!loaded) return (
    <div style={{ minHeight:"100vh", background:"#0a0616", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#f9a8d4", fontSize:16, direction:"rtl", gap:12 }}>
      <div style={{ fontSize:40 }}>🏖️</div>
      טוען...
    </div>
  );

  const catOf = (id) => CATEGORIES.find(c=>c.id===id);

  return (
    <div style={{ minHeight:"100vh", background:"#0a0616", fontFamily:"'Segoe UI',sans-serif", direction:"rtl", color:"#fff", paddingBottom:110 }}>

      {/* ═══ HERO HEADER ═══ */}
      <div style={{ position:"relative", height:230, overflow:"hidden" }}>
        <img src={HERO_IMAGE} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(10,6,22,0.25) 0%,rgba(10,6,22,0.55) 55%,#0a0616 100%)" }} />

        {/* Admin lock button */}
        <button onClick={()=>{ if(isAdmin){ lockAdmin(); } else { setPinInput(""); setPinError(false); setPinSheet(true); } }} style={{
          position:"absolute", top:14, left:14, zIndex:5,
          background: isAdmin?"linear-gradient(135deg,#ec4899,#a855f7)":"rgba(0,0,0,0.5)",
          border:"1px solid rgba(255,255,255,0.2)", borderRadius:99,
          color:"#fff", cursor:"pointer", padding:"7px 14px", fontSize:12, fontWeight:700,
          backdropFilter:"blur(8px)",
        }}>
          {isAdmin ? "🔓 מנהל" : "🔒"}
        </button>

        {/* EUR badge */}
        <div onClick={()=>{ if(!isAdmin) return; setRateInput(eurRate.toFixed(4)); setFetchErr(false); setRateSheet(true); }} style={{
          position:"absolute", top:14, right:14, zIndex:5,
          background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)",
          borderRadius:12, padding:"7px 12px",
          border:`1px solid ${rateIsToday?"rgba(52,211,153,0.5)":"rgba(239,68,68,0.5)"}`,
          textAlign:"center", cursor:isAdmin?"pointer":"default",
        }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#fbbf24" }}>€1 = ₪{eurRate.toFixed(2)}</div>
          <div style={{ fontSize:9, color:rateIsToday?"#34d399":"#f87171" }}>{rateIsToday?"✓ עודכן היום":"⚠️ לא עודכן"}</div>
        </div>

        {/* Title */}
        <div style={{ position:"absolute", bottom:16, right:20, left:20, zIndex:5 }}>
          <div style={{ fontSize:34, fontWeight:900, color:"#fff", textShadow:"0 2px 20px rgba(236,72,153,0.6)", letterSpacing:-0.5 }}>
            MYKONOS <span style={{ background:"linear-gradient(135deg,#ec4899,#a855f7,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>2025</span>
          </div>
          <div style={{ fontSize:13, color:"#d8c9ea", marginTop:2 }}>
            {numMembers} משתתפים · {fmt(Math.round(perPerson))} לאדם {!isAdmin && "· 👁 מצב צפייה"}
          </div>
        </div>
      </div>

      {/* ═══ KPI STRIP ═══ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, padding:"16px 16px 0", maxWidth:520, margin:"0 auto" }}>
        {[
          { label:"סה״כ הוצאות", value:fmt(total), grad:"linear-gradient(135deg,rgba(34,211,238,0.15),rgba(59,130,246,0.15))", border:"rgba(34,211,238,0.3)", color:"#67e8f9" },
          { label:"התקבל", value:fmt(totalReceived), grad:"linear-gradient(135deg,rgba(52,211,153,0.15),rgba(16,185,129,0.15))", border:"rgba(52,211,153,0.3)", color:"#34d399" },
          { label:"נשאר לגבות", value:fmt(Math.round(outstanding)), grad:"linear-gradient(135deg,rgba(236,72,153,0.15),rgba(239,68,68,0.15))", border:"rgba(236,72,153,0.3)", color:"#f9a8d4" },
        ].map(x=>(
          <div key={x.label} style={{ background:x.grad, borderRadius:16, padding:"12px 8px", textAlign:"center", border:`1px solid ${x.border}` }}>
            <div style={{ fontSize:15, fontWeight:800, color:x.color }}>{x.value}</div>
            <div style={{ fontSize:10, color:"#94a3c0", marginTop:2 }}>{x.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ display:"flex", gap:6, padding:"14px 16px", maxWidth:520, margin:"0 auto", overflowX:"auto" }}>
        {[
          { id:"events",  label:"🎉 אירועים" },
          { id:"summary", label:"📊 סיכום" },
          { id:"people",  label:"👥 חברים" },
          { id:"planned", label:"🗓 צפוי" },
          ...(isAdmin ? [{ id:"pay", label:"💳 תשלום" }] : []),
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flexShrink:0, padding:"9px 16px", borderRadius:99, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
            background: tab===t.id?"linear-gradient(135deg,#ec4899,#a855f7)":"rgba(255,255,255,0.06)",
            color: tab===t.id?"#fff":"#94a3c0",
            boxShadow: tab===t.id?"0 4px 20px rgba(236,72,153,0.4)":"none",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"4px 16px", maxWidth:520, margin:"0 auto" }}>

        {/* ═══ EVENTS TAB (expenses with images) ═══ */}
        {tab==="events" && (
          <div>
            {expenses.length===0 && (
              <div style={{ textAlign:"center", padding:"50px 0", color:"#64748b" }}>
                <div style={{ fontSize:44, marginBottom:10 }}>🎉</div>
                <div>עוד אין אירועים</div>
              </div>
            )}
            {expenses.map(e=>{
              const cat = catOf(e.category);
              return (
                <div key={e.id} style={{ borderRadius:22, overflow:"hidden", marginBottom:16, border:"1px solid rgba(236,72,153,0.2)", background:"#141024", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                  {/* Image / fallback */}
                  <div style={{ position:"relative", height: e.image?170:90, background: e.image?"none":"linear-gradient(135deg,#2d1b4e,#1e1145)" }}>
                    {e.image
                      ? <img src={e.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", fontSize:44 }}>{cat?.emoji}</div>
                    }
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,transparent 30%,rgba(10,6,22,0.9) 100%)" }} />
                    <div style={{ position:"absolute", bottom:10, right:14, left:14, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontSize:19, fontWeight:900, color:"#fff", textShadow:"0 1px 8px rgba(0,0,0,0.8)" }}>{cat?.emoji} {e.desc}</div>
                        <div style={{ fontSize:11, color:"#c4b5fd" }}>{cat?.label}</div>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:22, fontWeight:900, color:"#f9a8d4", textShadow:"0 1px 8px rgba(0,0,0,0.8)" }}>{fmt(e.amount)}</div>
                        <div style={{ fontSize:10, color:"#94a3c0" }}>{fmt(Math.round(e.amount/numMembers))}/אדם</div>
                      </div>
                    </div>
                  </div>
                  {/* Admin actions */}
                  {isAdmin && (
                    <div style={{ display:"flex", gap:8, padding:"10px 14px" }}>
                      <button onClick={()=>openEditExp(e)} style={{ flex:1, padding:"9px", borderRadius:10, border:"none", background:"rgba(168,85,247,0.15)", color:"#c4b5fd", cursor:"pointer", fontSize:13, fontWeight:600 }}>✏️ ערוך</button>
                      <button onClick={()=>setExpenses(prev=>prev.filter(x=>x.id!==e.id))} style={{ padding:"9px 16px", borderRadius:10, border:"none", background:"rgba(239,68,68,0.15)", color:"#f87171", cursor:"pointer", fontSize:13 }}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ SUMMARY TAB ═══ */}
        {tab==="summary" && (
          <div>
            <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:20, padding:18, marginBottom:14, border:"1px solid rgba(236,72,153,0.2)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#f9a8d4" }}>גביית כסף מ-{friends.length} חברים</span>
                <span style={{ fontSize:13, color:"#67e8f9" }}>{fmt(totalReceived)} / {fmt(Math.round(totalNeeded))}</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, height:12, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:99, background:"linear-gradient(90deg,#22d3ee,#a855f7,#ec4899)", width:`${pct}%`, transition:"width 0.5s", boxShadow:"0 0 12px rgba(236,72,153,0.6)" }} />
              </div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:6 }}>{paidFull} מתוך {friends.length} סיימו · {Math.round(pct)}%</div>
            </div>

            {friendsBal.map(f=>{
              const ov=f.owes<-1, done=Math.abs(f.owes)<=1;
              return (
                <div key={f.idx} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8, background:done?"rgba(52,211,153,0.07)":ov?"rgba(251,191,36,0.07)":"rgba(255,255,255,0.04)", borderRadius:16, padding:"13px", border:`1px solid ${done?"rgba(52,211,153,0.25)":ov?"rgba(251,191,36,0.25)":"rgba(255,255,255,0.08)"}` }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#ec4899,#a855f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:"#fff", flexShrink:0 }}>{f.name[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{f.name}</div>
                    <div style={{ fontSize:21, fontWeight:900, color:"#67e8f9", lineHeight:1.2 }}>{fmt(f.paid||0)}</div>
                    <div style={{ fontSize:10, color:"#64748b" }}>צריך {fmt(Math.round(perPerson))}</div>
                  </div>
                  <div style={{ textAlign:"center", minWidth:65 }}>
                    {done && <span style={{ color:"#34d399", fontWeight:800, fontSize:22 }}>✓</span>}
                    {ov && <><div style={{ fontSize:10, color:"#fbbf24" }}>עודף</div><div style={{ color:"#fbbf24", fontWeight:900, fontSize:16 }}>{fmt(Math.round(Math.abs(f.owes)))}</div></>}
                    {!done&&!ov && <><div style={{ fontSize:10, color:"#94a3c0" }}>חסר</div><div style={{ color:"#f87171", fontWeight:900, fontSize:18 }}>{fmt(Math.round(f.owes))}</div></>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ PEOPLE TAB ═══ */}
        {tab==="people" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#64748b" }}>{isAdmin?"לחץ על חבר לעדכון":"רשימת המשתתפים"}</div>
              {isAdmin && <button onClick={()=>{ setNewMemName(""); setAddMemSheet(true); }} style={{ background:"linear-gradient(135deg,#ec4899,#a855f7)", border:"none", borderRadius:99, color:"#fff", cursor:"pointer", padding:"6px 16px", fontSize:12, fontWeight:800 }}>+ הוסף חבר</button>}
            </div>

            <div style={{ background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(236,72,153,0.1))", borderRadius:18, padding:"14px", marginBottom:10, border:"1px solid rgba(251,191,36,0.3)", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"#fff" }}>א</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#fbbf24" }}>אלירן 👑 המשלם</div>
                <div style={{ fontSize:24, fontWeight:900, color:"#67e8f9", lineHeight:1.2 }}>{fmt(total)}</div>
                <div style={{ fontSize:10, color:"#94a3c0" }}>שילם הכל · חלקו {fmt(Math.round(perPerson))}</div>
              </div>
            </div>

            {friends.map((m,i)=>{
              const idx=i+1, owes=perPerson-(m.paid||0), done=Math.abs(owes)<=1, ov=owes<-1;
              return (
                <div key={idx} onClick={()=>openEditMem(idx)} style={{ background:done?"rgba(52,211,153,0.07)":"rgba(255,255,255,0.04)", borderRadius:16, padding:"13px", marginBottom:8, border:`1px solid ${done?"rgba(52,211,153,0.25)":"rgba(255,255,255,0.08)"}`, display:"flex", alignItems:"center", gap:12, cursor:isAdmin?"pointer":"default" }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#22d3ee,#a855f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:"#fff", flexShrink:0 }}>{m.name[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{m.name}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#67e8f9", lineHeight:1.2 }}>{fmt(m.paid||0)}</div>
                    <div style={{ fontSize:10, color:"#64748b" }}>שילם</div>
                  </div>
                  <div style={{ textAlign:"center", minWidth:60 }}>
                    {done?<span style={{ color:"#34d399", fontWeight:800, fontSize:22 }}>✓</span>
                     :ov?<><div style={{ fontSize:10, color:"#fbbf24" }}>עודף</div><div style={{ color:"#fbbf24", fontWeight:900, fontSize:15 }}>{fmt(Math.round(Math.abs(owes)))}</div></>
                     :<><div style={{ fontSize:10, color:"#94a3c0" }}>חסר</div><div style={{ color:"#f87171", fontWeight:900, fontSize:17 }}>{fmt(Math.round(owes))}</div></>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ PLANNED TAB ═══ */}
        {tab==="planned" && (
          <div>
            {planned.length>0 && (()=>{
              const planTotal = planned.reduce((s,p)=>s+p.amount,0);
              const planPer   = numMembers>0?planTotal/numMembers:0;
              return (
                <div style={{ background:"linear-gradient(135deg,rgba(168,85,247,0.15),rgba(236,72,153,0.15))", borderRadius:20, padding:18, marginBottom:16, border:"1px solid rgba(168,85,247,0.35)" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#c4b5fd", marginBottom:10 }}>סיכום הוצאות צפויות</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div><div style={{ fontSize:11, color:"#64748b" }}>סה״כ צפוי</div><div style={{ fontSize:24, fontWeight:900, color:"#c4b5fd" }}>{fmt(planTotal)}</div></div>
                    <div><div style={{ fontSize:11, color:"#64748b" }}>לאדם</div><div style={{ fontSize:24, fontWeight:900, color:"#f9a8d4" }}>{fmt(Math.round(planPer))}</div></div>
                  </div>
                </div>
              );
            })()}

            {planned.length===0 && (
              <div style={{ textAlign:"center", padding:"50px 0", color:"#64748b" }}>
                <div style={{ fontSize:44, marginBottom:10 }}>🗓</div>
                <div>אין הוצאות צפויות</div>
              </div>
            )}

            {planned.map(p=>{
              const cat = catOf(p.category);
              return (
                <div key={p.id} style={{ borderRadius:22, overflow:"hidden", marginBottom:16, border:"1px solid rgba(168,85,247,0.25)", background:"#141024" }}>
                  <div style={{ position:"relative", height:p.image?150:80, background:p.image?"none":"linear-gradient(135deg,#2d1b4e,#1e1145)" }}>
                    {p.image
                      ? <img src={p.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", fontSize:40 }}>{cat?.emoji}</div>
                    }
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,transparent 30%,rgba(10,6,22,0.9) 100%)" }} />
                    <div style={{ position:"absolute", bottom:10, right:14, left:14, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontSize:17, fontWeight:900, color:"#fff", textShadow:"0 1px 8px rgba(0,0,0,0.8)" }}>{cat?.emoji} {p.desc}</div>
                        <div style={{ fontSize:11, color:"#c4b5fd" }}>{cat?.label} · צפוי</div>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:20, fontWeight:900, color:"#c4b5fd" }}>{fmt(p.amount)}</div>
                        <div style={{ fontSize:10, color:"#94a3c0" }}>{fmt(Math.round(p.amount/numMembers))}/אדם</div>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                        <button onClick={()=>{ setEditPlanId(p.id); setPlanForm({ desc:p.desc, amount:String(p.originalAmount), category:p.category, currency:p.currency, image:p.image||null }); setEditPlanSheet(true); }} style={{ flex:1, padding:"9px", borderRadius:10, border:"none", background:"rgba(168,85,247,0.15)", color:"#c4b5fd", cursor:"pointer", fontSize:13, fontWeight:600 }}>✏️ ערוך</button>
                        <button onClick={()=>setPlanned(prev=>prev.filter(x=>x.id!==p.id))} style={{ padding:"9px 16px", borderRadius:10, border:"none", background:"rgba(239,68,68,0.15)", color:"#f87171", cursor:"pointer", fontSize:13 }}>🗑</button>
                      </div>
                      <button onClick={()=>{
                        const newExpense = { id:Date.now(), desc:p.desc, amount:p.amount, category:p.category, currency:p.currency||"ILS", originalAmount:p.originalAmount||p.amount, image:p.image||null };
                        const newExpenses = [...expensesRef.current, newExpense];
                        const newPlanned  = plannedRef.current.filter(x=>x.id!==p.id);
                        saveAll({ expenses:newExpenses, planned:newPlanned });
                        setExpensesState(newExpenses);
                        setPlannedState(newPlanned);
                      }} style={{ width:"100%", padding:"11px", borderRadius:12, border:"1px solid rgba(52,211,153,0.35)", background:"linear-gradient(135deg,rgba(5,150,105,0.2),rgba(16,185,129,0.2))", color:"#34d399", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                        ✓ שולם — העבר לאירועים
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ PAY TAB (admin only) ═══ */}
        {tab==="pay" && isAdmin && (
          <div>
            <button onClick={()=>{ setPayForm({ memberIdx:null, amount:"", method:"ביט" }); setPaySheet(true); }} style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer", marginBottom:20, boxShadow:"0 6px 24px rgba(16,185,129,0.4)" }}>
              + רשום תשלום חדש
            </button>
            <div style={{ fontSize:13, fontWeight:700, color:"#f9a8d4", marginBottom:12 }}>היסטוריית תשלומים</div>
            {payments.length===0 && (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#64748b" }}>
                <div style={{ fontSize:40, marginBottom:8 }}>💳</div>
                <div style={{ fontSize:14 }}>עוד לא נרשמו תשלומים</div>
              </div>
            )}
            {[...payments].reverse().map(p=>{
              const member = members[p.memberIdx];
              return (
                <div key={p.id} style={{ background:"rgba(5,150,105,0.08)", borderRadius:16, padding:"14px 16px", marginBottom:10, border:"1px solid rgba(5,150,105,0.25)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#059669,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"#fff", flexShrink:0 }}>{member?.name[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{member?.name}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{p.method} · {new Date(p.date).toLocaleDateString("he-IL",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}</div>
                    </div>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:22, fontWeight:900, color:"#34d399", marginBottom:6 }}>+{fmt(p.amount)}</div>
                      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                        <button onClick={()=>{ setEditPayId(p.id); setPayForm({ memberIdx:p.memberIdx, amount:String(p.amount), method:p.method }); setEditPaySheet(true); }} style={{ background:"rgba(168,85,247,0.2)", border:"none", borderRadius:8, color:"#c4b5fd", cursor:"pointer", padding:"4px 9px", fontSize:13 }}>✏️</button>
                        <button onClick={()=>{
                          const newPayments = paymentsRef.current.filter(x=>x.id!==p.id);
                          const newMembers  = membersRef.current.map((m,i)=>i===p.memberIdx?{...m,paid:Math.max(0,(m.paid||0)-p.amount)}:m);
                          saveAll({ payments:newPayments, members:newMembers });
                          setPaymentsState(newPayments);
                          setMembersState(newMembers);
                        }} style={{ background:"rgba(239,68,68,0.15)", border:"none", borderRadius:8, color:"#ef4444", cursor:"pointer", padding:"4px 9px", fontSize:13 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ FABs (admin only) ═══ */}
      {isAdmin && tab==="events" && (
        <button onClick={()=>{ setForm({ desc:"", amount:"", category:"party", currency:"ILS", image:null }); setAddSheet(true); }} style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", padding:"15px 34px", borderRadius:99, border:"none", background:"linear-gradient(135deg,#ec4899,#a855f7)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer", boxShadow:"0 8px 32px rgba(236,72,153,0.6)", zIndex:50 }}>
          + הוסף אירוע
        </button>
      )}
      {isAdmin && tab==="planned" && (
        <button onClick={()=>{ setPlanForm({ desc:"", amount:"", category:"party", currency:"ILS", image:null }); setPlanSheet(true); }} style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", padding:"15px 34px", borderRadius:99, border:"none", background:"linear-gradient(135deg,#a855f7,#6366f1)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer", boxShadow:"0 8px 32px rgba(168,85,247,0.6)", zIndex:50 }}>
          + הוצאה צפויה
        </button>
      )}

      {/* ═══ SHEET: PIN unlock ═══ */}
      <BottomSheet open={pinSheet} onClose={()=>setPinSheet(false)} title="🔒 כניסת מנהל">
        <div style={{ fontSize:13, color:"#94a3c0", marginBottom:14, textAlign:"center" }}>הכנס קוד PIN לעריכה</div>
        {pinError && <div style={{ background:"rgba(239,68,68,0.1)", borderRadius:10, padding:"9px 14px", border:"1px solid rgba(239,68,68,0.3)", marginBottom:12, fontSize:12, color:"#f87171", textAlign:"center" }}>קוד שגוי, נסה שוב</div>}
        <div style={{ textAlign:"center", marginBottom:14, padding:"16px", background:"rgba(255,255,255,0.05)", borderRadius:16 }}>
          <div style={{ fontSize:36, fontWeight:900, letterSpacing:12, color:"#f9a8d4" }}>{"•".repeat(pinInput.length) || "····"}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, direction:"ltr" }}>
          {["1","2","3","4","5","6","7","8","9","⌫","0","✓"].map(k=>(
            <button key={k} onClick={()=>{
              if (k==="⌫") setPinInput(v=>v.slice(0,-1));
              else if (k==="✓") tryUnlock();
              else if (pinInput.length<6) setPinInput(v=>v+k);
            }} style={{ padding:"17px 0", borderRadius:16, border:"none", background:k==="✓"?"linear-gradient(135deg,#ec4899,#a855f7)":k==="⌫"?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.07)", color:k==="⌫"?"#f87171":"#fff", fontSize:k==="✓"?20:24, fontWeight:600, cursor:"pointer" }}>{k}</button>
          ))}
        </div>
      </BottomSheet>

      {/* ═══ SHEET: Add Event ═══ */}
      <BottomSheet open={addSheet} onClose={()=>setAddSheet(false)} title="🎉 אירוע חדש">
        <input placeholder="שם האירוע (לדוגמה: מסיבת בלאק קופי)" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{ ...inp, marginBottom:14 }} />
        <ImagePicker image={form.image} onChange={img=>setForm(f=>({...f,image:img}))} searchQuery={form.desc||"mykonos party"} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setForm(f=>({...f,category:c.id}))} style={{ padding:"10px", borderRadius:12, border:`2px solid ${form.category===c.id?"#ec4899":"rgba(255,255,255,0.1)"}`, background:form.category===c.id?"rgba(236,72,153,0.15)":"rgba(255,255,255,0.04)", color:form.category===c.id?"#f9a8d4":"#64748b", cursor:"pointer", fontSize:13, fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} currency={form.currency} onCurrencyChange={v=>setForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={commitAdd} disabled={!form.amount||parseFloat(form.amount)<=0} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:(!form.amount||parseFloat(form.amount)<=0)?"rgba(236,72,153,0.3)":"linear-gradient(135deg,#ec4899,#a855f7)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>+ הוסף אירוע</button>
      </BottomSheet>

      {/* ═══ SHEET: Edit Event ═══ */}
      <BottomSheet open={editExpSheet} onClose={()=>setEditExpSheet(false)} title="✏️ עריכת אירוע">
        <input placeholder="שם האירוע" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{ ...inp, marginBottom:14 }} />
        <ImagePicker image={form.image} onChange={img=>setForm(f=>({...f,image:img}))} searchQuery={form.desc||"mykonos party"} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setForm(f=>({...f,category:c.id}))} style={{ padding:"10px", borderRadius:12, border:`2px solid ${form.category===c.id?"#ec4899":"rgba(255,255,255,0.1)"}`, background:form.category===c.id?"rgba(236,72,153,0.15)":"rgba(255,255,255,0.04)", color:form.category===c.id?"#f9a8d4":"#64748b", cursor:"pointer", fontSize:13, fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} currency={form.currency} onCurrencyChange={v=>setForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={commitEditExp} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#f59e0b,#ec4899)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>שמור שינויים</button>
      </BottomSheet>

      {/* ═══ SHEET: Add Planned ═══ */}
      <BottomSheet open={planSheet} onClose={()=>setPlanSheet(false)} title="🗓 הוצאה צפויה">
        <input placeholder="שם האירוע הצפוי" value={planForm.desc} onChange={e=>setPlanForm(f=>({...f,desc:e.target.value}))} style={{ ...inp, marginBottom:14 }} />
        <ImagePicker image={planForm.image} onChange={img=>setPlanForm(f=>({...f,image:img}))} searchQuery={planForm.desc||"mykonos"} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setPlanForm(f=>({...f,category:c.id}))} style={{ padding:"10px", borderRadius:12, border:`2px solid ${planForm.category===c.id?"#a855f7":"rgba(255,255,255,0.1)"}`, background:planForm.category===c.id?"rgba(168,85,247,0.15)":"rgba(255,255,255,0.04)", color:planForm.category===c.id?"#c4b5fd":"#64748b", cursor:"pointer", fontSize:13, fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={planForm.amount} onChange={v=>setPlanForm(f=>({...f,amount:v}))} currency={planForm.currency} onCurrencyChange={v=>setPlanForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={()=>{
          const amt=parseFloat(planForm.amount);
          if(isNaN(amt)||amt<=0) return;
          const cat = catOf(planForm.category);
          const desc = planForm.desc.trim() || cat?.label || planForm.category;
          const final=planForm.currency==="EUR"?Math.round(amt*eurRate*(1+CC_FEE)):Math.round(amt*(1+CC_FEE));
          setPlanned(prev=>[...prev,{ id:Date.now(), desc, amount:final, category:planForm.category, currency:planForm.currency, originalAmount:amt, image:planForm.image||null }]);
          setPlanSheet(false);
        }} disabled={!planForm.amount||parseFloat(planForm.amount)<=0} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:(!planForm.amount)?"rgba(168,85,247,0.3)":"linear-gradient(135deg,#a855f7,#6366f1)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>+ הוסף</button>
      </BottomSheet>

      {/* ═══ SHEET: Edit Planned ═══ */}
      <BottomSheet open={editPlanSheet} onClose={()=>setEditPlanSheet(false)} title="✏️ עריכת הוצאה צפויה">
        <input placeholder="שם" value={planForm.desc} onChange={e=>setPlanForm(f=>({...f,desc:e.target.value}))} style={{ ...inp, marginBottom:14 }} />
        <ImagePicker image={planForm.image} onChange={img=>setPlanForm(f=>({...f,image:img}))} searchQuery={planForm.desc||"mykonos"} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setPlanForm(f=>({...f,category:c.id}))} style={{ padding:"10px", borderRadius:12, border:`2px solid ${planForm.category===c.id?"#a855f7":"rgba(255,255,255,0.1)"}`, background:planForm.category===c.id?"rgba(168,85,247,0.15)":"rgba(255,255,255,0.04)", color:planForm.category===c.id?"#c4b5fd":"#64748b", cursor:"pointer", fontSize:13, fontWeight:600 }}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <NumPad value={planForm.amount} onChange={v=>setPlanForm(f=>({...f,amount:v}))} currency={planForm.currency} onCurrencyChange={v=>setPlanForm(f=>({...f,currency:v}))} eurRate={eurRate} />
        <button onClick={()=>{
          const amt=parseFloat(planForm.amount);
          if(isNaN(amt)||amt<=0) return;
          const cat = catOf(planForm.category);
          const desc = planForm.desc.trim() || cat?.label || planForm.category;
          const final=planForm.currency==="EUR"?Math.round(amt*eurRate*(1+CC_FEE)):Math.round(amt*(1+CC_FEE));
          setPlanned(prev=>prev.map(p=>p.id===editPlanId?{...p,desc,amount:final,category:planForm.category,currency:planForm.currency,originalAmount:amt,image:planForm.image||null}:p));
          setEditPlanSheet(false);
        }} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#f59e0b,#a855f7)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>שמור</button>
      </BottomSheet>

      {/* ═══ SHEET: Add Member ═══ */}
      <BottomSheet open={addMemSheet} onClose={()=>setAddMemSheet(false)} title="👥 הוספת חבר">
        <input autoFocus placeholder="שם החבר" value={newMemName} onChange={e=>setNewMemName(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&newMemName.trim()){ setMembers(prev=>[...prev,{name:newMemName.trim(),paid:0}]); setAddMemSheet(false); }}}
          style={{ ...inp, fontSize:18, marginBottom:16 }} />
        <div style={{ background:"rgba(168,85,247,0.1)", borderRadius:12, padding:"12px 14px", marginBottom:20, border:"1px solid rgba(168,85,247,0.25)", fontSize:12, color:"#c4b5fd" }}>
          💡 החלוקה תתעדכן אוטומטית לפי המספר החדש
        </div>
        <button onClick={()=>{ if(!newMemName.trim()) return; setMembers(prev=>[...prev,{name:newMemName.trim(),paid:0}]); setAddMemSheet(false); }} disabled={!newMemName.trim()} style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:newMemName.trim()?"linear-gradient(135deg,#ec4899,#a855f7)":"rgba(236,72,153,0.3)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>+ הוסף חבר</button>
      </BottomSheet>

      {/* ═══ SHEET: Edit Member ═══ */}
      <BottomSheet open={editMemSheet} onClose={()=>setEditMemSheet(false)} title={editMemIdx!==null?`עדכון · ${members[editMemIdx]?.name}`:""}>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:8 }}>שם החבר</div>
        <input placeholder="שם" value={editMem.name} onChange={e=>setEditMem(f=>({...f,name:e.target.value}))} style={{ ...inp, marginBottom:20 }} />
        <div style={{ fontSize:13, color:"#64748b", marginBottom:8 }}>כמה שילם? (₪)</div>
        <NumPad value={editMem.paid} onChange={v=>setEditMem(f=>({...f,paid:v}))} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />
        <button onClick={commitEditMem} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#ec4899,#a855f7)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>שמור</button>
      </BottomSheet>

      {/* ═══ SHEET: New Payment ═══ */}
      <BottomSheet open={paySheet} onClose={()=>setPaySheet(false)} title="💳 רישום תשלום">
        <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>מי שילם?</div>
        <div style={{ marginBottom:16, maxHeight:200, overflowY:"auto" }}>
          {friends.map((m,i)=>{
            const idx=i+1, selected=payForm.memberIdx===idx;
            return (
              <div key={idx} onClick={()=>setPayForm(f=>({...f,memberIdx:idx}))} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:14, marginBottom:6, border:`2px solid ${selected?"#10b981":"rgba(255,255,255,0.1)"}`, background:selected?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)", cursor:"pointer" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:selected?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#22d3ee,#a855f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>{m.name[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{m.name}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>שילם עד כה: {fmt(m.paid||0)}</div>
                </div>
                {selected && <span style={{ color:"#34d399", fontSize:20 }}>✓</span>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>איך שילם?</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {["ביט","פייבוקס","העברה","מזומן","פפר","אחר"].map(m=>(
            <button key={m} onClick={()=>setPayForm(f=>({...f,method:m}))} style={{ padding:"10px 6px", borderRadius:12, border:`2px solid ${payForm.method===m?"#10b981":"rgba(255,255,255,0.1)"}`, background:payForm.method===m?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)", color:payForm.method===m?"#34d399":"#64748b", cursor:"pointer", fontSize:13, fontWeight:600 }}>{m}</button>
          ))}
        </div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>סכום (₪)</div>
        <NumPad value={payForm.amount} onChange={v=>setPayForm(f=>({...f,amount:v}))} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />
        <button onClick={()=>{
          const amt=parseFloat(payForm.amount);
          if(payForm.memberIdx===null||isNaN(amt)||amt<=0) return;
          const newPay={ id:Date.now(), memberIdx:payForm.memberIdx, amount:amt, method:payForm.method, date:new Date().toISOString() };
          const newPayments=[...paymentsRef.current,newPay];
          const newMembers=membersRef.current.map((m,i)=>i===payForm.memberIdx?{...m,paid:(m.paid||0)+amt}:m);
          saveAll({ payments:newPayments, members:newMembers });
          setPaymentsState(newPayments);
          setMembersState(newMembers);
          setPaySheet(false);
        }} disabled={payForm.memberIdx===null||!payForm.amount||parseFloat(payForm.amount)<=0} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:(payForm.memberIdx===null||!payForm.amount)?"rgba(5,150,105,0.3)":"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>✓ אשר תשלום</button>
      </BottomSheet>

      {/* ═══ SHEET: Edit Payment ═══ */}
      <BottomSheet open={editPaySheet} onClose={()=>setEditPaySheet(false)} title="✏️ עריכת תשלום">
        <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>מי שילם?</div>
        <div style={{ marginBottom:16, maxHeight:180, overflowY:"auto" }}>
          {friends.map((m,i)=>{
            const idx=i+1, selected=payForm.memberIdx===idx;
            return (
              <div key={idx} onClick={()=>setPayForm(f=>({...f,memberIdx:idx}))} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:14, marginBottom:6, border:`2px solid ${selected?"#10b981":"rgba(255,255,255,0.1)"}`, background:selected?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)", cursor:"pointer" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:selected?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#22d3ee,#a855f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>{m.name[0]}</div>
                <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{m.name}</div></div>
                {selected && <span style={{ color:"#34d399", fontSize:20 }}>✓</span>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>איך שילם?</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {["ביט","פייבוקס","העברה","מזומן","פפר","אחר"].map(m=>(
            <button key={m} onClick={()=>setPayForm(f=>({...f,method:m}))} style={{ padding:"10px 6px", borderRadius:12, border:`2px solid ${payForm.method===m?"#10b981":"rgba(255,255,255,0.1)"}`, background:payForm.method===m?"rgba(5,150,105,0.15)":"rgba(255,255,255,0.04)", color:payForm.method===m?"#34d399":"#64748b", cursor:"pointer", fontSize:13, fontWeight:600 }}>{m}</button>
          ))}
        </div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>סכום (₪)</div>
        <NumPad value={payForm.amount} onChange={v=>setPayForm(f=>({...f,amount:v}))} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />
        <button onClick={()=>{
          const amt=parseFloat(payForm.amount);
          if(payForm.memberIdx===null||isNaN(amt)||amt<=0) return;
          const oldPay = paymentsRef.current.find(x=>x.id===editPayId);
          const oldAmt = oldPay?.amount||0;
          const oldIdx = oldPay?.memberIdx;
          const newPayments = paymentsRef.current.map(x=>x.id===editPayId?{...x,memberIdx:payForm.memberIdx,amount:amt,method:payForm.method}:x);
          const newMembers = membersRef.current.map((m,i)=>{
            let paid = m.paid||0;
            if (i===oldIdx) paid = Math.max(0, paid-oldAmt);
            if (i===payForm.memberIdx) paid = paid+amt;
            return { ...m, paid };
          });
          saveAll({ payments:newPayments, members:newMembers });
          setPaymentsState(newPayments);
          setMembersState(newMembers);
          setEditPaySheet(false);
        }} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#f59e0b,#10b981)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>שמור שינויים</button>
      </BottomSheet>

      {/* ═══ SHEET: EUR Rate ═══ */}
      <BottomSheet open={rateSheet} onClose={()=>setRateSheet(false)} title="💱 עדכון שער יורו">
        <button onClick={fetchRate} disabled={fetching} style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", marginBottom:14, cursor:fetching?"default":"pointer", background:fetching?"rgba(16,185,129,0.2)":"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontWeight:800, fontSize:15 }}>
          {fetching?"⏳ מושך שער...":"🌐 שלוף שער עדכני אוטומטית"}
        </button>
        {fetchErr && <div style={{ background:"rgba(239,68,68,0.1)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(239,68,68,0.3)", marginBottom:14, fontSize:12, color:"#f87171" }}>⚠️ נכשל — הכנס ידנית (חפש "EUR ILS" בגוגל)</div>}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize:12, color:"#64748b" }}>או הכנס ידנית</span>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.1)" }} />
        </div>
        <div style={{ fontSize:13, color:"#94a3c0", marginBottom:8, textAlign:"center" }}>שער נוכחי: ₪{eurRate.toFixed(4)}</div>
        <NumPad value={rateInput} onChange={setRateInput} currency="ILS" onCurrencyChange={()=>{}} eurRate={null} hideCurrency />
        <button onClick={()=>{ const r=parseFloat(rateInput); if(!isNaN(r)&&r>0){applyRate(r,today());setRateSheet(false);}}} style={{ width:"100%", marginTop:16, padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#f59e0b,#ef4444)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>שמור שער</button>
      </BottomSheet>

    </div>
  );
}
