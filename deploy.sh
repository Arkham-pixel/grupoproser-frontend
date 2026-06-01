#!/bin/bash

echo "🚀 Iniciando despliegue..."

# 1. Hacer build del frontend
echo "📦 Haciendo build del frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completado exitosamente"
    
    # 2. Copiar al servidor
    echo "📤 Copiando archivos al servidor..."
    scp -i "C:\Users\USUARIO\Downloads\PcLenovo.pem" -r dist ubuntu@13.59.106.174:/home/ubuntu/cliente4/
    
    if [ $? -eq 0 ]; then
        echo "✅ Archivos copiados exitosamente"
        
        # 3. Recargar Nginx
        echo "🔄 Recargando Nginx..."
        ssh -i "C:\Users\USUARIO\Downloads\PcLenovo.pem" ubuntu@13.59.106.174 "sudo systemctl reload nginx"
        
        if [ $? -eq 0 ]; then
            echo "✅ Nginx recargado exitosamente"
            echo "🎉 Despliegue completado!"
            echo "🌐 Tu aplicación está disponible en: http://api.grupoproser.com.co"
        else
            echo "❌ Error al recargar Nginx"
        fi
    else
        echo "❌ Error al copiar archivos al servidor"
    fi
else
    echo "❌ Error en el build del frontend"
fi 