/**
 * Lost & Found Smart Matching Service
 *
 * Deterministic scoring engine that computes similarity between complementary
 * Lost and Found items based on actual schema fields:
 * - Title / Item Name similarity
 * - Description keyword overlap & cross-field signals
 * - Location proximity / token overlap
 * - Date proximity
 * - Category matching (if present)
 * - Image availability signal (minor confidence modifier)
 *
 * Built for CampusConnect 360 without requiring external AI APIs.
 */

// Common English stopwords and low-information words commonly found in campus reports
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'it', 'this', 'that', 'and', 'or', 'near', 'lost', 'found', 'item', 'items',
  'my', 'i', 'me', 'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them',
  'was', 'were', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'please',
  'help', 'anyone', 'someone', 'contact', 'call', 'reward', 'urgent', 'around',
  'about', 'some', 'any', 'here', 'there', 'just', 'can', 'could', 'would',
  'should', 'be', 'also', 'inside', 'outside', 'very', 'really', 'kindly'
]);

// Generic color/modifier words that alone should NOT cause a high match (False Positive Control)
const GENERIC_MODIFIERS = new Set([
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'grey', 'gray', 'silver',
  'gold', 'brown', 'pink', 'purple', 'orange', 'dark', 'light', 'big', 'small',
  'large', 'medium', 'tiny', 'old', 'new', 'mini', 'pro', 'max', 'plus'
]);

// Common campus location normalization dictionary
const LOCATION_SYNONYMS = {
  audi: 'auditorium',
  gym: 'gymnasium',
  canteen: 'cafeteria',
  cafe: 'cafeteria',
  lib: 'library',
  ground: 'sports ground'
};

/**
 * Normalizes text: lowercase, strip punctuation, strip excess whitespace.
 *
 * @param {string} text
 * @returns {string}
 */
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Strips basic English plural suffixes for token comparison (e.g. earbuds -> earbud).
 *
 * @param {string} token
 * @returns {string}
 */
const stemToken = (token) => {
  if (!token || token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) return token.slice(0, -3) + 'y';
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
};

/**
 * Tokenizes text into meaningful tokens (stop-words removed, stemmed).
 *
 * @param {string} text
 * @returns {string[]}
 */
const extractTokens = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const rawWords = normalized.split(' ');
  const tokens = [];

  for (const word of rawWords) {
    if (word.length >= 2 && !STOP_WORDS.has(word)) {
      tokens.push(stemToken(word));
    }
  }

  return [...new Set(tokens)];
};

/**
 * Computes title / item name similarity.
 *
 * @param {string} nameA
 * @param {string} nameB
 * @returns {{ score: number, matchedTokens: string[], onlyGenericModifiers: boolean }}
 */
const calculateTitleSimilarity = (nameA, nameB) => {
  const normA = normalizeText(nameA);
  const normB = normalizeText(nameB);

  if (!normA || !normB) {
    return { score: 0, matchedTokens: [], onlyGenericModifiers: false };
  }

  // Exact match
  if (normA === normB) {
    return { score: 1.0, matchedTokens: extractTokens(normA), onlyGenericModifiers: false };
  }

  const tokensA = extractTokens(nameA);
  const tokensB = extractTokens(nameB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { score: 0, matchedTokens: [], onlyGenericModifiers: false };
  }

  const setB = new Set(tokensB);
  const matchedTokens = [];
  let substantiveMatchCount = 0;

  for (const token of tokensA) {
    if (setB.has(token)) {
      matchedTokens.push(token);
      if (!GENERIC_MODIFIERS.has(token)) {
        substantiveMatchCount++;
      }
    } else {
      // Check partial/prefix match (e.g. 'earphone' vs 'earphones' if not caught by stem)
      const partialMatch = tokensB.find((t) => (t.startsWith(token) || token.startsWith(t)) && Math.min(t.length, token.length) >= 4);
      if (partialMatch) {
        matchedTokens.push(token);
        if (!GENERIC_MODIFIERS.has(token)) {
          substantiveMatchCount++;
        }
      }
    }
  }

  // False positive guard: If matched tokens are only generic modifiers (e.g. "black" wallet vs "black" laptop)
  const onlyGeneric = matchedTokens.length > 0 && substantiveMatchCount === 0;
  if (onlyGeneric) {
    return {
      score: 0.15, // Capped low to prevent false positive match
      matchedTokens,
      onlyGenericModifiers: true
    };
  }

  // Token containment (ratio of smaller set matched) and Jaccard index
  const minLen = Math.min(tokensA.length, tokensB.length);
  const totalUnique = new Set([...tokensA, ...tokensB]).size;
  const containment = matchedTokens.length / Math.max(1, minLen);
  const jaccard = matchedTokens.length / Math.max(1, totalUnique);

  // Substring containment bonus (e.g. "Boat Earbuds" within "Black Boat Wireless Earbuds")
  const isSubstring = normA.includes(normB) || normB.includes(normA);
  const substringBonus = isSubstring ? 0.2 : 0;

  const rawScore = (containment * 0.6) + (jaccard * 0.4) + substringBonus;
  const score = Math.min(1.0, Math.max(0, rawScore));

  return { score, matchedTokens, onlyGenericModifiers: false };
};

/**
 * Computes description keyword similarity and cross-field keyword matches.
 *
 * @param {string} descA
 * @param {string} descB
 * @param {string[]} [titleTokensA=[]]
 * @param {string[]} [titleTokensB=[]]
 * @returns {{ score: number, matchedTokens: string[], crossMatched: boolean }}
 */
const calculateDescriptionSimilarity = (descA, descB, titleTokensA = [], titleTokensB = []) => {
  const tokensA = extractTokens(descA);
  const tokensB = extractTokens(descB);

  const matchedTokens = [];
  const setB = new Set(tokensB);

  for (const token of tokensA) {
    if (setB.has(token)) {
      matchedTokens.push(token);
    }
  }

  // Cross-field matching: check if title of A is mentioned in description of B or vice versa
  let crossMatched = false;
  const setDescA = new Set(tokensA);
  const setDescB = new Set(tokensB);

  const titleAInDescB = titleTokensA.some((t) => !GENERIC_MODIFIERS.has(t) && setDescB.has(t));
  const titleBInDescA = titleTokensB.some((t) => !GENERIC_MODIFIERS.has(t) && setDescA.has(t));

  if (titleAInDescB || titleBInDescA) {
    crossMatched = true;
  }

  if (tokensA.length === 0 && tokensB.length === 0) {
    return { score: crossMatched ? 0.35 : 0, matchedTokens: [], crossMatched };
  }

  const denominator = Math.max(1, Math.min(tokensA.length, tokensB.length, 10));
  let score = matchedTokens.length / denominator;

  if (crossMatched) {
    score = Math.min(1.0, score + 0.25);
  }

  return {
    score: Math.min(1.0, Math.max(0, score)),
    matchedTokens,
    crossMatched
  };
};

/**
 * Computes location similarity.
 *
 * @param {string} locA
 * @param {string} locB
 * @returns {{ score: number, isSame: boolean, isNearby: boolean }}
 */
const calculateLocationScore = (locA, locB) => {
  const normA = normalizeText(locA);
  const normB = normalizeText(locB);

  if (!normA || !normB) {
    return { score: 0.2, isSame: false, isNearby: false };
  }

  // Exact match
  if (normA === normB) {
    return { score: 1.0, isSame: true, isNearby: false };
  }

  // Substring containment (e.g. "library" vs "central library", "lab 3" vs "computer lab 3")
  if (normA.includes(normB) || normB.includes(normA)) {
    return { score: 0.9, isSame: false, isNearby: true };
  }

  const tokensA = extractTokens(locA).map((t) => LOCATION_SYNONYMS[t] || t);
  const tokensB = extractTokens(locB).map((t) => LOCATION_SYNONYMS[t] || t);

  const setB = new Set(tokensB);
  const overlap = tokensA.filter((t) => setB.has(t));

  if (overlap.length > 0) {
    const minLen = Math.min(tokensA.length, tokensB.length);
    const score = Math.min(0.85, 0.5 + (overlap.length / Math.max(1, minLen)) * 0.35);
    return { score, isSame: false, isNearby: true };
  }

  // Completely different locations (e.g. "library" vs "canteen")
  return { score: 0.0, isSame: false, isNearby: false };
};

/**
 * Computes date proximity score.
 *
 * @param {Date|string} dateA
 * @param {Date|string} dateB
 * @param {string} [typeA]
 * @param {string} [typeB]
 * @returns {{ score: number, daysDiff: number }}
 */
const calculateDateScore = (dateA, dateB, typeA, typeB) => {
  const d1 = new Date(dateA);
  const d2 = new Date(dateB);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return { score: 0.5, daysDiff: 0 };
  }

  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let score = 0;
  if (daysDiff === 0) {
    score = 1.0;
  } else if (daysDiff <= 1) {
    score = 0.95;
  } else if (daysDiff <= 3) {
    score = 0.85;
  } else if (daysDiff <= 7) {
    score = 0.70;
  } else if (daysDiff <= 14) {
    score = 0.50;
  } else if (daysDiff <= 30) {
    score = 0.30;
  } else if (daysDiff <= 60) {
    score = 0.15;
  } else {
    score = 0.05;
  }

  // Logical temporal check: If typeA is Lost and typeB is Found,
  // finding an item weeks before it was lost is improbable
  if (typeA === 'Lost' && typeB === 'Found' && d2.getTime() < d1.getTime() - (3 * 24 * 60 * 60 * 1000)) {
    score *= 0.65;
  } else if (typeA === 'Found' && typeB === 'Lost' && d1.getTime() < d2.getTime() - (3 * 24 * 60 * 60 * 1000)) {
    score *= 0.65;
  }

  return { score, daysDiff };
};

/**
 * Computes category score if category is present on both records.
 *
 * @param {string} [catA]
 * @param {string} [catB]
 * @returns {{ evaluated: boolean, score: number, matches: boolean }}
 */
const calculateCategoryScore = (catA, catB) => {
  const normA = normalizeText(catA);
  const normB = normalizeText(catB);

  if (!normA || !normB) {
    return { evaluated: false, score: 0, matches: false };
  }

  if (normA === normB) {
    return { evaluated: true, score: 1.0, matches: true };
  }

  return { evaluated: true, score: 0.1, matches: false };
};

/**
 * Minimum match percentage to consider showing a result.
 */
const MIN_MATCH_THRESHOLD = 45;

/**
 * Calculates authoritative match score and detailed reasons between two LostFound items.
 *
 * @param {Object} itemA - The reference item
 * @param {Object} itemB - The candidate item
 * @returns {{ matchScore: number, confidence: string, reasons: string[], breakdown: Object }}
 */
const calculateMatchScore = (itemA, itemB) => {
  // Complementary direction check: only Lost <-> Found matches are valid
  if (!itemA || !itemB || itemA.type === itemB.type) {
    return {
      matchScore: 0,
      confidence: 'None',
      reasons: [],
      breakdown: {}
    };
  }

  const tokensNameA = extractTokens(itemA.itemName);
  const tokensNameB = extractTokens(itemB.itemName);

  const titleResult = calculateTitleSimilarity(itemA.itemName, itemB.itemName);
  const descResult = calculateDescriptionSimilarity(
    itemA.description,
    itemB.description,
    tokensNameA,
    tokensNameB
  );
  const locationResult = calculateLocationScore(itemA.location, itemB.location);
  const dateResult = calculateDateScore(
    itemA.itemDate || itemA.createdAt,
    itemB.itemDate || itemB.createdAt,
    itemA.type,
    itemB.type
  );
  const categoryResult = calculateCategoryScore(itemA.category, itemB.category);

  // Compute weighted score based on available fields
  let totalScore = 0;
  const breakdown = {
    title: Math.round(titleResult.score * 100),
    description: Math.round(descResult.score * 100),
    location: Math.round(locationResult.score * 100),
    date: Math.round(dateResult.score * 100),
    category: categoryResult.evaluated ? Math.round(categoryResult.score * 100) : null
  };

  if (categoryResult.evaluated) {
    totalScore =
      titleResult.score * 0.35 +
      descResult.score * 0.25 +
      locationResult.score * 0.15 +
      dateResult.score * 0.10 +
      categoryResult.score * 0.15;
  } else {
    // Graceful weight redistribution when category is not present
    totalScore =
      titleResult.score * 0.45 +
      descResult.score * 0.30 +
      locationResult.score * 0.15 +
      dateResult.score * 0.10;
  }

  // Image availability signal: minor 2% confidence addition if both records include an image
  if (itemA.imageUrl && itemB.imageUrl) {
    totalScore = Math.min(1.0, totalScore + 0.02);
  }

  // False positive guard: If title matched ONLY generic colors and location is completely different,
  // strictly suppress score
  if (titleResult.onlyGenericModifiers && locationResult.score === 0) {
    totalScore = Math.min(0.3, totalScore);
  }

  const matchScore = Math.round(totalScore * 100);

  // Confidence level
  let confidence = 'Possible';
  if (matchScore >= 85) {
    confidence = 'Very Strong';
  } else if (matchScore >= 70) {
    confidence = 'Strong';
  } else if (matchScore >= 50) {
    confidence = 'Moderate';
  } else {
    confidence = 'Low';
  }

  // Generate verified reasons based strictly on scoring factors
  const reasons = [];

  if (categoryResult.evaluated && categoryResult.matches) {
    reasons.push(`Same category: ${itemB.category || itemA.category}`);
  }

  if (titleResult.score >= 0.9) {
    reasons.push(`Identical or near-identical item name: "${itemB.itemName}"`);
  } else if (titleResult.score >= 0.5 && titleResult.matchedTokens.length > 0) {
    const sampleTokens = titleResult.matchedTokens.slice(0, 3).join(', ');
    reasons.push(`Similar item name (matched "${sampleTokens}")`);
  }

  if (descResult.matchedTokens.length >= 2) {
    const sampleDesc = descResult.matchedTokens.slice(0, 3).join(', ');
    reasons.push(`Description overlap (${sampleDesc})`);
  } else if (descResult.crossMatched) {
    reasons.push('Item name mentioned in report description');
  }

  if (locationResult.isSame) {
    reasons.push(`Same location: "${itemB.location}"`);
  } else if (locationResult.isNearby) {
    reasons.push(`Nearby location: "${itemB.location}"`);
  }

  if (dateResult.daysDiff === 0) {
    reasons.push('Reported on the same day');
  } else if (dateResult.daysDiff === 1) {
    reasons.push('Reported 1 day apart');
  } else if (dateResult.daysDiff <= 7) {
    reasons.push(`Reported within ${dateResult.daysDiff} days`);
  }

  if (itemA.imageUrl && itemB.imageUrl) {
    reasons.push('Both reports include photos for verification');
  }

  // Ensure there is at least one clear reason if threshold met
  if (reasons.length === 0 && matchScore >= MIN_MATCH_THRESHOLD) {
    reasons.push('General description and proximity match');
  }

  return {
    matchScore,
    confidence,
    reasons,
    breakdown
  };
};

/**
 * Finds and ranks complementary matches for a given item among candidate records.
 *
 * @param {Object} targetItem - The LostFound item to match
 * @param {Array<Object>} candidates - List of potential candidate records
 * @param {Object} [options]
 * @param {number} [options.limit=5] - Maximum top matches to return
 * @param {number} [options.threshold=MIN_MATCH_THRESHOLD] - Minimum match score percentage
 * @returns {Array<Object>} Ranked matches with score and reasons
 */
const findMatchesForItem = (targetItem, candidates, options = {}) => {
  const limit = options.limit || 5;
  const threshold = options.threshold || MIN_MATCH_THRESHOLD;

  if (!targetItem || !Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const results = [];
  const targetIdStr = (targetItem._id || targetItem.id)?.toString();

  for (const candidate of candidates) {
    const candidateIdStr = (candidate._id || candidate.id)?.toString();

    // Prevent matching self
    if (targetIdStr && candidateIdStr && targetIdStr === candidateIdStr) {
      continue;
    }

    // Must be complementary type
    if (candidate.type === targetItem.type) {
      continue;
    }

    // Do not match closed items
    if (candidate.status === 'Closed') {
      continue;
    }

    const { matchScore, confidence, reasons, breakdown } = calculateMatchScore(targetItem, candidate);

    if (matchScore >= threshold) {
      results.push({
        item: candidate,
        matchScore,
        confidence,
        reasons,
        breakdown
      });
    }
  }

  // Sort descending by match score
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results.slice(0, limit);
};

module.exports = {
  MIN_MATCH_THRESHOLD,
  normalizeText,
  extractTokens,
  calculateTitleSimilarity,
  calculateDescriptionSimilarity,
  calculateLocationScore,
  calculateDateScore,
  calculateCategoryScore,
  calculateMatchScore,
  findMatchesForItem
};
