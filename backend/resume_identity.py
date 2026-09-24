"""Conservative local identity extraction; unknown names never block import."""
import re
from pathlib import Path

STOP = {"个人简历", "工作经历", "教育经历", "项目经历", "基本信息", "个人信息", "求职意向", "专业技能", "自我评价", "联系方式", "简历", "姓名", "教育背景", "工作经验"}


def valid_name(value):
    return bool(re.fullmatch(r"[一-龥·]{2,6}", value)) and value not in STOP


def identify(text, filename):
    explicit = re.search(r"姓\s*名\s*[:：]\s*([一-龥·]{2,6})(?=\s|$|[，,。;；|/])", text[:4000])
    stem = Path(filename).stem
    cleaned = re.sub(r"【[^】]*】|\[[^\]]*\]", " ", stem).strip()
    cleaned = re.sub(r"[（(]\d+[）)]$", "", cleaned).strip()
    matched = re.match(r"^([一-龥·]{2,6})(?=\s|\d|$|[_-])", cleaned)
    name = explicit.group(1) if explicit and valid_name(explicit.group(1)) else ""
    source = "简历正文" if name else ""
    if not name and matched and valid_name(matched.group(1)):
        name, source = matched.group(1), "文件名"
    if not name:
        for line in text.splitlines()[:8]:
            value = line.strip()
            if valid_name(value):
                name, source = value, "简历正文"
                break
    role_match = re.search(r"[【\[]([^】\]]+)[】\]]", stem)
    role = role_match.group(1).split("_")[0].strip()[:200] if role_match else ""
    return name, role, source
