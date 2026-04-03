import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  SearchOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <SearchOutlined />, label: 'Query' },
  { key: '/experiment', icon: <ExperimentOutlined />, label: 'Experiment' },
  { key: '/results', icon: <BarChartOutlined />, label: 'Results' },
  { key: '/comparison', icon: <SwapOutlined />, label: 'Compare' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = menuItems
    .map((item) => item.key)
    .filter((key) => location.pathname.startsWith(key) && key !== '/')
    .pop() || '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#001529',
          padding: '0 24px',
        }}
      >
        <Typography.Title
          level={4}
          style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}
        >
          SC-TSQL Dashboard
        </Typography.Title>
      </Header>
      <Layout>
        <Sider
          width={200}
          theme="light"
          breakpoint="lg"
          collapsedWidth={60}
          style={{ borderRight: '1px solid #f0f0f0' }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
