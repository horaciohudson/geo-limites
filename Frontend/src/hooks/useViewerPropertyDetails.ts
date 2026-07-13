import { useEffect, useState } from 'react';
import api from '@/services/api';
import { getFallbackPropertyId } from '@/utils/memorialDocument';

interface ViewerPropertyIdentity {
  id?: string;
  propertyId?: string;
}

interface UseViewerPropertyDetailsParams<TProperty extends ViewerPropertyIdentity> {
  activePropertyId?: string | null;
  selectedProperty: TProperty | null;
}

export const useViewerPropertyDetails = <TProperty extends ViewerPropertyIdentity>({
  activePropertyId,
  selectedProperty
}: UseViewerPropertyDetailsParams<TProperty>) => {
  const [propertyDetails, setPropertyDetails] = useState<TProperty | null>(null);

  useEffect(() => {
    const currentProperty = selectedProperty;
    const propertyId = activePropertyId || currentProperty?.propertyId || currentProperty?.id || getFallbackPropertyId();

    if (!propertyId) {
      setPropertyDetails(currentProperty);
      return;
    }

    let isMounted = true;

    const loadPropertyDetails = async () => {
      try {
        const response = await api.get(`/properties/${propertyId}/details`);
        if (isMounted) {
          setPropertyDetails(response.data as TProperty);
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade para georreferenciamento:', error);
        if (isMounted) {
          setPropertyDetails(currentProperty);
        }
      }
    };

    void loadPropertyDetails();

    return () => {
      isMounted = false;
    };
  }, [activePropertyId, selectedProperty]);

  return {
    propertyDetails
  };
};
