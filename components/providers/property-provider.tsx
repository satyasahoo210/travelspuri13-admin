'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface Property {
  id: string;
  name: string;
}

interface PropertyContextType {
  currentProperty: Property | null;
  properties: Property[];
  setProperty: (id: string) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

const MOCK_PROPERTIES = [
  { id: 'p1', name: 'Seaside Resort' },
  { id: 'p2', name: 'Downtown Boutique' },
  { id: 'p3', name: 'Mountain Lodge' },
];

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('pms_property_id');
    const property = MOCK_PROPERTIES.find(p => p.id === savedId) || MOCK_PROPERTIES[0];
    setCurrentProperty(property);
    localStorage.setItem('pms_property_id', property.id);
  }, []);

  const setProperty = (id: string) => {
    const property = MOCK_PROPERTIES.find(p => p.id === id);
    if (property) {
      setCurrentProperty(property);
      localStorage.setItem('pms_property_id', property.id);
      // Optional: window.location.reload() to reset all queries/sync
    }
  };

  return (
    <PropertyContext.Provider value={{ currentProperty, properties: MOCK_PROPERTIES, setProperty }}>
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
