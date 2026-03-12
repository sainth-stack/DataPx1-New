import { useState, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Popconfirm,
  ConfigProvider
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_URL } from '../../../const';

const TenantsManager = () => {
  const [tenants, setTenants] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  // Ref for initial load
  const initialLoadRef = useRef(false);

  const permissions = JSON.parse(localStorage.getItem('permissions') || {});


  // Updated fetchTenants for pagination
  const fetchTenants = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tenants`, {
        params: {
          page,
          page_size: size,
        },
      });
      // Support both paginated and non-paginated responses
      const tenantsData = response?.data?.tenants || [];
      const pagination = response?.data?.pagination || {};
      const processedTenants = tenantsData.map((tenant, index) => ({
        ...tenant,
        key: tenant.id,
        sno: (pagination.page - 1) * (pagination.page_size) + index + 1,
      }));
      setTenants(processedTenants);
      setTotal(pagination.total_records);
      setCurrentPage(pagination.page);
      setPageSize(pagination.page_size);
    } catch (error) {
      message.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load effect - runs only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      const loadData = async () => {
        setLoading(true);
        try {
          await fetchTenants(1, pageSize);
        } catch (error) {
          message.error('Failed to load tenants data. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [fetchTenants, pageSize]);

  // Update all tenant refreshes to use current page/size
  const handleSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('tenant_name', values.tenant_name);
      formData.append('tenant_type', values.tenant_type);
      formData.append('timeout', values.timeout);

      if (editingId) {
        await axios.post(`${API_URL}/tenants/${editingId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        message.success('Tenant updated successfully');
      } else {
        await axios.post(`${API_URL}/create_tenants`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        message.success('Tenant created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      await fetchTenants(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/tenants/${id}`);
      message.success('Tenant deleted successfully');
      await fetchTenants(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Delete failed');
    }
  };

  // Check specific permissions
  const canCreate = permissions?.includes("tenant_Create");
  const canUpdate = permissions?.includes("tenant_Write");
  const canDelete = permissions?.includes("tenant_Delete");

  const columns = [
    {
      title: 'S.No',
      dataIndex: 'sno',
      key: 'sno',
      sorter: (a, b) => a.sno - b.sno,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      sorter: (a, b) => a.type.localeCompare(b.type),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingId(record.id);
                form.setFieldsValue({
                  tenant_name: record.name,
                  tenant_type: record.type,
                  timeout: record.timeout
                });
                setIsModalOpen(true);
              }}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Are you sure to delete this tenant?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            contentBg: '#fff',
            headerBg: '#fff',
            footerBg: '#fff',
          },
        },
      }}
    >
      <div style={{ padding: '24px' }}>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
            style={{ marginBottom: '16px' }}
          >
            Add Tenant
          </Button>
        )}

        <Table
          columns={columns}
          dataSource={tenants}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            // Removed showQuickJumper for consistency
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
              fetchTenants(page, size);
            },
          }}
        />

        {(canCreate || canUpdate) && (
          <Modal
            title={editingId ? 'Edit Tenant' : 'Create Tenant'}
            open={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
              form.resetFields();
              setEditingId(null);
            }}
            footer={null}
            destroyOnClose
            centered
            mask={true}
            maskClosable={false}
            width={600}
            style={{ top: 20, zIndex: 99999 }}
            bodyStyle={{ padding: '24px' }}
          >
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              <Form.Item
                name="tenant_name"
                label="Tenant Name"
                rules={[{ required: true, message: 'Please input tenant name!' }]}
              >
                <Input placeholder="Enter tenant name" />
              </Form.Item>

              <Form.Item
                name="tenant_type"
                label="Tenant Type"
                rules={[{ required: true, message: 'Please select tenant type!' }]}
              >
                <Select placeholder="Select tenant type">
                  <Select.Option value="ai-priori">AI-Priori</Select.Option>
                  <Select.Option value="oem">OEM</Select.Option>
                  <Select.Option value="customer">Customer</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="timeout"
                label="Timeout (minutes)"
                rules={[{ required: true, message: 'Please input timeout!' }]}
              >
                <Input type="number" min={1} placeholder="Enter timeout in minutes" />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setIsModalOpen(false);
                    form.resetFields();
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitLoading}
                    disabled={submitLoading}
                  >
                    {editingId ? 'Update' : 'Submit'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        )}
      </div>
    </ConfigProvider>
  );
};

export default TenantsManager;