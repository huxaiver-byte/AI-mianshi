"""Local PDF export. User/model text is escaped before HTML layout."""
from html import escape
import io
import pymupdf as fitz


def render_pdf(markdown: str) -> bytes:
    blocks = []
    appendix = False
    for block in markdown.split("\n\n"):
        tag = "p"
        for prefix, heading in (("### ", "h3"), ("## ", "h2"), ("# ", "h1")):
            if block.startswith(prefix):
                block, tag = block[len(prefix):], heading
                break
        attrs = ""
        if tag == "h2" and block.startswith("附录 · "):
            if not appendix:
                attrs = ' style="page-break-before: always"'
                appendix = True
            block = block.replace("附录 · ", "附录：", 1)
        blocks.append(f"<{tag}{attrs}>" + escape(block).replace("\n", "<br/>") + f"</{tag}>")
    css = """
    body { font-family: sans-serif; font-size: 10pt; line-height: 1.65; color: #252a34; }
    h1 { font-size: 25pt; color: #163e70; margin-bottom: 20pt; }
    h2 { font-size: 15pt; color: #163e70; margin-top: 22pt; border-bottom: 1px solid #dce4ed; padding-bottom: 6pt; }
    h3 { font-size: 11pt; margin-top: 15pt; color: #334b65; }
    p { margin: 7pt 0; overflow-wrap: anywhere; }
    """
    story = fitz.Story(html="<html><body>" + "".join(blocks) + "</body></html>", user_css=css)
    buffer = io.BytesIO()
    writer = fitz.DocumentWriter(buffer)
    rect = fitz.paper_rect("a4")
    content = fitz.Rect(46, 50, rect.width - 46, rect.height - 48)
    more = True
    while more:
        device = writer.begin_page(rect)
        more, _ = story.place(content)
        story.draw(device)
        writer.end_page()
    writer.close()
    doc = fitz.open(stream=buffer.getvalue(), filetype="pdf")
    for i, page in enumerate(doc):
        page.insert_text((46, rect.height - 25), f"INTERVIEW OS  |  {i+1} / {len(doc)}", fontsize=8, color=(.45,.48,.53))
    result = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return result
