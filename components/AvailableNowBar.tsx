/**
 * AvailableNowBar.tsx - Barra"Quem tá livre agora?"
 * Exibe profissionais disponíveis em tempo real com filtro por serviço
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Check, Filter, Eye, EyeOff, RefreshCw, Scissors, User, Plus } from 'lucide-react';
import { getProfessionalsAvailableNow, getServicesForFilter, type ProfessionalAvailableNow } from '../lib/availabilityNow';

interface AvailableNowBarProps {
  businessId: string;
  onProfessionalClick?: (professionalId: string, freeUntil: Date) => void;
  showOnlyAvailable: boolean;
  onToggleShowOnlyAvailable: (value: boolean) => void;
  onAvailableProfessionalsChange?: (ids: string[]) => void;
  refreshTrigger?: number; // Change this to force a refresh
}

interface ServiceOption {
  id: string;
  name: string;
  duration_minutes: number;
}

const AvailableNowBar: React.FC<AvailableNowBarProps> = ({
  businessId,
  onProfessionalClick,
  showOnlyAvailable,
  onToggleShowOnlyAvailable,
  onAvailableProfessionalsChange,
  refreshTrigger
}) => {
  const [availableProfessionals, setAvailableProfessionals] = useState<ProfessionalAvailableNow[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Atualizar hora atual a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregar serviços uma vez
  useEffect(() => {
    const loadServices = async () => {
      if (!businessId) return;
      const data = await getServicesForFilter(businessId);
      setServices(data);
    };
    loadServices();
  }, [businessId]);

  // Carregar disponibilidade
  const loadAvailability = useCallback(async () => {
    if (!businessId) {
      console.log('🔴 [AvailableNowBar] No businessId, skipping load');
      return;
    }

    console.log('====================================');
    console.log('🔵 [AvailableNowBar] Loading availability...');
    console.log('🔵 [AvailableNowBar] businessId:', businessId);
    console.log('🔵 [AvailableNowBar] selectedServiceId:', selectedServiceId);

    setIsLoading(true);
    try {
      const minDuration = selectedServiceId
        ? services.find(s => s.id === selectedServiceId)?.duration_minutes || 15
        : 15;

      console.log('🔵 [AvailableNowBar] Calling getProfessionalsAvailableNow with:', {
        businessId,
        serviceId: selectedServiceId || 'none',
        minDuration
      });

      const data = await getProfessionalsAvailableNow(
        businessId,
        selectedServiceId || undefined,
        minDuration
      );

      console.log('🔵 [AvailableNowBar] RESULT:', {
        count: data.length,
        professionals: data.map(p => ({
          name: p.name,
          freeUntil: p.freeUntil.toLocaleTimeString('pt-BR'),
          freeMinutes: p.freeMinutes
        }))
      });

      setAvailableProfessionals(data);
      setLastRefresh(new Date());

      // Notify parent of available professional IDs
      onAvailableProfessionalsChange?.(data.map(p => p.professionalId));
    } catch (error) {
      console.error('❌ [AvailableNowBar] Error loading availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, selectedServiceId, services]);

  // Carregar ao montar e quando filtro mudar
  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Auto-refresh a cada 60 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      loadAvailability();
    }, 60000);
    return () => clearInterval(timer);
  }, [loadAvailability]);

  // Refresh when trigger changes (e.g., after a booking is made)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log('🔄 [AvailableNowBar] Refresh triggered:', refreshTrigger);
      loadAvailability();
    }
  }, [refreshTrigger, loadAvailability]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFreeUntil = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={() => console.log('🔴 [AvailableNowBar] MAIN CONTAINER clicked!')}
      className="mb-4 rounded-xl border border-[var(--border-default)] bg-gradient-to-r from-barber-900 to-barber-950 p-3 shadow-lg"
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-500/20">
              <Check size={14} className="text-success-500" />
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)]">Disponíveis agora</span>
            <span className="text-xs text-text-muted">– {formatTime(currentTime)}</span>
          </div>

          <button
            onClick={() => loadAvailability()}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-lg p-1.5 text-text-muted hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro por serviço */}
          <div className="relative">
            <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)] py-1.5 pl-7 pr-8 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
            >
              <option value="">Todos os serviços</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration_minutes}min)
                </option>
              ))}
            </select>
          </div>

          {/* Toggle destacar disponíveis */}
          <button
            onClick={() => onToggleShowOnlyAvailable(!showOnlyAvailable)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${showOnlyAvailable
              ? 'border-barber-gold bg-[var(--brand)]/10 text-[var(--brand-primary)]'
              : 'border-[var(--border-default)] bg-[var(--surface-subtle)] text-text-muted hover:border-[var(--border-strong)]'
              }`}
          >
            {showOnlyAvailable ? <Eye size={14} /> : <EyeOff size={14} />}
            Destacar livres
          </button>
        </div>
      </div>

      {/* Lista de profissionais disponíveis */}
      <div
        onClick={() => console.log('🟡 [AvailableNowBar] PROFESSIONALS LIST clicked!')}
        className="flex gap-2 overflow-x-auto pb-1 pt-2"
      >
        {isLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 w-40 animate-pulse rounded-lg bg-[var(--surface-subtle)]"
              />
            ))}
          </div>
        ) : availableProfessionals.length === 0 ? (
          <div className="flex w-full items-center justify-center py-3 text-center">
            <div className="flex items-center gap-2 text-text-muted">
              <Clock size={16} />
              <span className="text-xs">
                {selectedServiceId
                  ? 'Nenhum profissional disponível para este serviço agora'
                  : 'Nenhum profissional disponível no momento'
                }
              </span>
            </div>
          </div>
        ) : (
          availableProfessionals.map(prof => (
            <button
              key={prof.professionalId}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('🟢 [AvailableNowBar] Button clicked! profId:', prof.professionalId);
                if (onProfessionalClick) {
                  onProfessionalClick(prof.professionalId, prof.freeUntil);
                } else {
                  console.error('❌ onProfessionalClick is not defined!');
                }
              }}
              className="group flex min-w-[180px] shrink-0 items-center gap-2.5 rounded-lg border border-success-500/30 bg-success-500/10 p-2.5 text-left transition-all hover:border-success-500/50 hover:bg-success-500/15 relative"
              title="Clique para agendar agora"
            >
              {/* Plus icon on hover */}
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Plus size={12} className="text-black" />
              </div>

              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-success-500/50 bg-[var(--surface-card)] text-sm font-bold text-success-500">
                {prof.avatarUrl ? (
                  <img
                    src={prof.avatarUrl}
                    alt={prof.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  prof.name.charAt(0)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-[var(--text-primary)]">{prof.name}</div>
                <div className="flex items-center gap-1 text-[10px] text-success-400">
                  <Clock size={10} />
                  <span>livre até {formatFreeUntil(prof.freeUntil)}</span>
                </div>
                <div className="mt-0.5 flex gap-1">
                  {prof.services.slice(0, 2).map((service, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[9px] text-text-muted"
                      title={service.name}
                    >
                      {service.name.length > 8 ? service.name.substring(0, 8) + '...' : service.name}
                    </span>
                  ))}
                  {prof.services.length > 2 && (
                    <span className="rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-[9px] text-text-muted">
                      +{prof.services.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Info de atualização */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
        <span>
          {availableProfessionals.length} profissional(is) disponível(is)
        </span>
        <span>
          Atualizado às {formatTime(lastRefresh)}
        </span>
      </div>
    </div>
  );
};

export default AvailableNowBar;
