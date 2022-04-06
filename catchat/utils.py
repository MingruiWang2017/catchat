from bleach import clean, linkify
from flask import flash
from markdown import markdown


def to_html(raw):
    """raw： Markdown文本，
    将Markdown文本转换为HTML文本，并对其中的元素进行清理，以避免风险"""
    allowed_tags = ['a', 'abbr', 'b', 'br', 'blockquote', 'code',
                    'del', 'div', 'em', 'img', 'p', 'pre', 'strong',
                    'span', 'ul', 'li', 'ol']
    allowed_attributes = ['src', 'title', 'alt', 'href', 'class']
    # 将Markdown转为html, 使用代码高亮扩展codehilite和代码块扩展fenced_code美化代码片段
    html = markdown(raw, output_format='html',
                    extensions=['markdown.extensions.fenced_code',
                                'markdown.extensions.codehilite'])
    clean_html = clean(html, tags=allowed_tags, attributes=allowed_attributes)  # 清洗HTML
    return linkify(clean_html)  # 将HTML文本中的url转换为<a>包裹的链接


def flash_errors(form):
    for field, errors in form.errors.items():
        for error in errors:
            flash('Error in the %s field - %s' % (
                getattr(form, field).label.text, error))
