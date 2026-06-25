from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
import re

_NOTE_ALLOWED_TAGS = frozenset({
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li', 'blockquote', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'code',
})
_NOTE_ALLOWED_ATTRS = {'a': {'href', 'title'}}
_SAFE_HREF_SCHEMES = frozenset({'http', 'https', 'mailto', ''})


class AdminNoteHTMLCleaner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in {'script', 'style'}:
            self.skip_depth += 1
            return
        if self.skip_depth or tag not in _NOTE_ALLOWED_TAGS:
            return

        cleaned_attrs = []
        for name, value in attrs:
            name = name.lower()
            if name not in _NOTE_ALLOWED_ATTRS.get(tag, set()) or value is None:
                continue
            if name == 'href':
                # Strip control characters before parsing to prevent scheme-bypass via \x00 etc.
                normalized = re.sub(r'[\x00-\x20]+', '', value)
                scheme = urlparse(normalized).scheme.lower()
                if scheme not in _SAFE_HREF_SCHEMES:
                    continue
            cleaned_attrs.append(f'{name}="{escape(value, quote=True)}"')

        suffix = f" {' '.join(cleaned_attrs)}" if cleaned_attrs else ''
        self.parts.append(f'<{tag}{suffix}>')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in {'script', 'style'} and self.skip_depth:
            self.skip_depth -= 1
            return
        if self.skip_depth or tag not in _NOTE_ALLOWED_TAGS or tag == 'br':
            return
        self.parts.append(f'</{tag}>')

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(escape(data))

    def handle_entityref(self, name):
        if not self.skip_depth:
            self.parts.append(f'&{name};')

    def handle_charref(self, name):
        if not self.skip_depth:
            self.parts.append(f'&#{name};')


def clean_admin_note_html(html):
    if not html:
        return ''
    cleaner = AdminNoteHTMLCleaner()
    cleaner.feed(html)
    cleaner.close()
    return ''.join(cleaner.parts)
