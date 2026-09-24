import { useEffect, useState } from 'react';
import { api, json } from './api';

type Report = {id:number; session_id:number; created_at:string; markdown:string};
export async function archiveReport(sid:number, note:string, manual:{q:string;a:string}[]) {
  return api<Report>(`/sessions/${sid}/reports`, json('POST',{note,manual}));
}
export async function downloadReport(id:number, format:'zip'|'pdf'|'md'='zip') {
  const response = await fetch(`/api/reports/${id}/download/${format}`);
  if(!response.ok) throw new Error('报告下载失败，请重试。');
  const blob = await response.blob();
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`面试报告-${id}.${format}`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export function ReportReader({report}:{report:Report}) {
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function download(format:'zip'|'pdf'|'md') {
    setBusy(true); setError('');
    try {await downloadReport(report.id,format);} catch(e){setError(e instanceof Error?e.message:'下载失败');} finally {setBusy(false);}
  }
  return <article className="report-reader">
    <div className="report-toolbar"><div><span className="eyebrow">已归档 · REPORT #{report.id}</span><p className="muted">面试 #{report.session_id} · {report.created_at} UTC</p></div>
      <div className="report-actions"><button disabled={busy} onClick={()=>void download('zip')}>下载 PDF + MD</button><button className="secondary" disabled={busy} onClick={()=>void download('pdf')}>仅 PDF</button><button className="secondary" disabled={busy} onClick={()=>void download('md')}>仅 Markdown</button></div>
    </div>{error && <p role="alert" className="error">{error}</p>}
    <div className="report-paper"><ReportBody markdown={report.markdown}/></div>

  </article>;
}
const secondarySections = ['能力覆盖','提纲选定的 Skill 快照','竞赛参考价值','声明与原文','待确认清单','面试记录','手动问答'];
function ReportBody({markdown}:{markdown:string}) {
  const sections:{title:string;blocks:string[];folded:boolean}[]=[];
  for(const block of markdown.split('\n\n')) {
    if(block.startsWith('## ')) {
      const title=block.slice(3);
      sections.push({title,blocks:[],folded:title.startsWith('附录 · ')||secondarySections.some(s=>title.startsWith(s))});
    } else {
      if(!sections.length) sections.push({title:'',blocks:[],folded:false});
      sections.at(-1)!.blocks.push(block);
    }
  }
  const render=(blocks:string[])=>blocks.map((block,i)=>block.startsWith('### ')?<h3 key={i}>{block.slice(4)}</h3>:block.startsWith('# ')?<h1 key={i}>{block.slice(2)}</h1>:<p key={i}>{block}</p>);
  return <>{sections.filter(s=>!s.folded).map((s,i)=><section key={i}>{s.title&&<h2>{s.title}</h2>}{render(s.blocks)}</section>)}
    <div className="report-appendices"><p className="muted">参考资料 · 需要时展开</p>{sections.filter(s=>s.folded).map((s,i)=><details key={i}><summary>{s.title.replace('附录 · ','')}</summary>{render(s.blocks)}</details>)}</div>
  </>;
}
export function CandidateReports({candidateId}:{candidateId:number}) {
  const [reports,setReports]=useState<Report[]>([]), [selected,setSelected]=useState<Report|null>(null);
  const [error,setError]=useState(''), [loading,setLoading]=useState(true);
  useEffect(()=>{void api<Report[]>(`/candidates/${candidateId}/reports`).then(setReports).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[candidateId]);
  return <section className="card report-archive"><h3>报告档案</h3><p className="muted">保存的报告按版本留档，可直接阅读或再次下载。PDF 与 Markdown 打包为一个 ZIP 文件。</p>
    {loading?<p>正在读取报告…</p>:!reports.length && <p className="muted">暂无归档报告。打开已结束的面试，点击「生成报告并归档」或「下载报告」即可保存。</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {reports.map(r=><div className="report-toolbar" key={r.id}><span>面试 #{r.session_id} · 报告 #{r.id}<small className="muted"> · {r.created_at} UTC</small></span><button className="secondary" onClick={()=>void api<Report>(`/reports/${r.id}`).then(setSelected).catch(e=>setError(e.message))}>查看报告 #{r.id}</button></div>)}
    {selected && <><p className="muted">历史版本保留归档时的内容。<a href={`#/sessions/${selected.session_id}`}>返回面试生成新版简报 →</a></p><button className="secondary" onClick={()=>setSelected(null)}>收起报告</button><ReportReader report={selected}/></>}
  </section>;
}
