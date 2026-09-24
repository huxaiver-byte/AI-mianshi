const steps = [
  {title:'配置模型，准备岗位',desc:'先在设置中保存模型服务、地址、密钥与模型名称，并测试连接。随后新建岗位，把职责、技能要求和考察重点写进 JD。',action:'新建岗位',href:'#/new/jd',tip:'本地解析简历无需模型；生成提纲、分析回答需要可用的模型连接。'},
  {title:'导入一份，或一整批简历',desc:'在工作台选择目标项目。单份识别会尝试提取姓名与年限；切换「批量导入」后，可一次选择最多 20 份 PDF、DOCX 或 TXT，每份不超过 20 MB。',action:'导入简历',href:'#/app',tip:'批量模式自动从正文或文件名识别姓名，无需手动填写；共同岗位可留空自动识别。一份文件创建一位候选人，失败项可以重试。'},
  {title:'检查原文，生成面试提纲',desc:'打开候选人档案，检查解析后的简历，选择出题规则并预览将发送给模型的内容。确认脱敏结果后，点击「确认生成提纲」。',action:'查看出题规则',href:'#/skills',tip:'扫描版 PDF 可能无法提取文字。遇到空白文本，可先转换为包含文字的 PDF、DOCX 或 TXT。'},
  {title:'按自己的节奏，进行面试',desc:'从提纲开始面试，逐题记录回答。可选用推荐追问、输入自己的问题，或跳过当前问题。HR 备注用于记录你的判断。',action:'打开面试日历',href:'#/calendar',tip:'正式回答提交后保存到本机数据库；HR 备注与手动问答暂存在当前浏览器，生成报告时一并归档。'},
  {title:'在线复盘，保存完整报告',desc:'结束面试后点击「生成报告并归档」，即可在网页内阅读。点击「下载报告」会先归档，再下载包含 PDF 和 Markdown 的 ZIP，也可在报告内单独下载任一格式。',action:'查看候选人档案',href:'#/app',tip:'在候选人档案的「报告档案」中回看历史版本。相同内容不会重复建档，修改备注后可保存新版本。'}
];
export function GuidePage(){return <div className="guide-page">
  <div className="hero"><span className="eyebrow">使用指南 · GET STARTED</span><h1>从一份简历，<br/>到一份有据可查的报告。</h1><p>五个步骤，熟悉你的面试工作台。准备、交流、复盘，都在这里完成。</p><div className="report-actions"><a className="button-link primary-link" href="#/app">开始使用 →</a><a className="button-link" href="#/settings">配置模型</a></div></div>
  <div className="guide-steps">{steps.map((step,i)=><article className="card guide-step" key={step.title}><span className="guide-number">0{i+1}</span><div><span className="eyebrow">STEP 0{i+1}</span><h2>{step.title}</h2><p>{step.desc}</p><p className="guide-tip">{step.tip}</p><a className="text-link" href={step.href}>{step.action} →</a></div></article>)}</div>
  <section className="card guide-faq"><h2>常见问题</h2><details><summary>数据存在哪里？</summary><p>候选人、面试与归档报告保存在本机数据库。调用远程模型时，预览中的内容会发送至你配置的服务。请在发送前检查脱敏结果。</p></details><details><summary>批量导入中有文件失败怎么办？</summary><p>已成功的文件会保留，重试只处理未成功的文件。如果连接中断，先检查候选人列表，避免重复导入。导入过程中请留在当前页面。</p></details><details><summary>为什么报告下载的是 ZIP？</summary><p>ZIP 内包含同一版本的 PDF 与 Markdown，一次下载即可保存两种格式。展开报告后也可以点击「仅 PDF」或「仅 Markdown」。</p></details><details><summary>怎样回到首页？</summary><p>点击左上角「面」标志或产品名称即可返回首页。侧栏的「工作台」用于返回候选人列表。</p></details></section>
</div>;}
