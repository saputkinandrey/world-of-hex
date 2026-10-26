"""Author paragraphs first; technical model windows are created elsewhere."""
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile
from html.parser import HTMLParser
from pathlib import Path

from common import SCHEMA, digest, fingerprint, write, enforce_private_output


def local(tag):
    return tag.rsplit('}', 1)[-1]


def paragraph_type(text):
    if re.match(r'^\s*[\u2014\u2013]', text):
        return 'dialogue'
    if re.search(r'["\u201c\u00ab].+?["\u201d\u00bb]', text):
        return 'mixed'
    return 'narration'


def dialogue_spans(text):
    spans = [{'start': m.start(), 'end': m.end(), 'text': m.group()}
             for m in re.finditer(r'"[^"\n]+"|\u201c[^\u201d]+\u201d|\u00ab[^\u00bb]+\u00bb', text)]
    if not spans and paragraph_type(text) == 'dialogue':
        spans = [{'start': 0, 'end': len(text), 'text': text}]
    return spans


def fb2_blocks(path):
    root = ET.fromstring(Path(path).read_bytes())
    sections, blocks = [], []

    def visit(element, location, section):
        tag = local(element.tag)
        if tag == 'section':
            title = next((' '.join(''.join(c.itertext()).split()) for c in element
                          if local(c.tag) == 'title'), '')
            section = f's{len(sections):03d}'
            sections.append({'id': section, 'title': title, 'origin': location})
        if tag in {'p', 'v', 'subtitle', 'text-author'}:
            text = ''.join(element.itertext()).strip()
            if text:
                blocks.append((section, text, {'xml_path': location, 'element_id': element.get('id')}, tag))
            return
        if tag in {'title', 'annotation', 'binary', 'description'}:
            return
        for index, child in enumerate(element):
            visit(child, f'{location}/{local(child.tag)}[{index}]', section)

    for index, body in enumerate(c for c in root if local(c.tag) == 'body' and c.get('name') != 'notes'):
        sid = f's{len(sections):03d}'
        sections.append({'id': sid, 'title': body.get('name', ''), 'origin': f'body[{index}]'})
        visit(body, f'body[{index}]', sid)
    return sections, blocks


class ParagraphHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.frames = []
        self.blocks = []
        self.skip = 0

    def flush(self, frame):
        text = ''.join(frame['chunks']).strip()
        if text:
            self.blocks.append((text, {'block_index': len(self.blocks), 'element_id': frame['id']}, frame['tag']))
        frame['chunks'] = []

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style'}:
            self.skip += 1
        if tag in {'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}:
            if self.frames:
                self.flush(self.frames[-1])
            self.frames.append({'tag': tag, 'chunks': [], 'id': dict(attrs).get('id')})
        if tag == 'br' and self.frames:
            self.frames[-1]['chunks'].append('\n')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in {'br', 'img', 'hr', 'meta', 'link', 'input', 'wbr'}:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in {'script', 'style'}:
            self.skip = max(0, self.skip - 1)
        if self.frames and tag == self.frames[-1]['tag']:
            self.flush(self.frames.pop())

    def handle_data(self, data):
        if self.frames and not self.skip:
            self.frames[-1]['chunks'].append(data)


def epub_blocks(path):
    sections, blocks = [], []
    with zipfile.ZipFile(path) as archive:
        container = ET.fromstring(archive.read('META-INF/container.xml'))
        opf = next(e.get('full-path') for e in container.iter() if local(e.tag) == 'rootfile')
        package = ET.fromstring(archive.read(opf))
        manifest = {e.get('id'): e.get('href') for e in package.iter() if local(e.tag) == 'item'}
        from urllib.parse import unquote
        spine = [posixpath.normpath(posixpath.join(posixpath.dirname(opf), unquote(manifest[e.get('idref')].split('#')[0])))
                 for e in package.iter() if local(e.tag) == 'itemref' and e.get('linear', 'yes') != 'no']
        if 'META-INF/encryption.xml' in archive.namelist():
            encryption = ET.fromstring(archive.read('META-INF/encryption.xml'))
            encrypted = {e.get('URI') for e in encryption.iter() if local(e.tag) == 'CipherReference'}
            if encrypted.intersection(spine):
                raise ValueError('Encrypted EPUB text is unsupported; DRM is not bypassed')
        for index, member in enumerate(spine):
            parser = ParagraphHTML()
            parser.feed(archive.read(member).decode('utf-8-sig'))
            parser.close()
            if parser.frames:
                raise ValueError(f'Unclosed author paragraph in EPUB member: {member}')
            sid = f's{len(sections):03d}'
            sections.append({'id': sid, 'title': member, 'origin': member})
            for text, origin, tag in parser.blocks:
                if tag.startswith('h'):
                    sid = f's{len(sections):03d}'
                    sections.append({'id': sid, 'title': text, 'origin': {'member': member, **origin}, 'heading_level': int(tag[1])})
                else:
                    blocks.append((sid, text, {'member': member, **origin}, tag))
    return sections, blocks


def txt_blocks(path):
    text = Path(path).read_text(encoding='utf-8-sig')
    # A single newline remains inside a paragraph. Blank lines delimit paragraphs.
    blocks = []
    for match in re.finditer(r'\S[\s\S]*?(?=\n[ \t]*\n|\Z)', text):
        value = match.group().rstrip()
        blocks.append(('s000', value, {'char_start': match.start(), 'char_end': match.start() + len(value)}, 'text'))
    return [{'id': 's000', 'title': Path(path).stem, 'origin': 'text'}], blocks


def parse_document(path, language, output, source_kind='local_book'):
    path, output = Path(path).resolve(), Path(output)
    enforce_private_output(output, source_kind)
    if output.exists():
        raise FileExistsError(f'Will not overwrite document: {output}')
    suffix = path.suffix.lower()
    loaders = {'.txt': txt_blocks, '.fb2': fb2_blocks, '.epub': epub_blocks}
    if suffix not in loaders:
        raise ValueError('Supported local formats: TXT (UTF-8, blank-line paragraphs), FB2, EPUB')
    sections, blocks = loaders[suffix](path)
    if not blocks:
        raise ValueError('No author paragraphs found; unsupported document structure')
    source_hash = digest(path)
    paragraphs = []
    for index, (sid, text, origin, tag) in enumerate(blocks):
        paragraphs.append({'id': f'p{index:05d}-{fingerprint([source_hash, origin])[:8]}',
                           'section_id': sid, 'ordinal': index, 'text': text,
                           'origin': origin, 'element_type': tag, 'type': paragraph_type(text),
                           'dialogue_spans': dialogue_spans(text)})
    document = {'schema_version': SCHEMA, 'producer': 'structural_parser', 'model': None,
                'checkpoint_revision': None, 'processing': {'paragraph_policy': 'author_blocks', 'format': suffix},
                'source': str(path), 'source_sha256': source_hash, 'source_kind': source_kind,
                'language': language, 'sections': sections, 'paragraphs': paragraphs,
                'offset_convention': 'Unicode code points; spans are paragraph-local, end-exclusive; origin locates document block'}
    write(output, document)
    return document
