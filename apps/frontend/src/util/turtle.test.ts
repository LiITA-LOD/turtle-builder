import { describe, expect, test } from '@rstest/core';
import {
  addBooleanProperty,
  addIntegerProperty,
  addLabel,
  addMultipleTriples,
  addPrefix,
  addStringProperty,
  addTriple,
  addType,
  blankNode,
  createCollection,
  createDocument,
  createPrefixedURI,
  createURI,
  iri,
  literal,
  parse,
  serializeDocument,
  serializePrefix,
  serializeTriple,
  serializeValue,
  type TurtleLiteral,
  type TurtlePrefix,
  type TurtleTriple,
  triple,
  validateDocument,
} from './turtle';

describe('Turtle Module', () => {
  describe('createDocument', () => {
    test('should create an empty document', () => {
      const doc = createDocument();
      expect(doc.prefixes).toEqual([]);
      expect(doc.triples).toEqual([]);
    });
  });

  describe('addPrefix', () => {
    test('should add a prefix to document', () => {
      const doc = createDocument();
      addPrefix(doc, 'rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');

      expect(doc.prefixes).toHaveLength(1);
      expect(doc.prefixes[0]).toEqual({
        prefix: 'rdf',
        uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      });
    });
  });

  describe('addTriple', () => {
    test('should add a triple to document', () => {
      const doc = createDocument();
      addTriple(
        doc,
        'http://example.org/subject',
        'http://example.org/predicate',
        'http://example.org/object',
      );

      expect(doc.triples).toHaveLength(1);
      expect(doc.triples[0]).toEqual({
        subject: 'http://example.org/subject',
        predicate: 'http://example.org/predicate',
        object: 'http://example.org/object',
      });
    });
  });

  describe('serializePrefix', () => {
    test('should serialize a prefix correctly', () => {
      const prefix: TurtlePrefix = {
        prefix: 'rdf',
        uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      };

      expect(serializePrefix(prefix)).toBe(
        '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
      );
    });
  });

  describe('serializeValue', () => {
    test('should serialize IRI correctly', () => {
      expect(serializeValue('http://example.org/resource')).toBe(
        '<http://example.org/resource>',
      );
    });

    test('should serialize blank node correctly', () => {
      expect(serializeValue('_:blank1')).toBe('<_:blank1>');
    });

    test('should serialize simple literal correctly', () => {
      const literal: TurtleLiteral = { value: 'Hello World' };
      expect(serializeValue(literal)).toBe('"Hello World"');
    });

    test('should serialize literal with datatype correctly', () => {
      const literal: TurtleLiteral = {
        value: '42',
        datatype: 'http://www.w3.org/2001/XMLSchema#integer',
      };
      expect(serializeValue(literal)).toBe('"42"^^xsd:int');
    });

    test('should serialize literal with language tag correctly', () => {
      const literal: TurtleLiteral = {
        value: 'Hello',
        language: 'en',
      };
      expect(serializeValue(literal)).toBe('"Hello"@en');
    });

    test('should escape quotes in literal values', () => {
      const literal: TurtleLiteral = { value: 'He said "Hello"' };
      expect(serializeValue(literal)).toBe('"He said \\"Hello\\""');
    });
  });

  describe('serializeTriple', () => {
    test('should serialize a simple triple correctly', () => {
      const triple: TurtleTriple = {
        subject: 'http://example.org/subject',
        predicate: 'http://example.org/predicate',
        object: 'http://example.org/object',
      };

      expect(serializeTriple(triple)).toBe(
        '<http://example.org/subject> <http://example.org/predicate> <http://example.org/object> .',
      );
    });

    test('should serialize triple with literal object correctly', () => {
      const triple: TurtleTriple = {
        subject: 'http://example.org/subject',
        predicate: 'http://example.org/predicate',
        object: { value: 'Hello World' },
      };

      expect(serializeTriple(triple)).toBe(
        '<http://example.org/subject> <http://example.org/predicate> "Hello World" .',
      );
    });
  });

  describe('serializeDocument', () => {
    test('should serialize empty document correctly', () => {
      const doc = createDocument();
      expect(serializeDocument(doc)).toBe('');
    });

    test('should serialize document with prefixes and triples correctly', () => {
      const doc = createDocument();
      addPrefix(doc, 'rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
      addPrefix(doc, 'ex', 'http://example.org/');
      addTriple(
        doc,
        'http://example.org/subject',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'http://example.org/Person',
      );

      const result = serializeDocument(doc);
      expect(result).toContain(
        '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
      );
      expect(result).toContain('@prefix ex: <http://example.org/> .');
      expect(result).toContain(
        '<http://example.org/subject> a <http://example.org/Person> .',
      );
    });
  });

  describe('validateDocument', () => {
    test('should validate correct document', () => {
      const doc = createDocument();
      addPrefix(doc, 'rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
      addTriple(
        doc,
        'http://example.org/subject',
        'http://example.org/predicate',
        'http://example.org/object',
      );

      expect(validateDocument(doc)).toBe(true);
    });

    test('should reject document with invalid structure', () => {
      const invalidDoc = { prefixes: 'not an array', triples: [] } as any;
      expect(validateDocument(invalidDoc)).toBe(false);
    });

    test('should reject document with invalid prefix', () => {
      const doc = createDocument();
      doc.prefixes.push({ prefix: '', uri: 'http://example.org/' });
      expect(validateDocument(doc)).toBe(false);
    });

    test('should reject document with invalid triple', () => {
      const doc = createDocument();
      doc.triples.push({
        subject: '',
        predicate: 'http://example.org/predicate',
        object: 'http://example.org/object',
      });
      expect(validateDocument(doc)).toBe(false);
    });
  });

  describe('parse', () => {
    test('should parse simple turtle string', () => {
      const turtleString = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix ex: <http://example.org/> .
<http://example.org/subject> a <http://example.org/Person> .`;

      const doc = parse(turtleString);
      expect(doc.prefixes).toHaveLength(2);
      expect(doc.triples).toHaveLength(1);
    });
  });

  describe('helper functions', () => {
    test('iri should return the URI as-is', () => {
      expect(iri('http://example.org/resource')).toBe(
        'http://example.org/resource',
      );
    });

    test('literal should create literal object', () => {
      const result = literal(
        'Hello',
        'http://www.w3.org/2001/XMLSchema#string',
        'en',
      );
      expect(result).toEqual({
        value: 'Hello',
        datatype: 'http://www.w3.org/2001/XMLSchema#string',
        language: 'en',
      });
    });

    test('blankNode should create blank node identifier', () => {
      expect(blankNode('node1')).toBe('_:node1');
    });

    test('triple should create triple object', () => {
      const result = triple(
        'http://example.org/s',
        'http://example.org/p',
        'http://example.org/o',
      );
      expect(result).toEqual({
        subject: 'http://example.org/s',
        predicate: 'http://example.org/p',
        object: 'http://example.org/o',
      });
    });
  });

  describe('helper functions', () => {
    test('addType should add rdf:type triple', () => {
      const doc = createDocument();
      addType(doc, 'http://example.org/subject', 'http://example.org/Person');

      expect(doc.triples).toHaveLength(1);
      expect(doc.triples[0].predicate).toBe(
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      );
    });

    test('addLabel should add rdfs:label triple with literal', () => {
      const doc = createDocument();
      addLabel(doc, 'http://example.org/subject', 'Hello World');

      expect(doc.triples).toHaveLength(1);
      expect(doc.triples[0].predicate).toBe('rdfs:label');
      expect(doc.triples[0].object).toEqual({ value: 'Hello World' });
    });

    test('addLabel should add rdfs:label with language tag', () => {
      const doc = createDocument();
      addLabel(doc, 'http://example.org/subject', 'Hello', 'en');

      expect(doc.triples[0].object).toEqual({ value: 'Hello', language: 'en' });
    });

    test('addStringProperty should add property with string literal', () => {
      const doc = createDocument();
      addStringProperty(
        doc,
        'http://example.org/subject',
        'http://example.org/name',
        'John',
      );

      expect(doc.triples[0].predicate).toBe('http://example.org/name');
      expect(doc.triples[0].object).toEqual({ value: 'John' });
    });

    test('addIntegerProperty should add property with integer literal', () => {
      const doc = createDocument();
      addIntegerProperty(
        doc,
        'http://example.org/subject',
        'http://example.org/age',
        25,
      );

      expect(doc.triples[0].object).toEqual({
        value: '25',
        datatype: 'http://www.w3.org/2001/XMLSchema#integer',
      });
    });

    test('addBooleanProperty should add property with boolean literal', () => {
      const doc = createDocument();
      addBooleanProperty(
        doc,
        'http://example.org/subject',
        'http://example.org/active',
        true,
      );

      expect(doc.triples[0].object).toEqual({
        value: 'true',
        datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
      });
    });

    test('createURI should properly encode path segments', () => {
      const uri = createURI(
        'http://example.org',
        'path with spaces',
        'special/chars',
      );
      expect(uri).toBe(
        'http://example.org/path%20with%20spaces/special%2Fchars',
      );
    });

    test('createPrefixedURI should create prefixed URI', () => {
      const prefixed = createPrefixedURI('ex', 'Person');
      expect(prefixed).toBe('ex:Person');
    });

    test('addMultipleTriples should add multiple triples at once', () => {
      const doc = createDocument();
      const triples = [
        {
          subject: 'http://example.org/s1',
          predicate: 'http://example.org/p1',
          object: 'http://example.org/o1',
        },
        {
          subject: 'http://example.org/s2',
          predicate: 'http://example.org/p2',
          object: 'http://example.org/o2',
        },
      ];

      addMultipleTriples(doc, triples);

      expect(doc.triples).toHaveLength(2);
    });

    test('createCollection should create RDF list', () => {
      const doc = createDocument();
      const items = ['http://example.org/item1', 'http://example.org/item2'];
      const listHead = createCollection(doc, items);

      expect(listHead).toMatch(/^_:list_\d+_0$/);
      expect(doc.triples.length).toBeGreaterThan(0);
    });

    test('createCollection with empty array should return rdf:nil', () => {
      const doc = createDocument();
      const listHead = createCollection(doc, []);

      expect(listHead).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');
    });
  });

  describe('integration test', () => {
    test('should create and serialize a complete document', () => {
      const doc = createDocument();

      // Add prefixes
      addPrefix(doc, 'rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
      addPrefix(doc, 'rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
      addPrefix(doc, 'ex', 'http://example.org/');

      // Add triples
      addTriple(
        doc,
        'http://example.org/Person',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'http://www.w3.org/2000/01/rdf-schema#Class',
      );
      addTriple(
        doc,
        'http://example.org/john',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'http://example.org/Person',
      );
      addTriple(
        doc,
        'http://example.org/john',
        'http://www.w3.org/2000/01/rdf-schema#label',
        literal('John Doe'),
      );

      const result = serializeDocument(doc);

      expect(result).toContain(
        '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
      );
      expect(result).toContain(
        '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
      );
      expect(result).toContain('@prefix ex: <http://example.org/> .');
      expect(result).toContain(
        '<http://example.org/Person> a <http://www.w3.org/2000/01/rdf-schema#Class> .',
      );
      expect(result).toContain(
        '<http://example.org/john> a <http://example.org/Person>',
      );
      expect(result).toContain('<http://example.org/john>');
      expect(result).toContain(
        '<http://www.w3.org/2000/01/rdf-schema#label> "John Doe"',
      );
    });

    test('should create document using helper functions', () => {
      const doc = createDocument();

      // Add prefixes
      addPrefix(doc, 'rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
      addPrefix(doc, 'rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
      addPrefix(doc, 'ex', 'http://example.org/');

      // Use helper functions
      addType(
        doc,
        'http://example.org/Person',
        'http://www.w3.org/2000/01/rdf-schema#Class',
      );
      addType(doc, 'http://example.org/john', 'http://example.org/Person');
      addLabel(doc, 'http://example.org/john', 'John Doe');
      addStringProperty(
        doc,
        'http://example.org/john',
        'http://example.org/email',
        'john@example.org',
      );
      addIntegerProperty(
        doc,
        'http://example.org/john',
        'http://example.org/age',
        30,
      );

      const result = serializeDocument(doc);

      expect(result).toContain(
        '<http://example.org/Person> a <http://www.w3.org/2000/01/rdf-schema#Class> .',
      );
      expect(result).toContain(
        '<http://example.org/john> a <http://example.org/Person>',
      );
      expect(result).toContain('<http://example.org/john>');
      expect(result).toContain('rdfs:label "John Doe"');
      expect(result).toContain('<http://example.org/email> "john@example.org"');
      expect(result).toContain('<http://example.org/age> "30"^^xsd:int');
    });
  });
});
