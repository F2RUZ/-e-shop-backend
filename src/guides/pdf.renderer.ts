import PDFDocument from 'pdfkit';
import { join } from 'path';

/**
 * Markdown matnni PDF ga aylantiradi.
 *
 * Hujjat talablari (standart ko'rinish):
 *  - shrift: Times New Roman o'lchamlaridagi **Tinos** (izohi: public/fonts/README.md)
 *  - o'lcham: 14
 *  - qatorlar orasi: 1.5 interval
 *  - matn qora, fon oq — rangli bo'yoq yo'q
 *
 * Bu yerda to'liq markdown emas, faqat qo'llanmalarda ishlatiladigan qismi
 * qo'llab-quvvatlanadi: sarlavha, xatboshi, ro'yxat, jadval, kod bloki,
 * iqtibos, ajratuvchi chiziq va matn ichidagi **qalin** / `kod`.
 */

const FONT_DIR = join(process.cwd(), 'public', 'fonts');

const FONTS = {
  regular: join(FONT_DIR, 'Tinos-Regular.ttf'),
  bold: join(FONT_DIR, 'Tinos-Bold.ttf'),
  mono: join(FONT_DIR, 'Cousine-Regular.ttf'),
};

/** A4, chetlari o'zbek ish yuritish standartiga yaqin (chap 30mm, o'ng 15mm) */
const MM = 2.834645; // 1 mm nechta punkt
const PAGE_MARGINS = { top: 20 * MM, bottom: 20 * MM, left: 30 * MM, right: 15 * MM };

const BODY_SIZE = 14;

/**
 * Word'dagi «1.5 interval» — bitta qator balandligini 1.5 ga ko'paytirish demak.
 * pdfkit'da `lineGap` qatorlar ORASIGA qo'shiladi, shuning uchun tabiiy
 * balandlikning yarmini qo'shsak — aynan 1.5 chiqadi.
 */
const LINE_SPACING = 1.5;

/** Kod va jadval matni kichikroq — aks holda sahifa eniga sig'maydi */
const CODE_SIZE = 10;
const TABLE_SIZE = 11;

const BLACK = '#000000';

/**
 * Kod bloklari — Mac terminali ko'rinishida.
 * Ranglar VS Code "Dark+" mavzusidan: ular hammaga tanish va kontrasti yuqori.
 */
const TERMINAL = {
  background: '#1E1E1E',
  titleBar: '#323233',
  text: '#E6E6E6',
  comment: '#6A9955', // yashil
  string: '#CE9178', // to'q sariq
  keyword: '#569CD6', // ko'k
  number: '#B5CEA8', // och yashil
  dots: ['#FF5F57', '#FEBC2E', '#28C840'], // yopish / kichraytirish / kattalashtirish
};

/** Sintaksis bo'yashda ajratiladigan kalit so'zlar */
const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'await', 'async', 'new', 'for', 'of',
  'in', 'if', 'else', 'try', 'catch', 'throw', 'class', 'export', 'import', 'from',
  'true', 'false', 'null', 'undefined', 'typeof', 'while', 'break', 'continue',
]);

interface Block {
  type: 'h2' | 'h3' | 'p' | 'list' | 'code' | 'quote' | 'table' | 'hr';
  text?: string;
  items?: string[];
  ordered?: boolean;
  lines?: string[];
  header?: string[];
  rows?: string[][];
}

export interface PdfMeta {
  title: string;
  subtitle: string;
  footerNote: string;
  pageLabel: string;
}

// ───────────────────────────── MARKDOWN O'QISH ─────────────────────────────

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];

  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'p', text: paragraph.join(' ') });
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Bo'sh qator — xatboshi tugadi
    if (line.trim() === '') {
      flushParagraph();
      i++;
      continue;
    }

    // Kod bloki: ``` bilan boshlanib ``` bilan tugaydi
    if (line.startsWith('```')) {
      flushParagraph();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // yopuvchi ```
      blocks.push({ type: 'code', lines: code });
      continue;
    }

    // Jadval: | a | b |  va keyingi qator |---|---|
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1])) {
      flushParagraph();
      const cells = (row: string) =>
        row.split('|').slice(1, -1).map((cell) => cell.trim());

      const header = cells(line);
      const rows: string[][] = [];
      i += 2;

      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(cells(lines[i]));
        i++;
      }

      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // Ajratuvchi chiziq
    if (line.trim() === '---') {
      flushParagraph();
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Sarlavhalar
    if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push({ type: 'h3', text: line.slice(4) });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({ type: 'h2', text: line.slice(3) });
      i++;
      continue;
    }

    // Iqtibos (>)
    if (line.startsWith('> ') || line === '>') {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }

    // Ro'yxatlar
    const ordered = /^\d+\.\s/.test(line);
    if (ordered || /^[-*]\s/.test(line)) {
      flushParagraph();
      const items: string[] = [];

      while (i < lines.length) {
        const current = lines[i];
        const isItem = ordered ? /^\d+\.\s/.test(current) : /^[-*]\s/.test(current);

        if (isItem) {
          items.push(current.replace(/^(\d+\.|[-*])\s/, ''));
          i++;
        } else if (/^\s{2,}\S/.test(current) && items.length > 0) {
          // ichkariga surilgan davomi — oldingi bandga qo'shiladi
          items[items.length - 1] += ' ' + current.trim();
          i++;
        } else {
          break;
        }
      }

      blocks.push({ type: 'list', items, ordered });
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }

  flushParagraph();

  return blocks;
}

/** `**qalin**` va `` `kod` `` bo'laklarga ajratadi */
function parseInline(text: string): Array<{ text: string; bold?: boolean; code?: boolean }> {
  const parts: Array<{ text: string; bold?: boolean; code?: boolean }> = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index) });
    }

    const token = match[0];

    if (token.startsWith('**')) {
      // Qalin matn ICHIDA kod bo'lishi mumkin: **`null` haqida.**
      // Shuning uchun ichini yana bir bor ko'rib chiqamiz — aks holda
      // backtick belgilari matnda ko'rinib qolardi.
      const inner = token.slice(2, -2);

      for (const [pieceIndex, piece] of inner.split('`').entries()) {
        if (piece === '') continue;

        // Toq raqamli bo'laklar backtick ORASIDA turgan bo'ladi — ya'ni kod
        parts.push({ text: piece, bold: true, code: pieceIndex % 2 === 1 });
      }
    } else {
      parts.push({ text: token.slice(1, -1), code: true });
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push({ text: text.slice(last) });
  }

  return parts.length > 0 ? parts : [{ text }];
}

// ──────────────────────── SINTAKSIS BO'YASH ────────────────────────

interface Token {
  text: string;
  color: string;
}

/**
 * Kod qatorini ranglangan bo'laklarga ajratadi.
 *
 * Bu to'liq JavaScript tahlilchisi EMAS — qo'llanmadagi kodni ko'rsatish uchun
 * yetarli darajadagi sodda ajratgich: izoh, matn satri, kalit so'z va raqam.
 * Kutubxona qo'shmaslik uchun ataylab shunday qilingan.
 */
function tokenizeCode(line: string): Token[] {
  const tokens: Token[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (buffer === '') return;

    // Bo'lakni uchga ajratamiz: nom, raqam va qolgan hamma narsa.
    // Bo'laklarni qo'shsak AYNAN asl matn chiqishi kerak — ustunlar
    // joyidan siljib ketmasligi uchun bu shart.
    const pattern = /[A-Za-z_$][A-Za-z0-9_$]*|\d+(?:\.\d+)?|[^A-Za-z0-9_$]+/g;

    for (const piece of buffer.match(pattern) ?? []) {
      if (KEYWORDS.has(piece)) {
        tokens.push({ text: piece, color: TERMINAL.keyword });
      } else if (/^\d/.test(piece)) {
        tokens.push({ text: piece, color: TERMINAL.number });
      } else {
        tokens.push({ text: piece, color: TERMINAL.text });
      }
    }

    buffer = '';
  };

  while (index < line.length) {
    const rest = line.slice(index);

    // Izoh — qator oxirigacha hammasi
    if (rest.startsWith('//')) {
      flush();
      tokens.push({ text: rest, color: TERMINAL.comment });
      return tokens;
    }

    const quote = line[index];

    // Matn satri: "..." '...' yoki `...`
    if (quote === '"' || quote === "'" || quote === '`') {
      flush();

      let end = index + 1;
      while (end < line.length && line[end] !== quote) {
        if (line[end] === '\\') end++; // ekranlangan belgini o'tkazib yuboramiz
        end++;
      }

      tokens.push({ text: line.slice(index, end + 1), color: TERMINAL.string });
      index = end + 1;
      continue;
    }

    buffer += line[index];
    index++;
  }

  flush();

  return tokens;
}

// ───────────────────────────── PDF CHIZISH ─────────────────────────────

export function renderGuideToPdf(markdown: string, meta: PdfMeta): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: PAGE_MARGINS,
    bufferPages: true, // oxirida sahifa raqamlarini qo'yish uchun
    info: { Title: meta.title, Subject: meta.subtitle, Creator: 'E-Shop Admin API' },
  });

  doc.registerFont('regular', FONTS.regular);
  doc.registerFont('bold', FONTS.bold);
  doc.registerFont('mono', FONTS.mono);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const width = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;
  const bottomLimit = doc.page.height - PAGE_MARGINS.bottom;

  doc.fillColor(BLACK);

  /** 1.5 interval: tabiiy qator balandligining yarmi qo'shiladi */
  const gapFor = (size: number) => {
    doc.fontSize(size);
    return doc.currentLineHeight() * (LINE_SPACING - 1);
  };

  const atPageTop = () => doc.y <= PAGE_MARGINS.top + 1;

  const needSpace = (height: number) => {
    // Sahifa boshida turgan bo'lsak yangi sahifa ochish mantiqsiz —
    // baribir sig'maydi, faqat bo'sh sahifa paydo bo'ladi
    if (doc.y + height > bottomLimit && !atPageTop()) doc.addPage();
  };

  /**
   * Matnni **qalin** va `kod` bo'laklari bilan birga, BITTA oqim qilib yozadi.
   *
   * Ikkita nozik joy bor, ikkalasi ham pdfkit'ning xatti-harakatidan:
   *  1) davomi bo'lgan bo'laklarga (`continued: true`) x/y berilmaydi — berilsa
   *     har bo'lak yangi qatordan boshlanib ketadi;
   *  2) oqim o'rtasida shrift O'LCHAMINI o'zgartirib bo'lmaydi — o'zgartirilsa
   *     qator uziladi va 1.5 interval buziladi. Shuning uchun matn ichidagi
   *     `kod` ham xuddi shu o'lchamda, faqat boshqa shrift bilan yoziladi.
   */
  const writeInline = (
    text: string,
    size: number,
    indent = 0,
    baseFont: 'regular' | 'bold' = 'regular',
  ) => {
    const parts = parseInline(text);

    doc.fontSize(size);
    const options = {
      width: width - indent,
      lineGap: doc.currentLineHeight() * (LINE_SPACING - 1),
      align: 'left' as const,
    };

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;

      // Qalin VA kod bo'lsa — mono ustun keladi (qalin mono shrift yuklanmagan)
      doc.font(part.code ? 'mono' : part.bold ? 'bold' : baseFont).fontSize(size);

      if (index === 0) {
        doc.text(part.text, PAGE_MARGINS.left + indent, doc.y, {
          ...options,
          continued: !isLast,
        });
      } else {
        doc.text(part.text, { ...options, continued: !isLast });
      }
    });
  };

  // ── Sarlavha sahifasi ────────────────────────────────────────────────
  doc.font('bold').fontSize(20).text(meta.title, { align: 'center' });
  doc.moveDown(0.5);
  doc.font('regular').fontSize(14).text(meta.subtitle, { align: 'center' });
  doc.moveDown(2);
  doc
    .moveTo(PAGE_MARGINS.left, doc.y)
    .lineTo(PAGE_MARGINS.left + width, doc.y)
    .lineWidth(0.5)
    .stroke(BLACK);
  doc.moveDown(1.5);

  // ── Bloklar ──────────────────────────────────────────────────────────
  for (const block of parseMarkdown(markdown)) {
    switch (block.type) {
      // Sarlavhalar ham writeInline orqali yoziladi: ichida `kod` yoki **qalin**
      // bo'lsa, belgilar xom holda ko'rinib qolmasin
      case 'h2':
        needSpace(60);
        doc.moveDown(0.8);
        writeInline(block.text, BODY_SIZE, 0, 'bold');
        doc.moveDown(0.3);
        break;

      case 'h3':
        needSpace(50);
        doc.moveDown(0.5);
        writeInline(block.text, BODY_SIZE, 0, 'bold');
        doc.moveDown(0.2);
        break;

      case 'p':
        needSpace(40);
        writeInline(block.text, BODY_SIZE);
        doc.moveDown(0.4);
        break;

      case 'list':
        for (const [index, item] of block.items.entries()) {
          needSpace(30);
          const marker = block.ordered ? `${index + 1}.` : '•';
          const top = doc.y;

          doc.font('regular').fontSize(BODY_SIZE).text(marker, PAGE_MARGINS.left, top, {
            width: 20,
            lineBreak: false,
          });

          // Markerdan keyin y siljidi — matnni AYNAN shu qatordan boshlaymiz
          doc.y = top;
          writeInline(item, BODY_SIZE, 22);
          doc.moveDown(0.2);
        }
        doc.moveDown(0.3);
        break;

      case 'quote': {
        doc.font('regular').fontSize(BODY_SIZE);
        const quoteGap = doc.currentLineHeight() * (LINE_SPACING - 1);

        // Balandligini OLDINDAN o'lchaymiz va butunlay sig'ishini ta'minlaymiz.
        // Aks holda iqtibos ikki sahifaga bo'linib, chap tomondagi chiziq
        // butun sahifa bo'ylab cho'zilib ketardi.
        const quoteHeight = doc.heightOfString(block.text.replace(/[*`]/g, ''), {
          width: width - 16,
          lineGap: quoteGap,
        });

        needSpace(quoteHeight + 12);

        const startY = doc.y;
        writeInline(block.text, BODY_SIZE, 16);
        const endY = doc.y;

        // Chap tomonda ingichka qora chiziq — bo'yoq emas, faqat chiziq.
        // Faqat matn haqiqatan shu sahifada tugagan bo'lsa chizamiz.
        if (endY > startY && endY <= bottomLimit) {
          doc
            .moveTo(PAGE_MARGINS.left + 4, startY)
            .lineTo(PAGE_MARGINS.left + 4, endY)
            .lineWidth(1)
            .stroke(BLACK);
        }

        doc.moveDown(0.5);
        break;
      }

      case 'code': {
        doc.font('mono').fontSize(CODE_SIZE);
        const charWidth = doc.widthOfString('0'); // Cousine — teng kenglikdagi shrift
        const lineHeight = doc.currentLineHeight() + 2;

        const PADDING = 10; // ichki bo'shliq
        const TITLE_HEIGHT = 18; // tepadagi "oyna sarlavhasi" (uchta nuqta shu yerda)
        const RADIUS = 6;

        const innerWidth = width - PADDING * 2;
        const maxChars = Math.max(20, Math.floor(innerWidth / charWidth) - 1);

        // Uzun qatorlarni O'ZIMIZ bo'lamiz. pdfkit bunday qatorlarni faqat
        // probel joyidan bo'la oladi, kodda esa probel bo'lmasligi mumkin.
        const wrapped: string[] = [];
        for (const line of block.lines) {
          if (line.length <= maxChars) {
            wrapped.push(line);
            continue;
          }

          // Davomi ekani ko'rinib tursin uchun ichkariga suramiz
          const indent = ' '.repeat(Math.min(4, maxChars - 10));
          let rest = line;
          let first = true;

          while (rest.length > 0) {
            const room = first ? maxChars : maxChars - indent.length;
            wrapped.push((first ? '' : indent) + rest.slice(0, room));
            rest = rest.slice(room);
            first = false;
          }
        }

        // Kod bloki sahifaga sig'masa — bo'laklarga bo'lib, har birini
        // alohida "terminal oynasi" qilib chizamiz.
        let cursor = 0;

        while (cursor < wrapped.length) {
          const frameExtra = TITLE_HEIGHT + PADDING * 2;
          let available = bottomLimit - doc.y - frameExtra;

          // Kamida ikkita qator sig'masa — yangi sahifadan boshlagan ma'qul
          if (available < lineHeight * 2 && !atPageTop()) {
            doc.addPage();
            available = bottomLimit - doc.y - frameExtra;
          }

          const fits = Math.max(1, Math.floor(available / lineHeight));
          const chunk = wrapped.slice(cursor, cursor + fits);
          cursor += chunk.length;

          const boxTop = doc.y;
          const boxHeight = frameExtra + chunk.length * lineHeight;

          doc.save();

          // 1) Butun oyna — to'q fon, burchaklari yumaloq
          doc
            .roundedRect(PAGE_MARGINS.left, boxTop, width, boxHeight, RADIUS)
            .fill(TERMINAL.background);

          // 2) Tepadagi sarlavha yo'lagi. Yumaloq to'rtburchakning pastki
          //    burchaklarini oddiy to'rtburchak bilan to'g'rilab qo'yamiz.
          doc
            .roundedRect(PAGE_MARGINS.left, boxTop, width, TITLE_HEIGHT, RADIUS)
            .fill(TERMINAL.titleBar);
          doc
            .rect(PAGE_MARGINS.left, boxTop + TITLE_HEIGHT - RADIUS, width, RADIUS)
            .fill(TERMINAL.titleBar);

          // 3) Mac oynasining uchta tugmasi
          TERMINAL.dots.forEach((color, dotIndex) => {
            doc
              .circle(PAGE_MARGINS.left + 12 + dotIndex * 11, boxTop + TITLE_HEIGHT / 2, 3.5)
              .fill(color);
          });

          // 4) Kodning o'zi — har bir bo'lak O'Z rangi bilan, O'Z ustunida.
          //    Har belgi bir xil enda bo'lgani uchun x ni ustun raqamidan
          //    hisoblasa bo'ladi — shunda ranglash matnni siljitmaydi.
          let textY = boxTop + TITLE_HEIGHT + PADDING;

          for (const line of chunk) {
            let column = 0;

            for (const token of tokenizeCode(line)) {
              if (token.text.trim() !== '') {
                doc
                  .font('mono')
                  .fontSize(CODE_SIZE)
                  .fillColor(token.color)
                  .text(token.text, PAGE_MARGINS.left + PADDING + column * charWidth, textY, {
                    lineBreak: false,
                  });
              }

              column += token.text.length;
            }

            textY += lineHeight;
          }

          doc.restore();

          // `doc.y` ni o'zimiz qo'yamiz: yuqorida matn aniq koordinata bilan
          // chizildi, shuning uchun pdfkit uni siljitmagan
          doc.y = boxTop + boxHeight;
          doc.fillColor(BLACK);

          if (cursor < wrapped.length) doc.addPage();
        }

        doc.moveDown(0.6);
        break;
      }

      case 'table': {
        const columns = block.header.length;
        const columnWidth = width / columns;

        // Jadval katagida markdown belgilarini ko'rsatmaymiz — u yerda
        // qalin/kod formatlash qo'llanmaydi, faqat toza matn chiqadi
        const clean = (cell: string) => cell.replace(/[*`]/g, '');

        const rowHeightOf = (cells: string[], bold: boolean) => {
          doc.font(bold ? 'bold' : 'regular').fontSize(TABLE_SIZE);

          // Eng baland katakka qarab o'lchaymiz — qator tekis chiqsin
          const heights = cells.map((cell) =>
            doc.heightOfString(clean(cell), { width: columnWidth - 12 }),
          );

          return Math.max(...heights) + 10;
        };

        const drawRow = (cells: string[], bold: boolean) => {
          const rowHeight = rowHeightOf(cells, bold);
          const top = doc.y;

          doc.font(bold ? 'bold' : 'regular').fontSize(TABLE_SIZE).fillColor(BLACK);

          cells.forEach((cell, index) => {
            doc.text(clean(cell), PAGE_MARGINS.left + index * columnWidth + 6, top + 5, {
              width: columnWidth - 12,
            });
          });

          // Katak chegaralari — ingichka qora chiziq, ichi oq qoladi
          doc.lineWidth(0.5);
          for (let index = 0; index <= columns; index++) {
            doc
              .moveTo(PAGE_MARGINS.left + index * columnWidth, top)
              .lineTo(PAGE_MARGINS.left + index * columnWidth, top + rowHeight)
              .stroke(BLACK);
          }
          doc
            .moveTo(PAGE_MARGINS.left, top)
            .lineTo(PAGE_MARGINS.left + width, top)
            .stroke(BLACK);
          doc
            .moveTo(PAGE_MARGINS.left, top + rowHeight)
            .lineTo(PAGE_MARGINS.left + width, top + rowHeight)
            .stroke(BLACK);

          doc.y = top + rowHeight;
        };

        // Jadval sahifa oxirida boshlanib qolmasin
        needSpace(rowHeightOf(block.header, true) * 2);
        drawRow(block.header, true);

        for (const row of block.rows) {
          // Qator keyingi sahifaga tushsa — sarlavhani QAYTA chizamiz,
          // aks holda ustunlar nima haqidaligi bilinmay qoladi
          if (doc.y + rowHeightOf(row, false) > bottomLimit) {
            doc.addPage();
            drawRow(block.header, true);
          }

          drawRow(row, false);
        }

        doc.moveDown(0.8);
        break;
      }

      case 'hr':
        needSpace(20);
        doc.moveDown(0.3);
        doc
          .moveTo(PAGE_MARGINS.left, doc.y)
          .lineTo(PAGE_MARGINS.left + width, doc.y)
          .lineWidth(0.5)
          .stroke(BLACK);
        doc.moveDown(0.6);
        break;
    }
  }

  // ── Sahifa raqamlari ─────────────────────────────────────────────────
  const range = doc.bufferedPageRange();

  for (let index = 0; index < range.count; index++) {
    doc.switchToPage(range.start + index);

    // MUHIM: kolontitul pastki chetdan TASHQARIDA yoziladi. pdfkit esa
    // chetdan chiqib ketgan matn uchun avtomatik yangi sahifa qo'shadi —
    // natijada hujjat oxirida bir dasta bo'sh sahifa paydo bo'lardi
    // (har bir kolontitul bittadan). Yozish vaqtida pastki chetni
    // vaqtincha nolga tushiramiz, keyin joyiga qaytaramiz.
    const savedBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc
      .font('regular')
      .fontSize(10)
      .fillColor(BLACK)
      .text(
        `${meta.footerNote}   —   ${meta.pageLabel} ${index + 1} / ${range.count}`,
        PAGE_MARGINS.left,
        doc.page.height - PAGE_MARGINS.bottom + 8,
        { width, align: 'center', lineBreak: false },
      );

    doc.page.margins.bottom = savedBottomMargin;
  }

  doc.end();

  return finished;
}
