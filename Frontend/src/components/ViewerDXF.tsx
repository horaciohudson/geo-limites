import React, { useRef, useEffect, useState } from 'react';
import api from '@/services/api';
import { parseDXF } from '@/utils/dxfParser';
import type { DXFData, DXFEntity } from '@/utils/dxfParser';
import { findNearestPoint, calculatePolygonArea, calculateDistance } from '@/utils/geometry';
import type { Point2D } from '@/utils/geometry';
import { extractFacesFromLines } from '@/utils/polygonExtraction';

const isPointInPolygon = (point: Point2D, polygon: Point2D[]) => {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
};

interface DXFVertex {
  x: number;
  y: number;
}

interface DXFEntityProperties {
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  centerX?: number;
  centerY?: number;
  text?: string;
  height?: number;
  rotation?: number;
  closed?: boolean;
  vertices?: DXFVertex[];
}

interface DrawingBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  drawingWidth: number;
  drawingHeight: number;
}

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

interface ViewerDXFProps {
  fileId?: string;
  data?: DXFData;
  className?: string;
  onDXFDataLoaded?: (data: DXFData) => void;
  interactive?: boolean;
  onPolygonConfirmed?: (polygons: Point2D[][]) => void;
}

const ViewerDXF: React.FC<ViewerDXFProps> = ({ fileId, data, className, onDXFDataLoaded, interactive, onPolygonConfirmed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dxfData, setDxfData] = useState<DXFData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Estados para Pan e Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawingBounds, setDrawingBounds] = useState<DrawingBounds | null>(null);
  const [scale, setScale] = useState(1);
  const [validPoints, setValidPoints] = useState<Point2D[]>([]);
  const [manualPolygon, setManualPolygon] = useState<Point2D[]>([]);
  const [selectedPolygons, setSelectedPolygons] = useState<Point2D[][]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point2D | null>(null);
  const [hoverPolygon, setHoverPolygon] = useState<Point2D[] | null>(null);
  const [detectedPolygons, setDetectedPolygons] = useState<Point2D[][]>([]);

  // Encontrar polígonos fechados a partir de todas as linhas do desenho
  useEffect(() => {
    if (!dxfData) return;
    const segments: {p1: Point2D, p2: Point2D}[] = [];

    dxfData.entities.forEach((entity: DXFEntity) => {
      const props = entity.properties as DXFEntityProperties;
      if (entity.type === 'LINE') {
        if (props.x1 !== undefined && props.y1 !== undefined && props.x2 !== undefined && props.y2 !== undefined) {
          segments.push({ p1: {x: props.x1, y: props.y1}, p2: {x: props.x2, y: props.y2} });
        }
      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        if (props.vertices && props.vertices.length > 1) {
          const validVerts = props.vertices.filter(v => v.x !== undefined && v.y !== undefined);
          for (let i = 0; i < validVerts.length - 1; i++) {
            segments.push({
              p1: {x: validVerts[i].x as number, y: validVerts[i].y as number},
              p2: {x: validVerts[i+1].x as number, y: validVerts[i+1].y as number}
            });
          }
          if (props.closed) {
            segments.push({
              p1: {x: validVerts[validVerts.length-1].x as number, y: validVerts[validVerts.length-1].y as number},
              p2: {x: validVerts[0].x as number, y: validVerts[0].y as number}
            });
          }
        }
      }
    });

    // Extrai as faces/lotes a partir dos segmentos
    const polys = extractFacesFromLines(segments);
    
    // Filtra apenas os polígonos que contêm algum texto dentro
    // Em projetos de loteamento, um lote válido sempre terá um texto (ex: "Lote 1", Área, etc.)
    // enquanto ruas, calçadas e polígonos vazios não terão.
    const validPolys = polys.filter(poly => {
      // Filtrar por área mínima para excluir células de tabelas de coordenadas
      const area = calculatePolygonArea(poly);
      if (area < 20) return false;

      // Pega todos os textos que estão geometricamente dentro deste polígono
      const textsInside = dxfData.entities.filter(e => {
        if (e.type !== 'TEXT' && e.type !== 'MTEXT') return false;
        
        const tx = e.properties.x ?? e.properties.alignmentX ?? e.properties.x1;
        const ty = e.properties.y ?? e.properties.alignmentY ?? e.properties.y1;
        
        if (tx !== undefined && ty !== undefined) {
           return isPointInPolygon({ x: tx as number, y: ty as number }, poly);
        }
        return false;
      });

      if (textsInside.length === 0) return false;

      // Palavras comuns em cabeçalhos de tabelas de coordenadas
      const tableKeywords = ['vertice', 'vértice', 'azimute', 'distancia', 'distância', 'coordenada', 'ponto', 'lado', 'rumo', 'descrição'];
      
      // Verifica se possui alguma palavra que identifica um lote claramente
      const hasLotKeyword = textsInside.some(t => {
         const str = (t.properties.text || '').toLowerCase();
         return str.includes('lote') || str.includes('área') || str.includes('area') || str.includes('m2') || str.includes('m²') || str.includes('quadra');
      });

      // Se tiver explicitamente a palavra "lote" ou "área", é um lote válido com certeza
      if (hasLotKeyword) return true;

      // Se não tem palavra de lote, mas os textos contêm jargão de tabela, então é o cabeçalho da grade
      const isTable = textsInside.some(t => {
         const str = (t.properties.text || '').toLowerCase();
         return tableKeywords.some(kw => str.includes(kw));
      });

      // Se for tabela, descarta
      if (isTable) return false;

      // Se tiver textos normais (apenas números, por exemplo), aceita por precaução
      return true;
    });

    setDetectedPolygons(validPolys);
    
    // Auto-seleciona todos os lotes detectados por padrão
    setSelectedPolygons(validPolys);
  }, [dxfData]);

  // Carregar dados DXF
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (data) {
        if (isMounted) {
          setDxfData(data);
          setError('');
        }
        return;
      }

      if (!fileId) {
        if (isMounted) {
          setError('Nenhum arquivo especificado');
        }
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const response = await api.get(`/dxf/${fileId}/download`, {
          responseType: 'text'
        });

        const parsedData = parseDXF(response.data);

        if (isMounted) {
          setDxfData(parsedData);
          if (onDXFDataLoaded) {
            onDXFDataLoaded(parsedData);
          }
        }

      } catch (err: unknown) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Erro ao carregar arquivo DXF'));
          console.error('Erro ao carregar DXF:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fileId, data]); // Removido onDXFDataLoaded para evitar loop infinito

  // Desenhar no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dxfData?.entities) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas - TAMANHO AUMENTADO 20x
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = Math.max(container.clientHeight, 2000); // Aumentado de 600 para 2000
    }

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo cinza claro
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calcular bounds - IGNORANDO coordenadas muito distantes (outliers) que quebram o zoom
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validEntities = 0;
    const allX: number[] = [];
    const allY: number[] = [];
    const points: Point2D[] = [];
    
    const addCoord = (x: number, y: number) => {
      // Ignorar exatamente (0,0) que frequentemente é erro de parser/origem
      if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) return;
      allX.push(x);
      allY.push(y);
      points.push({ x, y, id: `V_${x.toFixed(3)}_${y.toFixed(3)}` });
    };

    dxfData.entities.forEach((entity: DXFEntity) => {
      const props = entity.properties as DXFEntityProperties;

      switch (entity.type) {
        case 'LINE':
          if (props.x1 !== undefined && props.y1 !== undefined) addCoord(props.x1, props.y1);
          if (props.x2 !== undefined && props.y2 !== undefined) addCoord(props.x2, props.y2);
          break;
        case 'TEXT':
        case 'MTEXT':
          if (props.x !== undefined && props.y !== undefined) addCoord(props.x, props.y);
          break;
        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (props.vertices) {
            props.vertices.forEach((v: DXFVertex) => {
              if (v.x !== undefined && v.y !== undefined) addCoord(v.x, v.y);
            });
          }
          break;
      }
    });

    if (allX.length > 0) {
      allX.sort((a, b) => a - b);
      allY.sort((a, b) => a - b);
      
      // Utilizando o método do Intervalo Interquartil (IQR) para remover lixo fora do desenho principal
      const q1X = allX[Math.floor(allX.length * 0.25)];
      const q3X = allX[Math.floor(allX.length * 0.75)];
      const iqrX = q3X - q1X;
      
      const q1Y = allY[Math.floor(allY.length * 0.25)];
      const q3Y = allY[Math.floor(allY.length * 0.75)];
      const iqrY = q3Y - q1Y;
      
      // Um multiplicador de 1.5 ou 2.0 é padrão para IQR. 
      // Usaremos 2.5 para ter uma margem segura sem incluir lixo muito distante.
      const multiplier = 2.5;
      
      // Limites baseados no IQR (garantindo um mínimo de 50 unidades de tolerância caso o IQR seja 0)
      const maxAllowedDistX = Math.max(iqrX * multiplier, 50);
      const maxAllowedDistY = Math.max(iqrY * multiplier, 50);
      
      const medianX = allX[Math.floor(allX.length / 2)];
      const medianY = allY[Math.floor(allY.length / 2)];

      for (let i = 0; i < allX.length; i++) {
        if (allX[i] >= medianX - maxAllowedDistX && allX[i] <= medianX + maxAllowedDistX) {
          minX = Math.min(minX, allX[i]);
          maxX = Math.max(maxX, allX[i]);
        }
      }
      for (let i = 0; i < allY.length; i++) {
        if (allY[i] >= medianY - maxAllowedDistY && allY[i] <= medianY + maxAllowedDistY) {
          minY = Math.min(minY, allY[i]);
          maxY = Math.max(maxY, allY[i]);
        }
      }
      validEntities = allX.length;
    }

    if (validEntities === 0 || minX === Infinity) {
      // Desenhar mensagem de erro
      ctx.fillStyle = '#6c757d';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Nenhuma entidade válida encontrada', canvas.width / 2, canvas.height / 2 + 50);
      return;
    }

    // Calcular escala - AUMENTADA 20x PARA CORRIGIR TAMANHO DO GRÁFICO
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    const maxDimension = Math.max(drawingWidth, drawingHeight);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Salvar bounds para uso posterior na centralização
    const bounds = { minX, minY, maxX, maxY, centerX, centerY, drawingWidth, drawingHeight };
    if (JSON.stringify(bounds) !== JSON.stringify(drawingBounds)) {
      setDrawingBounds(bounds);
    }

    // LOG DE DEBUG - Mostrar coordenadas do desenho
    const canvasSize = Math.min(canvas.width, canvas.height);
    // Escala base automática com MULTIPLICADOR DE 10x para visualização adequada
    const baseScale = maxDimension > 0 ? (canvasSize * 0.9) / maxDimension : 1;
    const scale = baseScale * zoom;
    setScale(scale);
    setValidPoints(points);

    // Aplicar transformações com Pan
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(scale, -scale); // INVERTER Y de volta - padrão DXF
    ctx.translate(-centerX, -centerY);

    // Desenhar entidades em preto
    ctx.strokeStyle = '#212529';
    ctx.fillStyle = '#212529';
    ctx.lineWidth = 1 / scale; // Espessura normal

    // LOG: Testar onde os primeiros pontos vão aparecer no canvas
    let linesDrawn = 0;

    dxfData.entities.forEach((entity: DXFEntity) => {
      const props = entity.properties as DXFEntityProperties;

      switch (entity.type) {
        case 'LINE':
          if (props.x1 !== undefined && props.y1 !== undefined &&
            props.x2 !== undefined && props.y2 !== undefined) {
            ctx.beginPath();
            ctx.moveTo(props.x1, props.y1);
            ctx.lineTo(props.x2, props.y2);
            ctx.stroke();
            linesDrawn++;
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (props.vertices && props.vertices.length > 1) {
            ctx.beginPath();
            const v0 = props.vertices[0];
            ctx.moveTo(v0.x, v0.y);
            for (let i = 1; i < props.vertices.length; i++) {
              const v = props.vertices[i];
              ctx.lineTo(v.x, v.y);
            }
            
            if (props.closed) ctx.closePath();
            ctx.stroke();
            linesDrawn++;
          }
          break;

        case 'TEXT':
        case 'MTEXT':
          if (props.x !== undefined && props.y !== undefined && props.text) {
            // Salvar o estado atual do contexto
            ctx.save();
            
            // Mover para a posição do texto
            ctx.translate(props.x, props.y);
            
            // Cancelar a inversão Y global aplicando escala positiva
            ctx.scale(1 / scale, -1 / scale);
            
            // Calcular posição no canvas (com as transformações atuais)
            const canvasCenterX = canvas.width / 2 + pan.x;
            const canvasCenterY = canvas.height / 2 + pan.y;
            
            // Resetar para coordenadas de canvas
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Posicionar no canvas considerando as transformações
            const screenX = canvasCenterX + (props.x - centerX) * scale;
            const screenY = canvasCenterY - (props.y - centerY) * scale;
            
            ctx.translate(screenX, screenY);
            
            // Aplicar rotação se houver (negativa para compensar a inversão Y do DXF)
            if (props.rotation) {
              ctx.rotate((-props.rotation * Math.PI) / 180);
            }
            
            // Ajustar tamanho da fonte
            const fontSize = Math.max((props.height || 2.5) * scale * 0.8, 8);
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#212529';
            ctx.fillText(props.text, 0, 0);
            
            ctx.restore();
          }
          break;
      }
    });

    // Desenhar polígonos detectados (lotes) em verde
    if (detectedPolygons.length > 0) {
      ctx.save();
      ctx.lineWidth = 1.5 / scale;
      ctx.strokeStyle = '#28a745'; // Borda verde
      
      detectedPolygons.forEach(poly => {
        if (poly.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for(let i=1; i<poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      });
      ctx.restore();
    }

    // Desenhar destaque amarelo se o mouse estiver sobre um lote auto-detectado
    if (interactive && hoverPolygon) { // Destaque visual
      ctx.save();
      ctx.fillStyle = 'rgba(255, 193, 7, 0.2)'; // Amarelo translúcido
      ctx.beginPath();
      ctx.moveTo(hoverPolygon[0].x, hoverPolygon[0].y);
      for(let i=1; i<hoverPolygon.length; i++) {
        ctx.lineTo(hoverPolygon[i].x, hoverPolygon[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    // Desenhar polígonos interativos selecionados
    if (interactive && selectedPolygons.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 123, 255, 0.2)';
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = '#007bff';
      
      selectedPolygons.forEach(poly => {
        if (poly.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for(let i=1; i<poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    // Desenhar polígono manual em andamento
    if (interactive && manualPolygon.length > 0) {
       ctx.save();
       ctx.beginPath();
       ctx.moveTo(manualPolygon[0].x, manualPolygon[0].y);
       for(let i=1; i<manualPolygon.length; i++) {
         ctx.lineTo(manualPolygon[i].x, manualPolygon[i].y);
       }
       ctx.lineWidth = 2 / scale;
       ctx.strokeStyle = '#ffc107'; // Amarelo para destacar que está desenhando
       ctx.stroke();

       manualPolygon.forEach((p, i) => {
         ctx.beginPath();
         ctx.arc(p.x, p.y, 6 / scale, 0, 2 * Math.PI);
         ctx.fillStyle = i === 0 ? '#28a745' : '#ffc107';
         ctx.fill();
         ctx.stroke();
       });
       ctx.restore();
    }

    if (interactive && hoverPoint) {
       ctx.beginPath();
       ctx.arc(hoverPoint.x, hoverPoint.y, 10 / scale, 0, 2 * Math.PI);
       ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
       ctx.fill();
       ctx.strokeStyle = '#ffc107';
       ctx.lineWidth = 2 / scale;
       ctx.stroke();

       // Desenhar Tooltip com coordenadas
       ctx.save();
       ctx.setTransform(1, 0, 0, 1, 0, 0);
       
       const canvasCenterX = canvasRef.current!.width / 2 + pan.x;
       const canvasCenterY = canvasRef.current!.height / 2 + pan.y;
       
       // Calculate screen coordinates for the hover point
       const screenX = canvasCenterX + (hoverPoint.x - (drawingBounds?.centerX || 0)) * scale;
       const screenY = canvasCenterY - (hoverPoint.y - (drawingBounds?.centerY || 0)) * scale;
       
       ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
       ctx.fillRect(screenX + 15, screenY - 45, 180, 40);
       ctx.fillStyle = 'white';
       ctx.font = '12px Arial';
       ctx.textAlign = 'left';
       ctx.fillText(`E: ${hoverPoint.x.toFixed(3)}`, screenX + 20, screenY - 28);
       ctx.fillText(`N: ${hoverPoint.y.toFixed(3)}`, screenX + 20, screenY - 12);
       
       ctx.restore();
    }

    ctx.restore();

    // Info de debug discreta no canvas
    ctx.fillStyle = '#6c757d';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Entidades: ${dxfData.entities.length} | Desenhadas: ${linesDrawn}`, 10, 20);
    ctx.fillText(`Escala: ${scale.toFixed(2)}x | Zoom: ${zoom.toFixed(2)}x`, 10, 35);
    if (drawingBounds) {
      ctx.fillText(`Tamanho: ${drawingBounds.drawingWidth.toFixed(1)} x ${drawingBounds.drawingHeight.toFixed(1)}`, 10, 50);
    }

  }, [dxfData, pan, zoom, selectedPolygons, manualPolygon, hoverPoint, hoverPolygon, interactive, scale]);

  // Handlers de mouse para Pan
  
  const getDxfCoords = (clientX: number, clientY: number): Point2D | null => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingBounds) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - (canvas.width / 2 + pan.x);
    const dy = y - (canvas.height / 2 + pan.y);
    const dxfX = (dx / scale) + drawingBounds.centerX;
    const dxfY = (dy / -scale) + drawingBounds.centerY;
    return { x: dxfX, y: dxfY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Requer a tecla Ctrl pressionada para desenhar ou selecionar lote
    if (e.button === 0 && interactive && e.ctrlKey) {
       const dxfCoords = getDxfCoords(e.clientX, e.clientY);
       
       // Se clicou num polígono detectado, adiciona ou remove da seleção
       if (dxfCoords) {
         const containingPolys = detectedPolygons.filter(p => isPointInPolygon(dxfCoords, p));
         if (containingPolys.length > 0) {
           containingPolys.sort((a, b) => calculatePolygonArea(a) - calculatePolygonArea(b));
           const clickedPoly = containingPolys[0];
           
           // Só auto-seleciona se o clique não for num vértice amarelo de "snap" (traçado manual)
           if (!hoverPoint || (hoverPolygon && calculateDistance(dxfCoords, hoverPoint) > 10 / scale)) {
             // Verifica se já está selecionado para alternar (toggle)
             const isSelected = selectedPolygons.some(sp => 
                sp.length === clickedPoly.length && sp.every((p, i) => p.x === clickedPoly[i].x && p.y === clickedPoly[i].y)
             );
             
             if (isSelected) {
               setSelectedPolygons(prev => prev.filter(sp => 
                 !(sp.length === clickedPoly.length && sp.every((p, i) => p.x === clickedPoly[i].x && p.y === clickedPoly[i].y))
               ));
             } else {
               setSelectedPolygons(prev => [...prev, clickedPoly]);
             }
             return;
           }
         }
       }

       // Traçado manual
       if (hoverPoint) {
         setManualPolygon(prev => {
            // Verifica se clicou no primeiro ponto para fechar o polígono
            if (prev.length > 2 && prev[0].x === hoverPoint.x && prev[0].y === hoverPoint.y) {
               // Fecha o polígono e move para selectedPolygons
               setSelectedPolygons(sel => [...sel, prev]);
               return []; // Reseta o traçado manual
            }
            
            // Evitar duplicar o último ponto
            if (prev.length > 0) {
               const last = prev[prev.length - 1];
               if (last.x === hoverPoint.x && last.y === hoverPoint.y) return prev;
            }
            return [...prev, hoverPoint];
         });
         return;
       }
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }
    
    if (interactive) {
       const dxfCoords = getDxfCoords(e.clientX, e.clientY);
       if (dxfCoords) {
          const snapDist = 20 / scale;
          const nearest = findNearestPoint(dxfCoords, validPoints, snapDist);
          setHoverPoint(nearest);
          
          // Detectar lote para hover (somente visual)
          const containingPolys = detectedPolygons.filter(p => isPointInPolygon(dxfCoords, p));
          if (containingPolys.length > 0) {
            containingPolys.sort((a, b) => calculatePolygonArea(a) - calculatePolygonArea(b));
            setHoverPolygon(containingPolys[0]);
          } else {
            setHoverPolygon(null);
          }
       }
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactive && manualPolygon.length > 0) {
      e.preventDefault();
      setManualPolygon(prev => prev.slice(0, -1));
    } else if (interactive && selectedPolygons.length > 0) {
      e.preventDefault();
      // Se não há traçado manual, remove o último lote selecionado
      setSelectedPolygons(prev => prev.slice(0, -1));
    }
  };


  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(50, prev * delta)));
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCenterDrawing = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  if (isLoading) {
    return (
      <div className={`viewer-dxf ${className || ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div>🔄 Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`viewer-dxf ${className || ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#dc3545' }}>❌ {error}</div>
      </div>
    );
  }

  return (
    <div className={`viewer-dxf ${className || ''}`}>
      <div style={{ padding: '10px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          {dxfData && <span style={{ marginLeft: '10px' }}>Entidades válidas: {dxfData.entities?.length || 0}</span>}
        </div>
        
        {interactive && (
          <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px', flexBasis: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px' }}>
              <strong>Modo de Lotes em Massa:</strong> Todos os lotes detectados são <strong>pré-selecionados (azul)</strong>.<br/>
              Use <strong>Ctrl + Clique</strong> num lote para <strong>adicionar/remover</strong> ele da seleção.<br/>
              Para traçar manualmente, faça <strong>Ctrl + Clique</strong> nos vértices e clique no primeiro vértice para fechar e adicionar o lote.
              <br/>
              <span style={{ color: '#007bff', fontWeight: 'bold', marginTop: '5px', display: 'inline-block' }}>
                Lotes Prontos para Gerar: {selectedPolygons.length} 
              </span>
              {manualPolygon.length > 0 && <span style={{ color: '#ffc107', marginLeft: '10px' }}>| Traçando manual: {manualPolygon.length} pontos</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => { setSelectedPolygons([]); setManualPolygon([]); }}
                style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                disabled={selectedPolygons.length === 0 && manualPolygon.length === 0}
              >
                Limpar Seleção
              </button>
              <button 
                onClick={() => onPolygonConfirmed && onPolygonConfirmed(selectedPolygons)}
                style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={selectedPolygons.length === 0}
              >
                Gerar Memoriais
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <button 
            onClick={handleCenterDrawing}
            style={{ padding: '5px 12px', cursor: 'pointer', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
            title="Centralizar desenho no canvas"
          >
            🎯 Centralizar
          </button>
          <button 
            onClick={() => setZoom(prev => Math.min(50, prev * 1.2))}
            style={{ padding: '5px 10px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            title="Aumentar zoom"
          >
            🔍+
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
            style={{ padding: '5px 10px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            title="Diminuir zoom"
          >
            🔍-
          </button>
          <button 
            onClick={handleResetView}
            style={{ padding: '5px 10px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
            title="Resetar pan e zoom"
          >
            🔄 Resetar
          </button>
          <span style={{ padding: '5px 10px', background: '#e9ecef', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
            Zoom: {zoom.toFixed(2)}x
          </span>
          <span style={{ padding: '5px 10px', background: '#fff3cd', borderRadius: '4px', fontSize: '11px' }}>
            💡 Desenho ajustado automaticamente ao canvas
          </span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: '2000px' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          style={{
            width: '100%',
            height: '2000px',
            border: '1px solid #dee2e6',
            display: 'block',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        />
      </div>
    </div>
  );
};

export default ViewerDXF;
