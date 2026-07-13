import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ACTIVE_PROPERTY_CHANGED_EVENT,
  clearSelectedOperationProperty,
  getSelectedOperationProperty,
  setSelectedOperationProperty
} from '@/utils/operationContext';
import type { OperationPropertySelection } from '@/utils/operationContext';

interface OperationContextValue {
  selectedProperty: OperationPropertySelection | null;
  activePropertyId: string | null;
  activePropertyLabel: string;
  setSelectedProperty: <T extends OperationPropertySelection>(property: T) => void;
  clearSelectedProperty: () => void;
  refreshSelectedProperty: () => void;
}

const OperationContext = createContext<OperationContextValue | undefined>(undefined);

const readCurrentSelectedProperty = (): OperationPropertySelection | null =>
  getSelectedOperationProperty<OperationPropertySelection>();

export const OperationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProperty, setSelectedPropertyState] = useState<OperationPropertySelection | null>(() => readCurrentSelectedProperty());

  const refreshSelectedProperty = () => {
    setSelectedPropertyState(readCurrentSelectedProperty());
  };

  const handleSetSelectedProperty = <T extends OperationPropertySelection>(property: T) => {
    setSelectedOperationProperty(property);
    setSelectedPropertyState(property);
  };

  const handleClearSelectedProperty = () => {
    clearSelectedOperationProperty();
    setSelectedPropertyState(null);
  };

  useEffect(() => {
    const syncSelectedProperty = () => {
      refreshSelectedProperty();
    };

    window.addEventListener(ACTIVE_PROPERTY_CHANGED_EVENT, syncSelectedProperty);
    window.addEventListener('storage', syncSelectedProperty);

    return () => {
      window.removeEventListener(ACTIVE_PROPERTY_CHANGED_EVENT, syncSelectedProperty);
      window.removeEventListener('storage', syncSelectedProperty);
    };
  }, []);

  const value = useMemo<OperationContextValue>(() => ({
    selectedProperty,
    activePropertyId: selectedProperty?.propertyId || selectedProperty?.id || null,
    activePropertyLabel: selectedProperty?.registrationNumber || selectedProperty?.name || '',
    setSelectedProperty: handleSetSelectedProperty,
    clearSelectedProperty: handleClearSelectedProperty,
    refreshSelectedProperty
  }), [selectedProperty]);

  return (
    <OperationContext.Provider value={value}>
      {children}
    </OperationContext.Provider>
  );
};

export const useOperationContext = (): OperationContextValue => {
  const context = useContext(OperationContext);
  if (!context) {
    throw new Error('useOperationContext must be used within an OperationProvider');
  }

  return context;
};
