import React from 'react';
import type { PropertyFormData } from '@/types/property';

interface PropertyBasicDataProps {
  data: PropertyFormData['basicData'];
  landmarks: PropertyFormData['landmarks'];
  validation: Record<string, string>;
  onChange: (data: PropertyFormData['basicData']) => void;
  onLandmarksChange: (landmarks: PropertyFormData['landmarks']) => void;
}

const PropertyBasicData: React.FC<PropertyBasicDataProps> = ({ data, landmarks, validation, onChange, onLandmarksChange }) => {
  type BasicData = PropertyFormData['basicData'];
  type AddressValue =
    | string
    | NonNullable<BasicData['address']['coordinates']>
    | NonNullable<BasicData['address']['sirgas']>;
  type BasicValue = string | AddressValue;

  const handleChange = (field: string, value: BasicValue) => {
    if (field.startsWith('address.')) {
      const child = field.replace('address.', '');
      onChange({
        ...data,
        address: {
          ...data.address,
          [child]: value
        }
      });
    } else {
      onChange({
        ...data,
        [field]: value
      });
    }
  };

  const updateLandmark = (index: number, field: keyof PropertyFormData['landmarks'][number], value: string | number | undefined) => {
    const nextLandmarks = landmarks.map((landmark, currentIndex) =>
      currentIndex === index
        ? { ...landmark, [field]: value }
        : landmark
    );
    onLandmarksChange(nextLandmarks);
  };

  const addLandmark = () => {
    onLandmarksChange([
      ...landmarks,
      {
        name: '',
        type: 'REFERENCE_POINT',
        coordinateX: undefined,
        coordinateY: undefined,
        coordinateZ: undefined,
        sequenceOrder: landmarks.length + 1,
        description: ''
      }
    ]);
  };

  const removeLandmark = (index: number) => {
    const nextLandmarks = landmarks
      .filter((_, currentIndex) => currentIndex !== index)
      .map((landmark, currentIndex) => ({
        ...landmark,
        sequenceOrder: currentIndex + 1
      }));
    onLandmarksChange(nextLandmarks);
  };

  return (
    <div className="property-basic-data">
      <div className="form-section">
        <h2>📍 Dados Basicos do Imovel</h2>
        <p className="section-description">
          Preencha aqui a identificacao principal do imovel que sera usada nas proximas etapas da preparacao e da operacao.
        </p>
        
        <div className="form-grid">
          {/* Número de Registro */}
          <div className="form-group">
            <label htmlFor="registrationNumber">
              Número de Registro *
              <span className="field-hint">Matrícula, INCRA, etc.</span>
            </label>
            <input
              type="text"
              id="registrationNumber"
              value={data.registrationNumber}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
              className={validation.registrationNumber ? 'error' : ''}
              placeholder="Ex: 12345, INCRA-67890"
            />
            {validation.registrationNumber && (
              <span className="error-message">{validation.registrationNumber}</span>
            )}
          </div>

          {/* Tipo de Propriedade */}
          <div className="form-group">
            <label htmlFor="propertyType">
              Tipo de Propriedade *
            </label>
            <select
              id="propertyType"
              value={data.propertyType}
              onChange={(e) => handleChange('propertyType', e.target.value)}
            >
              <option value="URBAN">🏙️ Urbana</option>
              <option value="RURAL">🌾 Rural</option>
              <option value="MIXED">🏘️ Mista</option>
            </select>
          </div>

          {/* Uso do Solo */}
          <div className="form-group">
            <label htmlFor="landUse">
              Uso do Solo *
            </label>
            <select
              id="landUse"
              value={data.landUse}
              onChange={(e) => handleChange('landUse', e.target.value)}
            >
              <option value="RESIDENTIAL">🏠 Residencial</option>
              <option value="COMMERCIAL">🏢 Comercial</option>
              <option value="INDUSTRIAL">🏭 Industrial</option>
              <option value="AGRICULTURAL">🌾 Agrícola</option>
              <option value="MIXED">🏘️ Misto</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>📍 Endereco do Imovel</h3>
        
        <div className="form-grid">
          {/* Logradouro */}
          <div className="form-group full-width">
            <label htmlFor="street">
              Logradouro *
            </label>
            <input
              type="text"
              id="street"
              value={data.address.street}
              onChange={(e) => handleChange('address.street', e.target.value)}
              className={validation.street ? 'error' : ''}
              placeholder="Ex: Rua das Flores, Avenida Brasil"
            />
            {validation.street && (
              <span className="error-message">{validation.street}</span>
            )}
          </div>

          {/* Número */}
          <div className="form-group">
            <label htmlFor="number">
              Número
            </label>
            <input
              type="text"
              id="number"
              value={data.address.number || ''}
              onChange={(e) => handleChange('address.number', e.target.value)}
              placeholder="123"
            />
          </div>

          {/* Complemento */}
          <div className="form-group">
            <label htmlFor="complement">
              Complemento
            </label>
            <input
              type="text"
              id="complement"
              value={data.address.complement || ''}
              onChange={(e) => handleChange('address.complement', e.target.value)}
              placeholder="Apto 101, Bloco A"
            />
          </div>

          {/* Bairro */}
          <div className="form-group">
            <label htmlFor="neighborhood">
              Bairro *
            </label>
            <input
              type="text"
              id="neighborhood"
              value={data.address.neighborhood}
              onChange={(e) => handleChange('address.neighborhood', e.target.value)}
              className={validation.neighborhood ? 'error' : ''}
              placeholder="Centro, Jardim América"
            />
            {validation.neighborhood && (
              <span className="error-message">{validation.neighborhood}</span>
            )}
          </div>

          {/* Cidade */}
          <div className="form-group">
            <label htmlFor="city">
              Cidade *
            </label>
            <input
              type="text"
              id="city"
              value={data.address.city}
              onChange={(e) => handleChange('address.city', e.target.value)}
              className={validation.city ? 'error' : ''}
              placeholder="São Paulo, Rio de Janeiro"
            />
            {validation.city && (
              <span className="error-message">{validation.city}</span>
            )}
          </div>

          {/* Estado */}
          <div className="form-group">
            <label htmlFor="state">
              Estado *
            </label>
            <select
              id="state"
              value={data.address.state}
              onChange={(e) => handleChange('address.state', e.target.value)}
              className={validation.state ? 'error' : ''}
            >
              <option value="">Selecione...</option>
              <option value="AC">Acre</option>
              <option value="AL">Alagoas</option>
              <option value="AP">Amapá</option>
              <option value="AM">Amazonas</option>
              <option value="BA">Bahia</option>
              <option value="CE">Ceará</option>
              <option value="DF">Distrito Federal</option>
              <option value="ES">Espírito Santo</option>
              <option value="GO">Goiás</option>
              <option value="MA">Maranhão</option>
              <option value="MT">Mato Grosso</option>
              <option value="MS">Mato Grosso do Sul</option>
              <option value="MG">Minas Gerais</option>
              <option value="PA">Pará</option>
              <option value="PB">Paraíba</option>
              <option value="PR">Paraná</option>
              <option value="PE">Pernambuco</option>
              <option value="PI">Piauí</option>
              <option value="RJ">Rio de Janeiro</option>
              <option value="RN">Rio Grande do Norte</option>
              <option value="RS">Rio Grande do Sul</option>
              <option value="RO">Rondônia</option>
              <option value="RR">Roraima</option>
              <option value="SC">Santa Catarina</option>
              <option value="SP">São Paulo</option>
              <option value="SE">Sergipe</option>
              <option value="TO">Tocantins</option>
            </select>
            {validation.state && (
              <span className="error-message">{validation.state}</span>
            )}
          </div>

          {/* CEP */}
          <div className="form-group">
            <label htmlFor="zipCode">
              CEP
            </label>
            <input
              type="text"
              id="zipCode"
              value={data.address.zipCode}
              onChange={(e) => {
                // Formatar CEP automaticamente
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 5) {
                  value = value.replace(/(\d{5})(\d)/, '$1-$2');
                }
                handleChange('address.zipCode', value);
              }}
              placeholder="12345-678"
              maxLength={9}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>🎯 Origem das Coordenadas (Opcional)</h3>
        <p className="section-description">
          Informe apenas a origem dos pontos cadastrados quando quiser registrar como essas coordenadas foram obtidas.
        </p>

        <div style={{ maxWidth: '420px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="sirgas_source">
              Fonte da Coordenada
              <span className="field-hint">Como foi obtida</span>
            </label>
            <select
              id="sirgas_source"
              style={{ minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
              value={data.address.sirgas?.source || ''}
              onChange={(e) => {
                const sirgas = data.address.sirgas || { e: 0, n: 0, source: '', zone: '24S', datum: 'SIRGAS 2000' };
                const newSirgas = {
                  ...sirgas,
                  source: e.target.value
                };
                handleChange('address.sirgas', newSirgas);
              }}
            >
              <option value="">Selecione a fonte...</option>
              <option value="GPS_CAMPO">📡 GPS de Campo</option>
              <option value="MARCO_GEODESICO">🎯 Marco Geodésico</option>
              <option value="LEVANTAMENTO_TOPOGRAFICO">📐 Levantamento Topográfico</option>
              <option value="MEMORIAL_ORIGINAL">📄 Memorial Original</option>
              <option value="GOOGLE_EARTH">🌍 Google Earth</option>
              <option value="IBGE_COORDENADAS">🏛️ Base IBGE</option>
              <option value="OUTRO">❓ Outro</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>🎯 Pontos ou Estacas de Referencia</h3>
          <button
            type="button"
            onClick={addLandmark}
            style={{
              border: '1px solid #4f46e5',
              background: 'white',
              color: '#4f46e5',
              borderRadius: '8px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            + Adicionar Ponto ou Estaca
          </button>
        </div>
        <p className="section-description">
          Informe o nome exatamente como aparece no desenho, como `P1`, `V01` ou `ESTACA 10`, junto com a coordenada real correspondente.
          O georreferenciamento do DXF exige no minimo 2 pontos validos, e aceita mais de 2 para melhorar a confianca do alinhamento.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '940px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Ponto ou Estaca</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Tipo</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Coordenada E/X</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Coordenada N/Y</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Cota Z</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Observacao</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', width: '90px' }}>Acao</th>
                </tr>
              </thead>
              <tbody>
                {landmarks.map((landmark, index) => (
                  <tr key={landmark.id || `landmark-${index}`} style={{ background: index % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="text"
                        id={`landmark_name_${index}`}
                        value={landmark.name}
                        onChange={(e) => updateLandmark(index, 'name', e.target.value)}
                        placeholder="Ex: P1, V01, ESTACA 12"
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                      <select
                        id={`landmark_type_${index}`}
                        value={landmark.type}
                        onChange={(e) => updateLandmark(index, 'type', e.target.value as PropertyFormData['landmarks'][number]['type'])}
                      >
                        <option value="REFERENCE_POINT">Ponto de Referencia</option>
                        <option value="VERTEX">Vertice</option>
                        <option value="ESTACA">Estaca</option>
                        <option value="LANDMARK">Marco</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="number"
                        id={`landmark_x_${index}`}
                        step="0.01"
                        value={landmark.coordinateX ?? ''}
                        onChange={(e) => updateLandmark(index, 'coordinateX', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        placeholder="556478.64"
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="number"
                        id={`landmark_y_${index}`}
                        step="0.01"
                        value={landmark.coordinateY ?? ''}
                        onChange={(e) => updateLandmark(index, 'coordinateY', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        placeholder="9544347.43"
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="number"
                        id={`landmark_z_${index}`}
                        step="0.01"
                        value={landmark.coordinateZ ?? ''}
                        onChange={(e) => updateLandmark(index, 'coordinateZ', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        placeholder="Opcional"
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="text"
                        id={`landmark_description_${index}`}
                        value={landmark.description || ''}
                        onChange={(e) => updateLandmark(index, 'description', e.target.value)}
                        placeholder="Observacao"
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeLandmark(index)}
                        disabled={landmarks.length <= 1}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: landmarks.length <= 1 ? '#94a3b8' : '#dc2626',
                          cursor: landmarks.length <= 1 ? 'not-allowed' : 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ color: '#64748b', fontSize: '14px' }}>
            Dica: use os nomes exatamente como aparecem no desenho. O sistema exige no minimo 2 pontos para georreferenciar e aproveita todos os pontos validos cadastrados.
          </div>

        </div>
      </div>
    </div>
  );
};

export default PropertyBasicData;
