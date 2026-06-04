'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserAsync, updateProfileAsync, Athlete } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { User, Phone, Ruler, Save, AlertCircle } from 'lucide-react';

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<Athlete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [shirtSize, setShirtSize] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
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
    setDni(currentUser.dni || '');
    setPhone(currentUser.phone || '');
    setEmergencyName(currentUser.contacto_emergencia_name || '');
    setEmergencyPhone(currentUser.contacto_emergencia_phone || '');
    setShirtSize(currentUser.talle_remera || '');
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!dni.trim() || !phone.trim() || !emergencyName.trim() || !emergencyPhone.trim() || !shirtSize) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos requeridos.' });
      return;
    }
    
    setIsSaving(true);
    try {
      await updateProfileAsync(user.email, {
        dni: dni.trim(),
        phone: phone.trim(),
        contacto_emergencia_name: emergencyName.trim(),
        contacto_emergencia_phone: emergencyPhone.trim(),
        talle_remera: shirtSize
      });
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
      loadUser();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el perfil.' });
    } finally {
      setIsSaving(false);
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

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mi Perfil</h1>
          <p className="text-slate-600">Actualiza tu informacion personal y de contacto.</p>
        </div>

        {/* USER INFO CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>

        {/* FORM CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* DNI */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                DNI
              </label>
              <input
                type="text"
                placeholder="Ej: 32456789"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                Telefono Personal
              </label>
              <input
                type="tel"
                placeholder="Ej: +54 9 11 2345-6789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>

            {/* Contacto de Emergencia */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                Contacto de Emergencia
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
                <input
                  type="tel"
                  placeholder="Telefono de emergencia"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Talle Remera */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-500" />
                Talle de Remera
              </label>
              <select
                value={shirtSize}
                onChange={(e) => setShirtSize(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
              >
                <option value="">Selecciona un talle</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-xl text-sm ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-full shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
