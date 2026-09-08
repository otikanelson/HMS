import React from 'react';
import './PatientStatusFilter.css';

/**
 * Controlled checkbox toggle. Parent owns the actual filtering — this just
 * reports the boolean and expects `includeArchived` back as a prop, so the
 * parent's existing search/fetch logic decides how to use it (e.g. adding
 * ?includeArchived=true to the existing patient search request).
 */
const PatientStatusFilter = ({ includeArchived, onChange }) => (
  <label className="status-filter-toggle">
    <input
      type="checkbox"
      checked={includeArchived}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>Include archived files</span>
  </label>
);

export default PatientStatusFilter;