"""Decision-first report using saved evidence, without inventing a hiring verdict."""
from .interview_service import cumulative_claim_states

SKIPPED = "面试官选择跳过此题，未提问。"


def brief(text, limit=160):
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[:limit] + "…"


def build_report(session, evidence_report, note="", manual=None):
    plan = session["generation"]["output"]
    answered = [t for t in session["turns"] if t["answer"].strip() and t["answer"].strip() != SKIPPED]
    assessed = [t for t in answered if t["question"].get("kind") != "opening"]
    states = cumulative_claim_states(plan, assessed, None)
    missing = {q["question"]:q for q in plan["questions"] if q["question"] not in {t["question"]["question"] for t in answered}}
    for t in session["turns"]:
        if t["answer"].strip() == SKIPPED:
            missing[t["question"]["question"]] = t["question"]
    candidate = session["candidate"]
    missing_jd = "从工作台快速上传简历自动创建的默认项目。" in session["generation"]["input"]["project"]
    rows = []
    for cap in plan["capabilities"]:
        name = cap["name"]
        turns = [t for t in assessed if t["question"]["capability"] == name]
        indices = [i for i,c in enumerate(plan["claims"]) if c["capability"] == name]
        values = [states.get(str(i), "UNKNOWN") for i in indices]
        if not turns:
            label = "尚未评估"
        elif "CONTRADICTED" in values:
            label = "存在矛盾，需复核"
        elif values and all(v == "SUPPORTED" for v in values):
            label = "回答提供支持"
        elif any(v in {"SUPPORTED", "PARTIALLY_SUPPORTED"} for v in values):
            label = "部分支持，需补证"
        else:
            label = "已交流，证据不足"
        evidence = []
        for t in turns:
            for update in t["analysis"]["updates"]:
                if update["claim_index"] in indices and update.get("answer_quote"):
                    evidence.append(update["answer_quote"])
        quote = brief(evidence[-1] if evidence else turns[-1]["answer"]) if turns else "本次未获得有效回答，不作为能力不足的依据。"
        rows.append((cap, label, quote))
    supported = [cap["name"] for cap,label,_ in rows if label == "回答提供支持"]
    partial = [cap["name"] for cap,label,_ in rows if label == "部分支持，需补证"]
    conflicts = [cap["name"] for cap,label,_ in rows if label == "存在矛盾，需复核"]
    unassessed = [cap["name"] for cap,label,_ in rows if label == "尚未评估"]
    if missing_jd:
        conclusion = "尚未填写具体岗位要求，当前只能整理已体现的能力，暂不能判断是否符合本单位要求。请补充岗位 JD 后复核。"
    elif not assessed:
        conclusion = "有效能力回答不足，暂不能判断是否符合岗位要求。"
    elif conflicts:
        conclusion = "部分回答与简历声明存在矛盾，建议先核实，再判断岗位匹配。"
    elif unassessed or partial or len(supported) < len(rows) or not rows:
        conclusion = "岗位匹配证据尚不完整，建议针对下方待补证项继续核实。"
    else:
        conclusion = "已评估的岗位要求均有回答证据支持，可供面试官进一步复核匹配情况。"
    lines = ["# 候选人面试简报", f"候选人：{candidate['name']} | 应聘岗位：{candidate['role']}", "## 岗位匹配结论", conclusion]
    if supported: lines += ["回答支持的能力：" + "、".join(supported) + "。"]
    if partial: lines += ["已体现部分能力、仍需补证：" + "、".join(partial) + "。"]
    lines += ["判断依据：本次提纲提取的岗位要求与实际回答；未评估不等于不符合，最终录用由面试官决定。"]
    if note.strip(): lines += ["## 面试官意见", note.strip()]
    lines += ["## 能力与岗位要求对照"]
    for cap,label,quote in rows:
        if label == "尚未评估": continue
        lines += [f"### {cap['name']} · {label}", "岗位要求：" + ("尚未填写具体岗位要求" if missing_jd else brief(cap.get("requirement_quote") or cap.get("reason", "未明确"))), "回答依据：" + quote]
    if not assessed: lines += ["暂无可用于能力判断的有效回答。"]
    lines += ["## 建议补充核实"]
    issues = []
    for i, claim in enumerate(plan["claims"]):
        if states.get(str(i), "UNKNOWN") in {"CONTRADICTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE"}:
            issues.append(brief(claim["verification"]))
    if issues: lines += ["；".join(list(dict.fromkeys(issues))[:3]) + "。"]
    elif not unassessed: lines += ["结合原文证据及面试官意见完成复核。"]
    if unassessed: lines += ["尚未评估的岗位能力：" + "、".join(unassessed) + "。"]
    if missing:
        topics = list(dict.fromkeys(q["capability"] for q in missing.values()))
        lines += [f"未获得有效回答的问题共 {len(missing)} 道（含跳过及未问），不计入能力判断。" + ("" if unassessed else "涉及：" + "、".join(topics) + "。")]
    # Detailed sources remain available but do not crowd the reading view.
    clean = {**session, "turns": answered, "claim_states": states,
             "coverage": {c["name"]:sum(t["question"]["capability"] == c["name"] for t in assessed) for c in plan["capabilities"]}}
    detail = evidence_report(clean)
    sections = detail.split("\n\n## ")[1:]
    deferred = []
    for section in sections:
        title, _, body = section.partition("\n\n")
        if title in {"能力覆盖", "提纲选定的 Skill 快照"}:
            deferred.append((title,body))
        else:
            lines += ["## 附录 · " + title, body]
    if manual:
        lines += ["## 附录 · 手动问答（面试官记录，未经模型分析）"]
        for i,item in enumerate(manual):
            lines += [f"### 手动问题 {i+1}", item.get("q", ""), "回答：" + item.get("a", "")]
    lines += ["## 附录 · 能力覆盖与生成信息"]
    for title, body in deferred: lines += ["### " + title, body]
    gen = session["generation"]
    lines += [f"面试 #{session['id']} | 提纲 #{gen['id']} | 简历 #{gen['resume_id']}", f"模型：{gen['input']['provider']} / {gen['input']['model']} | 提示词：{gen['input']['prompt_version']}"]
    return "\n\n".join(line for line in lines if line)
