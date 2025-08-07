//src\components\TimelineSlider.tsx
'use client';

import React, { useMemo, useCallback } from 'react';
import { Slider, Card } from 'antd';
import useDashboardStore from '../store/dashboardStore';

const TimelineSlider: React.FC = () => {
  const { timeRange, setTimeRange, currentDate } = useDashboardStore();
  
  const formatHour = useCallback((hour: number): string => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 15); 
    date.setHours(date.getHours() + hour);
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit'
    });
  }, [currentDate]);
  
  const getCurrentTimeLabel = useCallback((): string => {
    const startHour = timeRange[0];
    const endHour = timeRange[1];
    
    if (startHour === endHour) {
      return `${formatHour(startHour)}`;
    }
    
    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  }, [timeRange, formatHour]);
  
  // Memoize marks to prevent recreation on every render
  const marks: Record<number, React.ReactNode> = useMemo(() => ({
    0: formatHour(0),
    168: 'Week 1',
    336: 'Week 2',
    504: 'Week 3',
    672: 'Week 4',
    720: formatHour(720)
  }), [formatHour]);
  
  // Memoize onChange handler to prevent recreation
  const handleSliderChange = useCallback((values: number[]) => {
    setTimeRange([values[0], values[1]]);
  }, [setTimeRange]);
  
  // Memoize tooltip formatter
  const tooltipFormatter = useCallback((value: number | undefined) => {
    return formatHour(value || 0);
  }, [formatHour]);
  
  return (
    <Card className="mb-4">
      <div className="px-4 py-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Timeline Control</h3>
          <span className="text-sm text-gray-600">
            {getCurrentTimeLabel()}
          </span>
        </div>
        
        <div className="timeline-slider px-4">
          <Slider
            range
            min={0}
            max={720} // 30 days * 24 hours
            value={timeRange}
            onChange={handleSliderChange}
            marks={marks}
            step={1}
            tooltip={{
              formatter: tooltipFormatter
            }}
            className="mb-4"
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>15 days ago</span>
          <span>Current Time Range: {timeRange[1] - timeRange[0]} hours</span>
          <span>15 days ahead</span>
        </div>
      </div>
    </Card>
  );
};

export default TimelineSlider;