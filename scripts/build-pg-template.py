"""Turn the school's Parents Gateway Word template into a fillable template.

The school's template (templates/PG_Template.docx) marks fields as <<like this>>.
This script swaps each one for a named docxtemplater tag such as {eventName},
keeping all of Word's formatting, and writes templates/pg-letter-template.docx,
which the server fills in. Re-run it whenever the school's template changes:

    python3 scripts/build-pg-template.py templates/PG_Template.docx templates/pg-letter-template.docx

Fields are matched by their text, in the order they appear in the letter.
"""
import re
import shutil
import sys
import tempfile
import zipfile

# Placeholder text (between << and >>) -> tag, in document order.
# "date" appears twice: first the letter date, then the event date.
FIELD_TAGS = [
    ('year', '{year}'),
    ('reference number', '{referenceNumber}'),
    ('date', '{letterDate}'),
    ('subject', '{subject}'),
    ('Event Name', '{eventName}'),
    ('date', '{eventDate}'),
    ('reporting time', '{reportingTime}'),
    ('reporting venue', '{reportingVenue}'),
    ('dismissal time', '{dismissalTime}'),
    ('dismissal venue', '{dismissalVenue}'),
    ('attire, usually School PE t-shirt or polo shirt or Full School Uniform', '{attire}'),
    # The Transportation row is removed when there is no transport (see below)
    ('transportation details, if necessary', '{transportation}{/hasTransport}'),
    # The middle paragraph is repeated once per objective; the outer two only hold the loop
    ('objective 1', '{#objectives}'),
    ('objective 2', '{.}'),
    ('objective 3', '{/objectives}'),
    # " the school <<...>> at 6560 3726": the clause carries its own leading space
    ('or specific teachers’ name(s)', '{contactClause}'),
]

PARAGRAPH_RE = re.compile(r'<w:p[ >].*?</w:p>', re.S)
RUN_RE = re.compile(r'<w:r[ >].*?</w:r>', re.S)
TEXT_RE = re.compile(r'(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)')
PLACEHOLDER_RE = re.compile(r'&lt;&lt;(.*?)&gt;&gt;')


def unescape(text):
    return text.replace('&amp;', '&')


def convert_paragraph(paragraph, fields):
    """Replace the placeholders in one paragraph."""
    runs = list(RUN_RE.finditer(paragraph))
    texts = []
    for run in runs:
        match = TEXT_RE.search(run.group(0))
        texts.append(match.group(2) if match else '')

    joined = ''.join(texts)
    placeholders = list(PLACEHOLDER_RE.finditer(joined))
    if not placeholders:
        return paragraph

    # Which run owns each character of the joined text
    owners = [i for i, text in enumerate(texts) for _ in text]
    pieces = [''] * len(runs)
    tagged_runs = set()
    position = 0
    for placeholder in placeholders:
        for index in range(position, placeholder.start()):
            pieces[owners[index]] += joined[index]
        expected, tag = fields.pop(0)
        found = unescape(placeholder.group(1)).strip()
        if found != expected:
            raise SystemExit(f'Template changed: expected <<{expected}>>, found <<{found}>>')
        pieces[owners[placeholder.start()]] += tag
        tagged_runs.add(owners[placeholder.start()])
        position = placeholder.end()
    for index in range(position, len(joined)):
        pieces[owners[index]] += joined[index]

    # Rebuild the runs, dropping the red colour used to highlight placeholders
    output = []
    last = 0
    for i, run in enumerate(runs):
        output.append(paragraph[last:run.start()])
        xml = run.group(0)
        if TEXT_RE.search(xml):
            xml = TEXT_RE.sub(lambda m: '<w:t xml:space="preserve">' + pieces[i].replace('\\', '\\\\') + m.group(3), xml, count=1)
            if i in tagged_runs:
                xml = re.sub(r'<w:color [^>]*/>', '', xml)
        output.append(xml)
        last = run.end()
    output.append(paragraph[last:])
    return ''.join(output).replace(' the school {contactClause}', ' the school{contactClause}')


def convert_document(xml):
    fields = list(FIELD_TAGS)
    output = []
    last = 0
    for match in PARAGRAPH_RE.finditer(xml):
        output.append(xml[last:match.start()])
        paragraph = match.group(0)
        if re.search(r'<w:t[^>]*>Transportation</w:t>', paragraph):
            paragraph = re.sub(r'(<w:t[^>]*>)Transportation(</w:t>)', r'\1{#hasTransport}Transportation\2', paragraph)
        output.append(convert_paragraph(paragraph, fields))
        last = match.end()
    output.append(xml[last:])
    if fields:
        raise SystemExit(f'Template changed: placeholders not found: {[f for f, _ in fields]}')
    return ''.join(output)


def main(source, destination):
    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
        temp_path = tmp.name
    with zipfile.ZipFile(source) as zin, zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                data = convert_document(data.decode('utf-8')).encode('utf-8')
            zout.writestr(item, data)
    shutil.move(temp_path, destination)
    print(f'Wrote {destination}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
