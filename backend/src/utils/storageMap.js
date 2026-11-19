const StorageRange = require('../models/StorageRange');

/**
 * Normalize a patient number: trim, digits only, remove leading zeros
 * For ANC numbers: if text starts with "ANC", extract the sequence and convert to 90000000 + seq
 * Returns empty string if not 1 to 8 digits after normalization
 */
function normalizePatientNumber(value) {
  if (!value) return '';
  const trimmed = String(value).trim();

  // Check if it's an ANC number (ANC-xxxx or ANC xxxx pattern)
  if (/^ANC[\s-]?/i.test(trimmed)) {
    // Extract digits after ANC
    const match = trimmed.match(/ANC[\s-]?(\d+)/i);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (seq >= 1 && seq <= 99999999) {
        return String(90000000 + seq);
      }
    }
    return '';
  }

  // Regular patient number - digits only, remove leading zeros
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 1 || digitsOnly.length > 8) return '';
  return String(parseInt(digitsOnly, 10));
}

/**
 * Get display number for a patient
 * For antenatal: ANC-0001, ANC-0002, etc (from the stored numeric ID)
 * For general: plain patient ID
 */
function displayNumber(patient) {
  if (!patient) return '';
  if (patient.patientType === 'antenatal' && patient.patientId) {
    // Extract sequence from 90000000 + seq format
    const num = parseInt(patient.patientId, 10);
    if (num >= 90000000) {
      const seq = num - 90000000;
      return `ANC-${String(seq).padStart(4, '0')}`;
    }
  }
  return patient.patientId || '';
}
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
 * Adds locationDisplay and displayNumber to patient docs and currentLocation to visits
 * For antenatal patients, sets locationDisplay to the antenatal text
 */
function attachLocation(docOrDocs, ranges) {
  if (!Array.isArray(docOrDocs)) {
    // Single document - return as plain object
    const plainDoc = docOrDocs.toObject ? docOrDocs.toObject() : { ...docOrDocs };

    if (plainDoc.patientName !== undefined) {
      // It's a visit doc
      if (plainDoc.patientType === 'antenatal') {
        plainDoc.currentLocation = 'Antenatal — no paper file location';
      } else {
        plainDoc.currentLocation = locationText(plainDoc.patientId, ranges);
      }
    } else if (plainDoc.patientId !== undefined) {
      // It's a patient doc
      if (plainDoc.patientType === 'antenatal') {
        plainDoc.locationDisplay = 'Antenatal — no paper file location';
      } else {
        plainDoc.locationDisplay = locationText(plainDoc.patientId, ranges);
      }
      plainDoc.displayNumber = displayNumber(plainDoc);
    }
    return plainDoc;
  }

  // Array of documents
  return docOrDocs.map(doc => {
    const copy = doc.toObject ? doc.toObject() : { ...doc };
    if (copy.patientName !== undefined) {
      // It's a visit (has patientName)
      if (copy.patientType === 'antenatal') {
        copy.currentLocation = 'Antenatal — no paper file location';
      } else {
        copy.currentLocation = locationText(copy.patientId, ranges);
      }
    } else if (copy.patientId !== undefined) {
      // It's a patient
      if (copy.patientType === 'antenatal') {
        copy.locationDisplay = 'Antenatal — no paper file location';
      } else {
        copy.locationDisplay = locationText(copy.patientId, ranges);
      }
      copy.displayNumber = displayNumber(copy);
    }
    return copy;
  });
}

module.exports = {
  normalizePatientNumber,
  displayNumber,
  locationFor,
  loadRanges,
  locationText,
  attachLocation
};
