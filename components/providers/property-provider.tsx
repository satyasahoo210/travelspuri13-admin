'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/utils/supabase/client';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface Property {
  id: string;
  name: string;
}

interface PropertyContextType {
  currentProperty: Property | null;
  properties: Property[];
  setProperty: (id: string) => void;
  loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = createClient();
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
      const { data, error } = await supabase
        .from('Property')
        .select('id, name')
        .eq('tenantId', user.tenantId)
        .order('name');

      if (!error && data) {
        setProperties(data);
        
        // Restore selected property or default to first
        const savedId = localStorage.getItem('pms_property_id');
        const property = data.find(p => p.id === savedId) || data[0];
        
        if (property) {
          setCurrentProperty(property);
          localStorage.setItem('pms_property_id', property.id);
        }
      }
      setLoading(false);
    };

    fetchProperties();
  }, [user, supabase]);

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
