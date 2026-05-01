import api from "./api";

export const comunidadeService = {
  feed:        (antes)             => api.get("/comunidade/feed",            { params: antes ? { antes } : {} }).then(r => r.data),
  forumTurma:  (turmaId, antes)    => api.get(`/comunidade/forum/turma/${turmaId}`, { params: antes ? { antes } : {} }).then(r => r.data),
  show:        (postId)            => api.get(`/comunidade/posts/${postId}`).then(r => r.data),
  criar:       (payload)           => api.post("/comunidade/posts", payload).then(r => r.data),
  actualizar:  (postId, payload)   => api.put(`/comunidade/posts/${postId}`, payload).then(r => r.data),
  apagar:      (postId)            => api.delete(`/comunidade/posts/${postId}`).then(r => r.data),
  comentar:    (postId, corpo)     => api.post(`/comunidade/posts/${postId}/comentarios`, { corpo }).then(r => r.data),
  apagarComentario: (cid)          => api.delete(`/comunidade/comentarios/${cid}`).then(r => r.data),
  gostar:      (postId)            => api.post(`/comunidade/posts/${postId}/gostar`).then(r => r.data),
  aceitar:     (postId, cid)       => api.post(`/comunidade/posts/${postId}/aceitar/${cid}`).then(r => r.data),
};
