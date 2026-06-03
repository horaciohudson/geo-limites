import React, { useRef, useEffect, useState } from 'react';
import api from '@/services/api';
import { parseDXF } from '@/utils/dxfParser';
import type { DXFData, DXFEntity } from '@/utils/dxfParser';

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
}

const ViewerDXF: React.FC<ViewerDXFProps> = ({ fileId, data, className, onDXFDataLoaded }) => {
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

    // Calcular bounds - IGNORANDO coordenadas próximas de (0,0) que podem ser inválidas
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validEntities = 0;
    const MIN_COORD_THRESHOLD = 10; // Ignorar coordenadas menores que 10 (provavelmente inválidas)

    dxfData.entities.forEach((entity: DXFEntity) => {
      const props = entity.properties as DXFEntityProperties;

      switch (entity.type) {
        case 'LINE':
          if (props.x1 !== undefined && props.y1 !== undefined) {
            // Ignorar pontos muito próximos da origem (0,0)
            if (Math.abs(props.x1) > MIN_COORD_THRESHOLD || Math.abs(props.y1) > MIN_COORD_THRESHOLD) {
              minX = Math.min(minX, props.x1);
              minY = Math.min(minY, props.y1);
              maxX = Math.max(maxX, props.x1);
              maxY = Math.max(maxY, props.y1);
              validEntities++;
            }
          }
          if (props.x2 !== undefined && props.y2 !== undefined) {
            if (Math.abs(props.x2) > MIN_COORD_THRESHOLD || Math.abs(props.y2) > MIN_COORD_THRESHOLD) {
              minX = Math.min(minX, props.x2);
              minY = Math.min(minY, props.y2);
              maxX = Math.max(maxX, props.x2);
              maxY = Math.max(maxY, props.y2);
            }
          }
          break;
        case 'TEXT':
        case 'MTEXT':
          if (props.x !== undefined && props.y !== undefined) {
            if (Math.abs(props.x) > MIN_COORD_THRESHOLD || Math.abs(props.y) > MIN_COORD_THRESHOLD) {
              minX = Math.min(minX, props.x);
              minY = Math.min(minY, props.y);
              maxX = Math.max(maxX, props.x);
              maxY = Math.max(maxY, props.y);
              validEntities++;
            }
          }
          break;
        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (props.vertices) {
            props.vertices.forEach((v: DXFVertex) => {
              if (v.x !== undefined && v.y !== undefined) {
                if (Math.abs(v.x) > MIN_COORD_THRESHOLD || Math.abs(v.y) > MIN_COORD_THRESHOLD) {
                  minX = Math.min(minX, v.x);
                  minY = Math.min(minY, v.y);
                  maxX = Math.max(maxX, v.x);
                  maxY = Math.max(maxY, v.y);
                  validEntities++;
                }
              }
            });
          }
          break;
      }
    });

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
    const scale = baseScale * 10 * zoom; // Multiplicador de 10x aplicado

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

  }, [dxfData, pan, zoom]);

  // Handlers de mouse para Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
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
          <span>Arquivo: {fileId || 'Dados diretos'}</span>
          {dxfData && <span style={{ marginLeft: '20px' }}>Entidades: {dxfData.entities?.length || 0}</span>}
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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
          onMouseLeave={handleMouseUp}
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
