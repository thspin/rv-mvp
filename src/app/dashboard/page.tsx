'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserAsync, getTeamAsync, leaveTeamAsync, updateAthleteProfileAsync, Team, Athlete } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import {
  Users,
  MessageSquare,
  FileText,
  DollarSign,
  Heart,
  AlertTriangle,
  Upload,
  ExternalLink,
  MapPin,
  Clock
} from 'lucide-react';

export default function AthleteDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Athlete | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [certError, setCertError] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  const loadData = async () => {
    const currentUser = await getCurrentUserAsync();
    if (!currentUser) {
      router.push('/');
      return;
    }
    if (!currentUser.onboarding_complete) {
      router.push('/onboarding');
      return;
    }
    setUser(currentUser);
    if (currentUser.team_id) {
      const teamData = await getTeamAsync(currentUser.team_id);
      setTeam(teamData);
    } else {
      setTeam(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLeaveTeam = async () => {
    if (!user) return;
    const confirmLeave = confirm('¿Estas seguro de que deseas darte de baja de este equipo? Se borraran tus datos de pago asociados al club.');
    if (confirmLeave) {
      await leaveTeamAsync(user.email);
      loadData();
    }
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !receiptFile) {
      setUploadError('Selecciona un archivo de comprobante.');
      return;
    }
    setUploadingReceipt(true);
    setUploadError('');
    try {
      const supabase = createClient();
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.email.replace(/[@.]/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);
      
      if (uploadError) throw uploadError;
      
      await updateAthleteProfileAsync(user.email, {
        payment_status: 'Pendiente_Verificacion',
        payment_receipt_url: fileName,
        payment_motivo_rechazo: undefined,
      });
      
      setReceiptFile(null);
      loadData();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      setUploadError('Error al subir el comprobante. Intenta nuevamente.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleUploadCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !certFile) {
      setCertError('Selecciona un archivo de apto medico.');
      return;
    }
    setUploadingCert(true);
    setCertError('');
    try {
      const supabase = createClient();
      const fileExt = certFile.name.split('.').pop();
      const fileName = `${user.email.replace(/[@.]/g, '_')}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('medical-certs')
        .upload(fileName, certFile);
      
      if (uploadError) throw uploadError;
      
      await updateAthleteProfileAsync(user.email, {
        apto_medico_status: 'pendiente_verificacion',
        apto_medico_url: fileName,
        apto_medico_motivo_rechazo: undefined,
      });
      
      setCertFile(null);
      loadData();
    } catch (error) {
      console.error('Error uploading certificate:', error);
      setCertError('Error al subir el certificado. Intenta nuevamente.');
    } finally {
      setUploadingCert(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {!user.team_id ? (
          /* SIN EQUIPO */
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">No perteneces a ningun equipo</h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                Para empezar a entrenar, explora los equipos de montana disponibles en la plataforma y solicita tu admision.
              </p>
            </div>
            <button
              onClick={() => router.push('/equipos')}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm rounded-full shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
            >
              Explorar Equipos de Montana
            </button>
          </div>
        ) : user.team_status === 'pendiente' && team ? (
          /* SOLICITUD PENDIENTE */
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto my-12 shadow-sm space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Solicitud en revision</h1>
                <p className="text-sm text-slate-500">Equipo: {team.name}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
              <strong>Postulacion enviada:</strong> Tu solicitud de ingreso para el equipo <strong>&quot;{team.name}&quot;</strong> esta siendo evaluada por el administrador. Una vez aprobado, figuraras como miembro activo para registrar pagos y acceder a las planificaciones.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleLeaveTeam}
                className="w-full py-3 text-slate-700 border border-slate-200 hover:bg-slate-50 font-semibold text-sm rounded-full transition-all duration-150 cursor-pointer"
              >
                Cancelar solicitud
              </button>
              <button
                onClick={() => router.push('/equipos')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-full transition-all duration-150 cursor-pointer"
              >
                Ver Info del Equipo
              </button>
            </div>
          </div>
        ) : (
          /* MIEMBRO ACTIVO */
          team && (
            <div className="space-y-8">
              {/* HEADER DE BIENVENIDA AL EQUIPO */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {team.logo_url && (
                      <div className="w-20 h-20 rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center p-1 border border-slate-200 shadow-sm flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          Miembro Activo
                        </span>
                        {team.location && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                            <MapPin className="w-3 h-3" />
                            {team.location}
                          </span>
                        )}
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                        {team.name}
                      </h1>
                      <p className="text-sm text-slate-600">
                        Entrenador: <strong className="text-slate-900">{team.coach}</strong> • Dias: {team.training_days}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={team.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-full shadow-lg shadow-blue-600/20 transition-all duration-150 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 fill-current" />
                      Grupo de WhatsApp
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={handleLeaveTeam}
                      className="px-5 py-3 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full font-semibold text-sm transition-all duration-150 cursor-pointer"
                    >
                      Darse de baja
                    </button>
                  </div>
                </div>
              </div>

              {/* GRID DE ESTADOS: PAGOS, APTO Y PLANIFICACIONES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ESTADO DE CUOTA */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <DollarSign className="w-5 h-5 text-slate-600" />
                        <h2 className="text-lg font-bold text-slate-900">Estado de Cuota</h2>
                      </div>
                      
                      {user.payment_status === 'Pagado' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Pagado
                        </span>
                      )}
                      {user.payment_status === 'Pendiente_Pago' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Pago Requerido
                        </span>
                      )}
                      {user.payment_status === 'Pendiente_Verificacion' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          En Revision
                        </span>
                      )}
                      {user.payment_status === 'Vencido' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                          Vencido
                        </span>
                      )}
                    </div>

                    {user.payment_status === 'Pagado' && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 leading-relaxed">
                        <span className="text-slate-900 font-semibold">¡Al dia!</span> Tu pago fue registrado mediante <span className="font-semibold text-slate-900">{user.payment_method}</span>. Habilitado para salidas.
                      </div>
                    )}

                    {user.payment_status === 'Pendiente_Verificacion' && (
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800 leading-relaxed">
                        Tu comprobante <strong>&quot;{user.payment_receipt_url}&quot;</strong> esta siendo verificado. Te informaremos una vez el coordinador lo apruebe.
                      </div>
                    )}

                    {user.payment_status === 'Vencido' && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 leading-relaxed">
                        <strong>Cuota Vencida:</strong> {user.payment_motivo_rechazo || 'Tu ultimo comprobante no fue aprobado. Carga el comprobante correcto.'}
                      </div>
                    )}

                    {user.payment_status === 'Pendiente_Pago' && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 leading-relaxed font-medium">
                        <strong>Pago requerido:</strong> Debes reportar el comprobante de transferencia del periodo actual para regularizar tu cuota mensual.
                      </div>
                    )}
                  </div>

                  {(user.payment_status === 'Pendiente_Pago' || user.payment_status === 'Vencido') && (
                    <form onSubmit={handleUploadReceipt} className="pt-4 border-t border-slate-100 space-y-3">
                      <label className="text-xs font-semibold text-slate-500 block">Cargar comprobante de pago</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            setReceiptFile(e.target.files?.[0] || null);
                            setUploadError('');
                          }}
                          className="flex-grow bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-4 py-2 text-sm text-slate-900 outline-none transition-all duration-200 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                        <button
                          type="submit"
                          disabled={!receiptFile || uploadingReceipt}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-full shadow transition-all duration-150 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingReceipt ? 'Subiendo...' : 'Enviar'}
                        </button>
                      </div>
                      {uploadError && <p className="text-xs text-red-600 font-medium">{uploadError}</p>}
                    </form>
                  )}
                </div>

                {/* APTO FÍSICO */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-bold text-slate-900">Apto Fisico</h2>
                      </div>

                      {user.apto_medico_status === 'vigente' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Vigente
                        </span>
                      )}
                      {user.apto_medico_status === 'pendiente_verificacion' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          En Revision
                        </span>
                      )}
                      {user.apto_medico_status === 'rechazado' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                          Rechazado
                        </span>
                      )}
                      {user.apto_medico_status === 'no_entregado' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Falta Entregar
                        </span>
                      )}
                    </div>

                    {user.apto_medico_status === 'vigente' && user.apto_medico_vencimiento && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 leading-relaxed">
                        Tu certificado es valido. Vence el <strong className="text-slate-900">{new Date(user.apto_medico_vencimiento).toLocaleDateString()}</strong>.
                      </div>
                    )}

                    {user.apto_medico_status === 'pendiente_verificacion' && (
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800 leading-relaxed">
                        El certificado medico <strong>&quot;{user.apto_medico_url}&quot;</strong> esta esperando validacion de la administracion.
                      </div>
                    )}

                    {user.apto_medico_status === 'rechazado' && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 leading-relaxed">
                        <strong>Apto medico rechazado:</strong> {user.apto_medico_motivo_rechazo || 'El documento no cumple con los requisitos legales o esta vencido.'}
                      </div>
                    )}

                    {user.apto_medico_status === 'no_entregado' && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 leading-relaxed flex items-start gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                        <span><strong>Atencion:</strong> No has subido tu apto fisico. Es obligatorio estar cargado para participar de las actividades presenciales.</span>
                      </div>
                    )}
                  </div>

                  {(user.apto_medico_status === 'no_entregado' || user.apto_medico_status === 'rechazado') && (
                    <form onSubmit={handleUploadCert} className="pt-4 border-t border-slate-100 space-y-3">
                      <label className="text-xs font-semibold text-slate-500 block">Cargar apto medico (PDF/Imagen)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            setCertFile(e.target.files?.[0] || null);
                            setCertError('');
                          }}
                          className="flex-grow bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-4 py-2 text-sm text-slate-900 outline-none transition-all duration-200 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                        <button
                          type="submit"
                          disabled={!certFile || uploadingCert}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-full shadow transition-all duration-150 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingCert ? 'Subiendo...' : 'Enviar'}
                        </button>
                      </div>
                      {certError && <p className="text-xs text-red-600 font-medium">{certError}</p>}
                    </form>
                  )}
                </div>

              </div>

              {/* PLANIFICACIONES */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-bold text-slate-900">Planificacion de Entrenamiento</h2>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  {team.instructions ? (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {team.instructions}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      El coordinador aun no ha publicado instrucciones especificas de entrenamiento.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )
        )}
      </main>
    </div>
  );
}
