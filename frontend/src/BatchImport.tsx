import { useState } from 'react';
import { api, type Candidate, type Resume } from './api';

type Item = {file:File;name:string;state:'ready'|'running'|'done'|'failed';message:string;candidateId?:number;targetProject?:number};
export function BatchImport({projectId,onImported,ensureProject,onBusy}:{projectId:number;onImported:()=>Promise<void>;ensureProject?:()=>Promise<number>;onBusy?:(busy:boolean)=>void}) {
  const [items,setItems]=useState<Item[]>([]);
  const [role,setRole]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const update=(index:number,change:Partial<Item>)=>setItems(prev=>prev.map((item,i)=>i===index?{...item,...change}:item));
  async function start(){
    setBusy(true);onBusy?.(true);setError('');
    try {
      const targetProject=ensureProject?await ensureProject():projectId;
      for(let i=0;i<items.length;i++){
        const item=items[i];if(item.state==='done')continue;
        update(i,{state:'running',message:'正在本地解析…'});
        const data=new FormData();data.set('role',role.trim());data.set('file',item.file);
        try {
          const result=await api<{candidate:Candidate;resume:Resume}>(`/projects/${targetProject}/import-candidate`,{method:'POST',body:data});
          update(i,{state:'done',name:result.candidate.name,candidateId:result.candidate.id,targetProject,message:result.resume.warning||'已创建候选人并保存简历'});
        } catch(e) {update(i,{state:'failed',message:e instanceof Error?e.message:'导入失败'});}
      }
      await onImported();
    } catch(e) {setError(e instanceof Error?e.message:'刷新列表失败，请刷新页面查看已导入人员。');}
    finally {setBusy(false);onBusy?.(false);}
  }
  const remaining=items.filter(i=>i.state!=='done');
  return <details className="card" open><summary>批量导入简历 · 一份文件对应一位候选人</summary>
    <p className="muted">选好文件即可导入，无需填写姓名。系统会从简历正文或文件名自动识别；识别不到也会先建立档案，不阻止导入。</p>
    <label>共同应聘岗位（可选）<input disabled={busy} value={role} maxLength={200} placeholder="留空自动识别岗位，或使用目标项目名称" onChange={e=>setRole(e.target.value)}/></label>
    <label>选择多份简历<input type="file" multiple accept=".pdf,.docx,.txt" disabled={busy} onChange={e=>{
      const files=Array.from(e.target.files||[]);setError('');
      if(files.some(f=>! /\.(pdf|docx|txt)$/i.test(f.name)||f.size>20*1024*1024||f.size===0)){setError('请选择有效的 PDF / DOCX / TXT 文件，每份非空且不超过 20 MB。');e.target.value='';return;}
      if(files.length>20){setError('每批最多 20 份，请分批导入。');e.target.value='';return;}
      setItems(files.map(file=>({file,name:'',state:'ready',message:''})));
    }}/></label><p className="muted">PDF / DOCX / TXT，每份最多 20 MB。只做本地解析，不调用模型。导入时请留在本页。</p>
    {!!items.length && <p role="status">已导入 {items.filter(i=>i.state==='done').length} / {items.length} 份 · 失败 {items.filter(i=>i.state==='failed').length} 份</p>}
    {items.map((item,i)=><div className="import-row" key={`${item.file.name}-${i}`}>
      <span>{item.file.name}<small> {Math.ceil(item.file.size/1024)} KB</small></span>
      <span>姓名：{item.name || (item.state==='running'?'识别中…':'导入时自动识别')}</span>
      <p className={item.state==='failed'?'error':'muted'}>{item.message||'待导入'}{item.candidateId && <> · <a href={`#/projects/${item.targetProject||projectId}/candidates/${item.candidateId}`}>打开候选人</a></>}</p>
    </div>)}
    {error && <p role="alert" className="error">{error}</p>}
    {items.some(i=>i.state==='failed') && <p className="muted">如果提示连接中断，请先检查下方候选人列表，确认该文件未成功导入后再重试。</p>}
    <button disabled={busy||!remaining.length} onClick={()=>void start()}>{busy?'正在逐份导入…':items.length&&!remaining.length?'已全部导入':items.some(i=>i.state==='failed')?'重试未成功的文件':'开始批量导入'}</button>
  </details>;
}
