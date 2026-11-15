const StorageRange = require('../models/StorageRange');

/**
 * Normalize a patient number: trim, digits only, remove leading zeros
 * Returns empty string if not 1 to 8 digits
 */
function normalizePatientNumber(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 1 || digitsOnly.length > 8) return '';
  // Remove leading zeros
  return String(parseInt(digitsOnly, 10));
}

/**
 * Find the range that contains a patient number
 * Returns { section, tier, column, text } or null
 */
function locationFor(patientId, ranges) {
  const num = parseInt(patientId, 10);
  if (isNaN(num)) return null;

  for (const range of ranges) {
    if (num >= range.fromNumber && num <= range.toNumber) {
      return {
        section: range.section,
        tier: range.tier,
        column: range.column,
        text: locationText(patientId, ranges)
      };
    }
  }
  return null;
}

/**
 * Load all storage ranges from database
 * No caching (serverless instances would disagree)
 */
async function loadRanges() {
  return StorageRange.find().lean();
}

/**
 * Get location text for a patient number
 */
function locationText(patientId, ranges) {
  const location = locationFor(patientId, ranges);
  if (!location) return 'Not in the storage map yet';
  const columnText = location.column === 'left' ? 'Left column' : 'Right column';
  return `Section ${location.section} · Tier ${location.tier} · ${columnText}`;
}

/**
 * Attach location information to patient objects
 * Adds locationDisplay to patient docs and currentLocation to visits
 */
function attachLocation(docOrDocs, ranges) {
  if (!Array.isArray(docOrDocs)) {
    // Single document
    if (docOrDocs.patientId !== undefined) {
      // It's a patient doc
      docOrDocs.locationDisplay = locationText(docOrDocs.patientId, ranges);
    } else if (docOrDocs.patientId !== undefined) {
      // It's a visit doc
      docOrDocs.currentLocation = locationText(docOrDocs.patientId, ranges);
    }
    return docOrDocs;
  }

  // Array of documents
  return docOrDocs.map(doc => {
    const copy = doc.toObject ? doc.toObject() : { ...doc };
    if (copy.patientId !== undefined && copy.patientName !== undefined) {
      // It's a visit (has patientName)
      copy.currentLocation = locationText(copy.patientId, ranges);
    } else if (copy.patientId !== undefined) {
      // It's a patient
      copy.locationDisplay = locationText(copy.patientId, ranges);
    }
    return copy;
  });
}

module.exports = {
  normalizePatientNumber,
  locationFor,
  loadRanges,
  locationText,
  attachLocation
};
