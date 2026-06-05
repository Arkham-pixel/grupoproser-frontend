#!/bin/bash

echo "🚀 Iniciando despliegue..."

# 1. Hacer build del frontend
echo "📦 Haciendo build del frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completado exitosamente"
    
    # 2. Copiar al servidor
    echo "📤 Copiando archivos al servidor..."
    REMOTE=ubuntu@3.17.56.57
    DIST=/home/ubuntu/grupoproser/grupoproser/frontend/dist
    scp -i "C:\Users\GP-TI\Downloads\PcLenovo.pem" -r dist/* "$REMOTE:$DIST/"

    if [ $? -eq 0 ]; then
        echo "✅ Archivos copiados exitosamente"

        # 3. Permisos (nginx www-data debe poder leer assets/)
        echo "🔐 Ajustando permisos..."
        ssh -i "C:\Users\GP-TI\Downloads\PcLenovo.pem" "$REMOTE" "chmod -R a+rX $DIST && sudo systemctl reload nginx"
        
        if [ $? -eq 0 ]; then
            echo "✅ Nginx recargado exitosamente"
            echo "🎉 Despliegue completado!"
            echo "🌐 Tu aplicación está disponible en: https://aplicacion.grupoproser.com.co"
        else
            echo "❌ Error al recargar Nginx"
        fi
    else
        echo "❌ Error al copiar archivos al servidor"
    fi
else
    echo "❌ Error en el build del frontend"
fi 