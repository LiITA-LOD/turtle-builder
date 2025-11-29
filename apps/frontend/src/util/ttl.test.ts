import { describe, expect, test } from '@rstest/core';
import type { ConlluDocument } from 'liita-textlinker-frontend/conllu';
import {
  addAllPrefixes,
  addCitationSentence,
  addCitationStructureHeader,
  addDependencyRelation,
  addDocumentLayer,
  addDocumentMetadata,
  addMorphologyAnnotation,
  addMorphologyAnnotationLayerHeader,
  addToken,
  addUDAnnotationLayerHeader,
  addUDSentence,
  conlluToTurtle,
  extractLemmaId,
  extractMetadata,
  featuresToUDURLs,
  generateDocumentURI,
  generateMorphologyAnnotationURI,
  generateSentenceURI,
  generateTokenURI,
  generateUDDepURI,
  generateUDLayerSentenceURI,
  getLemmaPrefix,
  parseMiscField,
  processCitationSentence,
  processSentenceTokens,
  processSentenceTokensOnly,
  toPrefixedURI,
  type DocumentMetadata,
} from './ttl';
import { createDocument, serializeDocument } from './turtle';

describe('TTL Module', () => {
  describe('parseMiscField', () => {
    test('should return empty object for undefined input', () => {
      expect(parseMiscField(undefined)).toEqual({});
    });

    test('should return empty object for empty array', () => {
      expect(parseMiscField([])).toEqual({});
    });

    test('should parse simple key-value pairs', () => {
      const misc = ['SpaceAfter=No', 'start_char=0'];
      const result = parseMiscField(misc);
      expect(result.SpaceAfter).toBe('No');
      expect(result.start_char).toBe(0);
    });

    test('should parse LiITALinkedURIs as JSON array', () => {
      const misc = ['LiITALinkedURIs=["http://example.org/lemma/1"]'];
      const result = parseMiscField(misc);
      expect(result.LiITALinkedURIs).toEqual(['http://example.org/lemma/1']);
    });

    test('should handle invalid JSON in LiITALinkedURIs', () => {
      const misc = ['LiITALinkedURIs=invalid'];
      const result = parseMiscField(misc);
      expect(result.LiITALinkedURIs).toEqual([]);
    });

    test('should parse numeric fields correctly', () => {
      const misc = ['start_char=10', 'end_char=20'];
      const result = parseMiscField(misc);
      expect(result.start_char).toBe(10);
      expect(result.end_char).toBe(20);
    });

    test('should skip items without equals sign', () => {
      const misc = ['invalid', 'key=value'];
      const result = parseMiscField(misc);
      expect(result.key).toBe('value');
      expect(result.invalid).toBeUndefined();
    });
  });

  describe('generateSentenceURI', () => {
    const corpusRef = 'http://liita.it/data/corpora/Pirandelita/corpus';

    test('should generate correct sentence URI', () => {
      const uri = generateSentenceURI(corpusRef, 'Test Document', 1);
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test%20Document/CiteStructure/s1',
      );
    });

    test('should encode special characters in doc title', () => {
      const uri = generateSentenceURI(corpusRef, 'Test/Doc', 2);
      expect(uri).toContain('Test%2FDoc');
    });

    test('should use custom labels for nested structure when IDs are not provided', () => {
      const uri = generateSentenceURI(corpusRef, 'Test', 1, undefined, 1, undefined, 1, 'Document', 'Paragraph');
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test/CiteStructure/Document_1/Paragraph_1/s1',
      );
    });

    test('should use provided IDs when available', () => {
      const uri = generateSentenceURI(corpusRef, 'Test', 1, 'doc1', 1, 'para1', 1, 'Document', 'Paragraph');
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test/CiteStructure/doc1/para1/s1',
      );
    });
  });

  describe('generateTokenURI', () => {
    test('should generate correct token URI', () => {
      const sentURI = 'http://liita.it/data/corpora/Pirandelita/corpus/Test%20Document/CiteStructure/s1';
      const uri = generateTokenURI(sentURI, 1);
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test%20Document/CiteStructure/s1/t1',
      );
    });

    test('should handle multiple sentences and tokens', () => {
      const sentURI = 'http://liita.it/data/corpora/Pirandelita/corpus/Doc/CiteStructure/s2';
      const uri = generateTokenURI(sentURI, 3);
      expect(uri).toBe('http://liita.it/data/corpora/Pirandelita/corpus/Doc/CiteStructure/s2/t3');
    });

    test('should handle nested sentence URIs (with doc/para)', () => {
      const sentURI = 'http://liita.it/data/corpora/Pirandelita/corpus/Doc/CiteStructure/Document_1/Paragraph_1/s1';
      const uri = generateTokenURI(sentURI, 2);
      expect(uri).toBe('http://liita.it/data/corpora/Pirandelita/corpus/Doc/CiteStructure/Document_1/Paragraph_1/s1/t2');
    });
  });

  describe('generateUDDepURI', () => {
    const corpusRef = 'http://liita.it/data/corpora/Pirandelita/corpus';

    test('should generate correct UD dependency URI', () => {
      const uri = generateUDDepURI(corpusRef, 'Test Document', 1, 1);
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test%20Document/UD/s1t1',
      );
    });
  });

  describe('generateUDLayerSentenceURI', () => {
    const corpusRef = 'http://liita.it/data/corpora/Pirandelita/corpus';

    test('should generate correct UD layer sentence URI', () => {
      const uri = generateUDLayerSentenceURI(corpusRef, 'Test Document', 1);
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test%20Document/UDAnnotationLayer/Sentence_1',
      );
    });
  });

  describe('generateMorphologyAnnotationURI', () => {
    const corpusRef = 'http://liita.it/data/corpora/Pirandelita/corpus';

    test('should generate correct morphology annotation URI', () => {
      const uri = generateMorphologyAnnotationURI(corpusRef, 'Test Document', 1, 1);
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test%20Document/UDMorphologyAnnotationLayer/id/s1t1',
      );
    });
  });

  describe('getLemmaPrefix', () => {
    test('should return liitaIpoLemma for hypolemma URI', () => {
      const prefix = getLemmaPrefix('http://liita.it/data/id/hypolemma/123');
      expect(prefix).toBe('liitaIpoLemma');
    });

    test('should return liitaLemma for regular lemma URI', () => {
      const prefix = getLemmaPrefix('http://liita.it/data/id/lemma/123');
      expect(prefix).toBe('liitaLemma');
    });
  });

  describe('extractLemmaId', () => {
    test('should extract lemma ID from URI', () => {
      const id = extractLemmaId('http://liita.it/data/id/lemma/123');
      expect(id).toBe('123');
    });

    test('should extract hypolemma ID from URI', () => {
      const id = extractLemmaId('http://liita.it/data/id/hypolemma/456');
      expect(id).toBe('456');
    });

    test('should return empty string for invalid URI', () => {
      const id = extractLemmaId('http://example.org/invalid');
      expect(id).toBe('');
    });
  });

  describe('featuresToUDURLs', () => {
    test('should return empty array for undefined input', () => {
      expect(featuresToUDURLs(undefined)).toEqual([]);
    });

    test('should convert features to UD URLs', () => {
      const feats = { Case: 'Nom', Gender: 'Fem' };
      const urls = featuresToUDURLs(feats);
      expect(urls).toHaveLength(2);
      expect(urls[0]).toBe(
        'https://universaldependencies.org/it/feat/Case#Nom',
      );
      expect(urls[1]).toBe(
        'https://universaldependencies.org/it/feat/Gender#Fem',
      );
    });
  });

  describe('toPrefixedURI', () => {
    test('should convert RDF type URI to prefixed form', () => {
      const result = toPrefixedURI(
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      );
      expect(result).toBe('rdf:type');
    });

    test('should convert RDFS label URI to prefixed form', () => {
      const result = toPrefixedURI(
        'http://www.w3.org/2000/01/rdf-schema#label',
      );
      expect(result).toBe('rdfs:label');
    });

    test('should convert POWLA URI to prefixed form', () => {
      const result = toPrefixedURI('http://purl.org/powla/powla.owl#Document');
      expect(result).toBe('powla:Document');
    });

    test('should return original URI if no prefix matches', () => {
      const uri = 'http://example.org/unknown';
      expect(toPrefixedURI(uri)).toBe(uri);
    });
  });

  describe('generateDocumentURI', () => {
    const corpusRef = 'http://liita.it/data/corpora/Pirandelita/corpus';

    test('should generate correct document URI', () => {
      const uri = generateDocumentURI(corpusRef, 'Test Document');
      expect(uri).toBe(
        'http://liita.it/data/corpora/Pirandelita/corpus/Test%20Document',
      );
    });

    test('should encode special characters', () => {
      const uri = generateDocumentURI(corpusRef, 'Test/Doc & More');
      expect(uri).toContain('Test%2FDoc');
      expect(uri).toContain('%20%26%20');
    });
  });

  describe('processSentenceTokens', () => {
    test('should process all tokens in a sentence', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const sentence = {
        tokens: [
          { form: 'Hello', misc: [] },
          { form: 'World', misc: [] },
        ],
      };
      const tokenURIs = [
        'http://example.org/token1',
        'http://example.org/token2',
      ];
      const docLayerURI = 'http://example.org/docLayer';

      processSentenceTokens(doc, sentence, tokenURIs, docLayerURI);

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('"Hello"');
      expect(serialized).toContain('"World"');
      expect(serialized).toContain('powla:next');
      expect(serialized).toContain('powla:previous');
    });

    test('should handle single token sentence', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const sentence = { tokens: [{ form: 'Hello', misc: [] }] };
      const tokenURIs = ['http://example.org/token1'];
      const docLayerURI = 'http://example.org/docLayer';

      processSentenceTokens(doc, sentence, tokenURIs, docLayerURI);

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('"Hello"');
    });
  });

  describe('processCitationSentence', () => {
    test('should process citation sentence with tokens', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const sentence = {
        tokens: [
          { form: 'Hello', misc: [] },
          { form: 'World', misc: [] },
        ],
      };
      const docLayerURI = 'http://example.org/docLayer';

      processCitationSentence(
        doc,
        sentence,
        'Test Doc',
        1,
        1,
        docLayerURI,
        undefined,
        undefined,
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('lila_corpus:citationUnit');
      expect(serialized).toContain('"Hello"');
      expect(serialized).toContain('"World"');
    });

    test('should handle sentence with next/previous links', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const sentence = { tokens: [{ form: 'Test', misc: [] }] };
      const docLayerURI = 'http://example.org/docLayer';

      processCitationSentence(
        doc,
        sentence,
        'Test Doc',
        2,
        3,
        docLayerURI,
        'http://example.org/sent1',
        'http://example.org/sent3',
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('powla:next');
      expect(serialized).toContain('powla:previous');
    });
  });

  describe('processSentenceTokensOnly', () => {
    test('should process tokens without citation structure', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const sentence = {
        tokens: [
          { form: 'Hello', misc: [] },
          { form: 'World', misc: [] },
        ],
      };
      const docLayerURI = 'http://example.org/docLayer';

      processSentenceTokensOnly(doc, sentence, 'Test Doc', 1, docLayerURI);

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('"Hello"');
      expect(serialized).toContain('"World"');
      expect(serialized).not.toContain('lila_corpus:citationUnit');
    });
  });

  describe('addAllPrefixes', () => {
    test('should add all standard prefixes', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      expect(doc.prefixes.length).toBeGreaterThan(10);
      expect(doc.prefixes.some((p) => p.prefix === 'rdfs')).toBe(true);
      expect(doc.prefixes.some((p) => p.prefix === 'powla')).toBe(true);
      expect(doc.prefixes.some((p) => p.prefix === 'xsd')).toBe(true);
      expect(doc.prefixes.some((p) => p.prefix === 'dc')).toBe(true);
      expect(doc.prefixes.some((p) => p.prefix === 'oa')).toBe(true);
    });
  });

  describe('addDocumentMetadata', () => {
    test('should add document metadata triples', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test Document',
        contributor: 'Test Contributor',
        corpusRef: 'http://example.org/corpus',
        docAuthor: 'http://example.org/author',
        seeAlso: 'http://example.org/seealso',
        description: 'Test description',
      };
      const docURI = 'http://example.org/doc';
      addDocumentMetadata(doc, docURI, metadata.corpusRef, metadata);

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('powla:Document');
      expect(serialized).toContain('dc:contributor');
      expect(serialized).toContain('dc:title');
      expect(serialized).toContain('Test Document');
    });
  });

  describe('addDocumentLayer', () => {
    test('should add document layer and return URI', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const docURI = 'http://example.org/doc';
      const layerURI = addDocumentLayer(doc, docURI, 'Test Document');

      expect(layerURI).toBe(`${docURI}/DocumentLayer`);
      const serialized = serializeDocument(doc);
      expect(serialized).toContain('powla:DocumentLayer');
      expect(serialized).toContain('Test Document Document Layer');
    });
  });

  describe('addCitationStructureHeader', () => {
    test('should add citation structure header', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const docURI = 'http://example.org/doc';
      const sentenceURIs = [
        'http://example.org/sent1',
        'http://example.org/sent2',
      ];
      const citeURI = addCitationStructureHeader(
        doc,
        docURI,
        'Test Document',
        sentenceURIs,
      );

      expect(citeURI).toBe(`${docURI}/CiteStructure`);
      const serialized = serializeDocument(doc);
      expect(serialized).toContain('lila_corpus:CitationStructure');
      expect(serialized).toContain('lila_corpus:first');
      expect(serialized).toContain('lila_corpus:last');
    });

    test('should throw error for empty sentenceURIs', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      expect(() => {
        addCitationStructureHeader(doc, 'http://example.org/doc', 'Test', []);
      }).toThrow('sentenceURIs must not be empty');
    });
  });

  describe('addCitationSentence', () => {
    test('should add citation sentence with all properties', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const sentURI = 'http://example.org/sent1';
      const tokenURIs = ['http://example.org/token1', 'http://example.org/token2'];
      addCitationSentence(
        doc,
        sentURI,
        tokenURIs,
        1,
        2,
        undefined,
        'http://example.org/sent2',
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('lila_corpus:citationUnit');
      expect(serialized).toContain('lila_corpus:hasCitLevel');
      expect(serialized).toContain('Sentence_1');
      expect(serialized).toContain('powla:hasChild');
    });

    test('should throw error for empty tokenURIs', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      expect(() => {
        addCitationSentence(
          doc,
          'http://example.org/sent1',
          [],
          1,
          1,
          undefined,
          undefined,
        );
      }).toThrow('tokenURIs must not be empty');
    });
  });

  describe('addToken', () => {
    test('should add token with basic properties', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const tokenURI = 'http://example.org/token1';
      const docLayerURI = 'http://example.org/docLayer';
      addToken(
        doc,
        tokenURI,
        { form: 'test' },
        docLayerURI,
        undefined,
        undefined,
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('powla:Terminal');
      expect(serialized).toContain('powla:hasStringValue');
      expect(serialized).toContain('"test"');
    });

    test('should add token with lemma if present', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const tokenURI = 'http://example.org/token1';
      const docLayerURI = 'http://example.org/docLayer';
      addToken(
        doc,
        tokenURI,
        {
          form: 'test',
          misc: ['LiITALinkedURIs=["http://liita.it/data/id/lemma/123"]'],
        },
        docLayerURI,
        undefined,
        undefined,
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('lilaOntology:hasLemma');
      expect(serialized).toContain('liitaLemma:123');
    });

    test('should add next and previous token links', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const tokenURI = 'http://example.org/token1';
      const docLayerURI = 'http://example.org/docLayer';
      addToken(
        doc,
        tokenURI,
        { form: 'test' },
        docLayerURI,
        'http://example.org/token0',
        'http://example.org/token2',
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('powla:next');
      expect(serialized).toContain('powla:previous');
    });
  });

  describe('addUDAnnotationLayerHeader', () => {
    test('should add UD annotation layer header', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const docURI = 'http://example.org/doc';
      const udSentURIs = ['http://example.org/udSent1'];
      const layerURI = addUDAnnotationLayerHeader(
        doc,
        docURI,
        'Test Document',
        udSentURIs,
      );

      expect(layerURI).toBe(`${docURI}/UDAnnotationLayer`);
      const serialized = serializeDocument(doc);
      expect(serialized).toContain('lila_corpus:SyntacticAnnotation');
    });

    test('should throw error for empty udSentURIs', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      expect(() => {
        addUDAnnotationLayerHeader(doc, 'http://example.org/doc', 'Test', []);
      }).toThrow('udSentURIs must not be empty');
    });
  });

  describe('addUDSentence', () => {
    test('should add UD sentence with all properties', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const udSentURI = 'http://example.org/udSent1';
      const tokenURIs = ['http://example.org/token1'];
      addUDSentence(
        doc,
        udSentURI,
        tokenURIs,
        1,
        2,
        undefined,
        'http://example.org/udSent2',
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('powla:Root');
      expect(serialized).toContain('powla:hasTerminal');
      expect(serialized).toContain('powla:firstTerminal');
      expect(serialized).toContain('powla:lastTerminal');
    });

    test('should throw error for empty tokenURIs', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      expect(() => {
        addUDSentence(
          doc,
          'http://example.org/udSent1',
          [],
          1,
          1,
          undefined,
          undefined,
        );
      }).toThrow('tokenURIs must not be empty');
    });
  });

  describe('addDependencyRelation', () => {
    test('should add dependency relation with head token', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const depURI = 'http://example.org/dep1';
      const token = { deprel: 'nsubj', head: '2' };
      addDependencyRelation(
        doc,
        depURI,
        token,
        'http://example.org/token1',
        'http://example.org/token2',
        'http://example.org/udSent1',
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('UD_tag:nsubj');
      expect(serialized).toContain('lila_corpus:hasDep');
      expect(serialized).toContain('lila_corpus:hasHead');
    });

    test('should add root dependency relation', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const depURI = 'http://example.org/dep1';
      const token = { deprel: 'root' };
      addDependencyRelation(
        doc,
        depURI,
        token,
        'http://example.org/token1',
        undefined,
        'http://example.org/udSent1',
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('UD_tag:root');
    });
  });

  describe('addMorphologyAnnotationLayerHeader', () => {
    test('should add morphology annotation layer header', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const docURI = 'http://example.org/doc';
      const layerURI = addMorphologyAnnotationLayerHeader(
        doc,
        docURI,
        'Test Document',
      );

      expect(layerURI).toBe(`${docURI}/UDMorphologyAnnotationLayer`);
      const serialized = serializeDocument(doc);
      expect(serialized).toContain('powla:DocumentLayer');
      expect(serialized).toContain('UD Morphology Annotation Layer');
    });
  });

  describe('addMorphologyAnnotation', () => {
    test('should add morphology annotation with features', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const morphURI = 'http://example.org/morph1';
      const morphLayerURI = 'http://example.org/morphLayer';
      const tokenURI = 'http://example.org/token1';
      addMorphologyAnnotation(
        doc,
        morphURI,
        { form: 'test', feats: { Case: 'Nom' } },
        morphLayerURI,
        tokenURI,
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('oa:Annotation');
      expect(serialized).toContain('oa:hasBody');
      expect(serialized).toContain('oa:hasTarget');
    });

    test('should add morphology annotation without features', () => {
      const doc = createDocument();
      addAllPrefixes(doc);
      const morphURI = 'http://example.org/morph1';
      const morphLayerURI = 'http://example.org/morphLayer';
      const tokenURI = 'http://example.org/token1';
      addMorphologyAnnotation(
        doc,
        morphURI,
        { form: 'test' },
        morphLayerURI,
        tokenURI,
      );

      const serialized = serializeDocument(doc);
      expect(serialized).toContain('oa:Annotation');
      expect(serialized).toContain('https://universaldependencies.org/it/feat/');
    });
  });

  describe('extractMetadata', () => {
    test('should extract metadata from document', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [
              { type: 'metadata', key: 'docId', value: 'test1' },
              { type: 'metadata', key: 'docTitle', value: 'Test Doc' },
              { type: 'metadata', key: 'contributor', value: 'Contributor' },
              { type: 'metadata', key: 'corpusRef', value: 'http://example.org/corpus' },
              { type: 'metadata', key: 'docAuthor', value: 'http://example.org/author' },
              { type: 'metadata', key: 'seeAlso', value: 'http://example.org/seealso' },
              { type: 'metadata', key: 'description', value: 'Description' },
            ],
            tokens: [],
          },
        ],
      };

      const metadata = extractMetadata(document);
      expect(metadata.docId).toBe('test1');
      expect(metadata.docTitle).toBe('Test Doc');
      expect(metadata.contributor).toBe('Contributor');
      expect(metadata.corpusRef).toBe('http://example.org/corpus');
      expect(metadata.docAuthor).toBe('http://example.org/author');
      expect(metadata.seeAlso).toBe('http://example.org/seealso');
      expect(metadata.description).toBe('Description');
    });

    test('should return empty strings for missing metadata', () => {
      const document: ConlluDocument = {
        sentences: [{ comments: [], tokens: [] }],
      };

      const metadata = extractMetadata(document);
      expect(metadata.docId).toBe('');
      expect(metadata.docTitle).toBe('');
      expect(metadata.contributor).toBe('');
    });
  });

  describe('conlluToTurtle integration', () => {
    test('should convert simple document to turtle', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [
              { type: 'metadata', key: 'docTitle', value: 'Test' },
              { type: 'metadata', key: 'corpusRef', value: 'http://example.org/corpus' },
            ],
            tokens: [
              {
                id: '1',
                form: 'Hello',
                lemma: 'hello',
                upos: 'INTJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: 'Contributor',
        corpusRef: 'http://example.org/corpus',
        docAuthor: 'http://example.org/author',
        seeAlso: 'http://example.org/seealso',
        description: 'Description',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: true,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      expect(result).toContain('@prefix');
      expect(result).toContain('powla:Document');
      expect(result).toContain('Hello');
    });

    test('should handle document without citation layer', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [],
            tokens: [
              {
                id: '1',
                form: 'Test',
                lemma: 'test',
                upos: 'NOUN',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: false,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      expect(result).toContain('powla:Document');
      expect(result).not.toContain('CitationStructure');
    });

    test('should filter out sentences with no tokens', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [{ type: 'metadata', key: 'docTitle', value: 'Test' }],
            tokens: [],
          },
          {
            comments: [],
            tokens: [
              {
                id: '1',
                form: 'Test',
                lemma: 'test',
                upos: 'NOUN',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      // Should only have one sentence (the one with tokens)
      expect(result).toContain('Sentence_1');
      expect(result).not.toContain('Sentence_2');
    });

    test('should handle document with multiple sentences', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [],
            tokens: [
              {
                id: '1',
                form: 'First',
                lemma: 'first',
                upos: 'ADJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
          {
            comments: [],
            tokens: [
              {
                id: '1',
                form: 'Second',
                lemma: 'second',
                upos: 'ADJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      expect(result).toContain('Sentence_1');
      expect(result).toContain('Sentence_2');
      expect(result).toContain('"First"');
      expect(result).toContain('"Second"');
    });

    test('should handle tokens with lemmas and features', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [],
            tokens: [
              {
                id: '1',
                form: 'Test',
                lemma: 'test',
                upos: 'NOUN',
                xpos: '_',
                feats: { Case: 'Nom', Gender: 'Fem' },
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [
                  'LiITALinkedURIs=["http://liita.it/data/id/lemma/123"]',
                ],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: true,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      expect(result).toContain('liitaLemma:123');
      expect(result).toContain('https://universaldependencies.org/it/feat/Case#Nom');
      expect(result).toContain('https://universaldependencies.org/it/feat/Gender#Fem');
    });
  });

  describe('newdoc and newpar support', () => {
    test('should create document and paragraph layers when both newdoc and newpar are present', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [
              { type: 'freeform', value: '# newdoc id = doc1' },
              { type: 'freeform', value: '# newpar id = para1' },
            ],
            tokens: [
              {
                id: '1',
                form: 'Hello',
                lemma: 'hello',
                upos: 'INTJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
          {
            comments: [],
            tokens: [
              {
                id: '1',
                form: 'World',
                lemma: 'world',
                upos: 'NOUN',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      // Should contain document citation unit
      expect(result).toContain('lila_corpus:citationUnit');
      expect(result).toContain('lila_corpus:hasRefType');
      expect(result).toContain('"Document"');
      expect(result).toContain('doc1');

      // Should contain paragraph citation unit
      expect(result).toContain('"Paragraph"');
      expect(result).toContain('para1');

      // Should contain sentence citation units
      expect(result).toContain('"Sentence"');
    });

    test('should create only paragraph layer when only newpar is present', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [{ type: 'freeform', value: '# newpar id = para1' }],
            tokens: [
              {
                id: '1',
                form: 'Hello',
                lemma: 'hello',
                upos: 'INTJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      // Should contain paragraph citation unit
      expect(result).toContain('"Paragraph"');
      expect(result).toContain('para1');

      // Should NOT contain document citation unit
      expect(result).not.toContain('hasRefType "Document"');

      // Should contain sentence citation units
      expect(result).toContain('"Sentence"');
    });

    test('should create only document layer when only newdoc is present', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [{ type: 'freeform', value: '# newdoc id = doc1' }],
            tokens: [
              {
                id: '1',
                form: 'Hello',
                lemma: 'hello',
                upos: 'INTJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      // Should contain document citation unit
      expect(result).toContain('hasRefType "Document"');
      expect(result).toContain('doc1');

      // Should NOT contain paragraph citation unit
      expect(result).not.toContain('hasRefType "Paragraph"');

      // Should contain sentence citation units
      expect(result).toContain('"Sentence"');
    });

    test('should use current behavior when neither newdoc nor newpar is present', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [],
            tokens: [
              {
                id: '1',
                form: 'Hello',
                lemma: 'hello',
                upos: 'INTJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      // Should NOT contain document citation unit
      expect(result).not.toContain('hasRefType "Document"');

      // Should NOT contain paragraph citation unit
      expect(result).not.toContain('hasRefType "Paragraph"');

      // Should contain sentence citation units (current behavior)
      expect(result).toContain('lila_corpus:citationUnit');
      expect(result).toContain('hasRefType "Sentence"');
    });

    test('should use custom labels from citationLayerLabels', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [
              { type: 'freeform', value: '# newdoc id = doc1' },
              { type: 'freeform', value: '# newpar id = para1' },
            ],
            tokens: [
              {
                id: '1',
                form: 'Hello',
                lemma: 'hello',
                upos: 'INTJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Chapter',
          paragraphLabel: 'Section',
          sentenceLabel: 'Line',
        },
      });

      // Should use custom labels
      expect(result).toContain('hasRefType "Chapter"');
      expect(result).toContain('hasRefType "Section"');
      expect(result).toContain('hasRefType "Line"');
    });

    test('should handle multiple documents and paragraphs', () => {
      const document: ConlluDocument = {
        sentences: [
          {
            comments: [
              { type: 'freeform', value: '# newdoc id = doc1' },
              { type: 'freeform', value: '# newpar id = para1' },
            ],
            tokens: [
              {
                id: '1',
                form: 'First',
                lemma: 'first',
                upos: 'ADJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
          {
            comments: [{ type: 'freeform', value: '# newpar id = para2' }],
            tokens: [
              {
                id: '1',
                form: 'Second',
                lemma: 'second',
                upos: 'ADJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
          {
            comments: [{ type: 'freeform', value: '# newdoc id = doc2' }],
            tokens: [
              {
                id: '1',
                form: 'Third',
                lemma: 'third',
                upos: 'ADJ',
                xpos: '_',
                feats: {},
                head: '0',
                deprel: 'root',
                deps: '_',
                misc: [],
              },
            ],
          },
        ],
      };

      const metadata: DocumentMetadata = {
        docId: 'test',
        docTitle: 'Test',
        contributor: '',
        corpusRef: 'http://example.org/corpus',
        docAuthor: '',
        seeAlso: '',
        description: '',
      };

      const result = conlluToTurtle(document, metadata, {
        includeCitationLayer: true,
        includeMorphologicalLayer: false,
        citationLayerLabels: {
          documentLabel: 'Document',
          paragraphLabel: 'Paragraph',
          sentenceLabel: 'Sentence',
        },
      });

      // Should contain both documents
      expect(result).toContain('doc1');
      expect(result).toContain('doc2');

      // Should contain both paragraphs (para1 in doc1, para2 in doc1)
      expect(result).toContain('para1');
      expect(result).toContain('para2');
    });
  });
});
