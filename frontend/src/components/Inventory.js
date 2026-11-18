import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Inventory.css';

const Inventory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    drugs: 0,
    supplies: 0,
    missingPrice: 0,
    missingQuantity: 0
  });
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMissingPrice, setShowMissingPrice] = useState(false);
  const [showMissingQuantity, setShowMissingQuantity] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddAnother, setShowAddAnother] = useState(false);
  const isAdministrator = user?.accessLevel === 'ADMINISTRATOR';

  // Fetch items with current filters
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (activeTab !== 'all') params.category = activeTab;
      if (searchQuery) params.q = searchQuery;
      if (showMissingPrice) params.missingPrice = 'true';
      if (showMissingQuantity) params.missingQuantity = 'true';

      const response = await axios.get('/api/inventory', { params });
      setItems(response.data.items);
      setCounts(response.data.counts);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, showMissingPrice, showMissingQuantity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleAddClick = () => {
    setEditingId('new');
    setEditValues({
      name: '',
      category: activeTab === 'all' ? 'drug' : activeTab,
      unit: '',
      expectedQuantity: null,
      price: null,
      notes: ''
    });
    setShowAddAnother(false);
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setEditValues({
      name: item.name,
      category: item.category,
      unit: item.unit || '',
      expectedQuantity: item.expectedQuantity ?? '',
      price: item.price ?? '',
      notes: item.notes || ''
    });
    setShowAddAnother(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: editValues.name,
        category: editValues.category,
        unit: editValues.unit || '',
        expectedQuantity: editValues.expectedQuantity === '' ? null : editValues.expectedQuantity,
        price: editValues.price === '' ? null : editValues.price,
        notes: editValues.notes || ''
      };

      if (editingId === 'new') {
        await axios.post('/api/inventory', payload);
      } else {
        await axios.put(`/api/inventory/${editingId}`, payload);
      }

      await fetchItems();

      if (editingId === 'new') {
        setShowAddAnother(true);
      } else {
        setEditingId(null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save item';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${editValues.name} from the list? It will no longer appear here.`)) {
      return;
    }

    setSaving(true);
    try {
      await axios.delete(`/api/inventory/${editingId}`);
      await fetchItems();
      setEditingId(null);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to remove item';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    setEditValues({
      name: '',
      category: activeTab === 'all' ? 'drug' : activeTab,
      unit: '',
      expectedQuantity: null,
      price: null,
      notes: ''
    });
    setError('');
    setShowAddAnother(false);
  };

  const handleFieldChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return 'Not set yet';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(price);
  };

  const filteredItems = items;

  return (
    <div className="inventory-list">
      {/* Header */}
      <div className="inventory-list-header">
        <div>
          <h1 className="page-title">Drugs & Supplies</h1>
          <p className="page-subtitle">Manage your pharmacy inventory</p>
        </div>
        <div className="list-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleAddClick} 
            data-guide="inventory-add-btn"
          >
            Add item
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-grid">
          <input
            type="text"
            placeholder="Search drugs and supplies"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-select"
            data-guide="inventory-search"
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#1f2937',
              fontSize: '0.875rem',
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            }}
          />
          
          <select 
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Items ({counts.total})</option>
            <option value="drug">Drugs ({counts.drugs})</option>
            <option value="supply">Supplies ({counts.supplies})</option>
          </select>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {counts.missingPrice > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={showMissingPrice}
                  onChange={(e) => setShowMissingPrice(e.target.checked)}
                />
                <span>No price ({counts.missingPrice})</span>
              </label>
            )}
            {counts.missingQuantity > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={showMissingQuantity}
                  onChange={(e) => setShowMissingQuantity(e.target.checked)}
                />
                <span>No quantity ({counts.missingQuantity})</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading inventory...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="no-staff">
          <div className="no-staff-icon">📦</div>
          <h3>{items.length === 0 ? 'No items yet' : 'No matches'}</h3>
          <p>
            {items.length === 0
              ? 'Press Add item to start building your inventory list.'
              : `Nothing matches "${searchQuery}".`}
          </p>
        </div>
      ) : (
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Type</th>
                <th>Sold As</th>
                <th>Expected Quantity</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.category === 'drug' ? 'Drug' : 'Supply'}</td>
                  <td>{item.unit || '—'}</td>
                  <td>
                    {item.expectedQuantity !== null && item.expectedQuantity !== undefined
                      ? item.expectedQuantity
                      : '—'}
                  </td>
                  <td>{formatPrice(item.price)}</td>
                  <td>
                    <button
                      className="inventory-item-edit"
                      onClick={() => handleEditClick(item)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {editingId && (
        <div className="inventory-modal-overlay" onClick={handleCancel}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId === 'new' ? 'Add item' : 'Edit item'}</h2>

            {error && <div className="inventory-error">{error}</div>}

            <div className="inventory-form-group">
              <label>Name</label>
              <input
                type="text"
                value={editValues.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onKeyDown={handleFieldKeyDown}
                placeholder="e.g. Paracetamol"
              />
            </div>

            <div className="inventory-form-group">
              <label>Type</label>
              <div className="inventory-type-choices">
                <button
                  className={`inventory-type-choice ${editValues.category === 'drug' ? 'active' : ''}`}
                  onClick={() => handleFieldChange('category', 'drug')}
                >
                  Drug
                </button>
                <button
                  className={`inventory-type-choice ${editValues.category === 'supply' ? 'active' : ''}`}
                  onClick={() => handleFieldChange('category', 'supply')}
                >
                  Supply
                </button>
              </div>
            </div>

            <div className="inventory-form-group">
              <label>Sold as</label>
              <input
                type="text"
                value={editValues.unit}
                onChange={(e) => handleFieldChange('unit', e.target.value)}
                onKeyDown={handleFieldKeyDown}
                placeholder="e.g. 1 tube, ½ pack, 1 ampoule"
              />
            </div>

            <div className="inventory-form-group">
              <label>Price (₦) for that amount</label>
              <input
                type="number"
                value={editValues.price}
                onChange={(e) => handleFieldChange('price', e.target.value)}
                onKeyDown={handleFieldKeyDown}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="inventory-form-group">
              <label>Should have (number)</label>
              <input
                type="number"
                value={editValues.expectedQuantity}
                onChange={(e) => handleFieldChange('expectedQuantity', e.target.value)}
                onKeyDown={handleFieldKeyDown}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="inventory-form-group">
              <label>Notes</label>
              <textarea
                value={editValues.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Optional"
                maxLength={300}
              />
            </div>

            <div className="inventory-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              {isAdministrator && editingId !== 'new' && (
                <button
                  className="btn btn-text"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  Remove from list
                </button>
              )}
              <button
                className="btn btn-filled"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {showAddAnother && editingId === 'new' && (
              <div className="inventory-add-another">
                <button
                  className="btn btn-text"
                  onClick={handleAddAnother}
                  disabled={saving}
                >
                  Add another
                </button>
                <button
                  className="btn btn-filled"
                  onClick={handleCancel}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
