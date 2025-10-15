import { useEffect, useState } from 'react';
import { api } from '../../shared/api';

interface Service {
  id: number;
  name: string;
  description?: string;
  priceCents: number;
  durationMin: number;
  categoryId: number;
}

interface ServiceCategory {
  id: number;
  name: string;
  desc?: string;
  services: Service[];
}

export default function Services() {
  const [cats, setCats] = useState<ServiceCategory[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceCents: 0,
    durationMin: 30,
    categoryId: 0
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    desc: ''
  });

  useEffect(() => { 
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const response = await api.get('/categories');
      setCats(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  function openServiceModal(service?: Service) {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        priceCents: service.priceCents,
        durationMin: service.durationMin,
        categoryId: service.categoryId
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        priceCents: 0,
        durationMin: 30,
        categoryId: cats[0]?.id || 0
      });
    }
    setShowServiceModal(true);
  }

  function openCategoryModal(category?: ServiceCategory) {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        desc: category.desc || ''
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        desc: ''
      });
    }
    setShowCategoryModal(true);
  }

  async function handleServiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingService) {
        await api.put(`/services/${editingService.id}`, formData);
      } else {
        await api.post('/services', formData);
      }
      setShowServiceModal(false);
      loadCategories();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCategory) {
        // Edit functionality not yet implemented
        return;
      } else {
        await api.post('/categories', categoryFormData);
      }
      setShowCategoryModal(false);
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  }

  async function deleteService(serviceId: number) {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await api.delete(`/services/${serviceId}`);
        loadCategories();
      } catch (error) {
        console.error('Failed to delete service:', error);
      }
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Services</h2>
        <div>
          <button className="btn btn-outline-primary me-2" onClick={() => openCategoryModal()}>
            <i className="bi bi-folder-plus me-2"/>Add Category
          </button>
          <button className="btn btn-primary" onClick={() => openServiceModal()}>
            <i className="bi bi-plus-lg me-2"/>Add Service
          </button>
        </div>
      </div>

      {cats.map((c) => (
        <div className="mb-4" key={c.id}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="text-secondary mb-0">{c.name}</h5>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => openCategoryModal(c)}
            >
              Edit Category
            </button>
          </div>
          {c.desc && <p className="text-muted small mb-2">{c.desc}</p>}
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th width="120"></th>
                </tr>
              </thead>
              <tbody>
                {c.services?.map((s: Service) => (
                  <tr key={s.id}>
                    <td className="fw-medium">{s.name}</td>
                    <td className="text-muted">{s.description || '-'}</td>
                    <td>{s.durationMin} min</td>
                    <td className="fw-medium">${(s.priceCents/100).toFixed(2)}</td>
                    <td>
                      <div className="d-inline-flex align-items-center gap-2 flex-nowrap">
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openServiceModal(s)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteService(s.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!c.services || c.services.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      No services in this category
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleServiceSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingService ? 'Edit Service' : 'Add Service'}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => setShowServiceModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: Number(e.target.value)})}
                      required
                    >
                      <option value="">Select Category</option>
                      {cats.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Service Name</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label">Duration (minutes)</label>
                      <input 
                        type="number"
                        className="form-control"
                        value={formData.durationMin}
                        onChange={(e) => setFormData({...formData, durationMin: Number(e.target.value)})}
                        min="1"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Price ($)</label>
                      <input 
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={formData.priceCents / 100}
                        onChange={(e) => setFormData({...formData, priceCents: Math.round(Number(e.target.value) * 100)})}
                        min="0"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowServiceModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingService ? 'Update' : 'Create'} Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleCategorySubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingCategory ? 'Edit Category' : 'Add Category'}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => setShowCategoryModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Category Name</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      value={categoryFormData.desc}
                      onChange={(e) => setCategoryFormData({...categoryFormData, desc: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowCategoryModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
