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

export function literal(
  value: string,
  datatype?: IRI,
  language?: string,
): TurtleLiteral {
  return { value, datatype, language };
}

export function blankNode(id: string): BlankNode {
  return `_:${id}`;
}

// Helper function for creating triples
export function triple(
  subject: IRI | BlankNode,
  predicate: IRI,
  object: IRI | BlankNode | TurtleLiteral,
): TurtleTriple {
  return { subject, predicate, object };
}

// Serialization functions
export function serializePrefix(prefix: TurtlePrefix): string {
  return `@prefix ${prefix.prefix}: <${prefix.uri}> .`;
}

export function serializeValue(value: RDFValue | TurtleLiteral): string {
  if (typeof value === 'string') {
    // Check if it's a prefixed URI (pattern: prefix:localName)
    // Prefixed URIs don't contain /, <, > and have a colon with non-empty prefix and local name
    if (
      /^[a-zA-Z0-9_]+:[^/<>]+$/.test(value) &&
      !value.startsWith('http://') &&
      !value.startsWith('https://') &&
      !value.startsWith('_:')
    ) {
      return value; // Return prefixed URI as-is
    }
    return `<${value}>`; // Full URI, wrap in angle brackets
  }

  // Handle TurtleLiteral
  const { value: val, datatype, language } = value;
  let result = `"${val.replace(/"/g, '\\"')}"`;

  if (language) {
    result += `@${language}`;
  } else if (datatype) {
    // Check if datatype is xsd:integer - use xsd:int instead
    if (datatype === 'http://www.w3.org/2001/XMLSchema#integer') {
      result += `^^xsd:int`;
    } else if (
      /^[a-zA-Z0-9_]+:[^/<>]+$/.test(datatype) &&
      !datatype.startsWith('http://') &&
      !datatype.startsWith('https://')
    ) {
      result += `^^${datatype}`; // Prefixed datatype
    } else {
      result += `^^<${datatype}>`; // Full URI datatype
    }
  }

  return result;
}

export function serializeTriple(triple: TurtleTriple): string {
  // Handle subject - check if it's a prefixed URI or full URI
  let subject: string;
  if (typeof triple.subject === 'string') {
    if (
      /^[a-zA-Z0-9_]+:[^/<>]+$/.test(triple.subject) &&
      !triple.subject.startsWith('http://') &&
      !triple.subject.startsWith('https://') &&
      !triple.subject.startsWith('_:')
    ) {
      subject = triple.subject; // Prefixed URI
    } else {
      subject = `<${triple.subject}>`; // Full URI or blank node
    }
  } else {
    subject = triple.subject;
  }

  // Handle predicate - check if it's rdf:type (use 'a') or a prefixed URI or full URI
  let predicate: string;
  if (
    triple.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
    triple.predicate === 'rdf:type'
  ) {
    predicate = 'a'; // Use Turtle's abbreviation for rdf:type
  } else if (
    /^[a-zA-Z0-9_]+:[^/<>]+$/.test(triple.predicate) &&
    !triple.predicate.startsWith('http://') &&
    !triple.predicate.startsWith('https://')
  ) {
    predicate = triple.predicate; // Prefixed URI
  } else {
    predicate = `<${triple.predicate}>`; // Full URI
  }

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

  // Group triples by subject for Turtle abbreviated syntax
  const triplesBySubject = new Map<string, TurtleTriple[]>();
  for (const triple of doc.triples) {
    const subjectKey =
      typeof triple.subject === 'string' ? triple.subject : triple.subject;
    if (!triplesBySubject.has(subjectKey)) {
      triplesBySubject.set(subjectKey, []);
    }
    triplesBySubject.get(subjectKey)?.push(triple);
  }

  // Serialize grouped triples
  for (const [_subjectKey, triples] of triplesBySubject.entries()) {
    if (triples.length === 0) continue;

    const firstTriple = triples[0];
    const subjectStr =
      typeof firstTriple.subject === 'string'
        ? /^[a-zA-Z0-9_]+:[^/<>]+$/.test(firstTriple.subject) &&
          !firstTriple.subject.startsWith('http://') &&
          !firstTriple.subject.startsWith('https://') &&
          !firstTriple.subject.startsWith('_:')
          ? firstTriple.subject
          : `<${firstTriple.subject}>`
        : firstTriple.subject;

    if (triples.length === 1) {
      // Single triple - serialize normally
      const predicateStr =
        firstTriple.predicate ===
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
        firstTriple.predicate === 'rdf:type'
          ? 'a'
          : /^[a-zA-Z0-9_]+:[^/<>]+$/.test(firstTriple.predicate) &&
              !firstTriple.predicate.startsWith('http://') &&
              !firstTriple.predicate.startsWith('https://')
            ? firstTriple.predicate
            : `<${firstTriple.predicate}>`;
      const objectStr = serializeValue(firstTriple.object);
      lines.push(`${subjectStr} ${predicateStr} ${objectStr} .`);
    } else {
      // Multiple triples - group with semicolons
      const tripleLines: string[] = [];

      for (let i = 0; i < triples.length; i++) {
        const triple = triples[i];
        const predicateStr =
          triple.predicate ===
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
          triple.predicate === 'rdf:type'
            ? 'a'
            : /^[a-zA-Z0-9_]+:[^/<>]+$/.test(triple.predicate) &&
                !triple.predicate.startsWith('http://') &&
                !triple.predicate.startsWith('https://')
              ? triple.predicate
              : `<${triple.predicate}>`;

        // Check if predicate has multiple objects (same subject + predicate)
        const samePredTriples = triples.filter(
          (t) => t.predicate === triple.predicate,
        );

        if (
          samePredTriples.length > 1 &&
          i === triples.findIndex((t) => t.predicate === triple.predicate)
        ) {
          // Multiple objects for same predicate - comma-separate them
          const objects = samePredTriples.map((t) => serializeValue(t.object));
          tripleLines.push(
            `  ${predicateStr} ${objects.join(',\n    ')}${i < triples.length - 1 && triples[i + samePredTriples.length - 1] ? ';' : i === triples.length - 1 ? ' .' : ';'}`,
          );
          i += samePredTriples.length - 1; // Skip the other triples with same predicate
        } else if (samePredTriples.length === 1) {
          const objectStr = serializeValue(triple.object);
          const terminator = i === triples.length - 1 ? ' .' : ';';
          tripleLines.push(`  ${predicateStr} ${objectStr}${terminator}`);
        }
      }

      if (tripleLines.length > 0) {
        // First line: subject + first predicate
        // For 'a' predicate with long subjects, format like target (a on one line, type on next)
        const firstLine = tripleLines[0];
        const firstPredicate = firstLine.startsWith('  ')
          ? firstLine.substring(2)
          : firstLine;
        const isTypePredicate = firstPredicate.trim().startsWith('a ');
        const subjectLength = subjectStr.length;

        if (isTypePredicate && subjectLength > 60) {
          // Long subject URI - put 'a' on separate line with 4 spaces, type on next with 4 spaces
          const typeMatch = firstPredicate.trim().match(/^a (.+)$/);
          if (typeMatch) {
            lines.push(subjectStr);
            lines.push(`    a ${typeMatch[1]}`);
          } else {
            lines.push(`${subjectStr} ${firstPredicate}`);
          }
        } else {
          // Short subject URI or non-type predicate - put predicate on same line
          lines.push(`${subjectStr} ${firstPredicate}`);
        }

        for (let i = 1; i < tripleLines.length; i++) {
          lines.push(tripleLines[i]);
        }
        lines.push(''); // Blank line after each subject block
      }
    }
  }

  return lines.join('\n');
}

// Utility functions for common patterns
export function addPrefix(
  doc: TurtleDocument,
  prefix: string,
  uri: string,
): void {
  doc.prefixes.push({ prefix, uri });
}

export function addTriple(
  doc: TurtleDocument,
  subject: IRI | BlankNode,
  predicate: IRI,
  object: IRI | BlankNode | TurtleLiteral,
): void {
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
  const lines = turtleString
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);
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
        addTriple(
          doc,
          subject,
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          object,
        );
      }
    }
  }

  return doc;
}

// Helper functions for common RDF patterns
export function addType(
  doc: TurtleDocument,
  subject: IRI | BlankNode,
  type: IRI,
): void {
  addTriple(
    doc,
    subject,
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    type,
  );
}

export function addLabel(
  doc: TurtleDocument,
  subject: IRI | BlankNode,
  label: string,
  language?: string,
): void {
  // Use prefixed URI for rdfs:label
  addTriple(doc, subject, 'rdfs:label', literal(label, undefined, language));
}

export function addProperty(
  doc: TurtleDocument,
  subject: IRI | BlankNode,
  predicate: IRI,
  object: IRI | BlankNode | TurtleLiteral,
): void {
  addTriple(doc, subject, predicate, object);
}

export function addStringProperty(
  doc: TurtleDocument,
  subject: IRI | BlankNode,
  predicate: IRI,
  value: string,
  language?: string,
): void {
  addTriple(doc, subject, predicate, literal(value, undefined, language));
}

export function addIntegerProperty(
  doc: TurtleDocument,
  subject: IRI | BlankNode,
  predicate: IRI,
  value: number,
): void {
  addTriple(
    doc,
    subject,
    predicate,
    literal(value.toString(), 'http://www.w3.org/2001/XMLSchema#integer'),
  );
}

export function addBooleanProperty(
  doc: TurtleDocument,
  subject: IRI | BlankNode,
  predicate: IRI,
  value: boolean,
): void {
  addTriple(
    doc,
    subject,
    predicate,
    literal(value.toString(), 'http://www.w3.org/2001/XMLSchema#boolean'),
  );
}

// Helper for creating URIs with proper encoding
export function createURI(base: string, ...pathSegments: string[]): IRI {
  const encodedSegments = pathSegments.map((segment) =>
    encodeURIComponent(segment),
  );
  return `${base}/${encodedSegments.join('/')}`;
}

// Helper for creating prefixed URIs (for serialization)
export function createPrefixedURI(prefix: string, localName: string): string {
  return `${prefix}:${localName}`;
}

// Helper for batch operations
export function addMultipleTriples(
  doc: TurtleDocument,
  triples: Array<{
    subject: IRI | BlankNode;
    predicate: IRI;
    object: IRI | BlankNode | TurtleLiteral;
  }>,
): void {
  for (const triple of triples) {
    addTriple(doc, triple.subject, triple.predicate, triple.object);
  }
}

// Helper for creating collections (lists)
export function createCollection(
  doc: TurtleDocument,
  items: Array<IRI | BlankNode | TurtleLiteral>,
): BlankNode {
  if (items.length === 0) {
    return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';
  }

  const firstBlank = blankNode(`list_${Date.now()}_0`);
  let currentBlank = firstBlank;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const nextBlank =
      i < items.length - 1
        ? blankNode(`list_${Date.now()}_${i + 1}`)
        : 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';

    addTriple(
      doc,
      currentBlank,
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
      item,
    );
    addTriple(
      doc,
      currentBlank,
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
      nextBlank,
    );

    currentBlank = nextBlank;
  }

  return firstBlank;
}
