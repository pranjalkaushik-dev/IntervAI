import React,{useEffect,useState}from'react';import{useNavigate}from'react-router-dom';import{ArrowRight,Video,CheckCircle2,Users,Calendar,Code2,Upload,FileText}from'lucide-react';import interviewApi from'../api/interviewApi';import reportApi from'../api/reportApi';import{useAuth}from'../context/AuthContext';import{isInterviewActive,isInterviewCompleted}from'../utils/interviewStatus';
export default function StudentDashboard(){const{user}=useAuth();const nav=useNavigate();const[code,setCode]=useState('');const[interviews,setInterviews]=useState([]);const[reports,setReports]=useState({});const[error,setError]=useState('');const[resumeFile,setResumeFile]=useState(null);const[resumeText,setResumeText]=useState('');const[selectedInterview,setSelectedInterview]=useState('');
 const load=async()=>{try{const r=await interviewApi.getInterviews();const list=r.data?.interviews||[];setInterviews(list);const entries=await Promise.all(list.filter(x=>isInterviewCompleted(x.status)).slice(0,8).map(async x=>{try{const rr=await reportApi.getReport(x._id);return[x._id,rr.data?.report]}catch(_){return[x._id,null]}}));setReports(Object.fromEntries(entries))}catch(e){setError(e.message)}};
 useEffect(()=>{load()},[]);
 const join=async e=>{e.preventDefault();try{const r=await interviewApi.previewInterview(code.trim().toUpperCase());if(!isInterviewActive(r.data?.interview?.status)){nav('/waiting/'+code.trim().toUpperCase());return;}const j=await interviewApi.joinInterview(code.trim().toUpperCase());nav('/room/'+j.data.interview.roomCode)}catch(e){setError(e?.response?.data?.message||e.message||'Invalid room code')}};
  const uploadResume=async()=>{
    if(!resumeFile) { setResumeText('❌ Please choose a file first!'); return; }
    try{
      if (resumeFile.size > 10 * 1024 * 1024) throw new Error('Resume file must be smaller than 10 MB.');
      const ext = resumeFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'txt', 'md', 'text'].includes(ext)) throw new Error('Only PDF, DOCX, TXT, and MD resumes are supported.');
      
      let targetInterviewId = selectedInterview;
      let roomCodeToJoin = '';
      
      if (!targetInterviewId) {
        setResumeText('Creating Mock AI Interview...');
        const newInterviewRes = await interviewApi.createMockInterview();
        targetInterviewId = newInterviewRes.data.interview._id;
        roomCodeToJoin = newInterviewRes.data.interview.roomCode;
      }

      const formData = new FormData();
      formData.append('resume', resumeFile);
      setResumeText('Uploading resume and parsing AI skills...');
      await interviewApi.uploadResumeFile(targetInterviewId, formData);
      
      if (roomCodeToJoin) {
        setResumeText(`Saved successfully! Starting interview...`);
        setTimeout(() => nav('/room/' + roomCodeToJoin), 1500);
      } else {
        setResumeText(`Saved ${resumeFile.name} successfully.`);
      }
    }catch(e){
      setResumeText(e?.response?.data?.message||e.message||'Failed to process resume.');
    }
  };
 const completed=Object.values(reports).filter(Boolean);const avg=completed.length?Math.round(completed.reduce((a,r)=>a+(r.overallScore||0),0)/completed.length):null;const integrity=completed.length?Math.round(completed.reduce((a,r)=>a+(r.integrityScore||0),0)/completed.length):null;
 return <div className="ia-page"><div className="ia-page-head"><div><h1>Dashboard</h1><p>Welcome back, {user?.fullName||'Student'}. Prepare, practice and review your interview performance.</p></div></div><div className="ia-student-hero"><div><span className="ia-eyebrow blue">Student workspace</span><h2>Your next interview starts here.</h2><p>Join a live interview using your room code or review your sessions.</p></div><form onSubmit={join} className="ia-join-box"><label>Join interview</label><div><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="INT-XXXXXX"/><button className="ia-primary-btn">Join <ArrowRight size={16}/></button></div>{error&&<small className="ia-error">{error}</small>}</form></div>
 <div className="ia-kpis"><Kpi n={interviews.length} label="Interviews Taken" icon={Video} tone="blue"/><Kpi n={avg==null?'—':`${avg}/100`} label="Performance Avg" icon={Code2} tone="purple"/><Kpi n={integrity==null?'—':`${integrity}/100`} label="Integrity Avg" icon={CheckCircle2} tone="green"/><Kpi n="Available" label="P2P Practice" icon={Users} tone="cyan"/></div>
  <div className="ia-card"><div className="ia-card-head"><div><h3>Resume Profile</h3><p>Upload a resume to attach skills to an interview for resume-driven questioning.</p></div><FileText size={18}/></div><div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}><select value={selectedInterview} onChange={e=>setSelectedInterview(e.target.value)}><option value="">Create New AI Interview</option>{interviews.map(x=><option key={x._id} value={x._id}>{x.title} • {x.roomCode}</option>)}</select><input type="file" accept=".pdf,.docx,.txt,.md,.text" onChange={e=>setResumeFile(e.target.files?.[0]||null)}/><button className="ia-outline-btn" onClick={() => { if(!resumeFile) { setResumeText('❌ Please choose a file first!'); return; } uploadResume(); }}><Upload size={14}/> Save Resume</button></div>{resumeText&&<p style={{marginTop:8,color:resumeText.includes('❌')?'#ef4444':'#94a3b8',fontSize:12}}>{resumeText}</p>}</div>
 <div className="ia-card"><div className="ia-card-head"><div><h3>Your Interview Sessions</h3><p>Invited sessions, live assessment codes and completed reports</p></div></div>{interviews.length===0?<div className="ia-empty"><Calendar size={28}/><b>No interview sessions yet</b></div>:<div className="ia-session-list">{interviews.map((x,i)=>{const r=reports[x._id];return <div className="ia-session" key={x._id||i}><span className="ia-session-icon"><Code2 size={18}/></span><div><b>{x.title}</b><small>{x.roomCode} • {x.durationMinutes} minutes</small></div>{r&&<span className="ia-status done">{r.overallScore}/100</span>}<span className={`ia-status ${isInterviewCompleted(x.status)?'done':isInterviewActive(x.status)?'live':'scheduled'}`}>{x.status}</span>{isInterviewCompleted(x.status)&&r?<button className="ia-small-btn" onClick={()=>nav('/report/'+x._id)}>Report</button>:<button className="ia-small-btn" onClick={()=>nav('/waiting/'+x.roomCode)}>Open</button>}</div>})}</div>}</div></div>}
function Kpi({n,label,icon:Icon,tone}){return <div className={`ia-kpi ${tone}`}><div><span>{label}</span><b>{n}</b></div><i><Icon size={19}/></i></div>}
