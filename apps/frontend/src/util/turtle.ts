/**
 * Core RDF/Turtle data structures and serialization
 */

// Basic RDF types
export type IRI = string;
export type Literal = string;
export type BlankNode = string;

export type RDFValue = IRI | Literal | BlankNode;

// Turtle-specific types
export interface TurtlePrefix {
  prefix: string;
  uri: string;
}

export interface TurtleLiteral {
  value: string;
  datatype?: IRI;
  language?: string;
}

export interface TurtleTriple {
  subject: IRI | BlankNode;
  predicate: IRI;
  object: IRI | BlankNode | TurtleLiteral;
}

export interface TurtleDocument {
  prefixes: TurtlePrefix[];
  triples: TurtleTriple[];
}

// Helper functions for creating RDF values
export function iri(uri: string): IRI {
  return uri;
}

export function literal(value: string, datatype?: IRI, language?: string): TurtleLiteral {
  return { value, datatype, language };
}

export function blankNode(id: string): BlankNode {
  return `_:${id}`;
}

// Helper function for creating triples
export function triple(
  subject: IRI | BlankNode,
  predicate: IRI,
  object: IRI | BlankNode | TurtleLiteral
): TurtleTriple {
  return { subject, predicate, object };
}

// Serialization functions
export function serializePrefix(prefix: TurtlePrefix): string {
  return `@prefix ${prefix.prefix}: <${prefix.uri}> .`;
}

export function serializeValue(value: RDFValue | TurtleLiteral): string {
  if (typeof value === 'string') {
    return `<${value}>`;
  }

  // Handle TurtleLiteral
  const { value: val, datatype, language } = value;
  let result = `"${val.replace(/"/g, '\\"')}"`;

  if (language) {
    result += `@${language}`;
  } else if (datatype) {
    result += `^^<${datatype}>`;
  }

  return result;
}

export function serializeTriple(triple: TurtleTriple): string {
  const subject = typeof triple.subject === 'string' ? `<${triple.subject}>` : triple.subject;
  const predicate = `<${triple.predicate}>`;
  const object = serializeValue(triple.object);

  return `${subject} ${predicate} ${object} .`;
}

export function serializeDocument(doc: TurtleDocument): string {
  const lines: string[] = [];

  // Add prefixes
  for (const prefix of doc.prefixes) {
    lines.push(serializePrefix(prefix));
  }

  if (doc.prefixes.length > 0) {
    lines.push(''); // Empty line after prefixes
  }

  // Add triples
  for (const triple of doc.triples) {
    lines.push(serializeTriple(triple));
  }

  return lines.join('\n');
}

// Utility functions for common patterns
export function addPrefix(doc: TurtleDocument, prefix: string, uri: string): void {
  doc.prefixes.push({ prefix, uri });
}

export function addTriple(doc: TurtleDocument, subject: IRI | BlankNode, predicate: IRI, object: IRI | BlankNode | TurtleLiteral): void {
  doc.triples.push(triple(subject, predicate, object));
}

export function createDocument(): TurtleDocument {
  return { prefixes: [], triples: [] };
}

// Validation functions
export function validateDocument(doc: TurtleDocument): boolean {
  // Basic validation - check for required fields
  if (!Array.isArray(doc.prefixes) || !Array.isArray(doc.triples)) {
    return false;
  }

  // Validate prefixes
  for (const prefix of doc.prefixes) {
    if (!prefix.prefix || !prefix.uri) {
      return false;
    }
  }

  // Validate triples
  for (const triple of doc.triples) {
    if (!triple.subject || !triple.predicate || !triple.object) {
      return false;
    }
  }

  return true;
}

// Parse function (basic implementation)
export function parse(turtleString: string): TurtleDocument {
  // This is a basic implementation - in a real scenario you'd want a proper parser
  const lines = turtleString.split('\n').map(line => line.trim()).filter(line => line);
  const doc = createDocument();

  for (const line of lines) {
    if (line.startsWith('@prefix')) {
      const match = line.match(/@prefix\s+(\w+):\s*<([^>]+)>\s*\./);
      if (match) {
        addPrefix(doc, match[1], match[2]);
      }
    } else if (line.includes(' a ') && line.endsWith('.')) {
      // Basic triple parsing - this is simplified
      const parts = line.split(' a ');
      if (parts.length === 2) {
        const subject = parts[0].trim();
        const object = parts[1].replace(' .', '').trim();
        addTriple(doc, subject, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', object);
      }
    }
  }

  return doc;
}

// Helper functions for common RDF patterns
export function addType(doc: TurtleDocument, subject: IRI | BlankNode, type: IRI): void {
  addTriple(doc, subject, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', type);
}

export function addLabel(doc: TurtleDocument, subject: IRI | BlankNode, label: string, language?: string): void {
  addTriple(doc, subject, 'http://www.w3.org/2000/01/rdf-schema#label', literal(label, undefined, language));
}

export function addProperty(doc: TurtleDocument, subject: IRI | BlankNode, predicate: IRI, object: IRI | BlankNode | TurtleLiteral): void {
  addTriple(doc, subject, predicate, object);
}

export function addStringProperty(doc: TurtleDocument, subject: IRI | BlankNode, predicate: IRI, value: string, language?: string): void {
  addTriple(doc, subject, predicate, literal(value, undefined, language));
}

export function addIntegerProperty(doc: TurtleDocument, subject: IRI | BlankNode, predicate: IRI, value: number): void {
  addTriple(doc, subject, predicate, literal(value.toString(), 'http://www.w3.org/2001/XMLSchema#integer'));
}

export function addBooleanProperty(doc: TurtleDocument, subject: IRI | BlankNode, predicate: IRI, value: boolean): void {
  addTriple(doc, subject, predicate, literal(value.toString(), 'http://www.w3.org/2001/XMLSchema#boolean'));
}

// Helper for creating URIs with proper encoding
export function createURI(base: string, ...pathSegments: string[]): IRI {
  const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
  return `${base}/${encodedSegments.join('/')}`;
}

// Helper for creating prefixed URIs (for serialization)
export function createPrefixedURI(prefix: string, localName: string): string {
  return `${prefix}:${localName}`;
}

// Helper for batch operations
export function addMultipleTriples(doc: TurtleDocument, triples: Array<{ subject: IRI | BlankNode, predicate: IRI, object: IRI | BlankNode | TurtleLiteral }>): void {
  for (const triple of triples) {
    addTriple(doc, triple.subject, triple.predicate, triple.object);
  }
}

// Helper for creating collections (lists)
export function createCollection(doc: TurtleDocument, items: Array<IRI | BlankNode | TurtleLiteral>): BlankNode {
  if (items.length === 0) {
    return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';
  }

  const firstBlank = blankNode(`list_${Date.now()}_0`);
  let currentBlank = firstBlank;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const nextBlank = i < items.length - 1 ? blankNode(`list_${Date.now()}_${i + 1}`) : 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';

    addTriple(doc, currentBlank, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first', item);
    addTriple(doc, currentBlank, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest', nextBlank);

    currentBlank = nextBlank;
  }

  return firstBlank;
}
