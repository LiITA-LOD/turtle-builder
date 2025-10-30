import type {
  ConlluDocument,
  ConlluSentence,
  ConlluToken,
} from "liita-textlinker-frontend/conllu";
import { parseFeats } from "liita-textlinker-frontend/conllu";

interface TTLPrefix {
  prefix: string;
  uri: string;
}

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
 * Convert Universal Dependencies tag to UD URL
 */
function udTagToURL(tag: string, deprel?: string): string {
  if (deprel) {
    return `https://universaldependencies.org/u/dep/${deprel}`;
  }
  return `https://universaldependencies.org/it/feat/${tag}`;
}

/**
 * Generate sentence URI
 */
function generateSentenceURI(docTitle: string, sentenceNum: number): string {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/CiteStructure/Sentence_${sentenceNum}`;
}

/**
 * Generate token URI
 */
function generateTokenURI(docTitle: string, sentNum: number, tokenId: number): string {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/CiteStructure/Sentence_${sentNum}/s${sentNum}t${tokenId}`;
}

/**
 * Generate UD dependency relation URI
 */
function generateUDDepURI(docTitle: string, sentNum: number, tokenId: number): string {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/UD/s${sentNum}t${tokenId}`;
}

/**
 * Generate UD annotation layer sentence URI
 */
function generateUDLayerSentenceURI(docTitle: string, sentenceNum: number): string {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/UDAnnotationLayer/Sentence_${sentenceNum}`;
}

/**
 * Generate UD morphology annotation URI
 */
function generateMorphologyAnnotationURI(docTitle: string, sentNum: number, tokenId: number): string {
  const encodedDoc = encodeURIComponent(docTitle);
  return `http://liita.it/data/corpora/Pirandelita/corpus/${encodedDoc}/UDMorphologyAnnotationLayer/id/s${sentNum}t${tokenId}`;
}

/**
 * Convert features to UD feature URLs
 */
function featuresToUDURLs(feats: Record<string, string> | undefined): string[] {
  if (!feats) return [];
  
  return Object.entries(feats).map(([key, value]) => {
    return `<https://universaldependencies.org/it/feat/${key}#${value}>`;
  });
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
 * Format URI with angle brackets for Turtle
 */
function formatURI(uri: string): string {
  return `<${uri}>`;
}

/**
 * Convert CONLL-U document to TTL
 */
export function conlluToTurtle(document: ConlluDocument, metadata: DocumentMetadata): string {
  // Filter out sentences with no tokens (metadata-only sentences)
  const validSentences = document.sentences.filter(s => s.tokens.length > 0);
  
  const prefixes: TTLPrefix[] = [
    { prefix: 'UD_tag', uri: 'https://universaldependencies.org/u/dep/' },
    { prefix: 'dc', uri: 'http://purl.org/dc/elements/1.1/' },
    { prefix: 'liitaIpoLemma', uri: 'http://liita.it/data/id/hypolemma/' },
    { prefix: 'liitaLemma', uri: 'http://liita.it/data/id/lemma/' },
    { prefix: 'lila', uri: 'http://liita.it/data/corpora/' },
    { prefix: 'lilaOntology', uri: 'http://lila-erc.eu/ontologies/lila/' },
    { prefix: 'lila_authors', uri: 'http://liita.it/data/corpora/id/authors/' },
    { prefix: 'lila_corpus', uri: 'http://lila-erc.eu/ontologies/lila_corpora/' },
    { prefix: 'oa', uri: 'http://www.w3.org/ns/oa#' },
    { prefix: 'ontolex', uri: 'http://www.w3.org/ns/lemon/ontolex#' },
    { prefix: 'owl', uri: 'http://www.w3.org/2002/07/owl#' },
    { prefix: 'powla', uri: 'http://purl.org/powla/powla.owl#' },
    { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
    { prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#' },
  ];

  const lines: string[] = [];
  
  // Add prefixes
  for (const { prefix, uri } of prefixes) {
    lines.push(`@prefix ${prefix}: <${uri}> .`);
  }
  lines.push('');

  // Build document URI
  const docTitleEncoded = encodeURIComponent(metadata.docTitle);
  const docURI = `http://liita.it/data/corpora/Pirandelita/corpus/${docTitleEncoded}`;
  const corpusRefURI = metadata.corpusRef;

  // Document metadata
  lines.push(`<${docURI}> a powla:Document;`);
  lines.push(`  dc:contributor "${metadata.contributor}";`);
  lines.push(`  dc:description "${metadata.description}";`);
  lines.push(`  dc:title "${metadata.docTitle}";`);
  lines.push(`  <http://purl.org/dc/terms/creator> <${metadata.docAuthor}>;`);
  lines.push(`  rdfs:seeAlso <${metadata.seeAlso}> .`);
  lines.push('');

  // Corpus has subdocument
  lines.push(`<${corpusRefURI}> powla:hasSubDocument <${docURI}> .`);
  lines.push('');

  // Document layer
  const docLayerURI = `${docURI}/DocumentLayer`;
  lines.push(`<${docLayerURI}> a powla:DocumentLayer;`);
  lines.push(`  dc:description "${metadata.docTitle} Document Layer";`);
  lines.push(`  dc:title "Document Layer";`);
  lines.push(`  powla:hasDocument <${docURI}> .`);
  lines.push('');

  // Citation structure header
  const citeStructureURI = `${docURI}/CiteStructure`;
  const sentenceURIs = validSentences.map((_, i) => generateSentenceURI(metadata.docTitle, i + 1));
  
  lines.push(`<${citeStructureURI}> a lila_corpus:CitationStructure;`);
  lines.push(`  lila_corpus:first ${formatURI(sentenceURIs[0])};`);
  lines.push(`  lila_corpus:isLayer ${sentenceURIs.map(formatURI).join(',\n    ')};`);
  lines.push(`  lila_corpus:last ${formatURI(sentenceURIs[sentenceURIs.length - 1])};`);
  lines.push(`  dc:description "${metadata.docTitle} Citation Layer";`);
  lines.push(`  dc:title "Citation Layer";`);
  lines.push(`  powla:hasDocument <${docURI}> .`);
  lines.push('');

  // Process sentences
  for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
    const sentence = validSentences[sIdx];
    const sentNum = sIdx + 1;
    const sentURI = generateSentenceURI(metadata.docTitle, sentNum);
    
    const tokenURIs = sentence.tokens.map((_, tIdx) => 
      generateTokenURI(metadata.docTitle, sentNum, tIdx + 1)
    );

    // Sentence citation unit
    lines.push(`${formatURI(sentURI)} a lila_corpus:citationUnit;`);
    lines.push(`  lila_corpus:first ${formatURI(tokenURIs[0])};`);
    lines.push(`  lila_corpus:hasCitLevel "1"^^xsd:int;`);
    lines.push(`  lila_corpus:hasRefType "Sentence";`);
    lines.push(`  lila_corpus:hasRefValue "Sentence_${sentNum}";`);
    lines.push(`  lila_corpus:last ${formatURI(tokenURIs[tokenURIs.length - 1])};`);
    lines.push(`  powla:hasChild ${tokenURIs.map(formatURI).join(',\n    ')};`);
    if (sIdx < validSentences.length - 1) {
      lines.push(`  powla:next ${formatURI(generateSentenceURI(metadata.docTitle, sentNum + 1))};`);
    }
    lines.push(`  rdfs:label "Sentence ${sentNum}" .`);
    lines.push('');

    // Tokens in sentence
    for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
      const token = sentence.tokens[tIdx];
      const tokenURI = tokenURIs[tIdx];
      const miscData = parseMiscField(token.misc);
      
      lines.push(`${formatURI(tokenURI)} a powla:Terminal;`);
      
      // Add lemma if present
      const lemmas = miscData.LiITALinkedURIs || [];
      if (lemmas.length > 0) {
        const lemmaURI = lemmas[0];
        const prefix = getLemmaPrefix(lemmaURI);
        const id = extractLemmaId(lemmaURI);
        if (id) {
          lines.push(`  lilaOntology:hasLemma ${prefix}:${id};`);
        }
      }
      
      lines.push(`  powla:hasLayer <${docLayerURI}>;`);
      lines.push(`  powla:hasStringValue "${token.form}";`);
      
      if (tIdx < sentence.tokens.length - 1) {
        lines.push(`  powla:next ${formatURI(tokenURIs[tIdx + 1])};`);
      }
      if (tIdx > 0) {
        lines.push(`  powla:previous ${formatURI(tokenURIs[tIdx - 1])};`);
      }
      
      lines.push(`  rdfs:label "${token.form}" .`);
      lines.push(''); // Blank line between tokens
    }
    lines.push('');
  }

  // UD Annotation Layer
  const udLayerURI = `${docURI}/UDAnnotationLayer`;
  const udSentURIs = validSentences.map((_, i) => 
    generateUDLayerSentenceURI(metadata.docTitle, i + 1)
  );
  
  lines.push(`<${udLayerURI}> a lila_corpus:SyntacticAnnotation;`);
  lines.push(`  lila_corpus:first ${formatURI(udSentURIs[0])};`);
  lines.push(`  lila_corpus:isLayer ${udSentURIs.map(formatURI).join(',\n    ')};`);
  lines.push(`  lila_corpus:last ${formatURI(udSentURIs[udSentURIs.length - 1])};`);
  lines.push(`  dc:description "${metadata.docTitle} Universal Dependencies syntactic annotation layer";`);
  lines.push(`  dc:title "${metadata.docTitle} UD Annotation Layer";`);
  lines.push(`  powla:hasDocument <${docURI}> .`);
  lines.push('');

  // UD sentences and dependency relations
  for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
    const sentence = validSentences[sIdx];
    const sentNum = sIdx + 1;
    const udSentURI = udSentURIs[sIdx];
    const tokenURIs = sentence.tokens.map((_, tIdx) => 
      generateTokenURI(metadata.docTitle, sentNum, tIdx + 1)
    );

    // UD sentence root
    lines.push(`${formatURI(udSentURI)} a powla:Root;`);
    lines.push(`  lila_corpus:hasCitLevel "1"^^xsd:int;`);
    lines.push(`  lila_corpus:hasRefType "Sentence";`);
    lines.push(`  lila_corpus:hasRefValue "Sentence_${sentNum}";`);
    lines.push(`  powla:firstTerminal ${formatURI(tokenURIs[0])};`);
    lines.push(`  powla:hasTerminal ${tokenURIs.map(formatURI).join(',\n    ')};`);
    lines.push(`  powla:lastTerminal ${formatURI(tokenURIs[tokenURIs.length - 1])};`);
    if (sIdx < validSentences.length - 1) {
      lines.push(`  powla:next ${formatURI(udSentURIs[sIdx + 1])};`);
    }
    if (sIdx > 0) {
      lines.push(`  powla:previous ${formatURI(udSentURIs[sIdx - 1])};`);
    }
    lines.push(`  rdfs:label "Sentence ${sentNum}" .`);
    lines.push('');

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

      lines.push(`${formatURI(depURI)} a UD_tag:${token.deprel || 'root'};`);
      lines.push(`  lila_corpus:hasDep ${formatURI(depTokenURI)};`);
      
      if (token.deprel === 'root' || headTokenURI === undefined) {
        lines.push(`  lila_corpus:hasHead ${formatURI(udSentURI)};`);
      } else if (headTokenURI) {
        lines.push(`  lila_corpus:hasHead ${formatURI(headTokenURI)};`);
      }
      
      lines.push(`  rdfs:label "UD DepRel ${token.deprel || 'root'}" .`);
      lines.push(''); // Blank line between dependency relations
    }
    lines.push('');
  }

  // Morphology annotation layer
  const morphLayerURI = `${docURI}/UDMorphologyAnnotationLayer`;
  lines.push(`<${morphLayerURI}> a powla:DocumentLayer;`);
  lines.push(`  dc:description "${metadata.docTitle} Morphology Annotation Layer";`);
  lines.push(`  dc:title "UD Morphology Annotation Layer";`);
  lines.push(`  powla:hasDocument <${docURI}> .`);
  lines.push('');

  // Morphology annotations
  for (let sIdx = 0; sIdx < validSentences.length; sIdx++) {
    const sentence = validSentences[sIdx];
    const sentNum = sIdx + 1;

    for (let tIdx = 0; tIdx < sentence.tokens.length; tIdx++) {
      const token = sentence.tokens[tIdx];
      const morphURI = generateMorphologyAnnotationURI(metadata.docTitle, sentNum, tIdx + 1);
      const tokenURI = generateTokenURI(metadata.docTitle, sentNum, tIdx + 1);
      
      const features = featuresToUDURLs(token.feats);
      
      lines.push(`${formatURI(morphURI)} a oa:Annotation;`);
      lines.push(`  powla:hasLayer <${morphLayerURI}>;`);
      lines.push(`  rdfs:label "UD Features of ${token.form}";`);
      
      if (features.length > 0) {
        lines.push(`  oa:hasBody ${features.join(',\n    ')};`);
      } else {
        lines.push(`  oa:hasBody <https://universaldependencies.org/it/feat/>;`);
      }
      
      lines.push(`  oa:hasTarget ${formatURI(tokenURI)} .`);
      lines.push(''); // Blank line between morphology annotations
    }
  }

  return lines.join('\n');
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

