import React, { useState } from 'react';
import type { AsyncPropertyData } from '@/services/polling-memorial';

interface PropertySummary {
  property_id: string;
  registration_number: string;
  name: string;
  property_type: string;
  full_address: string;
  owner_name: string;
  owner_document: string;
  total_owners: number;
  total_documents: number;
  total_files: number;
  total_dxf_files: number;
  dxf_files_list: string;
  completeness_status: string;
  created_at: string;
  updated_at: string;
}

interface SelectedPropertyForMemorial extends AsyncPropertyData {
  id: string;
}

interface PropertySearchSimpleProps {
  onPropertySelect: (property: PropertySummary) => void;
}

const PropertySearchSimple: React.FC<PropertySearchSimpleProps> = ({ onPropertySelect }) => {
  const [error] = useState('');

  const testProperty: PropertySummary = {
    property_id: '9d06d614-eec7-4306-a77c-5a54ed69f1f9', // ID da propriedade real cadastrada - será substituído por seleção dinâmica
    registration_number: 'TEST-001',
    name: 'Propriedade Teste',
    property_type: 'URBAN',
    full_address: 'Rua Maria Ivani da Silva, 123 - Gameleira, Horizonte - CE',
    owner_name: 'João da Silva',
    owner_document: '123.456.789-00',
    total_owners: 1,
    total_documents: 0,
    total_files: 0,
    total_dxf_files: 1,
    dxf_files_list: 'teste.dxf',
    completeness_status: 'COMPLETO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const handleSelectTest = () => {
    // Salvar no localStorage
    const propertyForMemorial: SelectedPropertyForMemorial = {
      id: testProperty.property_id,
      registrationNumber: testProperty.registration_number,
      name: testProperty.name,
      street: 'Rua Maria Ivani da Silva',
      neighborhood: 'Gameleira',
      city: 'Horizonte',
      state: 'CE',
      ownerName: testProperty.owner_name,
      ownerDocument: testProperty.owner_document,
      propertyType: testProperty.property_type
    };
    
    localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(propertyForMemorial));
    
    onPropertySelect(testProperty);
    alert('✅ Propriedade teste selecionada! Agora você pode gerar o memorial.');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 Pesquisar Propriedades</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Versão simplificada para teste. Selecione a propriedade exemplo abaixo.
      </p>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '15px', 
        marginBottom: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>📋 Propriedade Exemplo</h3>
        <p><strong>Registro:</strong> {testProperty.registration_number}</p>
        <p><strong>Nome:</strong> {testProperty.name}</p>
        <p><strong>Endereço:</strong> {testProperty.full_address}</p>
        <p><strong>Proprietário:</strong> {testProperty.owner_name} ({testProperty.owner_document})</p>
        <p><strong>Status:</strong> <span style={{ color: '#28a745' }}>{testProperty.completeness_status}</span></p>
        
        <button
          onClick={handleSelectTest}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          ✅ Selecionar Propriedade Teste
        </button>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        border: '1px solid #2196f3'
      }}>
        <h4>ℹ️ Como usar:</h4>
        <ol>
          <li>Clique em "Selecionar Propriedade Teste" acima</li>
          <li>Vá para a página "Memorial Descritivo"</li>
          <li>Gere o memorial - deve usar os dados reais da propriedade</li>
          <li>Em vez de [RUA], [BAIRRO] deve aparecer "Rua Maria Ivani da Silva", "Gameleira"</li>
        </ol>
      </div>

      {error && (
        <div style={{ color: '#dc3545', marginTop: '10px' }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default PropertySearchSimple;
