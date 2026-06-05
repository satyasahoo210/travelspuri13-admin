'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { Tables } from '@/database.types';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface Property {
  id: string;
  name: string;
  address: string;
  timezone: string;
  tenantId: string;
  taxPercentage: number | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  settings: string | null;
  photos: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

interface GetPropertiesData {
  properties: Property[];
}

const GET_PROPERTIES: TypedDocumentNode<GetPropertiesData> = gql`
  query GetProperties {
    properties {
      id
      name
      address
      timezone
      tenantId
      taxPercentage
      logoUrl
      phone
      email
      checkInTime
      checkOutTime
      settings
      photos
      createdAt
      updatedAt
    }
  }
`;

interface PropertyContextType {
  currentProperty: Property | null;
  properties: Property[];
  setProperty: (id: string) => void;
  loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const client = useApolloClient();
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user?.tenantId) {
        setProperties([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data } = await client.query({
          query: GET_PROPERTIES,
        });

        if (data && data.properties) {
          const formattedData = data.properties.map((p: any) => ({
            ...p,
            settings: p.settings ? JSON.parse(p.settings) : null,
          }));

          setProperties(formattedData);

          // Restore selected property or default to first
          const savedId = localStorage.getItem('pms_property_id');
          const property = formattedData.find((p: any) => p.id === savedId) || formattedData[0];

          if (property) {
            setCurrentProperty(property);
            localStorage.setItem('pms_property_id', property.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch properties via GraphQL:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user, client]);

  const setProperty = (id: string) => {
    const property = properties.find(p => p.id === id);
    if (property) {
      setCurrentProperty(property);
      localStorage.setItem('pms_property_id', property.id);
      // Optional: window.location.reload() to reset all entity-specific data
    }
  };

  return (
    <PropertyContext.Provider value={{ currentProperty, properties, setProperty, loading }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};
