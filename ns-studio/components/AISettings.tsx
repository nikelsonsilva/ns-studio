
import React from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  BarChart3, 
  Zap,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import { SystemSettings } from '../types';
import Switch from './ui/Switch';

interface AISettingsProps {
  config: SystemSettings['aiConfig'];
  onChange: (newConfig: SystemSettings['aiConfig']) => void;
}

const AISettings: React.FC<AISettingsProps> = ({ config, onChange }) => {

  const handleToggleEnable = (checked: boolean) => {
    onChange({ ...config, enableInsights: checked });
  };

  const handleToggleType = (type: keyof typeof config.insightTypes) => {
    onChange({
      ...config,
      insightTypes: {
        ...config.insightTypes,
        [type]: !config.insightTypes[type]
      }
    });
  };

  const handleChangeFrequency = (val: number) => {
    const freq = val === 0 ? 'low' : val === 1 ? 'medium' : 'high';
    onChange({ ...config, notificationFrequency: freq });
  };
  
  const handleChangeTone = (tone: 'professional' | 'friendly' | 'analytical') => {
      onChange({ ...config, tone });
  };

  return (
    <div className="bg-barber-950 border border-barber-800 rounded-xl p-6 relative overflow-hidden shadow-2xl">
        {/* Visual Background Effects */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-barber-gold/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 relative z-10 border-b border-barber-800/50 pb-4">
            <div>
                <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <BrainCircuit className="text-barber-gold" /> Inteligência Artificial (NS Brain)
                </h3>
                <p className="text-sm text-gray-400 mt-1">Configure como a IA analisa seus dados e interage com você.</p>
            </div>
            <div className="flex items-center gap-3 mt-4 sm:mt-0 bg-barber-900/50 px-4 py-2 rounded-full border border-barber-800">
                <span className={`text-xs font-bold uppercase tracking-wider ${config.enableInsights ? 'text-green-500' : 'text-gray-500'}`}>
                    {config.enableInsights ? 'Sistema Ativo' : 'Desativado'}
                </span>
                <Switch checked={config.enableInsights} onCheckedChange={handleToggleEnable} />
            </div>
        </div>

        <div className={`space-y-8 transition-all duration-500 ${!config.enableInsights ? 'opacity-40 pointer-events-none blur-[1px]' : ''}`}>
           
           {/* Insight Types Grid */}
           <div>
               <h4 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Zap size={14} /> Tipos de Insight
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Card 1: Churn */}
                  <div 
                    onClick={() => handleToggleType('churn')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${config.insightTypes.churn ? 'bg-red-500/10 border-red-500/50' : 'bg-barber-900 border-barber-800 opacity-60'}`}
                  >
                      <div className="flex justify-between items-start mb-2">
                          <ShieldAlert size={24} className={config.insightTypes.churn ? 'text-red-500' : 'text-gray-500'} />
                          <div className={`w-3 h-3 rounded-full ${config.insightTypes.churn ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gray-700'}`}></div>
                      </div>
                      <h5 className="text-white font-bold text-sm">Risco de Churn</h5>
                      <p className="text-xs text-gray-400 mt-1">Detecta clientes VIP que pararam de frequentar.</p>
                  </div>

                  {/* Card 2: Financial */}
                  <div 
                    onClick={() => handleToggleType('financial')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${config.insightTypes.financial ? 'bg-green-500/10 border-green-500/50' : 'bg-barber-900 border-barber-800 opacity-60'}`}
                  >
                      <div className="flex justify-between items-start mb-2">
                          <BarChart3 size={24} className={config.insightTypes.financial ? 'text-green-500' : 'text-gray-500'} />
                          <div className={`w-3 h-3 rounded-full ${config.insightTypes.financial ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-700'}`}></div>
                      </div>
                      <h5 className="text-white font-bold text-sm">Financeiro</h5>
                      <p className="text-xs text-gray-400 mt-1">Análise de margem, metas e sugestões de preços.</p>
                  </div>

                  {/* Card 3: Operational */}
                  <div 
                    onClick={() => handleToggleType('operational')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${config.insightTypes.operational ? 'bg-blue-500/10 border-blue-500/50' : 'bg-barber-900 border-barber-800 opacity-60'}`}
                  >
                      <div className="flex justify-between items-start mb-2">
                          <Sparkles size={24} className={config.insightTypes.operational ? 'text-blue-500' : 'text-gray-500'} />
                          <div className={`w-3 h-3 rounded-full ${config.insightTypes.operational ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-gray-700'}`}></div>
                      </div>
                      <h5 className="text-white font-bold text-sm">Operacional</h5>
                      <p className="text-xs text-gray-400 mt-1">Otimização de agenda e gestão de ociosidade.</p>
                  </div>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Frequency Slider */}
               <div className="bg-barber-900/50 p-5 rounded-xl border border-barber-800">
                  <div className="flex justify-between items-center mb-4">
                      <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-2"><Zap size={14} /> Frequência de Notificações</p>
                      <span className="text-xs bg-barber-gold text-black font-bold px-2 py-0.5 rounded capitalize">{config.notificationFrequency}</span>
                  </div>
                  
                  <div className="relative pt-2 pb-4">
                    <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="1"
                        className="w-full accent-barber-gold h-1.5 bg-barber-800 rounded-lg appearance-none cursor-pointer"
                        value={config.notificationFrequency === 'low' ? 0 : config.notificationFrequency === 'medium' ? 1 : 2}
                        onChange={(e) => handleChangeFrequency(Number(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-medium uppercase tracking-wider">
                        <span>Baixa (Semanal)</span>
                        <span>Média (Diária)</span>
                        <span>Alta (Tempo Real)</span>
                    </div>
                  </div>
               </div>

               {/* Tone Personality */}
               <div className="bg-barber-900/50 p-5 rounded-xl border border-barber-800">
                   <p className="text-xs text-gray-400 font-bold uppercase mb-4 flex items-center gap-2"><MessageSquare size={14} /> Personalidade da IA</p>
                   <div className="flex gap-2">
                       <button 
                         onClick={() => handleChangeTone('professional')}
                         className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${config.tone === 'professional' ? 'bg-white text-black border-white' : 'bg-barber-950 border-barber-800 text-gray-400 hover:border-gray-600'}`}
                       >
                           Profissional
                       </button>
                       <button 
                         onClick={() => handleChangeTone('friendly')}
                         className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${config.tone === 'friendly' ? 'bg-barber-gold text-black border-barber-gold' : 'bg-barber-950 border-barber-800 text-gray-400 hover:border-gray-600'}`}
                       >
                           Amigável
                       </button>
                       <button 
                         onClick={() => handleChangeTone('analytical')}
                         className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${config.tone === 'analytical' ? 'bg-blue-500 text-white border-blue-500' : 'bg-barber-950 border-barber-800 text-gray-400 hover:border-gray-600'}`}
                       >
                           Analítico
                       </button>
                   </div>
                   <p className="text-[10px] text-gray-500 mt-3 italic">
                       {config.tone === 'professional' && "Ex: 'Sua meta foi atingida em 85%.'"}
                       {config.tone === 'friendly' && "Ex: 'Parabéns! Você já bateu 85% da meta, falta pouco!'"}
                       {config.tone === 'analytical' && "Ex: 'Desempenho: 85%. Delta: -15%. Sugestão: Aumentar ticket médio.'"}
                   </p>
               </div>
           </div>

        </div>
    </div>
  );
};

export default AISettings;
