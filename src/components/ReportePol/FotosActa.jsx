import React, { useRef } from "react";

export default function FotosActa({
  fotosActa, setFotosActa
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const nuevaFoto = {
          src: e.target.result,
          descripcion: file.name,
          timestamp: new Date().toISOString()
        };
        setFotosActa(prev => [...prev, nuevaFoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFoto = (index) => {
    setFotosActa(prev => prev.filter((_, i) => i !== index));
  };

  const updateDescripcion = (index, nuevaDescripcion) => {
    setFotosActa(prev => prev.map((foto, i) => 
      i === index ? { ...foto, descripcion: nuevaDescripcion } : foto
    ));
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-emerald-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-emerald-500 text-white p-2 rounded-lg mr-3">📸</span>
        FOTOS DEL ACTA
      </h2>
      
      {/* Botón para agregar fotos */}
      <div className="mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
        >
          <span className="mr-2">📷</span>
          Agregar Fotos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-gray-600 mt-2">
          Puedes seleccionar múltiples imágenes. Formatos soportados: JPG, PNG, GIF
        </p>
      </div>
      
      {/* Grid de fotos */}
      {fotosActa.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fotosActa.map((foto, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="relative">
                <img
                  src={foto.src}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
                <button
                  onClick={() => removeFoto(index)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                  title="Eliminar foto"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <input
                  type="text"
                  value={foto.descripcion}
                  onChange={(e) => updateDescripcion(index, e.target.value)}
                  placeholder="Descripción de la foto..."
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">
                  Agregada: {new Date(foto.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400 text-6xl mb-4">📸</div>
          <p className="text-gray-500 text-lg">No hay fotos adjuntas</p>
          <p className="text-gray-400 text-sm">Haz clic en "Agregar Fotos" para comenzar</p>
        </div>
      )}
      
      {/* Información adicional */}
      <div className="mt-6 p-3 bg-emerald-50 rounded-md border border-emerald-200">
        <p className="text-sm text-emerald-800">
          <strong>💡 Nota:</strong> Las fotos se incluirán en el documento Word final. Se recomienda agregar fotos de la inspección, estado de la mercancía, y cualquier evidencia relevante.
        </p>
      </div>
    </div>
  );
} 