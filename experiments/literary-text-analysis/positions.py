"""Map normalized TXT paragraph coordinates back to original CRLF/UTF-8 source."""
from pathlib import Path

from common import SCHEMA, digest, enforce_private_output, write


def export_positions(document, output):
    enforce_private_output(output, document['source_kind'])
    source = Path(document['source'])
    if digest(source) != document['source_sha256']:
        raise ValueError('Source changed since parsing; cannot construct original positions')
    entries = []
    if source.suffix.lower() == '.txt':
        data = source.read_bytes()
        raw = data.decode('utf-8-sig')
        # pathlib's universal newline reader normalizes CRLF and CR to LF.
        boundaries, chars, index = [0], [], 0
        while index < len(raw):
            char = raw[index]
            if char == '\r':
                index += 2 if raw[index:index+2] == '\r\n' else 1
                chars.append('\n')
            else:
                index += 1
                chars.append(char)
            boundaries.append(index)
        normalized = ''.join(chars)
        byte_offsets = [3 if data.startswith(b'\xef\xbb\xbf') else 0]
        for char in raw:
            byte_offsets.append(byte_offsets[-1] + len(char.encode('utf-8')))
        for paragraph in document['paragraphs']:
            start, end = paragraph['origin']['char_start'], paragraph['origin']['char_end']
            if normalized[start:end] != paragraph['text']:
                raise ValueError('Normalized source no longer matches parsed paragraph')
            original_start, original_end = boundaries[start], boundaries[end]
            entries.append({'paragraph_id':paragraph['id'], 'raw_char_start':original_start,
                'raw_char_end':original_end,'raw_byte_start':byte_offsets[original_start],
                'raw_byte_end':byte_offsets[original_end],
                'paragraph_boundary_to_raw_char':boundaries[start:end+1]})
    else:
        entries = [{'paragraph_id':p['id'],'origin':p['origin']} for p in document['paragraphs']]
    write(output, {'schema_version':SCHEMA,'model':None,'checkpoint_revision':None,
          'producer':'source_coordinate_mapper','processing':'structural origins plus explicit original TXT newline/UTF-8 mapping',
          'source_sha256':document['source_sha256'],'raw_char_convention':'Unicode source content after optional BOM; end exclusive',
          'raw_byte_convention':'UTF-8 bytes including optional BOM; end exclusive', 'paragraphs':entries})
