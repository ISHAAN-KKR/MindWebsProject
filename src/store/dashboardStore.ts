//src\store\dashboardStore.ts
import { create } from 'zustand';

export interface ColorRule {
  id: string;
  operator: '<' | '>' | '<=' | '>=' | '=';
  value: number;
  color: string;
}

export interface Polygon {
  id: string;
  name: string;
  coordinates: [number, number][];
  dataSource: string;
  field: string;
  colorRules: ColorRule[];
  currentColor: string;
  centroid: [number, number];
  boundingBox: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
}

interface DashboardState {

  timeRange: [number, number];
  currentDate: Date;
  
  mapCenter: [number, number];
  mapZoom: number;
  
  polygons: Polygon[];
  isDrawing: boolean;
  selectedPolygon: string | null;
  
  weatherData: Record<string, WeatherData>;
  isLoading: boolean;
  
  sidebarCollapsed: boolean;
  
  setTimeRange: (range: [number, number]) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  addPolygon: (polygon: Polygon) => void;
  updatePolygon: (id: string, updates: Partial<Polygon>) => void;
  deletePolygon: (id: string) => void;
  setIsDrawing: (drawing: boolean) => void;
  setSelectedPolygon: (id: string | null) => void;
  updateWeatherData: (key: string, data: WeatherData) => void;
  setIsLoading: (loading: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updatePolygonColor: (id: string, value: number) => void;
}

const useDashboardStore = create<DashboardState>((set, get) => ({

  timeRange: [0, 24], 
  currentDate: new Date(),
  mapCenter: [22.5726, 88.3639], 
  mapZoom: 11,
  polygons: [],
  isDrawing: false,
  selectedPolygon: null,
  weatherData: {},
  isLoading: false,
  sidebarCollapsed: false,
  
  // Actions
  setTimeRange: (range) => set({ timeRange: range }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  
  addPolygon: (polygon) => set((state) => ({ 
    polygons: [...state.polygons, polygon] 
  })),
  
  updatePolygon: (id, updates) => set((state) => ({
    polygons: state.polygons.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  
  deletePolygon: (id) => set((state) => ({
    polygons: state.polygons.filter(p => p.id !== id),
    selectedPolygon: state.selectedPolygon === id ? null : state.selectedPolygon
  })),
  
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setSelectedPolygon: (id) => set({ selectedPolygon: id }),
  updateWeatherData: (key, data) => set((state) => ({
    weatherData: { ...state.weatherData, [key]: data }
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  updatePolygonColor: (id, value) => set((state) => {
    const polygon = state.polygons.find(p => p.id === id);
    if (!polygon) return state;
    
    let newColor = '#808080'; 
    for (const rule of polygon.colorRules) {
      let matches = false;
      switch (rule.operator) {
        case '<':
          matches = value < rule.value;
          break;
        case '>':
          matches = value > rule.value;
          break;
        case '<=':
          matches = value <= rule.value;
          break;
        case '>=':
          matches = value >= rule.value;
          break;
        case '=':
          matches = Math.abs(value - rule.value) < 0.1;
          break;
      }
      if (matches) {
        newColor = rule.color;
        break;
      }
    }
    
    return {
      polygons: state.polygons.map(p => 
        p.id === id ? { ...p, currentColor: newColor } : p
      )
    };
  })
}));

export default useDashboardStore;