'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import { LatLng, LeafletMouseEvent } from 'leaflet';
import { Button, Card, Input, Select, App } from 'antd';
import useDashboardStore from '../store/dashboardStore';
import { WeatherService } from '../services/weatherService';
import type { Polygon as PolygonType, ColorRule } from '../store/dashboardStore';

const { Option } = Select;

import L from 'leaflet';

let DefaultIcon = L.divIcon({
  html: `<svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 0C5.59644 0 0 5.59644 0 12.5C0 19.4036 5.59644 25 12.5 25C19.4036 25 25 19.4036 25 12.5C25 5.59644 19.4036 0 12.5 0Z" fill="#3388ff"/>
  </svg>`,
  className: 'custom-div-icon',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface DrawingHandlerProps {
  onPolygonComplete: (coordinates: [number, number][]) => void;
}

const DrawingHandler: React.FC<DrawingHandlerProps> = ({ onPolygonComplete }) => {
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const { isDrawing, setIsDrawing } = useDashboardStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (!isDrawing) return;
      
      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      const updatedPoints = [...drawingPoints, newPoint];
      
      setDrawingPoints(updatedPoints);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (updatedPoints.length >= 3 && updatedPoints.length <= 12) {
        timeoutRef.current = setTimeout(() => {
          if (updatedPoints.length >= 3) {
            onPolygonComplete(updatedPoints);
            setDrawingPoints([]);
            setIsDrawing(false);
          }
        }, 1500); 
      }
      
      if (updatedPoints.length >= 12) {
        onPolygonComplete(updatedPoints);
        setDrawingPoints([]);
        setIsDrawing(false);
      }
    },
    
    dblclick(e: LeafletMouseEvent) {
      e.originalEvent?.preventDefault();
      if (isDrawing && drawingPoints.length >= 3) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        onPolygonComplete(drawingPoints);
        setDrawingPoints([]);
        setIsDrawing(false);
      }
    }
  });
  

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return drawingPoints.length > 0 ? (
    <Polygon
      positions={drawingPoints}
      pathOptions={{
        color: '#ff0000',
        weight: 2,
        fillOpacity: 0.2,
        dashArray: '5, 5'
      }}
    />
  ) : null;
};

interface WeatherData {
  hourly?: {
    temperature_2m?: number[];
  };
}

const MapComponent: React.FC = () => {
  const { message } = App.useApp();
  
  const {
    mapCenter,
    mapZoom,
    polygons,
    isDrawing,
    setIsDrawing,
    addPolygon,
    setSelectedPolygon,
    selectedPolygon,
    timeRange,
    updateWeatherData,
    weatherData,
    setIsLoading,
    updatePolygonColor
  } = useDashboardStore();
  
  const [newPolygonName, setNewPolygonName] = useState('');
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<[number, number][] | null>(null);
  
  const handlePolygonComplete = useCallback((coordinates: [number, number][]) => {
    if (coordinates.length < 3 || coordinates.length > 12) {
      message.error('Polygon must have between 3 and 12 points');
      return;
    }
    
    setPendingPolygon(coordinates);
    setShowNamingModal(true);
  }, [message]);
  
  const fetchWeatherDataForPolygon = useCallback(async (polygon: PolygonType) => {
    try {
      setIsLoading(true);
      const { start, end } = WeatherService.getDateRange();
      const data = await WeatherService.getWeatherData(
        polygon.centroid[0],
        polygon.centroid[1],
        start,
        end
      );
      
      updateWeatherData(polygon.id, data);
      
      updatePolygonColorFromData(polygon.id, data);
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
      message.error('Failed to fetch weather data for polygon');
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, updateWeatherData, message]);
  
  const updatePolygonColorFromData = useCallback((polygonId: string, data: WeatherData) => {
    if (!data.hourly || !data.hourly.temperature_2m) return;
    
    const startIndex = timeRange[0];
    const endIndex = Math.min(timeRange[1], data.hourly.temperature_2m.length - 1);
    
    const temps = data.hourly.temperature_2m.slice(startIndex, endIndex + 1);
    const avgTemp = temps.reduce((sum: number, temp: number) => sum + temp, 0) / temps.length;
    
    updatePolygonColor(polygonId, avgTemp);
  }, [timeRange, updatePolygonColor]);
  
  const createPolygon = useCallback(async () => {
    if (!pendingPolygon || !newPolygonName.trim()) {
      message.error('Please enter a name for the polygon');
      return;
    }
    
    const id = `polygon_${Date.now()}`;
    const centroid = WeatherService.calculateCentroid(pendingPolygon);
    const boundingBox = WeatherService.calculateBoundingBox(pendingPolygon);
    
    const defaultColorRules: ColorRule[] = [
      { id: 'rule1', operator: '<', value: 10, color: '#0066cc' }, // Blue for cold
      { id: 'rule2', operator: '>=', value: 10, color: '#00cc66' }, // Green for moderate
      { id: 'rule3', operator: '>=', value: 25, color: '#cc6600' }, // Orange for warm
      { id: 'rule4', operator: '>=', value: 35, color: '#cc0000' }, // Red for hot
    ];
    
    const newPolygon: PolygonType = {
      id,
      name: newPolygonName.trim(),
      coordinates: pendingPolygon,
      dataSource: 'open-meteo',
      field: 'temperature_2m',
      colorRules: defaultColorRules,
      currentColor: '#808080',
      centroid,
      boundingBox
    };
    
    addPolygon(newPolygon);
    
    await fetchWeatherDataForPolygon(newPolygon);
    
    setNewPolygonName('');
    setShowNamingModal(false);
    setPendingPolygon(null);
    setIsDrawing(false);
    
    message.success(`Polygon "${newPolygon.name}" created successfully`);
  }, [pendingPolygon, newPolygonName, addPolygon, setIsDrawing, message, fetchWeatherDataForPolygon]);
  
  const handleCancelNaming = useCallback(() => {
    setShowNamingModal(false);
    setPendingPolygon(null);
    setNewPolygonName('');
    setIsDrawing(false);
  }, [setIsDrawing]);
  
  useEffect(() => {
    Object.keys(weatherData).forEach(polygonId => {
      const data = weatherData[polygonId];
      if (data && data.hourly && data.hourly.temperature_2m) {
        updatePolygonColorFromData(polygonId, data);
      }
    });
  }, [timeRange, updatePolygonColorFromData, weatherData]); 
  
  return (
    <div className="h-full flex flex-col">
      {/* Map Controls */}
      <Card className="mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            type={isDrawing ? "default" : "primary"}
            onClick={() => setIsDrawing(!isDrawing)}
            disabled={isDrawing}
          >
            {isDrawing ? 'Drawing Mode Active...' : 'Draw Polygon'}
          </Button>
          
          {isDrawing && (
            <span className="text-sm text-gray-600">
              Click on map to add points. Double-click to complete.
            </span>
          )}
          
          <div className="ml-auto">
            <span className="text-sm text-gray-600">
              Polygons: {polygons.length}
            </span>
          </div>
        </div>
      </Card>
      
      {/* Naming Modal */}
      {showNamingModal && (
        <Card className="mb-4 border-blue-200">
          <div className="flex gap-2 items-center">
            <span className="text-sm">Name your polygon:</span>
            <Input
              placeholder="Enter polygon name"
              value={newPolygonName}
              onChange={(e) => setNewPolygonName(e.target.value)}
              onPressEnter={createPolygon}
              className="flex-1 max-w-xs"
            />
            <Button type="primary" onClick={createPolygon}>
              Create
            </Button>
            <Button onClick={handleCancelNaming}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
      
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
          doubleClickZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <DrawingHandler onPolygonComplete={handlePolygonComplete} />
          
          {polygons.map((polygon) => (
            <Polygon
              key={polygon.id}
              positions={polygon.coordinates}
              pathOptions={{
                color: polygon.currentColor,
                weight: selectedPolygon === polygon.id ? 4 : 2,
                fillOpacity: 0.6,
                fillColor: polygon.currentColor
              }}
              eventHandlers={{
                click: () => setSelectedPolygon(polygon.id)
              }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;