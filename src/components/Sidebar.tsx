//src\components\Sidebar.tsx
'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Select, InputNumber, Space, Divider, Tag, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import useDashboardStore from '../store/dashboardStore';
import type { ColorRule } from '../store/dashboardStore';

const { Option } = Select;

const Sidebar: React.FC = () => {
  const {
    polygons,
    selectedPolygon,
    deletePolygon,
    updatePolygon,
    setSelectedPolygon
  } = useDashboardStore();
  
  const [editingRules, setEditingRules] = useState<Record<string, ColorRule[]>>({});
  
  const selectedPolygonData = polygons.find(p => p.id === selectedPolygon);
  
  const handleDeletePolygon = (id: string) => {
    deletePolygon(id);
    if (selectedPolygon === id) {
      setSelectedPolygon(null);
    }
  };
  
  const handleUpdateColorRules = (polygonId: string, rules: ColorRule[]) => {
    updatePolygon(polygonId, { colorRules: rules });
    const updatedRules = { ...editingRules };
    delete updatedRules[polygonId];
    setEditingRules(updatedRules);
  };
  
  const startEditingRules = (polygonId: string, currentRules: ColorRule[]) => {
    setEditingRules({
      ...editingRules,
      [polygonId]: [...currentRules]
    });
  };
  
  const updateEditingRule = (polygonId: string, ruleIndex: number, updates: Partial<ColorRule>) => {
    const rules = editingRules[polygonId] || [];
    const updatedRules = rules.map((rule, index) => 
      index === ruleIndex ? { ...rule, ...updates } : rule
    );
    setEditingRules({
      ...editingRules,
      [polygonId]: updatedRules
    });
  };
  
  const addNewRule = (polygonId: string) => {
    const rules = editingRules[polygonId] || [];
    const newRule: ColorRule = {
      id: `rule_${Date.now()}`,
      operator: '>=',
      value: 0,
      color: '#808080'
    };
    setEditingRules({
      ...editingRules,
      [polygonId]: [...rules, newRule]
    });
  };
  
  const removeRule = (polygonId: string, ruleIndex: number) => {
    const rules = editingRules[polygonId] || [];
    setEditingRules({
      ...editingRules,
      [polygonId]: rules.filter((_, index) => index !== ruleIndex)
    });
  };
  
  const getOperatorLabel = (operator: string) => {
    const labels: Record<string, string> = {
      '<': 'Less than',
      '>': 'Greater than',
      '<=': 'Less than or equal',
      '>=': 'Greater than or equal',
      '=': 'Equal to'
    };
    return labels[operator] || operator;
  };
  
  const getTemperatureDisplay = (temp: number) => {
    return `${temp.toFixed(1)}°C`;
  };
  
  return (
    <div className="sidebar w-80 p-4 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Dashboard Control</h2>
        
        {polygons.length === 0 ? (
          <Card>
            <div className="text-center text-gray-500 py-8">
              <p className="mb-2">No polygons created yet</p>
              <p className="text-sm">Click "Draw Polygon" to get started</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {polygons.map((polygon) => {
              const isEditing = editingRules[polygon.id];
              const rulesToShow = isEditing || polygon.colorRules;
              
              return (
                <Card
                  key={polygon.id}
                  className={`polygon-item ${selectedPolygon === polygon.id ? 'border-blue-400 shadow-md' : ''}`}
                  size="small"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 
                        className="font-medium text-base cursor-pointer hover:text-blue-600"
                        onClick={() => setSelectedPolygon(polygon.id)}
                      >
                        {polygon.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="color-indicator"
                          style={{ backgroundColor: polygon.currentColor }}
                        />
                        <span className="text-xs text-gray-500">
                          Current: {polygon.currentColor}
                        </span>
                      </div>
                    </div>
                    <Popconfirm
                      title="Delete this polygon?"
                      description="This action cannot be undone."
                      onConfirm={() => handleDeletePolygon(polygon.id)}
                      okText="Delete"
                      cancelText="Cancel"
                    >
                      <Button 
                        type="text" 
                        danger 
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-3">
                    <div>Data Source: {polygon.dataSource}</div>
                    <div>Field: {polygon.field}</div>
                    <div>Points: {polygon.coordinates.length}</div>
                  </div>
                  
                  <Divider className="my-3" />
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Color Rules</span>
                      {!isEditing ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => startEditingRules(polygon.id, polygon.colorRules)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Space size="small">
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleUpdateColorRules(polygon.id, isEditing)}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              const updatedRules = { ...editingRules };
                              delete updatedRules[polygon.id];
                              setEditingRules(updatedRules);
                            }}
                          >
                            Cancel
                          </Button>
                        </Space>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {rulesToShow.map((rule, ruleIndex) => (
                        <div key={rule.id || ruleIndex} className="color-rule">
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full">
                              <div
                                className="color-indicator cursor-pointer"
                                style={{ backgroundColor: rule.color }}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'color';
                                  input.value = rule.color;
                                  input.onchange = (e) => {
                                    updateEditingRule(polygon.id, ruleIndex, {
                                      color: (e.target as HTMLInputElement).value
                                    });
                                  };
                                  input.click();
                                }}
                              />
                              <Select
                                value={rule.operator}
                                size="small"
                                className="w-16"
                                onChange={(value) => updateEditingRule(polygon.id, ruleIndex, { operator: value })}
                              >
                                <Option value="<">&lt;</Option>
                                <Option value=">">&gt;</Option>
                                <Option value="<=">&le;</Option>
                                <Option value=">=">&ge;</Option>
                                <Option value="=">=</Option>
                              </Select>
                              <InputNumber
                                value={rule.value}
                                size="small"
                                className="flex-1"
                                onChange={(value) => updateEditingRule(polygon.id, ruleIndex, { value: value || 0 })}
                                precision={1}
                              />
                              <Button
                                type="text"
                                danger
                                size="small"
                                onClick={() => removeRule(polygon.id, ruleIndex)}
                              >
                                ×
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div
                                className="color-indicator"
                                style={{ backgroundColor: rule.color }}
                              />
                              <span className="text-xs">
                                {getOperatorLabel(rule.operator)} {getTemperatureDisplay(rule.value)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {isEditing && (
                        <Button
                          type="dashed"
                          size="small"
                          className="w-full"
                          onClick={() => addNewRule(polygon.id)}
                        >
                          + Add Rule
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      {selectedPolygonData && (
        <Card className="mt-4">
          <h4 className="font-medium mb-2">Selected Polygon Info</h4>
          <div className="text-sm space-y-1">
            <div><strong>Name:</strong> {selectedPolygonData.name}</div>
            <div><strong>Points:</strong> {selectedPolygonData.coordinates.length}</div>
            <div><strong>Current Color:</strong> 
              <span 
                className="inline-block w-4 h-4 ml-2 border rounded"
                style={{ backgroundColor: selectedPolygonData.currentColor }}
              />
            </div>
            <div><strong>Centroid:</strong> {selectedPolygonData.centroid[0].toFixed(4)}, {selectedPolygonData.centroid[1].toFixed(4)}</div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Sidebar;