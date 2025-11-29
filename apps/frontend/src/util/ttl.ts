import type { ConlluDocument } from 'liita-textlinker-frontend/conllu';
import {
  addIntegerProperty,
  addLabel,
  addPrefix,
  addProperty,
  addStringProperty,
  addType,
  createDocument,
  type IRI,
  serializeDocument,
} from './turtle';

export interface DocumentMetadata {
  docId: string;
  docTitle: string;
  contributor: string;
  corpusRef: string;
  docAuthor: string;
  seeAlso: string;
  description: string;
}

export interface MISCField {
  LiITALinkedURIs?: string[];
  start_char?: number;
  end_char?: number;
  SpaceAfter?: string;
  SpacesAfter?: string;
  [key: string]: string | string[] | number | undefined;
}

// Constants for common URIs
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const _RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const DC_CONTRIBUTOR = 'http://purl.org/dc/elements/1.1/contributor';
const DC_DESCRIPTION = 'http://purl.org/dc/elements/1.1/description';
const DC_TITLE = 'http://purl.org/dc/elements/1.1/title';
const DC_TERMS_CREATOR = 'http://purl.org/dc/terms/creator';
const RDFS_SEE_ALSO = 'http://www.w3.org/2000/01/rdf-schema#seeAlso';
const POWLA_DOCUMENT = 'http://purl.org/powla/powla.owl#Document';
const POWLA_DOCUMENT_LAYER = 'http://purl.org/powla/powla.owl#DocumentLayer';
const POWLA_TERMINAL = 'http://purl.org/powla/powla.owl#Terminal';
const POWLA_ROOT = 'http://purl.org/powla/powla.owl#Root';
const POWLA_HAS_DOCUMENT = 'http://purl.org/powla/powla.owl#hasDocument';
const POWLA_HAS_LAYER = 'http://purl.org/powla/powla.owl#hasLayer';
const POWLA_HAS_STRING_VALUE = 'http://purl.org/powla/powla.owl#hasStringValue';
const POWLA_HAS_CHILD = 'http://purl.org/powla/powla.owl#hasChild';
const POWLA_NEXT = 'http://purl.org/powla/powla.owl#next';
const POWLA_PREVIOUS = 'http://purl.org/powla/powla.owl#previous';
const POWLA_FIRST_TERMINAL = 'http://purl.org/powla/powla.owl#firstTerminal';
const POWLA_HAS_TERMINAL = 'http://purl.org/powla/powla.owl#hasTerminal';
const POWLA_LAST_TERMINAL = 'http://purl.org/powla/powla.owl#lastTerminal';
const POWLA_HAS_SUB_DOCUMENT = 'http://purl.org/powla/powla.owl#hasSubDocument';
const LILA_CORPUS_CITATION_STRUCTURE =
  'http://lila-erc.eu/ontologies/lila_corpora#CitationStructure';
const LILA_CORPUS_CITATION_UNIT =
  'http://lila-erc.eu/ontologies/lila_corpora#citationUnit';
const LILA_CORPUS_SYNTACTIC_ANNOTATION =
  'http://lila-erc.eu/ontologies/lila_corpora#SyntacticAnnotation';
const LILA_CORPUS_FIRST = 'http://lila-erc.eu/ontologies/lila_corpora#first';
const LILA_CORPUS_LAST = 'http://lila-erc.eu/ontologies/lila_corpora#last';
const LILA_CORPUS_IS_LAYER =
  'http://lila-erc.eu/ontologies/lila_corpora#isLayer';
const LILA_CORPUS_HAS_CIT_LEVEL =
  'http://lila-erc.eu/ontologies/lila_corpora#hasCitLevel';
const LILA_CORPUS_HAS_REF_TYPE =
  'http://lila-erc.eu/ontologies/lila_corpora#hasRefType';
const LILA_CORPUS_HAS_REF_VALUE =
  'http://lila-erc.eu/ontologies/lila_corpora#hasRefValue';
const LILA_CORPUS_HAS_DEP = 'http://lila-erc.eu/ontologies/lila_corpora#hasDep';
const LILA_CORPUS_HAS_HEAD =
  'http://lila-erc.eu/ontologies/lila_corpora#hasHead';
const LILA_ONTOLOGY_HAS_LEMMA = 'http://lila-erc.eu/ontologies/lila#hasLemma';
const OA_ANNOTATION = 'http://www.w3.org/ns/oa#Annotation';
const OA_HAS_BODY = 'http://www.w3.org/ns/oa#hasBody';
const OA_HAS_TARGET = 'http://www.w3.org/ns/oa#hasTarget';
const _XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer';

// Label constants
const REF_TYPE_SENTENCE = 'Sentence';
const LAYER_TITLE_CITATION = 'Citation Layer';
const LAYER_TITLE_DOCUMENT = 'Document Layer';
const LAYER_TITLE_UD_ANNOTATION = 'UD Annotation Layer';
const LAYER_TITLE_UD_MORPHOLOGY = 'UD Morphology Annotation Layer';

/**
 * Parse MISC field to extract structured information
 */
export function parseMiscField(misc: string[] | undefined): MISCField {
  if (!misc) return {};

  const result: MISCField = {};

  for (const item of misc) {
    const eqIndex = item.indexOf('=');
    if (eqIndex === -1) continue;

    const key = item.substring(0, eqIndex);
    const value = item.substring(eqIndex + 1);

    if (key === 'LiITALinkedURIs') {
      // Parse JSON array
      try {
        const parsed = JSON.parse(value) as string[];
        result[key] = parsed;
      } catch {
        result[key] = [];
      }
    } else if (key === 'start_char' || key === 'end_char') {
      result[key] = parseInt(value, 10);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Parse newdoc or newpar comment from any comment type
 * Returns { type: 'newdoc' | 'newpar', id: string } or null
 */
export function parseNewdocNewpar(
  comment: { type: string; value?: string; key?: string;[key: string]: any },
): { type: 'newdoc' | 'newpar'; id: string } | null {
  // Handle direct newdoc/newpar comment types (if parser supports them)
  if (comment.type === 'newdoc') {
    return {
      type: 'newdoc',
      id: (comment.value || comment.id || '').trim(),
    };
  }
  if (comment.type === 'newpar') {
    return {
      type: 'newpar',
      id: (comment.value || comment.id || '').trim(),
    };
  }

  // Handle freeform comments (value contains the full comment text)
  if (comment.type === 'freeform' && comment.value) {
    const value = comment.value.trim();

    // Match: # newdoc id = <id> or # newdoc
    const newdocMatch = value.match(/^#\s*newdoc(?:\s+id\s*=\s*(.+))?$/i);
    if (newdocMatch) {
      return {
        type: 'newdoc',
        id: newdocMatch[1]?.trim() || '',
      };
    }

    // Match: # newpar id = <id> or # newpar
    const newparMatch = value.match(/^#\s*newpar(?:\s+id\s*=\s*(.+))?$/i);
    if (newparMatch) {
      return {
        type: 'newpar',
        id: newparMatch[1]?.trim() || '',
      };
    }
  }

  // Handle metadata comments (key-value format)
  // Some parsers might structure newdoc/newpar as metadata comments
  if (comment.type === 'metadata' && comment.key) {
    if (comment.key === 'newdoc') {
      return {
        type: 'newdoc',
        id: comment.value?.trim() || '',
      };
    }
    if (comment.key === 'newpar') {
      return {
        type: 'newpar',
        id: comment.value?.trim() || '',
      };
    }
  }

  // Fallback: check if comment has any text that matches newdoc/newpar pattern
  // This handles cases where the parser structure is unknown
  const textToCheck = comment.value || String(comment);
  if (typeof textToCheck === 'string') {
    const trimmed = textToCheck.trim();
    const newdocMatch = trimmed.match(/newdoc(?:\s+id\s*=\s*(.+))?/i);
    if (newdocMatch) {
      return {
        type: 'newdoc',
        id: newdocMatch[1]?.trim() || '',
      };
    }
    const newparMatch = trimmed.match(/newpar(?:\s+id\s*=\s*(.+))?/i);
    if (newparMatch) {
      return {
        type: 'newpar',
        id: newparMatch[1]?.trim() || '',
      };
    }
  }

  return null;
}

/**
 * Generate document citation unit URI
 */
export function generateDocumentCitationURI(
  corpusRef: string,
  docTitle: string,
  docId: string,
  docIndex: number,
  documentLabel: string = 'Document',
): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  const id = docId || `${documentLabel}_${docIndex}`;
  return `${corpusRef}/${encodedDoc}/CiteStructure/${encodeURIComponent(id)}`;
}

/**
 * Generate paragraph citation unit URI (nested under document if provided)
 */
export function generateParagraphCitationURI(
  corpusRef: string,
  docTitle: string,
  paraId: string,
  paraIndex: number,
  paragraphLabel: string = 'Paragraph',
  parentDocId?: string,
  parentDocIndex?: number,
  parentDocumentLabel: string = 'Document',
): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  const id = paraId || `${paragraphLabel}_${paraIndex}`;
  const basePath = parentDocId || parentDocIndex !== undefined
    ? `CiteStructure/${encodeURIComponent(parentDocId || `${parentDocumentLabel}_${parentDocIndex}`)}`
    : 'CiteStructure';
  return `${corpusRef}/${encodedDoc}/${basePath}/${encodeURIComponent(id)}`;
}

/**
 * Generate sentence URI (nested under document/paragraph if provided)
 */
export function generateSentenceURI(
  corpusRef: string,
  docTitle: string,
  sentenceNum: number,
  parentDocId?: string,
  parentDocIndex?: number,
  parentParaId?: string,
  parentParaIndex?: number,
  parentDocumentLabel: string = 'Document',
  parentParagraphLabel: string = 'Paragraph',
): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  const pathParts: string[] = ['CiteStructure'];

  if (parentDocId || parentDocIndex !== undefined) {
    const docId = parentDocId || `${parentDocumentLabel}_${parentDocIndex}`;
    pathParts.push(encodeURIComponent(docId));
  }

  if (parentParaId || parentParaIndex !== undefined) {
    const paraId = parentParaId || `${parentParagraphLabel}_${parentParaIndex}`;
    pathParts.push(encodeURIComponent(paraId));
  }

  pathParts.push(`s${sentenceNum}`);

  return `${corpusRef}/${encodedDoc}/${pathParts.join('/')}`;
}

/**
 * Generate token URI (nested under sentence URI)
 */
export function generateTokenURI(
  sentURI: IRI,
  tokenNum: number,
): IRI {
  // URI format: .../sN or .../docX/paraY/sN
  // Token format: tN (separate from sentence)
  return `${sentURI}/t${tokenNum}`;
}

/**
 * Generate UD dependency relation URI
 */
export function generateUDDepURI(
  corpusRef: string,
  docTitle: string,
  sentNum: number,
  tokenId: number,
): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `${corpusRef}/${encodedDoc}/UD/s${sentNum}t${tokenId}`;
}

/**
 * Generate UD annotation layer sentence URI
 */
export function generateUDLayerSentenceURI(
  corpusRef: string,
  docTitle: string,
  sentenceNum: number,
): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `${corpusRef}/${encodedDoc}/UDAnnotationLayer/Sentence_${sentenceNum}`;
}

/**
 * Generate UD morphology annotation URI
 */
export function generateMorphologyAnnotationURI(
  corpusRef: string,
  docTitle: string,
  sentNum: number,
  tokenId: number,
): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `${corpusRef}/${encodedDoc}/UDMorphologyAnnotationLayer/id/s${sentNum}t${tokenId}`;
}

/**
 * Determine lemma prefix based on URI
 */
export function getLemmaPrefix(uri: string): 'liitaLemma' | 'liitaIpoLemma' {
  if (uri.includes('/hypolemma/')) {
    return 'liitaIpoLemma';
  }
  return 'liitaLemma';
}

/**
 * Extract lemma ID from URI
 */
export function extractLemmaId(uri: string): string {
  const match = uri.match(/\/id\/(?:hypo)?lemma\/(\d+)/);
  return match ? match[1] : '';
}

/**
 * Convert features to UD feature URLs
 */
export function featuresToUDURLs(feats: Record<string, string> | undefined): IRI[] {
  if (!feats) return [];

  return Object.entries(feats).map(([key, value]) => {
    return `https://universaldependencies.org/it/feat/${key}#${value}` as IRI;
  });
}

/**
 * Convert full URI to prefixed URI if a matching prefix exists
 */
export function toPrefixedURI(uri: string): string {
  // Map of prefix URIs to their prefix names
  const prefixMap: Record<string, string> = {
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
    'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
    'http://purl.org/dc/elements/1.1/': 'dc',
    'http://purl.org/powla/powla.owl#': 'powla',
    'http://lila-erc.eu/ontologies/lila_corpora#': 'lila_corpus',
    'http://lila-erc.eu/ontologies/lila#': 'lilaOntology',
    'http://www.w3.org/ns/oa#': 'oa',
    'http://www.w3.org/2001/XMLSchema#': 'xsd',
    'https://universaldependencies.org/u/dep/': 'UD_tag',
  };

  for (const [prefixURI, prefixName] of Object.entries(prefixMap)) {
    if (uri.startsWith(prefixURI)) {
      const localName = uri.substring(prefixURI.length);
      return `${prefixName}:${localName}`;
    }
  }

  return uri;
}

/**
 * Generate document URI from document title
 */
export function generateDocumentURI(corpusRef: string, docTitle: string): IRI {
  const docTitleEncoded = encodeURIComponent(docTitle);
  return `${corpusRef}/${docTitleEncoded}`;
}

/**
 * Process tokens in a sentence and add them to the document
 */
export function processSentenceTokens(
  doc: ReturnType<typeof createDocument>,
  sentence: { tokens: Array<{ form: string; misc?: string[] }> },
  tokenURIs: IRI[],
  docLayerURI: IRI,
): void {
  for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
    const token = sentence.tokens[tIdx];
    const tokenURI = tokenURIs[tIdx];
    const nextTokenURI =
      tIdx < sentence.tokens.length - 1 ? tokenURIs[tIdx + 1] : undefined;
    const prevTokenURI = tIdx > 0 ? tokenURIs[tIdx - 1] : undefined;
    addToken(doc, tokenURI, token, docLayerURI, prevTokenURI, nextTokenURI);
  }
}

/**
 * Process a sentence in citation layer
 */
export function processCitationSentence(
  doc: ReturnType<typeof createDocument>,
  sentence: { tokens: Array<{ form: string; misc?: string[] }> },
  docTitle: string,
  sentNum: number,
  totalSentences: number,
  docLayerURI: IRI,
  prevSentURI: IRI | undefined,
  nextSentURI: IRI | undefined,
  sentenceLabel: string = REF_TYPE_SENTENCE,
  sentURI?: IRI, // Optional: if provided, use this instead of generating
): void {
  // Note: sentURI should always be provided now, but keep fallback for safety
  // Fallback uses default corpusRef - this should rarely be used
  const defaultCorpusRef = 'http://liita.it/data/corpora/Pirandelita/corpus';
  const finalSentURI = sentURI || generateSentenceURI(defaultCorpusRef, docTitle, sentNum);
  const tokenURIs = sentence.tokens.map((_, tIdx) =>
    generateTokenURI(finalSentURI, tIdx + 1),
  );

  addCitationSentence(
    doc,
    finalSentURI,
    tokenURIs,
    sentNum,
    totalSentences,
    prevSentURI,
    nextSentURI,
    sentenceLabel,
  );

  processSentenceTokens(doc, sentence, tokenURIs, docLayerURI);
}

/**
 * Process a sentence without citation layer (tokens only)
 */
export function processSentenceTokensOnly(
  doc: ReturnType<typeof createDocument>,
  sentence: { tokens: Array<{ form: string; misc?: string[] }> },
  docTitle: string,
  sentNum: number,
  docLayerURI: IRI,
  sentURI?: IRI, // Optional: if provided, use this for token URI generation
): void {
  // Note: sentURI should always be provided now, but keep fallback for safety
  // Fallback uses default corpusRef - this should rarely be used
  const defaultCorpusRef = 'http://liita.it/data/corpora/Pirandelita/corpus';
  const finalSentURI = sentURI || generateSentenceURI(defaultCorpusRef, docTitle, sentNum);
  const tokenURIs = sentence.tokens.map((_, tIdx) =>
    generateTokenURI(finalSentURI, tIdx + 1),
  );

  processSentenceTokens(doc, sentence, tokenURIs, docLayerURI);
}

/**
 * Options for controlling which layers to include in the output
 */
export interface ConlluToTurtleOptions {
  /** Include citation layer (default: true) */
  includeCitationLayer?: boolean;
  /** Include morphological layer (default: true) */
  includeMorphologicalLayer?: boolean;
  citationLayerLabels: {
    documentLabel: string;
    paragraphLabel: string;
    sentenceLabel: string;
  }
}

/**
 * Add all standard prefixes to the document
 */
export function addAllPrefixes(
  doc: ReturnType<typeof createDocument>,
): void {
  addPrefix(doc, 'UD_tag', 'https://universaldependencies.org/u/dep/');
  addPrefix(doc, 'dc', 'http://purl.org/dc/elements/1.1/');
  addPrefix(doc, 'liitaIpoLemma', 'http://liita.it/data/id/hypolemma/');
  addPrefix(doc, 'liitaLemma', 'http://liita.it/data/id/lemma/');
  addPrefix(doc, 'lila', 'http://liita.it/data/corpora/');
  addPrefix(doc, 'lilaOntology', 'http://lila-erc.eu/ontologies/lila/');
  addPrefix(doc, 'lila_authors', 'http://liita.it/data/corpora/id/authors/');
  addPrefix(doc, 'lila_corpus', 'http://lila-erc.eu/ontologies/lila_corpora/');
  addPrefix(doc, 'oa', 'http://www.w3.org/ns/oa#');
  addPrefix(doc, 'ontolex', 'http://www.w3.org/ns/lemon/ontolex#');
  addPrefix(doc, 'owl', 'http://www.w3.org/2002/07/owl#');
  addPrefix(doc, 'powla', 'http://purl.org/powla/powla.owl#');
  addPrefix(doc, 'rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
  addPrefix(doc, 'xsd', 'http://www.w3.org/2001/XMLSchema#');
}

/**
 * Add document metadata to the document
 */
export function addDocumentMetadata(
  doc: ReturnType<typeof createDocument>,
  docURI: IRI,
  corpusRefURI: IRI,
  metadata: DocumentMetadata,
): void {
  addType(doc, docURI, toPrefixedURI(POWLA_DOCUMENT));
  addStringProperty(
    doc,
    docURI,
    toPrefixedURI(DC_CONTRIBUTOR),
    metadata.contributor,
  );
  addStringProperty(
    doc,
    docURI,
    toPrefixedURI(DC_DESCRIPTION),
    metadata.description,
  );
  addStringProperty(doc, docURI, toPrefixedURI(DC_TITLE), metadata.docTitle);
  addProperty(doc, docURI, DC_TERMS_CREATOR, metadata.docAuthor); // No prefix for dc:terms
  addProperty(doc, docURI, toPrefixedURI(RDFS_SEE_ALSO), metadata.seeAlso);

  // Corpus has subdocument
  addProperty(doc, corpusRefURI, toPrefixedURI(POWLA_HAS_SUB_DOCUMENT), docURI);
}

/**
 * Add document layer to the document
 */
export function addDocumentLayer(
  doc: ReturnType<typeof createDocument>,
  docURI: IRI,
  docTitle: string,
): IRI {
  const docLayerURI = `${docURI}/DocumentLayer`;
  addType(doc, docLayerURI, toPrefixedURI(POWLA_DOCUMENT_LAYER));
  addStringProperty(
    doc,
    docLayerURI,
    toPrefixedURI(DC_DESCRIPTION),
    `${docTitle} Document Layer`,
  );
  addStringProperty(
    doc,
    docLayerURI,
    toPrefixedURI(DC_TITLE),
    LAYER_TITLE_DOCUMENT,
  );
  addProperty(doc, docLayerURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);
  return docLayerURI;
}

/**
 * Add citation structure header to the document
 */
export function addCitationStructureHeader(
  doc: ReturnType<typeof createDocument>,
  docURI: IRI,
  docTitle: string,
  sentenceURIs: IRI[],
): IRI {
  if (sentenceURIs.length === 0) {
    throw new Error('sentenceURIs must not be empty');
  }

  const citeStructureURI = `${docURI}/CiteStructure`;
  addType(doc, citeStructureURI, toPrefixedURI(LILA_CORPUS_CITATION_STRUCTURE));
  addProperty(
    doc,
    citeStructureURI,
    toPrefixedURI(LILA_CORPUS_FIRST),
    sentenceURIs[0],
  );
  // Add multiple isLayer relationships
  for (const sentURI of sentenceURIs) {
    addProperty(
      doc,
      citeStructureURI,
      toPrefixedURI(LILA_CORPUS_IS_LAYER),
      sentURI,
    );
  }
  addProperty(
    doc,
    citeStructureURI,
    toPrefixedURI(LILA_CORPUS_LAST),
    sentenceURIs[sentenceURIs.length - 1],
  );
  addStringProperty(
    doc,
    citeStructureURI,
    toPrefixedURI(DC_DESCRIPTION),
    `${docTitle} Citation Layer`,
  );
  addStringProperty(
    doc,
    citeStructureURI,
    toPrefixedURI(DC_TITLE),
    LAYER_TITLE_CITATION,
  );
  addProperty(doc, citeStructureURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);
  return citeStructureURI;
}

/**
 * Add a document citation unit to the document
 */
export function addCitationDocument(
  doc: ReturnType<typeof createDocument>,
  docURI: IRI,
  docId: string,
  docIndex: number,
  childURIs: IRI[],
  label: string,
  prevDocURI: IRI | undefined,
  nextDocURI: IRI | undefined,
): void {
  if (childURIs.length === 0) {
    throw new Error('childURIs must not be empty');
  }

  addType(doc, docURI, toPrefixedURI(LILA_CORPUS_CITATION_UNIT));
  addProperty(doc, docURI, toPrefixedURI(LILA_CORPUS_FIRST), childURIs[0]);
  addIntegerProperty(
    doc,
    docURI,
    toPrefixedURI(LILA_CORPUS_HAS_CIT_LEVEL),
    1,
  );
  addStringProperty(
    doc,
    docURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_TYPE),
    label,
  );
  const refValue = docId || `${label}_${docIndex}`;
  addStringProperty(
    doc,
    docURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_VALUE),
    refValue,
  );
  addProperty(
    doc,
    docURI,
    toPrefixedURI(LILA_CORPUS_LAST),
    childURIs[childURIs.length - 1],
  );
  // Add multiple hasChild relationships
  for (const childURI of childURIs) {
    addProperty(doc, docURI, toPrefixedURI(POWLA_HAS_CHILD), childURI);
  }
  if (nextDocURI) {
    addProperty(doc, docURI, toPrefixedURI(POWLA_NEXT), nextDocURI);
  }
  if (prevDocURI) {
    addProperty(doc, docURI, toPrefixedURI(POWLA_PREVIOUS), prevDocURI);
  }
  const displayName = docId || `${label} ${docIndex}`;
  addLabel(doc, docURI, displayName);
}

/**
 * Add a paragraph citation unit to the document
 */
export function addCitationParagraph(
  doc: ReturnType<typeof createDocument>,
  paraURI: IRI,
  paraId: string,
  paraIndex: number,
  childURIs: IRI[],
  label: string,
  prevParaURI: IRI | undefined,
  nextParaURI: IRI | undefined,
): void {
  if (childURIs.length === 0) {
    throw new Error('childURIs must not be empty');
  }

  addType(doc, paraURI, toPrefixedURI(LILA_CORPUS_CITATION_UNIT));
  addProperty(doc, paraURI, toPrefixedURI(LILA_CORPUS_FIRST), childURIs[0]);
  addIntegerProperty(
    doc,
    paraURI,
    toPrefixedURI(LILA_CORPUS_HAS_CIT_LEVEL),
    1,
  );
  addStringProperty(
    doc,
    paraURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_TYPE),
    label,
  );
  const refValue = paraId || `${label}_${paraIndex}`;
  addStringProperty(
    doc,
    paraURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_VALUE),
    refValue,
  );
  addProperty(
    doc,
    paraURI,
    toPrefixedURI(LILA_CORPUS_LAST),
    childURIs[childURIs.length - 1],
  );
  // Add multiple hasChild relationships
  for (const childURI of childURIs) {
    addProperty(doc, paraURI, toPrefixedURI(POWLA_HAS_CHILD), childURI);
  }
  if (nextParaURI) {
    addProperty(doc, paraURI, toPrefixedURI(POWLA_NEXT), nextParaURI);
  }
  if (prevParaURI) {
    addProperty(doc, paraURI, toPrefixedURI(POWLA_PREVIOUS), prevParaURI);
  }
  const displayName = paraId || `${label} ${paraIndex}`;
  addLabel(doc, paraURI, displayName);
}

/**
 * Add a citation sentence to the document
 */
export function addCitationSentence(
  doc: ReturnType<typeof createDocument>,
  sentURI: IRI,
  tokenURIs: IRI[],
  sentNum: number,
  totalSentences: number,
  prevSentURI: IRI | undefined,
  nextSentURI: IRI | undefined,
  sentenceLabel: string = REF_TYPE_SENTENCE,
): void {
  if (tokenURIs.length === 0) {
    throw new Error('tokenURIs must not be empty');
  }

  addType(doc, sentURI, toPrefixedURI(LILA_CORPUS_CITATION_UNIT));
  addProperty(doc, sentURI, toPrefixedURI(LILA_CORPUS_FIRST), tokenURIs[0]);
  addIntegerProperty(
    doc,
    sentURI,
    toPrefixedURI(LILA_CORPUS_HAS_CIT_LEVEL),
    1,
  );
  addStringProperty(
    doc,
    sentURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_TYPE),
    sentenceLabel,
  );
  addStringProperty(
    doc,
    sentURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_VALUE),
    `${sentenceLabel}_${sentNum}`,
  );
  addProperty(
    doc,
    sentURI,
    toPrefixedURI(LILA_CORPUS_LAST),
    tokenURIs[tokenURIs.length - 1],
  );
  // Add multiple hasChild relationships
  for (const tokenURI of tokenURIs) {
    addProperty(doc, sentURI, toPrefixedURI(POWLA_HAS_CHILD), tokenURI);
  }
  if (nextSentURI) {
    addProperty(doc, sentURI, toPrefixedURI(POWLA_NEXT), nextSentURI);
  }
  if (prevSentURI) {
    addProperty(doc, sentURI, toPrefixedURI(POWLA_PREVIOUS), prevSentURI);
  }
  addLabel(doc, sentURI, `${sentenceLabel} ${sentNum}`);
}

/**
 * Add a token to the document
 */
export function addToken(
  doc: ReturnType<typeof createDocument>,
  tokenURI: IRI,
  token: { form: string; misc?: string[] },
  docLayerURI: IRI,
  prevTokenURI: IRI | undefined,
  nextTokenURI: IRI | undefined,
): void {
  const miscData = parseMiscField(token.misc);

  addType(doc, tokenURI, toPrefixedURI(POWLA_TERMINAL));

  // Add lemma if present
  const lemmas = miscData.LiITALinkedURIs || [];
  if (lemmas.length > 0) {
    const lemmaURI = lemmas[0];
    const prefix = getLemmaPrefix(lemmaURI);
    const id = extractLemmaId(lemmaURI);
    if (id) {
      // Use prefixed URI format: prefix:localName
      const lemmaPrefixedURI = `${prefix}:${id}`;
      addProperty(
        doc,
        tokenURI,
        toPrefixedURI(LILA_ONTOLOGY_HAS_LEMMA),
        lemmaPrefixedURI,
      );
    }
  }

  addProperty(doc, tokenURI, toPrefixedURI(POWLA_HAS_LAYER), docLayerURI);
  addStringProperty(
    doc,
    tokenURI,
    toPrefixedURI(POWLA_HAS_STRING_VALUE),
    token.form,
  );

  if (nextTokenURI) {
    addProperty(doc, tokenURI, toPrefixedURI(POWLA_NEXT), nextTokenURI);
  }
  if (prevTokenURI) {
    addProperty(doc, tokenURI, toPrefixedURI(POWLA_PREVIOUS), prevTokenURI);
  }

  addLabel(doc, tokenURI, token.form);
}

/**
 * Add UD annotation layer header to the document
 */
export function addUDAnnotationLayerHeader(
  doc: ReturnType<typeof createDocument>,
  docURI: IRI,
  docTitle: string,
  udSentURIs: IRI[],
): IRI {
  if (udSentURIs.length === 0) {
    throw new Error('udSentURIs must not be empty');
  }

  const udLayerURI = `${docURI}/UDAnnotationLayer`;
  addType(doc, udLayerURI, toPrefixedURI(LILA_CORPUS_SYNTACTIC_ANNOTATION));
  addProperty(doc, udLayerURI, toPrefixedURI(LILA_CORPUS_FIRST), udSentURIs[0]);
  // Add multiple isLayer relationships
  for (const udSentURI of udSentURIs) {
    addProperty(
      doc,
      udLayerURI,
      toPrefixedURI(LILA_CORPUS_IS_LAYER),
      udSentURI,
    );
  }
  addProperty(
    doc,
    udLayerURI,
    toPrefixedURI(LILA_CORPUS_LAST),
    udSentURIs[udSentURIs.length - 1],
  );
  addStringProperty(
    doc,
    udLayerURI,
    toPrefixedURI(DC_DESCRIPTION),
    `${docTitle} Universal Dependencies syntactic annotation layer`,
  );
  addStringProperty(
    doc,
    udLayerURI,
    toPrefixedURI(DC_TITLE),
    `${docTitle} ${LAYER_TITLE_UD_ANNOTATION}`,
  );
  addProperty(doc, udLayerURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);
  return udLayerURI;
}

/**
 * Add a UD sentence to the document
 */
export function addUDSentence(
  doc: ReturnType<typeof createDocument>,
  udSentURI: IRI,
  tokenURIs: IRI[],
  sentNum: number,
  totalSentences: number,
  prevUdSentURI: IRI | undefined,
  nextUdSentURI: IRI | undefined,
): void {
  if (tokenURIs.length === 0) {
    throw new Error('tokenURIs must not be empty');
  }

  addType(doc, udSentURI, toPrefixedURI(POWLA_ROOT));
  addIntegerProperty(
    doc,
    udSentURI,
    toPrefixedURI(LILA_CORPUS_HAS_CIT_LEVEL),
    1,
  );
  addStringProperty(
    doc,
    udSentURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_TYPE),
    REF_TYPE_SENTENCE,
  );
  addStringProperty(
    doc,
    udSentURI,
    toPrefixedURI(LILA_CORPUS_HAS_REF_VALUE),
    `Sentence_${sentNum}`,
  );
  addProperty(
    doc,
    udSentURI,
    toPrefixedURI(POWLA_FIRST_TERMINAL),
    tokenURIs[0],
  );
  // Add multiple hasTerminal relationships
  for (const tokenURI of tokenURIs) {
    addProperty(doc, udSentURI, toPrefixedURI(POWLA_HAS_TERMINAL), tokenURI);
  }
  addProperty(
    doc,
    udSentURI,
    toPrefixedURI(POWLA_LAST_TERMINAL),
    tokenURIs[tokenURIs.length - 1],
  );
  if (nextUdSentURI) {
    addProperty(doc, udSentURI, toPrefixedURI(POWLA_NEXT), nextUdSentURI);
  }
  if (prevUdSentURI) {
    addProperty(doc, udSentURI, toPrefixedURI(POWLA_PREVIOUS), prevUdSentURI);
  }
  addLabel(doc, udSentURI, `Sentence ${sentNum}`);
}

/**
 * Add a dependency relation to the document
 */
export function addDependencyRelation(
  doc: ReturnType<typeof createDocument>,
  depURI: IRI,
  token: { deprel?: string; head?: string },
  depTokenURI: IRI,
  headTokenURI: IRI | undefined,
  udSentURI: IRI,
): void {
  // Use prefixed URI format for UD_tag:deprel
  const deprelType = `UD_tag:${token.deprel || 'root'}`;
  addProperty(doc, depURI, toPrefixedURI(RDF_TYPE), deprelType);
  addProperty(doc, depURI, toPrefixedURI(LILA_CORPUS_HAS_DEP), depTokenURI);

  if (token.deprel === 'root' || headTokenURI === undefined) {
    addProperty(
      doc,
      depURI,
      toPrefixedURI(LILA_CORPUS_HAS_HEAD),
      udSentURI,
    );
  } else if (headTokenURI) {
    addProperty(
      doc,
      depURI,
      toPrefixedURI(LILA_CORPUS_HAS_HEAD),
      headTokenURI,
    );
  }

  addLabel(doc, depURI, `UD DepRel ${token.deprel || 'root'}`);
}

/**
 * Add morphology annotation layer header to the document
 */
export function addMorphologyAnnotationLayerHeader(
  doc: ReturnType<typeof createDocument>,
  docURI: IRI,
  docTitle: string,
): IRI {
  const morphLayerURI = `${docURI}/UDMorphologyAnnotationLayer`;
  addType(doc, morphLayerURI, toPrefixedURI(POWLA_DOCUMENT_LAYER));
  addStringProperty(
    doc,
    morphLayerURI,
    toPrefixedURI(DC_DESCRIPTION),
    `${docTitle} Morphology Annotation Layer`,
  );
  addStringProperty(
    doc,
    morphLayerURI,
    toPrefixedURI(DC_TITLE),
    LAYER_TITLE_UD_MORPHOLOGY,
  );
  addProperty(doc, morphLayerURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);
  return morphLayerURI;
}

/**
 * Add a morphology annotation to the document
 */
export function addMorphologyAnnotation(
  doc: ReturnType<typeof createDocument>,
  morphURI: IRI,
  token: { form: string; feats?: Record<string, string> },
  morphLayerURI: IRI,
  tokenURI: IRI,
): void {
  const features = featuresToUDURLs(token.feats);

  addType(doc, morphURI, toPrefixedURI(OA_ANNOTATION));
  addProperty(doc, morphURI, toPrefixedURI(POWLA_HAS_LAYER), morphLayerURI);
  addLabel(doc, morphURI, `UD Features of ${token.form}`);

  if (features.length > 0) {
    // Add multiple hasBody relationships
    for (const feature of features) {
      addProperty(doc, morphURI, toPrefixedURI(OA_HAS_BODY), feature);
    }
  } else {
    addProperty(
      doc,
      morphURI,
      toPrefixedURI(OA_HAS_BODY),
      'https://universaldependencies.org/it/feat/' as IRI,
    );
  }

  addProperty(doc, morphURI, toPrefixedURI(OA_HAS_TARGET), tokenURI);
}

/**
 * Convert CONLL-U document to TTL
 */
export function conlluToTurtle(
  document: ConlluDocument,
  metadata: DocumentMetadata,
  options?: ConlluToTurtleOptions,
): string {
  const {
    includeCitationLayer = true,
    includeMorphologicalLayer = true,
  } = options || {};
  // Filter out sentences with no tokens (metadata-only sentences)
  const validSentences = document.sentences.filter((s) => s.tokens.length > 0);

  const doc = createDocument();

  // Add prefixes
  addAllPrefixes(doc);

  // Build document URI
  const corpusRefURI = metadata.corpusRef;
  const docURI = generateDocumentURI(corpusRefURI, metadata.docTitle);

  // Document metadata
  addDocumentMetadata(doc, docURI, corpusRefURI, metadata);

  // Document layer
  const docLayerURI = addDocumentLayer(doc, docURI, metadata.docTitle);

  // Map to track citation sentence URIs for token generation (used by both citation and UD layers)
  const citationSentURIMap = new Map<number, IRI>();

  // Extract citation layer labels (used throughout, even when citation layer is disabled)
  const {
    documentLabel = 'Document',
    paragraphLabel = 'Paragraph',
    sentenceLabel = 'Sentence',
  } = options?.citationLayerLabels || {};

  // Citation structure header
  if (includeCitationLayer) {

    // Parse newdoc/newpar from comments and group sentences
    interface SentenceGroup {
      sentence: (typeof validSentences)[0];
      index: number;
      newdoc?: { id: string };
      newpar?: { id: string };
    }

    const sentenceGroups: SentenceGroup[] = validSentences.map(
      (sentence, idx) => {
        const group: SentenceGroup = { sentence, index: idx };
        for (const comment of sentence.comments) {
          // Try to parse newdoc/newpar from the comment
          const parsed = parseNewdocNewpar(comment);
          if (parsed) {
            if (parsed.type === 'newdoc') {
              group.newdoc = { id: parsed.id };
            } else if (parsed.type === 'newpar') {
              group.newpar = { id: parsed.id };
            }
          } else {
            // Fallback: check if comment object itself contains newdoc/newpar info
            // Some parsers might structure it differently
            const commentStr = JSON.stringify(comment);
            if (commentStr.includes('newdoc')) {
              const idMatch = commentStr.match(/newdoc[^"]*id[^"]*[:=]\s*["']?([^"',}\s]+)/i);
              group.newdoc = { id: idMatch ? idMatch[1] : '' };
            }
            if (commentStr.includes('newpar')) {
              const idMatch = commentStr.match(/newpar[^"]*id[^"]*[:=]\s*["']?([^"',}\s]+)/i);
              group.newpar = { id: idMatch ? idMatch[1] : '' };
            }
          }
        }
        return group;
      },
    );

    // Check if we have newdoc or newpar
    const hasNewdoc = sentenceGroups.some((g) => g.newdoc);
    const hasNewpar = sentenceGroups.some((g) => g.newpar);

    // Group sentences into documents and paragraphs
    interface DocumentGroup {
      docId: string;
      docIndex: number;
      paragraphs: ParagraphGroup[];
    }

    interface ParagraphGroup {
      paraId: string;
      paraIndex: number;
      sentences: SentenceGroup[];
    }

    const documents: DocumentGroup[] = [];
    let currentDoc: DocumentGroup | null = null;
    let currentPara: ParagraphGroup | null = null;
    let docCounter = 0;
    let paraCounter = 0;

    for (const group of sentenceGroups) {
      // Check for new document
      if (hasNewdoc && group.newdoc) {
        docCounter++;
        paraCounter = 0; // Reset paragraph counter for new document
        currentDoc = {
          docId: group.newdoc.id,
          docIndex: docCounter,
          paragraphs: [],
        };
        documents.push(currentDoc);
        currentPara = null;
      } else if (!currentDoc && hasNewdoc) {
        // First sentence without newdoc - create implicit document
        docCounter++;
        currentDoc = {
          docId: '',
          docIndex: docCounter,
          paragraphs: [],
        };
        documents.push(currentDoc);
      } else if (!hasNewdoc && documents.length === 0) {
        // No newdoc at all - don't create document layer
        currentDoc = null;
      }

      // Check for new paragraph (only if newpar is present)
      if (hasNewpar && group.newpar) {
        paraCounter++;
        if (!currentDoc && hasNewdoc) {
          // Paragraph without document - shouldn't happen, but handle gracefully
          docCounter++;
          currentDoc = {
            docId: '',
            docIndex: docCounter,
            paragraphs: [],
          };
          documents.push(currentDoc);
        }
        if (currentDoc) {
          currentPara = {
            paraId: group.newpar.id,
            paraIndex: paraCounter,
            sentences: [],
          };
          currentDoc.paragraphs.push(currentPara);
        } else if (!hasNewdoc) {
          // Paragraph without document layer
          if (!currentPara) {
            paraCounter = 1;
            currentPara = {
              paraId: group.newpar.id,
              paraIndex: paraCounter,
              sentences: [],
            };
          }
        }
      } else if (hasNewpar && !currentPara) {
        // First sentence without newpar - create implicit paragraph
        paraCounter++;
        if (currentDoc) {
          currentPara = {
            paraId: '',
            paraIndex: paraCounter,
            sentences: [],
          };
          currentDoc.paragraphs.push(currentPara);
        } else if (!hasNewdoc) {
          currentPara = {
            paraId: '',
            paraIndex: paraCounter,
            sentences: [],
          };
        }
      }

      // Add sentence to current paragraph or directly to document
      if (hasNewpar && currentPara) {
        // Has newpar - add to paragraph
        currentPara.sentences.push(group);
      } else if (currentDoc && !hasNewpar) {
        // Has document but no newpar - add directly to document (no paragraph layer)
        // We'll handle this specially in the processing loop - don't create paragraphs
        // For now, just track sentences directly in a special way
        if (currentDoc.paragraphs.length === 0) {
          // Mark that this document has direct sentences (not paragraphs)
          // We'll use a special structure where paragraphs array is empty
          // and we'll process sentences directly
        }
        // Store sentences in a way that indicates they're direct children
        // We'll use a special paragraph with paraIndex = -1 to indicate "direct sentences"
        let directSentencesPara = currentDoc.paragraphs.find((p) => p.paraIndex === -1);
        if (!directSentencesPara) {
          directSentencesPara = {
            paraId: '',
            paraIndex: -1, // Special marker for "direct sentences, no paragraph"
            sentences: [],
          };
          currentDoc.paragraphs.push(directSentencesPara);
        }
        directSentencesPara.sentences.push(group);
      } else if (!currentDoc && !hasNewdoc && !hasNewpar) {
        // No newdoc, no newpar - will be handled in else branch
      }
    }

    // Map to track citation sentence URIs for token generation
    const citationSentURIMap = new Map<number, IRI>();

    // Helper function to generate sentence URI with parent context
    const getSentenceURI = (
      sentNum: number,
      parentDocId?: string,
      parentDocIndex?: number,
      parentParaId?: string,
      parentParaIndex?: number,
    ): IRI => {
      const uri = generateSentenceURI(
        corpusRefURI,
        metadata.docTitle,
        sentNum,
        parentDocId,
        parentDocIndex,
        parentParaId,
        parentParaIndex,
        documentLabel,
        paragraphLabel,
      );
      // Track the URI for this sentence index
      citationSentURIMap.set(sentNum - 1, uri);
      return uri;
    };

    // Determine top-level items for citation structure
    const topLevelURIs: IRI[] = [];
    if (hasNewdoc) {
      // Top level is documents
      for (const doc of documents) {
        const docURI = generateDocumentCitationURI(
          corpusRefURI,
          metadata.docTitle,
          doc.docId,
          doc.docIndex,
          documentLabel,
        );
        topLevelURIs.push(docURI);
      }
    } else if (hasNewpar) {
      // Top level is paragraphs (if no documents)
      // Collect all paragraphs
      const allParagraphs: ParagraphGroup[] = [];
      let paraIdx = 0;
      for (const group of sentenceGroups) {
        if (group.newpar) {
          paraIdx++;
          allParagraphs.push({
            paraId: group.newpar.id,
            paraIndex: paraIdx,
            sentences: [group],
          });
        } else if (allParagraphs.length > 0) {
          allParagraphs[allParagraphs.length - 1].sentences.push(group);
        } else {
          // First sentence without newpar
          paraIdx++;
          allParagraphs.push({
            paraId: '',
            paraIndex: paraIdx,
            sentences: [group],
          });
        }
      }
      for (const para of allParagraphs) {
        const paraURI = generateParagraphCitationURI(
          corpusRefURI,
          metadata.docTitle,
          para.paraId,
          para.paraIndex,
          paragraphLabel,
        );
        topLevelURIs.push(paraURI);
      }
    } else {
      // No newdoc or newpar - use current behavior (sentences directly)
      for (let i = 0; i < validSentences.length; i++) {
        topLevelURIs.push(getSentenceURI(i + 1));
      }
    }

    if (topLevelURIs.length > 0) {
      addCitationStructureHeader(doc, docURI, metadata.docTitle, topLevelURIs);
    }

    // Process hierarchical structure
    if (hasNewdoc) {
      // Process documents -> paragraphs -> sentences
      for (let dIdx = 0; dIdx < documents.length; dIdx++) {
        const docGroup = documents[dIdx];
        const docURI = generateDocumentCitationURI(
          corpusRefURI,
          metadata.docTitle,
          docGroup.docId,
          docGroup.docIndex,
          documentLabel,
        );

        // Collect child URIs (paragraphs or sentences)
        const childURIs: IRI[] = [];
        const hasDirectSentences =
          docGroup.paragraphs.length > 0 &&
          docGroup.paragraphs[0].paraIndex === -1;

        if (hasDirectSentences) {
          // Document has direct sentences (no paragraph layer)
          const sentURIs = docGroup.paragraphs[0].sentences.map(
            (sg) => getSentenceURI(sg.index + 1, docGroup.docId, docGroup.docIndex),
          );
          childURIs.push(...sentURIs);
        } else {
          // Document has paragraphs
          for (const para of docGroup.paragraphs) {
            if (para.paraIndex !== -1) {
              const paraURI = generateParagraphCitationURI(
                corpusRefURI,
                metadata.docTitle,
                para.paraId,
                para.paraIndex,
                paragraphLabel,
                docGroup.docId,
                docGroup.docIndex,
                documentLabel,
              );
              childURIs.push(paraURI);
            }
          }
        }

        const nextDocURI =
          dIdx < documents.length - 1
            ? generateDocumentCitationURI(
              corpusRefURI,
              metadata.docTitle,
              documents[dIdx + 1].docId,
              documents[dIdx + 1].docIndex,
              documentLabel,
            )
            : undefined;
        const prevDocURI =
          dIdx > 0
            ? generateDocumentCitationURI(
              corpusRefURI,
              metadata.docTitle,
              documents[dIdx - 1].docId,
              documents[dIdx - 1].docIndex,
              documentLabel,
            )
            : undefined;

        addCitationDocument(
          doc,
          docURI,
          docGroup.docId,
          docGroup.docIndex,
          childURIs.length > 0
            ? childURIs
            : [getSentenceURI(1, docGroup.docId, docGroup.docIndex)], // Fallback to first sentence if empty
          documentLabel,
          prevDocURI,
          nextDocURI,
        );

        // Process paragraphs in this document (or direct sentences if paraIndex === -1)
        for (let pIdx = 0; pIdx < docGroup.paragraphs.length; pIdx++) {
          const para = docGroup.paragraphs[pIdx];

          // Check if this is a "direct sentences" marker (paraIndex === -1)
          if (para.paraIndex === -1) {
            // Direct sentences - no paragraph layer, add sentences directly to document
            const sentURIs = para.sentences.map(
              (sg) => getSentenceURI(sg.index + 1, docGroup.docId, docGroup.docIndex),
            );

            // Process sentences directly (no paragraph citation unit)
            for (let sIdx = 0; sIdx < para.sentences.length; sIdx++) {
              const sg = para.sentences[sIdx];
              const sentNum = sg.index + 1;
              const sentURI = getSentenceURI(sentNum, docGroup.docId, docGroup.docIndex);
              citationSentURIMap.set(sg.index, sentURI);
              const nextSentURI =
                sIdx < para.sentences.length - 1
                  ? getSentenceURI(para.sentences[sIdx + 1].index + 1, docGroup.docId, docGroup.docIndex)
                  : undefined;
              const prevSentURI =
                sIdx > 0
                  ? getSentenceURI(para.sentences[sIdx - 1].index + 1, docGroup.docId, docGroup.docIndex)
                  : undefined;

              processCitationSentence(
                doc,
                sg.sentence,
                metadata.docTitle,
                sentNum,
                validSentences.length,
                docLayerURI,
                prevSentURI,
                nextSentURI,
                sentenceLabel,
                sentURI,
              );
            }
          } else {
            // Normal paragraph - create paragraph citation unit
            const paraURI = generateParagraphCitationURI(
              corpusRefURI,
              metadata.docTitle,
              para.paraId,
              para.paraIndex,
              paragraphLabel,
              docGroup.docId,
              docGroup.docIndex,
              documentLabel,
            );

            const sentURIs = para.sentences.map(
              (sg) => getSentenceURI(sg.index + 1, docGroup.docId, docGroup.docIndex, para.paraId, para.paraIndex),
            );

            const nextParaURI =
              pIdx < docGroup.paragraphs.length - 1 &&
                docGroup.paragraphs[pIdx + 1].paraIndex !== -1
                ? generateParagraphCitationURI(
                  corpusRefURI,
                  metadata.docTitle,
                  docGroup.paragraphs[pIdx + 1].paraId,
                  docGroup.paragraphs[pIdx + 1].paraIndex,
                  paragraphLabel,
                  docGroup.docId,
                  docGroup.docIndex,
                  documentLabel,
                )
                : undefined;
            const prevParaURI =
              pIdx > 0 && docGroup.paragraphs[pIdx - 1].paraIndex !== -1
                ? generateParagraphCitationURI(
                  corpusRefURI,
                  metadata.docTitle,
                  docGroup.paragraphs[pIdx - 1].paraId,
                  docGroup.paragraphs[pIdx - 1].paraIndex,
                  paragraphLabel,
                  docGroup.docId,
                  docGroup.docIndex,
                  documentLabel,
                )
                : undefined;

            addCitationParagraph(
              doc,
              paraURI,
              para.paraId,
              para.paraIndex,
              sentURIs,
              paragraphLabel,
              prevParaURI,
              nextParaURI,
            );

            // Process sentences in this paragraph
            for (let sIdx = 0; sIdx < para.sentences.length; sIdx++) {
              const sg = para.sentences[sIdx];
              const sentNum = sg.index + 1;
              const sentURI = getSentenceURI(sentNum, docGroup.docId, docGroup.docIndex, para.paraId, para.paraIndex);
              citationSentURIMap.set(sg.index, sentURI);
              const nextSentURI =
                sIdx < para.sentences.length - 1
                  ? getSentenceURI(para.sentences[sIdx + 1].index + 1, docGroup.docId, docGroup.docIndex, para.paraId, para.paraIndex)
                  : undefined;
              const prevSentURI =
                sIdx > 0
                  ? getSentenceURI(para.sentences[sIdx - 1].index + 1, docGroup.docId, docGroup.docIndex, para.paraId, para.paraIndex)
                  : undefined;

              processCitationSentence(
                doc,
                sg.sentence,
                metadata.docTitle,
                sentNum,
                validSentences.length,
                docLayerURI,
                prevSentURI,
                nextSentURI,
                sentenceLabel,
                sentURI,
              );
            }
          }
        }

      }
    } else if (hasNewpar) {
      // Process paragraphs -> sentences (no document layer)
      const allParagraphs: ParagraphGroup[] = [];
      let paraIdx = 0;
      for (const group of sentenceGroups) {
        if (group.newpar) {
          paraIdx++;
          allParagraphs.push({
            paraId: group.newpar.id,
            paraIndex: paraIdx,
            sentences: [group],
          });
        } else if (allParagraphs.length > 0) {
          allParagraphs[allParagraphs.length - 1].sentences.push(group);
        } else {
          // First sentence without newpar
          paraIdx++;
          allParagraphs.push({
            paraId: '',
            paraIndex: paraIdx,
            sentences: [group],
          });
        }
      }

      for (let pIdx = 0; pIdx < allParagraphs.length; pIdx++) {
        const para = allParagraphs[pIdx];
        const paraURI = generateParagraphCitationURI(
          corpusRefURI,
          metadata.docTitle,
          para.paraId,
          para.paraIndex,
          paragraphLabel,
        );

        const sentURIs = para.sentences.map((sg) => getSentenceURI(sg.index + 1, undefined, undefined, para.paraId, para.paraIndex));

        const nextParaURI =
          pIdx < allParagraphs.length - 1
            ? generateParagraphCitationURI(
              corpusRefURI,
              metadata.docTitle,
              allParagraphs[pIdx + 1].paraId,
              allParagraphs[pIdx + 1].paraIndex,
              paragraphLabel,
            )
            : undefined;
        const prevParaURI =
          pIdx > 0
            ? generateParagraphCitationURI(
              corpusRefURI,
              metadata.docTitle,
              allParagraphs[pIdx - 1].paraId,
              allParagraphs[pIdx - 1].paraIndex,
              paragraphLabel,
            )
            : undefined;

        addCitationParagraph(
          doc,
          paraURI,
          para.paraId,
          para.paraIndex,
          sentURIs,
          paragraphLabel,
          prevParaURI,
          nextParaURI,
        );

        // Process sentences in this paragraph
        for (let sIdx = 0; sIdx < para.sentences.length; sIdx++) {
          const sg = para.sentences[sIdx];
          const sentNum = sg.index + 1;
          const sentURI = getSentenceURI(sentNum, undefined, undefined, para.paraId, para.paraIndex);
          const nextSentURI =
            sIdx < para.sentences.length - 1
              ? getSentenceURI(para.sentences[sIdx + 1].index + 1, undefined, undefined, para.paraId, para.paraIndex)
              : undefined;
          const prevSentURI =
            sIdx > 0
              ? getSentenceURI(para.sentences[sIdx - 1].index + 1, undefined, undefined, para.paraId, para.paraIndex)
              : undefined;

          processCitationSentence(
            doc,
            sg.sentence,
            metadata.docTitle,
            sentNum,
            validSentences.length,
            docLayerURI,
            prevSentURI,
            nextSentURI,
            sentenceLabel,
          );
        }
      }
    } else {
      // No newdoc or newpar - use current behavior (sentences directly)
      for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
        const sentence = validSentences[sIdx];
        const sentNum = sIdx + 1;
        const sentURI = getSentenceURI(sentNum);
        citationSentURIMap.set(sIdx, sentURI);
        const nextSentURI =
          sIdx < validSentences.length - 1
            ? getSentenceURI(sentNum + 1)
            : undefined;
        const prevSentURI =
          sIdx > 0
            ? getSentenceURI(sentNum - 1)
            : undefined;

        processCitationSentence(
          doc,
          sentence,
          metadata.docTitle,
          sentNum,
          validSentences.length,
          docLayerURI,
          prevSentURI,
          nextSentURI,
          sentenceLabel,
          sentURI,
        );
      }
    }
  } else {
    // Even if citation layer is disabled, we still need to create tokens
    // for the UD layer and morphological layer to reference
    for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
      const sentence = validSentences[sIdx];
      const sentNum = sIdx + 1;
      const sentURI = generateSentenceURI(corpusRefURI, metadata.docTitle, sentNum, undefined, undefined, undefined, undefined, documentLabel, paragraphLabel);
      citationSentURIMap.set(sIdx, sentURI);
      processSentenceTokensOnly(
        doc,
        sentence,
        metadata.docTitle,
        sentNum,
        docLayerURI,
        sentURI,
      );
    }
  }

  // UD Annotation Layer
  const udSentURIs = validSentences.map((_, i) =>
    generateUDLayerSentenceURI(corpusRefURI, metadata.docTitle, i + 1),
  );
  const udLayerURI = addUDAnnotationLayerHeader(
    doc,
    docURI,
    metadata.docTitle,
    udSentURIs,
  );

  // If citation layer wasn't processed, generate default sentence URIs for token generation
  if (citationSentURIMap.size === 0) {
    for (let i = 0; i < validSentences.length; i++) {
      citationSentURIMap.set(i, generateSentenceURI(corpusRefURI, metadata.docTitle, i + 1, undefined, undefined, undefined, undefined, documentLabel, paragraphLabel));
    }
  }

  // UD sentences and dependency relations
  for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
    const sentence = validSentences[sIdx];
    const sentNum = sIdx + 1;
    const udSentURI = udSentURIs[sIdx];
    const citationSentURI = citationSentURIMap.get(sIdx) || generateSentenceURI(corpusRefURI, metadata.docTitle, sentNum, undefined, undefined, undefined, undefined, documentLabel, paragraphLabel);
    const tokenURIs = sentence.tokens.map((_, tIdx) =>
      generateTokenURI(citationSentURI, tIdx + 1),
    );

    // UD sentence root
    const nextUdSentURI =
      sIdx < validSentences.length - 1 ? udSentURIs[sIdx + 1] : undefined;
    const prevUdSentURI = sIdx > 0 ? udSentURIs[sIdx - 1] : undefined;
    addUDSentence(
      doc,
      udSentURI,
      tokenURIs,
      sentNum,
      validSentences.length,
      prevUdSentURI,
      nextUdSentURI,
    );

    // Dependency relations (part of morphological layer)
    if (includeMorphologicalLayer) {
      for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
        const token = sentence.tokens[tIdx];
        const depURI = generateUDDepURI(corpusRefURI, metadata.docTitle, sentNum, tIdx + 1);

        // Find head
        const headIndex =
          token.head && token.head !== '_' && token.head !== '0'
            ? parseInt(token.head, 10) - 1
            : undefined;

        const depTokenURI = tokenURIs[tIdx];
        const headTokenURI =
          headIndex !== undefined &&
            headIndex >= 0 &&
            headIndex < tokenURIs.length
            ? tokenURIs[headIndex]
            : undefined;

        addDependencyRelation(
          doc,
          depURI,
          token,
          depTokenURI,
          headTokenURI,
          udSentURI,
        );
      }
    }
  }

  // Morphology annotation layer
  if (includeMorphologicalLayer) {
    const morphLayerURI = addMorphologyAnnotationLayerHeader(
      doc,
      docURI,
      metadata.docTitle,
    );

    // Morphology annotations
    for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
      const sentence = validSentences[sIdx];
      const sentNum = sIdx + 1;

      for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
        const token = sentence.tokens[tIdx];
        const morphURI = generateMorphologyAnnotationURI(
          corpusRefURI,
          metadata.docTitle,
          sentNum,
          tIdx + 1,
        );
        const citationSentURI = citationSentURIMap.get(sIdx) || generateSentenceURI(corpusRefURI, metadata.docTitle, sentNum, undefined, undefined, undefined, undefined, documentLabel, paragraphLabel);
        const tokenURI = generateTokenURI(citationSentURI, tIdx + 1);

        addMorphologyAnnotation(
          doc,
          morphURI,
          token,
          morphLayerURI,
          tokenURI,
        );
      }
    }
  }

  return serializeDocument(doc);
}

/**
 * Extract metadata from document
 */
export function extractMetadata(document: ConlluDocument): DocumentMetadata {
  const metadata: Partial<DocumentMetadata> = {};

  for (const sentence of document.sentences) {
    for (const comment of sentence.comments) {
      if (comment.type === 'metadata') {
        switch (comment.key) {
          case 'docId':
            metadata.docId = comment.value;
            break;
          case 'docTitle':
            metadata.docTitle = comment.value;
            break;
          case 'contributor':
            metadata.contributor = comment.value;
            break;
          case 'corpusRef':
            metadata.corpusRef = comment.value;
            break;
          case 'docAuthor':
            metadata.docAuthor = comment.value;
            break;
          case 'seeAlso':
            metadata.seeAlso = comment.value;
            break;
          case 'description':
            metadata.description = comment.value;
            break;
        }
      }
    }
  }

  return {
    docId: metadata.docId || '',
    docTitle: metadata.docTitle || '',
    contributor: metadata.contributor || '',
    corpusRef: metadata.corpusRef || '',
    docAuthor: metadata.docAuthor || '',
    seeAlso: metadata.seeAlso || '',
    description: metadata.description || '',
  };
}
