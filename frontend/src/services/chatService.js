import api from "./api";

export const chatService = {
  conversas:        ()              => api.get("/chat/conversas").then(r => r.data),
  showConversa:     (id)            => api.get(`/chat/conversas/${id}`).then(r => r.data),
  contactos:        (busca = "")    => api.get("/chat/contactos", { params: { busca } }).then(r => r.data),
  iniciarPrivada:   (userId)        => api.post("/chat/conversas/privada", { user_id: userId }).then(r => r.data),
  iniciarTurma:     (turmaId)       => api.post(`/chat/conversas/turma/${turmaId}`).then(r => r.data),
  mensagens:        (id, antes)     => api.get(`/chat/conversas/${id}/mensagens`, { params: antes ? { antes } : {} }).then(r => r.data),
  enviar:           (id, corpo)     => api.post(`/chat/conversas/${id}/mensagens`, { corpo }).then(r => r.data),
  marcarLida:       (id)            => api.post(`/chat/conversas/${id}/lida`).then(r => r.data),
  sondagem:         (desde)         => api.get("/chat/sondagem", { params: desde ? { desde } : {} }).then(r => r.data),
};
