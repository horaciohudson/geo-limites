import React, { useState } from 'react';
import type { TechnicalData, PropertyVertex, Confrontation } from '@/types/property';

type TechnicalDataField = keyof TechnicalData;

interface PropertyTechnicalDataProps {
  data: TechnicalData;
  validation: Record<string, string>;
  onChange: (data: TechnicalData) => void;
}

const PropertyTechnicalData: React.FC<PropertyTechnicalDataProps> = ({ data, validation, onChange }) => {
  const [showVertexForm, setShowVertexForm] = useState(false);
  const [showConfrontationForm, setShowConfrontationForm] = useState(false);
  
  const [newVertex, setNewVertex] = useState<Omit<PropertyVertex, 'id'>>({
    name: '',
    x: 0,
    y: 0,
    description: ''
  });

  const [newConfrontation, setNewConfrontation] = useState<Omit<Confrontation, 'id'>>({
    direction: 'NORTH',
    description: '',
    distance: 0,
    startVertex: '',
    endVertex: ''
  });

  const handleChange = <K extends TechnicalDataField>(field: K, value: TechnicalData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addVertex = () => {
    if (newVertex.name && newVertex.x !== 0 && newVertex.y !== 0) {
      const vertex: PropertyVertex = {
        id: `vertex_${Date.now()}`,
        ...newVertex
      };
      
      onChange({
        ...data,
        vertices: [...data.vertices, vertex]
      });
      
      setNewVertex({ name: '', x: 0, y: 0, description: '' });
      setShowVertexForm(false);
    } else {
      alert('Preencha nome e coordenadas do vértice.');
    }
  };

  const removeVertex = (index: number) => {
    const updatedVertices = data.vertices.filter((_, i) => i !== index);
    onChange({ ...data, vertices: updatedVertices });
  };

  const addConfrontation = () => {
    if (newConfrontation.description && newConfrontation.distance > 0) {
      const confrontation: Confrontation = {
        id: `conf_${Date.now()}`,
        ...newConfrontation
      };
      
      onChange({
        ...data,
        confrontations: [...data.confrontations, confrontation]
      });
      
      setNewConfrontation({
        direction: 'NORTH',
        description: '',
        distance: 0,
        startVertex: '',
        endVertex: ''
      });
      setShowConfrontationForm(false);
    } else {
      alert('Preencha descrição e distância da confrontação.');
    }
  };

  const removeConfrontation = (index: number) => {
    const updatedConfrontations = data.confrontations.filter((_, i) => i !== index);
    onChange({ ...data, confrontations: updatedConfrontations });
  };

  const directionLabels = {
    'NORTH': '🧭 Norte',
    'SOUTH': '🧭 Sul',
    'EAST': '🧭 Leste',
    'WEST': '🧭 Oeste',
    'NORTHEAST': '🧭 Nordeste',
    'NORTHWEST': '🧭 Noroeste',
    'SOUTHEAST': '🧭 Sudeste',
    'SOUTHWEST': '🧭 Sudoeste',
    'NORTH_NORTHEAST': '🧭 Norte-Nordeste',
    'EAST_NORTHEAST': '🧭 Leste-Nordeste',
    'EAST_SOUTHEAST': '🧭 Leste-Sudeste',
    'SOUTH_SOUTHEAST': '🧭 Sul-Sudeste',
    'SOUTH_SOUTHWEST': '🧭 Sul-Sudoeste',
    'WEST_SOUTHWEST': '🧭 Oeste-Sudoeste',
    'WEST_NORTHWEST': '🧭 Oeste-Noroeste',
    'NORTH_NORTHWEST': '🧭 Norte-Noroeste'
  };

  const generateVertexName = () => {
    const count = data.vertices.length + 1;
    return `P${count.toString().padStart(2, '0')}`;
  };

  return (
    <div className="property-technical-data">
      <div className="section-header">
        <h2>📐 Dados Técnicos da Propriedade</h2>
        <p className="section-description">
          Informações técnicas como área, perímetro, vértices e confrontações.
        </p>
      </div>

      {/* Dados Gerais */}
      <div className="form-section">
        <h3>📊 Medidas Gerais</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="totalArea">
              Área Total (m²) *
            </label>
            <input
              type="number"
              id="totalArea"
              step="0.01"
              min="0"
              value={data.totalArea}
              onChange={(e) => handleChange('totalArea', parseFloat(e.target.value) || 0)}
              className={validation.totalArea ? 'error' : ''}
              placeholder="1000.00"
            />
            {validation.totalArea && (
              <span className="error-message">{validation.totalArea}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="builtArea">
              Área Construída (m²)
            </label>
            <input
              type="number"
              id="builtArea"
              step="0.01"
              min="0"
              value={data.builtArea || ''}
              onChange={(e) => handleChange('builtArea', parseFloat(e.target.value) || undefined)}
              placeholder="200.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="perimeter">
              Perímetro (m) *
            </label>
            <input
              type="number"
              id="perimeter"
              step="0.01"
              min="0"
              value={data.perimeter}
              onChange={(e) => handleChange('perimeter', parseFloat(e.target.value) || 0)}
              placeholder="120.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="datum">
              Sistema de Coordenadas *
            </label>
            <select
              id="datum"
              value={data.datum}
              onChange={(e) => handleChange('datum', e.target.value)}
            >
              <option value="SIRGAS 2000">SIRGAS 2000</option>
              <option value="SAD 69">SAD 69</option>
              <option value="WGS 84">WGS 84</option>
              <option value="Córrego Alegre">Córrego Alegre</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="zone">
              Fuso UTM
            </label>
            <input
              type="text"
              id="zone"
              value={data.zone || ''}
              onChange={(e) => handleChange('zone', e.target.value)}
              placeholder="Ex: 23S, 24M"
            />
          </div>
        </div>
      </div>

      {/* Vértices */}
      <div className="form-section">
        <div className="section-header">
          <h3>📍 Vértices da Propriedade</h3>
          <span className="vertex-count">
            {data.vertices.length} vértice(s) 
            {data.vertices.length >= 3 ? '✅' : '⚠️'}
          </span>
        </div>

        {validation.vertices && (
          <div className="error-message">{validation.vertices}</div>
        )}

        <div className="vertices-list">
          {data.vertices.map((vertex, index) => (
            <div key={vertex.id} className="vertex-card">
              <div className="vertex-info">
                <h4>📍 {vertex.name}</h4>
                <div className="coordinates">
                  <span>E: {vertex.x.toFixed(2)}m</span>
                  <span>N: {vertex.y.toFixed(2)}m</span>
                  {vertex.z && <span>Z: {vertex.z.toFixed(2)}m</span>}
                </div>
                {vertex.description && (
                  <p className="description">{vertex.description}</p>
                )}
              </div>
              <button 
                onClick={() => removeVertex(index)}
                className="btn-remove"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {showVertexForm ? (
          <div className="vertex-form">
            <h4>➕ Adicionar Vértice</h4>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Nome do Vértice *</label>
                <input
                  type="text"
                  value={newVertex.name}
                  onChange={(e) => setNewVertex(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={generateVertexName()}
                />
              </div>

              <div className="form-group">
                <label>Coordenada E (Este) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newVertex.x}
                  onChange={(e) => setNewVertex(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                  placeholder="556478.64"
                />
              </div>

              <div className="form-group">
                <label>Coordenada N (Norte) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newVertex.y}
                  onChange={(e) => setNewVertex(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                  placeholder="9544347.43"
                />
              </div>

              <div className="form-group">
                <label>Altitude (Z)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newVertex.z || ''}
                  onChange={(e) => setNewVertex(prev => ({ ...prev, z: parseFloat(e.target.value) || undefined }))}
                  placeholder="100.00"
                />
              </div>

              <div className="form-group full-width">
                <label>Descrição</label>
                <input
                  type="text"
                  value={newVertex.description || ''}
                  onChange={(e) => setNewVertex(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Marco de concreto, poste, etc."
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                onClick={() => setShowVertexForm(false)}
                className="btn-cancel"
              >
                Cancelar
              </button>
              <button 
                onClick={addVertex}
                className="btn-save"
              >
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => {
              setNewVertex(prev => ({ ...prev, name: generateVertexName() }));
              setShowVertexForm(true);
            }}
            className="btn-add-vertex"
          >
            ➕ Adicionar Vértice
          </button>
        )}
      </div>

      {/* Confrontações */}
      <div className="form-section">
        <div className="section-header">
          <h3>🧭 Confrontações</h3>
        </div>

        <div className="confrontations-list">
          {data.confrontations.map((conf, index) => (
            <div key={conf.id} className="confrontation-card">
              <div className="confrontation-info">
                <h4>{directionLabels[conf.direction]}</h4>
                <p><strong>Distância:</strong> {conf.distance}m</p>
                {conf.azimuth && <p><strong>Azimute:</strong> {conf.azimuth}°</p>}
                <p><strong>Descrição:</strong> {conf.description}</p>
                {conf.neighbor && <p><strong>Vizinho:</strong> {conf.neighbor}</p>}
              </div>
              <button 
                onClick={() => removeConfrontation(index)}
                className="btn-remove"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {showConfrontationForm ? (
          <div className="confrontation-form">
            <h4>➕ Adicionar Confrontação</h4>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Direção *</label>
                <select
                  value={newConfrontation.direction}
                  onChange={(e) => setNewConfrontation(prev => ({
                    ...prev,
                    direction: e.target.value as Confrontation['direction']
                  }))}
                >
                  <optgroup label="Pontos Cardiais">
                    <option value="NORTH">🧭 Norte</option>
                    <option value="SOUTH">🧭 Sul</option>
                    <option value="EAST">🧭 Leste</option>
                    <option value="WEST">🧭 Oeste</option>
                  </optgroup>
                  <optgroup label="Pontos Colaterais">
                    <option value="NORTHEAST">🧭 Nordeste</option>
                    <option value="NORTHWEST">🧭 Noroeste</option>
                    <option value="SOUTHEAST">🧭 Sudeste</option>
                    <option value="SOUTHWEST">🧭 Sudoeste</option>
                  </optgroup>
                  <optgroup label="Pontos Subcolaterais">
                    <option value="NORTH_NORTHEAST">🧭 Norte-Nordeste</option>
                    <option value="EAST_NORTHEAST">🧭 Leste-Nordeste</option>
                    <option value="EAST_SOUTHEAST">🧭 Leste-Sudeste</option>
                    <option value="SOUTH_SOUTHEAST">🧭 Sul-Sudeste</option>
                    <option value="SOUTH_SOUTHWEST">🧭 Sul-Sudoeste</option>
                    <option value="WEST_SOUTHWEST">🧭 Oeste-Sudoeste</option>
                    <option value="WEST_NORTHWEST">🧭 Oeste-Noroeste</option>
                    <option value="NORTH_NORTHWEST">🧭 Norte-Noroeste</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label>Distância (m) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newConfrontation.distance}
                  onChange={(e) => setNewConfrontation(prev => ({ ...prev, distance: parseFloat(e.target.value) || 0 }))}
                  placeholder="25.00"
                />
              </div>

              <div className="form-group">
                <label>Azimute (°)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="360"
                  value={newConfrontation.azimuth || ''}
                  onChange={(e) => setNewConfrontation(prev => ({ ...prev, azimuth: parseFloat(e.target.value) || undefined }))}
                  placeholder="45.00"
                />
                <small className="field-hint">Direção em graus (0° = Norte, 90° = Leste)</small>
              </div>

              <div className="form-group full-width">
                <label>Descrição *</label>
                <input
                  type="text"
                  value={newConfrontation.description}
                  onChange={(e) => setNewConfrontation(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: com a Rua das Flores, com o Lote 2"
                />
              </div>

              <div className="form-group">
                <label>Vértice Inicial</label>
                <select
                  value={newConfrontation.startVertex}
                  onChange={(e) => setNewConfrontation(prev => ({ ...prev, startVertex: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {data.vertices.map(vertex => (
                    <option key={vertex.id} value={vertex.id}>{vertex.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Vértice Final</label>
                <select
                  value={newConfrontation.endVertex}
                  onChange={(e) => setNewConfrontation(prev => ({ ...prev, endVertex: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {data.vertices.map(vertex => (
                    <option key={vertex.id} value={vertex.id}>{vertex.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Vizinho/Limitante</label>
                <input
                  type="text"
                  value={newConfrontation.neighbor || ''}
                  onChange={(e) => setNewConfrontation(prev => ({ ...prev, neighbor: e.target.value }))}
                  placeholder="Nome do vizinho ou via pública"
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                onClick={() => setShowConfrontationForm(false)}
                className="btn-cancel"
              >
                Cancelar
              </button>
              <button 
                onClick={addConfrontation}
                className="btn-save"
              >
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowConfrontationForm(true)}
            className="btn-add-confrontation"
          >
            ➕ Adicionar Confrontação
          </button>
        )}
      </div>
    </div>
  );
};

export default PropertyTechnicalData;
