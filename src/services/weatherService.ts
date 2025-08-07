//src\services\weatherService.ts
import axios from 'axios';

export interface WeatherApiResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
    relative_humidity_2m?: string;
    precipitation?: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m?: number[];
    precipitation?: number[];
  };
}

export class WeatherService {
  private static readonly BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';
  private static readonly CURRENT_URL = 'https://api.open-meteo.com/v1/forecast';
  
  static async getWeatherData(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
    fields: string[] = ['temperature_2m']
  ): Promise<WeatherApiResponse> {
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const needsHistorical = start < now;
      const needsCurrent = end >= now;
      
      let historicalData: WeatherApiResponse | null = null;
      let currentData: WeatherApiResponse | null = null;
      
      if (needsHistorical) {
        const historicalEnd = end < now ? endDate : this.formatDate(now);
        historicalData = await this.getHistoricalData(
          latitude, 
          longitude, 
          startDate, 
          historicalEnd, 
          fields
        );
      }
      
      if (needsCurrent) {
        const currentStart = start > now ? startDate : this.formatDate(now);
        currentData = await this.getCurrentData(
          latitude, 
          longitude, 
          currentStart, 
          endDate, 
          fields
        );
      }
      
      if (historicalData && currentData) {
        return this.mergeWeatherData(historicalData, currentData);
      }
      
      return historicalData || currentData!;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('Failed to fetch weather data');
    }
  }
  
  private static async getHistoricalData(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
    fields: string[]
  ): Promise<WeatherApiResponse> {
    const response = await axios.get<WeatherApiResponse>(this.BASE_URL, {
      params: {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        start_date: startDate,
        end_date: endDate,
        hourly: fields.join(','),
        timezone: 'auto'
      }
    });
    
    return response.data;
  }
  
  private static async getCurrentData(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
    fields: string[]
  ): Promise<WeatherApiResponse> {
    const response = await axios.get<WeatherApiResponse>(this.CURRENT_URL, {
      params: {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        start_date: startDate,
        end_date: endDate,
        hourly: fields.join(','),
        timezone: 'auto'
      }
    });
    
    return response.data;
  }
  
  private static mergeWeatherData(
    historical: WeatherApiResponse,
    current: WeatherApiResponse
  ): WeatherApiResponse {
    const merged = { ...historical };
    
    merged.hourly = {
      time: [...historical.hourly.time, ...current.hourly.time],
      temperature_2m: [...historical.hourly.temperature_2m, ...current.hourly.temperature_2m]
    };
    
    if (historical.hourly.relative_humidity_2m && current.hourly.relative_humidity_2m) {
      merged.hourly.relative_humidity_2m = [
        ...historical.hourly.relative_humidity_2m,
        ...current.hourly.relative_humidity_2m
      ];
    }
    
    if (historical.hourly.precipitation && current.hourly.precipitation) {
      merged.hourly.precipitation = [
        ...historical.hourly.precipitation,
        ...current.hourly.precipitation
      ];
    }
    
    return merged;
  }
  
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  static getDateRange(centerDate: Date = new Date()): { start: string; end: string } {
    const start = new Date(centerDate);
    start.setDate(start.getDate() - 15);
    
    const end = new Date(centerDate);
    end.setDate(end.getDate() + 15);
    
    return {
      start: this.formatDate(start),
      end: this.formatDate(end)
    };
  }
  
  static calculateBoundingBox(coordinates: [number, number][]): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    let north = -90, south = 90, east = -180, west = 180;
    
    coordinates.forEach(([lat, lng]) => {
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    });
    
    return { north, south, east, west };
  }
  
  static calculateCentroid(coordinates: [number, number][]): [number, number] {
    const lat = coordinates.reduce((sum, [lat]) => sum + lat, 0) / coordinates.length;
    const lng = coordinates.reduce((sum, [, lng]) => sum + lng, 0) / coordinates.length;
    return [lat, lng];
  }
  
  static getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      'temperature_2m': 'Temperature (°C)',
      'relative_humidity_2m': 'Humidity (%)',
      'precipitation': 'Precipitation (mm)'
    };
    return labels[field] || field;
  }
  
  static getFieldUnit(field: string): string {
    const units: Record<string, string> = {
      'temperature_2m': '°C',
      'relative_humidity_2m': '%',
      'precipitation': 'mm'
    };
    return units[field] || '';
  }
  
  static calculateAverage(data: number[], startIndex: number, endIndex: number): number {
    const slice = data.slice(startIndex, endIndex + 1);
    return slice.reduce((sum, val) => sum + val, 0) / slice.length;
  }
  
  static formatValue(value: number, field: string): string {
    const unit = this.getFieldUnit(field);
    return `${value.toFixed(1)}${unit}`;
  }
}