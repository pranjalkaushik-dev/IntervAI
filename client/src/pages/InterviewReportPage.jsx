import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck, Code2, Brain, MessageCircle } from 'lucide-react';
import reportApi from '../api/reportApi';

export default function InterviewReportPage(){
 const {id}=useParams(); const nav=useNavigate(); const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 useEffect(()=>{reportApi.getReport(id).then(r=>setData(r.data)).catch(e=>setError(e?.response?.data?.message||e.message)).finally(()=>setLoading(false))},[id]);
 if(loading)return <div className="ia-page"><div className="ia-card ia-empty">Loading report…</div></div>;
 if(error)return <div className="ia-page"><div className="ia-error">{error}</div></div>;
 const r=data?.report;
 return <div className="ia-page"><div className="ia-page-head"><div><button className="ia-outline-btn" onClick={()=>nav('/dashboard')}><ArrowLeft size={14}/> Dashboard</button><h1 style={{marginTop:12}}>Interview Performance Report</h1><p>{data?.interview?.title||'Completed interview'}</p></div></div>{!r?<div className="ia-card ia-empty"><FileText size={30}/><b>Report not generated yet</b><span>The company can generate the report after the interview.</span></div>:<><div className="ia-kpis"><K n={r.overallScore} l="Overall" i={Brain}/><K n={r.technicalScore} l="Technical" i={Brain}/><K n={r.codingScore} l="Coding" i={Code2}/><K n={r.communicationScore} l="Communication" i={MessageCircle}/></div><div className="ia-card"><h3>Measured performance</h3><div className="ia-integrity-grid"><div><b>{r.testsPassed}/{r.testsTotal}</b><span>Tests passed</span></div><div><b>{r.submissions}</b><span>Submissions</span></div><div><b>{r.questionsAnswered}</b><span>AI-evaluated answers</span></div><div><b>{r.violations}</b><span>Integrity events</span></div></div></div><div className="ia-dashboard-bottom"><div className="ia-card mini"><h3>Strengths</h3>{(r.strengths||[]).map((x,i)=><p key={i}>• {x}</p>)}</div><div className="ia-card mini"><h3>Improvement areas</h3>{(r.improvements||[]).map((x,i)=><p key={i}>• {x}</p>)}</div></div><div className="ia-card"><div className="ia-card-head"><h3>AI summary</h3><ShieldCheck size={18}/></div><p style={{lineHeight:1.7,color:'#cbd5e1'}}>{r.aiSummary}</p></div></>}</div>
}
function K({n,l,i:Icon}){return <div className="ia-kpi blue"><div><span>{l}</span><b>{n}/100</b></div><i><Icon size={19}/></i></div>}
