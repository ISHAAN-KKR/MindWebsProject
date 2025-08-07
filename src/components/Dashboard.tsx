//src\components\Dashboard.tsx
'use client';

import React from 'react';
import { Layout } from 'antd';
import TimelineSlider from './TimelineSlider';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';

const { Content, Sider } = Layout;

const Dashboard: React.FC = () => {
  return (
    <Layout className="h-screen">
      <Layout>
        <Content className="p-4 bg-gray-50">
          <div className="h-full flex flex-col">
            <TimelineSlider />
            <div className="flex-1 flex gap-4">
              <div className="flex-1">
                <MapComponent />
              </div>
            </div>
          </div>
        </Content>
        <Sider width={320} className="bg-white">
          <Sidebar />
        </Sider>
      </Layout>
    </Layout>
  );
};

export default Dashboard;