import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

async function getDOIMetadata(doi: string) {
  console.log(doi);
  const response = await fetch(`https://api.crossref.org/works/${doi}`);
  const data = await response.json();
  const { title, author } = data.message;
  return {
    title: title[0],
    authors: author.map((a: any) => `${a.given} ${a.family}`),
  };
}

async function getArxivMetadata(arxivId: string) {
  const response = await fetch(`http://export.arxiv.org/api/query?id_list=${arxivId}`);
  const text = await response.text();
  const entry = text.split('<entry>')[1];
  const title = entry.split('<title>')[1].split('</title>')[0].trim();
  const authors = entry
    .split('<author>')
    .slice(1)
    .map((author: any) => {
      const name = author.split('<name>')[1].split('</name>')[0].trim();
      return name;
    });
  return { title, authors };
}

async function getISBNMetadata(isbn: string) {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  );
  const data = await response.json();
  const bookData = data[`ISBN:${isbn}`];
  const title = bookData.title;
  const authors = bookData.authors.map((a: any) => a.name);
  return { title, authors };
}

export async function GET() {
  return NextResponse.json({ data: 'nothing' });
}

export async function POST(req: NextRequest) {
  const { url, type } = await req.json();

  let metadata;

  try {
    if (type === 'doi' || type === 'isbn') {
      const response = await fetch(url);
      const pdfBuffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      metadata = {
        authors: [pdfDoc.getAuthor()],
        title: pdfDoc.getTitle(),
      };
    } else if (type === 'arxiv') {
      const arxivId = url.split('/').pop();

      metadata = await getArxivMetadata(arxivId);
    }

    return NextResponse.json(metadata);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve metadata' });
  }
}
