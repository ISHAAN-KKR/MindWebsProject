'use client';

import dynamic from 'next/dynamic';
import { ConfigProvider, App } from 'antd';

// Dynamic import to avoid SSR issues with Leaflet
const Dashboard = dynamic(() => import('../components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Mind Webs Dashboard...</p>
      </div>
    </div>
  )
});

export default function Home() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <App>
        <main className="h-screen">
          <Dashboard />
        </main>
      </App>
    </ConfigProvider>
  );
}