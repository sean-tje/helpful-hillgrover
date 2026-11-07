// Word files for the student brief (on the school letterhead from the PG template) and the
// all-staff VCT notice (the school's 4-column notice table).
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import {
  AlignmentType, BorderStyle, Document, Packer, PageOrientation, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';
import { withAnnexA } from './src/briefText';
import { VCT_ATTENTION, VCT_BLUE, VCT_RED, formatVctDetails } from './src/vctFormat';

const LETTERHEAD_PATH = path.join(process.cwd(), 'templates', 'PG_Template.docx');
const MAX_TEXT = 20000;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const paragraphXml = (text: string, opts: { bold?: boolean; right?: boolean } = {}) => {
  const font = '<w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
  const rPr = `<w:rPr>${font}${opts.bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>`;
  const pPr = `<w:pPr><w:spacing w:after="60"/>${opts.right ? '<w:jc w:val="right"/>' : ''}${rPr}</w:pPr>`;
  return text
    ? `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
    : `<w:p>${pPr}</w:p>`;
};

// A heading is a short line ending in a colon, a numbered section title, or an all-capitals line
const isHeading = (line: string) =>
  line.length < 80 && (/:$/.test(line) || /^\d+\.\s+[^:]+:$/.test(line) || (/[A-Z]/.test(line) && line === line.toUpperCase()));

// The PG template keeps its letterhead (header with the school crest, and footer); the body
// is replaced with the brief, with "Annex A" at the top right
export const renderBriefDocx = (text: string): Buffer => {
  const lines = withAnnexA(String(text ?? '').replace(/\*/g, '').slice(0, MAX_TEXT)).split('\n').map(l => l.trimEnd());
  const zip = new PizZip(fs.readFileSync(LETTERHEAD_PATH));
  const xml = zip.file('word/document.xml')!.asText();
  const bodyStart = xml.indexOf('<w:body>') + '<w:body>'.length;
  const sectStart = xml.lastIndexOf('<w:sectPr');
  let titleDone = false;
  const body = lines.map((line, i) => {
    if (i === 0) return paragraphXml(line, { bold: true, right: true });
    const trimmed = line.trim();
    if (!trimmed) return paragraphXml('');
    if (!titleDone) {
      titleDone = true;
      return paragraphXml(trimmed, { bold: true });
    }
    return paragraphXml(line, { bold: isHeading(trimmed) });
  }).join('');
  zip.file('word/document.xml', xml.slice(0, bodyStart) + body + xml.slice(sectStart));
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const FONT = 'Arial';
const SIZE = 20;

const plainCell = (text: string, width: number, opts: { bold?: boolean; fill?: string; center?: boolean } = {}) =>
  new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : undefined,
      children: [new TextRun({ text, font: FONT, size: SIZE, bold: opts.bold })],
    })],
  });

export const renderVctDocx = async (input: { noticeBy?: string; details?: string; attention?: string }): Promise<Buffer> => {
  const details = String(input.details ?? '').replace(/\*/g, '').slice(0, MAX_TEXT);
  const widths = [700, 2200, 9300, 2200];
  const detailParagraphs = formatVctDetails(details).map(runs => new Paragraph({
    spacing: { after: 40 },
    children: runs.map(run => new TextRun({
      text: run.text,
      font: FONT,
      size: SIZE,
      bold: run.bold,
      underline: run.underline ? {} : undefined,
      color: run.color === 'blue' ? VCT_BLUE : run.color === 'red' ? VCT_RED : undefined,
    })),
  }));
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['S/N', 'Notice by', 'VCT Details', 'For attention by'].map((t, i) => plainCell(t, widths[i], { bold: true, fill: 'D9D9D9', center: true })),
      }),
      new TableRow({
        children: [
          plainCell('', widths[0]),
          plainCell(String(input.noticeBy ?? '').slice(0, 300), widths[1]),
          new TableCell({ borders, width: { size: widths[2], type: WidthType.DXA }, children: detailParagraphs }),
          plainCell(String(input.attention || VCT_ATTENTION).slice(0, 100), widths[3]),
        ],
      }),
    ],
  });
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: [table],
    }],
  });
  return Packer.toBuffer(doc);
};
