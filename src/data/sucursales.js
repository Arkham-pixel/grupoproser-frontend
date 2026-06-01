// Lista de sucursales comunes para todas las aseguradoras
export const sucursalesComunes = [
  "SUC PRINCIPAL",
  "SUC MEDELLIN",
  "SUC BOGOTA",
  "SUC CALI",
  "SUC BARRANQUILLA",
  "SUC CARTAGENA",
  "SUC BUCARAMANGA",
  "SUC PEREIRA",
  "SUC MANIZALES",
  "SUC IBAGUE",
  "SUC NEIVA",
  "SUC VILLAVICENCIO",
  "SUC MONTERIA",
  "SUC SINCELEJO",
  "SUC TUNJA",
  "SUC ARMENIA",
  "SUC POPAYAN",
  "SUC PASTO",
  "SUC FLORENCIA",
  "SUC SANTA MARTA",
  "SUC CUCUTA",
  "SUC OCAÑA",
  "SUC PAMPLONA",
  "SUC SANTA ROSA",
  "SUC VILLA DEL ROSARIO",
  "SUC ABREGO",
  "SUC ARBOLEDAS",
  "SUC BOCHALEMA",
  "SUC BUCARASICA",
  "SUC CACOTA",
  "SUC CACHIRA",
  "SUC CHITAGA",
  "SUC CONVENCION",
  "SUC CUCUTILLA",
  "SUC EL CARMEN",
  "SUC EL TARRA",
  "SUC EL ZULIA",
  "SUC GRAMALOTE",
  "SUC HACARI",
  "SUC LABATECA",
  "SUC LA DONJUANA",
  "SUC LA PLAYA DE BELEN",
  "SUC LOURDES",
  "SUC MALLAMA",
  "SUC MUTISCUA",
  "SUC OSPINA",
  "SUC PAMPLONITA",
  "SUC PUENTE NACIONAL",
  "SUC RAGONVALIA",
  "SUC SALAZAR",
  "SUC SAN CAYETANO",
  "SUC SANTIAGO",
  "SUC SARDINATA",
  "SUC SILOS",
  "SUC TEORAMA",
  "SUC TIBU",
  "SUC TOLEDO",
  "SUC VILLA CARO",
  "SUC CHINACOTA",
  "SUC DURANIA",
  "SUC HERRAN",
  "SUC LA ESPERANZA",
  "SUC LA PLAYA",
  "SUC LOS PATIOS"
];

// Función para generar sucursales para una aseguradora específica
export function generarSucursalesParaAseguradora(nombreAseguradora) {
  return sucursalesComunes.map(sucursal => `${nombreAseguradora} ${sucursal}`);
}

// Función para buscar sucursales por texto
export function buscarSucursales(sucursales, textoBusqueda) {
  if (!textoBusqueda) return sucursales;
  return sucursales.filter(suc => 
    suc.toLowerCase().includes(textoBusqueda.toLowerCase())
  );
}
