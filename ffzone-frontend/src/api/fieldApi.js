import api from '../services/api'

// ── Field ─────────────────────────────────────────────────────────────────────

export const getAllFields = () =>
  api.get('/fields').then(r => r.data)

export const createField = (data) =>
  api.post('/fields', data).then(r => r.data)

export const updateField = (id, data) =>
  api.put(`/fields/${id}`, data).then(r => r.data)

export const deleteField = (id) =>
  api.delete(`/fields/${id}`)

// ── FieldImage ────────────────────────────────────────────────────────────────

export const getImagesByField = (fieldId) =>
  api.get(`/field-images/field/${fieldId}`).then(r => r.data)

export const uploadImage = (fieldId, file, isThumbnail) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('isThumbnail', isThumbnail)
  return api.post(`/field-images/upload/${fieldId}`, formData)
    .then(r => r.data)
}

export const setThumbnail = (imageId) =>
  api.put(`/field-images/${imageId}/thumbnail`).then(r => r.data)

export const deleteImage = (imageId) =>
  api.delete(`/field-images/${imageId}`)
