import React from 'react';
import type { PropertyFormData } from '@/types/property';

interface PropertyBasicDataProps {
  data: PropertyFormData['basicData'];
  validation: Record<string, string>;
  onChange: (data: PropertyFormData['basicData']) => void;
}

const PropertyBasicData: React.FC<PropertyBasicDataProps> = ({ data, validation, onChange }) => {
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

  return (
    <div className="property-basic-data">
      <div className="form-section">
        <h2>📍 Informações Básicas da Propriedade</h2>
        
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
        <h3>📍 Endereço da Propriedade</h3>
        
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
        <h3>🌍 Coordenadas Geográficas (Opcional)</h3>
        <p className="section-description">
          Coordenadas geográficas para localização aproximada da propriedade.
        </p>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="latitude">
              Latitude
            </label>
            <input
              type="number"
              id="latitude"
              step="any"
              value={data.address.coordinates?.latitude || ''}
              onChange={(e) => {
                const coords = data.address.coordinates || { latitude: 0, longitude: 0 };
                handleChange('address.coordinates', {
                  ...coords,
                  latitude: parseFloat(e.target.value) || 0
                });
              }}
              placeholder="-23.5505"
            />
          </div>

          <div className="form-group">
            <label htmlFor="longitude">
              Longitude
            </label>
            <input
              type="number"
              id="longitude"
              step="any"
              value={data.address.coordinates?.longitude || ''}
              onChange={(e) => {
                const coords = data.address.coordinates || { latitude: 0, longitude: 0 };
                handleChange('address.coordinates', {
                  ...coords,
                  longitude: parseFloat(e.target.value) || 0
                });
              }}
              placeholder="-46.6333"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>🎯 Coordenadas SIRGAS 2000 (Para Memoriais Técnicos)</h3>
        <div className="sirgas-info-banner" style={{
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎯</span>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>Coordenadas SIRGAS 2000</span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Informe as coordenadas SIRGAS 2000 (UTM) para gerar memoriais com coordenadas reais ao invés de genéricas.
            <br />
            <strong>Exemplo:</strong> E 556478.64m N 9544347.43m (Ceará - Fuso 24S)
          </p>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="sirgas_e">
              Coordenada E (Leste) - metros
              <span className="field-hint">Ex: 556478.64</span>
            </label>
            <input
              type="number"
              id="sirgas_e"
              step="0.01"
              value={data.address.sirgas?.e || ''}
              onChange={(e) => {
                const sirgas = data.address.sirgas || { e: 0, n: 0, source: '', zone: '24S', datum: 'SIRGAS 2000' };
                const newSirgas = {
                  ...sirgas,
                  e: parseFloat(e.target.value) || 0
                };
                handleChange('address.sirgas', newSirgas);
              }}
              placeholder="556478.64"
              min="160000"
              max="850000"
            />
            <small className="field-help">
              Coordenada Leste (E) em metros - Faixa válida: 160.000 a 850.000m
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="sirgas_n">
              Coordenada N (Norte) - metros
              <span className="field-hint">Ex: 9544347.43</span>
            </label>
            <input
              type="number"
              id="sirgas_n"
              step="0.01"
              value={data.address.sirgas?.n || ''}
              onChange={(e) => {
                const sirgas = data.address.sirgas || { e: 0, n: 0, source: '', zone: '24S', datum: 'SIRGAS 2000' };
                const newSirgas = {
                  ...sirgas,
                  n: parseFloat(e.target.value) || 0
                };
                handleChange('address.sirgas', newSirgas);
              }}
              placeholder="9544347.43"
              min="750000"
              max="10500000"
            />
            <small className="field-help">
              Coordenada Norte (N) em metros - Faixa válida: 750.000 a 10.500.000m
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="sirgas_source">
              Fonte da Coordenada
              <span className="field-hint">Como foi obtida</span>
            </label>
            <select
              id="sirgas_source"
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

          <div className="form-group">
            <label htmlFor="sirgas_zone">
              Fuso UTM
              <span className="field-hint">Zona SIRGAS 2000</span>
            </label>
            <select
              id="sirgas_zone"
              value={data.address.sirgas?.zone || '24S'}
              onChange={(e) => {
                const sirgas = data.address.sirgas || { e: 0, n: 0, source: '', zone: '24S', datum: 'SIRGAS 2000' };
                const newSirgas = {
                  ...sirgas,
                  zone: e.target.value
                };
                handleChange('address.sirgas', newSirgas);
              }}
            >
              <option value="22S">22S (Acre, Amazonas Oeste)</option>
              <option value="23S">23S (Rondônia, Amazonas Centro)</option>
              <option value="24S">24S (Ceará, RN, PB, PE, AL, SE, BA Norte)</option>
              <option value="25S">25S (BA Sul, MG Norte, GO, DF, MT)</option>
            </select>
          </div>
        </div>

        {/* Validação em tempo real */}
        {data.address.sirgas?.e && data.address.sirgas?.n && (
          <div className="sirgas-validation" style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '6px',
            background: (data.address.sirgas.e >= 160000 && data.address.sirgas.e <= 850000 && 
                        data.address.sirgas.n >= 750000 && data.address.sirgas.n <= 10500000) 
              ? '#d4edda' : '#f8d7da',
            border: (data.address.sirgas.e >= 160000 && data.address.sirgas.e <= 850000 && 
                    data.address.sirgas.n >= 750000 && data.address.sirgas.n <= 10500000) 
              ? '1px solid #c3e6cb' : '1px solid #f5c6cb',
            color: (data.address.sirgas.e >= 160000 && data.address.sirgas.e <= 850000 && 
                   data.address.sirgas.n >= 750000 && data.address.sirgas.n <= 10500000) 
              ? '#155724' : '#721c24'
          }}>
            {(data.address.sirgas.e >= 160000 && data.address.sirgas.e <= 850000 && 
              data.address.sirgas.n >= 750000 && data.address.sirgas.n <= 10500000) ? (
              <>
                <strong>✅ Coordenadas SIRGAS válidas!</strong>
                <br />
                <small>
                  E {data.address.sirgas.e.toFixed(2)}m N {data.address.sirgas.n.toFixed(2)}m - {data.address.sirgas.zone || '24S'}
                  <br />
                  O sistema usará essas coordenadas reais nos memoriais ao invés de coordenadas genéricas.
                </small>
              </>
            ) : (
              <>
                <strong>⚠️ Coordenadas fora da faixa SIRGAS 2000</strong>
                <br />
                <small>
                  Verifique os valores: E deve estar entre 160.000-850.000m e N entre 750.000-10.500.000m
                </small>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyBasicData;
