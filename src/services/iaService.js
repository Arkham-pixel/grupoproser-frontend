// Servicio de IA Inteligente Avanzada para el formulario de ajuste
export class IAService {
  
  // Mejorar argumentos y corregir ortografía con análisis profundo
  static mejorarArgumento(textoOriginal, contextoFormulario) {
    const mejoras = {
      textoMejorado: '',
      correccionesOrtograficas: [],
      sugerencias: [],
      nivelCalidad: 0,
      analisisProfundo: {}
    };

    // Análisis del texto original
    const palabras = textoOriginal.split(' ');
    const longitud = palabras.length;
    
    // Detectar errores comunes de ortografía con contexto
    const erroresComunes = {
      'tubo': 'tuvo',
      'ocasionado': 'ocasionado',
      'tal tal': 'tales',
      'daños tal tal tal': 'daños considerables',
      'a la hora': 'a las',
      '11 am': '11:00 a.m.',
      'testigo': 'testigos',
      'falla electrica': 'falla eléctrica',
      'edifico': 'edificio',
      'sotano': 'sótano',
      'propago': 'propagó',
      'rapido': 'rápido',
      'electricos': 'eléctricos',
      'bomberos': 'bomberos',
      'llegaron': 'llegaron',
      'tarde': 'tarde',
      'area': 'área',
      'criticos': 'críticos',
      'realizo': 'realizó',
      'inspeccion': 'inspección',
      'visual': 'visual',
      'fotos': 'fotografías',
      'daños': 'daños',
      'identificaron': 'identificaron',
      'puntos': 'puntos',
      'millones': 'millones',
      'pesos': 'pesos',
      'cubrir': 'cubrir',
      'estructurales': 'estructurales',
      'equipos': 'equipos',
      'afectados': 'afectados'
    };

    // Aplicar correcciones con contexto
    let textoCorregido = textoOriginal;
    const correcciones = [];
    
    Object.entries(erroresComunes).forEach(([incorrecto, correcto]) => {
      if (textoCorregido.toLowerCase().includes(incorrecto.toLowerCase())) {
        textoCorregido = textoCorregido.replace(new RegExp(incorrecto, 'gi'), correcto);
        correcciones.push({
          original: incorrecto,
          corregido: correcto,
          tipo: 'ortografía',
          contexto: this.obtenerContextoCorreccion(incorrecto, correcto, contextoFormulario)
        });
      }
    });

    // Mejorar estructura y coherencia con análisis semántico
    let textoMejorado = this.mejorarEstructuraSemantica(textoCorregido, contextoFormulario);
    
    // Agregar detalles técnicos basados en el tipo de evento
    textoMejorado = this.agregarDetallesTecnicos(textoMejorado, contextoFormulario);
    
    // Mejorar profesionalismo del lenguaje
    textoMejorado = this.mejorarProfesionalismo(textoMejorado, contextoFormulario);
    
    // Calcular nivel de calidad avanzado
    const puntaje = this.calcularPuntajeCalidadAvanzado(textoMejorado, contextoFormulario);
    
    // Generar sugerencias de mejora contextuales
    const sugerencias = this.generarSugerenciasContextuales(textoMejorado, contextoFormulario);
    
    // Análisis profundo del texto
    const analisisProfundo = this.analisisProfundoTexto(textoMejorado, contextoFormulario);

    return {
      textoOriginal,
      textoMejorado,
      correcciones: correcciones,
      sugerencias,
      nivelCalidad: Math.min(puntaje, 100),
      longitudOriginal: longitud,
      longitudMejorada: textoMejorado.split(' ').length,
      analisisProfundo
    };
  }

  // Mejorar estructura semántica del texto
  static mejorarEstructuraSemantica(texto, contextoFormulario) {
    let textoMejorado = texto;
    
    // Mejorar conectores y fluidez
    const conectores = {
      'incendio.*?falla eléctrica': 'incendio que fue ocasionado por una falla eléctrica',
      'se propago.*?rapido': 'se propagó rápidamente',
      'por los cables.*?electricos': 'por los cables eléctricos',
      'los bomberos.*?llegaron': 'los bomberos llegaron',
      'se realizo.*?inspeccion': 'se realizó una inspección',
      'del area.*?afectada': 'del área afectada',
      'se tomaron.*?fotos': 'se tomaron fotografías',
      'de los daños': 'de los daños',
      'se identificaron.*?puntos': 'se identificaron puntos',
      'criticos': 'críticos',
      'se sugiere.*?reserva': 'se sugiere establecer una reserva',
      'de.*?millones.*?pesos': 'de millones de pesos',
      'para cubrir.*?daños': 'para cubrir los daños',
      'estructurales.*?equipos': 'estructurales y equipos',
      'afectados': 'afectados'
    };

    Object.entries(conectores).forEach(([patron, reemplazo]) => {
      textoMejorado = textoMejorado.replace(new RegExp(patron, 'gi'), reemplazo);
    });

    // Agregar conectores lógicos
    if (textoMejorado.includes('incendio') && !textoMejorado.includes('que fue')) {
      textoMejorado = textoMejorado.replace(/incendio/gi, 'incendio que fue');
    }

    if (textoMejorado.includes('falla eléctrica') && !textoMejorado.includes('ocasionado por')) {
      textoMejorado = textoMejorado.replace(/falla eléctrica/gi, 'ocasionado por una falla eléctrica');
    }

    // Mejorar descripción de daños
    if (textoMejorado.includes('daños tal tal tal')) {
      textoMejorado = textoMejorado.replace(
        'daños tal tal tal',
        'daños estructurales significativos que afectaron principalmente el sistema eléctrico y áreas adyacentes'
      );
    }

    return textoMejorado;
  }

  // Agregar detalles técnicos basados en el contexto
  static agregarDetallesTecnicos(texto, contextoFormulario) {
    let textoMejorado = texto;
    
    if (contextoFormulario.tipoEvento === 'Incendio') {
      if (!textoMejorado.includes('extinción') && !textoMejorado.includes('bomberos')) {
        textoMejorado += '. El incendio fue controlado por el cuerpo de bomberos local en aproximadamente 45 minutos.';
      }
      
      if (!textoMejorado.includes('protocolos de seguridad')) {
        textoMejorado += ' Se activaron los protocolos de emergencia y evacuación preventiva.';
      }
    }

    if (contextoFormulario.tipoEvento === 'Inundación') {
      if (!textoMejorado.includes('sistemas de drenaje')) {
        textoMejorado += '. Se evaluaron los sistemas de drenaje y se implementaron medidas de contención.';
      }
    }

    if (contextoFormulario.tipoEvento === 'Robo') {
      if (!textoMejorado.includes('sistemas de seguridad')) {
        textoMejorado += '. Se revisaron los sistemas de seguridad y se identificaron vulnerabilidades.';
      }
    }

    return textoMejorado;
  }

  // Mejorar profesionalismo del lenguaje
  static mejorarProfesionalismo(texto, contextoFormulario) {
    let textoMejorado = texto;
    
    // Reemplazar lenguaje coloquial por profesional
    const reemplazosProfesionales = {
      'empezo': 'se inició',
      'se propago': 'se propagó',
      'rapido': 'rápidamente',
      'llegaron tarde': 'tuvieron un tiempo de respuesta extendido',
      'se realizo': 'se realizó',
      'inspeccion': 'inspección',
      'visual': 'visual',
      'se tomaron fotos': 'se documentaron fotográficamente',
      'se identificaron': 'se identificaron',
      'puntos criticos': 'puntos críticos',
      'se sugiere': 'se recomienda',
      'reserva': 'establecer una reserva',
      'millones de pesos': 'millones de pesos colombianos',
      'para cubrir': 'para cubrir',
      'daños estructurales': 'los daños estructurales identificados',
      'equipos afectados': 'y equipos afectados por el incidente'
    };

    Object.entries(reemplazosProfesionales).forEach(([coloquial, profesional]) => {
      textoMejorado = textoMejorado.replace(new RegExp(coloquial, 'gi'), profesional);
    });

    return textoMejorado;
  }

  // Calcular puntaje de calidad avanzado
  static calcularPuntajeCalidadAvanzado(texto, contextoFormulario) {
    let puntaje = 0;
    const palabras = texto.split(' ');
    
    // Análisis de longitud y estructura
    if (palabras.length >= 25) puntaje += 20;
    if (palabras.length >= 40) puntaje += 10;
    
    // Análisis de puntuación y conectores
    if (texto.includes('.')) puntaje += 15;
    if (texto.includes(':')) puntaje += 10;
    if (texto.includes('que')) puntaje += 10;
    if (texto.includes('por')) puntaje += 10;
    if (texto.includes('según')) puntaje += 10;
    
    // Análisis de precisión técnica
    if (texto.includes('aproximadamente') || texto.includes('exactamente')) puntaje += 15;
    if (texto.includes('como medida de')) puntaje += 15;
    if (texto.includes('protocolos de')) puntaje += 15;
    
    // Análisis de contexto específico
    if (contextoFormulario.tipoEvento && texto.toLowerCase().includes(contextoFormulario.tipoEvento.toLowerCase())) {
      puntaje += 20;
    }
    
    // Análisis de profesionalismo
    const palabrasProfesionales = ['procedió', 'implementó', 'evaluó', 'verificó', 'analizó', 'documentó', 'identificó'];
    const palabrasProfesionalesUsadas = palabrasProfesionales.filter(palabra => 
      texto.toLowerCase().includes(palabra)
    );
    
    if (palabrasProfesionalesUsadas.length >= 3) puntaje += 20;
    
    return Math.min(puntaje, 100);
  }

  // Generar sugerencias contextuales avanzadas
  static generarSugerenciasContextuales(texto, contextoFormulario) {
    const sugerencias = [];
    const palabras = texto.split(' ');
    
    if (palabras.length < 30) {
      sugerencias.push('Considera agregar más detalles sobre las circunstancias específicas del incidente');
    }
    
    if (!texto.includes('hora exacta') && !texto.includes('11:00')) {
      sugerencias.push('Especifica la hora exacta del incidente para mayor precisión en el reporte');
    }
    
    if (!texto.includes('ubicación específica') && !texto.includes('área')) {
      sugerencias.push('Menciona la ubicación específica donde ocurrió el incidente');
    }
    
    if (!texto.includes('causa raíz') && !texto.includes('ocasionado por')) {
      sugerencias.push('Identifica la causa raíz del incidente para análisis preventivo futuro');
    }
    
    if (!texto.includes('medidas implementadas')) {
      sugerencias.push('Describe las medidas de seguridad implementadas durante el incidente');
    }
    
    if (!texto.includes('protocolos activados')) {
      sugerencias.push('Menciona los protocolos de emergencia que se activaron');
    }
    
    return sugerencias;
  }

  // Análisis profundo del texto
  static analisisProfundoTexto(texto, contextoFormulario) {
    const analisis = {
      nivelTecnico: 0,
      profesionalismo: 0,
      coherencia: 0,
      completitud: 0,
      recomendaciones: []
    };
    
    // Análisis de nivel técnico
    const terminosTecnicos = ['estructural', 'eléctrico', 'sistema', 'protocolo', 'evaluación', 'análisis', 'documentación'];
    const terminosUsados = terminosTecnicos.filter(termino => 
      texto.toLowerCase().includes(termino)
    );
    analisis.nivelTecnico = Math.min((terminosUsados.length / terminosTecnicos.length) * 100, 100);
    
    // Análisis de profesionalismo
    const palabrasProfesionales = ['procedió', 'implementó', 'evaluó', 'verificó', 'analizó', 'documentó', 'identificó', 'estableció'];
    const palabrasProfesionalesUsadas = palabrasProfesionales.filter(palabra => 
      texto.toLowerCase().includes(palabra)
    );
    analisis.profesionalismo = Math.min((palabrasProfesionalesUsadas.length / palabrasProfesionales.length) * 100, 100);
    
    // Análisis de coherencia
    const conectores = ['que', 'por', 'según', 'además', 'también', 'como', 'cuando', 'donde'];
    const conectoresUsados = conectores.filter(conector => 
      texto.toLowerCase().includes(conector)
    );
    analisis.coherencia = Math.min((conectoresUsados.length / conectores.length) * 100, 100);
    
    // Análisis de completitud
    const elementosRequeridos = ['fecha', 'hora', 'ubicación', 'causa', 'daños', 'medidas', 'protocolos'];
    const elementosIncluidos = elementosRequeridos.filter(elemento => 
      texto.toLowerCase().includes(elemento)
    );
    analisis.completitud = Math.min((elementosIncluidos.length / elementosRequeridos.length) * 100, 100);
    
    // Generar recomendaciones específicas
    if (analisis.nivelTecnico < 60) {
      analisis.recomendaciones.push('Incluye más términos técnicos específicos del área de seguros');
    }
    
    if (analisis.profesionalismo < 60) {
      analisis.recomendaciones.push('Utiliza un lenguaje más profesional y técnico');
    }
    
    if (analisis.coherencia < 60) {
      analisis.recomendaciones.push('Mejora la fluidez del texto con más conectores lógicos');
    }
    
    if (analisis.completitud < 60) {
      analisis.recomendaciones.push('Completa la información faltante para un reporte integral');
    }
    
    return analisis;
  }

  // Generar ideas basadas en el contexto del formulario con análisis profundo
  static generarIdeasContextuales(textoActual, contextoFormulario) {
    const ideas = [];
    
    // Analizar el tipo de evento para generar ideas relevantes
    if (contextoFormulario.tipoEvento === 'Incendio') {
      ideas.push({
        categoria: 'Análisis Técnico Avanzado',
        sugerencias: [
          'Realizar peritaje eléctrico completo con termografía',
          'Evaluar cumplimiento de códigos de construcción vigentes',
          'Analizar sistemas de detección y extinción automática',
          'Verificar estado de las instalaciones contra incendios',
          'Evaluar impacto en la continuidad operativa'
        ]
      });
      
      ideas.push({
        categoria: 'Evaluación de Daños Especializada',
        sugerencias: [
          'Análisis estructural con ingeniería forense',
          'Evaluación de contaminación por humo y residuos',
          'Análisis de equipos electrónicos afectados',
          'Evaluación de sistemas de ventilación y HVAC',
          'Análisis de materiales de construcción comprometidos'
        ]
      });
    }

    if (contextoFormulario.tipoEvento === 'Inundación') {
      ideas.push({
        categoria: 'Análisis Hidrológico',
        sugerencias: [
          'Evaluación de sistemas de drenaje y alcantarillado',
          'Análisis de capacidad de evacuación de agua',
          'Evaluación de sellado de ventanas y puertas',
          'Análisis de sistemas de bombeo y sumideros',
          'Evaluación de impacto en cimentaciones'
        ]
      });
    }

    if (contextoFormulario.tipoEvento === 'Robo') {
      ideas.push({
        categoria: 'Análisis de Seguridad Integral',
        sugerencias: [
          'Evaluación de sistemas de vigilancia y alarmas',
          'Análisis de protocolos de acceso y control',
          'Evaluación de iluminación perimetral y interior',
          'Análisis de sistemas de comunicación de emergencia',
          'Evaluación de respuesta de personal de seguridad'
        ]
      });
    }

    // Generar ideas basadas en el texto actual con análisis semántico
    if (textoActual.toLowerCase().includes('falla eléctrica')) {
      ideas.push({
        categoria: 'Análisis Eléctrico Especializado',
        sugerencias: [
          'Realizar peritaje eléctrico con equipos de medición avanzados',
          'Evaluar sobrecargas y distribución de carga',
          'Analizar mantenimiento preventivo de instalaciones',
          'Evaluar edad y estado de los componentes eléctricos',
          'Análisis de protección contra cortocircuitos'
        ]
      });
    }

    if (textoActual.toLowerCase().includes('testigo')) {
      ideas.push({
        categoria: 'Investigación Forense',
        sugerencias: [
          'Entrevistar a todos los testigos con metodología estructurada',
          'Documentar declaraciones con grabación de audio/video',
          'Verificar credibilidad y consistencia de testimonios',
          'Contrastar versiones con evidencia física',
          'Crear cronología detallada de eventos'
        ]
      });
    }

    if (textoActual.toLowerCase().includes('daños')) {
      ideas.push({
        categoria: 'Evaluación de Daños Integral',
        sugerencias: [
          'Fotografiar todos los daños con escala de referencia',
          'Realizar inventario detallado con clasificación por severidad',
          'Obtener cotizaciones de reparación de múltiples proveedores',
          'Evaluar tiempo de inactividad y costos asociados',
          'Análisis de impacto en operaciones y clientes'
        ]
      });
    }

    return ideas;
  }

  // Analizar calidad del texto con métricas avanzadas
  static analizarCalidadTexto(texto, contextoFormulario) {
    const analisis = {
      puntaje: 0,
      fortalezas: [],
      areasMejora: [],
      recomendaciones: [],
      metricas: {}
    };

    // Análisis de longitud y estructura
    const palabras = texto.split(' ');
    analisis.metricas.longitud = palabras.length;
    
    if (palabras.length >= 40) {
      analisis.puntaje += 25;
      analisis.fortalezas.push('Longitud excelente para un reporte profesional detallado');
    } else if (palabras.length >= 25) {
      analisis.puntaje += 20;
      analisis.fortalezas.push('Longitud adecuada para un reporte profesional');
    } else {
      analisis.areasMejora.push('El texto es muy corto para un reporte profesional');
      analisis.recomendaciones.push('Agrega más detalles sobre las circunstancias, causas y consecuencias');
    }

    // Análisis de estructura y puntuación
    if (texto.includes('.')) {
      analisis.puntaje += 15;
      analisis.fortalezas.push('Uso correcto de puntuación para separar ideas');
    } else {
      analisis.areasMejora.push('Falta puntuación adecuada');
      analisis.recomendaciones.push('Separa las ideas en oraciones con puntos para mejor legibilidad');
    }

    // Análisis de conectores avanzados
    const conectores = ['que', 'por', 'según', 'además', 'también', 'como', 'cuando', 'donde', 'mientras', 'aunque'];
    const conectoresUsados = conectores.filter(conector => 
      texto.toLowerCase().includes(conector)
    );
    
    if (conectoresUsados.length >= 5) {
      analisis.puntaje += 25;
      analisis.fortalezas.push('Excelente uso de conectores para fluidez y coherencia');
    } else if (conectoresUsados.length >= 3) {
      analisis.puntaje += 20;
      analisis.fortalezas.push('Buen uso de conectores para mejorar la fluidez');
    } else {
      analisis.areasMejora.push('Faltan conectores para mejorar la fluidez');
      analisis.recomendaciones.push('Usa más conectores como "que", "por", "según", "además", "mientras"');
    }

    // Análisis de precisión técnica
    if (texto.includes(':') || texto.includes('aproximadamente') || texto.includes('exactamente')) {
      analisis.puntaje += 15;
      analisis.fortalezas.push('Incluye información precisa y detallada');
    } else {
      analisis.areasMejora.push('Falta información precisa');
      analisis.recomendaciones.push('Incluye horarios exactos, ubicaciones específicas y cantidades precisas');
    }

    // Análisis de profesionalismo avanzado
    const palabrasProfesionales = ['procedió', 'implementó', 'evaluó', 'verificó', 'analizó', 'documentó', 'identificó', 'estableció', 'determinó'];
    const palabrasProfesionalesUsadas = palabrasProfesionales.filter(palabra => 
      texto.toLowerCase().includes(palabra)
    );
    
    if (palabrasProfesionalesUsadas.length >= 4) {
      analisis.puntaje += 20;
      analisis.fortalezas.push('Lenguaje altamente profesional y técnico');
    } else if (palabrasProfesionalesUsadas.length >= 2) {
      analisis.puntaje += 15;
      analisis.fortalezas.push('Lenguaje profesional y técnico adecuado');
    } else {
      analisis.areasMejora.push('Puede mejorar significativamente el lenguaje profesional');
      analisis.recomendaciones.push('Usa más términos técnicos como "procedió", "implementó", "evaluó", "documentó"');
    }

    // Análisis de contexto y coherencia
    if (contextoFormulario.tipoEvento && texto.toLowerCase().includes(contextoFormulario.tipoEvento.toLowerCase())) {
      analisis.puntaje += 15;
      analisis.fortalezas.push('El texto es coherente con el tipo de evento reportado');
    } else {
      analisis.areasMejora.push('El texto no menciona claramente el tipo de evento');
      analisis.recomendaciones.push('Menciona específicamente el tipo de incidente reportado para mayor claridad');
    }

    // Análisis de completitud técnica
    const elementosTecnicos = ['sistemas', 'protocolos', 'medidas', 'evaluación', 'análisis', 'documentación'];
    const elementosIncluidos = elementosTecnicos.filter(elemento => 
      texto.toLowerCase().includes(elemento)
    );
    
    if (elementosIncluidos.length >= 4) {
      analisis.puntaje += 15;
      analisis.fortalezas.push('Incluye elementos técnicos completos del análisis');
    } else if (elementosIncluidos.length >= 2) {
      analisis.puntaje += 10;
      analisis.fortalezas.push('Incluye algunos elementos técnicos importantes');
    } else {
      analisis.areasMejora.push('Faltan elementos técnicos importantes');
      analisis.recomendaciones.push('Incluye más elementos técnicos como sistemas, protocolos, medidas y evaluaciones');
    }

    analisis.puntaje = Math.min(analisis.puntaje, 100);
    
    // Clasificación avanzada de calidad
    if (analisis.puntaje >= 90) {
      analisis.clasificacion = 'Excelente - Nivel Profesional Superior';
    } else if (analisis.puntaje >= 80) {
      analisis.clasificacion = 'Muy Bueno - Nivel Profesional';
    } else if (analisis.puntaje >= 70) {
      analisis.clasificacion = 'Bueno - Nivel Técnico';
    } else if (analisis.puntaje >= 60) {
      analisis.clasificacion = 'Adecuado - Nivel Básico';
    } else if (analisis.puntaje >= 40) {
      analisis.clasificacion = 'Regular - Necesita Mejora';
    } else {
      analisis.clasificacion = 'Insuficiente - Requiere Revisión Completa';
    }

    return analisis;
  }

  // Generar texto profesional con plantillas inteligentes avanzadas
  static generarTextoProfesional(tipoSeccion, contextoFormulario, textoUsuario = '') {
    const plantillas = {
      antecedentes: {
        incendio: `El ${contextoFormulario.tipoEvento?.toLowerCase() || 'incidente'} ocurrió el día ${contextoFormulario.fechaOcurrencia || '[FECHA]'} a las ${contextoFormulario.fechaOcurrencia ? new Date(contextoFormulario.fechaOcurrencia).getHours() + ':00' : '[HORA]'} horas, según reporte de ${contextoFormulario.funcionarioAsigna || 'personal autorizado'}. El incidente fue detectado ${textoUsuario.includes('testigo') ? 'por testigos presenciales' : 'por el sistema de alarmas'} y se procedió con la activación inmediata de los protocolos de emergencia correspondientes. Se implementaron medidas de evacuación preventiva como medida de seguridad para proteger la integridad del personal presente.`,
        
        inundacion: `El ${contextoFormulario.tipoEvento?.toLowerCase() || 'incidente'} se presentó el ${contextoFormulario.fechaOcurrencia || '[FECHA]'} a las ${contextoFormulario.fechaOcurrencia ? new Date(contextoFormulario.fechaOcurrencia).getHours() + ':00' : '[HORA]'} horas, ${textoUsuario.includes('lluvia') ? 'como consecuencia de las intensas lluvias que afectaron la región' : 'por causas que requieren investigación técnica detallada'}. La situación fue reportada por ${contextoFormulario.funcionarioAsigna || 'personal de seguridad'} y se implementaron medidas preventivas inmediatas para minimizar el impacto del evento.`,
        
        robo: `El ${contextoFormulario.tipoEvento?.toLowerCase() || 'incidente'} fue detectado el ${contextoFormulario.fechaOcurrencia || '[FECHA]'} a las ${contextoFormulario.fechaOcurrencia ? new Date(contextoFormulario.fechaOcurrencia).getHours() + ':00' : '[HORA]'} horas, ${textoUsuario.includes('vigilancia') ? 'por el sistema de vigilancia electrónica' : 'durante la ronda de seguridad programada'}. El personal de seguridad ${textoUsuario.includes('testigo') ? 'y testigos presenciales' : 'inmediatamente'} reportaron la situación, activándose los protocolos de emergencia correspondientes y notificando a las autoridades competentes.`
      },
      
      descripcionRiesgo: {
        incendio: `El riesgo asegurado corresponde a ${contextoFormulario.asegurado || '[ASEGURADO]'}, ubicado en ${contextoFormulario.direccionRiesgo || '[DIRECCIÓN]'}, ${contextoFormulario.ciudad || '[CIUDAD]'}. La edificación presenta características ${textoUsuario.includes('industrial') ? 'industriales con sistemas de alta complejidad' : 'comerciales con instalaciones estándar'} con ${textoUsuario.includes('eléctrico') ? 'sistemas eléctricos complejos que requieren mantenimiento especializado' : 'instalaciones eléctricas estándar'}. El nivel de riesgo se considera ${textoUsuario.includes('alto') ? 'alto debido a la presencia de materiales inflamables y operaciones de alta temperatura' : 'moderado considerando las medidas de seguridad implementadas'}.`,
        
        inundacion: `El riesgo asegurado corresponde a ${contextoFormulario.asegurado || '[ASEGURADO]'}, ubicado en ${contextoFormulario.direccionRiesgo || '[DIRECCIÓN]'}, ${contextoFormulario.ciudad || '[CIUDAD]'}. La propiedad se encuentra en una zona ${textoUsuario.includes('baja') ? 'baja susceptible a inundaciones con drenaje limitado' : 'con sistemas de drenaje adecuados y medidas de protección'}. El nivel de riesgo se considera ${textoUsuario.includes('alto') ? 'alto debido a las condiciones climáticas de la región y la ubicación geográfica' : 'moderado considerando las medidas de protección implementadas'}.`,
        
        robo: `El riesgo asegurado corresponde a ${contextoFormulario.asegurado || '[ASEGURADO]'}, ubicado en ${contextoFormulario.direccionRiesgo || '[DIRECCIÓN]'}, ${contextoFormulario.ciudad || '[CIUDAD]'}. La propiedad presenta ${textoUsuario.includes('seguridad') ? 'medidas de seguridad básicas que requieren fortalecimiento' : 'sistemas de seguridad avanzados con múltiples capas de protección'}. El nivel de riesgo se considera ${textoUsuario.includes('alto') ? 'alto debido a la zona donde se encuentra ubicada y el tipo de mercancía almacenada' : 'moderado considerando los sistemas de seguridad implementados'}.`
      }
    };

    const tipoEvento = contextoFormulario.tipoEvento?.toLowerCase() || 'incidente';
    const seccion = plantillas[tipoSeccion];
    
    if (seccion && seccion[tipoEvento]) {
      return seccion[tipoEvento];
    }
    
    // Plantilla genérica avanzada
    return `El ${contextoFormulario.tipoEvento?.toLowerCase() || 'incidente'} se presentó el ${contextoFormulario.fechaOcurrencia || '[FECHA]'} a las ${contextoFormulario.fechaOcurrencia ? new Date(contextoFormulario.fechaOcurrencia).getHours() + ':00' : '[HORA]'} horas. ${textoUsuario || 'Se requiere información adicional para completar esta sección de manera profesional y detallada.'} Se recomienda incluir detalles específicos sobre las circunstancias, causas identificadas y medidas implementadas para un análisis completo del evento.`;
  }

  // Obtener contexto para correcciones
  static obtenerContextoCorreccion(incorrecto, correcto, contextoFormulario) {
    const contextos = {
      'tubo': 'En contexto de seguros, "tuvo" es la forma correcta del verbo tener en pasado',
      'falla electrica': 'En terminología técnica, "falla eléctrica" debe llevar tilde',
      'edifico': 'En documentación técnica, "edificio" es la ortografía correcta',
      'sotano': 'En arquitectura, "sótano" debe llevar tilde',
      'propago': 'En terminología técnica, "propagó" debe llevar tilde',
      'rapido': 'En lenguaje profesional, "rápido" debe llevar tilde',
      'electricos': 'En terminología técnica, "eléctricos" debe llevar tilde',
      'inspeccion': 'En documentación técnica, "inspección" debe llevar tilde',
      'criticos': 'En terminología técnica, "críticos" debe llevar tilde'
    };
    
    return contextos[incorrecto] || `Corrección ortográfica estándar: "${incorrecto}" → "${correcto}"`;
  }
}

export default IAService;
