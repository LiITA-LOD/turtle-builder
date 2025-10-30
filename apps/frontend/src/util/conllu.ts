export interface ConlluToken {
  id: string;
  form: string;
  lemma: string | undefined;
  upos: string | undefined;
  xpos: string | undefined;
  feats: Record<string, string> | undefined;
  head: string | undefined;
  deprel: string | undefined;
  deps: string | undefined;
  misc: string[] | undefined;
}

export type ConlluComment =
  | { type: 'metadata'; key: string; value: string }
  | { type: 'freeform'; text: string };

export interface ConlluSentence {
  comments: ConlluComment[];
  tokens: ConlluToken[];
}

export interface ConlluDocument {
  sentences: ConlluSentence[];
}

// Constants for field indices and validation
const FIELD_INDICES = {
  ID: 0,
  FORM: 1,
  LEMMA: 2,
  UPOS: 3,
  XPOS: 4,
  FEATS: 5,
  HEAD: 6,
  DEPREL: 7,
  DEPS: 8,
  MISC: 9,
} as const;

const FIELD_NAMES = [
  'ID',
  'FORM',
  'LEMMA',
  'UPOS',
  'XPOS',
  'FEATS',
  'HEAD',
  'DEPREL',
  'DEPS',
  'MISC',
] as const;
const SPACE_ALLOWED_INDICES = [
  FIELD_INDICES.FORM,
  FIELD_INDICES.LEMMA,
  FIELD_INDICES.MISC,
] as const;

// Type guards
const isMultiwordToken = (id: string): boolean => /^\d+-\d+$/.test(id);
const isEmptyNode = (id: string): boolean =>
  /^(0|[1-9]\d*)\.[1-9]\d*$/.test(id); // decimal, not ending in .0
const isRegularToken = (id: string): boolean => /^\d+$/.test(id);
const isValidTokenId = (id: string): boolean =>
  isMultiwordToken(id) || isEmptyNode(id) || isRegularToken(id) || id === '_';

/**
 * Parse CoNLL-U format string into structured data
 */
export function parse(text: string): ConlluDocument {
  const lines = text.trim().split('\n');
  const sentences: ConlluSentence[] = [];
  let currentSentence: ConlluSentence | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (currentSentence) {
        sentences.push(currentSentence);
        currentSentence = null;
      }
      continue;
    }

    if (trimmedLine.startsWith('#')) {
      currentSentence ??= { comments: [], tokens: [] };
      parseComment(trimmedLine, currentSentence);
      continue;
    }

    const fields = trimmedLine.split('\t');
    if (fields.length >= 10) {
      currentSentence ??= { comments: [], tokens: [] };
      currentSentence.tokens.push(createToken(fields));
    }
  }

  if (currentSentence) {
    sentences.push(currentSentence);
  }

  return { sentences };
}

/**
 * Serialize structured data back to CoNLL-U format
 */
export function serialize(document: ConlluDocument): string {
  return document.sentences
    .map((sentence) => serializeSentence(sentence))
    .join('\n\n')
    .replace(/\n\n$/, '');
}

/**
 * Validate CoNLL-U format
 */
export function validate(text: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = text.trim().split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lineNumber = i + 1;
    if (line.startsWith('#')) {
      validateComment(line, lineNumber, errors);
    } else {
      validateTokenLine(line, lineNumber, errors);
    }
  }

  // Validate sentence-level constraints
  validateSentenceConstraints(lines, errors);

  return { isValid: errors.length === 0, errors };
}

function parseComment(line: string, sentence: ConlluSentence): void {
  const commentContent = line.substring(1).trim();
  const equalIndex = commentContent.indexOf('=');

  if (equalIndex !== -1) {
    const key = commentContent.substring(0, equalIndex).trim();
    const value = commentContent.substring(equalIndex + 1).trim();
    sentence.comments.push({ type: 'metadata', key, value });
  } else {
    sentence.comments.push({ type: 'freeform', text: commentContent });
  }
}

function createToken(fields: string[]): ConlluToken {
  const featsString = fields[FIELD_INDICES.FEATS] || '_';
  let feats: Record<string, string> | undefined;
  try {
    feats = parseFeats(featsString);
  } catch {
    feats = undefined;
  }

  const miscString = fields[FIELD_INDICES.MISC] || '_';
  let misc: string[] | undefined;
  try {
    misc = parseMisc(miscString);
  } catch {
    misc = undefined;
  }

  return {
    id: fields[FIELD_INDICES.ID] || '_',
    form: fields[FIELD_INDICES.FORM] || '_',
    lemma:
      fields[FIELD_INDICES.LEMMA] === '_'
        ? undefined
        : fields[FIELD_INDICES.LEMMA] || '_',
    upos:
      fields[FIELD_INDICES.UPOS] === '_'
        ? undefined
        : fields[FIELD_INDICES.UPOS] || '_',
    xpos:
      fields[FIELD_INDICES.XPOS] === '_'
        ? undefined
        : fields[FIELD_INDICES.XPOS] || '_',
    feats,
    head:
      fields[FIELD_INDICES.HEAD] === '_'
        ? undefined
        : fields[FIELD_INDICES.HEAD] || '_',
    deprel:
      fields[FIELD_INDICES.DEPREL] === '_'
        ? undefined
        : fields[FIELD_INDICES.DEPREL] || '_',
    deps:
      fields[FIELD_INDICES.DEPS] === '_'
        ? undefined
        : fields[FIELD_INDICES.DEPS] || '_',
    misc,
  };
}

function serializeSentence(sentence: ConlluSentence): string {
  const lines: string[] = [];

  // Add comments
  for (const comment of sentence.comments) {
    lines.push(
      comment.type === 'metadata'
        ? `# ${comment.key} = ${comment.value}`
        : `# ${comment.text}`,
    );
  }

  // Add tokens
  for (const token of sentence.tokens) {
    const featsString = token.feats ? serializeFeats(token.feats) : '_';
    const lemmaString = token.lemma ?? '_';
    const uposString = token.upos ?? '_';
    const xposString = token.xpos ?? '_';
    const headString = token.head ?? '_';
    const deprelString = token.deprel ?? '_';
    const depsString = token.deps ?? '_';
    const miscString = token.misc ? serializeMisc(token.misc) : '_';

    lines.push(
      [
        token.id,
        token.form,
        lemmaString,
        uposString,
        xposString,
        featsString,
        headString,
        deprelString,
        depsString,
        miscString,
      ].join('\t'),
    );
  }

  return lines.join('\n');
}

function validateComment(
  line: string,
  lineNumber: number,
  errors: string[],
): void {
  const commentContent = line.substring(1).trim();
  if (commentContent.includes('=')) {
    const parts = commentContent.split('=');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      errors.push(`Line ${lineNumber}: Invalid metadata format`);
    }
  }
}

function validateTokenLine(
  line: string,
  lineNumber: number,
  errors: string[],
): void {
  const fields = line.split('\t');

  if (fields.length < 10) {
    errors.push(
      `Line ${lineNumber}: Token line must have 10 tab-separated fields`,
    );
    return;
  }

  const id = fields[FIELD_INDICES.ID];
  if (!isValidTokenId(id)) {
    errors.push(`Line ${lineNumber}: Invalid token ID format`);
    return;
  }

  // Validate based on token type
  if (isMultiwordToken(id)) {
    validateMultiwordToken(fields, lineNumber, errors);
  } else if (isEmptyNode(id)) {
    validateEmptyNode(fields, lineNumber, errors);
  } else {
    validateRegularToken(fields, lineNumber, errors);
  }

  validateFieldSpaces(fields, lineNumber, errors);
  validateFeats(fields, lineNumber, errors);
}

function validateMultiwordToken(
  fields: string[],
  lineNumber: number,
  errors: string[],
): void {
  const restrictedFields = [
    fields[FIELD_INDICES.LEMMA],
    fields[FIELD_INDICES.UPOS],
    fields[FIELD_INDICES.XPOS],
    fields[FIELD_INDICES.HEAD],
    fields[FIELD_INDICES.DEPREL],
    fields[FIELD_INDICES.DEPS],
  ];

  if (restrictedFields.some((field) => field !== '_')) {
    errors.push(
      `Line ${lineNumber}: Multiword token fields (except FORM, MISC, FEATS=Typo=Yes) must be underscores`,
    );
  }

  const feats = fields[FIELD_INDICES.FEATS];
  if (feats !== '_' && feats !== 'Typo=Yes') {
    errors.push(
      `Line ${lineNumber}: Multiword token FEATS must be '_' or 'Typo=Yes'`,
    );
  }
}

function validateEmptyNode(
  fields: string[],
  lineNumber: number,
  errors: string[],
): void {
  if (
    fields[FIELD_INDICES.HEAD] !== '_' ||
    fields[FIELD_INDICES.DEPREL] !== '_'
  ) {
    errors.push(
      `Line ${lineNumber}: Empty node fields HEAD and DEPREL must be underscores`,
    );
  }

  if (fields[FIELD_INDICES.DEPS] === '_') {
    errors.push(`Line ${lineNumber}: Empty node field DEPS is required`);
  }
}

function validateRegularToken(
  fields: string[],
  lineNumber: number,
  errors: string[],
): void {
  if (!/^\d+$/.test(fields[FIELD_INDICES.HEAD])) {
    errors.push(`Line ${lineNumber}: HEAD must be integer or 0`);
  }

  if (!fields[FIELD_INDICES.DEPREL] || fields[FIELD_INDICES.DEPREL] === '_') {
    errors.push(`Line ${lineNumber}: DEPREL must not be empty`);
  }
}

function validateFieldSpaces(
  fields: string[],
  lineNumber: number,
  errors: string[],
): void {
  for (let i = 0; i < fields.length && i < 10; i++) {
    if (
      !SPACE_ALLOWED_INDICES.includes(
        i as (typeof SPACE_ALLOWED_INDICES)[number],
      ) &&
      /\s/.test(fields[i])
    ) {
      errors.push(
        `Line ${lineNumber}: No spaces allowed in field ${FIELD_NAMES[i]}`,
      );
    }
  }
}

function validateFeats(
  fields: string[],
  lineNumber: number,
  errors: string[],
): void {
  const featsString = fields[FIELD_INDICES.FEATS];
  if (featsString === '_' || featsString === '') {
    return;
  }

  try {
    parseFeats(featsString);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Line ${lineNumber}: ${error.message}`);
    }
  }
}

function validateSentenceConstraints(lines: string[], errors: string[]): void {
  let currentSentence = 1;
  let hasSentId = false;
  let hasText = false;
  let hasTokens = false;
  const multiwordRanges: string[] = [];
  const emptyNodeSequences = new Map<string, number>();
  let tokenLineNumber = 0;

  function checkSentenceMeta() {
    if (hasTokens) {
      if (!hasSentId) {
        errors.push(
          `Sentence ${currentSentence}: Missing required sent_id comment`,
        );
      }
      if (!hasText) {
        errors.push(
          `Sentence ${currentSentence}: Missing required text comment`,
        );
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      checkSentenceMeta();
      currentSentence++;
      hasSentId = false;
      hasText = false;
      hasTokens = false;
      multiwordRanges.length = 0;
      emptyNodeSequences.clear();
      tokenLineNumber = 0;
      continue;
    }
    if (line.startsWith('#')) {
      const commentContent = line.substring(1).trim();
      const equalIndex = commentContent.indexOf('=');
      if (equalIndex !== -1) {
        const key = commentContent.substring(0, equalIndex).trim();
        if (key === 'sent_id') hasSentId = true;
        if (key === 'text') hasText = true;
      }
      continue;
    }
    // Token line
    tokenLineNumber++;
    const fields = line.split('\t');
    if (fields.length >= 10) {
      hasTokens = true;
      const id = fields[FIELD_INDICES.ID];
      // Validate multiword token ranges
      if (isMultiwordToken(id)) {
        const [start, end] = id.split('-').map(Number);
        if (start >= end) {
          errors.push(
            `Line ${i + 1}: Multiword token range must be nonempty (start < end)`,
          );
        }
        for (const range of multiwordRanges) {
          const [rangeStart, rangeEnd] = range.split('-').map(Number);
          if (start <= rangeEnd && end >= rangeStart) {
            errors.push(
              `Line ${i + 1}: Multiword token ranges must not overlap`,
            );
          }
        }
        multiwordRanges.push(id);
      }
      // Validate empty node sequences
      if (isEmptyNode(id)) {
        const match = id.match(/^(\d+)\.(\d+)$/);
        if (match) {
          const baseId = match[1];
          const sequenceNum = parseInt(match[2]);
          const expectedSequence = (emptyNodeSequences.get(baseId) || 0) + 1;
          if (sequenceNum !== expectedSequence) {
            errors.push(
              `Line ${tokenLineNumber}: Empty node sequence must start at 1 and be consecutive (expected ${baseId}.${expectedSequence}, got ${id})`,
            );
          }
          emptyNodeSequences.set(baseId, sequenceNum);
        }
      }
    }
  }
  checkSentenceMeta();
}

/**
 * Parse FEATS string into key-value pairs
 */
export function parseFeats(
  featsString: string,
): Record<string, string> | undefined {
  if (featsString === '_' || featsString.trim() === '') {
    return undefined;
  }

  const result: Record<string, string> = {};
  const features = featsString.split('|');

  for (const feature of features) {
    const equalIndex = feature.indexOf('=');
    if (equalIndex === -1) {
      throw new Error(
        `Invalid FEATS format: "${feature}" (missing equals sign)`,
      );
    }

    const key = feature.substring(0, equalIndex).trim();
    if (key === '') {
      throw new Error(`Invalid FEATS format: "${feature}" (empty feature key)`);
    }

    const value = feature.substring(equalIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

/**
 * Serialize FEATS object back to string format
 */
export function serializeFeats(feats: Record<string, string>): string {
  if (Object.keys(feats).length === 0) {
    return '_';
  }

  const sortedFeatures = Object.keys(feats)
    .sort()
    .map((key) => `${key}=${feats[key]}`);

  return sortedFeatures.join('|');
}

/**
 * Parse MISC string into array of strings
 */
export function parseMisc(miscString: string): string[] | undefined {
  if (miscString === '_') {
    return undefined;
  }

  // MISC cannot be empty
  if (miscString === '') {
    throw new Error('Invalid MISC format: "" (empty field)');
  }

  // MISC cannot contain control characters (TAB, CR, LF, other control characters)
  // TAB is \x09, CR is \x0D, LF is \x0A
  const controlChars = /[\x00-\x1F\x7F]/;
  if (controlChars.test(miscString)) {
    throw new Error(
      `Invalid MISC format: "${miscString}" (contains control characters)`,
    );
  }

  // MISC cannot start or end with a space
  if (miscString.startsWith(' ') || miscString.endsWith(' ')) {
    throw new Error(
      `Invalid MISC format: "${miscString}" (starts or ends with space)`,
    );
  }

  return miscString.split('|');
}

/**
 * Serialize MISC array back to string format
 */
export function serializeMisc(misc: string[]): string {
  if (misc.length === 0) {
    return '_';
  }

  return misc.join('|');
}
