import type {
  ConlluDocument,
  ConlluSentence,
  ConlluToken,
} from "liita-textlinker-frontend/conllu";
import {
  createDocument,
  addPrefix,
  addType,
  addLabel,
  addStringProperty,
  addIntegerProperty,
  addProperty,
  serializeDocument,
  type IRI,
} from './turtle';

interface DocumentMetadata {
  docId: string;
  docTitle: string;
  contributor: string;
  corpusRef: string;
  docAuthor: string;
  seeAlso: string;
  description: string;
}

interface MISCField {
  LiITALinkedURIs?: string[];
  start_char?: number;
  end_char?: number;
  SpaceAfter?: string;
  SpacesAfter?: string;
  [key: string]: string | string[] | number | undefined;
}

// Constants for common URIs
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
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
const LILA_CORPUS_CITATION_STRUCTURE = 'http://lila-erc.eu/ontologies/lila_corpora#CitationStructure';
const LILA_CORPUS_CITATION_UNIT = 'http://lila-erc.eu/ontologies/lila_corpora#citationUnit';
const LILA_CORPUS_SYNTACTIC_ANNOTATION = 'http://lila-erc.eu/ontologies/lila_corpora#SyntacticAnnotation';
const LILA_CORPUS_FIRST = 'http://lila-erc.eu/ontologies/lila_corpora#first';
const LILA_CORPUS_LAST = 'http://lila-erc.eu/ontologies/lila_corpora#last';
const LILA_CORPUS_IS_LAYER = 'http://lila-erc.eu/ontologies/lila_corpora#isLayer';
const LILA_CORPUS_HAS_CIT_LEVEL = 'http://lila-erc.eu/ontologies/lila_corpora#hasCitLevel';
const LILA_CORPUS_HAS_REF_TYPE = 'http://lila-erc.eu/ontologies/lila_corpora#hasRefType';
const LILA_CORPUS_HAS_REF_VALUE = 'http://lila-erc.eu/ontologies/lila_corpora#hasRefValue';
const LILA_CORPUS_HAS_DEP = 'http://lila-erc.eu/ontologies/lila_corpora#hasDep';
const LILA_CORPUS_HAS_HEAD = 'http://lila-erc.eu/ontologies/lila_corpora#hasHead';
const LILA_ONTOLOGY_HAS_LEMMA = 'http://lila-erc.eu/ontologies/lila#hasLemma';
const OA_ANNOTATION = 'http://www.w3.org/ns/oa#Annotation';
const OA_HAS_BODY = 'http://www.w3.org/ns/oa#hasBody';
const OA_HAS_TARGET = 'http://www.w3.org/ns/oa#hasTarget';
const XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer';

/**
 * Parse MISC field to extract structured information
 */
function parseMiscField(misc: string[] | undefined): MISCField {
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
 * Generate sentence URI
 */
function generateSentenceURI(docTitle: string, sentenceNum: number): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/CiteStructure/Sentence_${sentenceNum}`;
}

/**
 * Generate token URI
 */
function generateTokenURI(docTitle: string, sentNum: number, tokenId: number): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/CiteStructure/Sentence_${sentNum}/s${sentNum}t${tokenId}`;
}

/**
 * Generate UD dependency relation URI
 */
function generateUDDepURI(docTitle: string, sentNum: number, tokenId: number): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/UD/s${sentNum}t${tokenId}`;
}

/**
 * Generate UD annotation layer sentence URI
 */
function generateUDLayerSentenceURI(docTitle: string, sentenceNum: number): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/UDAnnotationLayer/Sentence_${sentenceNum}`;
}

/**
 * Generate UD morphology annotation URI
 */
function generateMorphologyAnnotationURI(docTitle: string, sentNum: number, tokenId: number): IRI {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/UDMorphologyAnnotationLayer/id/s${sentNum}t${tokenId}`;
}

/**
 * Determine lemma prefix based on URI
 */
function getLemmaPrefix(uri: string): 'liitaLemma' | 'liitaIpoLemma' {
  if (uri.includes('/hypolemma/')) {
    return 'liitaIpoLemma';
  }
  return 'liitaLemma';
}

/**
 * Extract lemma ID from URI
 */
function extractLemmaId(uri: string): string {
  const match = uri.match(/\/id\/(?:hypo)?lemma\/(\d+)/);
  return match ? match[1] : '';
}

/**
 * Convert features to UD feature URLs
 */
function featuresToUDURLs(feats: Record<string, string> | undefined): IRI[] {
  if (!feats) return [];

  return Object.entries(feats).map(([key, value]) => {
    return `https://universaldependencies.org/it/feat/${key}#${value}` as IRI;
  });
}

/**
 * Convert full URI to prefixed URI if a matching prefix exists
 */
function toPrefixedURI(uri: string): string {
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
 * Convert CONLL-U document to TTL
 */
export function conlluToTurtle(document: ConlluDocument, metadata: DocumentMetadata): string {
  // Filter out sentences with no tokens (metadata-only sentences)
  const validSentences = document.sentences.filter(s => s.tokens.length > 0);

  const doc = createDocument();

  // Add prefixes
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

  // Build document URI
  const docTitleEncoded = encodeURIComponent(metadata.docTitle);
  const docURI = `http://liita.it/data/corpora/Pirandelita/corpus/${docTitleEncoded}`;
  const corpusRefURI = metadata.corpusRef;

  // Document metadata
  addType(doc, docURI, toPrefixedURI(POWLA_DOCUMENT));
  addStringProperty(doc, docURI, toPrefixedURI(DC_CONTRIBUTOR), metadata.contributor);
  addStringProperty(doc, docURI, toPrefixedURI(DC_DESCRIPTION), metadata.description);
  addStringProperty(doc, docURI, toPrefixedURI(DC_TITLE), metadata.docTitle);
  addProperty(doc, docURI, DC_TERMS_CREATOR, metadata.docAuthor); // No prefix for dc:terms
  addProperty(doc, docURI, toPrefixedURI(RDFS_SEE_ALSO), metadata.seeAlso);

  // Corpus has subdocument
  addProperty(doc, corpusRefURI, toPrefixedURI(POWLA_HAS_SUB_DOCUMENT), docURI);

  // Document layer
  const docLayerURI = `${docURI}/DocumentLayer`;
  addType(doc, docLayerURI, toPrefixedURI(POWLA_DOCUMENT_LAYER));
  addStringProperty(doc, docLayerURI, toPrefixedURI(DC_DESCRIPTION), `${metadata.docTitle} Document Layer`);
  addStringProperty(doc, docLayerURI, toPrefixedURI(DC_TITLE), 'Document Layer');
  addProperty(doc, docLayerURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);

  // Citation structure header
  const citeStructureURI = `${docURI}/CiteStructure`;
  const sentenceURIs = validSentences.map((_, i) => generateSentenceURI(metadata.docTitle, i + 1));

  addType(doc, citeStructureURI, toPrefixedURI(LILA_CORPUS_CITATION_STRUCTURE));
  addProperty(doc, citeStructureURI, toPrefixedURI(LILA_CORPUS_FIRST), sentenceURIs[0]);
  // Add multiple isLayer relationships
  for (const sentURI of sentenceURIs) {
    addProperty(doc, citeStructureURI, toPrefixedURI(LILA_CORPUS_IS_LAYER), sentURI);
  }
  addProperty(doc, citeStructureURI, toPrefixedURI(LILA_CORPUS_LAST), sentenceURIs[sentenceURIs.length - 1]);
  addStringProperty(doc, citeStructureURI, toPrefixedURI(DC_DESCRIPTION), `${metadata.docTitle} Citation Layer`);
  addStringProperty(doc, citeStructureURI, toPrefixedURI(DC_TITLE), 'Citation Layer');
  addProperty(doc, citeStructureURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);

  // Process sentences
  for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
    const sentence = validSentences[sIdx];
    const sentNum = sIdx + 1;
    const sentURI = generateSentenceURI(metadata.docTitle, sentNum);

    const tokenURIs = sentence.tokens.map((_, tIdx) =>
      generateTokenURI(metadata.docTitle, sentNum, tIdx + 1)
    );

    // Sentence citation unit
    addType(doc, sentURI, toPrefixedURI(LILA_CORPUS_CITATION_UNIT));
    addProperty(doc, sentURI, toPrefixedURI(LILA_CORPUS_FIRST), tokenURIs[0]);
    addIntegerProperty(doc, sentURI, toPrefixedURI(LILA_CORPUS_HAS_CIT_LEVEL), 1);
    addStringProperty(doc, sentURI, toPrefixedURI(LILA_CORPUS_HAS_REF_TYPE), 'Sentence');
    addStringProperty(doc, sentURI, toPrefixedURI(LILA_CORPUS_HAS_REF_VALUE), `Sentence_${sentNum}`);
    addProperty(doc, sentURI, toPrefixedURI(LILA_CORPUS_LAST), tokenURIs[tokenURIs.length - 1]);
    // Add multiple hasChild relationships
    for (const tokenURI of tokenURIs) {
      addProperty(doc, sentURI, toPrefixedURI(POWLA_HAS_CHILD), tokenURI);
    }
    if (sIdx < validSentences.length - 1) {
      addProperty(doc, sentURI, toPrefixedURI(POWLA_NEXT), generateSentenceURI(metadata.docTitle, sentNum + 1));
    }
    if (sIdx > 0) {
      addProperty(doc, sentURI, toPrefixedURI(POWLA_PREVIOUS), generateSentenceURI(metadata.docTitle, sentNum - 1));
    }
    addLabel(doc, sentURI, `Sentence ${sentNum}`);

    // Tokens in sentence
    for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
      const token = sentence.tokens[tIdx];
      const tokenURI = tokenURIs[tIdx];
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
          addProperty(doc, tokenURI, toPrefixedURI(LILA_ONTOLOGY_HAS_LEMMA), lemmaPrefixedURI);
        }
      }

      addProperty(doc, tokenURI, toPrefixedURI(POWLA_HAS_LAYER), docLayerURI);
      addStringProperty(doc, tokenURI, toPrefixedURI(POWLA_HAS_STRING_VALUE), token.form);

      if (tIdx < sentence.tokens.length - 1) {
        addProperty(doc, tokenURI, toPrefixedURI(POWLA_NEXT), tokenURIs[tIdx + 1]);
      }
      if (tIdx > 0) {
        addProperty(doc, tokenURI, toPrefixedURI(POWLA_PREVIOUS), tokenURIs[tIdx - 1]);
      }

      addLabel(doc, tokenURI, token.form);
    }
  }

  // UD Annotation Layer
  const udLayerURI = `${docURI}/UDAnnotationLayer`;
  const udSentURIs = validSentences.map((_, i) =>
    generateUDLayerSentenceURI(metadata.docTitle, i + 1)
  );

  addType(doc, udLayerURI, toPrefixedURI(LILA_CORPUS_SYNTACTIC_ANNOTATION));
  addProperty(doc, udLayerURI, toPrefixedURI(LILA_CORPUS_FIRST), udSentURIs[0]);
  // Add multiple isLayer relationships
  for (const udSentURI of udSentURIs) {
    addProperty(doc, udLayerURI, toPrefixedURI(LILA_CORPUS_IS_LAYER), udSentURI);
  }
  addProperty(doc, udLayerURI, toPrefixedURI(LILA_CORPUS_LAST), udSentURIs[udSentURIs.length - 1]);
  addStringProperty(doc, udLayerURI, toPrefixedURI(DC_DESCRIPTION), `${metadata.docTitle} Universal Dependencies syntactic annotation layer`);
  addStringProperty(doc, udLayerURI, toPrefixedURI(DC_TITLE), `${metadata.docTitle} UD Annotation Layer`);
  addProperty(doc, udLayerURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);

  // UD sentences and dependency relations
  for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
    const sentence = validSentences[sIdx];
    const sentNum = sIdx + 1;
    const udSentURI = udSentURIs[sIdx];
    const tokenURIs = sentence.tokens.map((_, tIdx) =>
      generateTokenURI(metadata.docTitle, sentNum, tIdx + 1)
    );

    // UD sentence root
    addType(doc, udSentURI, toPrefixedURI(POWLA_ROOT));
    addIntegerProperty(doc, udSentURI, toPrefixedURI(LILA_CORPUS_HAS_CIT_LEVEL), 1);
    addStringProperty(doc, udSentURI, toPrefixedURI(LILA_CORPUS_HAS_REF_TYPE), 'Sentence');
    addStringProperty(doc, udSentURI, toPrefixedURI(LILA_CORPUS_HAS_REF_VALUE), `Sentence_${sentNum}`);
    addProperty(doc, udSentURI, toPrefixedURI(POWLA_FIRST_TERMINAL), tokenURIs[0]);
    // Add multiple hasTerminal relationships
    for (const tokenURI of tokenURIs) {
      addProperty(doc, udSentURI, toPrefixedURI(POWLA_HAS_TERMINAL), tokenURI);
    }
    addProperty(doc, udSentURI, toPrefixedURI(POWLA_LAST_TERMINAL), tokenURIs[tokenURIs.length - 1]);
    if (sIdx < validSentences.length - 1) {
      addProperty(doc, udSentURI, toPrefixedURI(POWLA_NEXT), udSentURIs[sIdx + 1]);
    }
    if (sIdx > 0) {
      addProperty(doc, udSentURI, toPrefixedURI(POWLA_PREVIOUS), udSentURIs[sIdx - 1]);
    }
    addLabel(doc, udSentURI, `Sentence ${sentNum}`);

    // Dependency relations
    for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
      const token = sentence.tokens[tIdx];
      const depURI = generateUDDepURI(metadata.docTitle, sentNum, tIdx + 1);

      // Find head
      const headIndex = token.head && token.head !== '_' && token.head !== '0'
        ? parseInt(token.head, 10) - 1
        : undefined;

      const depTokenURI = tokenURIs[tIdx];
      const headTokenURI = headIndex !== undefined && headIndex >= 0 && headIndex < tokenURIs.length
        ? tokenURIs[headIndex]
        : undefined;

      // Use prefixed URI format for UD_tag:deprel
      const deprelType = `UD_tag:${token.deprel || 'root'}`;
      addProperty(doc, depURI, toPrefixedURI(RDF_TYPE), deprelType);
      addProperty(doc, depURI, toPrefixedURI(LILA_CORPUS_HAS_DEP), depTokenURI);

      if (token.deprel === 'root' || headTokenURI === undefined) {
        addProperty(doc, depURI, toPrefixedURI(LILA_CORPUS_HAS_HEAD), udSentURI);
      } else if (headTokenURI) {
        addProperty(doc, depURI, toPrefixedURI(LILA_CORPUS_HAS_HEAD), headTokenURI);
      }

      addLabel(doc, depURI, `UD DepRel ${token.deprel || 'root'}`);
    }
  }

  // Morphology annotation layer
  const morphLayerURI = `${docURI}/UDMorphologyAnnotationLayer`;
  addType(doc, morphLayerURI, toPrefixedURI(POWLA_DOCUMENT_LAYER));
  addStringProperty(doc, morphLayerURI, toPrefixedURI(DC_DESCRIPTION), `${metadata.docTitle} Morphology Annotation Layer`);
  addStringProperty(doc, morphLayerURI, toPrefixedURI(DC_TITLE), 'UD Morphology Annotation Layer');
  addProperty(doc, morphLayerURI, toPrefixedURI(POWLA_HAS_DOCUMENT), docURI);

  // Morphology annotations
  for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
    const sentence = validSentences[sIdx];
    const sentNum = sIdx + 1;

    for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
      const token = sentence.tokens[tIdx];
      const morphURI = generateMorphologyAnnotationURI(metadata.docTitle, sentNum, tIdx + 1);
      const tokenURI = generateTokenURI(metadata.docTitle, sentNum, tIdx + 1);

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
        addProperty(doc, morphURI, toPrefixedURI(OA_HAS_BODY), 'https://universaldependencies.org/it/feat/' as IRI);
      }

      addProperty(doc, morphURI, toPrefixedURI(OA_HAS_TARGET), tokenURI);
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
