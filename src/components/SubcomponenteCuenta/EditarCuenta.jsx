// src/components/Cuenta/EditarCuentas.jsx
import React, { useState, useEffect } from "react";
import { obtenerPerfil, actualizarPerfil } from "../../services/userService";
import { useTheme } from '../../context/ThemeContext';

export default function EditarCuentas() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    cedula: "",
    celular: "",
    correo: "",
    empresa: "",
    tipoSangre: "",
    direccion: "",
    telefonoFijo: "",
    celulares: "",
    fechaIngreso: "",
    cargos: "",
    salario: "",
    fechaModificacionSueldo: "",
    tipoContrato: "",
    fechaModificacionContrato: "",
    vencimiento: "",
    correosElectronicos: "",
    aportesSalud: "",
    aportesPension: "",
    aportesCesantias: "",
    aportesARL: "",
    aportesCCF: "",
    evaluacionPeriodoPrueba: "",
    sucursal: "",
    passwordConfirm: "",
  });
  const [tipoUsuario, setTipoUsuario] = useState("normal");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Función helper para formatear fechas - debe estar fuera del useEffect para poder usarla en múltiples lugares
  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    try {
      // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
      }
      
      // Si es una fecha ISO (formato con T y Z), extraer solo la parte de la fecha ANTES de crear Date
      // Esto evita problemas de zona horaria - es la forma más segura
      if (typeof fecha === 'string') {
        // Buscar patrón YYYY-MM-DD en cualquier parte del string
        const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          // Validar que sea una fecha válida
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          const day = parseInt(match[3]);
          if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${match[1]}-${match[2]}-${match[3]}`;
          }
        }
      }
      
      // Si es un objeto Date, usar métodos UTC para preservar el día original
      if (fecha instanceof Date) {
        const year = fecha.getUTCFullYear();
        const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const day = String(fecha.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Como último recurso, intentar crear Date y usar UTC
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return "";
      
      // Usar métodos UTC para preservar el día sin cambios de zona horaria
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error formateando fecha:', fecha, e);
      return "";
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipoUsuario") || "normal";
    setTipoUsuario(tipo);
    obtenerPerfil(token, tipo).then(({ data }) => {
      console.log('📥 Datos recibidos del backend en EditarCuenta:', data);
      console.log('📋 Campos específicos:', {
        empresa: data.empresa,
        cedula: data.cedula,
        tipoSangre: data.tipoSangre,
        direccion: data.direccion,
        telefonoFijo: data.telefonoFijo,
        celulares: data.celulares,
        correosElectronicos: data.correosElectronicos,
        fechaIngreso: data.fechaIngreso,
        cargos: data.cargos,
        salario: data.salario,
        tipoContrato: data.tipoContrato,
        aportesSalud: data.aportesSalud,
        aportesPension: data.aportesPension
      });
      
      setForm(f => ({
        ...f,
        // Para usuarios secundarios (secur)
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        role: data.role || "",
        // Campos comunes para ambos tipos
        cedula: data.cedula || "",
        fechaNacimiento: formatearFecha(data.fechaNacimiento),
        tipoSangre: data.tipoSangre || "",
        direccion: data.direccion || "",
        telefonoFijo: data.telefonoFijo || "",
        celulares: data.celulares || "",
        correosElectronicos: data.correosElectronicos || "",
        empresa: data.empresa || "",
        fechaIngreso: formatearFecha(data.fechaIngreso),
        cargos: data.cargos || "",
        salario: data.salario || "",
        fechaModificacionSueldo: formatearFecha(data.fechaModificacionSueldo),
        tipoContrato: data.tipoContrato || "",
        fechaModificacionContrato: formatearFecha(data.fechaModificacionContrato),
        vencimiento: formatearFecha(data.vencimiento),
        aportesSalud: data.aportesSalud || data.aportes?.salud || "",
        aportesPension: data.aportesPension || data.aportes?.pension || "",
        aportesCesantias: data.aportesCesantias || data.aportes?.cesantias || "",
        aportesARL: data.aportesARL || data.aportes?.arl || "",
        aportesCCF: data.aportesCCF || data.aportes?.ccf || "",
        evaluacionPeriodoPrueba: data.evaluacionPeriodoPrueba || "",
        sucursal: data.sucursal || "",
        // Para usuarios normales
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        celular: data.celular || "",
        correo: data.correo || "",
      }));
      
      console.log('✅ Formulario actualizado con datos del backend');
    }).catch((err) => {
      console.error('❌ Error cargando perfil en EditarCuenta:', err);
    });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");
    const token = localStorage.getItem("token");
    try {
      // Solo envía los campos relevantes según el tipo de usuario
      let dataToSend = {};
      if (tipoUsuario === "secur") {
        dataToSend = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          cedula: form.cedula,
          fechaNacimiento: form.fechaNacimiento,
          tipoSangre: form.tipoSangre,
          direccion: form.direccion,
          telefonoFijo: form.telefonoFijo,
          celulares: form.celulares,
          correosElectronicos: form.correosElectronicos,
          empresa: form.empresa,
          fechaIngreso: form.fechaIngreso,
          cargos: form.cargos,
          salario: form.salario,
          fechaModificacionSueldo: form.fechaModificacionSueldo,
          tipoContrato: form.tipoContrato,
          fechaModificacionContrato: form.fechaModificacionContrato,
          vencimiento: form.vencimiento,
          aportesSalud: form.aportesSalud,
          aportesPension: form.aportesPension,
          aportesCesantias: form.aportesCesantias,
          aportesARL: form.aportesARL,
          aportesCCF: form.aportesCCF,
          evaluacionPeriodoPrueba: form.evaluacionPeriodoPrueba,
          sucursal: form.sucursal,
          passwordConfirm: form.passwordConfirm,
        };
      } else {
        dataToSend = {
          nombre: form.nombre,
          apellido: form.apellido,
          fechaNacimiento: form.fechaNacimiento,
          cedula: form.cedula,
          celular: form.celular,
          correo: form.correo,
          empresa: form.empresa,
          tipoSangre: form.tipoSangre,
          direccion: form.direccion,
          telefonoFijo: form.telefonoFijo,
          celulares: form.celulares,
          fechaIngreso: form.fechaIngreso,
          cargos: form.cargos,
          salario: form.salario,
          fechaModificacionSueldo: form.fechaModificacionSueldo,
          tipoContrato: form.tipoContrato,
          fechaModificacionContrato: form.fechaModificacionContrato,
          vencimiento: form.vencimiento,
          correosElectronicos: form.correosElectronicos,
          aportesSalud: form.aportesSalud,
          aportesPension: form.aportesPension,
          aportesCesantias: form.aportesCesantias,
          aportesARL: form.aportesARL,
          aportesCCF: form.aportesCCF,
          evaluacionPeriodoPrueba: form.evaluacionPeriodoPrueba,
          sucursal: form.sucursal,
          passwordConfirm: form.passwordConfirm,
        };
      }
      console.log('📤 Enviando datos al backend:', dataToSend);
      const response = await actualizarPerfil(dataToSend, token, tipoUsuario);
      console.log('✅ Respuesta del backend:', response.data);
      setMensaje("¡Perfil actualizado!");
      
      // Recargar los datos del perfil después de actualizar
      setTimeout(() => {
        obtenerPerfil(token, tipoUsuario).then(({ data }) => {
          console.log('🔄 Perfil recargado después de actualizar:', data);
          setForm(f => ({
            ...f,
            // Para usuarios secundarios (secur)
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "",
            // Campos comunes para ambos tipos
            cedula: data.cedula || "",
            fechaNacimiento: formatearFecha(data.fechaNacimiento),
            tipoSangre: data.tipoSangre || "",
            direccion: data.direccion || "",
            telefonoFijo: data.telefonoFijo || "",
            celulares: data.celulares || "",
            correosElectronicos: data.correosElectronicos || "",
            empresa: data.empresa || "",
            fechaIngreso: formatearFecha(data.fechaIngreso),
            cargos: data.cargos || "",
            salario: data.salario || "",
            fechaModificacionSueldo: formatearFecha(data.fechaModificacionSueldo),
            tipoContrato: data.tipoContrato || "",
            fechaModificacionContrato: formatearFecha(data.fechaModificacionContrato),
            vencimiento: formatearFecha(data.vencimiento),
            aportesSalud: data.aportesSalud || data.aportes?.salud || "",
            aportesPension: data.aportesPension || data.aportes?.pension || "",
            aportesCesantias: data.aportesCesantias || data.aportes?.cesantias || "",
            aportesARL: data.aportesARL || data.aportes?.arl || "",
            aportesCCF: data.aportesCCF || data.aportes?.ccf || "",
            evaluacionPeriodoPrueba: data.evaluacionPeriodoPrueba || "",
            sucursal: data.sucursal || "",
            // Para usuarios normales
            nombre: data.nombre || "",
            apellido: data.apellido || "",
            celular: data.celular || "",
            correo: data.correo || "",
          }));
        });
      }, 500);
    } catch (err) {
      console.error('❌ Error al actualizar perfil:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(err.response?.data?.mensaje || err.response?.data?.message || err.message || "Error al actualizar la cuenta");
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">Editar Cuenta</h3>
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {tipoUsuario === "secur" ? (
          <>
            {/* SECCIÓN: INFORMACIÓN PERSONAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-blue-300 border-blue-600' : 'text-blue-700 border-blue-300'}`}>
                📋 Información Personal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 1. EMPRESA */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Empresa</label>
                  <select
                    name="empresa"
                    value={form.empresa}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Seleccione Empresa</option>
                    <option value="Proser Riesgos">Proser Riesgos</option>
                    <option value="Proser Ajustes">Proser Ajustes</option>
                    <option value="Proser Puertos">Proser Puertos</option>
                  </select>
                </div>
                {/* 1.1. SUCURSAL */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Sucursal</label>
                  <select
                    name="sucursal"
                    value={form.sucursal}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Seleccione Sucursal</option>
                    <option value="Bogotá">Bogotá</option>
                    <option value="Medellín">Medellín</option>
                    <option value="Cali">Cali</option>
                    <option value="Barranquilla">Barranquilla</option>
                    <option value="Cartagena">Cartagena</option>
                    <option value="Bucaramanga">Bucaramanga</option>
                    <option value="Pereira">Pereira</option>
                    <option value="Santa Marta">Santa Marta</option>
                    <option value="Manizales">Manizales</option>
                    <option value="Armenia">Armenia</option>
                    <option value="Villavicencio">Villavicencio</option>
                    <option value="Pasto">Pasto</option>
                    <option value="Valledupar">Valledupar</option>
                    <option value="Montería">Montería</option>
                    <option value="Sincelejo">Sincelejo</option>
                    <option value="Ibagué">Ibagué</option>
                    <option value="Neiva">Neiva</option>
                    <option value="Tunja">Tunja</option>
                    <option value="Popayán">Popayán</option>
                    <option value="Riohacha">Riohacha</option>
                    <option value="Quibdó">Quibdó</option>
                    <option value="Florencia">Florencia</option>
                    <option value="Yopal">Yopal</option>
                    <option value="Mocoa">Mocoa</option>
                    <option value="Leticia">Leticia</option>
                    <option value="Inírida">Inírida</option>
                    <option value="San José del Guaviare">San José del Guaviare</option>
                    <option value="Mitú">Mitú</option>
                    <option value="Puerto Carreño">Puerto Carreño</option>
                  </select>
                </div>
                {/* 2. NOMBRE */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Nombre</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nombre"
              className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
              required
            />
                </div>
                {/* 3. CEDULA */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Cédula</label>
                  <input
                    type="text"
                    name="cedula"
                    value={form.cedula}
                    onChange={handleChange}
                    placeholder="Cédula"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 4. FECHA NACIMIENTO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={formatearFecha(form.fechaNacimiento)}
                    onChange={handleChange}
                    placeholder="Fecha de Nacimiento"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 5. TIPO DE SANGRE */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Tipo de Sangre</label>
                  <select
                    name="tipoSangre"
                    value={form.tipoSangre}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Seleccione Tipo de Sangre</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                {/* 6. DIRECCION */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder="Dirección"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN DE CONTACTO */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-yellow-300 border-yellow-600' : 'text-yellow-700 border-yellow-300'}`}>
                📞 Información de Contacto
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 7. TELEFONO FIJOS */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Teléfono Fijo</label>
                  <input
                    type="text"
                    name="telefonoFijo"
                    value={form.telefonoFijo}
                    onChange={handleChange}
                    placeholder="Teléfono Fijo"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 8. No. CELULARES */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">No. Celular(es)</label>
                  <input
                    type="text"
                    name="celulares"
                    value={form.celulares}
                    onChange={handleChange}
                    placeholder="No. Celular(es)"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 16. CORREOS ELECTRONICOS */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Correo(s) Electrónico(s)</label>
                  <input
                    type="text"
                    name="correosElectronicos"
                    value={form.correosElectronicos}
                    onChange={handleChange}
                    placeholder="Correo(s) Electrónico(s)"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN LABORAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-green-300 border-green-600' : 'text-green-700 border-green-300'}`}>
                💼 Información Laboral
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 9. FECHA DE INGRESO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Fecha de Ingreso</label>
                  <input
                    type="date"
                    name="fechaIngreso"
                    value={formatearFecha(form.fechaIngreso)}
                    onChange={handleChange}
                    placeholder="Fecha de Ingreso"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 10. CARGOS */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Cargo(s)</label>
                  <input
                    type="text"
                    name="cargos"
                    value={form.cargos}
                    onChange={handleChange}
                    placeholder="Cargo(s)"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 11. SALARIO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Salario</label>
                  <input
                    type="number"
                    name="salario"
                    value={form.salario}
                    onChange={handleChange}
                    placeholder="Salario"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 12. FECHA MODIFICACION SUELDO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Fecha Modificación Sueldo</label>
                  <input
                    type="date"
                    name="fechaModificacionSueldo"
                    value={formatearFecha(form.fechaModificacionSueldo)}
                    onChange={handleChange}
                    placeholder="Fecha Modificación Sueldo"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN CONTRACTUAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-purple-300 border-purple-600' : 'text-purple-700 border-purple-300'}`}>
                📄 Información Contractual
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 13. TIPO DE CONTRATO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Tipo de Contrato</label>
                  <select
                    name="tipoContrato"
                    value={form.tipoContrato}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Seleccione Tipo de Contrato</option>
                    <option value="Término Indefinido">Término Indefinido</option>
                    <option value="Término Fijo">Término Fijo</option>
                    <option value="Término Fijo a Prueba">Término Fijo a Prueba</option>
                    <option value="Obra o Labor">Obra o Labor</option>
                    <option value="Contrato de Aprendizaje">Contrato de Aprendizaje</option>
                    <option value="Contrato Temporal, Ocasional o Accidental">Contrato Temporal, Ocasional o Accidental</option>
                    <option value="Contrato por Prestación de Servicios">Contrato por Prestación de Servicios</option>
                    <option value="Contrato de Trabajo a Domicilio">Contrato de Trabajo a Domicilio</option>
                    <option value="Contrato Intermitente">Contrato Intermitente</option>
                    <option value="Contrato de Duración Inferior a un Mes">Contrato de Duración Inferior a un Mes</option>
                  </select>
                </div>
                {/* 14. FECHA MODIFICACION CONTRATO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Fecha Modificación Contrato</label>
                  <input
                    type="date"
                    name="fechaModificacionContrato"
                    value={formatearFecha(form.fechaModificacionContrato)}
                    onChange={handleChange}
                    placeholder="Fecha Modificación Contrato"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 15. VENCIMIENTO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Vencimiento</label>
                  <input
                    type="date"
                    name="vencimiento"
                    value={formatearFecha(form.vencimiento)}
                    onChange={handleChange}
                    placeholder="Vencimiento"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: APORTES */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-orange-300 border-orange-600' : 'text-orange-700 border-orange-300'}`}>
                💳 APORTES
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">SALUD</label>
                  <input
                    type="text"
                    name="aportesSalud"
                    value={form.aportesSalud}
                    onChange={handleChange}
                    placeholder="Salud"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">PENSION</label>
                  <input
                    type="text"
                    name="aportesPension"
                    value={form.aportesPension}
                    onChange={handleChange}
                    placeholder="Pensión"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">CESANTIAS</label>
                  <input
                    type="text"
                    name="aportesCesantias"
                    value={form.aportesCesantias}
                    onChange={handleChange}
                    placeholder="Cesantías"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">ARL</label>
            <input
                    type="text"
                    name="aportesARL"
                    value={form.aportesARL}
              onChange={handleChange}
                    placeholder="ARL"
              className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">C.C.F.</label>
            <input
              type="text"
                    name="aportesCCF"
                    value={form.aportesCCF}
              onChange={handleChange}
                    placeholder="C.C.F."
              className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            />
                </div>
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN ADICIONAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-red-300 border-red-600' : 'text-red-700 border-red-300'}`}>
                ➕ Información Adicional
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 18. EVALUACION PERIODO DE PRUEBA */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Evaluación</label>
                  <select
                    name="evaluacionPeriodoPrueba"
                    value={form.evaluacionPeriodoPrueba}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Evaluación</option>
                    <option value="Período de Prueba">Período de Prueba</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="No Aprobado">No Aprobado</option>
                  </select>
                </div>
                {/* Campo de rol solo visible para admin/soporte */}
                {(localStorage.getItem('rol') === 'admin' || localStorage.getItem('rol') === 'soporte') && (
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Rol</label>
                    <input
                      type="text"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      placeholder="Rol"
                      className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Confirma tu contraseña para guardar cambios</label>
              <input
                type="password"
                name="passwordConfirm"
                value={form.passwordConfirm || ""}
                onChange={handleChange}
                placeholder="Confirma tu contraseña para guardar cambios"
                className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                required
              />
            </div>
          </>
        ) : (
          <>
            {/* SECCIÓN: INFORMACIÓN PERSONAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-blue-300 border-blue-600' : 'text-blue-700 border-blue-300'}`}>
                📋 Información Personal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 1. EMPRESA */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Empresa</label>
                  <select
                    name="empresa"
                    value={form.empresa}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Seleccione Empresa</option>
                    <option value="Proser Riesgos">Proser Riesgos</option>
                    <option value="Proser Ajustes">Proser Ajustes</option>
                    <option value="Proser Puertos">Proser Puertos</option>
                  </select>
                </div>
                {/* 1.1. SUCURSAL */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Sucursal</label>
                  <select
                    name="sucursal"
                    value={form.sucursal}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Seleccione Sucursal</option>
                    <option value="Bogotá">Bogotá</option>
                    <option value="Medellín">Medellín</option>
                    <option value="Cali">Cali</option>
                    <option value="Barranquilla">Barranquilla</option>
                    <option value="Cartagena">Cartagena</option>
                    <option value="Bucaramanga">Bucaramanga</option>
                    <option value="Pereira">Pereira</option>
                    <option value="Santa Marta">Santa Marta</option>
                    <option value="Manizales">Manizales</option>
                    <option value="Armenia">Armenia</option>
                    <option value="Villavicencio">Villavicencio</option>
                    <option value="Pasto">Pasto</option>
                    <option value="Valledupar">Valledupar</option>
                    <option value="Montería">Montería</option>
                    <option value="Sincelejo">Sincelejo</option>
                    <option value="Ibagué">Ibagué</option>
                    <option value="Neiva">Neiva</option>
                    <option value="Tunja">Tunja</option>
                    <option value="Popayán">Popayán</option>
                    <option value="Riohacha">Riohacha</option>
                    <option value="Quibdó">Quibdó</option>
                    <option value="Florencia">Florencia</option>
                    <option value="Yopal">Yopal</option>
                    <option value="Mocoa">Mocoa</option>
                    <option value="Leticia">Leticia</option>
                    <option value="Inírida">Inírida</option>
                    <option value="San José del Guaviare">San José del Guaviare</option>
                    <option value="Mitú">Mitú</option>
                    <option value="Puerto Carreño">Puerto Carreño</option>
                  </select>
                </div>
                {/* 2. NOMBRE */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Nombre"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                    required
                  />
                </div>
                {/* 3. CEDULA */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Cédula</label>
                  <input
                    type="text"
                    name="cedula"
                    value={form.cedula}
                    onChange={handleChange}
                    placeholder="Cédula"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 4. FECHA NACIMIENTO */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={formatearFecha(form.fechaNacimiento)}
                    onChange={handleChange}
                    placeholder="Fecha de Nacimiento"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                {/* 5. TIPO DE SANGRE */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Tipo de Sangre</label>
                  <select
                    name="tipoSangre"
                    value={form.tipoSangre}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Seleccione Tipo de Sangre</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                {/* 6. DIRECCION */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder="Dirección"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN DE CONTACTO */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-yellow-300 border-yellow-600' : 'text-yellow-700 border-yellow-300'}`}>
                📞 Información de Contacto
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 7. TELEFONO FIJOS */}
                <input
                  type="text"
                  name="telefonoFijo"
                  value={form.telefonoFijo}
                  onChange={handleChange}
                  placeholder="Teléfono Fijo"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
                {/* 8. No. CELULARES */}
                <input
                  type="text"
                  name="celulares"
                  value={form.celulares}
                  onChange={handleChange}
                  placeholder="No. Celular(es)"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
                {/* 16. CORREOS ELECTRONICOS */}
                <input
                  type="text"
                  name="correosElectronicos"
                  value={form.correosElectronicos}
                  onChange={handleChange}
                  placeholder="Correo(s) Electrónico(s)"
                  className="w-full col-span-1 sm:col-span-2 px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN LABORAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-green-300 border-green-600' : 'text-green-700 border-green-300'}`}>
                💼 Información Laboral
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 9. FECHA DE INGRESO */}
                <input
                  type="date"
                  name="fechaIngreso"
                  value={formatearFecha(form.fechaIngreso)}
                  onChange={handleChange}
                  placeholder="Fecha de Ingreso"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
                {/* 10. CARGOS */}
                <input
                  type="text"
                  name="cargos"
                  value={form.cargos}
                  onChange={handleChange}
                  placeholder="Cargo(s)"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
                {/* 11. SALARIO */}
                <input
                  type="number"
                  name="salario"
                  value={form.salario}
                  onChange={handleChange}
                  placeholder="Salario"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
                {/* 12. FECHA MODIFICACION SUELDO */}
                <input
                  type="date"
                  name="fechaModificacionSueldo"
                  value={formatearFecha(form.fechaModificacionSueldo)}
                  onChange={handleChange}
                  placeholder="Fecha Modificación Sueldo"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN CONTRACTUAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-purple-300 border-purple-600' : 'text-purple-700 border-purple-300'}`}>
                📄 Información Contractual
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 13. TIPO DE CONTRATO */}
                <select
                  name="tipoContrato"
                  value={form.tipoContrato}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                >
                  <option value="">Seleccione Tipo de Contrato</option>
                  <option value="Término Indefinido">Término Indefinido</option>
                  <option value="Término Fijo">Término Fijo</option>
                  <option value="Término Fijo a Prueba">Término Fijo a Prueba</option>
                  <option value="Obra o Labor">Obra o Labor</option>
                  <option value="Contrato de Aprendizaje">Contrato de Aprendizaje</option>
                  <option value="Contrato Temporal, Ocasional o Accidental">Contrato Temporal, Ocasional o Accidental</option>
                  <option value="Contrato por Prestación de Servicios">Contrato por Prestación de Servicios</option>
                  <option value="Contrato de Trabajo a Domicilio">Contrato de Trabajo a Domicilio</option>
                  <option value="Contrato Intermitente">Contrato Intermitente</option>
                  <option value="Contrato de Duración Inferior a un Mes">Contrato de Duración Inferior a un Mes</option>
                </select>
                {/* 14. FECHA MODIFICACION CONTRATO */}
                <input
                  type="date"
                  name="fechaModificacionContrato"
                  value={formatearFecha(form.fechaModificacionContrato)}
                  onChange={handleChange}
                  placeholder="Fecha Modificación Contrato"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
                {/* 15. VENCIMIENTO */}
                <input
                  type="date"
                  name="vencimiento"
                  value={formatearFecha(form.vencimiento)}
                  onChange={handleChange}
                  placeholder="Vencimiento"
                  className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* SECCIÓN: APORTES */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-orange-300 border-orange-600' : 'text-orange-700 border-orange-300'}`}>
                💳 APORTES
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">SALUD</label>
                  <input
                    type="text"
                    name="aportesSalud"
                    value={form.aportesSalud}
                    onChange={handleChange}
                    placeholder="Salud"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">PENSION</label>
                  <input
                    type="text"
                    name="aportesPension"
                    value={form.aportesPension}
                    onChange={handleChange}
                    placeholder="Pensión"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">CESANTIAS</label>
                  <input
                    type="text"
                    name="aportesCesantias"
                    value={form.aportesCesantias}
                    onChange={handleChange}
                    placeholder="Cesantías"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">ARL</label>
                  <input
                    type="text"
                    name="aportesARL"
                    value={form.aportesARL}
                    onChange={handleChange}
                    placeholder="ARL"
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">C.C.F.</label>
                  <input
                    type="text"
                    name="aportesCCF"
                    value={form.aportesCCF}
                    onChange={handleChange}
                    placeholder="C.C.F."
              className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            />
                </div>
              </div>
            </div>

            {/* SECCIÓN: INFORMACIÓN ADICIONAL */}
            <div className="space-y-4">
              <h4 className={`text-base sm:text-lg font-bold border-b-2 pb-2 ${isDark ? 'text-red-300 border-red-600' : 'text-red-700 border-red-300'}`}>
                ➕ Información Adicional
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* 18. EVALUACION PERIODO DE PRUEBA */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Evaluación</label>
                  <select
                    name="evaluacionPeriodoPrueba"
                    value={form.evaluacionPeriodoPrueba}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                  >
                    <option value="">Evaluación</option>
                    <option value="Período de Prueba">Período de Prueba</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="No Aprobado">No Aprobado</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Confirma tu contraseña para guardar cambios</label>
              <input
                type="password"
                name="passwordConfirm"
                value={form.passwordConfirm || ""}
                onChange={handleChange}
                placeholder="Confirma tu contraseña para guardar cambios"
                className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
                required
              />
            </div>
          </>
        )}
        <button
          type="submit"
          className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Guardar cambios
        </button>
      </form>
      {mensaje && <p className="text-green-600 mt-2 text-xs sm:text-sm">{mensaje}</p>}
      {error && <p className="text-red-600 mt-2 text-xs sm:text-sm">{error}</p>}
    </div>
  );
}
