import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import imageCompression from 'browser-image-compression';
import { Camera, ChevronLeft, Save, X, Loader2 } from 'lucide-react';
import { getActivo, createActivo, updateActivo, uploadFoto, getFotos } from '../services/apiService';
import type { EstadoEquipo } from '../types';

const CENTROS_COSTO = ['EXTRUSION','INYECCION','MATRICERIA','MOLINO','MANTENIMIENTO','PMP','CALIDAD','INFORMATICA'];
const AREAS = ['EXTRUSION','INYECCION','MATRICERIA','MOLINOS','MEZCLA','MANTENCION','CALIDAD','LOGISTICA','COMERCIAL','FINANZAS','ADMINISTRACION','PRODUCCION','INFORMATICA'];
const LINEAS = ['PE1','PE2','PE3','PVC1','PVC2','PVC3','PVC4','PVC5','PVC6','PVC7','REVIFLEX','CANALETAS-REVI','ACTIVOS SIN USO','PLANTA GRAL'];
const PERIFERICOS = ['EXTRUSORA','CO EXTRUSORA','CABEZAL','TINA DE VACIO','TINA DE ENFRIAMIENTO','JALON','ACAMPANADORA','ENROLLADORA','SIERRA','OTROS'];
const ESTADOS: EstadoEquipo[] = ['NUEVO','USADO','MAL ESTADO','FUERA DE USO','CHATARRA (DESCARTE)'];
const CATEGORIAS = ['EDIFICIOS','MOBILIARIOS','HERRAMIENTAS','MAQUINARIAS','COMPUTADORES','INSTALACIONES Y MEJORAS','OBRAS EN CURSO'];

const schema = z.object({
  centro_costo:     z.string().min(1, 'Requerido'),
  fecha_inventario: z.string().min(1, 'Requerido'),
  nombre_equipo:    z.string().min(1, 'Requerido'),
  area:             z.string().min(1, 'Requerido'),
  estado_equipo:    z.enum(['NUEVO','USADO','MAL ESTADO','FUERA DE USO','CHATARRA (DESCARTE)']),
  usuario_registro: z.string().min(1, 'Requerido'),
  linea_productiva: z.string().optional(),
  periferico:       z.string().optional(),
  layout_ubicacion: z.string().optional(),
  marca:            z.string().optional(),
  modelo:           z.string().optional(),
  anio:             z.number().nullable().optional(),
  codigo_antiguo:   z.string().optional(),
  raf:              z.string().optional(),
  codigo_nuevo:     z.string().optional(),
  categoria:        z.string().optional(),
  observaciones:    z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEP1 = ['centro_costo','fecha_inventario','nombre_equipo','area','estado_equipo','usuario_registro'] as const;

export default function AssetForm() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const isEdit     = !!id;
  const [step, setStep]     = useState(1);
  const [foto, setFoto]     = useState<string | null>(null);
  const [, setFotoId] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');
  const [queued, setQueued]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, reset, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      estado_equipo:    'USADO',
      fecha_inventario: new Date().toISOString().slice(0, 10),
      usuario_registro: localStorage.getItem('revi_usuario') ?? '',
    },
  });

  useEffect(() => {
    if (isEdit && id) loadActivo(id);
  }, [id, isEdit]);

  const loadActivo = async (activoId: string) => {
    try {
      const activo = await getActivo(activoId);
      reset({ ...activo, anio: activo.anio ?? null });
      if (activo.fotos?.length) {
        setFotoId(activo.fotos[0].id);
        const fotosRes = await getFotos(activoId);
        if (fotosRes.data.length) setFoto(fotosRes.data[0].imagen_data);
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error cargando activo');
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.08, maxWidthOrHeight: 800, useWebWorker: true });
      const reader = new FileReader();
      reader.onloadend = () => setFoto(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setFoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    if (await trigger(STEP1)) setStep(2);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setApiError('');
    try {
      const now = new Date().toISOString();
      const payload = {
        ...data,
        anio:             data.anio ?? undefined,
        fecha_registro:   now,
        fecha_ultima_mod: now,
        validado:         false,
        sync_pendiente:   false,
      };

      let activoId = id;

      if (isEdit && id) {
        await updateActivo(id, { ...payload, usuario_registro: data.usuario_registro });
        if (foto) await uploadFoto(id, foto, 'principal');
        navigate(`/activos/${id}`, { replace: true });
        return;
      }

      const res = await createActivo(payload);
      activoId = res.id;

      if (foto && activoId) {
        await uploadFoto(activoId, foto, 'principal');
      }

      if (res.queued) {
        // Sin conexión → guardado localmente
        setQueued(true);
        setTimeout(() => navigate('/', { replace: true }), 2500);
      } else {
        navigate(`/activos/${activoId}`, { replace: true });
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error guardando activo');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 bg-white';

  const Field = ({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );

  const SelectField = ({ label, name, options, required, error }: { label: string; name: keyof FormData; options: string[]; required?: boolean; error?: string }) => (
    <Field label={label} error={error} required={required}>
      <select {...register(name)} className={inputClass}>
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1"><ChevronLeft size={24} /></button>
        <h1 className="font-semibold text-lg flex-1">{isEdit ? 'Editar Activo' : 'Nuevo Activo'}</h1>
        <span className="text-sm text-gray-400">Paso {step}/2</span>
      </div>

      <div className="flex bg-white border-b border-gray-100">
        {[1, 2].map(s => (
          <div key={s} className={`flex-1 py-2.5 text-center text-sm font-medium border-b-2 ${step === s ? 'border-red-700 text-red-700' : 'border-transparent text-gray-400'}`}>
            {s === 1 ? '1. Datos Esenciales' : '2. Datos Completos'}
          </div>
        ))}
      </div>

      {queued && (
        <div className="mx-4 mt-3 bg-yellow-50 border border-yellow-300 rounded-xl p-3 flex items-start gap-2">
          <span className="text-lg">💾</span>
          <p className="text-yellow-800 text-sm font-medium">
            Guardado localmente. Se sincronizará automáticamente cuando vuelva la conexión.
          </p>
        </div>
      )}
      {apiError && !queued && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-700 text-sm">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 space-y-4">
          {step === 1 && (<>
            <SelectField label="Centro de Costo" name="centro_costo" options={CENTROS_COSTO} required error={errors.centro_costo?.message} />
            <Field label="Fecha Inventario" error={errors.fecha_inventario?.message} required>
              <input type="date" {...register('fecha_inventario')} className={inputClass} />
            </Field>
            <Field label="Nombre Equipo" error={errors.nombre_equipo?.message} required>
              <input {...register('nombre_equipo')} className={inputClass} placeholder="Ej: Extrusora Principal #1" />
            </Field>
            <SelectField label="Área" name="area" options={AREAS} required error={errors.area?.message} />
            <SelectField label="Estado del Equipo" name="estado_equipo" options={ESTADOS} required error={errors.estado_equipo?.message} />
            <Field label="Usuario Registro" error={errors.usuario_registro?.message} required>
              <input {...register('usuario_registro')} className={inputClass} placeholder="Tu nombre completo" />
            </Field>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fotografía</label>
              {foto ? (
                <div className="relative">
                  <img src={foto} alt="Activo" className="w-full h-52 object-cover rounded-xl" />
                  <button type="button" onClick={() => setFoto(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-50">
                  <Camera size={36} />
                  <span className="text-sm">Tomar foto o elegir imagen</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
            </div>

            <button type="button" onClick={handleNext}
              className="w-full bg-red-700 text-white rounded-xl py-3.5 font-semibold active:bg-red-800">
              Continuar a datos completos →
            </button>
            <button type="submit" disabled={saving}
              className="w-full bg-white border border-gray-300 text-gray-600 rounded-xl py-3 font-medium text-sm disabled:opacity-50">
              {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Guardando...</span> : 'Guardar solo datos esenciales'}
            </button>
          </>)}

          {step === 2 && (<>
            <SelectField label="Línea Productiva" name="linea_productiva" options={LINEAS} />
            <SelectField label="Periféricos" name="periferico" options={PERIFERICOS} />
            <Field label="Layout / Ubicación">
              <input {...register('layout_ubicacion')} className={inputClass} placeholder="Ej: Sector B, Nivel 2" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca"><input {...register('marca')} className={inputClass} placeholder="Ej: ABB" /></Field>
              <Field label="Modelo"><input {...register('modelo')} className={inputClass} placeholder="Ej: M2AA" /></Field>
            </div>
            <Field label="Año Fabricación">
              <input type="number" {...register('anio', { valueAsNumber: true })} className={inputClass} placeholder="2020" min="1950" max="2030" />
            </Field>
            <Field label="N° Placa Antiguo (AF)">
              <input {...register('codigo_antiguo')} className={inputClass} placeholder="Código anterior o N/A" />
            </Field>
            <Field label="RAF"><input {...register('raf')} className={inputClass} placeholder="Número RAF" /></Field>
            <Field label="Código AF Nuevo"><input {...register('codigo_nuevo')} className={inputClass} placeholder="Código asignado" /></Field>
            <SelectField label="Categoría" name="categoria" options={CATEGORIAS} />
            <Field label="Observaciones">
              <textarea {...register('observaciones')} className={inputClass} rows={3} placeholder="Observaciones del levantamiento" />
            </Field>

            <button type="submit" disabled={saving}
              className="w-full bg-red-700 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 active:bg-red-800 disabled:opacity-50">
              {saving
                ? <><Loader2 size={20} className="animate-spin" /> Guardando...</>
                : <><Save size={20} /> Guardar Activo</>}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-gray-400 py-2 text-sm">← Volver al paso 1</button>
          </>)}
        </div>
      </form>
    </div>
  );
}
