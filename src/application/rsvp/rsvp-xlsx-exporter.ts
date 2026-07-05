import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';

interface XlsxFile {
  name: string;
  data: Buffer;
}

interface XlsxColumn {
  header: string;
  width: number;
  value: (entry: RsvpEntry) => string;
}

const columns: XlsxColumn[] = [
  {
    header: 'Дата отправки',
    width: 22,
    value: (entry) => formatDate(entry.createdAt),
  },
  { header: 'Имя и фамилия', width: 28, value: (entry) => entry.fullName },
  { header: 'Телефон', width: 18, value: (entry) => entry.phone ?? '' },
  {
    header: 'Статус',
    width: 18,
    value: (entry) => (entry.attending ? 'Придет' : 'Не сможет'),
  },
  {
    header: 'Гостей',
    width: 10,
    value: (entry) => (entry.guestsCount ? String(entry.guestsCount) : ''),
  },
  {
    header: 'С парой',
    width: 12,
    value: (entry) => formatBoolean(entry.plusOne),
  },
  {
    header: 'Партнер',
    width: 28,
    value: (entry) => entry.partnerName ?? '',
  },
  {
    header: 'Второй день',
    width: 14,
    value: (entry) => formatBoolean(entry.secondDay),
  },
  {
    header: 'С детьми',
    width: 12,
    value: (entry) => formatBoolean(entry.withChildren),
  },
  {
    header: 'Дети',
    width: 32,
    value: (entry) => entry.childrenDetails ?? '',
  },
  {
    header: 'Напитки',
    width: 36,
    value: (entry) => entry.drinks?.join(', ') ?? '',
  },
  {
    header: 'Аллергия',
    width: 32,
    value: (entry) => entry.allergyDetails ?? '',
  },
  {
    header: 'Комментарий',
    width: 40,
    value: (entry) => entry.message ?? '',
  },
  { header: 'ID', width: 28, value: (entry) => entry.id ?? '' },
];

const crcTable = createCrcTable();

export function buildRsvpXlsx(entries: RsvpEntry[]): Buffer {
  const rows = [
    columns.map((column) => column.header),
    ...entries.map((entry) => columns.map((column) => column.value(entry))),
  ];

  return createZip([
    xmlFile('[Content_Types].xml', buildContentTypesXml()),
    xmlFile('_rels/.rels', buildRootRelationshipsXml()),
    xmlFile('xl/workbook.xml', buildWorkbookXml()),
    xmlFile('xl/_rels/workbook.xml.rels', buildWorkbookRelationshipsXml()),
    xmlFile('xl/worksheets/sheet1.xml', buildSheetXml(rows)),
  ]);
}

function buildContentTypesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
    '</Types>',
  ].join('');
}

function buildRootRelationshipsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
    '</Relationships>',
  ].join('');
}

function buildWorkbookXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheets>',
    '<sheet name="Заявки" sheetId="1" r:id="rId1"/>',
    '</sheets>',
    '</workbook>',
  ].join('');
}

function buildWorkbookRelationshipsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
    '</Relationships>',
  ].join('');
}

function buildSheetXml(rows: string[][]): string {
  const dimension = `A1:${columnName(columns.length)}${rows.length}`;
  const cols = columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`,
    )
    .join('');
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) =>
            buildCell(rowIndex + 1, columnIndex + 1, value),
          )
          .join('')}</row>`,
    )
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<dimension ref="${dimension}"/>`,
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>',
    `<cols>${cols}</cols>`,
    `<sheetData>${sheetRows}</sheetData>`,
    '</worksheet>',
  ].join('');
}

function buildCell(row: number, column: number, value: string): string {
  const ref = `${columnName(column)}${row}`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function columnName(index: number): string {
  let name = '';
  let current = index;

  while (current > 0) {
    current -= 1;
    name = String.fromCharCode(65 + (current % 26)) + name;
    current = Math.floor(current / 26);
  }

  return name;
}

function formatBoolean(value: boolean | null): string {
  if (value === null) return '';
  return value ? 'Да' : 'Нет';
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function escapeXml(value: string): string {
  return removeInvalidXmlChars(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function removeInvalidXmlChars(value: string): string {
  return [...value]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join('');
}

function xmlFile(name: string, xml: string): XlsxFile {
  return { name, data: Buffer.from(xml, 'utf8') };
}

function createZip(files: XlsxFile[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  files.forEach((file) => {
    const fileName = Buffer.from(file.name, 'utf8');
    const crc = crc32(file.data);
    const { dosDate, dosTime } = getDosDateTime();
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.data.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, fileName, file.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(file.data.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, fileName);

    offset += localHeader.length + fileName.length + file.data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function getDosDateTime(): { dosDate: number; dosTime: number } {
  const now = new Date();
  const year = Math.max(now.getFullYear(), 1980);

  return {
    dosDate: ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
    dosTime:
      (now.getHours() << 11) |
      (now.getMinutes() << 5) |
      Math.floor(now.getSeconds() / 2),
  };
}

function createCrcTable(): number[] {
  const table: number[] = [];

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
