"""Turn the school's student brief (templates/Student_Brief.docx) into a fillable template.

Each value in the brief's table is swapped for a {{marker}} that the server fills in
(briefVct.ts), keeping Word's formatting: one bullet paragraph for the items to bring and
one paragraph for the reminders, which the server repeats per item. Writes
templates/student-brief-template.docx. Re-run it whenever the school's brief changes:

    python3 scripts/build-brief-template.py templates/Student_Brief.docx templates/student-brief-template.docx

Values are found by the label in the left column of their row.
"""
import re
import shutil
import sys
import tempfile
import zipfile

src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(src) as z:
    xml = z.read('word/document.xml').decode('utf8')

def text_of(p):
    return ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))

def rows(x):
    return list(re.finditer(r'<w:tr[ >](?:(?!<w:tr[ >]).)*?</w:tr>', x, re.S))

def paragraphs(x):
    return list(re.finditer(r'<w:p[ >](?:(?!<w:p[ >]).)*?</w:p>', x, re.S))

def single_run(p, marker):
    """Keep the paragraph's properties and first run's formatting, with one run of marker."""
    ppr = re.search(r'<w:pPr>.*?</w:pPr>', p, re.S)
    rpr = re.search(r'<w:r[ >].*?(<w:rPr>.*?</w:rPr>)', p, re.S)
    start = re.match(r'<w:p[^>]*>', p).group(0)
    return f'{start}{ppr.group(0) if ppr else ""}<w:r>{rpr.group(1) if rpr else ""}<w:t xml:space="preserve">{marker}</w:t></w:r></w:p>'

VALUES = {
    'Title of activity:': '{{title}}',
    'Date:': '{{date}}',
    'Reporting Venue:': '{{reportingVenue}}',
    'Reporting Time:': '{{reportingTime}}',
    'Dismissal Venue:': '{{dismissalVenue}}',
    'Dismissal Time:': '{{dismissalTime}}',
    'Attire:': '{{attire}}',
}

done = set()
for m in reversed(rows(xml)):
    row = m.group(0)
    cells = re.findall(r'<w:tc>.*?</w:tc>', row, re.S)
    if len(cells) != 2 or '<w:tbl>' in row:
        continue
    label = text_of(cells[0]).strip()
    value_cell = cells[1]
    paras = [p.group(0) for p in paragraphs(value_cell)]
    head = value_cell[:value_cell.index(paras[0])]
    tail = value_cell[value_cell.rindex(paras[-1]) + len(paras[-1]):]
    if label.rstrip() in VALUES or label in VALUES:
        key = label if label in VALUES else label.rstrip()
        new_cell = head + single_run(paras[0], VALUES[key]) + tail
    elif label.startswith('Items to bring'):
        key = label
        new_cell = head + single_run(paras[0], '{{item}}') + tail
    elif label.startswith('Reminders'):
        key = label
        p = paras[0]
        runs = re.findall(r'<w:r[ >].*?</w:r>', p, re.S)
        bold_rpr = re.search(r'<w:rPr>.*?</w:rPr>', runs[0], re.S).group(0)
        plain_rpr = re.search(r'<w:rPr>.*?</w:rPr>', runs[1], re.S).group(0)
        start = re.match(r'<w:p[^>]*>', p).group(0)
        ppr = re.search(r'<w:pPr>.*?</w:pPr>', p, re.S).group(0)
        reminder = (f'{start}{ppr}<w:r>{bold_rpr}<w:t xml:space="preserve">{{{{reminderName}}}}</w:t></w:r>'
                    f'<w:r>{plain_rpr}<w:t xml:space="preserve">{{{{reminderText}}}}</w:t></w:r></w:p>')
        new_cell = head + reminder + tail
    else:
        continue
    done.add(key)
    new_row = row.replace(value_cell, new_cell)
    xml = xml[:m.start()] + new_row + xml[m.end():]

missing = set(VALUES) - {k.rstrip() for k in done} - done
assert not missing, f'labels not found: {missing}'
assert '{{item}}' in xml and '{{reminderName}}' in xml

tmp = tempfile.mktemp(suffix='.docx')
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'word/document.xml':
            data = xml.encode('utf8')
        zout.writestr(item, data)
shutil.move(tmp, dst)
print('wrote', dst)
