import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 

export interface ProductoFactura {
  codigoProveedor: string;          // Si la factura no trae código numérico, se usa la descripción exacta
  descripcionOriginal: string;      // Nombre tal cual sale impreso en la factura
  cantidadFactura: number;          // Cantidad detectada
  precioCostoUnitario: number;      // Costo por unidad
  descuentos?: number;              // Descuento si aplica
  detallesExtra?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class AiFacturasService {
  private http = inject(HttpClient);
  // Nota: En producción, se recomienda obtener esta clave de un backend seguro.
  private apiKey = 'AQ.Ab8RN6IvROp1iwN4_jg-Vc2y1MoXGRiciZ-mGNOEESUFtMMP9Q'; 
  private apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

  async analizarFactura(base64Image: string): Promise<ProductoFactura[]> {
    const prompt = `
      Eres un asistente experto en lectura y contabilidad de facturas para minimarkets en Chile.
      Analiza la imagen de esta factura de proveedor y extrae todos los productos comprados.

      INSTRUCCIONES CLAVE:
      1. Extrae la información de cada producto y devuélvela ÚNICAMENTE como un arreglo JSON puro de objetos.
      2. No incluyas explicaciones, saludos ni formato de bloques de código markdown (\`\`\`json ... \`\`\`). Devuelve solo el JSON crudo.
      3. Si el proveedor no incluye un código numérico para un producto, usa la descripción exacta como "codigoProveedor".

      Estructura de cada objeto en el JSON:
      {
        "codigoProveedor": "Código del producto o la descripción si no tiene código",
        "descripcionOriginal": "Descripción o nombre del producto tal como sale en la foto",
        "cantidadFactura": 10,
        "precioCostoUnitario": 1500,
        "descuentos": 0,
        "detallesExtra": {}
      }
    `;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      }]
    };

    try {
      const response: any = await this.http.post(this.apiUrl, body).toPromise();
      
      if (!response || !response.candidates || response.candidates.length === 0) {
        throw new Error('No se recibió respuesta válida del servidor de Gemini.');
      }

      let textoJson = response.candidates[0].content.parts[0].text;
      // Limpiamos formato markdown si la IA ignora la instrucción del prompt
      textoJson = textoJson.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(textoJson) as ProductoFactura[];
    } catch (error: any) {
      console.error('Error al analizar la factura con Gemini:', error);
      throw error;
    }
  }
}