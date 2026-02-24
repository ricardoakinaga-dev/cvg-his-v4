'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { api } from '../../../../lib/api';
import { Can } from '../../../../components/auth/Can';

type ImagingScheduleSlot = {
  id: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  isAvailable: boolean;
  modality?: { id: string; code: string; name: string };
  order?: { id: string; orderNumber: string; patient?: { name: string } };
  notes?: string;
};

type ImagingModality = {
  id: string;
  code: string;
  name: string;
};

export default function AgendaImagemPage() {
  const [slots, setSlots] = useState<ImagingScheduleSlot[]>([]);
  const [modalities, setModalities] = useState<ImagingModality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedModality, setSelectedModality] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    modalityId: '',
    slotDate: '',
    slotStartTime: '08:00',
    slotEndTime: '08:30',
    notes: ''
  });

  useEffect(() => {
    fetchSlots();
    fetchModalities();
  }, [selectedDate, selectedModality]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('fromDate', selectedDate);
      params.set('toDate', selectedDate);
      if (selectedModality !== 'all') {
        params.set('modalityId', selectedModality);
      }
      
      const response = await api.get(`/imaging/schedule?${params.toString()}`);
      setSlots(response || []);
    } catch (err) {
      setError('Erro ao carregar agenda');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModalities = async () => {
    try {
      const response = await api.get('/imaging/modalities?pageSize=100');
      setModalities(response.items || []);
    } catch (err) {
      console.error('Erro ao carregar modalidades:', err);
    }
  };

  const handleCreateSlot = async () => {
    try {
      await api.post('/imaging/schedule', formData);
      setShowNewSlotModal(false);
      setFormData({
        modalityId: '',
        slotDate: selectedDate,
        slotStartTime: '08:00',
        slotEndTime: '08:30',
        notes: ''
      });
      fetchSlots();
    } catch (err) {
      console.error('Erro ao criar slot:', err);
      setError('Erro ao criar slot');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Deseja realmente excluir este horário?')) return;
    try {
      await api.delete(`/imaging/schedule/${slotId}`);
      fetchSlots();
    } catch (err) {
      console.error('Erro ao excluir slot:', err);
    }
  };

  const handleReleaseSlot = async (slotId: string) => {
    try {
      await api.post(`/imaging/schedule/${slotId}/release`);
      fetchSlots();
    } catch (err) {
      console.error('Erro ao liberar slot:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Group slots by time for display
  const slotsByTime = slots.reduce((acc, slot) => {
    const time = slot.slotStartTime;
    if (!acc[time]) acc[time] = [];
    acc[time].push(slot);
    return acc;
  }, {} as Record<string, ImagingScheduleSlot[]>);

  const sortedTimes = Object.keys(slotsByTime).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda de Imagem"
        actions={
          <Can permission="imagem.agenda.manage">
            <Button onClick={() => {
              setFormData({ ...formData, slotDate: selectedDate });
              setShowNewSlotModal(true);
            }}>
              Novo Horário
            </Button>
          </Can>
        }
      />

      {/* Date and Filter Controls */}
      <Card className="p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Data:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Modalidade:</label>
            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Todas</option>
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} - {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                setSelectedDate(prev.toISOString().split('T')[0]);
              }}
            >
              ← Dia Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                setSelectedDate(next.toISOString().split('T')[0]);
              }}
            >
              Próximo Dia →
            </Button>
          </div>
        </div>
      </Card>

      {/* Date Header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800 capitalize">
          {formatDate(selectedDate)}
        </h2>
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Schedule Grid */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando...</p>
        </Card>
      ) : sortedTimes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum horário configurado para este dia</p>
          <Can permission="imagem.agenda.manage">
            <Button 
              className="mt-4" 
              onClick={() => {
                setFormData({ ...formData, slotDate: selectedDate });
                setShowNewSlotModal(true);
              }}
            >
              Criar Horário
            </Button>
          </Can>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedTimes.map((time) => (
            <div key={time} className="flex gap-4">
              <div className="w-20 text-sm font-medium text-gray-600 py-2">
                {time}
              </div>
              <div className="flex-1 space-y-2">
                {slotsByTime[time].map((slot) => (
                  <Card 
                    key={slot.id} 
                    className={`p-3 ${
                      slot.isAvailable 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          slot.isAvailable 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-blue-200 text-blue-800'
                        }`}>
                          {slot.isAvailable ? 'Disponível' : 'Ocupado'}
                        </span>
                        {slot.modality && (
                          <span className="text-sm text-gray-600">
                            {slot.modality.name}
                          </span>
                        )}
                        {!slot.isAvailable && slot.order && (
                          <div className="text-sm">
                            <span className="font-medium">{slot.order.orderNumber}</span>
                            {slot.order.patient && (
                              <span className="text-gray-500 ml-2">
                                - {slot.order.patient.name}
                              </span>
                            )}
                          </div>
                        )}
                        {slot.notes && (
                          <span className="text-xs text-gray-500">{slot.notes}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!slot.isAvailable && (
                          <Can permission="imagem.agenda.manage">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReleaseSlot(slot.id)}
                            >
                              Liberar
                            </Button>
                          </Can>
                        )}
                        <Can permission="imagem.agenda.manage">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            Excluir
                          </Button>
                        </Can>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Slot Modal */}
      <Modal
        isOpen={showNewSlotModal}
        onClose={() => setShowNewSlotModal(false)}
        title="Novo Horário"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={formData.slotDate}
              onChange={(e) => setFormData({ ...formData, slotDate: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modalidade (opcional)
            </label>
            <select
              value={formData.modalityId}
              onChange={(e) => setFormData({ ...formData, modalityId: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Todas as modalidades</option>
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} - {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Início
              </label>
              <input
                type="time"
                value={formData.slotStartTime}
                onChange={(e) => setFormData({ ...formData, slotStartTime: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fim
              </label>
              <input
                type="time"
                value={formData.slotEndTime}
                onChange={(e) => setFormData({ ...formData, slotEndTime: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Observações opcionais"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowNewSlotModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSlot}>
              Criar Horário
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
